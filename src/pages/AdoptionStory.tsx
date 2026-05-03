import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cinematic adoption story — v3
 *
 * Heavy scenery, dramatic typography, layered backgrounds. Same navy palette
 * as the rest of the app. No AI sparkle icons, no gradient text.
 */

const FIRST_ID = "NGDS1009";

/* ============================================================
   SHARED SCENERY LAYERS
   ============================================================ */

const NavyBackdrop = () => (
  <>
    {/* deep base */}
    <div className="absolute inset-0 bg-slate-950" />
    {/* slow drifting nebula */}
    <motion.div
      className="absolute -inset-[20%] opacity-70"
      style={{
        background:
          "radial-gradient(45% 35% at 25% 30%, hsl(215 80% 45% / 0.35), transparent 60%)," +
          "radial-gradient(40% 30% at 75% 70%, hsl(210 90% 55% / 0.28), transparent 65%)," +
          "radial-gradient(30% 25% at 60% 20%, hsl(220 70% 40% / 0.22), transparent 70%)",
      }}
      animate={{ x: [0, -40, 30, 0], y: [0, 20, -25, 0] }}
      transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* faint horizon glow at bottom */}
    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-950/60 to-transparent" />
    {/* vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(2_6_23/0.85)_100%)]" />
  </>
);

const Stars = ({ count = 90 }: { count?: number }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.4,
        delay: Math.random() * 5,
        dur: 2 + Math.random() * 3,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.05, 0.9, 0.05] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  );
};

const ShootingStars = () => {
  const shots = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        top: 10 + Math.random() * 50,
        delay: i * 3 + Math.random() * 2,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shots.map((s) => (
        <motion.div
          key={s.id}
          className="absolute h-px w-40 bg-gradient-to-r from-transparent via-blue-200 to-transparent"
          style={{ top: `${s.top}%`, left: "-20%" }}
          animate={{ x: ["0vw", "140vw"], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, delay: s.delay, repeat: Infinity, repeatDelay: 9, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const FloatingParticles = ({ count = 25 }: { count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 50 + Math.random() * 60,
        size: 2 + Math.random() * 4,
        dur: 8 + Math.random() * 10,
        delay: Math.random() * 6,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-blue-300/40 blur-[1px]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, -300], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const AuroraSweep = () => (
  <motion.div
    className="absolute inset-x-0 top-1/4 h-64 opacity-40 blur-3xl pointer-events-none"
    style={{
      background:
        "linear-gradient(90deg, transparent, hsl(210 90% 55% / 0.5), hsl(220 80% 65% / 0.3), transparent)",
    }}
    animate={{ x: ["-30%", "30%", "-30%"], skewY: [-3, 3, -3] }}
    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
  />
);

const GridFloor = () => (
  <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none [perspective:600px]">
    <motion.div
      className="absolute inset-x-[-50%] top-0 h-[200%] [transform:rotateX(60deg)] origin-top"
      style={{
        backgroundImage:
          "linear-gradient(hsl(210 90% 60% / 0.25) 1px, transparent 1px)," +
          "linear-gradient(90deg, hsl(210 90% 60% / 0.25) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
      animate={{ backgroundPositionY: [0, 60] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
  </div>
);

const SceneShell = ({ children }: { children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.9 }}
    className="fixed inset-0 flex items-center justify-center overflow-hidden"
  >
    <NavyBackdrop />
    <Stars />
    <ShootingStars />
    {children}
  </motion.section>
);

const IdCard = ({ id, className = "" }: { id: string; className?: string }) => (
  <div
    className={`flex h-12 w-28 items-center justify-center rounded-xl border border-blue-400/30 bg-slate-900/95 shadow-[0_8px_30px_rgb(0,0,0,0.6)] sm:h-14 sm:w-32 ${className}`}
  >
    <span className="text-xs font-bold tracking-wide text-white sm:text-sm">{id}</span>
  </div>
);

const MarqueeColumn = ({
  ids,
  side,
  durationSec,
  reverse = false,
  offset = 0,
}: {
  ids: string[];
  side: "left" | "right" | "center-left" | "center-right";
  durationSec: number;
  reverse?: boolean;
  offset?: number;
}) => {
  const list = ids.length ? [...ids, ...ids] : [];
  const sideClass =
    side === "left"
      ? "left-2 sm:left-4"
      : side === "right"
        ? "right-2 sm:right-4"
        : side === "center-left"
          ? "left-[28%] hidden md:block"
          : "right-[28%] hidden md:block";
  return (
    <div
      className={`pointer-events-none absolute top-0 z-10 h-full w-24 overflow-hidden sm:w-32 ${sideClass}`}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex flex-col gap-3 will-change-transform"
        style={{ marginTop: offset }}
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

/* ============================================================
   SCENE 1 — Cold open, kinetic typography
   ============================================================ */
const SceneOne = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <AuroraSweep />
      <FloatingParticles count={18} />

      {/* expanding shockwave */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-24 w-24 rounded-full border-2 border-blue-400/40"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 8, opacity: 0 }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }}
        />
      ))}

      <div className="relative z-10 mx-6 max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.05em" }}
          animate={{ opacity: 1, letterSpacing: "0.55em" }}
          transition={{ duration: 1.8, delay: 0.3 }}
          className="mb-8 text-[10px] uppercase text-blue-300 sm:text-xs"
        >
          A short story · Chapter one
        </motion.p>

        <h1 className="mb-6 text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
          {"Every big thing".split(" ").map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 1 + i * 0.2 }}
              className="mr-3 inline-block"
            >
              {w}
            </motion.span>
          ))}
          <br />
          {"started small.".split(" ").map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 1.8 + i * 0.2 }}
              className="mr-3 inline-block text-blue-200"
            >
              {w}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.6 }}
          className="text-base text-slate-300 sm:text-xl"
        >
          A spreadsheet. A team. A simple question:
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 4.6 }}
          className="mt-2 text-lg italic text-white sm:text-2xl"
        >
          "How much did I really earn this week?"
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 2 — The first spark (NGDS-1009)
   ============================================================ */
const SceneTwo = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <GridFloor />
      <FloatingParticles count={20} />

      {/* spotlight cone */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 0.6, scaleY: 1 }}
        transition={{ duration: 1.4, delay: 0.4 }}
        className="absolute top-0 h-1/2 w-[60vw] origin-top bg-gradient-to-b from-blue-300/30 via-blue-400/10 to-transparent blur-2xl"
        style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }}
      />

      <div className="relative z-10 mx-6 flex max-w-2xl flex-col items-center text-center">
        {/* ID card with pulsing halo */}
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 -z-10 rounded-2xl bg-blue-400/40 blur-3xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div
            initial={{ scale: 0.2, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 1.4, ease: "backOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <IdCard id={FIRST_ID} className="scale-150" />
          </motion.div>
          {/* orbiting dot */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,0.9)]" />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mb-2 text-[10px] uppercase tracking-[0.4em] text-blue-300 sm:text-xs"
        >
          Worker zero
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2 }}
          className="mb-5 text-3xl font-bold text-white sm:text-5xl"
        >
          It all began with one person.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3.2 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          One worker. One screen. One quiet click.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 4.4 }}
          className="mt-3 text-sm text-blue-300 sm:text-base"
        >
          Nobody knew what would happen next.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 3 — Word spreads (LOTS of IDs)
   ============================================================ */
const SceneThree = ({ ids, onDone }: { ids: string[]; onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 8500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  // Many hero cards arriving from various directions
  const heroIds = useMemo(() => ids.slice(0, 14), [ids]);
  const positions: React.CSSProperties[] = [
    { top: "12%", left: "8%" },
    { top: "18%", right: "10%" },
    { top: "26%", left: "22%" },
    { top: "32%", right: "24%" },
    { top: "44%", left: "6%" },
    { top: "48%", right: "8%" },
    { bottom: "30%", left: "18%" },
    { bottom: "26%", right: "20%" },
    { bottom: "14%", left: "10%" },
    { bottom: "10%", right: "12%" },
    { top: "8%", left: "42%" },
    { bottom: "6%", left: "44%" },
    { top: "55%", left: "32%" },
    { top: "60%", right: "30%" },
  ];
  const fromVectors = [
    { x: -200, y: -150 },
    { x: 200, y: -150 },
    { x: -250, y: 0 },
    { x: 250, y: 0 },
    { x: -150, y: 200 },
    { x: 150, y: 200 },
    { x: 0, y: -250 },
    { x: 0, y: 250 },
  ];

  return (
    <SceneShell>
      <AuroraSweep />
      <MarqueeColumn ids={ids} side="left" durationSec={42} />
      <MarqueeColumn ids={ids} side="center-left" durationSec={55} reverse offset={-40} />
      <MarqueeColumn ids={ids} side="center-right" durationSec={50} offset={-80} />
      <MarqueeColumn ids={ids} side="right" durationSec={48} reverse />

      {/* Cards rushing in from off-screen */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {heroIds.map((id, i) => {
          const v = fromVectors[i % fromVectors.length];
          return (
            <motion.div
              key={id + i}
              initial={{ opacity: 0, scale: 0.2, x: v.x, y: v.y, rotate: -15 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.2, 1, 1, 0.9],
                x: [v.x, 0, 0, 0],
                y: [v.y, 0, 0, -20],
                rotate: [-15, 0, 0, 0],
              }}
              transition={{
                duration: 5.5,
                delay: 0.3 + i * 0.25,
                times: [0, 0.2, 0.78, 1],
                ease: "easeOut",
              }}
              className="absolute"
              style={positions[i]}
            >
              <IdCard id={id} />
            </motion.div>
          );
        })}
      </div>

      {/* Center dark plate so headline reads cleanly */}
      <div className="relative z-30 mx-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="rounded-3xl border border-blue-400/20 bg-slate-950/80 px-6 py-8 backdrop-blur-md sm:px-10 sm:py-10"
        >
          <h2 className="text-center text-3xl font-bold leading-tight text-white sm:text-5xl">
            Then someone whispered it
            <br />
            <span className="text-blue-200">to a friend.</span>
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="mt-5 text-center text-base text-slate-300 sm:text-lg"
          >
            That friend told another. And another.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 3.2 }}
            className="mt-3 text-center text-sm text-blue-300 sm:text-base"
          >
            Soon, real worker IDs were lighting up the screen — one by one.
          </motion.p>
        </motion.div>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 4 — The number
   ============================================================ */
const SceneFour = ({
  ids,
  count,
  onDone,
}: {
  ids: string[];
  count: number;
  onDone: () => void;
}) => {
  const display = useMotionValue(0);
  const rounded = useTransform(display, (v) => Math.round(v).toString());

  useEffect(() => {
    const t = window.setTimeout(onDone, 7500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    if (!count) return;
    const controls = animate(display, count, {
      duration: 2.6,
      delay: 0.8,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [count, display]);

  return (
    <SceneShell>
      <AuroraSweep />
      <MarqueeColumn ids={ids} side="left" durationSec={50} />
      <MarqueeColumn ids={ids} side="center-left" durationSec={62} reverse offset={-30} />
      <MarqueeColumn ids={ids} side="center-right" durationSec={58} offset={-60} />
      <MarqueeColumn ids={ids} side="right" durationSec={55} reverse />

      {/* radial pulse behind the number */}
      <motion.div
        className="absolute h-[60vmin] w-[60vmin] rounded-full bg-blue-500/20 blur-3xl"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="pointer-events-none relative z-30 mx-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-slate-950/80 px-5 py-2 backdrop-blur"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
          <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-blue-200 sm:text-xs">
            Live count · right now
          </span>
        </motion.div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.4, ease: "backOut" }}
          className="relative"
        >
          <motion.span className="block text-7xl font-black leading-none text-white drop-shadow-[0_0_50px_rgba(96,165,250,0.6)] sm:text-9xl">
            {rounded}
          </motion.span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 3 }}
          className="mt-7 max-w-md text-xl font-semibold text-white sm:text-3xl"
        >
          workers are using this app today.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 4.2 }}
          className="mt-3 max-w-sm text-sm text-blue-300 sm:text-base"
        >
          And the count climbs every single week.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 5 — Momentum
   ============================================================ */
const SceneFive = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <GridFloor />
      <FloatingParticles count={30} />

      {/* multi-layer ripples */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.1, opacity: 0.7 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 5, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
          className="absolute h-[35vmin] w-[35vmin] rounded-full border border-blue-400/35"
        />
      ))}

      {/* floating word cloud */}
      {["before shift", "after work", "on break", "with friends", "every morning"].map((w, i) => (
        <motion.span
          key={w}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: [0, 0.5, 0.5, 0], y: [50, -100, -100, -200] }}
          transition={{ duration: 6, delay: 1 + i * 0.7, repeat: Infinity, repeatDelay: 4 }}
          className="absolute text-xs font-medium text-blue-300/70 sm:text-sm"
          style={{
            left: `${15 + i * 17}%`,
            top: "70%",
          }}
        >
          {w}
        </motion.span>
      ))}

      <div className="relative z-10 mx-6 max-w-2xl space-y-5 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-[10px] uppercase tracking-[0.5em] text-blue-300 sm:text-xs"
        >
          Chapter five
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-3xl font-bold leading-tight text-white sm:text-5xl"
        >
          What started as a quiet idea
          <br />
          <span className="text-blue-200">has become a daily ritual.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          Teammates open it before clocking in.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3 }}
          className="text-base text-slate-300 sm:text-lg"
        >
          Friends share it after the day ends.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 4 }}
          className="text-sm text-blue-300 sm:text-base"
        >
          Quietly, it's become part of how we all work.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 6 — Thank you
   ============================================================ */
const SceneSix = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 7000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <SceneShell>
      <FloatingParticles count={28} />
      <AuroraSweep />

      {/* breathing glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 4.5, repeat: Infinity }}
        className="absolute h-[60vmin] w-[60vmin] rounded-full bg-blue-500/30 blur-3xl"
      />

      {/* concentric thin rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-blue-300/20"
          style={{ width: `${30 + i * 18}vmin`, height: `${30 + i * 18}vmin` }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <div className="relative z-10 mx-6 max-w-2xl text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.5em" }}
          transition={{ duration: 1.4 }}
          className="mb-6 text-[10px] uppercase text-blue-300 sm:text-xs"
        >
          From the bottom of our heart
        </motion.p>

        <h2 className="mb-6 text-5xl font-bold text-white sm:text-7xl">
          {"Thank you.".split("").map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 50, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.6 + i * 0.07, ease: "backOut" }}
              className="inline-block"
            >
              {c === " " ? "\u00A0" : c}
            </motion.span>
          ))}
        </h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="mb-3 text-base text-slate-200 sm:text-lg"
        >
          Every single one of you matters.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3.2 }}
          className="mb-3 text-base text-slate-200 sm:text-lg"
        >
          Keep showing it to one more teammate.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 4.4 }}
          className="text-sm text-blue-300 sm:text-base"
        >
          That's how small tools become movements.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   SCENE 7 — Signature (no icons, dramatic reveal)
   ============================================================ */
const SceneSeven = () => {
  const letters = "Adelaja".split("");

  return (
    <SceneShell>
      <GridFloor />

      {/* Cinematic light sweep */}
      <motion.div
        className="absolute inset-y-0 w-[40%] -skew-x-12 bg-gradient-to-r from-transparent via-blue-200/15 to-transparent blur-2xl"
        initial={{ x: "-60vw" }}
        animate={{ x: "120vw" }}
        transition={{ duration: 2.4, delay: 0.3, ease: "easeOut" }}
      />

      {/* Slow orbiting rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute h-[85vmin] w-[85vmin] rounded-full border border-blue-400/10"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute h-[60vmin] w-[60vmin] rounded-full border border-blue-400/15"
      />

      {/* Curtain reveal */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 1.2, delay: 2.5, ease: [0.76, 0, 0.24, 1] }}
        style={{ transformOrigin: "top" }}
        className="absolute inset-x-0 top-0 z-40 h-1/2 bg-slate-950"
      />
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 1.2, delay: 2.5, ease: [0.76, 0, 0.24, 1] }}
        style={{ transformOrigin: "bottom" }}
        className="absolute inset-x-0 bottom-0 z-40 h-1/2 bg-slate-950"
      />

      <div className="relative z-30 mx-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.6 }}
          className="mb-8 text-[10px] uppercase tracking-[0.6em] text-blue-200 sm:text-sm"
        >
          Built by
        </motion.p>

        <h1 className="flex items-center justify-center text-6xl font-black tracking-tight text-white sm:text-9xl">
          {letters.map((l, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 120, rotateX: -90, scale: 0.3, filter: "blur(20px)" }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" }}
              transition={{
                delay: 4 + i * 0.18,
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block drop-shadow-[0_0_35px_rgba(96,165,250,0.55)]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {l}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 5.8, duration: 1.4, ease: "easeOut" }}
          className="mx-auto mt-8 h-px w-64 origin-center bg-gradient-to-r from-transparent via-blue-300 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 6.4, duration: 1 }}
          className="mt-7 text-sm text-slate-300 sm:text-base"
        >
          More chapters coming soon.
        </motion.p>
      </div>
    </SceneShell>
  );
};

/* ============================================================
   Loader
   ============================================================ */
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
        {scene === 2 && <SceneTwo key="s2" onDone={next} />}
        {scene === 3 && <SceneThree key="s3" ids={ids} onDone={next} />}
        {scene === 4 && <SceneFour key="s4" ids={ids} count={count} onDone={next} />}
        {scene === 5 && <SceneFive key="s5" onDone={next} />}
        {scene === 6 && <SceneSix key="s6" onDone={next} />}
        {scene === 7 && <SceneSeven key="s7" />}
      </AnimatePresence>
    </div>
  );
}
