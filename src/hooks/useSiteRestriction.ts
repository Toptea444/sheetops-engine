import { useState, useEffect, useCallback } from 'react';
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
    const fetch = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'site_restricted')
        .maybeSingle();

      if (data?.setting_value) {
        const val = data.setting_value as { enabled?: boolean; message?: string };
        setIsRestricted(val.enabled ?? false);
        setMessage(val.message ?? 'The site is currently under maintenance.');
      }
      setIsLoading(false);
    };

    fetch();
    // Poll every 30s for restriction changes
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isRestricted, message, isLoading };
}

/** Hook for admin panel to toggle restriction via edge function */
export function useSiteRestrictionAdmin(adminSecret: string) {
  const [isRestricted, setIsRestricted] = useState(false);
  const [message, setMessage] = useState('The site is currently under maintenance. Please check back later.');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.functions.invoke('admin-data', {
      body: { admin_secret: adminSecret, action: 'get_site_settings' },
    });
    if (data?.success && data.data) {
      setIsRestricted(data.data.is_restricted);
      setMessage(data.data.restriction_message);
    }
    setIsLoading(false);
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (msg: string) => {
    const newState = !isRestricted;
    const { data } = await supabase.functions.invoke('admin-data', {
      body: {
        admin_secret: adminSecret,
        action: 'toggle_site_restriction',
        params: { is_restricted: newState, restriction_message: msg },
      },
    });
    if (data?.success) {
      setIsRestricted(newState);
      setMessage(msg);
    }
    return newState;
  }, [adminSecret, isRestricted]);

  return { isRestricted, message, toggle, isLoading };
}
