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
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { getCycleOptions, isDateInCycle } from '@/lib/cycleUtils';
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
    cycleTarget,
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

  // Cycle state
  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycle, setSelectedCycle] = useState<CyclePeriod>(cycleOptions[0]);

  // Initialize: fetch sheets list
  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        // Only select enabled sheets
        const enabledSheets = sheetsList.filter(s => !s.disabled);
        setSelectedSheets(enabledSheets.map(s => s.name));
      }
      setIsInitializing(false);
    };
    init();
  }, [fetchSheets]);

  // Show welcome modal if no identity
  useEffect(() => {
    if (!identityLoading && !hasIdentity && !isInitializing) {
      setShowWelcome(true);
    }
  }, [identityLoading, hasIdentity, isInitializing]);

  // Fetch data for all selected sheets and calculate bonuses when user is set
  const fetchUserData = useCallback(async (forceRefetch = false) => {
    if (!userId || selectedSheets.length === 0) return;

    setDataError(null);
    setIsFetchingData(true);
    const newResults: BonusResult[] = [];
    const newCache: Record<string, SheetData> = { ...sheetDataCache };
    let foundInAnySheet = false;

    // Calculate date range for all-time data (we filter by cycle in display)
    const allTimeStart = new Date(2020, 0, 1);
    const endDate = new Date();

    for (const sheetName of selectedSheets) {
      // Use cached data if available and not force refreshing
      let data = forceRefetch ? null : sheetDataCache[sheetName];
      if (!data) {
        data = await fetchSheetData(sheetName);
        if (data) {
          newCache[sheetName] = data;
        }
      }
      
      if (data) {
        const worker = searchWorker(data, userId);
        
        if (worker) {
          foundInAnySheet = true;
          
          // Update userName if found
          if (worker.userName && worker.userName !== userId) {
            setUserName(worker.userName);
          }

          // Calculate bonus for all available data
          const result = calculateBonus(worker, allTimeStart, endDate);
          newResults.push(result);
        }
      }
    }

    setSheetDataCache(newCache);
    setResults(newResults);
    setIsFetchingData(false);

    if (!foundInAnySheet && userId) {
      setDataError(`No data found for "${userId}" in any of the selected sheets.`);
    }
  }, [userId, selectedSheets, sheetDataCache, fetchSheetData, searchWorker, calculateBonus, setUserName]);

  // Fetch user data when userId or selectedSheets change
  useEffect(() => {
    if (userId && selectedSheets.length > 0 && !isInitializing) {
      fetchUserData();
    }
  }, [userId, selectedSheets, isInitializing]);

  // Handle welcome modal completion
  const handleWelcomeComplete = async (newUserId: string) => {
    setIsValidating(true);
    setValidationError(null);

    // Validate by checking if user exists in any sheet
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
      setValidationError(`ID "${newUserId}" not found in any sheet. Please check and try again.`);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setDataError(null);
    setSheetDataCache({});
    await fetchSheets();
    if (userId) {
      await fetchUserData(true);
    }
    toast.success('Data refreshed successfully');
  }, [fetchSheets, fetchUserData, userId]);

  // Handle switch user
  const handleSwitchUser = () => {
    clearIdentity();
    setResults([]);
    setDataError(null);
    setShowWelcome(true);
  };

  // Handle sheet selection change - with caching, only fetch new sheets
  const handleSheetSelectionChange = useCallback(async (newSelection: string[]) => {
    const previousSelection = selectedSheets;
    setSelectedSheets(newSelection);

    // Find newly added sheets that aren't in cache
    const newSheets = newSelection.filter(
      s => !previousSelection.includes(s) && !sheetDataCache[s]
    );

    if (newSheets.length > 0 && userId) {
      setIsFetchingData(true);
      const newCache = { ...sheetDataCache };
      
      for (const sheetName of newSheets) {
        const data = await fetchSheetData(sheetName);
        if (data) {
          newCache[sheetName] = data;
        }
      }
      
      setSheetDataCache(newCache);
      
      // Recalculate results with new data
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
      // Just recalculate from cache
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

  // Calculate cycle-specific stats
  const cycleStats = useMemo(() => {
    let totalEarnings = 0;
    const activeDays = new Set<number>();

    results.forEach((result) => {
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        
        const dayDate = new Date(day.fullDate);
        if (isDateInCycle(dayDate, selectedCycle)) {
          totalEarnings += day.value;
          if (day.value > 0) {
            activeDays.add(day.fullDate);
          }
        }
      });
    });

    return {
      totalEarnings,
      daysActive: activeDays.size,
    };
  }, [results, selectedCycle]);

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
      />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Error Display */}
        {(error || dataError) && (
          <ErrorAlert 
            message={error || dataError || ''} 
            onDismiss={() => setDataError(null)} 
          />
        )}

        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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

        {/* Cycle Summary Card */}
        <CycleSummaryCard
          cycle={selectedCycle}
          totalEarnings={cycleStats.totalEarnings}
          daysActive={cycleStats.daysActive}
          isLoading={isLoading}
        />

        {/* Sheet Breakdown */}
        <SheetBreakdownCards
          results={results}
          sheetNames={selectedSheets}
          isLoading={isLoading}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Left: Chart and Table */}
          <div className="space-y-6">
            <TrendChart 
              results={results} 
              cycle={selectedCycle}
              isLoading={isLoading} 
            />
            <DailyEarningsTable
              results={results}
              sheetNames={selectedSheets}
              cycle={selectedCycle}
              isLoading={isLoading}
            />
          </div>

          {/* Right: Goals */}
          <div>
            <GoalsPanel
              results={results}
              cycle={selectedCycle}
              dailyTarget={dailyTarget}
              cycleTarget={cycleTarget}
              onUpdateDailyTarget={setDailyTarget}
              onUpdateCycleTarget={setCycleTarget}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground mt-auto">
        <p>Performance Tracker • Data synced from Google Sheets</p>
      </footer>
    </div>
  );
};

export default Index;
