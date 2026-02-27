import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'site_restriction';

interface RestrictionState {
  enabled: boolean;
  message: string;
}

interface SiteRestriction {
  isRestricted: boolean;
  message: string;
  isLoading: boolean;
}

function readRestriction(): RestrictionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return { enabled: false, message: 'The site is currently under maintenance. Please check back later.' };
}

export function useSiteRestriction(): SiteRestriction {
  const [state, setState] = useState<RestrictionState>({ enabled: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setState(readRestriction());
    setIsLoading(false);

    // Listen for changes from the admin panel (same tab or other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setState(readRestriction());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { isRestricted: state.enabled, message: state.message, isLoading };
}

/** Utility used by the admin settings tab to toggle restriction */
export function setRestriction(enabled: boolean, message: string) {
  const val: RestrictionState = { enabled, message };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  // Dispatch a custom event so the hook re-reads in the same tab
  window.dispatchEvent(new Event('site-restriction-changed'));
}

/** Hook variant for the admin panel that also supports toggling */
export function useSiteRestrictionAdmin() {
  const [state, setState] = useState<RestrictionState>(readRestriction);

  const refresh = useCallback(() => setState(readRestriction()), []);

  useEffect(() => {
    window.addEventListener('site-restriction-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('site-restriction-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const toggle = (message: string) => {
    const newEnabled = !state.enabled;
    setRestriction(newEnabled, message);
    setState({ enabled: newEnabled, message });
    return newEnabled;
  };

  return { isRestricted: state.enabled, message: state.message, toggle };
}
