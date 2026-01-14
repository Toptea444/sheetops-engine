import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet } from 'lucide-react';
import type { SheetInfo } from '@/types/bonus';

interface SheetTabsProps {
  sheets: SheetInfo[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  isLoading: boolean;
}

export function SheetTabs({ sheets, activeSheet, onSheetChange, isLoading }: SheetTabsProps) {
  if (!sheets.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-muted-foreground">
        <FileSpreadsheet className="h-5 w-5" />
        <span>No sheets available</span>
      </div>
    );
  }

  return (
    <Tabs value={activeSheet} onValueChange={onSheetChange}>
      <TabsList className="h-auto flex-wrap gap-1 bg-card p-2 corporate-shadow">
        {sheets.map((sheet) => (
          <TabsTrigger
            key={sheet.id}
            value={sheet.name}
            disabled={isLoading}
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {sheet.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
