import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Coins,
  Loader2,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SALARY_BREAKDOWN_SHEET_ID = '1FEoNaZMtXwhUrHz_hXbzdU2AmzOe9YUGZxhvnl69nRc';

type RawSheet = {
  headers: string[];
  rows: string[][];
  sheetName: string;
};

type SpreadsheetTab = {
  id: string;
  name: string;
  disabled?: boolean;
};

type BreakdownData = {
  workerId: string;
  workerName?: string;
  attendance: {
    name?: string;
    daysPresent?: number | null;
  } | null;
  sundayOvertime: {
    collectorName?: string;
    total?: number | null;
  } | null;
  punishments: Array<{
    date?: string;
    amount?: number | null;
    reason?: string;
    decision?: string;
    name?: string;
  }>;
  ghThirdPartyWeeklyBonus: {
    userName?: string;
    grandTotal?: number | null;
  } | null;
  ghNgTotalBonus: {
    name?: string;
    total?: number | null;
  } | null;
  missingTabs: string[];
};

const REQUIRED_TABS = [
  { key: 'sunday', aliases: ['Sunday Overtime Pay'] },
  { key: 'attendance', aliases: ['Attendance'] },
  { key: 'punishment', aliases: ['Punishment List'] },
  { key: 'thirdParty', aliases: ['GH Third party weekly bonus', 'GH THIRD PARTY WEEKLY BONUS'] },
  { key: 'ghNg', aliases: ['Gh & Ng total bonus', 'GH & NG TOTAL BONUS'] },
] as const;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null | undefined): string {
  return `₦${(value ?? 0).toLocaleString()}`;
}

function findTabByAliases(tabs: SpreadsheetTab[], aliases: readonly string[]): SpreadsheetTab | null {
  const byExact = tabs.find((tab) => aliases.some((alias) => normalizeName(tab.name) === normalizeName(alias)));
  if (byExact) return byExact;

  return (
    tabs.find((tab) => aliases.some((alias) => normalizeName(tab.name).includes(normalizeName(alias)))) || null
  );
}

type ParsedGrid = {
  headers: string[];
  rows: string[][];
};

function detectHeaderGrid(raw: RawSheet, expectedHeaders: string[]): ParsedGrid {
  const matrix = [raw.headers, ...raw.rows];
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i].map((cell) => normalizeName(cell || ''));
    const score = expectedHeaders.reduce((sum, expected) => {
      const n = normalizeName(expected);
      return sum + (row.some((cell) => cell === n || cell.includes(n)) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const headers = matrix[bestIndex] || [];
  const rows = matrix.slice(bestIndex + 1).filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0));

  return { headers, rows };
}

function headerIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h) => normalizeName(h));

  for (const name of possibleNames) {
    const normalized = normalizeName(name);
    const exactIdx = normalizedHeaders.indexOf(normalized);
    if (exactIdx >= 0) return exactIdx;
  }

  for (const name of possibleNames) {
    const normalized = normalizeName(name);
    const partialIdx = normalizedHeaders.findIndex((header) => header.includes(normalized) || normalized.includes(header));
    if (partialIdx >= 0) return partialIdx;
  }

  return -1;
}

export default function SalaryBreakdownPage() {
  const [tabs, setTabs] = useState<SpreadsheetTab[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [workerId, setWorkerId] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BreakdownData | null>(null);

  useEffect(() => {
    const loadTabs = async () => {
      setLoadingTabs(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
          body: { action: 'getSheets', spreadsheetId: SALARY_BREAKDOWN_SHEET_ID },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        setTabs((data?.sheets as SpreadsheetTab[]) || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load salary breakdown sheets.';
        setError(message);
      } finally {
        setLoadingTabs(false);
      }
    };

    loadTabs();
  }, []);

  const resolvedTabs = useMemo(() => {
    return REQUIRED_TABS.reduce<Record<string, SpreadsheetTab | null>>((acc, item) => {
      acc[item.key] = findTabByAliases(tabs.filter((t) => !t.disabled), item.aliases);
      return acc;
    }, {});
  }, [tabs]);

  const fetchTabData = async (sheetName: string): Promise<RawSheet> => {
    const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
      body: {
        action: 'getSheetData',
        spreadsheetId: SALARY_BREAKDOWN_SHEET_ID,
        sheetName,
      },
    });

    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);

    return {
      headers: (data?.headers || []).map((h: unknown) => String(h ?? '')),
      rows: (data?.rows || []).map((row: unknown[]) => row.map((cell) => String(cell ?? ''))),
      sheetName,
    };
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedSearchId = normalizeId(workerId);

    if (!normalizedSearchId) {
      setError('Please enter an ID first.');
      setResult(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const missingTabs: string[] = [];

      const attendanceTab = resolvedTabs.attendance;
      const sundayTab = resolvedTabs.sunday;
      const punishmentTab = resolvedTabs.punishment;
      const thirdPartyTab = resolvedTabs.thirdParty;
      const ghNgTab = resolvedTabs.ghNg;

      if (!attendanceTab) missingTabs.push('Attendance');
      if (!sundayTab) missingTabs.push('Sunday Overtime Pay');
      if (!punishmentTab) missingTabs.push('Punishment List');
      if (!thirdPartyTab) missingTabs.push('GH Third party weekly bonus');
      if (!ghNgTab) missingTabs.push('Gh & Ng total bonus');

      const [attendanceData, sundayData, punishmentData, thirdPartyData, ghNgData] = await Promise.all([
        attendanceTab ? fetchTabData(attendanceTab.name) : Promise.resolve(null),
        sundayTab ? fetchTabData(sundayTab.name) : Promise.resolve(null),
        punishmentTab ? fetchTabData(punishmentTab.name) : Promise.resolve(null),
        thirdPartyTab ? fetchTabData(thirdPartyTab.name) : Promise.resolve(null),
        ghNgTab ? fetchTabData(ghNgTab.name) : Promise.resolve(null),
      ]);

      const attendance = (() => {
        if (!attendanceData) return null;
        const grid = detectHeaderGrid(attendanceData, ['id', 'name', 'days present']);
        const idIdx = headerIndex(grid.headers, ['id']);
        const nameIdx = headerIndex(grid.headers, ['name', 'collector_name']);
        const daysIdx = headerIndex(grid.headers, ['days present', 'days_present', 'dayspresent']);
        if (idIdx < 0) return null;

        const row = grid.rows.find((r) => normalizeId(r[idIdx] || '') === normalizedSearchId);
        if (!row) return null;

        return {
          name: nameIdx >= 0 ? row[nameIdx] : undefined,
          daysPresent: daysIdx >= 0 ? parseNumber(row[daysIdx]) : null,
        };
      })();

      const sundayOvertime = (() => {
        if (!sundayData) return null;
        const grid = detectHeaderGrid(sundayData, ['collector_id', 'collector_name', 'total']);
        const idIdx = headerIndex(grid.headers, ['collector_id', 'id']);
        const nameIdx = headerIndex(grid.headers, ['collector_name', 'name']);
        const totalIdx = headerIndex(grid.headers, ['total', 'amount']);
        if (idIdx < 0) return null;

        const row = grid.rows.find((r) => normalizeId(r[idIdx] || '') === normalizedSearchId);
        if (!row) return null;

        return {
          collectorName: nameIdx >= 0 ? row[nameIdx] : undefined,
          total: totalIdx >= 0 ? parseNumber(row[totalIdx]) : null,
        };
      })();

      const punishments = (() => {
        if (!punishmentData) return [];
        const grid = detectHeaderGrid(punishmentData, ['date', 'id', 'name', 'amount', 'reason', 'decision']);
        const idIdx = headerIndex(grid.headers, ['ids', 'id']);
        const dateIdx = headerIndex(grid.headers, ['date']);
        const nameIdx = headerIndex(grid.headers, ['name']);
        const amountIdx = headerIndex(grid.headers, ['amount']);
        const reasonIdx = headerIndex(grid.headers, ['reason']);
        const decisionIdx = headerIndex(grid.headers, ['decision']);
        if (idIdx < 0) return [];

        return grid.rows
          .filter((r) => normalizeId(r[idIdx] || '') === normalizedSearchId)
          .map((r) => ({
            date: dateIdx >= 0 ? r[dateIdx] : undefined,
            amount: amountIdx >= 0 ? parseNumber(r[amountIdx]) : null,
            reason: reasonIdx >= 0 ? r[reasonIdx] : undefined,
            decision: decisionIdx >= 0 ? r[decisionIdx] : undefined,
            name: nameIdx >= 0 ? r[nameIdx] : undefined,
          }));
      })();

      const ghThirdPartyWeeklyBonus = (() => {
        if (!thirdPartyData) return null;
        const grid = detectHeaderGrid(thirdPartyData, ['user_name', 'grand total']);
        const idIdx = headerIndex(grid.headers, ['user_name', 'username', 'id', 'collector_id']);
        const grandTotalIdx = headerIndex(grid.headers, ['grand total', 'total']);
        if (idIdx < 0) return null;

        const row = grid.rows.find((r) => normalizeId(r[idIdx] || '') === normalizedSearchId);
        if (!row) return null;

        return {
          userName: row[idIdx],
          grandTotal: grandTotalIdx >= 0 ? parseNumber(row[grandTotalIdx]) : null,
        };
      })();

      const ghNgTotalBonus = (() => {
        if (!ghNgData) return null;
        const grid = detectHeaderGrid(ghNgData, ['id', 'name', 'total']);
        const idIdx = headerIndex(grid.headers, ['id', 'collector_id']);
        const nameIdx = headerIndex(grid.headers, ['name', 'collector_name']);
        const totalIdx = headerIndex(grid.headers, ['total', 'grand total']);
        if (idIdx < 0) return null;

        const row = grid.rows.find((r) => normalizeId(r[idIdx] || '') === normalizedSearchId);
        if (!row) return null;

        return {
          name: nameIdx >= 0 ? row[nameIdx] : undefined,
          total: totalIdx >= 0 ? parseNumber(row[totalIdx]) : null,
        };
      })();

      const workerName =
        attendance?.name ||
        sundayOvertime?.collectorName ||
        ghNgTotalBonus?.name ||
        ghThirdPartyWeeklyBonus?.userName ||
        punishments[0]?.name;

      setResult({
        workerId: workerId.trim(),
        workerName,
        attendance,
        sundayOvertime,
        punishments,
        ghThirdPartyWeeklyBonus,
        ghNgTotalBonus,
        missingTabs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete your search.';
      setError(message);
      setResult(null);
    } finally {
      setSearching(false);
    }
  };

  const punishmentTotal = result?.punishments.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const grossEarnings = (result?.sundayOvertime?.total ?? 0) + (result?.ghNgTotalBonus?.total ?? 0);
  const netEarnings = grossEarnings - punishmentTotal;

  const hasAnyRecord =
    !!result &&
    (result.attendance ||
      result.sundayOvertime ||
      result.ghThirdPartyWeeklyBonus ||
      result.ghNgTotalBonus ||
      result.punishments.length > 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
            ← Back to main app
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Salary Breakdown</h1>
          <p className="text-muted-foreground">Enter a collector ID to get a clear, sheet-by-sheet salary breakdown.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search by Collector ID</CardTitle>
            <CardDescription>
              We search Sunday Overtime Pay, Attendance, Punishment List, GH Third party weekly bonus, and Gh &amp; Ng total bonus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <Input
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="e.g. GHAS-1001"
                className="md:flex-1 font-mono"
              />
              <Button type="submit" disabled={searching || loadingTabs}>
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Get Breakdown
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loadingTabs && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading salary sheet tabs...</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="corporate-gradient p-6 text-primary-foreground">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-white/80 text-sm">Salary Breakdown for</p>
                    <p className="text-2xl font-bold">{result.workerId}</p>
                    <p className="text-white/80 text-sm mt-1">{result.workerName || 'Name not found in matched records'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm">Estimated Net (tracked sheets)</p>
                    <p className="text-3xl font-bold">{formatCurrency(netEarnings)}</p>
                    <p className="text-white/80 text-xs">Gross {formatCurrency(grossEarnings)} - Punishments {formatCurrency(punishmentTotal)}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 md:p-6">
                {result.missingTabs.length > 0 && (
                  <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      Could not find these tabs in the sheet: {result.missingTabs.join(', ')}.
                    </AlertDescription>
                  </Alert>
                )}

                {!hasAnyRecord && (
                  <p className="text-muted-foreground">No records were found for this ID across the configured sheets.</p>
                )}

                {hasAnyRecord && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Attendance</p>
                          <p className="text-xl font-semibold">{result.attendance?.daysPresent ?? 0} days</p>
                          <p className="text-xs text-muted-foreground mt-1">{result.attendance?.name || 'No attendance row found'}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Sunday Overtime</p>
                          <p className="text-xl font-semibold">{formatCurrency(result.sundayOvertime?.total)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{result.sundayOvertime?.collectorName || 'No overtime row found'}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">GH & NG Total Bonus</p>
                          <p className="text-xl font-semibold">{formatCurrency(result.ghNgTotalBonus?.total)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{result.ghNgTotalBonus?.name || 'No GH & NG row found'}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Punishments</p>
                          <p className="text-xl font-semibold">{result.punishments.length} record(s)</p>
                          <p className="text-xs text-muted-foreground mt-1">Total deduction {formatCurrency(punishmentTotal)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-5" />

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          Detailed Breakdown
                        </CardTitle>
                        <CardDescription>Each source sheet and what we found for this ID.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Attendance</Badge>
                            <span className="text-sm text-muted-foreground">Attendance sheet</span>
                          </div>
                          <p className="text-sm">
                            {result.attendance
                              ? `${result.attendance.name || 'Collector'} was present for ${result.attendance.daysPresent ?? 0} day(s).`
                              : 'No attendance record matched this ID.'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Sunday Overtime Pay</Badge>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm">
                            {result.sundayOvertime
                              ? `${result.sundayOvertime.collectorName || 'Collector'} has ${formatCurrency(result.sundayOvertime.total)} in Sunday overtime.`
                              : 'No Sunday overtime record matched this ID.'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">GH Third party weekly bonus</Badge>
                            <Coins className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm">
                            {result.ghThirdPartyWeeklyBonus
                              ? `${result.ghThirdPartyWeeklyBonus.userName || 'Collector'} has ${formatCurrency(result.ghThirdPartyWeeklyBonus.grandTotal)} as GH third-party weekly grand total.`
                              : 'No GH third party weekly bonus record matched this ID.'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">GH & NG total bonus</Badge>
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm">
                            {result.ghNgTotalBonus
                              ? `${result.ghNgTotalBonus.name || 'Collector'} has ${formatCurrency(result.ghNgTotalBonus.total)} in GH & NG total bonus.`
                              : 'No GH & NG total bonus record matched this ID.'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" /> Punishment List
                        </CardTitle>
                        <CardDescription>All punishment entries matched by ID.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {result.punishments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No punishment record matched this ID.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Decision</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.punishments.map((entry, idx) => (
                                <TableRow key={`${entry.date || 'date'}-${idx}`}>
                                  <TableCell>{entry.date || '—'}</TableCell>
                                  <TableCell>{entry.reason || '—'}</TableCell>
                                  <TableCell>{entry.decision || '—'}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="font-semibold">Total deduction</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(punishmentTotal)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
