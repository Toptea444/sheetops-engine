import { useState } from 'react';
import { ArrowLeftRight, ArrowRight, ArrowDown, ArrowUp, Calendar, FileText, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AdjustmentNote } from '@/hooks/useEarningsAdjustments';

interface Props {
  notes: AdjustmentNote[];
  netAdjustment: number;
  isLoading?: boolean;
}

export function AdjustmentsPanel({ notes, netAdjustment, isLoading }: Props) {
  if (notes.length === 0) return null;

  const typeConfig = {
    swap_in: { icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', label: 'ID Swap' },
    swap_out: { icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', label: 'ID Swap' },
    transfer_credit: { icon: ArrowDown, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', label: 'Earnings Added' },
    transfer_debit: { icon: ArrowUp, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', label: 'Earnings Deducted' },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Earnings Adjustments</span>
          </div>
          {netAdjustment !== 0 && (
            <Badge
              variant="secondary"
              className={`text-xs ${netAdjustment > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
            >
              {netAdjustment > 0 ? '+' : ''}₦{netAdjustment.toLocaleString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Explanation */}
        <div className="flex gap-2 mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your admin has made adjustments to your earnings. These corrections account for ID changes or shift coverage by other workers. Your displayed totals reflect these adjustments.
          </p>
        </div>

        <ScrollArea className="max-h-[250px]">
          <div className="space-y-2">
            {notes.map((note, i) => {
              const config = typeConfig[note.type];
              const Icon = config.icon;
              return (
                <AdjustmentItem key={i} note={note} config={config} Icon={Icon} />
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AdjustmentItem({ note, config, Icon }: {
  note: AdjustmentNote;
  config: { color: string; bg: string; border: string; label: string };
  Icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border ${config.bg} ${config.border}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center gap-2.5 text-left">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4">{config.label}</Badge>
              {note.amount !== 0 && (
                <Badge variant="secondary" className={`text-[10px] h-4 ${note.amount > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {note.amount > 0 ? '+' : ''}₦{Math.abs(note.amount).toLocaleString()}
                </Badge>
              )}
            </div>
            {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1 ml-[2.625rem]">
            <p className="text-xs text-foreground/80 leading-relaxed">{note.description}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
