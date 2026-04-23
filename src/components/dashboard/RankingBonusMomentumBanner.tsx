import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const profileKey = userId || userName || 'anon';
    const sessionKey = `sheetops_ranking_bonus_msg_session_${profileKey}`;
    const lastIndexKey = `sheetops_ranking_bonus_msg_last_${profileKey}`;

    const existingSessionIndex = sessionStorage.getItem(sessionKey);
    if (existingSessionIndex !== null) {
      setMessageIndex(Number(existingSessionIndex));
      return;
    }

    const previousIndexRaw = localStorage.getItem(lastIndexKey);
    const previousIndex = previousIndexRaw ? Number(previousIndexRaw) : -1;

    const availableIndices = MESSAGES
      .map((_, index) => index)
      .filter((index) => index !== previousIndex);

    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;

    sessionStorage.setItem(sessionKey, String(nextIndex));
    localStorage.setItem(lastIndexKey, String(nextIndex));
    setMessageIndex(nextIndex);
  }, [isActive, isLoggedIn, userId, userName]);

  if (!isLoggedIn || !isActive) return null;

  const selectedMessage = MESSAGES[messageIndex] ?? MESSAGES[0];
  const daysLeft = daysToMonthEnd + 1;
  const isUrgent = daysToMonthEnd <= 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-5"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Minimal indicator + message */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Subtle live indicator */}
          <div className="relative flex-shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/40"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className={`relative block w-2 h-2 rounded-full ${isUrgent ? 'bg-orange-500' : 'bg-primary'}`} />
          </div>

          {/* Label + rotating message */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-primary/70 flex-shrink-0">
              Ranking
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">—</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={messageIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-[13px] text-muted-foreground truncate hidden sm:inline"
              >
                {selectedMessage}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Countdown */}
        <motion.div
          className="flex items-center gap-1.5 flex-shrink-0"
          animate={isUrgent ? { opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 1.2, repeat: isUrgent ? Infinity : 0, ease: 'easeInOut' }}
        >
          <span className={`text-sm font-semibold tabular-nums ${isUrgent ? 'text-orange-500' : 'text-primary'}`}>
            {daysLeft}d
          </span>
          <span className="text-[11px] text-muted-foreground/60 font-medium">left</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

