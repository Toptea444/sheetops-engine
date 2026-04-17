import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const USER_IDS = Array.from({ length: 66 }, (_, index) => {
  const serial = String(index + 1).padStart(3, "0");
  return `usr_${serial}`;
});

interface FlyingCard {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  rotation: number;
}

const createFlyingCards = (): FlyingCard[] => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const edgePadding = 240;

  return USER_IDS.map((id, index) => {
    const edge = index % 4;
    const randomX = Math.random() * width;
    const randomY = Math.random() * height;

    const startX =
      edge === 0
        ? -edgePadding
        : edge === 1
          ? width + edgePadding
          : randomX;

    const startY =
      edge === 2
        ? -edgePadding
        : edge === 3
          ? height + edgePadding
          : randomY;

    const wave = Math.sin((index / USER_IDS.length) * Math.PI * 4);
    const radius = Math.min(width, height) * 0.22;

    return {
      id,
      startX,
      startY,
      endX: width / 2 + Math.cos(index * 0.9) * radius + wave * 30,
      endY: height / 2 + Math.sin(index * 0.9) * (radius * 0.55),
      delay: index * 0.05,
      duration: 1.8 + Math.random() * 1.4,
      rotation: (Math.random() - 0.5) * 180,
    };
  });
};

const CINEMATIC_TEXT = {
  scene1Title: "A quiet beginning.",
  scene1Subtitle: "Then the signal spread.",
  scene2Eyebrow: "Live adoption pulse",
  scene2Title: "66 active people are already in.",
  scene3Title: "It is getting widely adopted.",
  scene3Body:
    "Every week, more teammates join. More workflows move faster. The story is accelerating.",
  scene4Title: "Thank you for building this with us.",
  scene4Body:
    "Keep spreading the app. Show one more person. Invite one more team.",
  scene5Title: "From 66 to the next milestone.",
  scene5Body: "This movement grows because of you.",
};

const backdropGlow =
  "absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(244,114,182,0.18),transparent_50%)]";

const SceneOne = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 4200);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1 }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
    >
      <div className={backdropGlow} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="relative z-10 mx-4 max-w-4xl text-center"
      >
        <motion.h1
          className="mb-6 text-5xl font-black tracking-tight text-white md:text-7xl"
          animate={{ opacity: [0, 1, 1, 0.2] }}
          transition={{ duration: 4 }}
        >
          {CINEMATIC_TEXT.scene1Title}
        </motion.h1>
        <motion.p
          className="text-lg text-slate-300 md:text-2xl"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3.7, delay: 0.4 }}
        >
          {CINEMATIC_TEXT.scene1Subtitle}
        </motion.p>
      </motion.div>
    </motion.section>
  );
};

const FlyingUserCard = ({ card, index }: { card: FlyingCard; index: number }) => {
  const gradients = [
    "from-cyan-500/90 to-blue-600/90",
    "from-purple-500/90 to-indigo-600/90",
    "from-pink-500/90 to-rose-600/90",
    "from-teal-500/90 to-emerald-600/90",
  ];

  return (
    <motion.div
      initial={{
        x: card.startX,
        y: card.startY,
        scale: 0.35,
        opacity: 0,
        rotate: card.rotation,
      }}
      animate={{
        x: card.endX,
        y: card.endY,
        scale: 1,
        opacity: 1,
        rotate: 0,
      }}
      transition={{
        delay: card.delay,
        duration: card.duration,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`fixed z-20 flex h-16 w-28 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br ${gradients[index % gradients.length]} shadow-2xl backdrop-blur-sm`}
      style={{ willChange: "transform, opacity" }}
    >
      <span className="text-sm font-semibold tracking-wide text-white">{card.id}</span>
    </motion.div>
  );
};

const SceneTwo = ({ onComplete }: { onComplete: () => void }) => {
  const [started, setStarted] = useState(false);
  const cards = useMemo(() => (started ? createFlyingCards() : []), [started]);

  useEffect(() => {
    setStarted(true);
    const timer = window.setTimeout(onComplete, 7200);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 overflow-hidden bg-slate-950"
    >
      <div className={backdropGlow} />

      <motion.div
        className="absolute inset-0"
        animate={{ rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      >
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
        <div className="absolute left-1/2 top-1/2 h-[46vh] w-[46vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/20" />
      </motion.div>

      {cards.map((card, index) => (
        <FlyingUserCard key={card.id} card={card} index={index} />
      ))}

      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-4 text-center pointer-events-none">
        <motion.p
          className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-300"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 0.9 }}
        >
          {CINEMATIC_TEXT.scene2Eyebrow}
        </motion.p>
        <motion.h2
          className="max-w-4xl text-4xl font-black text-white md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.7, duration: 1.1 }}
        >
          {CINEMATIC_TEXT.scene2Title}
        </motion.h2>
      </div>
    </motion.section>
  );
};

const SceneThree = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 4300);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
    >
      <div className={backdropGlow} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        className="relative z-10 mx-4 max-w-4xl text-center"
      >
        <h2 className="mb-6 text-5xl font-black text-white md:text-7xl">{CINEMATIC_TEXT.scene3Title}</h2>
        <p className="text-lg text-slate-300 md:text-2xl">{CINEMATIC_TEXT.scene3Body}</p>
      </motion.div>
    </motion.section>
  );
};

const SceneFour = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 4800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
    >
      <div className={backdropGlow} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1 }}
        className="relative z-10 mx-4 max-w-4xl text-center"
      >
        <h2 className="mb-6 text-4xl font-black text-white md:text-6xl">{CINEMATIC_TEXT.scene4Title}</h2>
        <p className="text-lg text-slate-300 md:text-2xl">{CINEMATIC_TEXT.scene4Body}</p>
      </motion.div>
    </motion.section>
  );
};

const SceneFive = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1 }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
    >
      <div className={backdropGlow} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 1.1 }}
        className="relative z-10 mx-4 max-w-4xl rounded-3xl border border-cyan-200/20 bg-slate-900/40 px-8 py-12 text-center backdrop-blur-xl"
      >
        <h2 className="mb-4 text-4xl font-black text-white md:text-6xl">{CINEMATIC_TEXT.scene5Title}</h2>
        <p className="mb-8 text-lg text-slate-300 md:text-2xl">{CINEMATIC_TEXT.scene5Body}</p>
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.6, repeat: Infinity }}
          className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200"
        >
          Keep spreading the app
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

export default function AdoptionStory() {
  const [scene, setScene] = useState(1);

  const handleSceneComplete = () => {
    setScene((previous) => previous + 1);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950">
      {scene === 1 && <SceneOne onComplete={handleSceneComplete} />}
      {scene === 2 && <SceneTwo onComplete={handleSceneComplete} />}
      {scene === 3 && <SceneThree onComplete={handleSceneComplete} />}
      {scene === 4 && <SceneFour onComplete={handleSceneComplete} />}
      {scene === 5 && <SceneFive />}
    </div>
  );
}
