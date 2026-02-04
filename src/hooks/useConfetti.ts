import confetti from 'canvas-confetti';
import { useCallback, useRef } from 'react';

export function useConfetti() {
  const hasTriggeredRef = useRef<Set<string>>(new Set());

  const triggerConfetti = useCallback((key?: string) => {
    // Prevent duplicate triggers for the same achievement
    if (key && hasTriggeredRef.current.has(key)) return;
    if (key) hasTriggeredRef.current.add(key);

    // Burst from both sides
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // Confetti from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  const triggerGoalComplete = useCallback((goalKey: string) => {
    if (hasTriggeredRef.current.has(goalKey)) return;
    hasTriggeredRef.current.add(goalKey);

    // Special gold/green celebration for goals
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#22C55E', '#10B981'],
      zIndex: 9999,
    });
  }, []);

  const triggerRankUp = useCallback(() => {
    // Stars burst for rank improvement
    const scalar = 2;
    const star = confetti.shapeFromPath({
      path: 'M26.5 0.5 L30.6 18.7 L49.5 18.7 L34 30.5 L39.1 49.5 L26.5 38.4 L13.9 49.5 L19 30.5 L3.5 18.7 L22.4 18.7 Z',
    });

    confetti({
      particleCount: 50,
      spread: 100,
      origin: { y: 0.5 },
      shapes: [star],
      scalar,
      colors: ['#FFD700', '#FFA500', '#FF6B6B'],
      zIndex: 9999,
    });
  }, []);

  const resetTriggers = useCallback(() => {
    hasTriggeredRef.current.clear();
  }, []);

  return { triggerConfetti, triggerGoalComplete, triggerRankUp, resetTriggers };
}
