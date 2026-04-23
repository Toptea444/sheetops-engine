import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Trophy, Timer } from 'lucide-react';

type RankingBonusMomentumBannerProps = {
  userId?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
};

type BannerMessage = {
  hook: string;
  prompt: string;
};

const MESSAGES: BannerMessage[] = [
  {
    hook: 'Omo, ranking bonus don land! 🔥',
    prompt: 'You don check your position today? Who you wan overtake before month close?',
  },
  {
    hook: 'My person, na your time to press gas! ⚡',
    prompt: 'If you lock in now-now, how many spots you fit climb this week?',
  },
  {
    hook: 'Sharp sharp, leaderboard dey hot! 🏁',
    prompt: 'You go allow this bonus pass you, or you wan collect your own?',
  },
  {
    hook: 'E choke! Bonus window don open. 💰',
    prompt: 'How your game plan be for these final days — steady or full ginger?',
  },
  {
    hook: 'No dulling, star worker! 🌟',
    prompt: 'Na today you dey push your best run, abi make we wait till tomorrow?',
  },
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
    const sessionKey = `sheetops_ranking_bonus_message_session_${profileKey}`;
    const lastIndexKey = `sheetops_ranking_bonus_message_last_${profileKey}`;

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

  return (
    <section className="mb-6 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-background p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background/70 to-transparent" />

      <div className="relative flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-primary">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Ranking Bonus Active
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/60 px-2.5 py-1 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            {daysToMonthEnd === 0
              ? 'Last day to grab am'
              : `${daysToMonthEnd + 1} day${daysToMonthEnd === 0 ? '' : 's'} left this month`}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm sm:text-base font-semibold text-foreground">{selectedMessage.hook}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{selectedMessage.prompt}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background/60 py-2">
          <div className="ranking-bonus-marquee flex min-w-max items-center gap-6 px-4 text-xs sm:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              Small daily push fit change your final ranking.
            </span>
            <span className="whitespace-nowrap">No wait for tomorrow — today score still counts.</span>
            <span className="whitespace-nowrap">Who you wan pass before month end? 👀</span>
            <span className="whitespace-nowrap">Lock in now, cash out later. 💸</span>
          </div>
        </div>
      </div>
    </section>
  );
};

