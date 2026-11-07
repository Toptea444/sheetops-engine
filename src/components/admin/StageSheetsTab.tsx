import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { SPREADSHEET_ID, StageSheet, parseSpreadsheetId } from '@/lib/spreadsheetConfig';
import { DEFAULT_SHEET_STAGE_KEY, isDefaultStageSheet } from '@/lib/stageSheetRegistry';
import { Loader2, Plus, Save, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type Row = StageSheet & { url: string; test?: 'ok' | 'fail' | 'testing'; testMessage?: string };

export function StageSheetsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest } = useAdminData();
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultEnabled, setDefaultEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingSettings(true);
      setLoadError(null);
      const res = await adminRequest(adminSecret, 'get_stage_sheets');
      if (!res || !Array.isArray(res.sheets)) {
        setLoadError('Could not load the saved stage sheet settings. Refresh this page before making changes.');
        setLoadingSettings(false);
        return;
      }
      const list: StageSheet[] = res?.sheets || [];
      const def = list.find((s) => isDefaultStageSheet(s.stage));
      setDefaultEnabled(def ? def.enabled : true);
      setRows(
        list
          .filter((s) => !isDefaultStageSheet(s.stage))
          .map((s) => ({ ...s, url: s.spreadsheetId })),
      );
      setLoadingSettings(false);
    })();
  }, [adminRequest, adminSecret]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const test = async (i: number) => {
    const id = parseSpreadsheetId(rows[i].url);
    if (!id) return toast.error('That link does not look like a Google Sheet');
    update(i, { test: 'testing' });
    const { data, error } = await supabase.functions.invoke('fetch-google-sheets', {
      body: { action: 'getSheets', spreadsheetId: id },
    });
    let message = typeof data?.error === 'string' ? data.error : '';
    if (!message && error) {
      const context = (error as { context?: Response }).context;
      try {
        const body = await context?.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch { /* use the function error message below */ }
      if (!message) message = error.message;
    }
    if (data?.sheets?.length) update(i, { test: 'ok', testMessage: `Connected — ${data.sheets.length} tabs found.` });
    else update(i, { test: 'fail', testMessage: message || 'Could not open this spreadsheet. Check the link and sharing settings.' });
  };

  const save = async () => {
    const sheets: StageSheet[] = [
      { stage: DEFAULT_SHEET_STAGE_KEY, label: 'Default sheet (fallback)', spreadsheetId: SPREADSHEET_ID, enabled: defaultEnabled },
    ];
    for (const r of rows) {
      const id = parseSpreadsheetId(r.url);
      if (!r.stage.trim() || !id) return toast.error(`Fix stage "${r.stage || '(empty)'}": needs a name and a valid link`);
      if (!isDefaultStageSheet(r.stage)) {
        sheets.push({ stage: r.stage.trim(), label: r.label, spreadsheetId: id, enabled: r.enabled });
      }
    }
    setSaving(true);
    const res = await adminRequest(adminSecret, 'update_stage_sheets', { sheets });
    setSaving(false);
    if (res?.success) toast.success('Stage sheets saved');
    else toast.error(res?.error || 'Failed to save');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stage Sheets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Add each stage's bonus sheet link and name it S1, S2, S3, T-1 or T0. A worker's stage is read
          straight from their ID (e.g. GHAS1… → S1, GHAS0… → T0, GHAS-1… → T-1), so sheets that don't
          show a stage anywhere still work — the app just looks for their ID inside the file.
          If their ID cannot be checked or is not found, the app will not quietly show data from the wrong file.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2">
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-medium">Default sheet (fallback)</p>
            <p className="text-xs text-muted-foreground">
              Main link used when a worker's ID isn't found on any stage sheet below.
            </p>
          </div>
          <code className="hidden text-xs text-muted-foreground sm:inline">
            {SPREADSHEET_ID.slice(0, 12)}…
          </code>
          <Switch
            checked={defaultEnabled}
            onCheckedChange={setDefaultEnabled}
            aria-label="Use default sheet as fallback"
          />
        </div>
        {loadingSettings && <p className="text-sm text-muted-foreground">Loading saved sheet settings…</p>}
        {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No stage sheets yet. Everyone uses the default sheet.</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <Input className="w-24" placeholder="S1" value={r.stage} onChange={(e) => update(i, { stage: e.target.value })} />
            <Input className="flex-1 min-w-[220px]" placeholder="Google Sheet link" value={r.url}
              onChange={(e) => update(i, { url: e.target.value, test: undefined })} />
            <Button size="sm" variant="outline" onClick={() => test(i)}>
              {r.test === 'testing' ? <Loader2 className="h-3 w-3 animate-spin" />
                : r.test === 'ok' ? <CheckCircle2 className="h-3 w-3 text-primary" />
                : r.test === 'fail' ? <XCircle className="h-3 w-3 text-destructive" /> : 'Test'}
            </Button>
            <Switch checked={r.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
            <Button size="icon" variant="ghost" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
            {r.testMessage && (
              <p role={r.test === 'fail' ? 'alert' : undefined} className={`basis-full text-xs ${r.test === 'fail' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {r.testMessage}
              </p>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, { stage: '', spreadsheetId: '', url: '', enabled: true }])}>
            <Plus className="h-3 w-3 mr-1" /> Add stage
          </Button>
          <Button size="sm" onClick={save} disabled={saving || loadingSettings || Boolean(loadError)}>
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
