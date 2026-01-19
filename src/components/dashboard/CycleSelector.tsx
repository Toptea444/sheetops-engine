import { ChevronDown } from 'lucide-react';
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
          variant="ghost" 
          className="h-8 gap-1 px-2 text-sm font-medium"
          disabled={isLoading}
        >
          {selectedCycle.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {cycles.map((cycle, index) => (
          <DropdownMenuItem
            key={cycle.startDate.getTime()}
            onClick={() => onCycleChange(cycle)}
            className={`text-sm ${
              cycle.startDate.getTime() === selectedCycle.startDate.getTime()
                ? 'bg-accent'
                : ''
            }`}
          >
            <span className="flex-1">{cycle.label}</span>
            {index === 0 && (
              <span className="text-[10px] text-muted-foreground">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
