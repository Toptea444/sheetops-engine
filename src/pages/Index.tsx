import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { IdentityConfirmationModal } from '@/components/dashboard/IdentityConfirmationModal';
import { CycleSelector } from '@/components/dashboard/CycleSelector';
import { CycleSummaryCard } from '@/components/dashboard/CycleSummaryCard';
import { SheetBreakdownCards } from '@/components/dashboard/SheetBreakdownCards';
import { DailyEarningsTable } from '@/components/dashboard/DailyEarningsTable';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { GoalsPanel } from '@/components/dashboard/GoalsPanel';
import { SheetSelector } from '@/components/dashboard/SheetSelector';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { StreaksPanel } from '@/components/dashboard/StreaksPanel';
import { EarningsProjection } from '@/components/dashboard/EarningsProjection';
import { LeaderboardPanel } from '@/components/dashboard/LeaderboardPanel';
import { LeaderboardWelcome } from '@/components/dashboard/LeaderboardWelcome';
import { WeeklyBonusAlert } from '@/components/dashboard/WeeklyBonusAlert';
import { RankingBonusAlert } from '@/components/dashboard/RankingBonusAlert';
import { WeeklyChallenges } from '@/components/dashboard/WeeklyChallenges';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { WeeklyMVPs } from '@/components/dashboard/WeeklyMVPs';
import { AvatarPicker } from '@/components/dashboard/AvatarPicker';
import { CacheIndicator } from '@/components/dashboard/CacheIndicator';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useStreaksAndAchievements } from '@/hooks/useStreaksAndAchievements';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, generateDataHash } from '@/hooks/useNotifications';
import { useSessionLock } from '@/hooks/useSessionLock';
import { useCycleCache } from '@/hooks/useCycleCache';
import { getCycleOptions, isDateInCycle, getCycleKey } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult, SheetData } from '@/types/bonus';
import { toast } from 'sonner';

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
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [showIdentityConfirmation, setShowIdentityConfirmation] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [results, setResults] = useState<BonusResult[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sheetDataCache, setSheetDataCache] = useState<Record<string, SheetData>>({});
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycle, setSelectedCycle] = useState<CyclePeriod>(cycleOptions[0]);

  // Theme
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();

  // Notifications
  const {
    isSupported: notificationsSupported,
    isEnabled: notificationsEnabled,
    permission: notificationPermission,
    enableNotifications,
    disableNotifications,
    checkForUpdates,
  } = useNotifications();

  // Session lock for cross-device protection
  const {
    lockError: sessionLockError,
    claimSession,
    releaseSession,
    startHeartbeat,
    stopHeartbeat,
    bindDeviceToWorker,
  } = useSessionLock();

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

  // Helper to check if a sheet is the "Weekly Bonus GH" sheet
  const isWeeklyBonusGhSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z]/g, '');
    return n.includes('WEEKLYBONUSGH') || 
           (n.includes('WEEKLY') && n.includes('BONUS') && n.includes('GH'));
  };

  // Helper to check if a sheet is the "Ranking Bonus GH" sheet
  const isRankingBonusGhSheet = (name: string): boolean => {
    const n = name.toUpperCase().replace(/[^A-Z]/g, '');
    return n.includes('RANKINGBONUSGH') || 
           (n.includes('RANKING') && n.includes('BONUS') && n.includes('GH'));
  };

  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        // Exclude disabled sheets AND the Weekly Bonus GH sheet
        const enabledSheets = sheetsList.filter(s => 
          !s.disabled && !isWeeklyBonusGhSheet(s.name) && !isRankingBonusGhSheet(s.name)
        );
        setSelectedSheets(enabledSheets.map(s => s.name));
      }
      setIsInitializing(false);
    };
    init();
  }, [fetchSheets]);

  // Show welcome modal for new users OR identity confirmation for returning users who haven't confirmed
  useEffect(() => {
    if (!identityLoading && !isInitializing) {
      if (!hasIdentity) {
        setShowWelcome(true);
      } else if (!identityConfirmed) {
        // Existing user but hasn't confirmed identity yet
        setShowIdentityConfirmation(true);
      }
    }
  }, [identityLoading, hasIdentity, isInitializing, identityConfirmed]);

  // Start heartbeat for already confirmed users on mount
  useEffect(() => {
    if (userId && identityConfirmed) {
      // Reclaim session (handles stale sessions) and start heartbeat
      claimSession(userId).then((claimed) => {
        if (claimed) {
          startHeartbeat(userId);
        }
      });
    }
    
    return () => {
      stopHeartbeat();
    };
  }, [userId, identityConfirmed, claimSession, startHeartbeat, stopHeartbeat]);

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
    setIsFromCache(false);
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
        setIsFromCache(true);
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
        setIsFromCache(true);
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
  const handleIdValidation = async (newUserId: string): Promise<boolean> => {
    setIsValidating(true);
    setValidationError(null);

    // First check session lock
    const canClaim = await claimSession(newUserId);
    if (!canClaim) {
      setIsValidating(false);
      // sessionLockError will be shown via the modal
      return false;
    }

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
      // Release the session since user wasn't found
      await releaseSession(newUserId);
      setValidationError(`ID "${newUserId}" not found. Please check and try again.`);
      return false;
    }

    // Store the user name for later
    setUserId(newUserId, foundUserName);
    return true;
  };

  const handleWelcomeComplete = async (newUserId: string, pinVerified: boolean) => {
    if (pinVerified) {
      setShowWelcome(false);
      // Always require explicit identity confirmation before unlocking the app.
      setShowIdentityConfirmation(true);
      toast.success(`Welcome, ${userName || newUserId}!`);
    }
  };

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
    if (userId) {
      // Bind this device permanently to this worker ID
      const bound = await bindDeviceToWorker(userId);
      if (!bound) {
        toast.error('Failed to secure your identity. Please try again.');
        return;
      }

      // Claim session and start heartbeat
      const claimed = await claimSession(userId);
      if (claimed) {
        startHeartbeat(userId);
      }
    }
    confirmIdentity(userId || undefined);
    setShowIdentityConfirmation(false);
    toast.success('Identity confirmed! Your account is now secured.');
  }, [confirmIdentity, userId, claimSession, startHeartbeat, bindDeviceToWorker]);

  const handleIdentityDeny = useCallback(async () => {
    if (userId) {
      await releaseSession(userId);
      stopHeartbeat();
    }
    clearIdentity();
    setResults([]);
    setDataError(null);
    setShowIdentityConfirmation(false);
    setShowWelcome(true);
    toast.info('Logged out. Please log in with your own ID.');
  }, [clearIdentity, userId, releaseSession, stopHeartbeat]);

  const handleSwitchUser = async () => {
    if (userId) {
      await releaseSession(userId);
      stopHeartbeat();
    }
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
  }, [results, selectedCycle]);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Weekly Bonus Alert */}
      <WeeklyBonusAlert />
      <RankingBonusAlert />
      
      <WelcomeModal
        open={showWelcome}
        onComplete={handleWelcomeComplete}
        isValidating={isValidating}
        validationError={validationError}
        sessionLockError={sessionLockError}
        onIdValidated={handleIdValidation}
      />

      <IdentityConfirmationModal
        open={showIdentityConfirmation}
        userId={userId || ''}
        userName={userName}
        onConfirm={handleIdentityConfirm}
        onDeny={handleIdentityDeny}
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

        <main className="flex-1 container mx-auto px-4 py-4 max-w-4xl">
        {/* Error */}
        {(error || dataError) && (
          <div className="mb-4">
            <ErrorAlert 
              message={error || dataError || ''} 
              onDismiss={() => setDataError(null)} 
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CycleSelector
              cycles={cycleOptions}
              selectedCycle={selectedCycle}
              onCycleChange={setSelectedCycle}
              isLoading={isLoading}
            />
            <CacheIndicator isFromCache={isFromCache} />
          </div>
          <SheetSelector
            sheets={sheets}
            selectedSheets={selectedSheets}
            onSelectionChange={handleSheetSelectionChange}
            isLoading={isLoading}
          />
        </div>

        {/* Main content */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 border rounded-lg bg-card">
              <CycleSummaryCard
                cycle={selectedCycle}
                totalEarnings={cycleStats.totalEarnings}
                daysActive={cycleStats.daysActive}
                isLoading={isLoading}
              />
            </div>

            {/* Breakdown */}
            <SheetBreakdownCards
              results={results}
              sheetNames={selectedSheets}
              cycle={selectedCycle}
              isLoading={isLoading}
            />

            {/* Chart */}
            <div className="p-4 border rounded-lg bg-card">
              <TrendChart 
                results={results} 
                cycle={selectedCycle}
                isLoading={isLoading} 
              />
            </div>

            {/* Table */}
            <div className="p-4 border rounded-lg bg-card">
              <DailyEarningsTable
                results={results}
                sheetNames={selectedSheets}
                cycle={selectedCycle}
                isLoading={isLoading}
              />
            </div>

            {/* Leaderboard */}
            <div className="p-4 border rounded-lg bg-card">
              <LeaderboardPanel
                sheetData={leaderboardSheetData}
                currentUserId={userId}
                currentUserName={userName}
                userStage={userStage}
                cycle={selectedCycle}
              />
            </div>
          </div>

          {/* Right column - Goals, Challenges, Streaks, Activity */}
          <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
            {/* Avatar Picker - shown at top */}
            {userId && identityConfirmed && (
              <div 
                className="flex items-center gap-3 p-3 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!avatarPickerOpen) setAvatarPickerOpen(true);
                }}
              >
                <AvatarPicker
                  key={avatarKey}
                  userId={userId}
                  open={avatarPickerOpen}
                  onOpenChange={setAvatarPickerOpen}
                  onAvatarChange={() => setAvatarKey(k => k + 1)}
                />
                <div className="flex-1 min-w-0 pointer-events-none">
                  <p className="text-sm font-medium truncate">{userName || userId}</p>
                  <p className="text-xs text-muted-foreground">Click to customize</p>
                </div>
              </div>
            )}

            <div className="p-4 border rounded-lg bg-card">
              <GoalsPanel
                results={results}
                cycle={selectedCycle}
                cycleTarget={getCycleTarget(getCycleKey(selectedCycle))}
                onUpdateCycleTarget={setCycleTarget}
              />
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <WeeklyChallenges
                results={results}
                cycle={selectedCycle}
              />
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <StreaksPanel
                streakData={streakData}
                achievements={achievements}
                totalUnlocked={totalUnlocked}
                isLoading={isLoading}
              />
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <WeeklyMVPs
                sheetData={leaderboardSheetData}
                currentUserId={userId}
                cycle={selectedCycle}
              />
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <ActivityFeed
                sheetData={leaderboardSheetData}
                currentUserId={userId}
                cycle={selectedCycle}
              />
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <EarningsProjection
                results={results}
                cycle={selectedCycle}
                cycleTarget={getCycleTarget(getCycleKey(selectedCycle))}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
        </main>

        <footer className="border-t py-3 text-center text-xs text-muted-foreground mt-auto">
          Bonus Tracker
        </footer>

        {/* Leaderboard welcome notification (one-time) */}
        <LeaderboardWelcome />
      </div>
    </div>
  );
};

export default Index;
