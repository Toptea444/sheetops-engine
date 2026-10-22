import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { SPREADSHEET_ID, StageSheet, parseSpreadsheetId } from '@/lib/spreadsheetConfig';
import { Loader2, Plus, Save, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type Row = StageSheet & { url: string; test?: 'ok' | 'fail' | 'testing' };

export function StageSheetsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest } = useAdminData();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await adminRequest(adminSecret, 'get_stage_sheets');
      const list: StageSheet[] = res?.sheets || [];
      setRows(list.map((s) => ({ ...s, url: s.spreadsheetId })));
    })();
  }, [adminRequest, adminSecret]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const test = async (i: number) => {
    const id = parseSpreadsheetId(rows[i].url);
    if (!id) return toast.error('That link does not look like a Google Sheet');
    update(i, { test: 'testing' });
    const { data } = await supabase.functions.invoke('fetch-google-sheets', {
      body: { action: 'getSheets', spreadsheetId: id },
    });
    update(i, { test: data?.sheets?.length ? 'ok' : 'fail' });
  };

  const save = async () => {
    const sheets: StageSheet[] = [];
    for (const r of rows) {
      const id = parseSpreadsheetId(r.url);
      if (!r.stage.trim() || !id) return toast.error(`Fix stage "${r.stage || '(empty)'}": needs a name and a valid link`);
      sheets.push({ stage: r.stage.trim(), label: r.label, spreadsheetId: id, enabled: r.enabled });
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
          Add each stage's bonus sheet link. When a worker logs in, the app checks all enabled sheets to find their ID.
          If none match, it uses the default sheet ({SPREADSHEET_ID.slice(0, 10)}…).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
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
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, { stage: '', spreadsheetId: '', url: '', enabled: true }])}>
            <Plus className="h-3 w-3 mr-1" /> Add stage
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
