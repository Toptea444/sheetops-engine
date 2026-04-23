import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { IdentityConfirmationModal } from '@/components/dashboard/IdentityConfirmationModal';
import { SessionPinGate } from '@/components/dashboard/SessionPinGate';
import { SwapDetectionModal } from '@/components/dashboard/SwapDetectionModal';
import { PinResetModal } from '@/components/dashboard/PinResetModal';
import { CycleSelector } from '@/components/dashboard/CycleSelector';
import { CycleSummaryCard } from '@/components/dashboard/CycleSummaryCard';
import { SheetBreakdownCards } from '@/components/dashboard/SheetBreakdownCards';
import { DailyEarningsTable } from '@/components/dashboard/DailyEarningsTable';
import { WeeklyBreakdown } from '@/components/dashboard/WeeklyBreakdown';
import { GoalsPanel } from '@/components/dashboard/GoalsPanel';
import { SheetSelector } from '@/components/dashboard/SheetSelector';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { StreaksPanel } from '@/components/dashboard/StreaksPanel';
import { EarningsProjection } from '@/components/dashboard/EarningsProjection';
import { LeaderboardPanel } from '@/components/dashboard/LeaderboardPanel';
import { LeaderboardWelcome } from '@/components/dashboard/LeaderboardWelcome';
import { WeeklyBonusAlert } from '@/components/dashboard/WeeklyBonusAlert';
import { AlertsDisplay } from '@/components/AlertsDisplay';
import { FeedbackModal } from '@/components/FeedbackModal';
import { DownloadAppModal } from '@/components/DownloadAppModal';
import { DownloadAppBanner } from '@/components/DownloadAppBanner';
import { TransportSubsidyModal } from '@/components/TransportSubsidyModal';
import { TransportSubsidyCard } from '@/components/dashboard/TransportSubsidyCard';
import { RankingBonusPreferenceModal } from '@/components/dashboard/RankingBonusPreferenceModal';
import { SheetSettingsModal } from '@/components/dashboard/SheetSettingsModal';
import { RankingBonusMomentumBanner } from '@/components/dashboard/RankingBonusMomentumBanner';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AdjustmentsPanel } from '@/components/dashboard/AdjustmentsPanel';
import { EarningsReveal } from '@/components/dashboard/EarningsReveal';
import { CycleSummaryModal } from '@/components/dashboard/CycleSummaryModal';
import { CycleSummaryStaticModal } from '@/components/dashboard/CycleSummaryStaticModal';
import { CycleSelectorHighlight, hasSeenCycleSelectorHighlight, markCycleSelectorHighlightAsSeen } from '@/components/dashboard/CycleSelectorHighlight';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useCycleSummary } from '@/hooks/useCycleSummary';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useStreaksAndAchievements } from '@/hooks/useStreaksAndAchievements';
import { useTheme } from '@/hooks/useTheme';
import { useDisplayMode } from '@/hooks/useDisplayMode';
import { useEarningsAdjustments } from '@/hooks/useEarningsAdjustments';
import { useTransportSubsidy } from '@/hooks/useTransportSubsidy';
import { useNotifications, generateDataHash, NOTIFICATION_POLL_INTERVAL_MS } from '@/hooks/useNotifications';
import { useCycleCache } from '@/hooks/useCycleCache';
import { getCycleOptions, isDateInCycle, getCycleKey, getPreviousCycle } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult, SheetData } from '@/types/bonus';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSessionLock } from '@/hooks/useSessionLock';
import { Settings, CalendarDays } from 'lucide-react';

const Index = () => {
  const toLocalDateStr = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const { 
    isLoading: sheetsLoading, 
    error, 
    sheets, 
    fetchSheets, 
    fetchSheetData,
    searchWorker,
    calculateBonus,
    clearError,
  } = useGoogleSheets();

  const {
    userId,
    userName,
    dailyTarget,
    getCycleTarget,
    identityConfirmed,
    isLoading: identityLoading,
    setUserId,
    setUserName,
    setDailyTarget,
    setCycleTarget,
    confirmIdentity,
    clearIdentity,
    hasIdentity,
  } = useUserIdentity();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showIdentityConfirmation, setShowIdentityConfirmation] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [results, setResults] = useState<BonusResult[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sheetDataCache, setSheetDataCache] = useState<Record<string, SheetData>>({});
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [forgotPinSubmitted, setForgotPinSubmitted] = useState(false);
  const [swapDetected, setSwapDetected] = useState<{ currentUserId: string; swappedWithId: string; swapId: string } | null>(null);
  const [pinResetDetected, setPinResetDetected] = useState<{ workerId: string; message: string } | null>(null);
  const RANKING_BONUS_TOTAL_PREF_KEY = 'performanceTracker_includeRankingBonusInTotal';
  const RANKING_BONUS_TOTAL_DEFAULT_UPDATE_KEY = 'performanceTracker_rankingBonusDefaultUpdateSeen_v1';
  const [includeRankingBonusInTotal, setIncludeRankingBonusInTotal] = useState(true);
  const [showRankingPreferenceModal, setShowRankingPreferenceModal] = useState(false);
  const [rankingPreferenceFromSettings, setRankingPreferenceFromSettings] = useState(false);
  const [showSheetSettingsModal, setShowSheetSettingsModal] = useState(false);
  const [showRankingDefaultUpdateModal, setShowRankingDefaultUpdateModal] = useState(false);

  // Cycle Summary Modal states
  const [showCycleSummaryAnimated, setShowCycleSummaryAnimated] = useState(false);
  const [showCycleSummaryStatic, setShowCycleSummaryStatic] = useState(false);
  const [cycleSummaryShownThisSession, setCycleSummaryShownThisSession] = useState(false);
  const [showCycleSelectorHighlight, setShowCycleSelectorHighlight] = useState(false);
  const cycleSelectorRef = useRef<HTMLDivElement>(null);
  // Tracks the last cycle key we ran the cycle-change effect for, so it only
  // fires once per actual cycle switch (not on every selectedSheets/sheets
  // dependency change). Without this guard the effect re-runs in a loop and
  // wipes results to [] on the live cycle.
  const lastHandledCycleKeyRef = useRef<string | null>(null);

  // Persistent PIN verification (survives browser close)
  const PIN_VERIFIED_KEY = 'performanceTracker_pinVerified';
  const [pinVerifiedThisSession, setPinVerifiedThisSession] = useState(() => {
    return localStorage.getItem(PIN_VERIFIED_KEY) === 'true';
  });

  // Session release on logout
  const { releaseSession } = useSessionLock();

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycle, setSelectedCycle] = useState<CyclePeriod>(cycleOptions[0]);

  // Theme
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();

  // Display Mode
  const { earningsDisplay, setEarningsDisplay, tooltipDismissed, dismissTooltip } = useDisplayMode();

  // Notifications
  const {
    isSupported: notificationsSupported,
    isEnabled: notificationsEnabled,
    permission: notificationPermission,
    enableNotifications,
    disableNotifications,
    checkForUpdates,
  } = useNotifications();

  // Cycle cache for persisting data across sheet disabling
  const {
    saveWorkerResult,
    saveSheetSnapshot,
    loadWorkerResults,
    loadAllSheetSnapshots,
  } = useCycleCache();

  // Transport Subsidy
  const {
    isLoading: subsidyLoading,
    subsidyData,
    error: subsidyError,
    isSetupDone: subsidySetupDone,
    isOptedIn: subsidyOptedIn,
    savedKId: subsidyKId,
    markSetupDone: markSubsidySetupDone,
    fetchSubsidyData,
    setError: setSubsidyError,
  } = useTransportSubsidy();

  const [showSubsidyModal, setShowSubsidyModal] = useState(false);

  // Show subsidy modal after identity is confirmed + PIN verified + data loaded, if setup not done
  useEffect(() => {
    if (identityConfirmed && pinVerifiedThisSession && !subsidySetupDone && !isInitializing) {
      // Delay to let other modals (earnings reveal etc.) show first
      const timer = setTimeout(() => setShowSubsidyModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [identityConfirmed, pinVerifiedThisSession, subsidySetupDone, isInitializing]);

  const handleSubsidyComplete = useCallback((optedIn: boolean, kId?: string) => {
    markSubsidySetupDone(optedIn, kId);
    setShowSubsidyModal(false);
  }, [markSubsidySetupDone]);


  const {
    swaps: earningsSwaps,
    adjustmentNotes,
    applyAdjustments,
    getWorkerIdsToFetch,
    getTransferInfoForDate,
    isLoading: adjustmentsLoading,
  } = useEarningsAdjustments(userId, selectedCycle);

  // Apply adjustments to results
  const { adjustedResults, netAdjustment } = useMemo(() => {
    if (results.length === 0) return { adjustedResults: results, netAdjustment: 0 };
    return applyAdjustments(results);
  }, [results, applyAdjustments]);

  // Cycle Summary (for showing previous cycle recap)
  const { 
    summaryData: cycleSummaryData, 
    shouldShowAnimatedSummary: cycleSummaryShouldShowAnimated,
    markAsShown: markCycleSummaryAsShown 
  } = useCycleSummary(adjustedResults, selectedCycle);

  // Streaks & Achievements
  const { streakData, achievements, totalUnlocked } = useStreaksAndAchievements(
    adjustedResults,
    selectedCycle
  );

  const isIdentityLocked = !!userId && !identityConfirmed;

  // Helper to check if a sheet is the transport subsidy sheet (uses different IDs)
  const isTransportSubsidySheet = (name: string): boolean => {
    return name.trim().toUpperCase().includes('TRANSPORT') && name.trim().toUpperCase().includes('SUBSIDY');
  };

  // Strict cycle matching by name: a sheet belongs to a cycle if its name
  // explicitly mentions the start month + 16 marker, or end month + 1st/15th
  // marker. This handles dated sheets like "DAILY GH 16TH MAR - 31ST MAR".
  const sheetNameMatchesCycle = useCallback((sheetName: string, cycle: CyclePeriod) => {
    const nameUpper = sheetName.toUpperCase();
    const startMonthShort = cycle.startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const startMonthLong = cycle.startDate.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const endMonthShort = cycle.endDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const endMonthLong = cycle.endDate.toLocaleString('en-US', { month: 'long' }).toUpperCase();

    const hasStartMonth = nameUpper.includes(startMonthShort) || nameUpper.includes(startMonthLong);
    const hasEndMonth = nameUpper.includes(endMonthShort) || nameUpper.includes(endMonthLong);

    const hasStartHalfMarker = /\b16(TH)?\b/.test(nameUpper);
    const hasEndHalfMarker = /\b(1ST|15(TH)?)\b/.test(nameUpper);

    if (hasStartMonth && hasStartHalfMarker) return true;
    if (hasEndMonth && hasEndHalfMarker) return true;
    return false;
  }, []);

  // Robust date parser: handles "MM/DD/YYYY", "M/D/YYYY", "1ST JAN 2026",
  // "16-MAR-2026", "Mar 16 2026", and ISO. Returns timestamp or null.
  const parseAnyDate = useCallback((raw: string): number | null => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return null;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    // M/D/YYYY or MM/DD/YYYY (or with - or .)
    const slash = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (slash) {
      const m = parseInt(slash[1], 10);
      const d = parseInt(slash[2], 10);
      let y = parseInt(slash[3], 10);
      if (y < 100) y += 2000;
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d).getTime();
    }

    // "1ST JAN 2026" / "16 MAR 2026" / "Mar 16 2026"
    const ordinal = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)?\s*[-\s]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*[-,\s]?\s*(\d{4})?/i);
    if (ordinal) {
      const d = parseInt(ordinal[1], 10);
      const m = months.indexOf(ordinal[2].toLowerCase());
      const y = ordinal[3] ? parseInt(ordinal[3], 10) : new Date().getFullYear();
      if (m >= 0 && d >= 1 && d <= 31) return new Date(y, m, d).getTime();
    }
    const monthFirst = trimmed.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})?/i);
    if (monthFirst) {
      const m = months.indexOf(monthFirst[1].toLowerCase());
      const d = parseInt(monthFirst[2], 10);
      const y = monthFirst[3] ? parseInt(monthFirst[3], 10) : new Date().getFullYear();
      if (m >= 0 && d >= 1 && d <= 31) return new Date(y, m, d).getTime();
    }

    // ISO YYYY-MM-DD
    const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      const y = parseInt(iso[1], 10);
      const m = parseInt(iso[2], 10);
      const d = parseInt(iso[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d).getTime();
    }

    return null;
  }, []);

  // Content-based cycle matching: scan headers + a sample of cells for any
  // date that lands inside the cycle. This rescues sheets whose names don't
  // include cycle dates (e.g. "RANKING BONUS GH") but whose data is for it.
  // Returns: 'match' | 'mismatch' | 'no-dates'
  const sheetContentCycleMatch = useCallback(
    (sheetData: SheetData | undefined, cycle: CyclePeriod): 'match' | 'mismatch' | 'no-dates' => {
      if (!sheetData) return 'no-dates';
      let foundAnyDate = false;
      const cells: string[] = [];
      for (const c of sheetData.headers) cells.push(String(c ?? ''));
      // Sample first 3 rows (label / first-data rows often hold date headers)
      for (let r = 0; r < Math.min(3, sheetData.rows.length); r++) {
        for (const c of sheetData.rows[r]) cells.push(String(c ?? ''));
      }
      for (const cell of cells) {
        const ts = parseAnyDate(cell);
        if (ts !== null) {
          foundAnyDate = true;
          if (isDateInCycle(new Date(ts), cycle)) return 'match';
        }
      }
      return foundAnyDate ? 'mismatch' : 'no-dates';
    },
    [parseAnyDate]
  );

  // Combined matcher used everywhere: name match wins; otherwise fall back to
  // content. If neither name nor content tells us anything (no dates at all),
  // we accept it — these are usually undated aggregate sheets that were
  // intentionally snapshotted under this cycle key.
  const sheetMatchesCycle = useCallback(
    (sheetName: string, cycle: CyclePeriod, sheetData?: SheetData) => {
      if (sheetNameMatchesCycle(sheetName, cycle)) return true;
      const verdict = sheetContentCycleMatch(sheetData, cycle);
      if (verdict === 'match') return true;
      if (verdict === 'no-dates') return true; // accept aggregate / undated sheets
      return false; // 'mismatch' — sheet has dates and none belong to this cycle
    },
    [sheetNameMatchesCycle, sheetContentCycleMatch]
  );

  const areSameSheetSelection = useCallback((a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    return b.every((item) => setA.has(item));
  }, []);

  // Helper to check if a sheet should be unchecked by default
  const isDefaultUncheckedSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // "WEEKLY BONUS GH" (the original generic one) — always uncheck
    const isGenericWeeklyBonusGh = (n.includes('WEEKLYBONUSGH') || 
           (n.includes('WEEKLY') && n.includes('BONUS') && n.includes('GH')));
    // "RANKING BONUS GH" (generic, no date suffix) — always uncheck
    const isGenericRankingBonusGh = (n.includes('RANKINGBONUSGH') || 
           (n.includes('RANKING') && n.includes('BONUS') && n.includes('GH')));
    // "WEEKLY BONUS FROM ..." sheets — uncheck
    const isWeeklyBonusFrom = n.includes('WEEKLY') && n.includes('BONUS') && n.includes('FROM');
    
    // "RANKING BONUS GH <date>" sheets (with date suffix) should be CHECKED, so exclude them
    // A date suffix is detected by having digits after the ranking bonus pattern
    const hasDateSuffix = /RANKINGBONUS.*GH.*\d/.test(n) || /RANKING.*BONUS.*GH.*\d/.test(n);
    if (hasDateSuffix) return false; // Keep checked — it's a specific dated ranking bonus
    
    return isGenericWeeklyBonusGh || isGenericRankingBonusGh || isWeeklyBonusFrom;
  };

  // Keep these for totals exclusion (always exclude bonus sheets from cumulative totals)
  const isWeeklyBonusGhSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z]/g, '');
    return n.includes('WEEKLYBONUSGH') || 
           (n.includes('WEEKLY') && n.includes('BONUS') && n.includes('GH'));
  };

  const isRankingBonusSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return n.includes('RANKINGBONUS') || (n.includes('RANKING') && n.includes('BONUS'));
  };

  useEffect(() => {
    const hasSeenDefaultUpdate = localStorage.getItem(RANKING_BONUS_TOTAL_DEFAULT_UPDATE_KEY) === 'true';
    const savedPreference = localStorage.getItem(RANKING_BONUS_TOTAL_PREF_KEY);

    if (!hasSeenDefaultUpdate) {
      localStorage.setItem(RANKING_BONUS_TOTAL_PREF_KEY, 'true');
      setIncludeRankingBonusInTotal(true);
      setShowRankingDefaultUpdateModal(true);
      return;
    }

    if (savedPreference === 'true' || savedPreference === 'false') {
      setIncludeRankingBonusInTotal(savedPreference === 'true');
      return;
    }

    localStorage.setItem(RANKING_BONUS_TOTAL_PREF_KEY, 'true');
    setIncludeRankingBonusInTotal(true);
  }, []);

  const saveRankingBonusPreference = useCallback((shouldInclude: boolean) => {
    localStorage.setItem(RANKING_BONUS_TOTAL_PREF_KEY, shouldInclude ? 'true' : 'false');
    setIncludeRankingBonusInTotal(shouldInclude);
  }, []);

  const acknowledgeRankingDefaultUpdate = useCallback(() => {
    localStorage.setItem(RANKING_BONUS_TOTAL_DEFAULT_UPDATE_KEY, 'true');
    setShowRankingDefaultUpdateModal(false);
  }, []);

  const openRankingPreferenceFromSettings = () => {
    setRankingPreferenceFromSettings(true);
    setShowRankingPreferenceModal(true);
    setShowSheetSettingsModal(false);
  };

  const openTransportSubsidyFromSettings = () => {
    setShowSubsidyModal(true);
    setShowSheetSettingsModal(false);
  };
  
  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        // Exclude disabled sheets AND the Weekly Bonus GH sheet
        const enabledSheets = sheetsList.filter(s => 
          !s.disabled && !isDefaultUncheckedSheet(s.name) && !isTransportSubsidySheet(s.name)
        );
        setSelectedSheets(enabledSheets.map(s => s.name));
      }
      setIsInitializing(false);
    };
    init();
  }, [fetchSheets]);

  // Show welcome modal for new users, PIN gate for returning users
  // Note: Identity confirmation is now handled within WelcomeModal/SessionPinGate for users WITHOUT a PIN.
  // Users WITH a PIN go straight to dashboard after PIN verification (PIN is proof of identity).
  useEffect(() => {
    if (!identityLoading && !isInitializing) {
      if (!hasIdentity) {
        setShowWelcome(true);
      } else if (!pinVerifiedThisSession) {
        // Returning user needs PIN verification every session
        setShowPinGate(true);
      }
      // Removed: else if (!identityConfirmed) - PIN verification IS identity confirmation
    }
  }, [identityLoading, hasIdentity, isInitializing, pinVerifiedThisSession]);

  // Download app banner
  const showDownloadBanner = true;
  const [downloadModalRequestId, setDownloadModalRequestId] = useState(0);


  // Safety: never keep sensitive data on screen before identity is confirmed
  useEffect(() => {
    if (userId && !identityConfirmed) {
      setResults([]);
      setDataError(null);
    }
  }, [userId, identityConfirmed]);

  const fetchUserData = useCallback(async (forceRefetch = false) => {
    if (!userId || selectedSheets.length === 0 || !identityConfirmed) return;

    setDataError(null);
    setIsFetchingData(true);
    const newResults: BonusResult[] = [];
    const newCache: Record<string, SheetData> = { ...sheetDataCache };
    let foundInAnySheet = false;

    const allTimeStart = new Date(2020, 0, 1);
    const endDate = new Date();
    const currentCycleKey = getCycleKey(selectedCycle);
    const liveCycleKey = getCycleKey(getCycleOptions(0)[0]);
    const isPastCycle = currentCycleKey !== liveCycleKey;

    // Get all worker IDs to fetch (includes swap-related IDs)
    const workerIdsToFetch = getWorkerIdsToFetch();
    // If no swaps, just use the current userId
    const idsToSearch = workerIdsToFetch.length > 0 ? workerIdsToFetch : [userId];

    // For past cycles, prefer cached results first (sheets may be disabled or
    // have moved on to next month's data which would zero out the breakdown).
    const idsForCache = workerIdsToFetch.length > 0 ? workerIdsToFetch : [userId];
    const cachedResults: BonusResult[] = [];
    let cachedSheetNamesFromSnapshots: string[] = [];
    if (isPastCycle) {
      const seen = new Set<string>();
      for (const cacheId of idsForCache) {
        const rows = await loadWorkerResults(cacheId, currentCycleKey);
        for (const row of rows) {
          const key = `${cacheId}:${row.sheetName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // Only trust cached rows that actually have in-cycle daily data.
          const hasInCycleData = row.dailyBreakdown?.some((d) => {
            if (d.fullDate === undefined) return false;
            return isDateInCycle(new Date(d.fullDate), selectedCycle);
          });
          if (hasInCycleData) cachedResults.push(row);
        }
      }
      // Also pre-load cached sheet snapshots so leaderboard / breakdowns work.
      const cachedSheets = await loadAllSheetSnapshots(currentCycleKey);
      cachedSheetNamesFromSnapshots = Object.keys(cachedSheets).filter((name) =>
        sheetMatchesCycle(name, selectedCycle, cachedSheets[name])
      );
      for (const [name, data] of Object.entries(cachedSheets)) {
        if (!newCache[name]) newCache[name] = data;
      }
    }

    const cachedSheetNamesFromResults = cachedResults
      .map((r) => r.sheetName)
      .filter((name): name is string => Boolean(name));

    const historicalSheetNames = Array.from(new Set([
      ...cachedSheetNamesFromResults,
      ...cachedSheetNamesFromSnapshots,
    ])).filter((name) => sheetMatchesCycle(name, selectedCycle, newCache[name]));

    const effectiveSelectedSheets = isPastCycle && historicalSheetNames.length > 0
      ? historicalSheetNames
      : selectedSheets;

    for (const sheetName of effectiveSelectedSheets) {
      let data = forceRefetch ? null : (sheetDataCache[sheetName] ?? newCache[sheetName]);

      // PAST CYCLES: use cached snapshots only — never call the live API,
      // because past-cycle sheets may have been disabled/removed (would 400).
      if (!data && !isPastCycle) {
        data = await fetchSheetData(sheetName);
        if (data) {
          newCache[sheetName] = data;
        }
      }

      if (data) {
        if (isPastCycle && !sheetMatchesCycle(sheetName, selectedCycle, data)) {
          continue;
        }
        // Search for all worker IDs (current + any pre-swap IDs)
        for (const workerId of idsToSearch) {
          const worker = searchWorker(data, workerId);
          if (worker) {
            foundInAnySheet = true;
            // Only update userName from the current user's data
            if (workerId === userId && worker.userName && worker.userName !== userId) {
              setUserName(worker.userName);
            }
            const result = calculateBonus(worker, allTimeStart, endDate);
            const resultWithSheet = { ...result, sheetName: sheetName };

            // Does this live result actually contain days inside the selected cycle?
            const inCycleDays = (result.dailyBreakdown || []).filter((d) => {
              if (d.fullDate === undefined) return false;
              return isDateInCycle(new Date(d.fullDate), selectedCycle);
            });

            if (inCycleDays.length > 0) {
              newResults.push(resultWithSheet);
              // Cache the snapshot only when it has real in-cycle data —
              // and only for the live cycle (past cycles are read-only).
              if (!isPastCycle) {
                saveSheetSnapshot(sheetName, selectedCycle, data);
                saveWorkerResult(workerId, sheetName, selectedCycle, resultWithSheet);
              }
            } else if (!isPastCycle) {
              // For the current cycle, keep zero-value rows so the UI
              // shows "no data yet" cleanly.
              newResults.push(resultWithSheet);
            }
            // For past cycles with no in-cycle data: drop the live result
            // and DO NOT overwrite any existing cached snapshot.
          }
        }
      }
    }

    setSheetDataCache(newCache);

    // Merge cached results in (cache wins for sheets we couldn't reproduce live).
    const liveSheetNames = new Set(newResults.map((r) => r.sheetName));
    const mergedResults = [
      ...newResults,
      ...cachedResults.filter((r) => !liveSheetNames.has(r.sheetName)),
    ];

    // Legacy fallback: if nothing live AND we somehow have no cached rows yet,
    // try loading any cache (in case dates were missing on cached rows).
    if (mergedResults.length === 0 && userId) {
      const seenKeys = new Set<string>();
      const allCachedResults: BonusResult[] = [];
      for (const cacheId of idsForCache) {
        const rows = await loadWorkerResults(cacheId, currentCycleKey);
        for (const row of rows) {
          const key = `${cacheId}:${row.sheetName}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allCachedResults.push(row);
          }
        }
      }
      if (allCachedResults.length > 0) {
        setResults(allCachedResults);
        setIsFetchingData(false);
        return;
      }
    }

    setResults(mergedResults);
    if (!areSameSheetSelection(effectiveSelectedSheets, selectedSheets)) {
      setSelectedSheets(effectiveSelectedSheets);
    }
    setIsFetchingData(false);

    // Check for data updates (notifications)
    if (mergedResults.length > 0) {
      const dataHash = generateDataHash(mergedResults);
      checkForUpdates(dataHash);
    }

    if (!foundInAnySheet && cachedResults.length === 0 && userId) {
      setDataError(`No data found for "${userId}" in any of the selected sheets.`);
    }
  }, [userId, selectedSheets, sheetDataCache, fetchSheetData, searchWorker, calculateBonus, setUserName, identityConfirmed, selectedCycle, saveWorkerResult, saveSheetSnapshot, loadWorkerResults, loadAllSheetSnapshots, getWorkerIdsToFetch, sheetMatchesCycle, areSameSheetSelection]);

  useEffect(() => {
    if (userId && selectedSheets.length > 0 && !isInitializing && identityConfirmed) {
      fetchUserData();
    }
  }, [userId, selectedSheets, isInitializing, identityConfirmed]);

  // Re-fetch when swap data loads asynchronously — ensures old-ID earnings are included.
  // Fixes race condition: fetchUserData() can run before useEarningsAdjustments finishes
  // loading swaps from Supabase, so swaps was [] and only the current ID was searched.
  const lastFetchedSwapCount = useRef(0);
  useEffect(() => {
    if (!userId || !identityConfirmed || isInitializing || selectedSheets.length === 0) return;
    if (adjustmentsLoading) return;

    const currentSwapCount = earningsSwaps.length;
    if (currentSwapCount > 0 && lastFetchedSwapCount.current !== currentSwapCount) {
      lastFetchedSwapCount.current = currentSwapCount;
      fetchUserData(true);
    }
  }, [earningsSwaps, adjustmentsLoading, userId, identityConfirmed, isInitializing, selectedSheets, fetchUserData]);

  // Trigger Cycle Summary Modal when conditions are met
  useEffect(() => {
    // Compute loading inline since isLoading is defined later in the component
    const stillLoading = sheetsLoading || identityLoading || isFetchingData;
    
    if (
      cycleSummaryShouldShowAnimated &&
      !cycleSummaryShownThisSession &&
      identityConfirmed &&
      pinVerifiedThisSession &&
      !stillLoading &&
      adjustedResults.length > 0
    ) {
      // Delay slightly to let EarningsReveal show first if applicable
      const timer = setTimeout(() => {
        setShowCycleSummaryAnimated(true);
        setCycleSummaryShownThisSession(true);
      }, 6000); // Show after EarningsReveal auto-dismisses
      return () => clearTimeout(timer);
    }
  }, [
    cycleSummaryShouldShowAnimated, 
    cycleSummaryShownThisSession, 
    identityConfirmed, 
    pinVerifiedThisSession,
    sheetsLoading,
    identityLoading,
    isFetchingData,
    adjustedResults.length
  ]);

  // Background polling: re-fetch data every 5 minutes when notifications are enabled
  useEffect(() => {
    if (!notificationsEnabled || !userId || !identityConfirmed || selectedSheets.length === 0) return;

    const interval = setInterval(() => {
      fetchUserData(true); // force refetch to bypass cache
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [notificationsEnabled, userId, identityConfirmed, selectedSheets, fetchUserData]);

  // Background swap detection: check every 30s if logged-in user has been swapped
  useEffect(() => {
    if (!userId || !identityConfirmed || !pinVerifiedThisSession) return;

    const checkSwap = async () => {
      const uid = userId.toUpperCase();
      const todayLocal = toLocalDateStr(Date.now());
      
      // Find any swap involving this user's ID (either side of a bidirectional swap)
      const { data: swapRes } = await supabase.from('id_swaps')
        .select('id, old_worker_id, new_worker_id, effective_date')
        .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (swapRes && swapRes.length > 0) {
        const swap = swapRes[0];
        if (swap.effective_date > todayLocal) return;
        // Per-user ack key: each worker independently acknowledges the swap on their device
        const ackKey = `performanceTracker_swapAck_${swap.id}_${uid}`;
        
        if (!localStorage.getItem(ackKey)) {
          // Determine the user's new ID based on which side of the swap they are
          const isOldSide = swap.old_worker_id === uid;
          setSwapDetected({
            currentUserId: uid,
            swappedWithId: isOldSide ? swap.new_worker_id : swap.old_worker_id,
            swapId: swap.id,
          });
        }
      }
    };

    checkSwap();
    const interval = setInterval(checkSwap, 30_000);
    return () => clearInterval(interval);
  }, [userId, identityConfirmed, pinVerifiedThisSession]);

  // Background PIN reset detection: check every 30s if admin removed this worker's PIN.
  // Suppressed when a swap is already detected — the swap modal takes priority, and an
  // admin-cleared PIN is expected in that scenario (forces re-registration under new ID).
  useEffect(() => {
    if (!userId || !identityConfirmed || !pinVerifiedThisSession || pinResetDetected || swapDetected) return;

    const checkPinReset = async () => {
      // Double-check swap state inside the async callback to handle the case where
      // a swap was detected between when the interval fired and now.
      if (swapDetected) return;

      const { data, error } = await supabase
        .from('worker_pins')
        .select('id')
        .eq('worker_id', userId.toUpperCase())
        .maybeSingle();

      if (error) return;

      if (!data) {
        // Only show pin reset if there's no pending swap for this user
        const { data: swapRows } = await supabase
          .from('id_swaps')
          .select('id, effective_date')
          .or(`old_worker_id.eq.${userId.toUpperCase()},new_worker_id.eq.${userId.toUpperCase()}`)
          .order('created_at', { ascending: false })
          .limit(1);

        const todayLocal = toLocalDateStr(Date.now());
        const hasPendingSwap = swapRows && swapRows.length > 0 && swapRows[0].effective_date <= todayLocal;
        if (hasPendingSwap) {
          // Swap detection loop will handle this — don't show pin reset modal
          return;
        }

        setPinResetDetected({
          workerId: userId.toUpperCase(),
          message: 'Heads up — your admin reset your PIN. Tap Okay to go back to the start and enter your worker ID again.',
        });
      }
    };

    checkPinReset();
    const interval = setInterval(checkPinReset, 30_000);
    return () => clearInterval(interval);
  }, [userId, identityConfirmed, pinVerifiedThisSession, pinResetDetected, swapDetected]);

  // When switching cycles, try to load cached data for past cycles.
  // When switching BACK to the current cycle, restore the live enabled-sheet
  // list so fetchUserData queries the right sheets again.
  // IMPORTANT: this effect must only run when the cycle key actually changes,
  // not on every selectedSheets / sheets update — otherwise it loops and
  // repeatedly resets results to [] on the live cycle (blank dashboard).
  useEffect(() => {
    if (!userId || !identityConfirmed || isInitializing) return;

    const cycleKey = getCycleKey(selectedCycle);
    if (lastHandledCycleKeyRef.current === cycleKey) return;
    lastHandledCycleKeyRef.current = cycleKey;

    const currentCycleKey = getCycleKey(getCycleOptions(0)[0]);
    const isPast = cycleKey !== currentCycleKey;

    if (!isPast) {
      // Returning to the live cycle — restore the default live sheet selection
      // and clear stale results so fetchUserData can repopulate cleanly.
      const liveEnabled = sheets
        .filter((s) => !s.disabled && !isDefaultUncheckedSheet(s.name) && !isTransportSubsidySheet(s.name))
        .map((s) => s.name);

      if (liveEnabled.length > 0 && !areSameSheetSelection(liveEnabled, selectedSheets)) {
        setSelectedSheets(liveEnabled);
      }
      // Drop any past-cycle results so the live cycle doesn't show stale rows
      // while fetchUserData is running.
      setResults([]);
      clearError();
      setDataError(null);
      return;
    }

    // Past cycle: clear any sticky error from a prior live-fetch attempt.
    clearError();
    setDataError(null);

    const loadCachedCycleData = async () => {
      // Load for ALL swap-related IDs so old-ID cache entries are included when
      // sheets are disabled. Results from different IDs may cover different sheets.
      const idsForCache = getWorkerIdsToFetch();
      const idsToLoad = idsForCache.length > 0 ? idsForCache : [userId];
      const cachedSheets = await loadAllSheetSnapshots(cycleKey);
      const allCachedResults: BonusResult[] = [];
      const seenKeys = new Set<string>();
      for (const cacheId of idsToLoad) {
        const rows = await loadWorkerResults(cacheId, cycleKey);
        for (const row of rows) {
          const key = `${cacheId}:${row.sheetName}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allCachedResults.push(row);
          }
        }
      }

      // Cycle filter: name match OR content match (parses dates from sheet
      // cells). This rescues sheets like "RANKING BONUS GH" whose names
      // don't include cycle dates but whose snapshot data is for it.
      const filteredCachedResults = allCachedResults.filter((r) =>
        r.sheetName ? sheetMatchesCycle(r.sheetName, selectedCycle, cachedSheets[r.sheetName]) : false
      );

      if (filteredCachedResults.length > 0) {
        setResults(filteredCachedResults);
      } else {
        setResults([]);
      }

      const cachedSheetNames = Array.from(new Set([
        ...filteredCachedResults.map((row) => row.sheetName).filter(Boolean) as string[],
        ...Object.keys(cachedSheets).filter((name) => sheetMatchesCycle(name, selectedCycle, cachedSheets[name])),
      ]));

      if (cachedSheetNames.length > 0 && !areSameSheetSelection(cachedSheetNames, selectedSheets)) {
        setSelectedSheets(cachedSheetNames);
      }

      const filteredCachedSheets = Object.fromEntries(
        Object.entries(cachedSheets).filter(([name, data]) => sheetMatchesCycle(name, selectedCycle, data))
      );
      if (Object.keys(filteredCachedSheets).length > 0) {
        setSheetDataCache((prev) => {
          const merged = { ...prev };
          for (const [name, data] of Object.entries(filteredCachedSheets)) {
            if (!merged[name]) merged[name] = data;
          }
          return merged;
        });
      }
    };

    loadCachedCycleData();
  }, [selectedCycle, userId, identityConfirmed, isInitializing, loadWorkerResults, loadAllSheetSnapshots, getWorkerIdsToFetch, sheetMatchesCycle, areSameSheetSelection, selectedSheets, sheets, clearError]);

  // Validate ID exists in sheets (used by WelcomeModal before PIN step)
  const handleIdValidation = async (newUserId: string): Promise<{ valid: boolean; userName?: string }> => {
    setIsValidating(true);
    setValidationError(null);

    // Don't block login based on swaps — in bidirectional swaps both IDs are valid
    // for different people. Swap detection happens after PIN verification instead.

    let foundUser = false;
    let foundUserName = '';

    for (const sheet of sheets.filter(s => !s.disabled)) {
      const data = await fetchSheetData(sheet.name);
      if (data) {
        const worker = searchWorker(data, newUserId);
        if (worker) {
          foundUser = true;
          foundUserName = worker.userName || newUserId;
          break;
        }
      }
    }

    setIsValidating(false);

    if (!foundUser) {
      setValidationError(`ID "${newUserId}" not found. Please check and try again.`);
      return { valid: false };
    }

    // DON'T set userId here - it causes a race condition with SessionPinGate
    return { valid: true, userName: foundUserName };
  };

  const handleWelcomeComplete = async (newUserId: string, newUserName: string | null, pinVerified: boolean) => {
    if (pinVerified) {
    // Check for ID swap before granting access
    const uid = newUserId.toUpperCase();
    const todayLocal = toLocalDateStr(Date.now());
    const { data: swapRows } = await supabase
      .from('id_swaps')
      .select('id, old_worker_id, new_worker_id, effective_date')
      .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (swapRows && swapRows.length > 0) {
      const swap = swapRows[0];
      if (swap.effective_date > todayLocal) {
        setUserId(newUserId, newUserName || undefined);
        localStorage.setItem(PIN_VERIFIED_KEY, 'true');
        setPinVerifiedThisSession(true);
        setShowWelcome(false);
        confirmIdentity(newUserId);
        toast.success(`Welcome, ${newUserName || newUserId}! Your account is secured.`);
        return;
      }
      // Per-user ack key
      const ackKey = `performanceTracker_swapAck_${swap.id}_${uid}`;
      if (!localStorage.getItem(ackKey)) {
        const isOldSide = swap.old_worker_id === uid;
        setSwapDetected({
          currentUserId: uid,
          swappedWithId: isOldSide ? swap.new_worker_id : swap.old_worker_id,
          swapId: swap.id,
        });
        setShowWelcome(false);
        return; // Don't grant access
      }
    }

      setUserId(newUserId, newUserName || undefined);
      localStorage.setItem(PIN_VERIFIED_KEY, 'true');
      setPinVerifiedThisSession(true);
      setShowWelcome(false);
      confirmIdentity(newUserId);
      toast.success(`Welcome, ${newUserName || newUserId}! Your account is secured.`);
    }
  };

  const handlePinGateVerified = useCallback(async (identityAlreadyConfirmed: boolean) => {
    // Check for ID swap before granting access
    if (userId) {
      const uid = userId.toUpperCase();
      const todayLocal = toLocalDateStr(Date.now());
      const { data: swapRows } = await supabase
        .from('id_swaps')
        .select('id, old_worker_id, new_worker_id, effective_date')
        .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (swapRows && swapRows.length > 0) {
        const swap = swapRows[0];
        if (swap.effective_date > todayLocal) {
          localStorage.setItem(PIN_VERIFIED_KEY, 'true');
          setPinVerifiedThisSession(true);
          setShowPinGate(false);
          confirmIdentity(userId || undefined);
          return;
        }
        // Per-user ack key
        const ackKey = `performanceTracker_swapAck_${swap.id}_${uid}`;
        if (!localStorage.getItem(ackKey)) {
          const isOldSide = swap.old_worker_id === uid;
          setSwapDetected({
            currentUserId: uid,
            swappedWithId: isOldSide ? swap.new_worker_id : swap.old_worker_id,
            swapId: swap.id,
          });
          return; // Don't grant access
        }
      }
    }

    localStorage.setItem(PIN_VERIFIED_KEY, 'true');
    setPinVerifiedThisSession(true);
    setShowPinGate(false);
    confirmIdentity(userId || undefined);
  }, [confirmIdentity, userId]);

  const handlePinGateSwitchUser = useCallback(async () => {
    if (userId) await releaseSession(userId);
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setPinResetDetected(null);
    setShowPinGate(false);
    setShowWelcome(true);
  }, [clearIdentity, releaseSession, userId]);

  // Handle forgot PIN - submit a reset request
  const handleForgotPin = useCallback(async (workerId: string) => {
    try {
      const { error } = await (supabase as any).from('pin_reset_requests').insert({ 
        worker_id: workerId.toUpperCase() 
      });
      if (error) throw error;
      setForgotPinSubmitted(true);
    } catch (err) {
      setForgotPinSubmitted(false);
    }
  }, []);

  const handleSwapLogout = useCallback(async () => {
    // Acknowledge the swap so the modal doesn't reappear
    // Set ack keys for BOTH IDs (old and new) so when the user logs in with their new ID,
    // the swap is already acknowledged and won't trigger another logout loop
    if (swapDetected) {
      const ackKeyOld = `performanceTracker_swapAck_${swapDetected.swapId}_${swapDetected.currentUserId}`;
      const ackKeyNew = `performanceTracker_swapAck_${swapDetected.swapId}_${swapDetected.swappedWithId}`;
      localStorage.setItem(ackKeyOld, 'true');
      localStorage.setItem(ackKeyNew, 'true');
    }
    if (userId) await releaseSession(userId);
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setSwapDetected(null);
    setPinResetDetected(null);
    setShowPinGate(false);
    setShowWelcome(true);
  }, [clearIdentity, releaseSession, userId, swapDetected]);

  const handlePinResetAcknowledge = useCallback(async () => {
    if (userId) await releaseSession(userId);
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setPinResetDetected(null);
    setShowPinGate(false);
    setShowWelcome(true);
  }, [clearIdentity, releaseSession, userId]);

  // Cycle Summary Modal handlers
  const handleCycleSummaryAnimatedClose = useCallback(() => {
    setShowCycleSummaryAnimated(false);
    markCycleSummaryAsShown();
    
    // Show the cycle selector highlight if user hasn't seen it before
    if (!hasSeenCycleSelectorHighlight()) {
      // Small delay to let the modal close animation finish
      setTimeout(() => {
        setShowCycleSelectorHighlight(true);
      }, 500);
    }
  }, [markCycleSummaryAsShown]);

  const handleOpenCycleSummaryStatic = useCallback(() => {
    setShowCycleSummaryStatic(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setDataError(null);
    setSheetDataCache({});
    await fetchSheets();
    if (userId) {
      await fetchUserData(true);
    }
    toast.success('Refreshed');
  }, [fetchSheets, fetchUserData, userId]);

  // Handle identity confirmation - bind device permanently and start heartbeat
  const handleIdentityConfirm = useCallback(async () => {
    confirmIdentity(userId || undefined);
    setShowIdentityConfirmation(false);
    toast.success('Identity confirmed! Your account is now secured.');
  }, [confirmIdentity, userId]);

  const handleIdentityDeny = useCallback(async () => {
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setShowIdentityConfirmation(false);
    setPinResetDetected(null);
    setShowWelcome(true);
    toast.info('Logged out. Please log in with your own ID.');
  }, [clearIdentity]);

  const handleSwitchUser = async () => {
    if (userId) await releaseSession(userId);
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setPinResetDetected(null);
    setShowWelcome(true);
  };

  const handleSheetSelectionChange = useCallback(async (newSelection: string[]) => {
    const previousSelection = selectedSheets;
    setSelectedSheets(newSelection);

    const newSheets = newSelection.filter(
      s => !previousSelection.includes(s) && !sheetDataCache[s]
    );

    if (newSheets.length > 0 && userId) {
      setIsFetchingData(true);
      const newCache = { ...sheetDataCache };
      
      for (const sheetName of newSheets) {
        const data = await fetchSheetData(sheetName);
        if (data) newCache[sheetName] = data;
      }
      
      setSheetDataCache(newCache);
      
      const allTimeStart = new Date(2020, 0, 1);
      const endDate = new Date();
      const newResults: BonusResult[] = [];

      for (const sheetName of newSelection) {
        const data = newCache[sheetName];
        if (data) {
          const workerIdsToFetch = getWorkerIdsToFetch();
          const idsToSearch = workerIdsToFetch.length > 0 ? workerIdsToFetch : [userId];
          for (const workerId of idsToSearch) {
            const worker = searchWorker(data, workerId);
            if (worker) {
              const result = calculateBonus(worker, allTimeStart, endDate);
              newResults.push({ ...result, sheetName: sheetName });
            }
          }
        }
      }
      
      setResults(newResults);
      setIsFetchingData(false);
    } else if (userId) {
      const allTimeStart = new Date(2020, 0, 1);
      const endDate = new Date();
      const newResults: BonusResult[] = [];

      for (const sheetName of newSelection) {
        const data = sheetDataCache[sheetName];
        if (data) {
          const workerIdsToFetch = getWorkerIdsToFetch();
          const idsToSearch = workerIdsToFetch.length > 0 ? workerIdsToFetch : [userId];
          for (const workerId of idsToSearch) {
            const worker = searchWorker(data, workerId);
            if (worker) {
              const result = calculateBonus(worker, allTimeStart, endDate);
              newResults.push({ ...result, sheetName: sheetName });
            }
          }
        }
      }
      
      setResults(newResults);
    }
  }, [selectedSheets, sheetDataCache, userId, fetchSheetData, searchWorker, calculateBonus, getWorkerIdsToFetch]);

  const cycleStats = useMemo(() => {
    let totalEarnings = 0;
    const activeDays = new Set<number>();

    adjustedResults.forEach((result) => {
      if (result.valueType === 'percent') return;

      // Exclude sheets not currently selected
      if (result.sheetName && !selectedSheets.includes(result.sheetName)) return;

      // Exclude Weekly Bonus GH and Ranking Bonus GH from totals
      if (result.sheetName && isWeeklyBonusGhSheet(result.sheetName)) return;
      if (!includeRankingBonusInTotal && result.sheetName && isRankingBonusSheet(result.sheetName)) return;

      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        const dayDate = new Date(day.fullDate);
        if (isDateInCycle(dayDate, selectedCycle)) {
          totalEarnings += day.value;
          if (day.value > 0) activeDays.add(day.fullDate);
        }
      });
    });

    return { totalEarnings, daysActive: activeDays.size };
  }, [adjustedResults, selectedCycle, selectedSheets, includeRankingBonusInTotal]);

  // Whether the user is currently viewing a past (read-only) cycle.
  const isViewingPastCycle = useMemo(() => {
    return getCycleKey(selectedCycle) !== getCycleKey(getCycleOptions(0)[0]);
  }, [selectedCycle]);

  // Whether to show the "+ ranking bonus" badge next to Total Earnings.
  // Mirrors the user's preference exactly — visible whenever the setting is ON,
  // hidden whenever the setting is OFF, regardless of selected sheets.
  const rankingBonusContributesToTotal = includeRankingBonusInTotal;

  // Helper: any "weekly bonus" sheet (GH variant or "WEEKLY BONUS FROM ..." variant).
  const isAnyWeeklyBonusSheet = (name: string): boolean => {
    if (!name) return false;
    const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return n.includes('WEEKLY') && n.includes('BONUS');
  };

  // When viewing a past cycle, hide all weekly-bonus sheets from every breakdown view.
  const displaySelectedSheets = useMemo(() => {
    if (!isViewingPastCycle) return selectedSheets;
    return selectedSheets.filter((name) => !isAnyWeeklyBonusSheet(name));
  }, [selectedSheets, isViewingPastCycle]);

  const displayResults = useMemo(() => {
    if (!isViewingPastCycle) return adjustedResults;
    return adjustedResults.filter((r) => !isAnyWeeklyBonusSheet(r.sheetName ?? ''));
  }, [adjustedResults, isViewingPastCycle]);

  // Compute yesterday's earnings for the reveal animation
  const previousDayEarnings = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    let total = 0;

    adjustedResults.forEach((result) => {
      if (result.valueType === 'percent') return;
      if (result.sheetName && !selectedSheets.includes(result.sheetName)) return;
      if (result.sheetName && isWeeklyBonusGhSheet(result.sheetName)) return;
      if (!includeRankingBonusInTotal && result.sheetName && isRankingBonusSheet(result.sheetName)) return;

      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        const d = new Date(day.fullDate);
        const dKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (dKey === yKey) {
          total += day.value;
        }
      });
    });

    return total;
  }, [adjustedResults, selectedSheets, includeRankingBonusInTotal]);

  // Get current user's stage from results
  const userStage = useMemo(() => {
    for (const result of adjustedResults) {
      const stage = (result.stage || '').trim();
      if (stage && stage.toUpperCase() !== 'N/A') return stage;
    }
    return null;
  }, [adjustedResults]);

  // Merge all Daily & Performance sheets for leaderboard (combines data across sheets in the same cycle)
  const leaderboardSheetData = useMemo(() => {
    if (selectedSheets.length === 0) return null;
    
    // Find all Daily & Performance sheets that have cached data
    const dpSheets = selectedSheets.filter(s => {
      const upper = s.toUpperCase();
      return upper.includes('DAILY') || upper.includes('PERFORMANCE');
    });
    
    if (dpSheets.length === 0) {
      // Fallback to first sheet
      return sheetDataCache[selectedSheets[0]] || null;
    }
    
    // If only one D&P sheet, return it directly
    if (dpSheets.length === 1) {
      return sheetDataCache[dpSheets[0]] || null;
    }
    
    // Merge multiple D&P sheets: concatenate their rows so the leaderboard parser
    // finds date blocks from all sheets
    const allData = dpSheets.map(name => sheetDataCache[name]).filter(Boolean) as SheetData[];
    if (allData.length === 0) return null;
    if (allData.length === 1) return allData[0];
    
    // Combine rows from all sheets (each sheet's header row becomes a regular row in the merged set)
    const mergedRows: string[][] = [];
    for (const sd of allData) {
      mergedRows.push(sd.headers); // header row contains date info in some formats
      mergedRows.push(...sd.rows);
    }
    
    return {
      headers: allData[0].headers,
      rows: mergedRows,
      sheetName: 'Combined Daily & Performance',
    } as SheetData;
  }, [selectedSheets, sheetDataCache]);


  const summaryLeaderboardCycle = useMemo(() => getPreviousCycle(selectedCycle), [selectedCycle]);

  const { currentUserRank: summaryCycleRank, totalParticipants: summaryCycleParticipants } = useLeaderboard({
    sheetData: leaderboardSheetData,
    currentUserId: userId,
    currentUserName: userName,
    userStage,
    cycle: summaryLeaderboardCycle,
    mode: 'cycle',
  });

  const peopleOutperformedInStage = useMemo(() => {
    if (summaryCycleRank === null || summaryCycleParticipants <= 0) return null;
    return Math.max(0, summaryCycleParticipants - summaryCycleRank);
  }, [summaryCycleParticipants, summaryCycleRank]);

  const isLoading = sheetsLoading || identityLoading || isFetchingData;
  
  if (isInitializing || identityLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">

      {/* Feedback Modal */}
      <FeedbackModal userId={userId} identityConfirmed={identityConfirmed} autoShow={false} />

      {/* Download App Modal */}
      <DownloadAppModal
        identityConfirmed={identityConfirmed}
        openRequestId={downloadModalRequestId}
      />

      {/* Transport Subsidy Modal */}
      <TransportSubsidyModal
        open={showSubsidyModal}
        hasExistingLink={subsidyOptedIn}
        onComplete={handleSubsidyComplete}
        onFetchSubsidy={fetchSubsidyData}
        isLoading={subsidyLoading}
        error={subsidyError}
      />

      <RankingBonusPreferenceModal
        open={showRankingPreferenceModal}
        isFromSettings={rankingPreferenceFromSettings}
        currentPreference={includeRankingBonusInTotal}
        onSavePreference={saveRankingBonusPreference}
        onClose={() => {
          setShowRankingPreferenceModal(false);
          setRankingPreferenceFromSettings(false);
        }}
      />
      <RankingBonusPreferenceModal
        open={showRankingDefaultUpdateModal && identityConfirmed && !isInitializing}
        isDefaultUpdateNotice
        currentPreference={includeRankingBonusInTotal}
        onSavePreference={saveRankingBonusPreference}
        onAcknowledgeDefaultUpdate={acknowledgeRankingDefaultUpdate}
        onClose={() => {
          acknowledgeRankingDefaultUpdate();
        }}
      />

      <SheetSettingsModal
        open={showSheetSettingsModal}
        onClose={() => setShowSheetSettingsModal(false)}
        onOpenRankingBonus={openRankingPreferenceFromSettings}
        onOpenTransportSubsidy={openTransportSubsidyFromSettings}
        rankingIncludedInTotal={includeRankingBonusInTotal}
        subsidyOptedIn={subsidyOptedIn}
        subsidyKId={subsidyKId}
      />

      {/* Admin Alerts Display */}
      <AlertsDisplay />
      
      {/* Weekly Bonus Alert */}
      <WeeklyBonusAlert />
      
      <WelcomeModal
        open={showWelcome}
        onComplete={handleWelcomeComplete}
        isValidating={isValidating}
        validationError={validationError}
        onIdValidated={handleIdValidation}
        onForgotPin={handleForgotPin}
        forgotPinSubmitted={forgotPinSubmitted}
      />

      <SessionPinGate
        open={showPinGate}
        workerId={userId || ''}
        userName={userName}
        onVerified={handlePinGateVerified}
        onSwitchUser={handlePinGateSwitchUser}
        onForgotPin={handleForgotPin}
        forgotPinSubmitted={forgotPinSubmitted}
      />

      <IdentityConfirmationModal
        open={showIdentityConfirmation}
        userId={userId || ''}
        userName={userName}
        onConfirm={handleIdentityConfirm}
        onDeny={handleIdentityDeny}
      />

      <SwapDetectionModal
        open={!!swapDetected}
        currentUserId={swapDetected?.currentUserId || ''}
        swappedWithId={swapDetected?.swappedWithId || ''}
        onLogout={handleSwapLogout}
      />

      <PinResetModal
        open={!!pinResetDetected}
        workerId={pinResetDetected?.workerId || ''}
        message={pinResetDetected?.message}
        onAcknowledge={handlePinResetAcknowledge}
      />


      <EarningsReveal
        totalEarnings={cycleStats.totalEarnings}
        daysActive={cycleStats.daysActive}
        userName={userName}
        previousDayEarnings={previousDayEarnings}
        isDataReady={!isLoading && identityConfirmed && adjustedResults.length > 0}
      />

      {/* Cycle Summary Modals */}
      {cycleSummaryData && (
        <>
          <CycleSummaryModal
            isOpen={showCycleSummaryAnimated}
            onClose={handleCycleSummaryAnimatedClose}
            summaryData={cycleSummaryData}
            userName={userName}
            onShowStaticSummary={handleOpenCycleSummaryStatic}
            peopleOutperformedInStage={peopleOutperformedInStage}
          />
          <CycleSummaryStaticModal
            isOpen={showCycleSummaryStatic}
            onClose={() => setShowCycleSummaryStatic(false)}
            summaryData={cycleSummaryData}
            userName={userName}
          />
        </>
      )}

      {/* Cycle Selector Highlight - shows after animated summary closes */}
      <CycleSelectorHighlight
        isVisible={showCycleSelectorHighlight}
        onDismiss={() => setShowCycleSelectorHighlight(false)}
        targetRef={cycleSelectorRef}
      />

      <div
        className={`flex flex-1 flex-col ${isIdentityLocked ? 'pointer-events-none select-none blur-sm' : ''}`}
        aria-hidden={isIdentityLocked}
      >
        <Header 
          onRefresh={handleRefresh} 
          isLoading={isLoading}
          userId={userId}
          userName={userName}
          onSwitchUser={identityConfirmed ? undefined : handleSwitchUser}
          theme={theme}
          accentColor={accentColor}
          onThemeChange={setTheme}
          onAccentChange={setAccentColor}
          notificationsSupported={notificationsSupported}
          notificationsEnabled={notificationsEnabled}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
          onDisableNotifications={disableNotifications}
        />

        <main className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">
          <div className="w-full max-w-7xl mx-auto">
            {/* Error */}
            {(error || dataError) && (
              <div className="mb-6">
                <ErrorAlert 
                  message={error || dataError || ''} 
                  onDismiss={() => setDataError(null)} 
                />
              </div>
            )}

            {/* Top Controls Section */}
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div ref={cycleSelectorRef}>
                  <CycleSelector
                    cycles={cycleOptions}
                    selectedCycle={selectedCycle}
                    onCycleChange={setSelectedCycle}
                    isLoading={isLoading}
                  />
                </div>
                {identityConfirmed && showDownloadBanner && (
                  <DownloadAppBanner
                    visible={true}
                    onOpenModal={() => setDownloadModalRequestId((current) => current + 1)}
                  />
                )}
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <SheetSelector
                  sheets={sheets.filter(s => !isTransportSubsidySheet(s.name))}
                  selectedSheets={selectedSheets}
                  onSelectionChange={handleSheetSelectionChange}
                  isLoading={isLoading}
                />
                <button
                  onClick={() => setShowSheetSettingsModal(true)}
                  className="h-8 w-8 rounded-md border border-border bg-background/90 hover:bg-muted/60 transition-colors flex items-center justify-center"
                  aria-label="Open sheet settings"
                  title="Open sheet settings"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
                {cycleSummaryData && (
                  <button
                    onClick={handleOpenCycleSummaryStatic}
                    className="h-8 px-3 rounded-md border border-border bg-background/90 hover:bg-muted/60 transition-colors flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    aria-label="View last cycle summary"
                    title="View last cycle summary"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Last Cycle</span>
                  </button>
                )}
              </div>
            </div>

            <RankingBonusMomentumBanner
              userId={userId}
              userName={userName}
              isLoggedIn={identityConfirmed && pinVerifiedThisSession}
            />

            {/* Hero Summary Section - Main Focus */}
            <div className="mb-8">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8">
                <CycleSummaryCard
                  cycle={selectedCycle}
                  totalEarnings={cycleStats.totalEarnings}
                  daysActive={cycleStats.daysActive}
                  isLoading={isLoading}
                  displayMode={earningsDisplay}
                  onDisplayModeChange={setEarningsDisplay}
                  tooltipDismissed={tooltipDismissed}
                  onDismissTooltip={dismissTooltip}
                  includesRankingBonus={rankingBonusContributesToTotal}
                />
              </div>
            </div>

            {/* Sheet Breakdown Cards - Details by Sheet (Directly after total earnings) */}
            <div className="mb-8">
              <SheetBreakdownCards
                results={displayResults}
                sheetNames={displaySelectedSheets}
                cycle={selectedCycle}
                isLoading={isLoading}
                displayMode={earningsDisplay}
                subsidyData={null}
                subsidyOptedIn={false}
              />
            </div>

            {/* Transport Subsidy Card — temporarily hidden */}

            {/* Removed standalone AdjustmentsPanel — now shown inside Daily Earnings section */}

            {/* Weekly Breakdown */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden">
                <WeeklyBreakdown 
                  results={displayResults} 
                  cycle={selectedCycle}
                  isLoading={isLoading}
                  displayMode={earningsDisplay}
                />
              </div>
            </div>

            {/* Daily Earnings Table - Detailed breakdown */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-x-auto space-y-6">
                <DailyEarningsTable
                  results={displayResults}
                  sheetNames={displaySelectedSheets}
                  cycle={selectedCycle}
                  isLoading={isLoading}
                  getTransferInfo={getTransferInfoForDate}
                  currentUserId={userId}
                  subsidyData={null}
                  subsidyOptedIn={false}
                  subsidyKId={null}
                />
                {/* Adjustments info — collapsed inside the daily view */}
                {adjustmentNotes.length > 0 && (
                  <AdjustmentsPanel
                    notes={adjustmentNotes}
                    netAdjustment={netAdjustment}
                    isLoading={adjustmentsLoading}
                  />
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden">
                <LeaderboardPanel
                  sheetData={leaderboardSheetData}
                  currentUserId={userId}
                  currentUserName={userName}
                  userStage={userStage}
                  cycle={selectedCycle}
                />
              </div>
            </div>

            {/* Secondary Panels Grid - Goals, Streaks, Projection at the end */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Goals Panel */}
              <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
                <GoalsPanel
                  results={adjustedResults}
                  cycle={selectedCycle}
                  cycleTarget={getCycleTarget(getCycleKey(selectedCycle))}
                  onUpdateCycleTarget={setCycleTarget}
                />
              </div>

              {/* Streaks Panel */}
              <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
                <StreaksPanel
                  streakData={streakData}
                  achievements={achievements}
                  totalUnlocked={totalUnlocked}
                  isLoading={isLoading}
                />
              </div>

              {/* Earnings Projection */}
              <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
                <EarningsProjection
                  results={adjustedResults}
                  cycle={selectedCycle}
                  cycleTarget={getCycleTarget(getCycleKey(selectedCycle))}
                  isLoading={isLoading}
                />
              </div>

              {/* Activity Feed */}
              <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
                <ActivityFeed
                  sheetData={leaderboardSheetData}
                  currentUserId={userId}
                  cycle={selectedCycle}
                />
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t py-3 text-center text-xs text-muted-foreground mt-auto">
          Built.By.Adelaja
        </footer>

        {/* Leaderboard welcome notification (one-time) */}
        <LeaderboardWelcome />
      </div>
    </div>
  );
};

export default Index;
