import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-6 relative"
    >
      <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent border border-primary/10">
        {/* Animated pulse indicator */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold tracking-wide uppercase text-primary">
              Ranking Bonus
            </span>
            <span className="hidden sm:inline text-primary/30">|</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={messageIndex}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground truncate"
              >
                {selectedMessage}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Days countdown */}
          <motion.div
            className="flex items-center gap-1.5 flex-shrink-0"
            animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1.5, repeat: isUrgent ? Infinity : 0, ease: 'easeInOut' }}
          >
            <div className={`flex items-baseline gap-1 ${isUrgent ? 'text-orange-500' : 'text-primary'}`}>
              <span className="text-lg font-semibold tabular-nums leading-none">{daysLeft}</span>
              <span className="text-xs font-medium opacity-80">
                {daysLeft === 1 ? 'day left' : 'days left'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle animated line accent */}
      <motion.div
        className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.div>
  );
};

