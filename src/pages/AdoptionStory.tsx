import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HandHeart, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cinematic adoption story.
 *
 * Seven scenes, narrated in plain conversational English, themed with the
 * app's navy/blue palette. No gradient text, no emoji, no laggy swarm —
 * just calm scenery, slow marquees of real worker IDs, and a clear count.
 */

/* ---------------- Shared scenery ---------------- */

const backdrop =
  "absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,hsl(215_70%_35%/0.35),transparent_55%),radial-gradient(circle_at_70%_80%,hsl(210_80%_45%/0.25),transparent_60%)]";

const Stars = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 4,
        dur: 2.5 + Math.random() * 2.5,
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
          animate={{ opacity: [0.1, 0.85, 0.1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
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

const IdCard = ({ id, className = "" }: { id: string; className?: string }) => (
  <div
    className={`flex h-12 w-28 items-center justify-center rounded-xl border border-blue-400/25 bg-slate-900/95 shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:h-14 sm:w-32 ${className}`}
  >
    <span className="text-xs font-bold tracking-wide text-white sm:text-sm">{id}</span>
  </div>
);

/* A single CSS-driven marquee column. One transform per column = smooth. */
const MarqueeColumn = ({
  ids,
  side,
  durationSec,
  reverse = false,
}: {
  ids: string[];
  side: "left" | "right";
  durationSec: number;
  reverse?: boolean;
}) => {
  const list = ids.length ? [...ids, ...ids] : [];
  return (
    <div
      className={`pointer-events-none absolute top-0 z-10 hidden h-full w-32 overflow-hidden sm:block ${
        side === "left" ? "left-4" : "right-4"
      }`}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex flex-col gap-3 will-change-transform"
        animate={{ y: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: durationSec, repeat: Infinity, ease: "linear" }}
      >
        {list.map((id, i) => (
          <IdCard key={`${side}-${i}-${id}`} id={id} />
        ))}
      </motion.div>
    </div>
  );
};

/* ---------------- Scene 1: Cold open ---------------- */
const SceneOne = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6, 1.1], opacity: [0, 1, 0.6] }}
        transition={{ duration: 2.4, ease: "easeOut" }}
        className="absolute h-40 w-40 rounded-full bg-blue-400/30 blur-3xl"
      />
      <div className="relative z-10 mx-6 max-w-2xl text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.45em" }}
          transition={{ duration: 1.6, delay: 0.4 }}
          className="mb-6 text-[10px] uppercase text-blue-300 sm:text-xs"
        >
          A short story
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1 }}
          className="mb-5 text-4xl font-bold leading-tight text-white sm:text-6xl"
        >
          Not long ago, this app didn't exist.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.6 }}
          className="text-base text-slate-300 sm:text-xl"
        >
          Then one person opened it for the very first time.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 2: The first spark ---------------- */
const SceneTwo = ({ firstId, onDone }: { firstId?: string; onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <div className="relative z-10 mx-6 flex max-w-xl flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "backOut" }}
          className="mb-8"
        >
          <IdCard id={firstId ?? "NGDS-0001"} className="scale-125" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mb-4 text-3xl font-bold text-white sm:text-5xl"
        >
          That was the very first one.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.4 }}
          className="text-base text-slate-300 sm:text-xl"
        >
          One worker. One screen. One small idea.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 3: Word spreads ---------------- */
const SceneThree = ({ ids, onDone }: { ids: string[]; onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 7500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  // Hero entrance: 6 cards drift in then dissolve away as the marquee takes over
  const heroIds = useMemo(() => ids.slice(0, 6), [ids]);

  return (
    <SceneShell>
      <MarqueeColumn ids={ids} side="left" durationSec={45} />
      <MarqueeColumn ids={ids} side="right" durationSec={55} reverse />

      {/* Hero entrance cards */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {heroIds.map((id, i) => {
          const positions = [
            { top: "20%", left: "20%" },
            { top: "30%", right: "22%" },
            { bottom: "28%", left: "26%" },
            { bottom: "22%", right: "20%" },
            { top: "45%", left: "10%" },
            { top: "50%", right: "12%" },
          ];
          const p = positions[i] as React.CSSProperties;
          return (
            <motion.div
              key={id + i}
              initial={{ opacity: 0, scale: 0.4, y: 30 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.95], y: [30, 0, 0, -10] }}
              transition={{ duration: 4.5, delay: 0.4 + i * 0.45, times: [0, 0.25, 0.75, 1] }}
              className="absolute"
              style={p}
            >
              <IdCard id={id} />
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-30 mx-6 max-w-2xl space-y-5 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-3xl font-bold text-white sm:text-5xl"
        >
          Then they told a friend.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          And that friend told another.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3.2 }}
          className="text-sm text-blue-300 sm:text-base"
        >
          One by one, real worker IDs started showing up.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 4: The number ---------------- */
const SceneFour = ({
  ids,
  count,
  onDone,
}: {
  ids: string[];
  count: number;
  onDone: () => void;
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(onDone, 6500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    if (!count) return;
    const start = performance.now();
    const dur = 2400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * count));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const d = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 700);
    return () => {
      window.clearTimeout(d);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  return (
    <SceneShell>
      <MarqueeColumn ids={ids} side="left" durationSec={50} />
      <MarqueeColumn ids={ids} side="right" durationSec={60} reverse />

      <div className="pointer-events-none relative z-30 mx-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-slate-900/70 px-4 py-1.5"
        >
          <Users className="h-3.5 w-3.5 text-blue-300" />
          <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-blue-200 sm:text-xs">
            Right now
          </span>
        </motion.div>

        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: "backOut" }}
          className="block text-7xl font-black leading-none text-white drop-shadow-[0_0_40px_rgba(96,165,250,0.45)] sm:text-9xl"
        >
          {display}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.4 }}
          className="mt-6 max-w-md text-lg font-medium text-white sm:text-2xl"
        >
          people are actively using this app.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 3.6 }}
          className="mt-3 max-w-sm text-sm text-slate-300 sm:text-base"
        >
          And the number keeps growing every single week.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 5: Momentum ---------------- */
const SceneFive = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      {/* Concentric ripple rings */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.2, opacity: 0.6 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
          className="absolute h-[40vmin] w-[40vmin] rounded-full border border-blue-400/30"
        />
      ))}

      <div className="relative z-10 mx-6 max-w-2xl space-y-5 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-3xl font-bold text-white sm:text-5xl"
        >
          What started as one screen
          <br />
          has turned into a daily habit.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          Teammates check it before shift.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.6 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          Friends share it after work.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3.6 }}
          className="text-sm text-blue-300 sm:text-base"
        >
          It's quietly becoming part of how we all work.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 6: Thank you ---------------- */
const SceneSix = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute h-[55vmin] w-[55vmin] rounded-full bg-blue-500/25 blur-3xl"
      />
      <div className="relative z-10 mx-6 max-w-2xl text-center">
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: "backOut" }}
          className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/40 bg-slate-900/80 shadow-[0_0_60px_rgba(96,165,250,0.45)]"
        >
          <HandHeart className="h-9 w-9 text-blue-300" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-5 text-4xl font-bold text-white sm:text-6xl"
        >
          Thank you.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mb-3 text-base text-slate-200 sm:text-lg"
        >
          Seriously — every single one of you matters.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.6 }}
          className="mb-3 text-base text-slate-200 sm:text-lg"
        >
          Keep showing it to one more teammate.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3.8 }}
          className="text-sm text-blue-300 sm:text-base"
        >
          That's how small tools become big ones.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ---------------- Scene 7: Signature ---------------- */
const SceneSeven = () => {
  const letters = "Adelaja".split("");
  return (
    <SceneShell>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        className="absolute h-[80vmin] w-[80vmin] rounded-full border border-blue-400/10"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
        className="absolute h-[60vmin] w-[60vmin] rounded-full border border-blue-400/15"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute h-[40vmin] w-[40vmin] rounded-full border border-blue-400/20"
      />

      <div className="relative z-10 mx-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="mb-6 inline-flex items-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-300" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-blue-200 sm:text-sm">
            Built with care by
          </p>
          <Sparkles className="h-3.5 w-3.5 text-blue-300" />
        </motion.div>

        <h1 className="flex items-center justify-center gap-1 text-6xl font-black tracking-tight text-white sm:text-8xl">
          {letters.map((l, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -90, scale: 0.4 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.14, duration: 0.85, ease: "backOut" }}
              className="inline-block drop-shadow-[0_0_25px_rgba(96,165,250,0.4)]"
            >
              {l}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 2, duration: 1.4, ease: "easeOut" }}
          className="mx-auto mt-7 h-px w-56 origin-left bg-gradient-to-r from-transparent via-blue-300 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 1 }}
          className="mt-6 text-sm text-slate-300 sm:text-base"
        >
          More chapters coming soon.
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
      className="h-10 w-10 rounded-full border-2 border-blue-400 border-t-transparent"
    />
  </div>
);

export default function AdoptionStory() {
  const [scene, setScene] = useState(0);
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, count: c } = await supabase
        .from("worker_pins")
        .select("worker_id", { count: "exact" })
        .order("created_at", { ascending: true });
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
        {scene === 2 && <SceneTwo key="s2" firstId={ids[0]} onDone={next} />}
        {scene === 3 && <SceneThree key="s3" ids={ids} onDone={next} />}
        {scene === 4 && <SceneFour key="s4" ids={ids} count={count} onDone={next} />}
        {scene === 5 && <SceneFive key="s5" onDone={next} />}
        {scene === 6 && <SceneSix key="s6" onDone={next} />}
        {scene === 7 && <SceneSeven key="s7" />}
      </AnimatePresence>
    </div>
  );
}
