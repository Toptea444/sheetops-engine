import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Heart } from "lucide-react";

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
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 0.8,
    startX: (Math.random() - 0.5) * 800,
    startY: (Math.random() - 0.5) * 600,
  }));
  return userIds;
};

const UserCard = ({ user, index }: { user: UserCard; index: number }) => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-blue-500",
  ];

  return (
    <motion.div
      key={user.id}
      initial={{
        x: user.startX,
        y: user.startY,
        opacity: 0,
        scale: 0.3,
        rotate: Math.random() * 360,
      }}
      animate={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: 0,
      }}
      transition={{
        delay: user.delay,
        duration: user.duration,
        ease: "easeOut",
        type: "spring",
        stiffness: 60,
        damping: 15,
      }}
      whileHover={{
        scale: 1.1,
        rotate: 2,
      }}
      className={`absolute w-20 h-24 rounded-lg bg-gradient-to-br ${
        colors[index % colors.length]
      } shadow-lg flex flex-col items-center justify-center cursor-pointer backdrop-blur`}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: user.delay }}
        className="text-center"
      >
        <div className="text-white text-xs font-bold px-2">{user.id}</div>
        <div className="text-white text-[10px] mt-1 opacity-90">Active</div>
      </motion.div>
    </motion.div>
  );
};

export default function AdoptionStory() {
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setUserCards(generateUserCards());
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
        <motion.div
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative h-screen flex flex-col items-center justify-center px-4 pt-20"
      >
        {/* Flying user cards background */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full max-w-2xl">
            {userCards.slice(0, 30).map((user, idx) => (
              <UserCard key={user.id} user={user} index={idx} />
            ))}
          </div>
        </div>

        {/* Main content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-widest">
              Milestone Reached
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-7xl md:text-8xl font-black text-white mb-6 leading-tight"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
              className="inline-block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent"
            >
              66
            </motion.span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-2xl md:text-3xl text-gray-300 mb-4"
          >
            people are transforming their workflow
          </motion.p>

          <motion.div variants={itemVariants} className="h-1 w-24 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-8" />

          <motion.p variants={itemVariants} className="text-lg text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
            Every single one of them discovered something remarkable. They found a way to work smarter, faster, and together.
          </motion.p>
        </motion.div>
      </motion.section>

      {/* Gratitude Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20"
      >
        {/* More floating cards */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full max-w-2xl">
            {userCards.slice(30).map((user, idx) => (
              <UserCard key={user.id} user={user} index={idx + 30} />
            ))}
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.8 }}
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <span className="text-sm font-semibold text-red-400 uppercase tracking-widest">
              Thank You
            </span>
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-6xl md:text-7xl font-black text-white mb-8"
          >
            Thank you for{" "}
            <span className="bg-gradient-to-r from-pink-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
              believing in us
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            You&apos;re not just users. You&apos;re believers, innovators, and partners in this journey. You&apos;ve embraced the vision and made it real.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="h-1 w-24 bg-gradient-to-r from-pink-500 to-red-500 mx-auto mb-12"
          />
        </motion.div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-t from-slate-950 to-transparent"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.8 }}
          className="text-center max-w-3xl mx-auto z-10"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">
              The Journey Continues
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-5xl md:text-6xl font-black text-white mb-8"
          >
            Keep spreading{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              the word
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed"
          >
            Invite one more person. Tell them about the difference this software made in your work. Together, we&apos;re building something extraordinary.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 justify-center"
            >
              <Share2 className="w-5 h-5" />
              Share The Story
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-gray-400 text-white font-bold rounded-full hover:border-white transition-all"
            >
              Copy Invite Link
            </motion.button>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-12 text-sm text-gray-500 max-w-lg mx-auto"
          >
            Every new person who joins makes us stronger. Every story shared multiplies our impact. This is your story too.
          </motion.p>
        </motion.div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className="absolute w-2 h-2 bg-cyan-400 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
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
        className="relative py-12 text-center text-gray-500 bg-slate-950"
      >
        <p className="text-sm">
          Made with{" "}
          <span className="text-red-500 inline-block">
            <Heart className="w-4 h-4 fill-red-500" />
          </span>{" "}
          for our growing community of 66 innovators.
        </p>
        <p className="text-xs mt-4 text-gray-600">And counting...</p>
      </motion.footer>
    </div>
  );
}
