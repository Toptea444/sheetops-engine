import { X, Calendar, TrendingUp, TrendingDown, Activity, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CycleSummaryData } from '@/hooks/useCycleSummary';

// ─── Types ───────────────────────────────────────────────────
interface CycleSummaryStaticModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: CycleSummaryData | null;
  userName: string | null;
}

// ─── Stat Card Component ─────────────────────────────────────
function StatCard({
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  label,
  value,
  subValue
}: {
  icon: typeof Calendar;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`text-xs font-medium ${iconColor}`}>{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      )}
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">Cycle Summary</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Greeting */}
          <div className="text-center pb-2">
            <p className="text-sm text-muted-foreground">
              Hey {firstName}, here's how you performed during
            </p>
            <p className="text-sm font-medium text-primary">
              {summaryData.previousCycle.label}
            </p>
          </div>

          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Total Bonus Earned
            </p>
            <p className="text-4xl font-bold text-emerald-500 tabular-nums">
              {'\u20A6'}{summaryData.totalBonus.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              from Daily & Performance sheets
            </p>
          </div>

          {/* Highlights Grid */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Highlights</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Best Day */}
              <StatCard
                icon={TrendingUp}
                iconColor="text-emerald-500"
                bgColor="bg-emerald-500/5"
                borderColor="border-emerald-500/20"
                label="Best Day"
                value={summaryData.bestDays.length > 0 
                  ? `\u20A6${summaryData.bestDays[0].amount.toLocaleString()}`
                  : 'N/A'
                }
                subValue={summaryData.bestDays.length > 1 
                  ? `${summaryData.bestDays.length} days tied`
                  : summaryData.bestDays[0]?.date
                }
              />

              {/* Worst Day */}
              <StatCard
                icon={TrendingDown}
                iconColor="text-orange-500"
                bgColor="bg-orange-500/5"
                borderColor="border-orange-500/20"
                label="Room to Grow"
                value={summaryData.worstDays.length > 0 && summaryData.worstDays[0].amount > 0
                  ? `\u20A6${summaryData.worstDays[0].amount.toLocaleString()}`
                  : 'All wins!'
                }
                subValue={summaryData.worstDays.length > 1 
                  ? `${summaryData.worstDays.length} days`
                  : summaryData.worstDays[0]?.date
                }
              />
            </div>
          </div>

          {/* Activity Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </h3>
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Active days</span>
                <span className="text-sm font-semibold text-foreground">
                  {summaryData.activeDays} of {summaryData.totalCycleDays} days
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${activePercent}%` }}
                />
              </div>
              
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {summaryData.inactiveDays} days without earnings
                </span>
                <span className="text-xs font-medium text-primary">
                  {activePercent}% active
                </span>
              </div>
            </div>
          </div>

          {/* Ranking Bonus Section */}
          {summaryData.hasRankingBonusData && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Ranking Bonus
              </h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total earned</p>
                    <p className="text-2xl font-bold text-amber-500 tabular-nums">
                      {'\u20A6'}{summaryData.rankingBonusTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Qualifying days</p>
                    <p className="text-lg font-semibold text-foreground">
                      {summaryData.rankingBonusActiveDays}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
