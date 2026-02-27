import { useState, useEffect, useCallback } from 'react';

type EarningsDisplayMode = 'amount' | 'dots';

interface UseDisplayModeResult {
  earningsDisplay: EarningsDisplayMode;
  setEarningsDisplay: (mode: EarningsDisplayMode) => void;
}

const EARNINGS_DISPLAY_KEY = 'performanceTracker_earningsDisplay';

export function useDisplayMode(): UseDisplayModeResult {
  const [earningsDisplay, setEarningsDisplayState] = useState<EarningsDisplayMode>('amount');

  // Load saved preference
  useEffect(() => {
    const savedMode = localStorage.getItem(EARNINGS_DISPLAY_KEY) as EarningsDisplayMode | null;
    if (savedMode) {
      setEarningsDisplayState(savedMode);
    }
  }, []);

  const setEarningsDisplay = useCallback((mode: EarningsDisplayMode) => {
    setEarningsDisplayState(mode);
    localStorage.setItem(EARNINGS_DISPLAY_KEY, mode);
  }, []);

  return {
    earningsDisplay,
    setEarningsDisplay,
  };
}

export type { EarningsDisplayMode };
