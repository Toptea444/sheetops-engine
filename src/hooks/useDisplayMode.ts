import { useState, useEffect, useCallback } from 'react';

type EarningsDisplayMode = 'amount' | 'dots';

interface UseDisplayModeResult {
  earningsDisplay: EarningsDisplayMode;
  setEarningsDisplay: (mode: EarningsDisplayMode) => void;
  tooltipDismissed: boolean;
  dismissTooltip: () => void;
}

const EARNINGS_DISPLAY_KEY = 'performanceTracker_earningsDisplay';
const TOOLTIP_DISMISSED_KEY = 'performanceTracker_earningsTooltipDismissed';

export function useDisplayMode(): UseDisplayModeResult {
  const [earningsDisplay, setEarningsDisplayState] = useState<EarningsDisplayMode>('dots');
  const [tooltipDismissed, setTooltipDismissedState] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const savedMode = localStorage.getItem(EARNINGS_DISPLAY_KEY) as EarningsDisplayMode | null;
    if (savedMode) {
      setEarningsDisplayState(savedMode);
    }

    const savedTooltipDismissed = localStorage.getItem(TOOLTIP_DISMISSED_KEY);
    if (savedTooltipDismissed === 'true') {
      setTooltipDismissedState(true);
    }
  }, []);

  const setEarningsDisplay = useCallback((mode: EarningsDisplayMode) => {
    setEarningsDisplayState(mode);
    localStorage.setItem(EARNINGS_DISPLAY_KEY, mode);
  }, []);

  const dismissTooltip = useCallback(() => {
    setTooltipDismissedState(true);
    localStorage.setItem(TOOLTIP_DISMISSED_KEY, 'true');
  }, []);

  return {
    earningsDisplay,
    setEarningsDisplay,
    tooltipDismissed,
    dismissTooltip,
  };
}

export type { EarningsDisplayMode };
