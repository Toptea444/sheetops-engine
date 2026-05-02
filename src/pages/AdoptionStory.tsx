import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cinematic adoption story.
 *
 * Scenes:
 *  1. Cold open — a single spark in the dark.
 *  2. The signal spreads — real worker IDs fly in from every direction
 *     and orbit a live count of how many people have a PIN set.
 *  3. Momentum — "It's getting widely adopted" with a swelling pulse.
 *  4. Gratitude — thank you + keep spreading.
 *  5. Signature — a beautifully animated "Built by Adelaja" finale.
 */

interface FlyingCard {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  rotation: number;
  gradient: string;
}

const GRADIENTS = [
  "from-cyan-400/90 to-blue-600/90",
  "from-fuchsia-400/90 to-purple-600/90",
  "from-rose-400/90 to-pink-600/90",
  "from-emerald-400/90 to-teal-600/90",
  "from-amber-400/90 to-orange-500/90",
  "from-indigo-400/90 to-violet-600/90",
];

const buildFlyingCards = (ids: string[]): FlyingCard[] => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pad = 280;
  const isMobile = width < 640;
  const radiusBase = Math.min(width, height) * (isMobile ? 0.32 : 0.26);

  return ids.map((id, index) => {
    const edge = index % 4;
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    const startX = edge === 0 ? -pad : edge === 1 ? width + pad : rx;
    const startY = edge === 2 ? -pad : edge === 3 ? height + pad : ry;

    const angle = (index / Math.max(ids.length, 1)) * Math.PI * 2;
    const ringOffset = (index % 3) * (isMobile ? 26 : 38);
    const radius = radiusBase + ringOffset;

    return {
      id,
      startX,
      startY,
      endX: width / 2 + Math.cos(angle) * radius,
      endY: height / 2 + Math.sin(angle) * (radius * 0.6),
      delay: 0.2 + index * 0.045,
      duration: 1.6 + Math.random() * 1.2,
      rotation: (Math.random() - 0.5) * 220,
      gradient: GRADIENTS[index % GRADIENTS.length],
    };
  });
};

const backdrop =
  "absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_25%_15%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(236,72,153,0.22),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.18),transparent_60%)]";

const Stars = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 3,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.1, 0.9, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  );
};

const SceneShell = ({ children }: { children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.9 }}
    className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
  >
    <div className={backdrop} />
    <Stars />
    {children}
  </motion.section>
);

/* ---------------- Scene 1: Cold open ---------------- */
const SceneOne = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.8] }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute h-40 w-40 rounded-full bg-cyan-400/30 blur-3xl"
      />
      <div className="relative z-10 mx-6 max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.05em" }}
          animate={{ opacity: 1, letterSpacing: "0.4em" }}
          transition={{ duration: 1.6, delay: 0.6 }}
          className="mb-4 text-xs uppercase text-cyan-300/80"
        >
          A story of momentum
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 1, 0.9], y: 0 }}
          transition={{ duration: 3.5, delay: 1 }}
          className="text-5xl font-black tracking-tight text-white md:text-7xl"
        >
          It started with one.
        </motion.h1>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 2: Flying IDs + live count ---------------- */
const SceneTwo = ({
  ids,
  count,
  onDone,
}: {
  ids: string[];
  count: number;
  onDone: () => void;
}) => {
  const [displayCount, setDisplayCount] = useState(0);
  const cards = useMemo(() => buildFlyingCards(ids), [ids]);

  useEffect(() => {
    const t = window.setTimeout(onDone, 8500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  // Count-up animation
  useEffect(() => {
    if (count === 0) return;
    const start = performance.now();
    const dur = 2200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayCount(Math.round(eased * count));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const startDelay = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 1800);
    return () => {
      window.clearTimeout(startDelay);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  return (
    <SceneShell>
      {/* Orbital rings */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
        <div className="absolute left-1/2 top-1/2 h-[55vmin] w-[55vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/15" />
        <div className="absolute left-1/2 top-1/2 h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/15" />
      </motion.div>

      {/* Flying ID cards */}
      {cards.map((c) => (
        <motion.div
          key={c.id}
          initial={{ x: c.startX, y: c.startY, scale: 0.3, opacity: 0, rotate: c.rotation }}
          animate={{ x: c.endX, y: c.endY, scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: c.delay, duration: c.duration, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed left-0 top-0 z-20 flex h-12 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br ${c.gradient} shadow-2xl backdrop-blur-sm sm:h-14 sm:w-28`}
          style={{ willChange: "transform, opacity" }}
        >
          <span className="text-[11px] font-bold tracking-wide text-white sm:text-xs">{c.id}</span>
        </motion.div>
      ))}

      {/* Center counter */}
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mb-3 text-[10px] uppercase tracking-[0.4em] text-cyan-300 sm:text-xs"
        >
          Live · Active members
        </motion.p>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.9, ease: "backOut" }}
          className="relative"
        >
          <span className="block bg-gradient-to-br from-white via-cyan-200 to-fuchsia-300 bg-clip-text text-7xl font-black leading-none text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.4)] sm:text-9xl">
            {displayCount}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.2, duration: 0.9 }}
          className="mt-4 max-w-md text-base text-slate-200 sm:text-xl"
        >
          people are already inside.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 3: Momentum ---------------- */
const SceneThree = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute h-[60vmin] w-[60vmin] rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 blur-3xl"
      />
      <div className="relative z-10 mx-6 max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-6 text-5xl font-black tracking-tight text-white md:text-7xl"
        >
          And it's <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">spreading fast.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-lg text-slate-300 md:text-2xl"
        >
          Every week, more teammates join. More workflows move faster.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 4: Gratitude ---------------- */
const SceneFour = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <div className="relative z-10 mx-6 max-w-3xl text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: "backOut" }}
          className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_60px_rgba(16,185,129,0.5)]"
        >
          <span className="text-4xl">💚</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mb-5 text-4xl font-black text-white md:text-6xl"
        >
          Thank you.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-lg text-slate-300 md:text-2xl"
        >
          Keep spreading the app. Show one more teammate. Invite one more friend.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 5: Built by Adelaja ---------------- */
const SceneFive = () => {
  const letters = "Adelaja".split("");
  return (
    <SceneShell>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute h-[80vmin] w-[80vmin] rounded-full border border-white/5"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute h-[60vmin] w-[60vmin] rounded-full border border-white/5"
      />
      <div className="relative z-10 mx-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.5em" }}
          transition={{ duration: 1.4 }}
          className="mb-6 text-xs uppercase text-cyan-300/80 sm:text-sm"
        >
          Built with care by
        </motion.p>
        <h1 className="flex items-center justify-center gap-1 text-6xl font-black tracking-tight md:text-8xl">
          {letters.map((l, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -90, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              transition={{
                delay: 0.6 + i * 0.12,
                duration: 0.8,
                ease: "backOut",
              }}
              className="inline-block bg-gradient-to-br from-white via-cyan-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]"
            >
              {l}
            </motion.span>
          ))}
        </h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.8, duration: 1.2, ease: "easeOut" }}
          className="mx-auto mt-6 h-px w-48 origin-left bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
          className="mt-6 text-sm uppercase tracking-[0.4em] text-slate-400"
        >
          To be continued ✦
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Loader ---------------- */
const Loader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent"
    />
  </div>
);

export default function AdoptionStory() {
  const [scene, setScene] = useState(0); // 0 = loading
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, count: c } = await supabase
        .from("worker_pins")
        .select("worker_id", { count: "exact" });
      if (cancelled) return;
      const list = (data ?? []).map((r: { worker_id: string }) => r.worker_id);
      setIds(list);
      setCount(c ?? list.length);
      setScene(1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const next = () => setScene((s) => s + 1);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950">
      <AnimatePresence mode="wait">
        {scene === 0 && <Loader key="loader" />}
        {scene === 1 && <SceneOne key="s1" onDone={next} />}
        {scene === 2 && <SceneTwo key="s2" ids={ids} count={count} onDone={next} />}
        {scene === 3 && <SceneThree key="s3" onDone={next} />}
        {scene === 4 && <SceneFour key="s4" onDone={next} />}
        {scene === 5 && <SceneFive key="s5" />}
      </AnimatePresence>
    </div>
  );
}
