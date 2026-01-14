import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "getSheets" | "getSheetData";
  spreadsheetId: string;
  sheetName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, sheetName } = await req.json() as RequestBody;
    const apiKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Sheets API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "getSheets") {
      // Get spreadsheet metadata to list all sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=sheets.properties`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch spreadsheet metadata" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const sheets = data.sheets?.map((sheet: any) => ({
        id: sheet.properties.sheetId.toString(),
        name: sheet.properties.title,
      })) || [];

      return new Response(
        JSON.stringify({ sheets }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "getSheetData" && sheetName) {
      // Get sheet data
      const encodedSheetName = encodeURIComponent(sheetName);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}?key=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        return new Response(
          JSON.stringify({ error: `Failed to fetch sheet data: ${sheetName}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const values = data.values || [];
      
      // First row is headers, rest are data rows
      const headers = values[0] || [];
      const rows = values.slice(1) || [];

      return new Response(
        JSON.stringify({ headers, rows, sheetName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or missing parameters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
