import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SpreadsheetPreviewResponse } from '@/types/sheetsPreview';

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
      if (fnError) throw new Error(fnError.message || 'Failed to load preview');
      if (response?.error) throw new Error(response.error);

      const normalized: SpreadsheetPreviewResponse = {
        spreadsheetTitle: String(response?.spreadsheetTitle || 'Spreadsheet preview'),
        sheets: Array.isArray(response?.sheets) ? response.sheets : [],
      };

      previewCache.set(spreadsheetId, normalized);
      setData(normalized);
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spreadsheet preview';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeSheets = useMemo(() => data?.sheets || [], [data]);

  return { isLoading, error, data, activeSheets, loadPreview };
}
