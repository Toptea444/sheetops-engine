import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Real user IDs - replace with actual data from your backend
const REAL_USER_IDS = [
  "user_001", "user_002", "user_003", "user_004", "user_005",
  "user_006", "user_007", "user_008", "user_009", "user_010",
  "user_011", "user_012", "user_013", "user_014", "user_015",
  "user_016", "user_017", "user_018", "user_019", "user_020",
  "user_021", "user_022", "user_023", "user_024", "user_025",
  "user_026", "user_027", "user_028", "user_029", "user_030",
  "user_031", "user_032", "user_033", "user_034", "user_035",
  "user_036", "user_037", "user_038", "user_039", "user_040",
  "user_041", "user_042", "user_043", "user_044", "user_045",
  "user_046", "user_047", "user_048", "user_049", "user_050",
  "user_051", "user_052", "user_053", "user_054", "user_055",
  "user_056", "user_057", "user_058", "user_059", "user_060",
  "user_061", "user_062", "user_063", "user_064", "user_065",
  "user_066",
];

interface FlyingCard {
  id: string;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
}

const generateFlyingCards = (): FlyingCard[] => {
  return REAL_USER_IDS.map((id, index) => ({
    id,
    startX: (Math.random() - 0.5) * window.innerWidth * 1.5,
    startY: (Math.random() - 0.5) * window.innerHeight * 1.5,
    delay: (index % 12) * 0.08, // Stagger them nicely
    duration: 2.2 + Math.random() * 0.8,
  }));
};

const FlyingUserCard = ({ card, index }: { card: FlyingCard; index: number }) => {
  const colors = [
    "from-cyan-500 to-blue-600",
    "from-blue-500 to-purple-600",
    "from-purple-500 to-pink-600",
    "from-pink-500 to-rose-600",
    "from-green-500 to-cyan-600",
    "from-yellow-500 to-orange-600",
  ];

  return (
    <motion.div
      initial={{
        x: card.startX,
        y: card.startY,
        opacity: 0,
        scale: 0.2,
        rotate: Math.random() * 360,
      }}
      animate={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0,
      }}
      transition={{
        delay: card.delay,
        duration: card.duration,
        ease: "easeOut",
      }}
      className={`fixed w-24 h-24 rounded-2xl bg-gradient-to-br ${colors[index % colors.length]} shadow-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm`}
      style={{
        left: "50%",
        top: "50%",
        marginLeft: "-48px",
        marginTop: "-48px",
      }}
    >
      <div className="text-center">
        <p className="text-white font-bold text-sm">{card.id}</p>
      </div>
    </motion.div>
  );
};

// Scene 1: Fade in with atmosphere
const Scene1 = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden"
    >
      {/* Atmospheric background */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-radial from-blue-900/30 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 1.5 }}
        className="relative z-10 text-center"
      >
        <motion.h1
          className="text-6xl md:text-8xl font-black text-white mb-6"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3.5 }}
        >
          something extraordinary
        </motion.h1>
      </motion.div>
    </motion.div>
  );
};

// Scene 2: Flying user cards
const Scene2 = ({ onComplete }: { onComplete: () => void }) => {
  const [cards, setCards] = useState<FlyingCard[]>([]);

  useEffect(() => {
    setCards(generateFlyingCards());
  }, []);

  useEffect(() => {
    const timer = setTimeout(onComplete, 5500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-950 via-blue-900/20 to-slate-950 flex items-center justify-center overflow-hidden"
    >
      {/* Animated background */}
      <motion.div
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-radial from-cyan-500/20 to-transparent"
      />

      {cards.map((card, index) => (
        <FlyingUserCard key={card.id} card={card} index={index} />
      ))}

      {/* Text overlay that appears near the end */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 1.5 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="text-center">
          <p className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
            66 people
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Scene 3: Growing together
const Scene3 = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-950 to-slate-950 flex items-center justify-center overflow-hidden"
    >
      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-green-900/30 via-transparent to-cyan-900/30"
      />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 text-center max-w-3xl px-4"
      >
        <motion.h2
          className="text-5xl md:text-7xl font-black text-white mb-8"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4 }}
        >
          getting widely adopted
        </motion.h2>
        <motion.p
          className="text-xl md:text-2xl text-gray-400"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, delay: 0.3 }}
        >
          And they keep coming
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

// Scene 4: Gratitude
const Scene4 = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-950 to-slate-950 flex items-center justify-center overflow-hidden"
    >
      <motion.div
        animate={{
          opacity: [0.1, 0.4, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-rose-900/30 via-transparent to-purple-900/30"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 text-center max-w-3xl px-4"
      >
        <motion.h2
          className="text-6xl md:text-8xl font-black text-white"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4.5 }}
        >
          thank you
        </motion.h2>
      </motion.div>
    </motion.div>
  );
};

// Scene 5: Call to action
const Scene5 = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div
        animate={{
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-emerald-900/25 via-transparent to-cyan-900/25"
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative z-10 text-center max-w-3xl px-4"
      >
        <motion.h2
          className="text-5xl md:text-7xl font-black text-white mb-8"
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1.5 }}
        >
          keep spreading
        </motion.h2>

        <motion.p
          className="text-xl md:text-2xl text-gray-300 mb-12"
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          Tell one more person. Show them what we&apos;re building.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-12 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl shadow-2xl hover:shadow-emerald-500/50 transition-all"
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1.5, delay: 0.6 }}
        >
          Share The Story
        </motion.button>

        <motion.p
          className="text-sm text-gray-500 mt-12"
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1.5, delay: 0.9 }}
        >
          From 66 to infinity. It starts with you.
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default function AdoptionStory() {
  const [scene, setScene] = useState(1);

  const handleSceneComplete = () => {
    setScene((prev) => prev + 1);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950">
      {scene === 1 && <Scene1 onComplete={handleSceneComplete} />}
      {scene === 2 && <Scene2 onComplete={handleSceneComplete} />}
      {scene === 3 && <Scene3 onComplete={handleSceneComplete} />}
      {scene === 4 && <Scene4 onComplete={handleSceneComplete} />}
      {scene === 5 && <Scene5 />}
    </div>
  );
}
