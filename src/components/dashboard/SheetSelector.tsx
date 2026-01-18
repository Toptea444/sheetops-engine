import { useState } from 'react';
import { ChevronDown, FileSpreadsheet, Check } from 'lucide-react';
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
    onSelectionChange(sheets.map(s => s.name));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Data Sources</span>
          <Badge variant="secondary" className="ml-1">
            {selectedSheets.length}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Data Sources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sheets.map((sheet) => {
          const isSelected = selectedSheets.includes(sheet.name);
          return (
            <DropdownMenuItem
              key={sheet.id}
              onClick={() => toggleSheet(sheet.name)}
              className="gap-2 cursor-pointer"
            >
              <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                isSelected 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-input'
              }`}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="flex-1 truncate">{sheet.name}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={selectAll} className="text-primary">
          Select All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
