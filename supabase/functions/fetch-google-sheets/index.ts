import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "getSheets" | "getSheetData";

interface RequestBody {
  action: Action;
  spreadsheetId: string;
  sheetName?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidSpreadsheetId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Google Sheets IDs are URL-safe base64-ish (letters, numbers, - and _)
  return value.length >= 10 && value.length <= 200 && /^[a-zA-Z0-9-_]+$/.test(value);
}

function isValidSheetName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Allow spaces and common punctuation; just bound length.
  return value.trim().length > 0 && value.length <= 200;
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function friendlyError(httpCode: number, reason: string, resource: string): string {
  const upper = reason.toUpperCase();
  if (httpCode === 403 || upper.includes("PERMISSION_DENIED")) {
    return `Access denied — the spreadsheet is not publicly accessible right now. The sheet owner may have restricted permissions or is updating data. Please try again later.`;
  }
  if (httpCode === 404 || upper.includes("NOT_FOUND")) {
    return `The ${resource} could not be found. The spreadsheet may have been moved, deleted, or the link may be incorrect.`;
  }
  if (httpCode === 429 || upper.includes("RATE_LIMIT") || upper.includes("RESOURCE_EXHAUSTED")) {
    return `Too many requests — the service is temporarily rate-limited. Please wait a moment and try again.`;
  }
  if (httpCode >= 500) {
    return `Google Sheets is temporarily unavailable (server error). Please try again in a few minutes.`;
  }
  return `Unable to load ${resource} (error ${httpCode}). Please try again later.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const action = body.action;
    const spreadsheetId = body.spreadsheetId;
    const sheetName = body.sheetName;

    if (action !== "getSheets" && action !== "getSheetData") {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    if (!isValidSpreadsheetId(spreadsheetId)) {
      return jsonResponse({ error: "Invalid spreadsheetId" }, 400);
    }

    if (action === "getSheetData" && !isValidSheetName(sheetName)) {
      return jsonResponse({ error: "Missing or invalid sheetName" }, 400);
    }

    const apiKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Google Sheets API key not configured" }, 500);
    }

    if (action === "getSheets") {
      // Include 'hidden' so we can mirror disabled/hidden tabs in the UI
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=sheets(properties(sheetId,title,hidden,sheetType))`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        const parsed = safeJsonParse(errorText);
        const code = response.status;
        const reason = parsed?.error?.status || parsed?.error?.message || "";
        return jsonResponse({ error: friendlyError(code, reason, "spreadsheet metadata") }, code);
      }

      const data = await response.json();
      const sheets =
        data.sheets?.map((sheet: any) => {
          const props = sheet?.properties ?? {};
          const hidden = !!props.hidden;
          const sheetType = String(props.sheetType ?? "GRID");
          return {
            id: String(props.sheetId ?? ""),
            name: String(props.title ?? ""),
            disabled: hidden || sheetType !== "GRID",
          };
        }) || [];

      return jsonResponse({ sheets });
    }

    // action === "getSheetData"
    const encodedSheetName = encodeURIComponent(sheetName!);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Sheets API error:", errorText);
      const parsed = safeJsonParse(errorText);
      const code = response.status;
      const reason = parsed?.error?.status || parsed?.error?.message || "";
      return jsonResponse({ error: friendlyError(code, reason, `sheet "${sheetName}"`) }, code);
    }

    const data = await response.json();
    const values = data.values || [];

    const headers = values[0] || [];
    const rows = values.slice(1) || [];

    return jsonResponse({ headers, rows, sheetName });
  } catch (error) {
    console.error("Function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
