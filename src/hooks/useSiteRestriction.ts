import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteRestriction {
  isRestricted: boolean;
  title: string;
  message: string;
  customText: string;
  isLoading: boolean;
}

const DEFAULT_TITLE = "We're Back Soon";
const DEFAULT_MESSAGE = 'The site is currently under maintenance. Please check back later.';
const DEFAULT_CUSTOM = 'Thank you for your patience';

export function useSiteRestriction(): SiteRestriction {
  const [isRestricted, setIsRestricted] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [customText, setCustomText] = useState(DEFAULT_CUSTOM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'site_restricted')
        .maybeSingle();

      if (data?.setting_value) {
        const val = data.setting_value as { enabled?: boolean; message?: string; title?: string; custom_text?: string };
        setIsRestricted(val.enabled ?? false);
        setTitle(val.title ?? DEFAULT_TITLE);
        setMessage(val.message ?? DEFAULT_MESSAGE);
        setCustomText(val.custom_text ?? DEFAULT_CUSTOM);
      }
      setIsLoading(false);
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isRestricted, title, message, customText, isLoading };
}

/** Hook for admin panel to toggle restriction via edge function */
export function useSiteRestrictionAdmin(adminSecret: string) {
  const [isRestricted, setIsRestricted] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [customText, setCustomText] = useState(DEFAULT_CUSTOM);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.functions.invoke('admin-data', {
      body: { admin_secret: adminSecret, action: 'get_site_settings' },
    });
    if (data?.success && data.data) {
      setIsRestricted(data.data.is_restricted);
      setTitle(data.data.restriction_title ?? DEFAULT_TITLE);
      setMessage(data.data.restriction_message);
      setCustomText(data.data.restriction_custom_text ?? DEFAULT_CUSTOM);
    }
    setIsLoading(false);
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (
    msg: string,
    opts?: { title?: string; customText?: string; forceState?: boolean }
  ) => {
    const newState = opts?.forceState ?? !isRestricted;
    const nextTitle = opts?.title ?? title;
    const nextCustom = opts?.customText ?? customText;
    const { data } = await supabase.functions.invoke('admin-data', {
      body: {
        admin_secret: adminSecret,
        action: 'toggle_site_restriction',
        params: {
          is_restricted: newState,
          restriction_message: msg,
          restriction_title: nextTitle,
          restriction_custom_text: nextCustom,
        },
      },
    });
    if (data?.success) {
      setIsRestricted(newState);
      setMessage(msg);
      setTitle(nextTitle);
      setCustomText(nextCustom);
    }
    return newState;
  }, [adminSecret, isRestricted, title, customText]);

  const saveTexts = useCallback(async (next: { title: string; message: string; customText: string }) => {
    const { data } = await supabase.functions.invoke('admin-data', {
      body: {
        admin_secret: adminSecret,
        action: 'toggle_site_restriction',
        params: {
          is_restricted: isRestricted,
          restriction_message: next.message,
          restriction_title: next.title,
          restriction_custom_text: next.customText,
        },
      },
    });
    if (data?.success) {
      setTitle(next.title);
      setMessage(next.message);
      setCustomText(next.customText);
      return true;
    }
    return false;
  }, [adminSecret, isRestricted]);

  return { isRestricted, title, message, customText, toggle, saveTexts, isLoading };
}
