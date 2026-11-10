import { useState } from 'react';
import { Search, Users, Calendar, Plus, X, Trash2, FileSpreadsheet, ClipboardPaste } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface BulkSearchPanelProps {
  onSearch: (workerIds: string[], startDate: Date, endDate: Date) => void;
  isLoading: boolean;
  hasData: boolean;
  sourceLabel?: string;
  sheetName?: string;
}

type DatePreset = 'today' | 'last7days' | 'thisWeek' | 'thisMonth' | 'custom';

const datePresets: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Custom', value: 'custom' },
];

export function BulkSearchPanel({ onSearch, isLoading, hasData, sourceLabel, sheetName }: BulkSearchPanelProps) {
  const [workerIds, setWorkerIds] = useState<string[]>(['']);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedIds, setPastedIds] = useState('');
  const pastedList = pastedIds.split(/[\s,;]+/).map(id => id.trim().toUpperCase()).filter(Boolean);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
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

  const handleDateClick = (date: Date) => {
    setActivePreset('custom');
    if (!startDate || endDate || !isAfter(date, startDate)) {
      setStartDate(date);
      setEndDate(undefined);
    } else {
      setEndDate(date);
    }
    setHoveredDate(undefined);
  };

  const handleDateHover = (date: Date) => {
    if (startDate && !endDate && isAfter(date, startDate)) setHoveredDate(date);
  };

  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setHoveredDate(undefined);
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
    setHoveredDate(undefined);
    setActivePreset('custom');
  };

  const validWorkerIds = workerIds.filter(id => id.trim());
  const isFormValid = validWorkerIds.length > 0 && startDate && endDate && hasData;
  const previewEnd = endDate || hoveredDate;
  const previewDates = startDate && previewEnd && isAfter(previewEnd, startDate)
    ? eachDayOfInterval({ start: startDate, end: previewEnd })
    : [];
  const selectedDates = [startDate, endDate].filter((date): date is Date => Boolean(date));

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
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 break-words"><span className="font-medium text-foreground">Searching in: </span>{sourceLabel || 'Choose a source'}{sheetName ? ` / ${sheetName}` : ''}</span>
        </div>
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
                    className="min-w-0 font-mono flex-1"
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
            
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setShowPaste(!showPaste)} aria-expanded={showPaste}>
              <ClipboardPaste className="h-4 w-4" /> {showPaste ? 'Hide paste IDs' : 'Paste multiple IDs'}
            </Button>
            {showPaste && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <Label htmlFor="paste-worker-ids">Paste worker IDs</Label>
                <Textarea id="paste-worker-ids" value={pastedIds} onChange={(e) => setPastedIds(e.target.value)} placeholder="One ID per line, or separated by commas" rows={3} />
                <p className="text-xs text-muted-foreground">Up to 10 IDs. Importing replaces the current list.</p>
                {pastedList.length > 10 && <p role="alert" className="text-xs text-destructive">Please enter no more than 10 IDs.</p>}
                <Button type="button" variant="outline" size="sm" disabled={!pastedList.length || pastedList.length > 10} onClick={() => { setWorkerIds(pastedList); setPastedIds(''); setShowPaste(false); }}>
                  Import {pastedList.length || ''} IDs
                </Button>
              </div>
            )}
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
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" aria-label="Date presets">
              {datePresets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={activePreset === preset.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePresetClick(preset.value)}
                  aria-pressed={activePreset === preset.value}
                  className="h-8 shrink-0 px-2 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Single descending date-range picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Date range</Label>
              {(startDate || endDate) && (
                <Button type="button" variant="ghost" size="sm" onClick={handleClearDates} className="h-6 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-auto min-h-10 w-full justify-start whitespace-normal py-2 text-left font-normal', !startDate && 'text-muted-foreground')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {!startDate && 'Select date range'}
                  {startDate && !endDate && (
                    <span className="min-w-0 whitespace-normal break-words text-left">
                      Start: {format(startDate, 'PPP')} — choose a later end date
                    </span>
                  )}
                  {startDate && endDate && `${format(startDate, 'PPP')} – ${format(endDate, 'PPP')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={startDate ? { from: startDate, to: endDate || startDate } : undefined}
                  onDayClick={handleDateClick}
                  onDayMouseEnter={handleDateHover}
                  onDayMouseLeave={() => setHoveredDate(undefined)}
                  disabled={(date) => startDate ? !isAfter(date, startDate) && !isSameDay(date, startDate) : false}
                  modifiers={{ range_preview: previewDates, range_selected: selectedDates }}
                  modifiersClassNames={{
                    range_preview: 'bg-primary/15 text-foreground',
                    range_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Select the earlier date first, then an equal or later date.
                </p>
              </PopoverContent>
            </Popover>
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
