import { useRef, useState, useCallback } from 'react';

/**
 * WhatsApp-style swipe-to-reply.
 * Tracks horizontal drag on a message row and returns:
 *   - translateX to apply (visual pull)
 *   - handlers to spread on the row
 *   - onTrigger fires when the user drags past the threshold
 */
export function useSwipeReply(onTrigger: () => void, direction: 'right' | 'left' = 'right') {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const [dx, setDx] = useState(0);
  const THRESHOLD = 60;
  const MAX = 90;

  const reset = () => { startX.current = null; startY.current = null; active.current = false; setDx(0); };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    active.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current || startX.current == null) return;
    const t = e.touches[0];
    let delta = t.clientX - startX.current;
    const dy = t.clientY - (startY.current || 0);
    // Ignore mostly-vertical scrolls
    if (Math.abs(dy) > Math.abs(delta) && Math.abs(dy) > 8) { reset(); return; }
    if (direction === 'right') delta = Math.max(0, Math.min(MAX, delta));
    else delta = Math.min(0, Math.max(-MAX, delta));
    setDx(delta);
  }, [direction]);

  const onTouchEnd = useCallback(() => {
    if (!active.current) return;
    if (Math.abs(dx) >= THRESHOLD) onTrigger();
    reset();
  }, [dx, onTrigger]);

  return {
    dx,
    swipeProgress: Math.min(1, Math.abs(dx) / THRESHOLD),
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset },
  };
}
