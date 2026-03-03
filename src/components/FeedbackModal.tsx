import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FEEDBACK_DISMISSED_KEY = 'performanceTracker_feedbackAnswered';

interface FeedbackModalProps {
  userId: string | null;
  identityConfirmed: boolean;
}

export function FeedbackModal({ userId, identityConfirmed }: FeedbackModalProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'question' | 'thankyou' | 'hidden'>('question');
  const [fadeIn, setFadeIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already answered
  useEffect(() => {
    if (!userId || !identityConfirmed) return;

    const alreadyAnswered = localStorage.getItem(FEEDBACK_DISMISSED_KEY);
    if (alreadyAnswered) return;

    // Small delay before showing
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [userId, identityConfirmed]);

  const handleAnswer = useCallback(async (answer: 'yes' | 'no') => {
    if (submitting || !userId) return;
    setSubmitting(true);

    try {
      // Read existing feedback
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id, setting_value')
        .eq('setting_key', 'user_feedback')
        .maybeSingle();

      const responses = (existing?.setting_value as any[]) || [];
      const newEntry = {
        worker_id: userId,
        answer,
        timestamp: new Date().toISOString(),
      };
      responses.push(newEntry);

      if (existing) {
        await supabase
          .from('admin_settings')
          .update({
            setting_value: responses as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('admin_settings').insert({
          setting_key: 'user_feedback',
          setting_value: responses as unknown as Record<string, unknown>,
          description: 'User feedback responses',
        });
      }
    } catch {
      // Silent fail - don't block the user
    }

    // Mark as answered locally
    localStorage.setItem(FEEDBACK_DISMISSED_KEY, 'true');

    // Transition to thank you
    setFadeIn(false);
    setTimeout(() => {
      setPhase('thankyou');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });

      // Auto dismiss after showing thank you
      setTimeout(() => {
        setFadeIn(false);
        setTimeout(() => {
          setPhase('hidden');
          setVisible(false);
        }, 400);
      }, 2200);
    }, 350);
  }, [userId, submitting]);

  if (!visible || phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-400"
        style={{ opacity: fadeIn ? 1 : 0 }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm transition-all duration-400 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {phase === 'question' && (
            <div className="flex flex-col items-center text-center">
              <p className="text-base font-semibold text-foreground leading-snug">
                Are you enjoying the app?
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Has this app been helpful to you so far?
              </p>

              <div className="flex items-center gap-3 mt-5 w-full">
                <button
                  onClick={() => handleAnswer('yes')}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer('no')}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {phase === 'thankyou' && (
            <div className="flex flex-col items-center text-center py-2">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Thank you for your feedback
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
