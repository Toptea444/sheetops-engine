import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { parseGoogleSheetsUrl } from '@/lib/googleSheetsUrl';
import { useSpreadsheetPreview } from '@/hooks/useSpreadsheetPreview';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/18Vjztt0odhAMzZiqIv4_HgIl5ebrzh4p67NFMWOQyQg/edit?gid=0#gid=0';

const columnLabel = (index: number) => {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

export default function SheetsPreview() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const { isLoading, error, data, loadPreview } = useSpreadsheetPreview();

  const parsed = useMemo(() => parseGoogleSheetsUrl(sheetUrl), [sheetUrl]);
  const activeSheet = data?.sheets[activeSheetIndex] ?? null;

  const handleOpenPreview = async () => {
    if (!parsed) return;
    const response = await loadPreview(parsed.spreadsheetId);
    if (!response) return;
    const gidMatch = parsed.gid ? response.sheets.findIndex((sheet) => sheet.id === parsed.gid) : 0;
    setActiveSheetIndex(gidMatch >= 0 ? gidMatch : 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Google Sheets Preview (Read-only)</CardTitle>
            <p className="text-sm text-muted-foreground">Open sheets natively in-app without redirecting to Google Sheets.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Paste a Google Sheets link" />
              <Button onClick={handleOpenPreview} disabled={!parsed || isLoading}>Open Preview</Button>
            </div>
            {!parsed && <p className="text-sm text-destructive">Please enter a valid Google Sheets URL.</p>}
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        )}

        {error && <Card><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}

        {data && activeSheet && (
          <Card>
            <CardHeader className="gap-3">
              <CardTitle>{data.spreadsheetTitle}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {data.sheets.map((sheet, idx) => (
                  <Button key={sheet.id} variant={idx === activeSheetIndex ? 'default' : 'outline'} size="sm" onClick={() => setActiveSheetIndex(idx)}>
                    {sheet.name}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-muted z-20">
                    <tr>
                      <th className="sticky left-0 z-30 border bg-muted px-2 py-1 text-left">#</th>
                      {(activeSheet.values[0] || []).map((_, idx) => <th key={idx} className="border px-2 py-1">{columnLabel(idx)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSheet.values.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="sticky left-0 border bg-muted px-2 py-1 font-medium">{rowIdx + 1}</td>
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="border px-2 py-1"
                            onClick={() => navigator.clipboard?.writeText(String(cell ?? ''))}
                            title="Click to copy"
                          >
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
