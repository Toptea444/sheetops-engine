import { useState } from 'react';
import { Search, Users, Calendar, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface BulkSearchPanelProps {
  onSearch: (workerIds: string[], startDate: Date, endDate: Date) => void;
  isLoading: boolean;
  hasData: boolean;
}

type DatePreset = 'today' | 'last7days' | 'thisWeek' | 'thisMonth' | 'custom';

const datePresets: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Custom', value: 'custom' },
];

export function BulkSearchPanel({ onSearch, isLoading, hasData }: BulkSearchPanelProps) {
  const [workerIds, setWorkerIds] = useState<string[]>(['']);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>('custom');

  const handleAddWorkerId = () => {
    if (workerIds.length < 10) {
      setWorkerIds([...workerIds, '']);
    }
  };

  const handleRemoveWorkerId = (index: number) => {
    if (workerIds.length > 1) {
      setWorkerIds(workerIds.filter((_, i) => i !== index));
    }
  };

  const handleWorkerIdChange = (index: number, value: string) => {
    const newIds = [...workerIds];
    newIds[index] = value.toUpperCase();
    setWorkerIds(newIds);
  };

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
      case 'custom':
        // Keep current dates, just switch to custom mode
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
    const validIds = workerIds.filter(id => id.trim());
    if (validIds.length > 0 && startDate && endDate) {
      onSearch(validIds, startDate, endDate);
    }
  };

  const handleClearAll = () => {
    setWorkerIds(['']);
    setStartDate(undefined);
    setEndDate(undefined);
    setActivePreset('custom');
  };

  const validWorkerIds = workerIds.filter(id => id.trim());
  const isFormValid = validWorkerIds.length > 0 && startDate && endDate && hasData;

  return (
    <Card className="corporate-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Bulk Search
          </div>
          {validWorkerIds.length > 0 && (
            <Badge variant="secondary" className="font-normal">
              {validWorkerIds.length} worker{validWorkerIds.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Worker IDs Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Worker IDs
              </Label>
              {workerIds.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {workerIds.map((id, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Worker ID ${index + 1}`}
                    value={id}
                    onChange={(e) => handleWorkerIdChange(index, e.target.value)}
                    className="font-mono flex-1"
                  />
                  {workerIds.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveWorkerId(index)}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {workerIds.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWorkerId}
                className="w-full gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Another Worker
              </Button>
            )}
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

          {/* Date Range - Only show when custom or after selecting a preset */}
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
                Calculate {validWorkerIds.length > 1 ? `${validWorkerIds.length} Workers` : 'Bonus'}
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