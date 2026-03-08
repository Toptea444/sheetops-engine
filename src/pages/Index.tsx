import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { IdentityConfirmationModal } from '@/components/dashboard/IdentityConfirmationModal';
import { SessionPinGate } from '@/components/dashboard/SessionPinGate';
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
import { DownloadAppModal, shouldShowDownloadBanner } from '@/components/DownloadAppModal';
import { DownloadAppBanner } from '@/components/DownloadAppBanner';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { EarningsReveal } from '@/components/dashboard/EarningsReveal';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useStreaksAndAchievements } from '@/hooks/useStreaksAndAchievements';
import { useTheme } from '@/hooks/useTheme';
import { useDisplayMode } from '@/hooks/useDisplayMode';
import { useNotifications, generateDataHash, NOTIFICATION_POLL_INTERVAL_MS } from '@/hooks/useNotifications';
import { useCycleCache } from '@/hooks/useCycleCache';
import { getCycleOptions, isDateInCycle, getCycleKey } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult, SheetData } from '@/types/bonus';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSessionLock } from '@/hooks/useSessionLock';

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

  // Persistent PIN verification (survives browser close)
  const PIN_VERIFIED_KEY = 'performanceTracker_pinVerified';
  const [pinVerifiedThisSession, setPinVerifiedThisSession] = useState(() => {
    return localStorage.getItem(PIN_VERIFIED_KEY) === 'true';
  });

  // Session lock & heartbeat
  const { claimSession, startHeartbeat, stopHeartbeat, releaseSession } = useSessionLock();

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

  // Streaks & Achievements
  const { streakData, achievements, totalUnlocked } = useStreaksAndAchievements(
    results,
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

  const isRankingBonusGhSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isRanking = n.includes('RANKINGBONUSGH') || 
           (n.includes('RANKING') && n.includes('BONUS') && n.includes('GH'));
    if (!isRanking) return false;
    // Dated ranking bonus sheets (with digits after GH) should NOT be excluded
    const hasDateSuffix = /RANKINGBONUS.*GH.*\d/.test(n) || /RANKING.*BONUS.*GH.*\d/.test(n);
    return !hasDateSuffix;
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
  const [showDownloadBanner, setShowDownloadBanner] = useState(() => shouldShowDownloadBanner());
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
        const worker = searchWorker(data, userId);
          if (worker) {
            foundInAnySheet = true;
            if (worker.userName && worker.userName !== userId) {
              setUserName(worker.userName);
            }
            const result = calculateBonus(worker, allTimeStart, endDate);
            const resultWithSheet = { ...result, sheetName: sheetName };
            newResults.push(resultWithSheet);
            // Cache the worker result for this cycle
            saveWorkerResult(userId, sheetName, selectedCycle, resultWithSheet);
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
  }, [userId, selectedSheets, sheetDataCache, fetchSheetData, searchWorker, calculateBonus, setUserName, identityConfirmed, selectedCycle, saveWorkerResult, saveSheetSnapshot, loadWorkerResults, loadAllSheetSnapshots]);

  useEffect(() => {
    if (userId && selectedSheets.length > 0 && !isInitializing && identityConfirmed) {
      fetchUserData();
    }
  }, [userId, selectedSheets, isInitializing, identityConfirmed]);

  // Background polling: re-fetch data every 5 minutes when notifications are enabled
  useEffect(() => {
    if (!notificationsEnabled || !userId || !identityConfirmed || selectedSheets.length === 0) return;

    const interval = setInterval(() => {
      fetchUserData(true); // force refetch to bypass cache
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [notificationsEnabled, userId, identityConfirmed, selectedSheets, fetchUserData]);

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
      // Now set the userId (after full flow completes)
      setUserId(newUserId, newUserName || undefined);
      localStorage.setItem(PIN_VERIFIED_KEY, 'true');
      setPinVerifiedThisSession(true);
      setShowWelcome(false);
      
      // Always confirm identity when PIN is verified
      confirmIdentity(newUserId);
      
      // Claim session and start heartbeat for online presence
      await claimSession(newUserId);
      startHeartbeat(newUserId);
      
      toast.success(`Welcome, ${newUserName || newUserId}! Your account is secured.`);
    }
  };

  const handlePinGateVerified = useCallback(async (identityAlreadyConfirmed: boolean) => {
    localStorage.setItem(PIN_VERIFIED_KEY, 'true');
    setPinVerifiedThisSession(true);
    setShowPinGate(false);
    
    // Always confirm identity when PIN is verified (PIN is proof of identity)
    confirmIdentity(userId || undefined);
    
    // Claim session and start heartbeat for online presence
    if (userId) {
      await claimSession(userId);
      startHeartbeat(userId);
    }
  }, [confirmIdentity, userId, claimSession, startHeartbeat]);

  const handlePinGateSwitchUser = useCallback(async () => {
    // Stop heartbeat and release session before switching
    stopHeartbeat();
    if (userId) await releaseSession(userId);
    
    localStorage.removeItem(PIN_VERIFIED_KEY);
    setPinVerifiedThisSession(false);
    clearIdentity();
    setResults([]);
    setDataError(null);
    setShowPinGate(false);
    setShowWelcome(true);
  }, [clearIdentity, stopHeartbeat, releaseSession, userId]);

  // Handle forgot PIN - submit a reset request
  const handleForgotPin = useCallback(async (workerId: string) => {
    try {
      const { error } = await (supabase as any).from('pin_reset_requests').insert({ 
        worker_id: workerId.toUpperCase() 
      });
      if (error) throw error;
      setForgotPinSubmitted(true);
      toast.success('PIN reset request sent! Please contact your admin to approve.');
    } catch (err) {
      toast.error('Failed to submit request. Please try again.');
    }
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

    results.forEach((result) => {
      if (result.valueType === 'percent') return;

      // Exclude sheets not currently selected
      if (result.sheetName && !selectedSheets.includes(result.sheetName)) return;

      // Exclude Weekly Bonus GH and Ranking Bonus GH from totals
      if (result.sheetName && (isWeeklyBonusGhSheet(result.sheetName) || isRankingBonusGhSheet(result.sheetName))) return;

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
  }, [results, selectedCycle, selectedSheets]);

  // Compute yesterday's earnings for the reveal animation
  const previousDayEarnings = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    let total = 0;

    results.forEach((result) => {
      if (result.valueType === 'percent') return;
      if (result.sheetName && !selectedSheets.includes(result.sheetName)) return;
      if (result.sheetName && (isWeeklyBonusGhSheet(result.sheetName) || isRankingBonusGhSheet(result.sheetName))) return;

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
  }, [results, selectedSheets]);

  // Get current user's stage from results
  const userStage = useMemo(() => {
    for (const result of results) {
      const stage = (result.stage || '').trim();
      if (stage && stage.toUpperCase() !== 'N/A') return stage;
    }
    return null;
  }, [results]);

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
      <FeedbackModal userId={userId} identityConfirmed={identityConfirmed} />

      {/* Download App Modal */}
      <DownloadAppModal
        userId={userId}
        identityConfirmed={identityConfirmed}
        openRequestId={downloadModalRequestId}
        onShowBanner={() => setShowDownloadBanner(true)}
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

      {/* Daily Earnings Reveal Animation */}
      <EarningsReveal
        totalEarnings={cycleStats.totalEarnings}
        daysActive={cycleStats.daysActive}
        userName={userName}
        previousDayEarnings={previousDayEarnings}
        isDataReady={!isLoading && identityConfirmed && results.length > 0}
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8">
              <div className="flex items-center justify-between flex-1 min-w-0">
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
              <div className="flex-1 min-w-0">
                <SheetSelector
                  sheets={sheets}
                  selectedSheets={selectedSheets}
                  onSelectionChange={handleSheetSelectionChange}
                  isLoading={isLoading}
                />
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

            {/* Sheet Breakdown Cards - Details by Sheet (Directly after total earnings) */}
            <div className="mb-8">
              <SheetBreakdownCards
                results={results}
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
                  results={results} 
                  cycle={selectedCycle}
                  isLoading={isLoading}
                  displayMode={earningsDisplay}
                />
              </div>
            </div>

            {/* Daily Earnings Table - Detailed breakdown */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-x-auto">
                <DailyEarningsTable
                  results={results}
                  sheetNames={selectedSheets}
                  cycle={selectedCycle}
                  isLoading={isLoading}
                />
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
                  results={results}
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
                  results={results}
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
