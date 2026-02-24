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

      if (response.error) {
        const msg = response.error.message || 'Request failed';
        setError(msg);
        return null;
      }

      if (!response.data?.success) {
        setError(response.data?.error || 'Request failed');
        return null;
      }

      return response.data.data;
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
