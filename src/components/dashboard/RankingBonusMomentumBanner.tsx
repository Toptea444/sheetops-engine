import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Flame } from 'lucide-react';

type RankingBonusMomentumBannerProps = {
  userId?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
  totalRankingBonusEarnings?: number;
};

// General motivational messages (120 messages)
const GENERAL_MESSAGES = [
  // Original 5
  'Your position matters — push now.',
  'Every score counts in the final stretch.',
  'Make your move before month end.',
  'Who you wan pass on the leaderboard?',
  'No dulling — climb your ranking today.',
  // Urgency & momentum
  'Time dey go — no slack now.',
  'This na your moment to shine.',
  'The leaderboard no go wait for anybody.',
  'One more push fit change everything.',
  'Final stretch dey here — go hard.',
  'Now or never, no be play.',
  'E remain small — finish strong.',
  'Last days matter pass everything.',
  'Who dey chase you from behind?',
  'Your rank fit change today.',
  // Competition vibes
  'Omo, levels don change — level up.',
  'Your competition dey work — wetin you dey do?',
  'E get people wey wan pass you.',
  'No let person collect your spot.',
  'Stay sharp — the race never end.',
  'Them dey eye your position o.',
  'You wan fall back? No be you.',
  'Na who work pass go chop pass.',
  'The gap fit close any moment.',
  'One day fit scatter everything.',
  // Self-motivation
  'You don come far — no stop now.',
  'Na you know the goals wey you set.',
  'Remember why you started.',
  'Small small dey build to big things.',
  'You fit do better — prove am.',
  'Yesterday done pass — today matter.',
  'No let tiredness steal your bonus.',
  'Your future self go thank you.',
  'This week fit be your best week.',
  'Champion no dey rest for last lap.',
  // Achievement focus
  'Every point na money for your pocket.',
  'Small effort today, big reward tomorrow.',
  'Your consistency dey pay off.',
  'Stack the points — secure the bag.',
  'No leave money on the table.',
  'Your bonus dey wait — go collect am.',
  'Work smart, earn smart.',
  'The grind dey pay — keep pushing.',
  'Your hustle no be in vain.',
  'Results dey show for them wey dey try.',
  // Energy boosters
  'Wake up and dominate.',
  'New day, new opportunity.',
  'Energy high, excuses low.',
  'No dull moment — only action.',
  'Fire dey your belly — use am.',
  'You get the power — deploy am.',
  'Today na your day to show pepper.',
  'Rise and grind — no sleeping.',
  'Activate beast mode.',
  'Your energy fit move mountains.',
  // Nigerian flair
  'Sharpally — no dey waste time.',
  'Japa from low ranking.',
  'No cap — you fit reach the top.',
  'Oya na — make we see road.',
  'Soro soke on the leaderboard.',
  'Your matter no go end for bottom.',
  'Wetin dey sup? Level up!',
  'No be by mouth — na by work.',
  'Show dem say you serious.',
  'Your name must dey top.',
  // Closing strong
  'Finish like you started — strong.',
  'The end dey near — maximize am.',
  'Close the month like a boss.',
  'Strong finish = strong bonus.',
  'End of month energy — activate.',
  // === NEW 50 MESSAGES ===
  // Questions & challenges
  'Shey you don give up? No be you abeg.',
  'Wetin you dey wait for?',
  'How far with the grind today?',
  'You think say e easy? Prove am.',
  'Na today you wan start or wetin?',
  'You don chop today ranking point?',
  'Shey you serious or you dey play?',
  'Who tell you say you no fit?',
  'You wan let them pass you like that?',
  'Abi you don tire? Stand up!',
  'You think say them go give you? Work for am.',
  'How your ranking dey look sef?',
  'You dey feel the pressure? Good — use am.',
  'Na you go explain why you no try?',
  'Shey you sabi the top dey sweet?',
  // Pidgin slangs & vibes
  'No dey form busy — enter field.',
  'Ginger yourself small na.',
  'Wahala for who no wan rank up.',
  'E be like say you wan collect o.',
  'Ehen! Na now now.',
  'Gbe body enter ranking matter.',
  'No dey catch trips — focus.',
  'Sharply sharply — run am.',
  'E don tey wey you push?',
  'Shine your eye for the leaderboard.',
  'No let the month waka pass you.',
  'Cruise dey but ranking first.',
  'Dem never see your final form.',
  'Which kain levels be this? Upgrade!',
  'Body no be firewood — but na ranking time.',
  // Hype & motivation
  'Omo see your rank — you fit do more.',
  'The grind no get weekend.',
  'E no hard — just do the work.',
  'Your only competition na yesterday you.',
  'Prove to yourself say you different.',
  'Champions dey work when others dey rest.',
  'Na the extra effort dey separate.',
  'Today small, tomorrow plenty.',
  'No be luck — na pure work.',
  'Your time na now, no postpone.',
  // Reality checks
  'Month end no dey wait for anybody.',
  'Opportunity no dey knock twice.',
  'Na who try go know the result.',
  'Regret dey wait for who no try.',
  'Better to try pass to wonder wetin for happen.',
  'The leaderboard no sabi story — show result.',
  'Action loud pass intention.',
  'Plan without action na just wish.',
  'Your ranking na your responsibility.',
  'No excuses — just execute.',
];

// Earnings-based messages (15 messages) - dynamic based on amount
const getEarningsMessage = (amount: number, maxEarnings: number = 36000): string => {
  const formatted = amount.toLocaleString();
  const percentage = (amount / maxEarnings) * 100;

  // Very low (0 - 5%)
  if (percentage <= 5) {
    const lowMessages = [
      `${formatted} so far — wetin dey happen?`,
      `Only ${formatted}? You fit do better than this.`,
      `${formatted} — time to wake up o.`,
    ];
    return lowMessages[Math.floor(Math.random() * lowMessages.length)];
  }

  // Low (5% - 20%)
  if (percentage <= 20) {
    const messages = [
      `${formatted} in the bag — small but e dey grow.`,
      `${formatted} — the journey don start, no stop.`,
      `You don collect ${formatted} — push for more.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Medium-low (20% - 40%)
  if (percentage <= 40) {
    const messages = [
      `${formatted} loading — keep the energy.`,
      `${formatted} secured — halfway dey come.`,
      `${formatted} don enter — wetin remain?`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Medium (40% - 60%)
  if (percentage <= 60) {
    const messages = [
      `${formatted} strong — you dey move well.`,
      `${formatted} — you don cross middle, push am.`,
      `Halfway belle with ${formatted} — finish strong.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Medium-high (60% - 80%)
  if (percentage <= 80) {
    const messages = [
      `${formatted} — levels! You dey perform.`,
      `${formatted} in your corner — go collect the rest.`,
      `${formatted} don land — small remain.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // High (80% - 95%)
  if (percentage <= 95) {
    const messages = [
      `${formatted} — you almost there! No slack.`,
      `${formatted} — finish line dey your front.`,
      `${formatted} secured — maximize the remaining.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Very high (95%+)
  const highMessages = [
    `${formatted} — you don show dem!`,
    `${formatted} — maximum output, maximum bonus.`,
    `${formatted} collected — you be G!`,
  ];
  return highMessages[Math.floor(Math.random() * highMessages.length)];
};

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
  totalRankingBonusEarnings = 0,
}: RankingBonusMomentumBannerProps) => {
  const { isActive, daysToMonthEnd } = useMemo(() => getRankingWindowDetails(), []);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showEarningsMessage, setShowEarningsMessage] = useState(false);

  // Combine general messages with occasional earnings-based messages
  const allMessages = useMemo(() => {
    return GENERAL_MESSAGES;
  }, []);

  // Get current message - either general or earnings-based
  const currentMessage = useMemo(() => {
    if (showEarningsMessage && totalRankingBonusEarnings > 0) {
      return getEarningsMessage(totalRankingBonusEarnings);
    }
    return allMessages[messageIndex % allMessages.length];
  }, [showEarningsMessage, totalRankingBonusEarnings, allMessages, messageIndex]);

  // Auto-rotate messages every 5 seconds
  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = prev + 1;
        // Every 4th message, show earnings if available
        if (next % 4 === 0 && totalRankingBonusEarnings > 0) {
          setShowEarningsMessage(true);
        } else {
          setShowEarningsMessage(false);
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive, isLoggedIn, totalRankingBonusEarnings]);

  // Initialize with a random message on mount
  useEffect(() => {
    if (!isLoggedIn || !isActive) return;

    const profileKey = userId || userName || 'anon';
    const sessionKey = `sheetops_ranking_bonus_msg_session_${profileKey}`;

    const existingSessionIndex = sessionStorage.getItem(sessionKey);
    if (existingSessionIndex !== null) {
      setMessageIndex(Number(existingSessionIndex));
    } else {
      const randomIndex = Math.floor(Math.random() * allMessages.length);
      sessionStorage.setItem(sessionKey, String(randomIndex));
      setMessageIndex(randomIndex);
    }
  }, [isActive, isLoggedIn, userId, userName, allMessages.length]);

  const nextMessage = useCallback(() => {
    setMessageIndex((prev) => {
      const next = prev + 1;
      // Toggle earnings message on tap
      if (totalRankingBonusEarnings > 0 && !showEarningsMessage) {
        setShowEarningsMessage(true);
      } else {
        setShowEarningsMessage(false);
      }
      return next;
    });
  }, [totalRankingBonusEarnings, showEarningsMessage]);

  if (!isLoggedIn || !isActive) return null;

  const daysLeft = daysToMonthEnd + 1;
  const isUrgent = daysToMonthEnd <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-6"
    >
      {/* Two-line stacked design */}
      <div className="flex flex-col gap-1.5">
        {/* Top row: Label + Countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Live pulse indicator */}
            <div className="relative flex-shrink-0">
              <motion.span
                className={`absolute inset-0 rounded-full ${isUrgent ? 'bg-orange-500/50' : 'bg-primary/40'}`}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <span className={`relative block w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-orange-500' : 'bg-primary'}`} />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-primary/80">
              Ranking Bonus
            </span>
            {isUrgent && (
              <Flame className="w-3 h-3 text-orange-500 animate-pulse" />
            )}
          </div>

          {/* Countdown */}
          <motion.div
            className="flex items-center gap-1"
            animate={isUrgent ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 1, repeat: isUrgent ? Infinity : 0, ease: 'easeInOut' }}
          >
            <span className={`text-xs font-bold tabular-nums ${isUrgent ? 'text-orange-500' : 'text-primary'}`}>
              {daysLeft}
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-medium">
              {daysLeft === 1 ? 'day left' : 'days left'}
            </span>
          </motion.div>
        </div>

        {/* Bottom row: Rotating motivational message */}
        <button
          onClick={nextMessage}
          className="flex items-center gap-1.5 group cursor-pointer text-left w-full"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={`${messageIndex}-${showEarningsMessage}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`text-[13px] leading-snug truncate flex-1 ${
                showEarningsMessage 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground'
              }`}
            >
              {currentMessage}
            </motion.p>
          </AnimatePresence>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
        </button>
      </div>
    </motion.div>
  );
};
