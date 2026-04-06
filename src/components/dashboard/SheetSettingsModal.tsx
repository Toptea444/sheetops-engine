import { useEffect, useState } from 'react';
import { ChevronRight, Bus, SlidersHorizontal } from 'lucide-react';

interface SheetSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenRankingBonus: () => void;
  onOpenTransportSubsidy: () => void;
  rankingIncludedInTotal: boolean;
  subsidyOptedIn: boolean;
  subsidyKId?: string | null;
}

export function SheetSettingsModal({
  open,
  onClose,
  onOpenRankingBonus,
  onOpenTransportSubsidy,
  rankingIncludedInTotal,
  subsidyOptedIn,
  subsidyKId,
}: SheetSettingsModalProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!open) {
      setFadeIn(false);
      return;
    }

    setFadeIn(true);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-250"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-250 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
        }}
      >
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Sheet settings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage what is shown in your totals and subsidy setup.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onOpenRankingBonus}
            className="w-full rounded-xl border border-border bg-background/70 p-3.5 text-left hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Ranking bonus display</p>
                <p className="text-xs text-muted-foreground">
                  {rankingIncludedInTotal ? 'Included in total earnings' : 'Hidden from total earnings'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>

          <button
            onClick={onOpenTransportSubsidy}
            className="w-full rounded-xl border border-border bg-background/70 p-3.5 text-left hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Transport subsidy</p>
                <p className="text-xs text-muted-foreground truncate">
                  {subsidyOptedIn
                    ? `Linked${subsidyKId ? ` • ${subsidyKId}` : ''}`
                    : 'Not linked'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
