import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    grandTotal?: string | number | null;
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

function headerIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h) => normalizeName(h));
  for (const name of possibleNames) {
    const idx = normalizedHeaders.indexOf(normalizeName(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function findTabByAliases(tabs: SpreadsheetTab[], aliases: readonly string[]): SpreadsheetTab | null {
  const byExact = tabs.find((tab) =>
    aliases.some((alias) => normalizeName(tab.name) === normalizeName(alias))
  );
  if (byExact) return byExact;

  return (
    tabs.find((tab) =>
      aliases.some((alias) => normalizeName(tab.name).includes(normalizeName(alias)))
    ) || null
  );
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
          body: {
            action: 'getSheets',
            spreadsheetId: SALARY_BREAKDOWN_SHEET_ID,
          },
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

  const fetchTabData = async (sheetName: string): Promise<RawSheet | null> => {
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
    const id = normalizeId(workerId);
    if (!id) {
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
        const idIdx = headerIndex(attendanceData.headers, ['id']);
        const nameIdx = headerIndex(attendanceData.headers, ['name', 'collector_name']);
        const daysIdx = headerIndex(attendanceData.headers, ['days present', 'days_present', 'dayspresent']);
        if (idIdx < 0) return null;
        const row = attendanceData.rows.find((r) => normalizeId(r[idIdx] || '') === id);
        if (!row) return null;
        return {
          name: nameIdx >= 0 ? row[nameIdx] : undefined,
          daysPresent: daysIdx >= 0 ? parseNumber(row[daysIdx]) : null,
        };
      })();

      const sundayOvertime = (() => {
        if (!sundayData) return null;
        const idIdx = headerIndex(sundayData.headers, ['collector_id', 'id']);
        const nameIdx = headerIndex(sundayData.headers, ['collector_name', 'name']);
        const totalIdx = headerIndex(sundayData.headers, ['total', 'amount']);
        if (idIdx < 0) return null;
        const row = sundayData.rows.find((r) => normalizeId(r[idIdx] || '') === id);
        if (!row) return null;
        return {
          collectorName: nameIdx >= 0 ? row[nameIdx] : undefined,
          total: totalIdx >= 0 ? parseNumber(row[totalIdx]) : null,
        };
      })();

      const punishments = (() => {
        if (!punishmentData) return [];
        const idIdx = headerIndex(punishmentData.headers, ['ids', 'id']);
        const dateIdx = headerIndex(punishmentData.headers, ['date']);
        const nameIdx = headerIndex(punishmentData.headers, ['name']);
        const amountIdx = headerIndex(punishmentData.headers, ['amount']);
        const reasonIdx = headerIndex(punishmentData.headers, ['reason']);
        const decisionIdx = headerIndex(punishmentData.headers, ['decision']);
        if (idIdx < 0) return [];
        return punishmentData.rows
          .filter((r) => normalizeId(r[idIdx] || '') === id)
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
        const idIdx = headerIndex(thirdPartyData.headers, ['user_name', 'username', 'id', 'collector_id']);
        const grandTotalIdx = headerIndex(thirdPartyData.headers, ['grand total', 'total']);
        if (idIdx < 0) return null;
        const row = thirdPartyData.rows.find((r) => normalizeId(r[idIdx] || '') === id);
        if (!row) return null;
        return {
          userName: row[idIdx],
          grandTotal: grandTotalIdx >= 0 ? row[grandTotalIdx] : null,
        };
      })();

      const ghNgTotalBonus = (() => {
        if (!ghNgData) return null;
        const idIdx = headerIndex(ghNgData.headers, ['id', 'collector_id']);
        const nameIdx = headerIndex(ghNgData.headers, ['name', 'collector_name']);
        const totalIdx = headerIndex(ghNgData.headers, ['total', 'grand total']);
        if (idIdx < 0) return null;
        const row = ghNgData.rows.find((r) => normalizeId(r[idIdx] || '') === id);
        if (!row) return null;
        return {
          name: nameIdx >= 0 ? row[nameIdx] : undefined,
          total: totalIdx >= 0 ? parseNumber(row[totalIdx]) : null,
        };
      })();

      setResult({
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

  const hasData = !!result && (
    result.attendance ||
    result.sundayOvertime ||
    result.punishments.length > 0 ||
    result.ghThirdPartyWeeklyBonus ||
    result.ghNgTotalBonus
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
            ← Back to main app
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Salary Breakdown</h1>
          <p className="text-muted-foreground">
            Enter a collector ID and we will summarize all matching data across the salary sheets.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search by ID</CardTitle>
            <CardDescription>
              We will check: Sunday Overtime Pay, Attendance, Punishment List, GH Third party weekly bonus, and Gh &amp; Ng total bonus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <Input
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="e.g. GHAS-1001"
                className="md:flex-1"
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
            <AlertDescription className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sheet tabs from the salary spreadsheet...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Breakdown for {workerId.trim() || 'ID'}</CardTitle>
              <CardDescription>
                Here is your salary breakdown in simple English.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              {result.missingTabs.length > 0 && (
                <p className="text-amber-600">
                  I could not find these tabs in the spreadsheet: {result.missingTabs.join(', ')}.
                </p>
              )}

              {hasData ? (
                <>
                  <p>
                    {result.attendance
                      ? `Attendance shows ${result.attendance.name || 'this collector'} was present for ${result.attendance.daysPresent ?? 'an unknown number of'} days.`
                      : 'Attendance record was not found for this ID.'}
                  </p>
                  <p>
                    {result.sundayOvertime
                      ? `Sunday overtime total is ₦${(result.sundayOvertime.total ?? 0).toLocaleString()}.`
                      : 'No Sunday overtime entry was found for this ID.'}
                  </p>
                  <p>
                    {result.ghThirdPartyWeeklyBonus
                      ? `GH third party weekly bonus grand total is ${result.ghThirdPartyWeeklyBonus.grandTotal ?? 'not available'} for ${result.ghThirdPartyWeeklyBonus.userName || 'this collector'}.`
                      : 'No GH third party weekly bonus entry was found for this ID.'}
                  </p>
                  <p>
                    {result.ghNgTotalBonus
                      ? `GH & NG total bonus is ₦${(result.ghNgTotalBonus.total ?? 0).toLocaleString()}${result.ghNgTotalBonus.name ? ` for ${result.ghNgTotalBonus.name}` : ''}.`
                      : 'No GH & NG total bonus entry was found for this ID.'}
                  </p>
                  <p>
                    {result.punishments.length > 0
                      ? `Punishment list has ${result.punishments.length} record(s) for this ID, totaling ₦${result.punishments.reduce((sum, p) => sum + (p.amount ?? 0), 0).toLocaleString()}.`
                      : 'No punishment record was found for this ID.'}
                  </p>

                  {result.punishments.length > 0 && (
                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="font-medium">Punishment details:</p>
                      {result.punishments.map((p, idx) => (
                        <p key={`${p.date || 'date'}-${idx}`} className="text-muted-foreground">
                          {idx + 1}. {p.date || 'No date'} — ₦{(p.amount ?? 0).toLocaleString()}
                          {p.reason ? ` for ${p.reason}` : ''}
                          {p.decision ? ` (${p.decision})` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p>No records were found for this ID across the configured sheets.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
