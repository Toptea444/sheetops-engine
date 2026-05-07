import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_INTRO_CONFIG, IntroConfig, mergeIntroConfig } from '@/lib/introConfig';

const CACHE_KEY = 'intro_config_cache_v1';

export function useIntroConfig(): { config: IntroConfig; loaded: boolean } {
  const [config, setConfig] = useState<IntroConfig>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return mergeIntroConfig(JSON.parse(cached));
    } catch {
      /* ignore */
    }
    return DEFAULT_INTRO_CONFIG;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'intro_config')
          .maybeSingle();
        if (cancelled) return;
        const merged = mergeIntroConfig(data?.setting_value as Partial<IntroConfig> | null);
        setConfig(merged);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore — fallback to default */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loaded };
}
