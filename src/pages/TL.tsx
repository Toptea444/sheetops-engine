import { useEffect, useState, useCallback, useRef } from 'react';
import { FileSpreadsheet, Layers, Loader2, Users } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SheetTabs } from '@/components/dashboard/SheetTabs';
import { BulkSearchPanel } from '@/components/dashboard/BulkSearchPanel';
import { BulkResultsPanel } from '@/components/dashboard/BulkResultsPanel';
import { DaysNotWorkedPanel, DeductionSummary, type DeductionResult } from '@/components/dashboard/DaysNotWorkedPanel';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { Badge } from '@/components/ui/badge';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import type { BonusResult, WorkerData } from '@/types/bonus';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadStageSheets } from '@/lib/stageSheetResolver';
import { setActiveSpreadsheetId, SPREADSHEET_ID, type StageSheet } from '@/lib/spreadsheetConfig';
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
    clearSheets,
    clearSheetData,
    clearError,
    searchWorker,
    calculateBonus
  } = useGoogleSheets();

  const [activeSheet, setActiveSheet] = useState('');
  const [results, setResults] = useState<BonusResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  // True only until the first spreadsheet has loaded. Only this state may
  // show a full-page loader; later spreadsheet switches keep the page mounted
  // and load inline so typed search input and layout are preserved.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingSpreadsheet, setIsSwitchingSpreadsheet] = useState(false);
  // Monotonic id so a slow earlier spreadsheet load can't overwrite a newer one.
  const loadIdRef = useRef(0);
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
    const loadId = ++loadIdRef.current;
    setIsSwitchingSpreadsheet(true);
    setActiveSpreadsheetId(spreadsheetId);
    resetResults();
    // Drop the previous spreadsheet's tabs/data so they don't flash as if
    // they belonged to the newly selected source.
    clearSheets();
    setActiveSheet('');

    try {
      const sheetsList = await fetchSheets();
      if (loadId !== loadIdRef.current) return; // superseded by a newer switch
      const usableSheets = sheetsList.filter((sheet) => !sheet.disabled);
      if (usableSheets.length > 0) {
        setActiveSheet(usableSheets[0].name);
        await fetchSheetData(usableSheets[0].name);
        if (loadId !== loadIdRef.current) return;
      }
    } finally {
      if (loadId === loadIdRef.current) setIsSwitchingSpreadsheet(false);
    }
  }, [fetchSheets, fetchSheetData, resetResults, clearSheets]);

  // Initialize: load saved spreadsheet sources, then auto-load the default
  // (or first) source so the dashboard opens with data ready.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
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
        if (sources.length === 0) {
          setSearchError('No enabled spreadsheet sources are configured. Ask an admin to check the Stage Sheets settings.');
          return;
        }

        const initialSource =
          sources.find((source) => isDefaultStageSheet(source.stage)) ?? sources[0];
        setSelectedSpreadsheetId(initialSource.spreadsheetId);
        await loadSelectedSpreadsheet(initialSource.spreadsheetId);
      } catch (error) {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : 'Could not load the saved stage sheets.');
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [loadSelectedSpreadsheet]);

  const handleSpreadsheetChange = useCallback(async (spreadsheetId: string) => {
    if (spreadsheetId === selectedSpreadsheetId) return;
    setSelectedSpreadsheetId(spreadsheetId);
    try {
      // Inline loading only — the page stays mounted (no full-page reload).
      await loadSelectedSpreadsheet(spreadsheetId);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not load the selected spreadsheet.');
    }
  }, [loadSelectedSpreadsheet, selectedSpreadsheetId]);

  // Handle sheet tab change
  const handleSheetChange = useCallback(async (sheetName: string) => {
    setActiveSheet(sheetName);
    setResults([]);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    setSelectedWorkerForDeduction(null);
    // Drop the previous tab's data so a failed fetch can't leave stale data
    // searchable under the new tab's name.
    clearSheetData();
    await fetchSheetData(sheetName);
  }, [fetchSheetData, clearSheetData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    resetResults();
    const sheetsList = await fetchSheets();
    if (sheetsList.length === 0) {
      toast.error('Refresh failed — see the error above');
      return;
    }
    if (activeSheet) {
      clearSheetData();
      const data = await fetchSheetData(activeSheet);
      if (!data) {
        toast.error('Refresh failed — see the error above');
        return;
      }
    }
    toast.success('Data refreshed successfully');
  }, [fetchSheets, fetchSheetData, activeSheet, resetResults, clearSheetData]);

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

  const dismissError = () => {
    setSearchError(null);
    clearError();
  };

  const selectedSource = spreadsheetSources.find(
    (source) => source.spreadsheetId === selectedSpreadsheetId,
  );

  // Full-page loader only on first open, before any spreadsheet is known.
  // Spreadsheet switches use isSwitchingSpreadsheet and load inline below.
  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Connecting to Google Sheets..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onRefresh={handleRefresh} isLoading={isLoading || isSwitchingSpreadsheet} />
      
      <main className="flex-1 container mx-auto w-full min-w-0 px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">TL Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Bulk bonus calculator with deductions
            </p>
          </div>
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            {selectedSource && (
              <Badge variant="secondary" className="max-w-full gap-1.5 break-all font-normal">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {sourceLabel(selectedSource)}
              </Badge>
            )}
            {activeSheet && (
              <Badge variant="outline" className="max-w-full gap-1.5 break-all font-normal">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {activeSheet}
              </Badge>
            )}
            {sheets.length > 0 && (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <Layers className="h-3.5 w-3.5" />
                {sheets.length} tab{sheets.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Data Source Toolbar — sticky so source + tabs stay in reach */}
        <div className="mb-6 rounded-lg border bg-card p-3 corporate-shadow md:sticky md:top-14 md:z-40">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="shrink-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Spreadsheet source
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedSpreadsheetId}
                  onValueChange={handleSpreadsheetChange}
                  disabled={isLoading || isSwitchingSpreadsheet || spreadsheetSources.length === 0}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Choose a saved stage sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {spreadsheetSources.map((source) => (
                      <SelectItem
                        key={`${source.stage}-${source.spreadsheetId}`}
                        value={source.spreadsheetId}
                      >
                        {sourceLabel(source)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isSwitchingSpreadsheet && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" role="status" aria-label="Loading sheet" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sheet tab
              </p>
              <SheetTabs
                sheets={sheets}
                activeSheet={activeSheet}
                onSheetChange={handleSheetChange}
                isLoading={isLoading || isSwitchingSpreadsheet}
              />
            </div>
          </div>
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

        {/* Main Content Grid - Improved Desktop Layout */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
          {/* Left Panel: Bulk Search - Sticky on desktop */}
          <div className="min-w-0 lg:sticky lg:top-44 lg:self-start space-y-6">
            <BulkSearchPanel
              onSearch={handleBulkSearch}
              isLoading={isLoading || isSwitchingSpreadsheet}
              hasData={!!sheetData}
              sourceLabel={selectedSource ? sourceLabel(selectedSource) : undefined}
              sheetName={activeSheet || undefined}
            />


          </div>

          {/* Right Panel: Results - Takes remaining space */}
          <div className="space-y-6 min-w-0">
            {isSwitchingSpreadsheet || (isLoading && results.length === 0) ? (
              <LoadingState message="Loading sheet data..." />
            ) : (
              <>
                <BulkResultsPanel results={results} sheetName={activeSheet} />
                
                {/* Days Not Worked Panel - Show for selected worker */}
                {selectedWorkerForDeduction && searchDates && (
                  <DaysNotWorkedPanel
                    result={selectedWorkerForDeduction}
                    workers={results}
                    onWorkerSelect={handleWorkerSelect}
                    hasSummary={!!deductionResult}
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
