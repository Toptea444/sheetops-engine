import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

type RankingBonusMomentumBannerProps = {
  userId?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
};

const HOOKS = [
  'Ranking bonus dey live — your position matters.',
  'Final stretch — every score counts now.',
  'Bonus window open — make your move.',
  'Leaderboard dey hot — who you wan pass?',
  'No dulling — push your ranking today.',
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

  const [hookIndex, setHookIndex] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const profileKey = userId || userName || 'anon';
    const sessionKey = `sheetops_ranking_bonus_hook_session_${profileKey}`;
    const lastIndexKey = `sheetops_ranking_bonus_hook_last_${profileKey}`;

    const existingSessionIndex = sessionStorage.getItem(sessionKey);
    if (existingSessionIndex !== null) {
      setHookIndex(Number(existingSessionIndex));
      return;
    }

    const previousIndexRaw = localStorage.getItem(lastIndexKey);
    const previousIndex = previousIndexRaw ? Number(previousIndexRaw) : -1;

    const availableIndices = HOOKS
      .map((_, index) => index)
      .filter((index) => index !== previousIndex);

    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;

    sessionStorage.setItem(sessionKey, String(nextIndex));
    localStorage.setItem(lastIndexKey, String(nextIndex));
    setHookIndex(nextIndex);
  }, [isActive, isLoggedIn, userId, userName]);

  if (!isLoggedIn || !isActive) return null;

  const selectedHook = HOOKS[hookIndex] ?? HOOKS[0];
  const daysLabel = daysToMonthEnd === 0 ? 'Last day' : `${daysToMonthEnd + 1}d left`;

  return (
    <div className="mb-5 flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-sm text-foreground/80 truncate">
          {selectedHook}
        </p>
      </div>
      <span className="flex-shrink-0 text-xs font-medium text-primary tabular-nums">
        {daysLabel}
      </span>
    </div>
  );
};

