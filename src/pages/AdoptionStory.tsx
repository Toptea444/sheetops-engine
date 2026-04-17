import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Heart, Zap, Users } from "lucide-react";

interface UserCard {
  id: string;
  name: string;
  delay: number;
  duration: number;
  startX: number;
  startY: number;
}

const generateUserCards = (): UserCard[] => {
  const userIds = Array.from({ length: 66 }, (_, i) => ({
    id: `user_${String(i + 1).padStart(3, "0")}`,
    name: `User ${i + 1}`,
    delay: Math.random() * 2,
    duration: 1.8 + Math.random() * 1.2,
    startX: (Math.random() - 0.5) * 1000,
    startY: (Math.random() - 0.5) * 800,
  }));
  return userIds;
};

const UserCard = ({ user, index }: { user: UserCard; index: number }) => {
  const gradients = [
    "from-blue-600 via-cyan-500 to-blue-400",
    "from-purple-600 via-pink-500 to-purple-400",
    "from-emerald-600 via-teal-500 to-emerald-400",
    "from-orange-600 via-amber-500 to-orange-400",
    "from-indigo-600 via-blue-500 to-indigo-400",
    "from-rose-600 via-pink-500 to-rose-400",
    "from-cyan-600 via-blue-500 to-cyan-400",
    "from-green-600 via-emerald-500 to-green-400",
  ];

  return (
    <motion.div
      key={user.id}
      initial={{
        x: user.startX,
        y: user.startY,
        opacity: 0,
        scale: 0,
        rotate: Math.random() * 360,
      }}
      animate={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: Math.random() * 6 - 3,
      }}
      transition={{
        delay: user.delay,
        duration: user.duration,
        ease: "easeOut",
        type: "spring",
        stiffness: 50,
        damping: 20,
      }}
      whileHover={{
        scale: 1.15,
        rotate: 0,
        zIndex: 50,
        transition: { duration: 0.2 },
      }}
      className={`absolute w-20 h-24 rounded-xl bg-gradient-to-br ${
        gradients[index % gradients.length]
      } shadow-2xl flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm border border-white/20 overflow-hidden group`}
    >
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
        animate={{ x: ["0%", "100%"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: user.delay }}
        className="text-center relative z-10"
      >
        <div className="text-white text-xs font-black px-2 leading-tight">
          {user.id}
        </div>
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: user.delay * 0.5,
          }}
          className="text-white text-[9px] mt-1.5 font-semibold tracking-wide uppercase"
        >
          ✨ Active
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default function AdoptionStory() {
  const [userCards, setUserCards] = useState<UserCard[]>([]);

  useEffect(() => {
    setUserCards(generateUserCards());
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: "easeOut" },
    },
  };

  const scaleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top-left blue glow */}
        <motion.div
          animate={{
            opacity: [0.15, 0.4, 0.15],
            scale: [0.8, 1.2, 0.8],
            x: [0, 30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />

        {/* Bottom-right purple glow */}
        <motion.div
          animate={{
            opacity: [0.15, 0.4, 0.15],
            scale: [1.2, 0.8, 1.2],
            x: [0, -30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />

        {/* Center cyan accent */}
        <motion.div
          animate={{
            opacity: [0.1, 0.25, 0.1],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-color-dodge filter blur-3xl opacity-20"
        />
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-12 pb-20 overflow-hidden"
      >
        {/* Flying user cards background - contained */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="relative w-full h-full max-w-4xl">
            {userCards.slice(0, 35).map((user, idx) => (
              <UserCard key={user.id} user={user} index={idx} />
            ))}
          </div>
        </motion.div>

        {/* Main content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center max-w-4xl mx-auto px-4"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">
              Milestone Reached
            </span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </motion.div>

          {/* Main number */}
          <motion.h1
            variants={scaleVariants}
            className="text-8xl md:text-9xl font-black text-white mb-8 leading-tight tracking-tighter"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.8,
                duration: 1,
                type: "spring",
                stiffness: 100,
                damping: 20,
              }}
              className="inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl"
            >
              66
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-2xl md:text-4xl font-bold text-white mb-6 leading-tight"
          >
            people are reshaping their workflow
          </motion.p>

          {/* Decorative line */}
          <motion.div
            variants={itemVariants}
            className="h-1.5 w-32 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 mx-auto mb-10 rounded-full shadow-lg shadow-cyan-500/50"
          />

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Each one discovered something extraordinary. They found the power to work smarter, move faster, and build together. Your adoption is our mission.
          </motion.p>
        </motion.div>
      </motion.section>

      {/* Gratitude Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden"
      >
        {/* More floating cards */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.5 }}
          viewport={{ once: true, amount: 0.5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="relative w-full h-full max-w-4xl">
            {userCards.slice(30).map((user, idx) => (
              <UserCard key={user.id} user={user} index={idx + 30} />
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.8 }}
          className="relative z-10 text-center max-w-4xl mx-auto px-4"
        >
          {/* Heart badge */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            </motion.div>
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
              Deep Gratitude
            </span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            </motion.div>
          </motion.div>

          {/* Main heading */}
          <motion.h2
            variants={scaleVariants}
            className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight"
          >
            Thank you for{" "}
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 bg-clip-text text-transparent"
            >
              believing
            </motion.span>
          </motion.h2>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-400 mb-8 font-light"
          >
            in what we&apos;re building together
          </motion.p>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            You&apos;re not just users. You&apos;re pioneers, dreamers, and partners in this incredible journey. You&apos;ve seen the vision and brought it to life through your unwavering support.
          </motion.p>

          {/* Decorative line */}
          <motion.div
            variants={itemVariants}
            className="h-1.5 w-32 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 mx-auto rounded-full shadow-lg shadow-rose-500/50"
          />
        </motion.div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.8 }}
          className="text-center max-w-4xl mx-auto z-10 px-4"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">
              Keep the Momentum
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </motion.div>

          {/* Main heading */}
          <motion.h2
            variants={scaleVariants}
            className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight"
          >
            Spread the{" "}
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent"
            >
              word
            </motion.span>
          </motion.h2>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-8 font-light leading-relaxed"
          >
            Bring one more person into this movement. Show them how this software transforms work. Together, we&apos;re building something that lasts.
          </motion.p>

          {/* Decorative line */}
          <motion.div
            variants={itemVariants}
            className="h-1.5 w-32 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 mx-auto mb-12 rounded-full shadow-lg shadow-emerald-500/50"
          />

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 text-white font-bold rounded-xl shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <Share2 className="w-5 h-5" />
              Share The Story
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-cyan-400/30 hover:border-cyan-400 text-white font-bold rounded-xl hover:bg-white/5 transition-all text-lg"
            >
              Copy Invite Link
            </motion.button>
          </motion.div>

          {/* Secondary text */}
          <motion.p
            variants={itemVariants}
            className="text-base text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Every invite multiplies impact. Every story shared extends the reach. Your voice matters—this is your story too.
          </motion.p>

          {/* Stats teaser */}
          <motion.div
            variants={itemVariants}
            className="inline-block px-6 py-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <p className="text-sm text-gray-400">
              From 66 to 67. Then 100. Then 1000. <span className="text-emerald-400 font-semibold">It starts with you.</span>
            </p>
          </motion.div>
        </motion.div>

        {/* Animated accent particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -40, 0],
                opacity: [0, 1, 0],
                x: [0, Math.cos(i * Math.PI / 4) * 50, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
              className="absolute w-1.5 h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-sm"
              style={{
                left: `${15 + i * 11}%`,
                top: `${40 + (i % 2) * 20}%`,
              }}
            />
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative py-16 text-center bg-gradient-to-t from-slate-950 to-slate-900/50 border-t border-white/5"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <p className="text-base text-gray-300 flex items-center justify-center gap-2">
            Crafted with{" "}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-rose-500 inline-block"
            >
              <Heart className="w-5 h-5 fill-rose-500" />
            </motion.span>{" "}
            for our incredible community
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-cyan-400">66</span> innovators reshaping the future
          </p>
          <p className="text-xs text-gray-600 pt-2">
            ✨ And the journey has just begun...
          </p>
        </motion.div>
      </motion.footer>
    </div>
  );
}
