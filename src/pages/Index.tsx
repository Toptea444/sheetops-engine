import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
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
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useStreaksAndAchievements } from '@/hooks/useStreaksAndAchievements';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, generateDataHash } from '@/hooks/useNotifications';
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
    isLoading: identityLoading,
    setUserId,
    setUserName,
    setDailyTarget,
    setCycleTarget,
    clearIdentity,
    hasIdentity,
  } = useUserIdentity();

  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [results, setResults] = useState<BonusResult[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sheetDataCache, setSheetDataCache] = useState<Record<string, SheetData>>({});
  const [isFetchingData, setIsFetchingData] = useState(false);

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

  // Streaks & Achievements
  const { streakData, achievements, totalUnlocked } = useStreaksAndAchievements(
    results,
    selectedCycle
  );

  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        const enabledSheets = sheetsList.filter(s => !s.disabled);
        setSelectedSheets(enabledSheets.map(s => s.name));
      }
      setIsInitializing(false);
    };
    init();
  }, [fetchSheets]);

  useEffect(() => {
    if (!identityLoading && !hasIdentity && !isInitializing) {
      setShowWelcome(true);
    }
  }, [identityLoading, hasIdentity, isInitializing]);

  const fetchUserData = useCallback(async (forceRefetch = false) => {
    if (!userId || selectedSheets.length === 0) return;

    setDataError(null);
    setIsFetchingData(true);
    const newResults: BonusResult[] = [];
    const newCache: Record<string, SheetData> = { ...sheetDataCache };
    let foundInAnySheet = false;

    const allTimeStart = new Date(2020, 0, 1);
    const endDate = new Date();

    for (const sheetName of selectedSheets) {
      let data = forceRefetch ? null : sheetDataCache[sheetName];
      if (!data) {
        data = await fetchSheetData(sheetName);
        if (data) newCache[sheetName] = data;
      }
      
      if (data) {
        const worker = searchWorker(data, userId);
        if (worker) {
          foundInAnySheet = true;
          if (worker.userName && worker.userName !== userId) {
            setUserName(worker.userName);
          }
          const result = calculateBonus(worker, allTimeStart, endDate);
          newResults.push(result);
        }
      }
    }

    setSheetDataCache(newCache);
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
  }, [userId, selectedSheets, sheetDataCache, fetchSheetData, searchWorker, calculateBonus, setUserName]);

  useEffect(() => {
    if (userId && selectedSheets.length > 0 && !isInitializing) {
      fetchUserData();
    }
  }, [userId, selectedSheets, isInitializing]);

  const handleWelcomeComplete = async (newUserId: string) => {
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

    if (foundUser) {
      setUserId(newUserId, foundUserName);
      setShowWelcome(false);
      toast.success(`Welcome, ${foundUserName}!`);
    } else {
      setValidationError(`ID "${newUserId}" not found. Please check and try again.`);
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

  const handleSwitchUser = () => {
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
            newResults.push(result);
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
            newResults.push(result);
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
      if (result.stage) return result.stage;
    }
    return null;
  }, [results]);

  // Get first sheet's data for leaderboard
  const leaderboardSheetData = useMemo(() => {
    if (selectedSheets.length === 0) return null;
    // Prefer Daily & Performance sheet
    const dpSheet = selectedSheets.find(s => 
      s.toUpperCase().includes('DAILY') || s.toUpperCase().includes('PERFORMANCE')
    );
    const sheetName = dpSheet || selectedSheets[0];
    return sheetDataCache[sheetName] || null;
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
      <WelcomeModal
        open={showWelcome}
        onComplete={handleWelcomeComplete}
        isValidating={isValidating}
        validationError={validationError}
      />

      <Header 
        onRefresh={handleRefresh} 
        isLoading={isLoading}
        userId={userId}
        userName={userName}
        onSwitchUser={handleSwitchUser}
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
          <CycleSelector
            cycles={cycleOptions}
            selectedCycle={selectedCycle}
            onCycleChange={setSelectedCycle}
            isLoading={isLoading}
          />
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
                userStage={userStage}
                cycle={selectedCycle}
              />
            </div>
          </div>

          {/* Right column - Goals, Streaks, Projections */}
          <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
            <div className="p-4 border rounded-lg bg-card">
              <GoalsPanel
                results={results}
                cycle={selectedCycle}
                dailyTarget={dailyTarget}
                cycleTarget={getCycleTarget(getCycleKey(selectedCycle))}
                onUpdateDailyTarget={setDailyTarget}
                onUpdateCycleTarget={setCycleTarget}
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
        Performance Tracker
      </footer>
    </div>
  );
};

export default Index;
