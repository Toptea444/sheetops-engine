import { Calendar, TrendingUp, TrendingDown, Activity, Award, ChevronUp, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CycleSummaryData } from '@/hooks/useCycleSummary';

// ─── Types ───────────────────────────────────────────────────
interface CycleSummaryStaticModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: CycleSummaryData | null;
  userName: string | null;
}

// ─── Day Ranking Item ────────────────────────────────────────
function DayRankItem({
  rank,
  date,
  amount,
  variant,
  isTop
}: {
  rank: number;
  date: string;
  amount: number;
  variant: 'best' | 'worst';
  isTop?: boolean;
}) {
  const isBest = variant === 'best';
  
  return (
    <div className={`flex items-center gap-3 py-2 ${isTop ? '' : 'opacity-75'}`}>
      <div className={`
        flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
        ${isTop 
          ? isBest ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
          : isBest ? 'bg-emerald-500/20 text-emerald-600' : 'bg-orange-500/20 text-orange-600'
        }
      `}>
        {rank}
      </div>
      <span className="text-sm text-muted-foreground flex-1">{date}</span>
      <span className={`
        font-semibold tabular-nums
        ${isTop 
          ? isBest ? 'text-emerald-600 text-base' : 'text-orange-600 text-base'
          : 'text-foreground text-sm'
        }
      `}>
        {'\u20A6'}{amount.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CycleSummaryStaticModal({
  isOpen,
  onClose,
  summaryData,
  userName
}: CycleSummaryStaticModalProps) {
  if (!summaryData) return null;

  const firstName = userName ? userName.split(' ')[0] : 'there';
  const activePercent = summaryData.totalCycleDays > 0 
    ? Math.round((summaryData.activeDays / summaryData.totalCycleDays) * 100) 
    : 0;

  const formatDateShort = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  // Get top 3 best and worst days
  const topBest = summaryData.bestDays.slice(0, 3);
  const bottomWorst = summaryData.worstDays.slice(0, 3);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-xl">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Previous Cycle</p>
              <p className="text-sm font-medium text-foreground">{summaryData.previousCycle.label}</p>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm">
            Hey {firstName}, here's your cycle recap
          </p>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Total Earnings - Hero Section */}
          <div className="relative overflow-hidden bg-card border rounded-xl p-5">
            <div className="relative">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {summaryData.isDataComplete ? 'Total Bonus' : 'Total Bonus So Far'}
              </p>
              <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                {'\u20A6'}{summaryData.totalBonus.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Daily + Performance sheets
              </p>
              {/* Data freshness badge */}
              <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                summaryData.isDataComplete
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}>
                {summaryData.isDataComplete
                  ? `✓ Complete`
                  : summaryData.latestDataDate
                    ? `Updated to ${formatDateShort(summaryData.latestDataDate)}`
                    : 'Awaiting data'}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-emerald-500/5" />
          </div>

          {/* Top 3 Best & Worst Days */}
          <div className="grid grid-cols-1 gap-4">
            {/* Best Days */}
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ChevronUp className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Top 3 Best Days</span>
              </div>
              {topBest.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {topBest.map((day, i) => (
                    <DayRankItem
                      key={day.date}
                      rank={i + 1}
                      date={day.date}
                      amount={day.amount}
                      variant="best"
                      isTop={i === 0}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No data available</p>
              )}
            </div>

            {/* Worst Days */}
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <ChevronDown className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Bottom 3 Days</span>
              </div>
              {bottomWorst.length > 0 && bottomWorst[0].amount > 0 ? (
                <div className="divide-y divide-border/50">
                  {bottomWorst.map((day, i) => (
                    <DayRankItem
                      key={day.date}
                      rank={i + 1}
                      date={day.date}
                      amount={day.amount}
                      variant="worst"
                      isTop={i === 0}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-600 font-medium py-2">Every day was a win!</p>
              )}
            </div>
          </div>

          {/* Activity Stats - Compact Row */}
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Activity</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Circular Progress */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - activePercent / 100)}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{activePercent}%</span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-lg font-bold text-foreground">{summaryData.activeDays}</p>
                  <p className="text-xs text-muted-foreground">days with earnings</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-muted-foreground">{summaryData.inactiveDays}</p>
                  <p className="text-xs text-muted-foreground">days off</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Bonus - Compact */}
          {summaryData.hasRankingBonusData && (
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Ranking Bonus</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600 tabular-nums">
                    {'\u20A6'}{summaryData.rankingBonusTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summaryData.rankingBonusActiveDays} days with earnings
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary/10 hover:bg-primary/15 rounded-xl text-sm font-medium text-primary transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
