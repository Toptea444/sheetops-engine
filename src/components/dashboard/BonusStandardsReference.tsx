import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BONUS_STANDARDS, getRecoveryRateColor } from '@/utils/bonusStandards';

export function BonusStandardsReference() {
  const stages = Object.keys(BONUS_STANDARDS).sort();

  return (
    <Card className="border-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bonus Standards by Stage</CardTitle>
        <CardDescription>
          Color coding shows performance based on recovery rate. Lower is better.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stageKey) => {
            const standard = BONUS_STANDARDS[stageKey];
            return (
              <div key={stageKey} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{standard.stage}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Excellent */}
                  <div className={`p-2 rounded ${getRecoveryRateColor(10)} border`}>
                    <p className="font-medium">Excellent</p>
                    <p>≤ 15%</p>
                    <p className="font-semibold mt-1">₦{standard.tiers.excellent.bonus.toLocaleString()}</p>
                  </div>

                  {/* Good */}
                  <div className={`p-2 rounded ${getRecoveryRateColor(30)} border`}>
                    <p className="font-medium">Good</p>
                    <p>16 - 35%</p>
                    <p className="font-semibold mt-1">₦{standard.tiers.good.bonus.toLocaleString()}</p>
                  </div>

                  {/* Fair */}
                  <div className={`p-2 rounded ${getRecoveryRateColor(50)} border`}>
                    <p className="font-medium">Fair</p>
                    <p>36 - 55%</p>
                    <p className="font-semibold mt-1">₦{standard.tiers.fair.bonus.toLocaleString()}</p>
                  </div>

                  {/* Poor */}
                  <div className={`p-2 rounded ${getRecoveryRateColor(70)} border`}>
                    <p className="font-medium">Poor</p>
                    <p>&gt; 55%</p>
                    <p className="font-semibold mt-1">₦{standard.tiers.poor.bonus.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
