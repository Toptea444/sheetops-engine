import { useEffect, useState, useCallback } from 'react';
import { Users, Search, LayoutGrid } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SheetTabs } from '@/components/dashboard/SheetTabs';
import { BulkSearchPanel } from '@/components/dashboard/BulkSearchPanel';
import { BulkResultsPanel } from '@/components/dashboard/BulkResultsPanel';
import { DaysNotWorkedPanel, DeductionSummary, type DeductionResult } from '@/components/dashboard/DaysNotWorkedPanel';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { TeamOverview, type WorkerSummary } from '@/components/dashboard/TeamOverview';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import type { BonusResult, WorkerData } from '@/types/bonus';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TL = () => {
  const { 
    isLoading, 
    error, 
    sheets, 
    sheetData, 
    fetchSheets, 
    fetchSheetData,
    searchWorker,
    calculateBonus,
    getAllWorkers,
    getSheetDateRange,
  } = useGoogleSheets();

  const [activeSheet, setActiveSheet] = useState('');
  const [results, setResults] = useState<BonusResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null);
  const [searchDates, setSearchDates] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedWorkerForDeduction, setSelectedWorkerForDeduction] = useState<BonusResult | null>(null);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'overview'>('overview');

  // Initialize: fetch sheets list
  useEffect(() => {
    const init = async () => {
      const sheetsList = await fetchSheets();
      if (sheetsList.length > 0) {
        setActiveSheet(sheetsList[0].name);
        await fetchSheetData(sheetsList[0].name);
      }
      setIsInitializing(false);
    };
    init();
  }, [fetchSheets, fetchSheetData]);

  // Calculate team overview data from sheet with loading phases
  const [teamData, setTeamData] = useState<{ workers: WorkerSummary[]; dateRange: { start: string; end: string } | null }>({ workers: [], dateRange: null });
  const [isProcessingTeam, setIsProcessingTeam] = useState(false);

  // Process team data when sheet changes
  useEffect(() => {
    if (!sheetData) {
      setTeamData({ workers: [], dateRange: null });
      return;
    }

    const processTeamData = async () => {
      setIsProcessingTeam(true);
      setLoadingPhase('Extracting collector IDs...');
      
      // Use setTimeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const allWorkers = getAllWorkers(sheetData);
      
      if (allWorkers.length === 0) {
        setTeamData({ workers: [], dateRange: null });
        setIsProcessingTeam(false);
        setLoadingPhase('');
        return;
      }

      setLoadingPhase(`Processing ${allWorkers.length} collectors...`);
      await new Promise(resolve => setTimeout(resolve, 50));

      // Convert to WorkerSummary format
      const workerSummaries: WorkerSummary[] = allWorkers.map(worker => {
        const totalEarnings = worker.dailyData.reduce((sum, d) => sum + d.value, 0);
        const daysWorked = worker.dailyData.filter(d => d.value > 0).length;
        
        // Get date range for this worker
        const dates = worker.dailyData
          .filter(d => d.fullDate)
          .map(d => d.fullDate as number)
          .sort((a, b) => a - b);
        
        const workerDateRange = dates.length > 0 
          ? {
              start: new Date(dates[0]).toLocaleDateString(),
              end: new Date(dates[dates.length - 1]).toLocaleDateString(),
            }
          : { start: 'N/A', end: 'N/A' };

        return {
          workerId: worker.workerId,
          userName: worker.userName,
          stage: worker.stage,
          totalEarnings,
          dailyData: worker.dailyData.map(d => ({
            date: d.date,
            value: d.value,
            fullDate: d.fullDate,
          })),
          daysWorked,
          averageDaily: daysWorked > 0 ? totalEarnings / daysWorked : 0,
          dateRange: workerDateRange,
        };
      });

      setLoadingPhase('Calculating date ranges...');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const sheetDateRange = getSheetDateRange(sheetData);
      const dateRangeStr = sheetDateRange ? {
        start: sheetDateRange.start.toLocaleDateString(),
        end: sheetDateRange.end.toLocaleDateString(),
      } : null;

      setTeamData({ workers: workerSummaries, dateRange: dateRangeStr });
      setIsProcessingTeam(false);
      setLoadingPhase('');
    };

    processTeamData();
  }, [sheetData, getAllWorkers, getSheetDateRange]);

  // Handle sheet tab change
  const handleSheetChange = useCallback(async (sheetName: string) => {
    setActiveSheet(sheetName);
    setResults([]);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    setSelectedWorkerForDeduction(null);
    await fetchSheetData(sheetName);
  }, [fetchSheetData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setResults([]);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    setSelectedWorkerForDeduction(null);
    await fetchSheets();
    if (activeSheet) {
      await fetchSheetData(activeSheet);
    }
    toast.success('Data refreshed successfully');
  }, [fetchSheets, fetchSheetData, activeSheet]);

  // Handle bulk search and calculation
  const handleBulkSearch = useCallback((workerIds: string[], startDate: Date, endDate: Date) => {
    setSearchError(null);
    setResults([]);
    setDeductionResult(null);
    setSelectedWorkerForDeduction(null);
    setSearchDates({ start: startDate, end: endDate });

    if (!sheetData) {
      setSearchError('No sheet data loaded. Please select a sheet first.');
      return;
    }

    const foundResults: BonusResult[] = [];
    const notFoundIds: string[] = [];

    for (const workerId of workerIds) {
      const worker: WorkerData | null = searchWorker(sheetData, workerId);
      
      if (!worker) {
        notFoundIds.push(workerId);
        continue;
      }

      const bonusResult = calculateBonus(worker, startDate, endDate);
      
      if (bonusResult.dailyBreakdown.length > 0) {
        foundResults.push(bonusResult);
      } else {
        notFoundIds.push(workerId);
      }
    }

    if (foundResults.length === 0) {
      setSearchError(`No collectors found or no data in date range. Not found: ${notFoundIds.join(', ')}`);
      toast.error('No workers found');
      return;
    }

    setResults(foundResults);
    
    // Set the first result for deduction panel
    if (foundResults.length > 0) {
      setSelectedWorkerForDeduction(foundResults[0]);
    }
    
    const hasWarnings = foundResults.some(r => r.dateWarning);
    if (notFoundIds.length > 0) {
      toast.warning(`Found ${foundResults.length} workers. Not found: ${notFoundIds.join(', ')}`);
    } else if (hasWarnings) {
      toast.warning('Date range adjusted for some workers - see details');
    } else {
      toast.success(`Found ${foundResults.length} worker${foundResults.length !== 1 ? 's' : ''}`);
    }
  }, [sheetData, searchWorker, calculateBonus]);

  // Handle deduction calculation
  const handleDeductionCalculate = useCallback((deduction: DeductionResult) => {
    setDeductionResult(deduction);
    toast.success(`Calculated deduction for ${deduction.deductedDays.length} days`);
  }, []);

  // Handle worker selection for deduction
  const handleWorkerSelect = useCallback((result: BonusResult) => {
    setSelectedWorkerForDeduction(result);
    setDeductionResult(null);
  }, []);

  const dismissError = () => setSearchError(null);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Connecting to Google Sheets..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onRefresh={handleRefresh} isLoading={isLoading} />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Title */}
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">TL Dashboard</h1>
        </div>

        {/* Error Display */}
        {(error || searchError) && (
          <div className="mb-6">
            <ErrorAlert 
              message={error || searchError || ''} 
              onDismiss={dismissError} 
            />
          </div>
        )}

        {/* Sheet Tabs */}
        <div className="mb-6">
          <SheetTabs
            sheets={sheets}
            activeSheet={activeSheet}
            onSheetChange={handleSheetChange}
            isLoading={isLoading}
          />
        </div>

        {/* Mode Tabs - Search vs Overview */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'overview')} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Team Overview
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search & Compare
            </TabsTrigger>
          </TabsList>

          {/* Team Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <TeamOverview 
              workers={teamData.workers}
              sheetName={activeSheet}
              dateRange={teamData.dateRange}
              isLoading={isLoading || isProcessingTeam}
              loadingPhase={loadingPhase}
            />
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6">
            {/* Main Content Grid - Improved Desktop Layout */}
            <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]">
              {/* Left Panel: Bulk Search - Sticky on desktop */}
              <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
                <BulkSearchPanel
                  onSearch={handleBulkSearch}
                  isLoading={isLoading}
                  hasData={!!sheetData}
                />

                {/* Worker Selection for Deduction - Only when multiple results */}
                {results.length > 1 && (
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium mb-2 text-muted-foreground">
                      Select worker for deduction:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {results.map((r) => (
                        <button
                          key={r.workerId}
                          onClick={() => handleWorkerSelect(r)}
                          className={`px-3 py-1.5 rounded-md text-sm font-mono transition-colors ${
                            selectedWorkerForDeduction?.workerId === r.workerId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {r.workerId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Results - Takes remaining space */}
              <div className="space-y-6 min-w-0">
                {isLoading && results.length === 0 ? (
                  <LoadingState message="Loading sheet data..." />
                ) : (
                  <>
                    <BulkResultsPanel results={results} sheetName={activeSheet} />
                    
                    {/* Days Not Worked Panel - Show for selected worker */}
                    {selectedWorkerForDeduction && searchDates && (
                      <DaysNotWorkedPanel
                        result={selectedWorkerForDeduction}
                        startDate={searchDates.start}
                        endDate={searchDates.end}
                        onCalculate={handleDeductionCalculate}
                      />
                    )}

                    {/* Deduction Summary */}
                    {deductionResult && (
                      <DeductionSummary 
                        deduction={deductionResult} 
                        valueType={selectedWorkerForDeduction?.valueType}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground mt-auto">
        <p>TL Dashboard • Team Overview & Bulk Bonus Calculator</p>
      </footer>
    </div>
  );
};

export default TL;