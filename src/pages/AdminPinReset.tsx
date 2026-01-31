import { useState } from 'react';
import { Shield, KeyRound, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function AdminPinReset() {
  const [workerId, setWorkerId] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleReset = async () => {
    if (!workerId.trim()) {
      toast.error('Please enter a Worker ID');
      return;
    }
    if (!adminSecret.trim()) {
      toast.error('Please enter the admin secret');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke('reset-worker-pin', {
        body: { 
          worker_id: workerId.trim().toUpperCase(), 
          admin_secret: adminSecret 
        },
      });

      if (response.error) {
        setResult({ success: false, message: response.error.message || 'Failed to reset PIN' });
        toast.error('Failed to reset PIN');
      } else if (response.data.success) {
        setResult({ success: true, message: response.data.message || 'PIN reset successfully' });
        toast.success('PIN reset successfully');
        setWorkerId('');
      } else {
        setResult({ success: false, message: response.data.error || 'Failed to reset PIN' });
        toast.error(response.data.error || 'Failed to reset PIN');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && workerId && adminSecret) {
      handleReset();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Admin PIN Reset</CardTitle>
          <CardDescription>
            Reset the PIN for a worker who has been locked out
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Only use this if a worker is locked out and cannot access their account. After reset, they'll need to set a new PIN.
              </p>
            </div>
          </div>

          {/* Worker ID */}
          <div className="space-y-1.5">
            <Label htmlFor="workerId" className="text-sm">Worker ID</Label>
            <Input
              id="workerId"
              placeholder="e.g., NGDS0001"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="uppercase"
              disabled={isLoading}
            />
          </div>

          {/* Admin Secret */}
          <div className="space-y-1.5">
            <Label htmlFor="adminSecret" className="text-sm">Admin Secret</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adminSecret"
                type="password"
                placeholder="Enter admin secret"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Result message */}
          {result && (
            <div className={`rounded-lg p-3 flex items-center gap-2 ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-destructive/10 border border-destructive/30'
            }`}>
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <p className={`text-sm ${
                result.success 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-destructive'
              }`}>
                {result.message}
              </p>
            </div>
          )}

          {/* Reset button */}
          <Button 
            onClick={handleReset} 
            className="w-full"
            disabled={isLoading || !workerId || !adminSecret}
          >
            {isLoading ? 'Resetting...' : 'Reset PIN'}
          </Button>

          {/* Back link */}
          <Link 
            to="/" 
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
