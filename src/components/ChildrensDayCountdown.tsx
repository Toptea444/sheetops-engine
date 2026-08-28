import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

function getThemeColor(accentColor: string): string {
  // Using muted tones for children's day aesthetic
  const colorMap: Record<string, string> = {
    blue: 'hsl(210 85% 65%)',
    green: 'hsl(142 65% 50%)',
    purple: 'hsl(270 70% 60%)',
    orange: 'hsl(28 95% 55%)',
    rose: 'hsl(350 90% 60%)',
    teal: 'hsl(174 60% 45%)',
    indigo: 'hsl(226 90% 60%)',
    amber: 'hsl(40 95% 55%)',
  };
  return colorMap[accentColor] || 'hsl(210 85% 65%)';
}

function calculateTimeLeft(): TimeLeft {
  const targetDate = new Date('2026-05-21T00:00:00').getTime();
  const now = new Date().getTime();
  const difference = targetDate - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    totalSeconds: Math.floor(difference / 1000),
  };
}

export function ChildrensDayCountdown() {
  const { accentColor } = useTheme();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft.totalSeconds <= 0) {
    return null;
  }

  const themeColor = getThemeColor(accentColor);

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-8 right-8 z-50 cursor-grab active:cursor-grabbing"
      >
        <motion.div
          layout
          layoutId="countdown-button"
          className="rounded-full shadow-lg backdrop-blur-sm border border-white/20"
          style={{
            background: `linear-gradient(135deg, ${themeColor}22 0%, ${themeColor}11 100%)`,
            borderColor: `${themeColor}40`,
          }}
          onClick={() => !isDragging && setIsExpanded(!isExpanded)}
        >
          {!isExpanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-16 w-16 rounded-full flex items-center justify-center relative"
            >
              {/* Animated pulse background */}
              <div
                className="absolute inset-0 rounded-full opacity-30 animate-pulse"
                style={{ backgroundColor: themeColor }}
              />

              <div className="relative z-10 text-center">
                <div
                  className="text-xs font-bold"
                  style={{ color: themeColor }}
                >
                  {timeLeft.days}d
                </div>
                <div
                  className="text-xs font-bold"
                  style={{ color: themeColor }}
                >
                  {String(timeLeft.hours).padStart(2, '0')}h
                </div>
              </div>

              {/* Outer ring animation */}
              <div
                className="absolute inset-0 rounded-full border-2 opacity-50"
                style={{
                  borderColor: themeColor,
                  animation: 'spin 8s linear infinite',
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-full px-4 py-3 min-w-[200px]"
            >
              <div className="text-center">
                {/* Title */}
                <div
                  className="text-xs font-bold mb-2"
                  style={{ color: themeColor }}
                >
                  Children&apos;s Day Design
                </div>

                {/* Countdown display */}
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Days */}
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {String(timeLeft.days).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">Days</div>
                  </div>

                  {/* Hours */}
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">Hours</div>
                  </div>

                  {/* Minutes */}
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">Mins</div>
                  </div>

                  {/* Seconds */}
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">Secs</div>
                  </div>
                </div>

                {/* Collapse hint */}
                <div className="flex items-center justify-center mt-2 text-muted-foreground">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AnimatePresence>
  );
}
