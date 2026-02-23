import { ChevronDown, FileSpreadsheet, Check, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { SheetInfo } from '@/types/bonus';

interface SheetSelectorProps {
  sheets: SheetInfo[];
  selectedSheets: string[];
  onSelectionChange: (sheets: string[]) => void;
  isLoading?: boolean;
}

export function SheetSelector({
  sheets,
  selectedSheets,
  onSelectionChange,
  isLoading,
}: SheetSelectorProps) {
  // Filter out disabled sheets from the available selection
  const enabledSheets = sheets.filter(s => !s.disabled);
  
  const toggleSheet = (sheetName: string) => {
    if (selectedSheets.includes(sheetName)) {
      // Don't allow deselecting all sheets
      if (selectedSheets.length > 1) {
        onSelectionChange(selectedSheets.filter(s => s !== sheetName));
      }
    } else {
      onSelectionChange([...selectedSheets, sheetName]);
    }
  };

  const selectAll = () => {
    // Only select enabled sheets
    onSelectionChange(enabledSheets.map(s => s.name));
  };

  const selectedCount = selectedSheets.filter(s => 
    enabledSheets.some(es => es.name === s)
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Data Sources</span>
          <Badge variant="secondary" className="ml-1">
            {selectedCount}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[60vh] overflow-y-auto">
        <DropdownMenuLabel>Select Data Sources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sheets.map((sheet) => {
          const isSelected = selectedSheets.includes(sheet.name);
          const isDisabled = sheet.disabled;
          
          return (
            <DropdownMenuItem
              key={sheet.id}
              onClick={() => !isDisabled && toggleSheet(sheet.name)}
              disabled={isDisabled}
              className={`gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isDisabled ? (
                <Ban className="h-4 w-4 text-muted-foreground" />
              ) : (
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                  isSelected 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-input'
                }`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              )}
              <span className="flex-1 truncate">{sheet.name}</span>
              {isDisabled && (
                <span className="text-xs text-muted-foreground">Hidden</span>
              )}
            </DropdownMenuItem>
          );
        })}
        {enabledSheets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={selectAll} className="text-primary">
              Select All ({enabledSheets.length})
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
