import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { PerformanceCards } from '@/components/dashboard/PerformanceCards';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { GoalsPanel } from '@/components/dashboard/GoalsPanel';
import { SheetSelector } from '@/components/dashboard/SheetSelector';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import type { BonusResult, SheetInfo, SheetData } from '@/types/bonus';
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
    weeklyTarget,
    isLoading: identityLoading,
    setUserId,
    setUserName,
    setDailyTarget,
    setWeeklyTarget,
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

  // Initialize: fetch sheets list
  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        setSelectedSheets(sheetsList.map(s => s.name));
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
  const fetchUserData = useCallback(async () => {
    if (!userId || selectedSheets.length === 0) return;

    setDataError(null);
    const newResults: BonusResult[] = [];
    const newCache: Record<string, SheetData> = {};
    let foundInAnySheet = false;

    // Calculate date range: start of current month to today
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = now;

    for (const sheetName of selectedSheets) {
      // Use cached data if available
      let data = sheetDataCache[sheetName];
      if (!data) {
        data = await fetchSheetData(sheetName);
      }
      
      if (data) {
        newCache[sheetName] = data;
        const worker = searchWorker(data, userId);
        
        if (worker) {
          foundInAnySheet = true;
          
          // Update userName if found
          if (worker.userName && worker.userName !== userId) {
            setUserName(worker.userName);
          }

          // Calculate bonus for full available range
          const result = calculateBonus(worker, startOfMonth, endDate);
          
          // Also get all-time data for trends
          const allTimeStart = new Date(2020, 0, 1);
          const allTimeResult = calculateBonus(worker, allTimeStart, endDate);
          
          newResults.push({
            ...allTimeResult,
            // Keep the sheet name for reference
          });
        }
      }
    }

    setSheetDataCache(newCache);
    setResults(newResults);

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

    for (const sheet of sheets) {
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
      await fetchUserData();
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

  // Handle sheet selection change
  const handleSheetSelectionChange = (newSelection: string[]) => {
    setSelectedSheets(newSelection);
    setSheetDataCache({}); // Clear cache to refetch
  };

  const isLoading = sheetsLoading || identityLoading;

  if (isInitializing || identityLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Error Display */}
        {(error || dataError) && (
          <div className="mb-6">
            <ErrorAlert 
              message={error || dataError || ''} 
              onDismiss={() => setDataError(null)} 
            />
          </div>
        )}

        {/* Sheet Selector */}
        <div className="mb-6 flex justify-end">
          <SheetSelector
            sheets={sheets}
            selectedSheets={selectedSheets}
            onSelectionChange={handleSheetSelectionChange}
            isLoading={isLoading}
          />
        </div>

        {/* Performance Cards */}
        <div className="mb-6">
          <PerformanceCards results={results} isLoading={isLoading} />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Left: Chart */}
          <div className="space-y-6">
            <TrendChart results={results} isLoading={isLoading} />
          </div>

          {/* Right: Goals & Activity */}
          <div className="space-y-6">
            <GoalsPanel
              results={results}
              dailyTarget={dailyTarget}
              weeklyTarget={weeklyTarget}
              onUpdateDailyTarget={setDailyTarget}
              onUpdateWeeklyTarget={setWeeklyTarget}
            />
            <ActivityFeed results={results} isLoading={isLoading} />
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
