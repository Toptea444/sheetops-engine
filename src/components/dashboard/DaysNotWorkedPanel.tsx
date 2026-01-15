import { useState, useMemo } from 'react';
import { CalendarOff, Minus, Calculator, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { BonusResult, DailyBonus } from '@/types/bonus';
import { cn } from '@/lib/utils';

interface DaysNotWorkedPanelProps {
  result: BonusResult;
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

export function DaysNotWorkedPanel({ result, startDate, endDate, onCalculate }: DaysNotWorkedPanelProps) {
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-destructive" />
            <span>Days Not Worked</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <Check className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select dates the worker did not work. These will be deducted from the total bonus.
        </p>
      </CardHeader>
      <CardContent>
        {/* Date Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
          {allDates.map((date) => {
            const dateStr = date.toISOString();
            const dayNum = date.getDate();
            const bonus = bonusMap.get(dayNum);
            const isSelected = selectedDates.has(dateStr);
            const hasBonus = bonus && bonus.value > 0;

            return (
              <div
                key={dateStr}
                onClick={() => toggleDate(dateStr)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                  isSelected
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleDate(dateStr)}
                  className="pointer-events-none"
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
              </div>
            );
          })}
        </div>

        {/* Selected Count */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedDates.size} day{selectedDates.size !== 1 ? 's' : ''} selected
            </Badge>
          </div>
          <Button 
            onClick={handleCalculate} 
            disabled={selectedDates.size === 0}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculate Deduction
          </Button>
        </div>
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
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Minus className="h-5 w-5 text-destructive" />
          Deduction Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deducted Days List */}
        {deduction.deductedDays.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">Days Deducted:</p>
            <div className="max-h-[150px] overflow-y-auto space-y-1">
              {deduction.deductedDays.map((day, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-1.5 px-3 rounded bg-background/50"
                >
                  <span className="text-sm">{day.date}</span>
                  <span className="text-sm font-mono text-destructive">
                    -{formatValue(day.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Calculation Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base Amount</span>
            <span className="font-mono font-semibold">
              {formatValue(deduction.baseAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-destructive">
            <span>Total Deduction ({deduction.deductedDays.length} days)</span>
            <span className="font-mono font-semibold">
              -{formatValue(deduction.totalDeduction)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Final Amount</span>
            <span className={cn(
              "font-mono font-bold text-xl",
              deduction.finalAmount >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatValue(deduction.finalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}