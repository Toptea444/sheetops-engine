import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Calendar, TrendingUp, TrendingDown, Activity, Award, RotateCcw } from 'lucide-react';
import type { CycleSummaryData } from '@/hooks/useCycleSummary';

// ─── Types ───────────────────────────────────────────────────
interface CycleSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: CycleSummaryData;
  userName: string | null;
  onShowStaticSummary?: () => void;
}

type Screen = 'welcome' | 'total' | 'highlights' | 'activity' | 'ranking' | 'closing';

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
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Calendar className="h-16 w-16 text-primary mx-auto mb-6" />
      </motion.div>
      
      <motion.h1 
        className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Hey{firstName ? `, ${firstName}` : ''}!
      </motion.h1>
      
      <motion.p 
        className="text-lg text-muted-foreground mb-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        A new cycle just started
      </motion.p>
      
      <motion.p 
        className="text-sm text-muted-foreground/70"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Here's how you performed during
      </motion.p>
      
      <motion.p 
        className="text-sm font-medium text-primary"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        {cycleLabel}
      </motion.p>
    </motion.div>
  );
}

function TotalBonusScreen({ total, isAnimating }: { total: number; isAnimating: boolean }) {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.p 
        className="text-sm uppercase tracking-widest text-muted-foreground mb-4"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Total Bonus Earned
      </motion.p>
      
      <motion.div
        className="relative"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
      >
        <h2 className="text-5xl sm:text-6xl font-bold text-emerald-500">
          {isAnimating ? (
            <AnimatedNumber value={total} prefix={'\u20A6'} />
          ) : (
            <span className="tabular-nums">{'\u20A6'}{total.toLocaleString()}</span>
          )}
        </h2>
      </motion.div>
      
      <motion.p 
        className="mt-6 text-muted-foreground"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        from your Daily & Performance sheets
      </motion.p>
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
  return (
    <motion.div 
      className="flex flex-col items-center justify-center px-6 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.p 
        className="text-sm uppercase tracking-widest text-muted-foreground mb-8 text-center"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Your Highlights
      </motion.p>
      
      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* Best Day */}
        <motion.div
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-emerald-500 font-medium">Best Day</span>
          </div>
          {bestDays.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-foreground">
                {'\u20A6'}{bestDays[0].amount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {bestDays.length > 1 
                  ? `${bestDays.length} days tied` 
                  : bestDays[0].date
                }
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </motion.div>

        {/* Worst Day */}
        <motion.div
          className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-500 font-medium">Room to Grow</span>
          </div>
          {worstDays.length > 0 && worstDays[0].amount > 0 ? (
            <>
              <p className="text-2xl font-bold text-foreground">
                {'\u20A6'}{worstDays[0].amount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {worstDays.length > 1 
                  ? `${worstDays.length} days` 
                  : worstDays[0].date
                }
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Every day was a win!</p>
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
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Activity className="h-5 w-5 text-primary" />
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Your Activity
        </p>
      </motion.div>
      
      {/* Circular Progress */}
      <motion.div 
        className="relative w-40 h-40 mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/30"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className="text-primary"
            strokeDasharray={`${2 * Math.PI * 70}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
            animate={{ 
              strokeDashoffset: 2 * Math.PI * 70 * (1 - activePercent / 100) 
            }}
            transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{activePercent}%</span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
      </motion.div>
      
      <motion.div 
        className="flex gap-8 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div>
          <p className="text-2xl font-bold text-emerald-500">{activeDays}</p>
          <p className="text-xs text-muted-foreground">Days with earnings</p>
        </div>
        <div className="w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-muted-foreground">{inactiveDays}</p>
          <p className="text-xs text-muted-foreground">Days without</p>
        </div>
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
        <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Award className="h-5 w-5 text-amber-500" />
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Ranking Bonus
        </p>
      </motion.div>
      
      <motion.p 
        className="text-sm text-muted-foreground/70 mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Here's how you performed during the Ranking Bonus period
      </motion.p>
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 150 }}
      >
        <h2 className="text-4xl sm:text-5xl font-bold text-amber-500">
          {isAnimating ? (
            <AnimatedNumber value={total} prefix={'\u20A6'} />
          ) : (
            <span className="tabular-nums">{'\u20A6'}{total.toLocaleString()}</span>
          )}
        </h2>
      </motion.div>
      
      <motion.p 
        className="mt-4 text-sm text-muted-foreground"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        across <span className="font-semibold text-foreground">{activeDays}</span> qualifying days
      </motion.p>
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
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <RotateCcw className="h-10 w-10 text-primary" />
        </div>
      </motion.div>
      
      <motion.h2 
        className="text-xl font-bold text-foreground mb-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        That's your cycle recap!
      </motion.h2>
      
      <motion.p 
        className="text-muted-foreground mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Want to see this again anytime?
      </motion.p>
      
      {onViewSummary && (
        <motion.button
          onClick={onViewSummary}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          View Full Summary
        </motion.button>
      )}
      
      <motion.p 
        className="mt-4 text-xs text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Or tap anywhere to close
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
  onShowStaticSummary
}: CycleSummaryModalProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const screens: Screen[] = ['welcome', 'total', 'highlights', 'activity'];
  if (summaryData.hasRankingBonusData) {
    screens.push('ranking');
  }
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

  // Auto-advance for welcome screen
  useEffect(() => {
    if (!isOpen || currentScreen !== 'welcome') return;
    const timer = setTimeout(goNext, 3000);
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

  // Slide variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0
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
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {screens.map((screen, i) => (
            <button
              key={screen}
              onClick={() => {
                setDirection(i > currentIndex ? 1 : -1);
                setIsAnimating(false);
                setCurrentScreen(screen);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex 
                  ? 'bg-primary w-6' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
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
