import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CyclePeriod } from '@/lib/cycleUtils';

interface CycleSelectorProps {
  cycles: CyclePeriod[];
  selectedCycle: CyclePeriod;
  onCycleChange: (cycle: CyclePeriod) => void;
  isLoading?: boolean;
}

export function CycleSelector({
  cycles,
  selectedCycle,
  onCycleChange,
  isLoading,
}: CycleSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 min-w-[200px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedCycle.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {cycles.map((cycle, index) => (
          <DropdownMenuItem
            key={cycle.startDate.getTime()}
            onClick={() => onCycleChange(cycle)}
            className={`cursor-pointer ${
              cycle.startDate.getTime() === selectedCycle.startDate.getTime()
                ? 'bg-accent font-medium'
                : ''
            }`}
          >
            <span className="flex-1">{cycle.label}</span>
            {index === 0 && (
              <span className="text-xs text-muted-foreground ml-2">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
