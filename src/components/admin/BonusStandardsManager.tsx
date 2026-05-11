import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { BONUS_STANDARDS } from '@/utils/bonusStandards';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  adminSecret: string;
}

export function BonusStandardsManager({ adminSecret }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [standards, setStandards] = useState<any>(null);

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      const { data, error } = await supabase
        .from('bonus_standards')
        .select('*')
        .order('stage', { ascending: true });

      if (error) throw error;
      setStandards(data);
    } catch (err) {
      console.error('Error loading standards:', err);
      setMessage({ type: 'error', text: 'Failed to load standards' });
    }
  };

  const resetToDefaults = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Delete existing records
      const { error: deleteError } = await supabase
        .from('bonus_standards')
        .delete()
        .neq('stage', '');

      if (deleteError) throw deleteError;

      // Insert default standards
      const defaultStandards = Object.values(BONUS_STANDARDS).map((standard) => ({
        stage: standard.stage,
        tier_excellent_threshold: standard.tiers.excellent.threshold,
        tier_excellent_bonus: standard.tiers.excellent.bonus,
        tier_excellent_recovery_rate: standard.tiers.excellent.recoveryRate,
        tier_good_threshold: standard.tiers.good.threshold,
        tier_good_bonus: standard.tiers.good.bonus,
        tier_good_recovery_rate: standard.tiers.good.recoveryRate,
        tier_fair_threshold: standard.tiers.fair.threshold,
        tier_fair_bonus: standard.tiers.fair.bonus,
        tier_fair_recovery_rate: standard.tiers.fair.recoveryRate,
        tier_poor_threshold: standard.tiers.poor.threshold,
        tier_poor_bonus: standard.tiers.poor.bonus,
        tier_poor_recovery_rate: standard.tiers.poor.recoveryRate,
      }));

      const { error: insertError } = await supabase
        .from('bonus_standards')
        .insert(defaultStandards);

      if (insertError) throw insertError;

      setMessage({ type: 'success', text: 'Bonus standards reset to defaults successfully' });
      await loadStandards();
    } catch (err) {
      console.error('Error resetting standards:', err);
      setMessage({ type: 'error', text: 'Failed to reset standards' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bonus Standards Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </div>
            </Alert>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3">Current Standards</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {standards?.map((standard: any) => (
                <div key={standard.stage} className="text-xs border rounded p-2 bg-muted/20">
                  <p className="font-medium">{standard.stage}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-muted-foreground">
                    <div>
                      <span className="font-mono">Excellent:</span> ≤ {Number(standard.tier_excellent_threshold).toFixed(4)} (₦{standard.tier_excellent_bonus})
                    </div>
                    <div>
                      <span className="font-mono">Good:</span> ≤ {Number(standard.tier_good_threshold).toFixed(4)} (₦{standard.tier_good_bonus})
                    </div>
                    <div>
                      <span className="font-mono">Fair:</span> ≤ {Number(standard.tier_fair_threshold).toFixed(4)} (₦{standard.tier_fair_bonus})
                    </div>
                    <div>
                      <span className="font-mono">Poor:</span> ≥ {Number(standard.tier_poor_threshold).toFixed(4)} (₦{standard.tier_poor_bonus})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStandards}
              disabled={isLoading}
              className="text-xs"
            >
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={resetToDefaults}
              disabled={isLoading}
              className="text-xs"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
