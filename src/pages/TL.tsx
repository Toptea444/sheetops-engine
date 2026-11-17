import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SheetTabs } from '@/components/dashboard/SheetTabs';
import { CollectorDirectory } from '@/components/tl/CollectorDirectory';
import { Button } from '@/components/ui/button';
import { BulkSearchPanel } from '@/components/dashboard/BulkSearchPanel';
import { BulkResultsPanel } from '@/components/dashboard/BulkResultsPanel';
import { DaysNotWorkedPanel, DeductionSummary, type DeductionResult } from '@/components/dashboard/DaysNotWorkedPanel';
import { ErrorAlert } from '@/components/dashboard/ErrorAlert';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import type { BonusResult, WorkerData } from '@/types/bonus';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadStageSheets } from '@/lib/stageSheetResolver';
import { setActiveSpreadsheetId, SPREADSHEET_ID, type StageSheet } from '@/lib/spreadsheetConfig';
import { isDefaultStageSheet } from '@/lib/stageSheetRegistry';
import { getCycleKey, getCycleOptions, type CyclePeriod } from '@/lib/cycleUtils';
import { cycleFromMonthKey, cycleSuggestedByTab, suggestedStageSources } from '@/lib/tlContext';

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
  const [view, setView] = useState<'collectors' | 'bulk'>('collectors');
  const cycles = useMemo(() => getCycleOptions(24), []);
  const [cycle, setCycle] = useState<CyclePeriod>(() => getCycleOptions(0)[0]);
  const [customCycle, setCustomCycle] = useState(false);
  const [collectorQuery, setCollectorQuery] = useState('');
  const [focusCollectorId, setFocusCollectorId] = useState<string | null>(null);
  const [bulkStageHint, setBulkStageHint] = useState<{ id: string; stage: string; sources: StageSheet[] } | null>(null);
  const [results, setResults] = useState<BonusResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  // True only until the first spreadsheet has loaded. Only this state may
  // show a full-page loader; later spreadsheet switches keep the page mounted
  // and load inline so typed search input and layout are preserved.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingSpreadsheet, setIsSwitchingSpreadsheet] = useState(false);
  // Monotonic id so a slow earlier spreadsheet load can't overwrite a newer one.
  const loadIdRef = useRef(0);
  const bulkResultsRef = useRef<HTMLDivElement>(null);
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
    setBulkStageHint(null);
  }, []);

  const loadSelectedSpreadsheet = useCallback(async (spreadsheetId: string, preferredSheet?: string) => {
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
        // Preserve the tab only when the same named tab exists in the new file.
        const tab = usableSheets.find(sheet => sheet.name === preferredSheet) || usableSheets[0];
        setActiveSheet(tab.name);
        await fetchSheetData(tab.name);
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
      await loadSelectedSpreadsheet(spreadsheetId, activeSheet);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not load the selected spreadsheet.');
    }
  }, [loadSelectedSpreadsheet, selectedSpreadsheetId, activeSheet]);

  // Handle sheet tab change
  const handleSheetChange = useCallback(async (sheetName: string) => {
    setActiveSheet(sheetName);
    setResults([]);
    setSearchError(null);
    setDeductionResult(null);
    setSearchDates(null);
    setSelectedWorkerForDeduction(null);
    setBulkStageHint(null);
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
    const source = spreadsheetSources.find(s => s.spreadsheetId === selectedSpreadsheetId);
    const mismatch = workerIds.map(id => ({ id, hint: suggestedStageSources(id, source, spreadsheetSources) })).find(entry => entry.hint);
    setBulkStageHint(mismatch?.hint ? { id: mismatch.id, ...mismatch.hint } : null);

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
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => bulkResultsRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }));
    }
    
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
  }, [sheetData, searchWorker, calculateBonus, selectedSpreadsheetId, spreadsheetSources]);

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
  const suggestedCycle = cycleSuggestedByTab(activeSheet);
  const cycleKey = getCycleKey(cycle);
  const cycleChoices = cycles.some(c => getCycleKey(c) === cycleKey) ? cycles : [cycle, ...cycles];
  const changeCycle = (next: CyclePeriod) => { setCycle(next); setCustomCycle(false); };
  const checkSuggestedSource = (source: StageSheet, id: string) => {
    setCollectorQuery(id); setFocusCollectorId(id);
    void handleSpreadsheetChange(source.spreadsheetId);
  };

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
      
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Collector earnings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Browse collectors or compare IDs.</p>
        </div>

        <div className="mb-5 flex gap-6 border-b border-border" aria-label="Dashboard view">
          <button type="button" onClick={() => setView('collectors')} aria-pressed={view === 'collectors'} className={`border-b-2 pb-3 text-sm font-medium transition-colors ${view === 'collectors' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Collectors</button>
          <button type="button" onClick={() => setView('bulk')} aria-pressed={view === 'bulk'} className={`border-b-2 pb-3 text-sm font-medium transition-colors ${view === 'bulk' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Bulk search &amp; deductions</button>
        </div>

        <section aria-label="Sheet and cycle selection" className="mb-5 rounded-xl border border-border/70 bg-card px-4 py-4 sm:px-5">
          <div className={`grid gap-3 ${view === 'collectors' ? 'sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]' : 'sm:grid-cols-2'}`}>
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="tl-source">Spreadsheet</label>
              <div className="flex min-w-0 items-center gap-2">
                <Select value={selectedSpreadsheetId} onValueChange={handleSpreadsheetChange} disabled={isLoading || isSwitchingSpreadsheet || spreadsheetSources.length === 0}>
                  <SelectTrigger id="tl-source" className="w-full min-w-0 bg-background text-left font-normal"><SelectValue placeholder="Choose a spreadsheet" /></SelectTrigger>
                  <SelectContent>{spreadsheetSources.map(source => <SelectItem key={`${source.stage}-${source.spreadsheetId}`} value={source.spreadsheetId}>{sourceLabel(source)}</SelectItem>)}</SelectContent>
                </Select>
                {isSwitchingSpreadsheet && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" role="status" aria-label="Loading spreadsheet" />}
              </div>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Sheet tab</p>
              <SheetTabs sheets={sheets} activeSheet={activeSheet} onSheetChange={handleSheetChange} isLoading={isLoading || isSwitchingSpreadsheet} pickerOnly />
            </div>
            {view === 'collectors' && <div className="min-w-0 space-y-1.5">
              <label htmlFor="tl-cycle" className="text-xs font-medium text-muted-foreground">Cycle</label>
              <select id="tl-cycle" value={customCycle ? 'other' : cycleKey} onChange={e => {
                if (e.target.value === 'other') { setCustomCycle(true); return; }
                const choice = cycleChoices.find(c => getCycleKey(c) === e.target.value);
                if (choice) changeCycle(choice);
              }} className="block h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground sm:text-sm">
                {cycleChoices.map(c => <option key={getCycleKey(c)} value={getCycleKey(c)}>{c.label}{getCycleKey(c) === getCycleKey(cycles[0]) ? ' (current)' : ''}</option>)}
                <option value="other">Choose another cycle…</option>
              </select>
              {customCycle && <label className="block text-xs text-muted-foreground">Cycle start month<input aria-label="Cycle start month" type="month" defaultValue={cycleKey} onChange={e => { const next = cycleFromMonthKey(e.target.value); if (next) setCycle(next); }} className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 text-base text-foreground sm:text-sm" /><span className="mt-1 block">Showing {cycle.label}</span></label>}
            </div>}
          </div>
          {view === 'collectors' && suggestedCycle && getCycleKey(suggestedCycle.cycle) !== cycleKey && <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-sm"><span className="text-muted-foreground">This tab may be for {suggestedCycle.cycle.label}{suggestedCycle.inferredYear ? ' (year inferred)' : ''}.</span><button type="button" onClick={() => changeCycle(suggestedCycle.cycle)} className="font-medium text-primary hover:underline">Use this cycle</button></div>}
        </section>

        {(error || searchError) && <div className="mb-5"><ErrorAlert message={error || searchError || ''} onDismiss={dismissError} /></div>}

        <div className={view === 'collectors' ? '' : 'hidden'}>
          {isSwitchingSpreadsheet || !sheetData || sheetData.sheetName !== activeSheet
            ? isSwitchingSpreadsheet || isLoading ? <LoadingState message="Loading sheet data..." /> : <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Sheet data unavailable. Select an available tab or refresh.</p>
            : <CollectorDirectory key={`${selectedSpreadsheetId}:${activeSheet}`} data={sheetData} sourceLabel={selectedSource ? sourceLabel(selectedSource) : 'Selected spreadsheet'} source={selectedSource} sources={spreadsheetSources} cycle={cycle} onCycleChange={changeCycle} query={collectorQuery} onQueryChange={value => { setCollectorQuery(value); setFocusCollectorId(null); }} focusId={focusCollectorId} onSuggestSource={checkSuggestedSource} searchWorker={searchWorker} calculateBonus={calculateBonus} />}
        </div>

        {view === 'bulk' && bulkStageHint && <div className="mb-4 rounded-lg border bg-amber-500/10 p-3 text-sm"><p>{bulkStageHint.id} looks like {bulkStageHint.stage}, but this source is labelled {selectedSource?.stage}. Results only use the selected spreadsheet.</p>{bulkStageHint.sources.length ? bulkStageHint.sources.map(source => <Button key={`${source.stage}:${source.spreadsheetId}`} variant="outline" size="sm" className="mt-2 mr-2 h-auto whitespace-normal text-left" onClick={() => void handleSpreadsheetChange(source.spreadsheetId)}>Check {source.stage}{source.label ? ` — ${source.label}` : ''} spreadsheet</Button>) : <p className="mt-2 text-xs">No enabled {bulkStageHint.stage} source was identified from the labels. Check the spreadsheet settings.</p>}<p className="mt-2 text-xs text-muted-foreground">The ID has not been checked in another spreadsheet yet.</p></div>}
        {/* Keep manual inputs mounted while switching between views or sources. */}
        <div className={view === 'bulk' ? 'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]' : 'hidden'}>
          {/* Left Panel: Bulk Search - Sticky on desktop */}
          <div className="min-w-0 lg:sticky lg:top-20 lg:self-start space-y-5">
            <BulkSearchPanel
              onSearch={handleBulkSearch}
              isLoading={isLoading || isSwitchingSpreadsheet}
              hasData={!!sheetData}
              sourceLabel={selectedSource ? sourceLabel(selectedSource) : undefined}
              sheetName={activeSheet || undefined}
            />


          </div>

          {/* Right Panel: Results - Takes remaining space */}
          <div ref={bulkResultsRef} className="min-w-0 scroll-mt-20 space-y-5">
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


    </div>
  );
};

export default TL;
