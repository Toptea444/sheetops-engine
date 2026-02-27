import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteRestriction {
  isRestricted: boolean;
  message: string;
  isLoading: boolean;
}

export function useSiteRestriction(): SiteRestriction {
  const [isRestricted, setIsRestricted] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRestriction() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'site_restricted')
          .maybeSingle();

        if (error) {
          console.error('Failed to check site restriction:', error);
          setIsRestricted(false);
          setIsLoading(false);
          return;
        }

        if (data?.setting_value) {
          const val = data.setting_value as { enabled?: boolean; message?: string };
          setIsRestricted(val.enabled ?? false);
          setMessage(val.message ?? 'The site is currently under maintenance. Please check back later.');
        }
      } catch {
        // If we can't reach the DB, allow access
        setIsRestricted(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRestriction();
  }, []);

  return { isRestricted, message, isLoading };
}
