import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Timer } from 'lucide-react';

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
    hook: 'Ranking bonus don show face o.',
    prompt: 'You go push small extra today make your name climb?',
  },
  {
    hook: 'My guy, table dey hot this period.',
    prompt: 'Who you wan overtake before month close?',
  },
  {
    hook: 'No dull yourself this week.',
    prompt: 'You fit squeeze one better run today?',
  },
  {
    hook: 'Final stretch don start.',
    prompt: 'You dey leave points for table, or you wan collect am all?',
  },
  {
    hook: 'Oya, time to press small accelerator.',
    prompt: 'How many spots you wan move before this month ends?',
  },
];

const TICKER_ITEMS = [
  'Every day counts now.',
  'Tiny consistency fit move ranking well-well.',
  'Check position, set target, run am.',
  'No wait till tomorrow.',
  'You fit finish strong this month.',
];

const toDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getRankingWindowDetails = (today = new Date()) => {
  const currentDate = toDateOnly(today);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const msInDay = 24 * 60 * 60 * 1000;
  const daysToMonthEnd = Math.round((lastDayOfMonth.getTime() - currentDate.getTime()) / msInDay);

  return {
    isActive: daysToMonthEnd >= 0 && daysToMonthEnd <= 8,
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

    const availableIndices = MESSAGES.map((_, index) => index).filter((index) => index !== previousIndex);
    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;

    sessionStorage.setItem(sessionKey, String(nextIndex));
    localStorage.setItem(lastIndexKey, String(nextIndex));
    setMessageIndex(nextIndex);
  }, [isActive, isLoggedIn, userId, userName]);

  if (!isLoggedIn || !isActive) return null;

  const selectedMessage = MESSAGES[messageIndex] ?? MESSAGES[0];
  const daysLabel = daysToMonthEnd === 0
    ? 'Ends today'
    : `${daysToMonthEnd + 1} days left`;

  return (
    <section className="mb-5">
      <div className="ranking-bonus-rail relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background px-2 py-1 text-[11px] font-semibold text-primary sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Ranking bonus on
          </span>

          <p className="min-w-[220px] flex-1 text-xs text-foreground sm:text-sm">
            <span className="font-semibold">{selectedMessage.hook}</span>{' '}
            <span className="text-muted-foreground">{selectedMessage.prompt}</span>
          </p>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
            <Timer className="h-3.5 w-3.5 text-primary" />
            {daysLabel}
          </span>
        </div>

        <div className="border-t border-primary/15 bg-background/60 py-1">
          <div className="ranking-bonus-ticker-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="ranking-bonus-ticker-row">
                {TICKER_ITEMS.map((item) => (
                  <span key={`${copy}-${item}`} className="ranking-bonus-ticker-item">
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
