import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { IdentityConfirmationModal } from '@/components/dashboard/IdentityConfirmationModal';
import { SessionPinGate } from '@/components/dashboard/SessionPinGate';
import { SwapDetectionModal } from '@/components/dashboard/SwapDetectionModal';
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
import { RankingBonusPreferenceModal } from '@/components/dashboard/RankingBonusPreferenceModal';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AdjustmentsPanel } from '@/components/dashboard/AdjustmentsPanel';
import { EarningsReveal } from '@/components/dashboard/EarningsReveal';
import { CycleSummaryModal } from '@/components/dashboard/CycleSummaryModal';
import { CycleSummaryStaticModal } from '@/components/dashboard/CycleSummaryStaticModal';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useCycleSummary } from '@/hooks/useCycleSummary';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useStreaksAndAchievements } from '@/hooks/useStreaksAndAchievements';
import { useTheme } from '@/hooks/useTheme';
import { useDisplayMode } from '@/hooks/useDisplayMode';
import { useEarningsAdjustments } from '@/hooks/useEarningsAdjustments';
import { useNotifications, generateDataHash, NOTIFICATION_POLL_INTERVAL_MS } from '@/hooks/useNotifications';
import { useCycleCache } from '@/hooks/useCycleCache';
import { getCycleOptions, isDateInCycle, getCycleKey } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult, SheetData } from '@/types/bonus';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSessionLock } from '@/hooks/useSessionLock';
import { Settings, CalendarDays } from 'lucide-react';

const Index = () => {
  const { 
    isLoading: sheetsLoading, 
    error, 
    sheets, 
    fetchSheets, 
    fetchSheetData,
    searchWorker,
    calculateBonus 
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
  const RANKING_BONUS_TOTAL_PREF_KEY = 'performanceTracker_includeRankingBonusInTotal';
  const [includeRankingBonusInTotal, setIncludeRankingBonusInTotal] = useState(false);
  const [rankingPreferenceSet, setRankingPreferenceSet] = useState(false);
  const [showRankingPreferenceModal, setShowRankingPreferenceModal] = useState(false);
  const [rankingPreferenceFromSettings, setRankingPreferenceFromSettings] = useState(false);

  // Cycle Summary Modal states
  const [showCycleSummaryAnimated, setShowCycleSummaryAnimated] = useState(false);
  const [showCycleSummaryStatic, setShowCycleSummaryStatic] = useState(false);
  const [cycleSummaryShownThisSession, setCycleSummaryShownThisSession] = useState(false);

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

  // Earnings Adjustments (swap/transfer correction layer)
  const {
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
    const savedPreference = localStorage.getItem(RANKING_BONUS_TOTAL_PREF_KEY);
    if (savedPreference === 'true' || savedPreference === 'false') {
      setIncludeRankingBonusInTotal(savedPreference === 'true');
      setRankingPreferenceSet(true);
    }
  }, []);

  useEffect(() => {
    if (identityConfirmed && !isInitializing && !rankingPreferenceSet) {
      setRankingPreferenceFromSettings(false);
      setShowRankingPreferenceModal(true);
    }
  }, [identityConfirmed, isInitializing, rankingPreferenceSet]);

  const saveRankingBonusPreference = useCallback((shouldInclude: boolean) => {
    localStorage.setItem(RANKING_BONUS_TOTAL_PREF_KEY, shouldInclude ? 'true' : 'false');
    setIncludeRankingBonusInTotal(shouldInclude);
    setRankingPreferenceSet(true);
  }, []);

  const openRankingPreferenceFromSettings = () => {
    setRankingPreferenceFromSettings(true);
    setShowRankingPreferenceModal(true);
  };
  
  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        // Exclude disabled sheets AND the Weekly Bonus GH sheet
        const enabledSheets = sheetsList.filter(s => 
          !s.disabled && !isDefaultUncheckedSheet(s.name)
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

    // Get all worker IDs to fetch (includes swap-related IDs)
    const workerIdsToFetch = getWorkerIdsToFetch();
    // If no swaps, just use the current userId
    const idsToSearch = workerIdsToFetch.length > 0 ? workerIdsToFetch : [userId];

    for (const sheetName of selectedSheets) {
      let data = forceRefetch ? null : sheetDataCache[sheetName];
      if (!data) {
        data = await fetchSheetData(sheetName);
        if (data) {
          newCache[sheetName] = data;
          // Cache the sheet snapshot for this cycle
          saveSheetSnapshot(sheetName, selectedCycle, data);
        }
      }
      
      if (data) {
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
            newResults.push(resultWithSheet);
            // Cache the worker result for this cycle
            saveWorkerResult(workerId, sheetName, selectedCycle, resultWithSheet);
          }
        }
      }
    }

    setSheetDataCache(newCache);

    // If no live data found, try loading from cache (sheet may have been disabled)
    if (!foundInAnySheet && userId) {
      const cachedResults = await loadWorkerResults(userId, currentCycleKey);
      if (cachedResults.length > 0) {
        setResults(cachedResults);
        setIsFetchingData(false);
        // Also load cached sheet snapshots for leaderboard etc.
        const cachedSheets = await loadAllSheetSnapshots(currentCycleKey);
        setSheetDataCache(prev => ({ ...prev, ...cachedSheets }));
        return;
      }
    }

    setResults(newResults);
    setIsFetchingData(false);

    // Check for data updates (notifications)
    if (newResults.length > 0) {
      const dataHash = generateDataHash(newResults);
      checkForUpdates(dataHash);
    }

    if (!foundInAnySheet && userId) {
      setDataError(`No data found for "${userId}" in any of the selected sheets.`);
    }
  }, [userId, selectedSheets, sheetDataCache, fetchSheetData, searchWorker, calculateBonus, setUserName, identityConfirmed, selectedCycle, saveWorkerResult, saveSheetSnapshot, loadWorkerResults, loadAllSheetSnapshots, getWorkerIdsToFetch]);

  useEffect(() => {
    if (userId && selectedSheets.length > 0 && !isInitializing && identityConfirmed) {
      fetchUserData();
    }
  }, [userId, selectedSheets, isInitializing, identityConfirmed]);

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
      
      // Find any swap involving this user's ID (either side of a bidirectional swap)
      const { data: swapRes } = await supabase.from('id_swaps')
        .select('id, old_worker_id, new_worker_id')
        .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (swapRes && swapRes.length > 0) {
        const swap = swapRes[0];
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

  // When switching cycles, try to load cached data for past cycles
  useEffect(() => {
    if (!userId || !identityConfirmed || isInitializing) return;

    const cycleKey = getCycleKey(selectedCycle);
    const currentCycleKey = getCycleKey(getCycleOptions(0)[0]);

    // Only use cache fallback for past cycles
    if (cycleKey === currentCycleKey) return;

    const loadCachedCycleData = async () => {
      const cachedResults = await loadWorkerResults(userId, cycleKey);
      if (cachedResults.length > 0) {
        // Merge cached results with any live results (live takes priority)
        setResults(prev => {
          const liveSheets = new Set(prev.map(r => r.sheetName));
          const cachedOnly = cachedResults.filter(r => !liveSheets.has(r.sheetName));
          return cachedOnly.length > 0 ? [...prev, ...cachedOnly] : prev;
        });
      }

      // Load cached sheet snapshots for leaderboard
      const cachedSheets = await loadAllSheetSnapshots(cycleKey);
      if (Object.keys(cachedSheets).length > 0) {
        setSheetDataCache(prev => {
          const merged = { ...prev };
          for (const [name, data] of Object.entries(cachedSheets)) {
            if (!merged[name]) merged[name] = data;
          }
          return merged;
        });
      }
    };

    loadCachedCycleData();
  }, [selectedCycle, userId, identityConfirmed, isInitializing, loadWorkerResults, loadAllSheetSnapshots]);

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
    const { data: swapRows } = await supabase
      .from('id_swaps')
      .select('id, old_worker_id, new_worker_id')
      .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (swapRows && swapRows.length > 0) {
      const swap = swapRows[0];
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
      const { data: swapRows } = await supabase
        .from('id_swaps')
        .select('id, old_worker_id, new_worker_id')
        .or(`old_worker_id.eq.${uid},new_worker_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (swapRows && swapRows.length > 0) {
        const swap = swapRows[0];
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
    setShowPinGate(false);
    setShowWelcome(true);
  }, [clearIdentity, releaseSession, userId, swapDetected]);

  // Cycle Summary Modal handlers
  const handleCycleSummaryAnimatedClose = useCallback(() => {
    setShowCycleSummaryAnimated(false);
    markCycleSummaryAsShown();
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
          const worker = searchWorker(data, userId);
          if (worker) {
            const result = calculateBonus(worker, allTimeStart, endDate);
            newResults.push({ ...result, sheetName: sheetName });
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
          const worker = searchWorker(data, userId);
          if (worker) {
            const result = calculateBonus(worker, allTimeStart, endDate);
            newResults.push({ ...result, sheetName: sheetName });
          }
        }
      }
      
      setResults(newResults);
    }
  }, [selectedSheets, sheetDataCache, userId, fetchSheetData, searchWorker, calculateBonus]);

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
          />
          <CycleSummaryStaticModal
            isOpen={showCycleSummaryStatic}
            onClose={() => setShowCycleSummaryStatic(false)}
            summaryData={cycleSummaryData}
            userName={userName}
          />
        </>
      )}

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
                <CycleSelector
                  cycles={cycleOptions}
                  selectedCycle={selectedCycle}
                  onCycleChange={setSelectedCycle}
                  isLoading={isLoading}
                />
                {identityConfirmed && showDownloadBanner && (
                  <DownloadAppBanner
                    visible={true}
                    onOpenModal={() => setDownloadModalRequestId((current) => current + 1)}
                  />
                )}
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <SheetSelector
                  sheets={sheets}
                  selectedSheets={selectedSheets}
                  onSelectionChange={handleSheetSelectionChange}
                  isLoading={isLoading}
                />
                <button
                  onClick={openRankingPreferenceFromSettings}
                  className="h-8 w-8 rounded-md border border-border bg-background/90 hover:bg-muted/60 transition-colors flex items-center justify-center"
                  aria-label="Ranking bonus total settings"
                  title="Ranking bonus total settings"
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
                />
              </div>
            </div>

            {/* Removed standalone AdjustmentsPanel — now shown inside Daily Earnings section */}

            {/* Sheet Breakdown Cards - Details by Sheet (Directly after total earnings) */}
            <div className="mb-8">
              <SheetBreakdownCards
                results={adjustedResults}
                sheetNames={selectedSheets}
                cycle={selectedCycle}
                isLoading={isLoading}
                displayMode={earningsDisplay}
              />
            </div>

            {/* Weekly Breakdown */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden">
                <WeeklyBreakdown 
                  results={adjustedResults} 
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
                  results={adjustedResults}
                  sheetNames={selectedSheets}
                  cycle={selectedCycle}
                  isLoading={isLoading}
                  getTransferInfo={getTransferInfoForDate}
                  currentUserId={userId}
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
