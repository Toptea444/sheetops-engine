import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface EarningsRevealProps {
  totalEarnings: number;
  daysActive: number;
  userName: string | null;
  previousDayEarnings: number;
  isDataReady: boolean;
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
  type: 'confetti' | 'spark';
}

// ─── Tier logic ──────────────────────────────────────────────
type Tier = 'low' | 'okay' | 'good' | 'great' | 'fire';

function getTier(amount: number): Tier {
  if (amount >= 3000) return 'fire';
  if (amount >= 2000) return 'great';
  if (amount >= 1000) return 'good';
  if (amount >= 500) return 'okay';
  return 'low';
}

function getTierConfig(tier: Tier) {
  switch (tier) {
    case 'fire':
      return {
        reaction: 'Unstoppable!',
        subtitle: 'You crushed it yesterday',
        bgGradient: 'from-amber-500/20 via-orange-500/15 to-red-500/10',
        accentColor: 'text-amber-500',
        ringColor: 'ring-amber-500/30',
        particleColors: ['#f59e0b', '#f97316', '#ef4444', '#fbbf24', '#fb923c'],
        particleCount: 60,
        pulseRings: 3,
      };
    case 'great':
      return {
        reaction: 'On Fire!',
        subtitle: 'Strong day yesterday',
        bgGradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/5',
        accentColor: 'text-emerald-500',
        ringColor: 'ring-emerald-500/30',
        particleColors: ['#10b981', '#14b8a6', '#06b6d4', '#34d399', '#2dd4bf'],
        particleCount: 40,
        pulseRings: 2,
      };
    case 'good':
      return {
        reaction: 'Nice Work!',
        subtitle: 'Solid earnings yesterday',
        bgGradient: 'from-blue-500/15 via-indigo-500/10 to-violet-500/5',
        accentColor: 'text-blue-500',
        ringColor: 'ring-blue-500/30',
        particleColors: ['#3b82f6', '#6366f1', '#8b5cf6', '#60a5fa', '#818cf8'],
        particleCount: 25,
        pulseRings: 1,
      };
    case 'okay':
      return {
        reaction: 'Keep Going!',
        subtitle: 'Every bit counts',
        bgGradient: 'from-slate-500/10 via-slate-400/5 to-transparent',
        accentColor: 'text-slate-500',
        ringColor: 'ring-slate-500/20',
        particleColors: ['#64748b', '#94a3b8', '#475569'],
        particleCount: 12,
        pulseRings: 0,
      };
    case 'low':
      return {
        reaction: 'New Day Ahead',
        subtitle: 'Today is your chance to shine',
        bgGradient: 'from-slate-500/5 to-transparent',
        accentColor: 'text-muted-foreground',
        ringColor: 'ring-border',
        particleColors: ['#94a3b8', '#cbd5e1'],
        particleCount: 6,
        pulseRings: 0,
      };
  }
}

// ─── Should-show logic ───────────────────────────────────────
const REVEAL_KEY = 'earnings_reveal_last_shown';

function shouldShowReveal(): boolean {
  try {
    const last = localStorage.getItem(REVEAL_KEY);
    if (!last) return true;
    const today = new Date().toDateString();
    return last !== today;
  } catch {
    return true;
  }
}

function markRevealShown() {
  try {
    localStorage.setItem(REVEAL_KEY, new Date().toDateString());
  } catch {
    // ignore
  }
}

// ─── Component ───────────────────────────────────────────────
export function EarningsReveal({
  totalEarnings,
  daysActive,
  userName,
  previousDayEarnings,
  isDataReady,
}: EarningsRevealProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'entering' | 'counting' | 'reacting' | 'exiting'>('entering');
  const [displayValue, setDisplayValue] = useState(0);
  const [showReaction, setShowReaction] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const countIntervalRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hasTriggered = useRef(false);

  const amount = previousDayEarnings;
  const tier = getTier(amount);
  const config = getTierConfig(tier);

  // Check if we should show the reveal
  useEffect(() => {
    if (!isDataReady || hasTriggered.current) return;
    if (!shouldShowReveal()) return;
    // Only show if there's actual data
    if (totalEarnings <= 0 && daysActive <= 0) return;

    hasTriggered.current = true;
    markRevealShown();
    setVisible(true);

    // Start entering phase
    const enterTimer = setTimeout(() => {
      setPhase('counting');
    }, 600);

    return () => clearTimeout(enterTimer);
  }, [isDataReady, totalEarnings, daysActive]);

  // Count-up animation
  useEffect(() => {
    if (phase !== 'counting') return;

    const target = amount;
    const duration = 1800; // ms
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    let step = 0;

    // Eased count-up (ease-out cubic)
    countIntervalRef.current = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(target * eased);
      setDisplayValue(current);

      if (progress >= 1) {
        if (countIntervalRef.current) clearInterval(countIntervalRef.current);
        setDisplayValue(target);
        // Move to reaction phase
        setTimeout(() => {
          setPhase('reacting');
          setShowReaction(true);
          spawnParticles();
        }, 200);
      }
    }, stepTime);

    return () => {
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    };
  }, [phase, amount]);

  // Particle system
  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const count = config.particleCount;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      const isSpark = Math.random() > 0.6;

      newParticles.push({
        id: i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 40,
        vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
        vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4) - 2,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: isSpark ? 2 + Math.random() * 3 : 6 + Math.random() * 8,
        color: config.particleColors[Math.floor(Math.random() * config.particleColors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        type: isSpark ? 'spark' : 'confetti',
      });
    }

    setParticles(newParticles);
  }, [config.particleColors, config.particleCount]);

  // Canvas-based particle rendering for performance
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
          vy: p.vy + 0.12, // gravity
          vx: p.vx * 0.99, // drag
          life: p.life - 1 / p.maxLife,
          rotation: p.rotation + p.rotationSpeed,
        }))
        .filter((p) => p.life > 0);

      for (const p of localParticles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.type === 'confetti') {
          ctx.fillStyle = p.color;
          // Rounded rectangle confetti
          const w = p.size;
          const h = p.size * 0.5;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 1.5);
          ctx.fill();
        } else {
          // Spark - small glowing circle
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
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

  const handleDismiss = useCallback(() => {
    setPhase('exiting');
    setTimeout(() => setVisible(false), 400);
  }, []);

  // Auto-dismiss after 5 seconds in reacting phase
  useEffect(() => {
    if (phase !== 'reacting') return;
    const timer = setTimeout(handleDismiss, 5000);
    return () => clearTimeout(timer);
  }, [phase, handleDismiss]);

  if (!visible) return null;

  const greeting = getGreeting();
  const firstName = userName ? userName.split(' ')[0] : null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-500 ${
        phase === 'entering'
          ? 'opacity-0 scale-95'
          : phase === 'exiting'
          ? 'opacity-0 scale-105'
          : 'opacity-100 scale-100'
      }`}
      onClick={handleDismiss}
      role="dialog"
      aria-label="Daily earnings reveal"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 max-w-sm w-full">
        {/* Greeting */}
        <p
          className={`text-sm font-medium text-muted-foreground transition-all duration-500 ${
            phase === 'entering' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>

        {/* Yesterday label */}
        <p
          className={`text-xs text-muted-foreground/70 uppercase tracking-widest transition-all duration-700 delay-100 ${
            phase === 'entering' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          Yesterday{"'"}s Earnings
        </p>

        {/* Amount display */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {showReaction &&
            Array.from({ length: config.pulseRings }).map((_, i) => (
              <div
                key={i}
                className={`absolute inset-0 rounded-full ring-2 ${config.ringColor}`}
                style={{
                  animation: `pulse-ring ${1.5 + i * 0.3}s ease-out ${i * 0.15}s infinite`,
                  transform: `scale(${1 + i * 0.15})`,
                }}
              />
            ))}

          <div
            className={`relative transition-all duration-700 ${
              phase === 'entering'
                ? 'opacity-0 scale-50'
                : phase === 'counting'
                ? 'opacity-100 scale-100'
                : 'opacity-100 scale-100'
            }`}
          >
            <span
              className={`text-5xl sm:text-6xl font-bold tracking-tight tabular-nums ${
                showReaction ? config.accentColor : 'text-foreground'
              } transition-colors duration-500`}
              style={{
                textShadow: showReaction ? `0 0 40px currentColor` : 'none',
              }}
            >
              {phase === 'entering' ? (
                <span className="inline-block w-10 h-10 rounded-full bg-muted animate-pulse" />
              ) : (
                `\u20A6${displayValue.toLocaleString()}`
              )}
            </span>
          </div>
        </div>

        {/* Reaction text */}
        <div
          className={`flex flex-col items-center gap-1 transition-all duration-500 ${
            showReaction ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className={`text-lg font-semibold ${config.accentColor}`}>
            {config.reaction}
          </span>
          <span className="text-sm text-muted-foreground">{config.subtitle}</span>
        </div>

        {/* Cycle total context */}
        <div
          className={`mt-4 flex items-center gap-6 text-center transition-all duration-700 delay-300 ${
            showReaction ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div>
            <p className="text-xs text-muted-foreground/70">Cycle Total</p>
            <p className="text-sm font-semibold text-foreground">
              {`\u20A6${totalEarnings.toLocaleString()}`}
            </p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground/70">Active Days</p>
            <p className="text-sm font-semibold text-foreground">{daysActive}</p>
          </div>
        </div>

        {/* Dismiss hint */}
        <p
          className={`mt-6 text-xs text-muted-foreground/50 transition-all duration-500 delay-500 ${
            phase === 'reacting' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Tap anywhere to continue
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Close earnings reveal"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Keyframe styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
