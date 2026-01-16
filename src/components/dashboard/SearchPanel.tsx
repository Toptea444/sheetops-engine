import { useState } from 'react';
import { Search, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchPanelProps {
  onSearch: (workerId: string, startDate: Date, endDate: Date) => void;
  isLoading: boolean;
  hasData: boolean;
}

type DatePreset = 'today' | 'last7days' | 'thisWeek' | 'thisMonth' | 'custom';

const datePresets: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'This Month', value: 'thisMonth' },
];

export function SearchPanel({ onSearch, isLoading, hasData }: SearchPanelProps) {
  const [workerId, setWorkerId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>('custom');

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const today = new Date();
    
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'last7days':
        setStartDate(subDays(today, 6));
        setEndDate(today);
        break;
      case 'thisWeek':
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'thisMonth':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setActivePreset('custom');
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setActivePreset('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workerId.trim() && startDate && endDate) {
      onSearch(workerId.trim(), startDate, endDate);
    }
  };

  const isFormValid = workerId.trim() && startDate && endDate && hasData;

  return (
    <Card className="corporate-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Search & Calculate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Worker ID Input */}
          <div className="space-y-2">
            <Label htmlFor="workerId" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Collector ID
            </Label>
            <Input
              id="workerId"
              placeholder="e.g., GHAS1001, NGDS1002"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>

          {/* Date Presets */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Quick Select
            </Label>
            <div className="flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={activePreset === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    {startDate ? format(startDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    {endDate ? format(endDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Calculating...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Calculate Bonus
              </>
            )}
          </Button>

          {!hasData && (
            <p className="text-center text-sm text-muted-foreground">
              Select a sheet tab above to load data
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}