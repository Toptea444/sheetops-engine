import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminRequest = useCallback(async (adminSecret: string, action: string, params?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('admin-data', {
        body: { admin_secret: adminSecret, action, params },
      });

      // supabase.functions.invoke puts the parsed body in response.data
      // and only sets response.error for network / relay-level failures.
      // However, when the edge function returns a non-2xx status the SDK
      // may surface the body inside response.error.context (v2 client) or
      // set response.data to null. Handle both cases:

      const payload = response.data;

      if (response.error) {
        // Try to extract meaningful message from the edge function body
        // The error object may contain the JSON body from the 403 response
        let msg = 'Request failed';
        try {
          // In some SDK versions the body ends up in response.error.context
          const ctx = (response.error as any)?.context;
          if (ctx) {
            const body = await ctx.json?.();
            if (body?.error) msg = body.error;
          }
        } catch {
          // ignore
        }
        if (msg === 'Request failed') {
          msg = response.error.message || 'Request failed';
        }
        setError(msg);
        return null;
      }

      if (!payload?.success) {
        setError(payload?.error || 'Request failed');
        return null;
      }

      return payload.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { adminRequest, isLoading, error };
}
