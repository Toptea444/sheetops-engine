import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWorkerPinResult {
  isLoading: boolean;
  error: string | null;
  checkPinExists: (workerId: string) => Promise<boolean>;
  setPin: (workerId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyPin: (workerId: string, pin: string) => Promise<{ valid: boolean; error?: string }>;
}

export function useWorkerPin(): UseWorkerPinResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPinExists = useCallback(async (workerId: string): Promise<boolean> => {
    try {
      const { data, error: queryError } = await supabase
        .from('worker_pins')
        .select('id')
        .eq('worker_id', workerId.toUpperCase())
        .maybeSingle();

      if (queryError) {
        console.error('Error checking PIN existence:', queryError);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Unexpected error checking PIN:', err);
      return false;
    }
  }, []);

  const setPin = useCallback(async (
    workerId: string, 
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('set-worker-pin', {
        body: { worker_id: workerId, pin },
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Failed to set PIN';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const data = response.data;
      if (!data.success) {
        setError(data.error || 'Failed to set PIN');
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPin = useCallback(async (
    workerId: string, 
    pin: string
  ): Promise<{ valid: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('verify-worker-pin', {
        body: { worker_id: workerId, pin },
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Failed to verify PIN';
        setError(errorMessage);
        return { valid: false, error: errorMessage };
      }

      const data = response.data;
      if (!data.valid) {
        setError(data.error || 'Incorrect PIN');
        return { valid: false, error: data.error };
      }

      return { valid: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { valid: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    checkPinExists,
    setPin,
    verifyPin,
  };
}
