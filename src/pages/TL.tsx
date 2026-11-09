import { useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SheetTabs } from '@/components/dashboard/SheetTabs';
import { BulkSearchPanel } from '@/components/dashboard/BulkSearchPanel';
import { BulkResultsPanel } from '@/components/dashboard/BulkResultsPanel';
import { DaysNotWorkedPanel, DeductionSummary, type DeductionResult } from '@/components/dashboard/DaysNotWorkedPanel';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import type { BonusResult, WorkerData } from '@/types/bonus';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadStageSheets } from '@/lib/stageSheetResolver';
import { getActiveSpreadsheetId, setActiveSpreadsheetId, SPREADSHEET_ID, type StageSheet } from '@/lib/spreadsheetConfig';
import { isDefaultStageSheet } from '@/lib/stageSheetRegistry';

function sourceLabel(source: StageSheet): string {
  if (isDefaultStageSheet(source.stage)) return 'Default sheet (fallback)';
  return source.label ? `${source.stage} — ${source.label}` : source.stage;
}

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
  const [results, setResults] = useState<BonusResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [spreadsheetSources, setSpreadsheetSources] = useState<StageSheet[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState('');
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null);
  const [searchDates, setSearchDates] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedWorkerForDeduction, setSelectedWorkerForDeduction] = useState<BonusResult | null>(null);

  const resetResults = useCallback(() => {
    setResults([]);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    setSelectedWorkerForDeduction(null);
  }, []);

  const loadSelectedSpreadsheet = useCallback(async (spreadsheetId: string) => {
    setActiveSpreadsheetId(spreadsheetId);
    resetResults();

    const sheetsList = await fetchSheets();
    const usableSheets = sheetsList.filter((sheet) => !sheet.disabled);
    if (usableSheets.length > 0) {
      setActiveSheet(usableSheets[0].name);
      await fetchSheetData(usableSheets[0].name);
    } else {
      setActiveSheet('');
    }
  }, [fetchSheets, fetchSheetData, resetResults]);

  // Initialize: load saved spreadsheet sources, then fetch the selected source's tabs.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsInitializing(true);
      try {
        const registry = await loadStageSheets();
        const savedDefault = registry.find((source) => isDefaultStageSheet(source.stage));
        const sources = registry.filter((source) => source.enabled && source.spreadsheetId);
        if (!savedDefault) {
          sources.unshift({
            stage: '__default__',
            label: 'Default sheet (fallback)',
            spreadsheetId: SPREADSHEET_ID,
            enabled: true,
          });
        }

        if (cancelled) return;
        setSpreadsheetSources(sources);
        const storedId = getActiveSpreadsheetId();
        const initialSource = sources.find((source) => source.spreadsheetId === storedId) || sources[0];
        if (!initialSource) {
          setSearchError('No enabled spreadsheet sources are configured. Ask an admin to check the Stage Sheets settings.');
          return;
        }

        setSelectedSpreadsheetId(initialSource.spreadsheetId);
        await loadSelectedSpreadsheet(initialSource.spreadsheetId);
      } catch (error) {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : 'Could not load the saved stage sheets.');
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [loadSelectedSpreadsheet]);

  const handleSpreadsheetChange = useCallback(async (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId);
    setIsInitializing(true);
    try {
      await loadSelectedSpreadsheet(spreadsheetId);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not load the selected spreadsheet.');
    } finally {
      setIsInitializing(false);
    }
  }, [loadSelectedSpreadsheet]);

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
    resetResults();
    await fetchSheets();
    if (activeSheet) {
      await fetchSheetData(activeSheet);
    }
    toast.success('Data refreshed successfully');
  }, [fetchSheets, fetchSheetData, activeSheet, resetResults]);

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

        {/* Spreadsheet source selector */}
        <div className="mb-6 rounded-lg border bg-card p-4 corporate-shadow">
          <div className="mb-2">
            <p className="text-sm font-medium">Spreadsheet source</p>
            <p className="text-xs text-muted-foreground">
              Choose one of the saved stage sheets to use for this TL dashboard.
            </p>
          </div>
          <Select
            value={selectedSpreadsheetId}
            onValueChange={handleSpreadsheetChange}
            disabled={isInitializing || spreadsheetSources.length === 0}
          >
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Choose a saved stage sheet" />
            </SelectTrigger>
            <SelectContent>
              {spreadsheetSources.map((source) => (
                <SelectItem key={source.spreadsheetId} value={source.spreadsheetId}>
                  {sourceLabel(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground mt-auto">
        <p>TL Dashboard • Bulk Bonus Calculator with Deductions</p>
      </footer>
    </div>
  );
};

export default TL;
