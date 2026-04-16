import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Calendar, CalendarDays, TrendingUp, TrendingDown, Activity, Award, RotateCcw, Users, Trophy } from 'lucide-react';
import type { CycleSummaryData } from '@/hooks/useCycleSummary';

// ─── Types ───────────────────────────────────────────────────
interface CycleSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: CycleSummaryData;
  userName: string | null;
  onShowStaticSummary?: () => void;
  peopleOutperformedInStage?: number | null;
}

type Screen = 'welcome' | 'total' | 'doubleBonus' | 'highlights' | 'activity' | 'ranking' | 'stageOutperform' | 'motivation' | 'closing';

// ─── Particle System ─────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

const CONFETTI_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316'];

// ─── Animated Number ─────────────────────────────────────────
function AnimatedNumber({ 
  value, 
  duration = 1.5,
  prefix = '',
  suffix = ''
}: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const displayValue = useTransform(springValue, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [displayValue]);

  return (
    <span className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  );
}

// ─── Screen Components ───────────────────────────────────────

function WelcomeScreen({ userName, cycleLabel }: { userName: string | null; cycleLabel: string }) {
  const firstName = userName ? userName.split(' ')[0] : null;
  
  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 12 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        >
          <Calendar className="h-20 w-20 text-primary mx-auto mb-6" />
        </motion.div>
      </motion.div>
      
      <motion.h1 
        className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
        initial={{ y: 40, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
      >
        Hey{firstName ? `, ${firstName}` : ''}!
      </motion.h1>
      
      <motion.p 
        className="text-xl text-muted-foreground mb-2"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
      >
        A new cycle just started
      </motion.p>
      
      <motion.p 
        className="text-base text-muted-foreground/70"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
      >
        Here's how you performed during
      </motion.p>
      
      <motion.p 
        className="text-base font-semibold text-primary mt-1"
        initial={{ y: 30, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        {cycleLabel}
      </motion.p>
    </motion.div>
  );
}

function TotalBonusScreen({ 
  total, 
  isAnimating,
  latestDataDate,
  isDataComplete,
  cycleEndDate
}: { 
  total: number; 
  isAnimating: boolean;
  latestDataDate: Date | null;
  isDataComplete: boolean;
  cycleEndDate: Date;
}) {
  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.p 
        className="text-sm uppercase tracking-widest text-muted-foreground mb-6"
        initial={{ y: -20, opacity: 0, letterSpacing: '0.1em' }}
        animate={{ y: 0, opacity: 1, letterSpacing: '0.25em' }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {isDataComplete ? 'Total Bonus Earned' : 'Total Earnings So Far'}
      </motion.p>
      
      <motion.div
        className="relative"
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 10 }}
      >
        <motion.div
          animate={{ 
            textShadow: [
              '0 0 20px rgba(16, 185, 129, 0)',
              '0 0 40px rgba(16, 185, 129, 0.5)',
              '0 0 20px rgba(16, 185, 129, 0)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <h2 className="text-6xl sm:text-7xl font-bold text-emerald-500">
            {isAnimating ? (
              <AnimatedNumber value={total} prefix={'\u20A6'} />
            ) : (
              <span className="tabular-nums">{'\u20A6'}{total.toLocaleString()}</span>
            )}
          </h2>
        </motion.div>
      </motion.div>
      
      <motion.p 
        className="mt-8 text-lg text-muted-foreground"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
      >
        from your Daily & Performance sheets
      </motion.p>

      {/* Data freshness indicator */}
      <motion.div
        className={`mt-4 rounded-full px-4 py-1.5 text-xs font-medium ${
          isDataComplete 
            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25' 
            : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
        }`}
        initial={{ y: 15, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        {isDataComplete ? (
          <>✓ Bonus data updated completely (to {formatDate(cycleEndDate)})</>
        ) : latestDataDate ? (
          <>Data updated to {formatDate(latestDataDate)} — awaiting remaining days</>
        ) : (
          <>Waiting for data updates</>
        )}
      </motion.div>
    </motion.div>
  );
}

function HighlightsScreen({ 
  bestDays, 
  worstDays 
}: { 
  bestDays: { date: string; amount: number }[];
  worstDays: { date: string; amount: number }[];
}) {
  // Get top 3 best and bottom 3 worst days
  const topBest = bestDays.slice(0, 3);
  const bottomWorst = worstDays.slice(0, 3);

  return (
    <motion.div 
      className="flex flex-col items-center justify-center px-6 h-full overflow-y-auto py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.p 
        className="text-sm uppercase tracking-widest text-muted-foreground mb-6 text-center"
        initial={{ y: -20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        Your Highlights
      </motion.p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {/* Top 3 Best Days */}
        <motion.div
          className="flex-1 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/25 rounded-2xl p-4"
          initial={{ x: -60, opacity: 0, rotateY: -15 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            >
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </motion.div>
            <span className="text-sm text-emerald-500 font-semibold">Top 3 Best Days</span>
          </div>
          {topBest.length > 0 ? (
            <div className="space-y-2">
              {topBest.map((day, index) => (
                <motion.div
                  key={day.date}
                  className="flex items-center justify-between bg-emerald-500/10 rounded-lg px-3 py-2"
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.15, type: 'spring' }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${index === 0 ? 'text-lg text-emerald-500' : 'text-sm text-foreground'}`}>
                    {'\u20A6'}{day.amount.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No data available</p>
          )}
        </motion.div>

        {/* Bottom 3 Worst Days */}
        <motion.div
          className="flex-1 bg-gradient-to-br from-orange-500/15 to-orange-500/5 border border-orange-500/25 rounded-2xl p-4"
          initial={{ x: 60, opacity: 0, rotateY: 15 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            >
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </motion.div>
            <span className="text-sm text-orange-500 font-semibold">Room to Grow</span>
          </div>
          {bottomWorst.length > 0 && bottomWorst[0].amount > 0 ? (
            <div className="space-y-2">
              {bottomWorst.map((day, index) => (
                <motion.div
                  key={day.date}
                  className="flex items-center justify-between bg-orange-500/10 rounded-lg px-3 py-2"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.15, type: 'spring' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center bg-orange-500/20 text-orange-500">
                      {index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {'\u20A6'}{day.amount.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.p 
              className="text-orange-500/80 text-sm font-medium"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              Every day was a win!
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function ActivityScreen({ 
  activeDays, 
  inactiveDays,
  totalDays 
}: { 
  activeDays: number;
  inactiveDays: number;
  totalDays: number;
}) {
  const activePercent = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;
  
  return (
    <motion.div 
      className="flex flex-col items-center justify-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex items-center gap-2 mb-6"
        initial={{ y: -20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Activity className="h-6 w-6 text-primary" />
        </motion.div>
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Your Activity
        </p>
      </motion.div>
      
      {/* Circular Progress */}
      <motion.div 
        className="relative w-44 h-44 mb-8"
        initial={{ scale: 0, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
      >
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="88"
            cy="88"
            r="76"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-muted/20"
          />
          <motion.circle
            cx="88"
            cy="88"
            r="76"
            fill="none"
            stroke="url(#activityGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 76}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 76 }}
            animate={{ 
              strokeDashoffset: 2 * Math.PI * 76 * (1 - activePercent / 100) 
            }}
            transition={{ delay: 0.6, duration: 1.5, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="activityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className="text-5xl font-bold text-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 150 }}
          >
            {activePercent}%
          </motion.span>
          <span className="text-sm text-muted-foreground mt-1">active</span>
        </div>
      </motion.div>
      
      <motion.div 
        className="flex gap-10 text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-emerald-500/10 rounded-xl px-5 py-3"
        >
          <p className="text-3xl font-bold text-emerald-500">{activeDays}</p>
          <p className="text-xs text-muted-foreground mt-1">Days with earnings</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-muted/50 rounded-xl px-5 py-3"
        >
          <p className="text-3xl font-bold text-muted-foreground">{inactiveDays}</p>
          <p className="text-xs text-muted-foreground mt-1">Days without</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function RankingBonusScreen({ 
  total, 
  activeDays,
  hasData,
  isAnimating
}: { 
  total: number;
  activeDays: number;
  hasData: boolean;
  isAnimating: boolean;
}) {
  if (!hasData) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center text-center px-6 h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Award className="h-14 w-14 text-muted-foreground/40 mb-4" />
        </motion.div>
        <p className="text-muted-foreground">No Ranking Bonus data for this cycle</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex items-center gap-2 mb-4"
        initial={{ y: -20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 15, -15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Award className="h-6 w-6 text-amber-500" />
        </motion.div>
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Ranking Bonus
        </p>
      </motion.div>
      
      <motion.p 
        className="text-base text-muted-foreground/70 mb-8"
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        Here's how you performed during the Ranking Bonus period
      </motion.p>
      
      <motion.div
        className="relative"
        initial={{ scale: 0, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
      >
        <motion.div
          animate={{ 
            textShadow: [
              '0 0 20px rgba(245, 158, 11, 0)',
              '0 0 40px rgba(245, 158, 11, 0.4)',
              '0 0 20px rgba(245, 158, 11, 0)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <h2 className="text-5xl sm:text-6xl font-bold text-amber-500">
            {isAnimating ? (
              <AnimatedNumber value={total} prefix={'\u20A6'} />
            ) : (
              <span className="tabular-nums">{'\u20A6'}{total.toLocaleString()}</span>
            )}
          </h2>
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="mt-6 bg-amber-500/10 rounded-full px-6 py-2"
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
      >
        <p className="text-sm text-muted-foreground">
          across <span className="font-bold text-amber-500">{activeDays}</span> days with earnings
        </p>
      </motion.div>
    </motion.div>
  );
}

function DoubleBonusPeriodScreen({
  period,
  isAnimating,
}: {
  period: CycleSummaryData['doubleBonusPeriod'];
  isAnimating: boolean;
}) {
  const statusMessage: Record<CycleSummaryData['doubleBonusPeriod']['attemptStatus'], string> = {
    none: "You didn't earn in this period yet.",
    tried: 'Nice try. You got something in this period.',
    strong: 'Solid run! You pushed well during this period.',
    maxed: 'You maxed it out. Amazing work!',
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 h-full py-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex items-center gap-2 mb-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <Award className="h-5 w-5 text-amber-500" />
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Double Bonus Period</p>
      </motion.div>

      <motion.p
        className="text-sm text-muted-foreground mb-4 text-center"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Here's how you performed from {period.startLabel} to {period.endLabel}.
      </motion.p>

      <motion.div
        className="text-center mb-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
      >
        <h2 className="text-4xl sm:text-5xl font-bold text-amber-500 tabular-nums">
          {isAnimating ? <AnimatedNumber value={period.totalEarned} prefix={'\u20A6'} /> : `${'\u20A6'}${period.totalEarned.toLocaleString()}`}
        </h2>
        <p className="text-xs text-muted-foreground mt-2">Total earned in the period</p>
      </motion.div>

      <div className="w-full max-w-sm mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Max: {'\u20A6'}{period.maxPossible.toLocaleString()}</span>
          <span>{period.progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${period.progressPercent}%` }}
            transition={{ delay: 0.5, duration: 1 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{statusMessage[period.attemptStatus]}</p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        {period.breakdown.length > 0 ? period.breakdown.map((day, index) => (
          <motion.div
            key={day.date}
            className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.1 }}
          >
            <span className="text-sm text-muted-foreground">{day.date}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{'\u20A6'}{day.amount.toLocaleString()}</span>
          </motion.div>
        )) : (
          <p className="text-sm text-muted-foreground text-center py-2">No earnings found in this period.</p>
        )}
      </div>
    </motion.div>
  );
}

function StageOutperformScreen({ peopleOutperformedInStage }: { peopleOutperformedInStage: number | null | undefined }) {
  const count = Math.max(0, peopleOutperformedInStage ?? 0);

  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-10 w-10 text-primary" />
        </div>
      </motion.div>

      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Stage Performance</p>

      <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
        You earned more than
        <span className="block text-primary mt-2">{count} {count === 1 ? 'person' : 'people'}</span>
      </h2>

      <p className="text-muted-foreground max-w-sm">
        This is based on your stage leaderboard for the last cycle. Keep going, you're moving up.
      </p>

      <motion.div
        className="mt-8 flex items-center gap-2 text-amber-500"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Trophy className="h-5 w-5" />
        <span className="text-sm font-medium">Nice one!</span>
      </motion.div>
    </motion.div>
  );
}

// ─── Motivation Screen ───────────────────────────────────────
function MotivationScreen({ userName }: { userName: string | null }) {
  const firstName = userName ? userName.split(' ')[0] : null;
  
  const motivationalMessages = [
    `You've got this, ${firstName || 'champ'}! This new cycle is your blank canvas - go paint something amazing!`,
    `Hey ${firstName || 'superstar'}! Every cycle is a fresh start. Time to crush it even harder!`,
    `${firstName || 'Legend'}! You showed up last cycle, now let's level up this one!`,
    `New cycle, new wins! ${firstName || 'You'}'ve already proven you can do it - now do it bigger!`,
  ];
  
  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 10 }}
        className="mb-8"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mx-auto"
        >
          <span className="text-5xl">&#127775;</span>
        </motion.div>
      </motion.div>
      
      <motion.h2 
        className="text-2xl sm:text-3xl font-bold text-foreground mb-6 leading-tight"
        initial={{ y: 30, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      >
        Ready for the Next Chapter?
      </motion.h2>
      
      <motion.p 
        className="text-lg text-muted-foreground max-w-sm leading-relaxed"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring' }}
      >
        {randomMessage}
      </motion.p>
      
      <motion.div
        className="mt-8 flex gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

function ClosingScreen({ onViewSummary }: { onViewSummary?: () => void }) {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="mb-8"
      >
        <motion.div 
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mx-auto"
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(var(--primary), 0)',
              '0 0 0 20px rgba(var(--primary), 0.1)',
              '0 0 0 0 rgba(var(--primary), 0)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <RotateCcw className="h-12 w-12 text-primary" />
        </motion.div>
      </motion.div>
      
      <motion.h2 
        className="text-2xl font-bold text-foreground mb-3"
        initial={{ y: 30, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
      >
        That's your cycle recap!
      </motion.h2>
      
      <motion.p 
        className="text-lg text-muted-foreground mb-8"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
      >
        Want to see this again anytime?
      </motion.p>
      
      {onViewSummary && (
        <motion.button
          onClick={onViewSummary}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg hover:bg-primary/90 transition-all"
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
          whileTap={{ scale: 0.95 }}
        >
          View Full Summary
        </motion.button>
      )}
      
      {/* Friendly note about the icon */}
      <motion.div
        className="mt-10 bg-muted/50 rounded-xl px-5 py-4 max-w-xs"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Pro tip!</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed text-left">
          You can always view this summary again by clicking the calendar icon next to the settings button at the top of your dashboard!
        </p>
      </motion.div>
      
      <motion.p 
        className="mt-6 text-xs text-muted-foreground/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        Tap anywhere to close
      </motion.p>
    </motion.div>
  );
}

// ─── Main Modal Component ────────────────────────────────────
export function CycleSummaryModal({
  isOpen,
  onClose,
  summaryData,
  userName,
  onShowStaticSummary,
  peopleOutperformedInStage
}: CycleSummaryModalProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const screens: Screen[] = ['welcome', 'total', 'doubleBonus', 'highlights', 'activity'];
  if (summaryData.hasRankingBonusData) {
    screens.push('ranking');
  }
  screens.push('stageOutperform');
  screens.push('motivation');
  screens.push('closing');

  const currentIndex = screens.indexOf(currentScreen);
  const isFirstScreen = currentIndex === 0;
  const isLastScreen = currentIndex === screens.length - 1;

  // Navigation
  const goNext = useCallback(() => {
    if (isLastScreen) {
      onClose();
      return;
    }
    setDirection(1);
    setIsAnimating(true);
    setCurrentScreen(screens[currentIndex + 1]);
  }, [currentIndex, isLastScreen, onClose, screens]);

  const goPrev = useCallback(() => {
    if (isFirstScreen) return;
    setDirection(-1);
    setIsAnimating(true);
    setCurrentScreen(screens[currentIndex - 1]);
  }, [currentIndex, isFirstScreen, screens]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  // Auto-advance for all screens (continuous auto-sliding)
  useEffect(() => {
    if (!isOpen) return;
    
    // Don't auto-advance on closing screen
    if (currentScreen === 'closing') return;
    
    // Different timings for different screens for better pacing
    const screenTimings: Record<Screen, number> = {
      welcome: 3000,
      total: 4000,
      doubleBonus: 6000,
      highlights: 5000,
      activity: 4500,
      ranking: 4000,
      stageOutperform: 4500,
      motivation: 5000,
      closing: 0, // Don't auto-advance
    };
    
    const timing = screenTimings[currentScreen] || 4000;
    const timer = setTimeout(goNext, timing);
    return () => clearTimeout(timer);
  }, [isOpen, currentScreen, goNext]);

  // Spawn particles on total screen
  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 4;

      newParticles.push({
        id: i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: 80 + Math.random() * 40,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
      });
    }

    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (currentScreen === 'total' && isAnimating) {
      const timer = setTimeout(spawnParticles, 800);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isAnimating, spawnParticles]);

  // Canvas particle rendering
  useEffect(() => {
    if (particles.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let localParticles = [...particles];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      localParticles = localParticles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          vx: p.vx * 0.99,
          life: p.life - 1 / p.maxLife,
          rotation: p.rotation + p.rotationSpeed,
        }))
        .filter((p) => p.life > 0);

      for (const p of localParticles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        const w = p.size;
        const h = p.size * 0.5;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 1.5);
        ctx.fill();
        ctx.restore();
      }

      if (localParticles.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [particles]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen('welcome');
      setDirection(1);
      setIsAnimating(true);
      setParticles([]);
    }
  }, [isOpen]);

  const handleViewStaticSummary = useCallback(() => {
    onClose();
    onShowStaticSummary?.();
  }, [onClose, onShowStaticSummary]);

  // Slide variants with more dramatic animations
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? 15 : -15
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.9,
      rotateY: dir < 0 ? 15 : -15
    })
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen 
            userName={userName} 
            cycleLabel={summaryData.previousCycle.label} 
          />
        );
      case 'total':
        return (
          <TotalBonusScreen 
            total={summaryData.totalBonus} 
            isAnimating={isAnimating}
          />
        );
      case 'doubleBonus':
        return (
          <DoubleBonusPeriodScreen
            period={summaryData.doubleBonusPeriod}
            isAnimating={isAnimating}
          />
        );
      case 'highlights':
        return (
          <HighlightsScreen 
            bestDays={summaryData.bestDays}
            worstDays={summaryData.worstDays}
          />
        );
      case 'activity':
        return (
          <ActivityScreen 
            activeDays={summaryData.activeDays}
            inactiveDays={summaryData.inactiveDays}
            totalDays={summaryData.totalCycleDays}
          />
        );
      case 'ranking':
        return (
          <RankingBonusScreen 
            total={summaryData.rankingBonusTotal}
            activeDays={summaryData.rankingBonusActiveDays}
            hasData={summaryData.hasRankingBonusData}
            isAnimating={isAnimating}
          />
        );
      case 'stageOutperform':
        return (
          <StageOutperformScreen peopleOutperformedInStage={peopleOutperformedInStage} />
        );
      case 'motivation':
        return (
          <MotivationScreen userName={userName} />
        );
      case 'closing':
        return (
          <ClosingScreen onViewSummary={handleViewStaticSummary} />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-label="Cycle summary"
    >
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-background/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Close summary"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Content area */}
      <div className="relative z-20 flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full h-full max-w-lg mx-auto py-20"
            onClick={goNext}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="relative z-20 pb-8 px-6">
        {/* Progress dots with animated timer */}
        <div className="flex justify-center gap-2 mb-4">
          {screens.map((screen, i) => {
            const isActive = i === currentIndex;
            const isPast = i < currentIndex;
            const screenTimings: Record<Screen, number> = {
              welcome: 3000,
              total: 4000,
              doubleBonus: 6000,
              highlights: 5000,
              activity: 4500,
              ranking: 4000,
              stageOutperform: 4500,
              motivation: 5000,
              closing: 0,
            };
            const timing = screenTimings[screen] || 4000;
            
            return (
              <button
                key={screen}
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  setIsAnimating(false);
                  setCurrentScreen(screen);
                }}
                className={`relative h-2 rounded-full transition-all overflow-hidden ${
                  isActive 
                    ? 'w-8 bg-primary/30' 
                    : isPast 
                      ? 'w-2 bg-primary' 
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to screen ${i + 1}`}
              >
                {isActive && currentScreen !== 'closing' && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: timing / 1000, ease: 'linear' }}
                    key={`progress-${currentScreen}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Arrow navigation */}
        <div className="flex justify-center gap-4">
          <button
            onClick={goPrev}
            disabled={isFirstScreen}
            className={`p-3 rounded-full transition-all ${
              isFirstScreen 
                ? 'opacity-0 pointer-events-none' 
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={goNext}
            className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all"
            aria-label={isLastScreen ? 'Close' : 'Next'}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
