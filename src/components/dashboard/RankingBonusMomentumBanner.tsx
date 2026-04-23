import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

type RankingBonusMomentumBannerProps = {
  userId?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
};

const MESSAGES = [
  'Your position matters — push now.',
  'Every score counts in the final stretch.',
  'Make your move before month end.',
  'Who you wan pass on the leaderboard?',
  'No dulling — climb your ranking today.',
];

const toDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getRankingWindowDetails = (today = new Date()) => {
  const currentDate = toDateOnly(today);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const msInDay = 24 * 60 * 60 * 1000;
  const daysToMonthEnd = Math.round((lastDayOfMonth.getTime() - currentDate.getTime()) / msInDay);
  const isActive = daysToMonthEnd >= 0 && daysToMonthEnd <= 8;

  return {
    isActive,
    daysToMonthEnd,
  };
};

export const RankingBonusMomentumBanner = ({
  userId,
  userName,
  isLoggedIn,
}: RankingBonusMomentumBannerProps) => {
  const { isActive, daysToMonthEnd } = useMemo(() => getRankingWindowDetails(), []);
  const [messageIndex, setMessageIndex] = useState(0);

  // Auto-rotate messages every 6 seconds
  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isActive, isLoggedIn]);

  // Initialize with a random message on mount
  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const profileKey = userId || userName || 'anon';
    const sessionKey = `sheetops_ranking_bonus_msg_session_${profileKey}`;

    const existingSessionIndex = sessionStorage.getItem(sessionKey);
    if (existingSessionIndex !== null) {
      setMessageIndex(Number(existingSessionIndex));
    } else {
      const randomIndex = Math.floor(Math.random() * MESSAGES.length);
      sessionStorage.setItem(sessionKey, String(randomIndex));
      setMessageIndex(randomIndex);
    }
  }, [isActive, isLoggedIn, userId, userName]);

  const nextMessage = useCallback(() => {
    setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
  }, []);

  if (!isLoggedIn || !isActive) return null;

  const selectedMessage = MESSAGES[messageIndex] ?? MESSAGES[0];
  const daysLeft = daysToMonthEnd + 1;
  const isUrgent = daysToMonthEnd <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-5"
    >
      {/* Single-line premium ticker */}
      <div className="flex items-center gap-2">
        {/* Live pulse indicator */}
        <div className="relative flex-shrink-0">
          <motion.span
            className={`absolute inset-0 rounded-full ${isUrgent ? 'bg-orange-500/50' : 'bg-primary/40'}`}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className={`relative block w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-orange-500' : 'bg-primary'}`} />
        </div>

        {/* Countdown badge */}
        <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
          isUrgent 
            ? 'bg-orange-500/10 text-orange-500' 
            : 'bg-primary/10 text-primary'
        }`}>
          {daysLeft}d left
        </span>

        {/* Separator */}
        <span className="text-muted-foreground/20">|</span>

        {/* Rotating message with tap to advance */}
        <button
          onClick={nextMessage}
          className="flex items-center gap-1 min-w-0 group cursor-pointer"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={messageIndex}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-[13px] text-muted-foreground truncate"
            >
              {selectedMessage}
            </motion.span>
          </AnimatePresence>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 group-hover:text-primary transition-colors" />
        </button>
      </div>
    </motion.div>
  );
};

