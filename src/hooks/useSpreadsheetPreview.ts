import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SpreadsheetPreviewResponse } from '@/types/sheetsPreview';

const GENERIC_PREVIEW_ERROR = 'Failed to load spreadsheet preview';

const extractInvokeErrorMessage = async (invokeError: unknown): Promise<string> => {
  if (!invokeError || typeof invokeError !== 'object') return GENERIC_PREVIEW_ERROR;

  const context = (invokeError as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = await context.json();
      if (payload && typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      // ignore JSON parse failures and fallback to message below
    }
  }

  const message = (invokeError as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) {
    if (message.includes('non-2xx status code')) {
      return GENERIC_PREVIEW_ERROR;
    }
    return message;
  }

  return GENERIC_PREVIEW_ERROR;
};

const previewCache = new Map<string, SpreadsheetPreviewResponse>();

export function useSpreadsheetPreview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpreadsheetPreviewResponse | null>(null);

  const loadPreview = useCallback(async (spreadsheetId: string) => {
    setError(null);
    if (previewCache.has(spreadsheetId)) {
      const cached = previewCache.get(spreadsheetId)!;
      setData(cached);
      return cached;
    }

    setIsLoading(true);
    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSpreadsheetPreview', spreadsheetId },
      });
      if (fnError) throw new Error(await extractInvokeErrorMessage(fnError));
      if (response?.error) throw new Error(response.error);

      const normalized: SpreadsheetPreviewResponse = {
        spreadsheetTitle: String(response?.spreadsheetTitle || 'Spreadsheet preview'),
        sheets: Array.isArray(response?.sheets) ? response.sheets : [],
      };

      previewCache.set(spreadsheetId, normalized);
      setData(normalized);
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : GENERIC_PREVIEW_ERROR;
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeSheets = useMemo(() => data?.sheets || [], [data]);

  return { isLoading, error, data, activeSheets, loadPreview };
}
