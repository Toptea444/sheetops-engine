import { useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SheetTabs } from '@/components/dashboard/SheetTabs';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { ResultsPanel } from '@/components/dashboard/ResultsPanel';
import { DaysNotWorkedPanel, DeductionSummary, type DeductionResult } from '@/components/dashboard/DaysNotWorkedPanel';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import type { BonusResult, WorkerData } from '@/types/bonus';
import { toast } from 'sonner';

const TL = () => {
  const { 
    isLoading, 
    error, 
    sheets, 
    sheetData, 
    fetchSheets, 
    fetchSheetData,
    searchWorker,
    calculateBonus 
  } = useGoogleSheets();

  const [activeSheet, setActiveSheet] = useState('');
  const [result, setResult] = useState<BonusResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null);
  const [searchDates, setSearchDates] = useState<{ start: Date; end: Date } | null>(null);

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

  // Handle sheet tab change
  const handleSheetChange = useCallback(async (sheetName: string) => {
    setActiveSheet(sheetName);
    setResult(null);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    await fetchSheetData(sheetName);
  }, [fetchSheetData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setResult(null);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    await fetchSheets();
    if (activeSheet) {
      await fetchSheetData(activeSheet);
    }
    toast.success('Data refreshed successfully');
  }, [fetchSheets, fetchSheetData, activeSheet]);

  // Handle search and calculation
  const handleSearch = useCallback((workerId: string, startDate: Date, endDate: Date) => {
    setSearchError(null);
    setResult(null);
    setDeductionResult(null);
    setSearchDates({ start: startDate, end: endDate });

    if (!sheetData) {
      setSearchError('No sheet data loaded. Please select a sheet first.');
      return;
    }

    const worker: WorkerData | null = searchWorker(sheetData, workerId);
    
    if (!worker) {
      setSearchError(`Worker ID "${workerId}" not found in the "${activeSheet}" sheet.`);
      toast.error('Worker not found');
      return;
    }

    const bonusResult = calculateBonus(worker, startDate, endDate);
    
    if (bonusResult.dailyBreakdown.length === 0) {
      setSearchError('No bonus data found for the selected date range.');
      toast.warning('No data in date range');
      return;
    }

    setResult(bonusResult);
    
    if (bonusResult.dateWarning) {
      toast.warning('Date range adjusted - see details above');
    } else {
      toast.success(`Found ${bonusResult.dailyBreakdown.length} days of bonus data`);
    }
  }, [sheetData, activeSheet, searchWorker, calculateBonus]);

  // Handle deduction calculation
  const handleDeductionCalculate = useCallback((deduction: DeductionResult) => {
    setDeductionResult(deduction);
    toast.success(`Calculated deduction for ${deduction.deductedDays.length} days`);
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
    <div className="min-h-screen bg-background">
      <Header onRefresh={handleRefresh} isLoading={isLoading} />
      
      <main className="container mx-auto px-4 py-6">
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Left Panel: Search */}
          <div>
            <SearchPanel
              onSearch={handleSearch}
              isLoading={isLoading}
              hasData={!!sheetData}
            />
          </div>

          {/* Right Panel: Results */}
          <div className="space-y-6">
            {isLoading && !result ? (
              <LoadingState message="Loading sheet data..." />
            ) : (
              <>
                <ResultsPanel result={result} sheetName={activeSheet} />
                
                {/* Days Not Worked Panel - Only show when we have results */}
                {result && searchDates && (
                  <DaysNotWorkedPanel
                    result={result}
                    startDate={searchDates.start}
                    endDate={searchDates.end}
                    onCalculate={handleDeductionCalculate}
                  />
                )}

                {/* Deduction Summary */}
                {deductionResult && (
                  <DeductionSummary 
                    deduction={deductionResult} 
                    valueType={result?.valueType}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
        <p>TL Dashboard • Bonus Calculator with Deductions</p>
      </footer>
    </div>
  );
};

export default TL;