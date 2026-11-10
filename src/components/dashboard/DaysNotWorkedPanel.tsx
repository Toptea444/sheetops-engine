import { useState, useMemo } from 'react';
import { CalendarOff, Minus, Calculator, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BonusResult, DailyBonus } from '@/types/bonus';
import { cn } from '@/lib/utils';

interface DaysNotWorkedPanelProps {
  result: BonusResult;
  workers: BonusResult[];
  onWorkerSelect: (worker: BonusResult) => void;
  hasSummary: boolean;
  startDate: Date;
  endDate: Date;
  onCalculate: (deductions: DeductionResult) => void;
}

export interface DeductionResult {
  selectedDates: string[];
  deductedDays: DailyBonus[];
  totalDeduction: number;
  baseAmount: number;
  finalAmount: number;
}

const CURRENCY_SYMBOL = '₦';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number) {
  return `${CURRENCY_SYMBOL}${formatNumber(value)}`;
}

// Generate all dates between start and end
function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Format date for display
function formatDateDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${days[date.getDay()]}`;
}

export function DaysNotWorkedPanel({ result, workers, onWorkerSelect, hasSummary, startDate, endDate, onCalculate }: DaysNotWorkedPanelProps) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [hasCalculated, setHasCalculated] = useState(false);

  // Generate all dates in the range
  const allDates = useMemo(() => generateDateRange(startDate, endDate), [startDate, endDate]);

  // Create a map of day number to bonus value
  const bonusMap = useMemo(() => {
    const map = new Map<number, DailyBonus>();
    for (const d of result.dailyBreakdown) {
      if (d.dayNumber !== undefined) {
        map.set(d.dayNumber, d);
      }
    }
    return map;
  }, [result.dailyBreakdown]);

  const selectedTotal = Array.from(selectedDates).reduce((sum, dateStr) => {
    const day = new Date(dateStr).getDate();
    return sum + (bonusMap.get(day)?.value ?? 0);
  }, 0);
  const formatValue = (value: number) => result.valueType === 'percent' ? `${value.toFixed(2)}%` : formatCurrency(value);

  const toggleDate = (dateStr: string) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    setSelectedDates(newSelected);
    setHasCalculated(false);
  };

  const selectAll = () => {
    const allDateStrings = allDates.map(d => d.toISOString());
    setSelectedDates(new Set(allDateStrings));
    setHasCalculated(false);
  };

  const clearAll = () => {
    setSelectedDates(new Set());
    setHasCalculated(false);
  };

  const handleCalculate = () => {
    // Calculate deductions for selected dates
    const deductedDays: DailyBonus[] = [];
    
    for (const dateStr of selectedDates) {
      const date = new Date(dateStr);
      const dayNum = date.getDate();
      const bonus = bonusMap.get(dayNum);
      
      deductedDays.push({
        date: formatDateDisplay(date),
        dayNumber: dayNum,
        value: bonus?.value ?? 0,
      });
    }

    const totalDeduction = deductedDays.reduce((sum, d) => sum + d.value, 0);
    const baseAmount = result.totalBonus;
    const finalAmount = baseAmount - totalDeduction;

    const deductionResult: DeductionResult = {
      selectedDates: Array.from(selectedDates),
      deductedDays,
      totalDeduction,
      baseAmount,
      finalAmount,
    };

    onCalculate(deductionResult);
    setHasCalculated(true);
  };

  return (
    <Card className="corporate-shadow">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarOff className="h-5 w-5 text-primary" />
              Days Not Worked
            </CardTitle>
            <p className="text-sm text-muted-foreground">Select the days to deduct from this worker’s bonus.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              <Check className="mr-1 h-3 w-3" /> Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worker for deduction</p>
          {workers.length > 1 ? (
            <Select value={result.workerId} onValueChange={(id) => {
              const worker = workers.find((item) => item.workerId === id);
              if (worker && worker.workerId !== result.workerId) {
                setSelectedDates(new Set());
                setHasCalculated(false);
                onWorkerSelect(worker);
              }
            }}>
              <SelectTrigger aria-label="Worker for deduction" className="w-full bg-card sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.workerId} value={worker.workerId}>{worker.workerId} — {worker.userName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="break-words text-sm font-medium"><span className="font-mono">{result.workerId}</span> <span className="text-muted-foreground">— {result.userName}</span></p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Date Selection Grid */}
        <div
          key={result.workerId}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
        >
          {allDates.map((date) => {
            const dateStr = date.toISOString();
            const dayNum = date.getDate();
            const bonus = bonusMap.get(dayNum);
            const isSelected = selectedDates.has(dateStr);
            const hasBonus = bonus && bonus.value > 0;

            return (
              <label
                key={dateStr}
                className={cn(
                  "flex min-h-16 items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                  isSelected
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleDate(dateStr)}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isSelected && "text-destructive"
                  )}>
                    {formatDateDisplay(date)}
                  </p>
                  <p className={cn(
                    "text-xs",
                    hasBonus ? "text-success" : "text-muted-foreground"
                  )}>
                    {hasBonus ? formatCurrency(bonus.value) : '—'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
          <div className="space-y-1">
            <Badge variant="secondary">{selectedDates.size} day{selectedDates.size !== 1 ? 's' : ''} selected</Badge>
            <p className="text-xs text-muted-foreground">Selected deduction: <span className="font-semibold text-foreground">{formatValue(selectedTotal)}</span></p>
          </div>
          <Button type="button" onClick={handleCalculate} disabled={selectedDates.size === 0} className="w-full gap-2 sm:w-auto">
            <Calculator className="h-4 w-4" /> Calculate deduction
          </Button>
        </div>
        {hasSummary && !hasCalculated && <p className="mt-2 text-xs text-muted-foreground" role="status">Selection changed. Calculate again to update the summary below.</p>}
      </CardContent>
    </Card>
  );
}

// Deduction Summary Component
interface DeductionSummaryProps {
  deduction: DeductionResult;
  valueType?: 'percent' | 'amount';
}

export function DeductionSummary({ deduction, valueType = 'amount' }: DeductionSummaryProps) {
  const formatValue = (value: number) => {
    if (valueType === 'amount') {
      return formatCurrency(value);
    }
    return `${value.toFixed(2)}%`;
  };

  return (
    <Card className="corporate-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Minus className="h-5 w-5 text-destructive" /> Deduction summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">Calculated for {deduction.deductedDays.length} selected day{deduction.deductedDays.length !== 1 ? 's' : ''}.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Original bonus</span>
            <span className="font-mono font-semibold">{formatValue(deduction.baseAmount)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Total deduction</span>
            <span className="font-mono font-semibold text-destructive">−{formatValue(deduction.totalDeduction)}</span>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Final bonus</span>
            <span className={cn('break-all font-mono text-xl font-bold', deduction.finalAmount >= 0 ? 'text-primary' : 'text-destructive')}>
              {formatValue(deduction.finalAmount)}
            </span>
          </div>
        </div>
        {deduction.deductedDays.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Days deducted</p>
            <div className="max-h-[150px] space-y-1 overflow-y-auto">
              {deduction.deductedDays.map((day, index) => (
                <div key={index} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                  <span>{day.date}</span>
                  <span className="font-mono text-destructive">−{formatValue(day.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
