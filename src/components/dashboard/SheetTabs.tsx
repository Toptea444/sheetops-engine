import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { SheetInfo } from '@/types/bonus';
import { cn } from '@/lib/utils';

interface SheetTabsProps {
  sheets: SheetInfo[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  isLoading: boolean;
}

interface SheetGroup {
  label: string | null;
  sheets: SheetInfo[];
}

/** Group tabs by bonus type so long monthly sheets stay scannable. */
function groupSheets(sheets: SheetInfo[]): SheetGroup[] {
  const groups: SheetGroup[] = [];
  for (const sheet of sheets) {
    const name = sheet.name.toUpperCase();
    const label = name.includes('DAILY') || name.includes('PERFORMANCE') ? 'Daily & Performance'
      : name.includes('RANKING') ? 'Ranking Bonus'
      : name.includes('WEEKLY') ? 'Weekly Bonus' : 'Other';
    let group = groups.find((item) => item.label === label);
    if (!group) {
      group = { label, sheets: [] };
      groups.push(group);
    }
    group.sheets.push(sheet);
  }
  return groups;
}

export function SheetTabs({ sheets, activeSheet, onSheetChange, isLoading }: SheetTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    const observer = new ResizeObserver(updateScrollButtons);
    if (scrollRef.current) observer.observe(scrollRef.current);
    window.addEventListener('resize', updateScrollButtons);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateScrollButtons); };
  }, [sheets]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (!sheets.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-muted-foreground" role="status">
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading sheets…</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-5 w-5" />
            <span>No sheets available</span>
          </>
        )}
      </div>
    );
  }

  const groups = groupSheets(sheets);
  const showGroupLabels = groups.length > 1;

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1.5 corporate-shadow">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => scrollBy(-280)}
        disabled={!canScrollLeft}
        aria-label="Scroll sheets left"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Tabs value={activeSheet} onValueChange={onSheetChange}>
            <TabsList className="h-auto w-max gap-1 bg-transparent p-0">
              {groups.map((group, groupIndex) => (
                <div key={group.label ?? `group-${groupIndex}`} className="flex items-center gap-1">
                  {groupIndex > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />}
                  {showGroupLabels && group.label && (
                    <span className="shrink-0 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                  )}
                  {group.sheets.map((sheet) => (
                    <TabsTrigger
                      key={sheet.id}
                      value={sheet.name}
                      disabled={isLoading || !!sheet.disabled}
                      title={sheet.name}
                      className={cn(
                        'shrink-0 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                      )}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                      <span className="max-w-[180px] truncate">{sheet.name}</span>
                    </TabsTrigger>
                  ))}
                </div>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {/* Fade edges hint at more tabs off-screen */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity',
            canScrollLeft ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity',
            canScrollRight ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => scrollBy(280)}
        disabled={!canScrollRight}
        aria-label="Scroll sheets right"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
