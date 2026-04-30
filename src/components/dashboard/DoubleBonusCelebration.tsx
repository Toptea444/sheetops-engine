import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, Sparkles, Zap, Trophy, Clock, Flame, Gift, TrendingUp, Star, PartyPopper } from 'lucide-react';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

// ─── Types ───────────────────────────────────────────────────
interface DoubleBonusCelebrationProps {
  results: BonusResult[];
  selectedCycle: CyclePeriod;
  userName: string | null;
  isDataReady: boolean;
  isLoggedIn: boolean;
}

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
  type: 'confetti' | 'spark' | 'coin';
}

// Double bonus period: April 22 - April 30, 2026
const DOUBLE_BONUS_START = new Date(2026, 3, 22); // April 22
const DOUBLE_BONUS_END = new Date(2026, 3, 30); // April 30

// ─── Helpers ─────────────────────────────────────────────────
function isRankingBonusSheet(name: string): boolean {
  const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return n.includes('RANKINGBONUS') || (n.includes('RANKING') && n.includes('BONUS'));
}

function isDailyPerformanceSheet(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.includes('DAILY') || upper.includes('PERFORMANCE');
}

function isDateInDoubleBonusPeriod(date: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(DOUBLE_BONUS_START.getFullYear(), DOUBLE_BONUS_START.getMonth(), DOUBLE_BONUS_START.getDate());
  const end = new Date(DOUBLE_BONUS_END.getFullYear(), DOUBLE_BONUS_END.getMonth(), DOUBLE_BONUS_END.getDate());
  return d >= start && d <= end;
}

// ─── Animated Number ─────────────────────────────────────────
function AnimatedNumber({ 
  value, 
  prefix = '',
  className = ''
}: { 
  value: number; 
  prefix?: string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 25, stiffness: 80 });
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
    <span className={`tabular-nums ${className}`}>
      {prefix}{display}
    </span>
  );
}

// ─── Floating Icons ─────────────────────────────────────────
function FloatingIcons() {
  const icons = [Sparkles, Zap, Star, Gift, Trophy, Flame];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-amber-400/20"
          initial={{ 
            x: `${Math.random() * 100}%`, 
            y: `${Math.random() * 100}%`,
            scale: 0,
            opacity: 0 
          }}
          animate={{
            y: [null, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
            x: [null, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
            scale: [0, 1, 0.8, 1, 0],
            opacity: [0, 0.3, 0.5, 0.3, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Icon className="h-8 w-8 sm:h-12 sm:w-12" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Should Show Logic ───────────────────────────────────────
const CELEBRATION_KEY = 'double_bonus_celebration_shown_2026_apr';

function shouldShowCelebration(): boolean {
  try {
    const shown = localStorage.getItem(CELEBRATION_KEY);
    return shown !== 'true';
  } catch {
    return true;
  }
}

function markCelebrationShown() {
  try {
    localStorage.setItem(CELEBRATION_KEY, 'true');
  } catch {
    // ignore
  }
}

// ─── Main Component ──────────────────────────────────────────
export function DoubleBonusCelebration({
  results,
  selectedCycle,
  userName,
  isDataReady,
  isLoggedIn,
}: DoubleBonusCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'entering' | 'showing' | 'exiting'>('entering');
  const [currentScreen, setCurrentScreen] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const hasTriggered = useRef(false);

  // Calculate bonuses
  const bonusData = useMemo(() => {
    let doubleBonusFromDaily = 0;
    let totalRankingBonus = 0;
    let doubleBonusDays = 0;
    let rankingBonusDays = 0;

    for (const result of results) {
      if (result.valueType === 'percent') continue;
      const sheetName = result.sheetName || '';

      // Daily & Performance sheets - get rankingBonus field for double bonus period
      if (isDailyPerformanceSheet(sheetName)) {
        result.dailyBreakdown?.forEach((day) => {
          if (day.fullDate === undefined) return;
          const dayDate = new Date(day.fullDate);
          
          if (isDateInDoubleBonusPeriod(dayDate)) {
            // The rankingBonus field contains the double bonus portion
            const dailyRankingBonus = day.rankingBonus || 0;
            doubleBonusFromDaily += dailyRankingBonus;
            if (dailyRankingBonus > 0) doubleBonusDays++;
          }
        });
      }

      // Ranking Bonus sheets - get total for current cycle
      if (isRankingBonusSheet(sheetName)) {
        result.dailyBreakdown?.forEach((day) => {
          if (day.fullDate === undefined) return;
          const dayDate = new Date(day.fullDate);
          
          if (isDateInCycle(dayDate, selectedCycle)) {
            totalRankingBonus += day.value;
            if (day.value > 0) rankingBonusDays++;
          }
        });
      }
    }

    return {
      doubleBonusFromDaily,
      totalRankingBonus,
      doubleBonusDays,
      rankingBonusDays,
      grandTotal: doubleBonusFromDaily + totalRankingBonus,
    };
  }, [results, selectedCycle]);

  // Particle colors
  const CONFETTI_COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

  // Spawn particles
  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const count = 80;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 6;
      const type = Math.random() > 0.7 ? 'coin' : Math.random() > 0.4 ? 'confetti' : 'spark';

      newParticles.push({
        id: i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 60,
        vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
        vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4) - 3,
        life: 1,
        maxLife: 80 + Math.random() * 80,
        size: type === 'coin' ? 10 + Math.random() * 6 : type === 'confetti' ? 8 + Math.random() * 8 : 3 + Math.random() * 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        type,
      });
    }

    setParticles(newParticles);
  }, []);

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

        if (p.type === 'coin') {
          // Golden coin
          ctx.fillStyle = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${p.size * 0.6}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u20A6', 0, 1);
        } else if (p.type === 'confetti') {
          ctx.fillStyle = p.color;
          const w = p.size;
          const h = p.size * 0.5;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 2);
          ctx.fill();
        } else {
          // Spark
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

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

  // Check if we should show
  useEffect(() => {
    if (!isDataReady || !isLoggedIn || hasTriggered.current) return;
    if (!shouldShowCelebration()) return;
    
    // Only show if there's actual bonus data
    if (bonusData.grandTotal <= 0) return;

    hasTriggered.current = true;
    markCelebrationShown();
    
    // Delay to let earnings reveal show first
    const timer = setTimeout(() => {
      setVisible(true);
      setPhase('showing');
      spawnParticles();
    }, 5500);

    return () => clearTimeout(timer);
  }, [isDataReady, isLoggedIn, bonusData.grandTotal, spawnParticles]);

  const handleDismiss = useCallback(() => {
    setPhase('exiting');
    setTimeout(() => setVisible(false), 500);
  }, []);

  // Auto-advance screens
  useEffect(() => {
    if (phase !== 'showing') return;

    const timers: NodeJS.Timeout[] = [];

    // Screen transitions
    timers.push(setTimeout(() => setCurrentScreen(1), 3500)); // Show ranking bonus
    timers.push(setTimeout(() => setCurrentScreen(2), 7000)); // Show grand total
    timers.push(setTimeout(() => spawnParticles(), 7200)); // More particles for grand total
    timers.push(setTimeout(() => setCurrentScreen(3), 11000)); // Show urgency message
    timers.push(setTimeout(() => handleDismiss(), 16000)); // Auto close

    return () => timers.forEach(clearTimeout);
  }, [phase, spawnParticles, handleDismiss]);

  if (!visible) return null;

  const firstName = userName ? userName.split(' ')[0] : null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'exiting' ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      onClick={handleDismiss}
      role="dialog"
      aria-label="Double Bonus Period Celebration"
    >
      {/* Animated gradient background */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse at center, hsl(215 30% 12%) 0%, hsl(215 30% 8%) 100%)',
            'radial-gradient(ellipse at center, hsl(35 50% 12%) 0%, hsl(215 30% 8%) 100%)',
            'radial-gradient(ellipse at center, hsl(215 30% 12%) 0%, hsl(215 30% 8%) 100%)',
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Golden glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5" />
      
      {/* Floating icons */}
      <FloatingIcons />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        <AnimatePresence mode="wait">
          {currentScreen === 0 && (
            <Screen0 
              key="screen0" 
              firstName={firstName} 
              amount={bonusData.doubleBonusFromDaily}
              days={bonusData.doubleBonusDays}
            />
          )}
          {currentScreen === 1 && (
            <Screen1 
              key="screen1" 
              amount={bonusData.totalRankingBonus}
              days={bonusData.rankingBonusDays}
            />
          )}
          {currentScreen === 2 && (
            <Screen2 
              key="screen2" 
              grandTotal={bonusData.grandTotal}
              doubleBonusAmount={bonusData.doubleBonusFromDaily}
              rankingBonusAmount={bonusData.totalRankingBonus}
            />
          )}
          {currentScreen === 3 && (
            <Screen3 key="screen3" />
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <motion.div 
          className="flex gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.button
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentScreen === i ? 'bg-amber-400' : 'bg-white/20'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentScreen(i);
                if (i === 2) spawnParticles();
              }}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </motion.div>

        {/* Tap to dismiss */}
        <motion.p 
          className="mt-6 text-xs text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Tap anywhere to continue
        </motion.p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// ─── Screen Components ───────────────────────────────────────

function Screen0({ firstName, amount, days }: { firstName: string | null; amount: number; days: number }) {
  return (
    <motion.div 
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Badge */}
      <motion.div
        className="mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="h-4 w-4 text-amber-400" />
          </motion.div>
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
            Double Bonus Period
          </span>
          <motion.div
            animate={{ rotate: [0, -15, 15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="h-4 w-4 text-amber-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Greeting */}
      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-white mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {firstName ? `${firstName}, you're on fire!` : "You're on fire!"}
      </motion.h1>

      <motion.p
        className="text-sm text-white/60 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        April 22 - April 30 Double Bonus
      </motion.p>

      {/* Amount */}
      <motion.div
        className="relative"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
      >
        <motion.div
          className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <h2 className="relative text-5xl sm:text-6xl font-bold text-amber-400">
          <AnimatedNumber value={amount} prefix={'\u20A6'} />
        </h2>
      </motion.div>

      <motion.div
        className="mt-4 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-white/60">
          from <span className="font-semibold text-emerald-400">{days}</span> days of work
        </span>
      </motion.div>

      <motion.p
        className="mt-2 text-xs text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        From Daily & Performance Sheets
      </motion.p>
    </motion.div>
  );
}

function Screen1({ amount, days }: { amount: number; days: number }) {
  return (
    <motion.div 
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Icon */}
      <motion.div
        className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Trophy className="h-10 w-10 text-amber-400" />
        </motion.div>
      </motion.div>

      <motion.h2
        className="text-xl sm:text-2xl font-bold text-white mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Ranking Bonus Earnings
      </motion.h2>

      <motion.p
        className="text-sm text-white/50 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Your total from the Ranking Bonus sheet
      </motion.p>

      {/* Amount */}
      <motion.div
        className="relative"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      >
        <motion.div
          className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <h2 className="relative text-5xl sm:text-6xl font-bold text-amber-400">
          <AnimatedNumber value={amount} prefix={'\u20A6'} />
        </h2>
      </motion.div>

      <motion.div
        className="mt-4 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Star className="h-4 w-4 text-amber-400" />
        <span className="text-sm text-white/60">
          across <span className="font-semibold text-amber-400">{days}</span> ranked days
        </span>
      </motion.div>
    </motion.div>
  );
}

function Screen2({ grandTotal, doubleBonusAmount, rankingBonusAmount }: { grandTotal: number; doubleBonusAmount: number; rankingBonusAmount: number }) {
  return (
    <motion.div 
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Celebration icon */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            y: [0, -5, 0]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <PartyPopper className="h-14 w-14 text-amber-400" />
        </motion.div>
      </motion.div>

      <motion.h2
        className="text-xl sm:text-2xl font-bold text-white mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Total Bonus Stacked!
      </motion.h2>

      <motion.p
        className="text-sm text-white/50 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Your combined earnings this period
      </motion.p>

      {/* Grand total */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 80 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-400/30 to-orange-400/30 blur-3xl rounded-full"
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.4, 0.7, 0.4],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.h2 
          className="relative text-6xl sm:text-7xl font-bold"
          animate={{
            textShadow: [
              '0 0 30px rgba(251, 191, 36, 0.3)',
              '0 0 60px rgba(251, 191, 36, 0.6)',
              '0 0 30px rgba(251, 191, 36, 0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            <AnimatedNumber value={grandTotal} prefix={'\u20A6'} />
          </span>
        </motion.h2>
      </motion.div>

      {/* Breakdown */}
      <motion.div
        className="flex flex-col gap-2 w-full max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50">Double Bonus (Daily)</span>
          <span className="font-semibold text-white/80">{'\u20A6'}{doubleBonusAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50">Ranking Bonus</span>
          <span className="font-semibold text-white/80">{'\u20A6'}{rankingBonusAmount.toLocaleString()}</span>
        </div>
        <motion.div 
          className="h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent my-1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        />
        <div className="flex justify-between items-center text-sm">
          <span className="text-amber-400 font-semibold">Total Stacked</span>
          <span className="font-bold text-amber-400">{'\u20A6'}{grandTotal.toLocaleString()}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Screen3() {
  return (
    <motion.div 
      className="flex flex-col items-center text-center px-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Urgent badge */}
      <motion.div
        className="mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Clock className="h-4 w-4 text-red-400" />
          </motion.div>
          <span className="text-xs font-bold text-red-400 tracking-wider uppercase">
            Final Day!
          </span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
          >
            <Flame className="h-4 w-4 text-orange-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Urgency message */}
      <motion.h2
        className="text-2xl sm:text-3xl font-bold text-white mb-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        Double Bonus Ends Tomorrow!
      </motion.h2>

      <motion.div
        className="space-y-3 text-base sm:text-lg text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Today na the <span className="font-bold text-amber-400">LAST DAY</span> to stack your bonus.
        </motion.p>
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          No dull yourself o!
        </motion.p>
        <motion.p
          className="text-xl sm:text-2xl font-bold text-amber-400 mt-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, type: 'spring' }}
        >
          Go collect your bonus!
        </motion.p>
      </motion.div>

      {/* Action prompt */}
      <motion.div
        className="mt-8 flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Flame className="h-5 w-5 text-white" />
        <span className="font-bold text-white">Pack am well before midnight!</span>
        <motion.div
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
