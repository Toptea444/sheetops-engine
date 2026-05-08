import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useIntroConfig } from '@/hooks/useIntroConfig';
import { FONT_FAMILY_CLASS, IntroConfig } from '@/lib/introConfig';

const STORAGE_KEY = 'adelaja_intro_shows_v2';

interface AdelajaIntroProps {
  onComplete: () => void;
}

interface ShowsRecord {
  date: string;
  count: number;
}

function readShows(): ShowsRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ShowsRecord;
      if (parsed?.date) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { date: '', count: 0 };
}

function writeShows(rec: ShowsRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

function shouldShow(config: IntroConfig): boolean {
  if (!config.enabled) return false;
  const today = new Date().toDateString();
  const rec = readShows();
  const countToday = rec.date === today ? rec.count : 0;
  if (config.showsPerDay <= 0) return true; // unlimited
  return countToday < config.showsPerDay;
}

function recordShow() {
  const today = new Date().toDateString();
  const rec = readShows();
  const countToday = rec.date === today ? rec.count : 0;
  writeShows({ date: today, count: countToday + 1 });
}

export function AdelajaIntro({ onComplete }: AdelajaIntroProps) {
  const { config, loaded } = useIntroConfig();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState<boolean | null>(null);

  // Decide visibility once based on first available config (cached or default).
  useEffect(() => {
    if (visible !== null) return;
    setVisible(shouldShow(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => setVisible(false), []);

  // Compute the minimum time the chosen animation needs so we never cut it
  // off mid-reveal. We freeze this on first paint so a later remote-config
  // update can't shorten an in-flight intro.
  const computedDurationRef = useRef<number | null>(null);
  if (computedDurationRef.current === null) {
    const startDelayMs = Math.max(0, config.startDelayMs);
    const charCount = config.text.length;
    let animMs = 700; // generic baseline
    switch (config.animationStyle) {
      case 'letter-stagger':
        animMs = 200 + charCount * 35 + 550 + 150; // delay + stagger + duration + safety
        break;
      case 'typewriter':
        animMs = 100 + Math.min(80, 700 / Math.max(charCount, 1)) * charCount + 200;
        break;
      case 'slide-up':
      case 'scale':
      case 'blur-in':
      case 'fade':
        animMs = 100 + 700;
        break;
    }
    // Accent line finishes around startDelay + 850 + 700
    const accentMs = config.showAccentLine ? 850 + 700 : 0;
    const minAnim = Math.max(animMs, accentMs);
    const userTotal = Math.max(400, config.totalDurationMs);
    computedDurationRef.current = startDelayMs + Math.max(userTotal, minAnim + 250);
  }

  useEffect(() => {
    if (visible !== true) {
      if (visible === false) onComplete();
      return;
    }
    recordShow();
    const t = setTimeout(finish, computedDurationRef.current ?? 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const letters = useMemo(() => config.text.split(''), [config.text]);

  if (visible !== true) return null;

  const exitDuration = Math.max(0.05, config.exitDurationMs / 1000);
  const startDelay = Math.max(0, config.startDelayMs / 1000);
  const fontClass = FONT_FAMILY_CLASS[config.fontFamily] ?? 'font-sans';

  const textStyle: React.CSSProperties = {
    fontSize: `${config.fontSizeRem}rem`,
    letterSpacing: `${config.letterSpacingEm}em`,
    fontWeight: config.fontWeight,
    color: config.textColor,
    textTransform: config.uppercase ? 'uppercase' : 'none',
  };

  const renderText = () => {
    if (reduceMotion || config.animationStyle === 'fade') {
      return (
        <motion.span
          className={`inline-block ${fontClass}`}
          style={textStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: startDelay + 0.15 }}
        >
          {config.text}
        </motion.span>
      );
    }

    if (config.animationStyle === 'slide-up') {
      return (
        <motion.span
          className={`inline-block ${fontClass}`}
          style={textStyle}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: startDelay + 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {config.text}
        </motion.span>
      );
    }

    if (config.animationStyle === 'scale') {
      return (
        <motion.span
          className={`inline-block ${fontClass}`}
          style={textStyle}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: startDelay + 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {config.text}
        </motion.span>
      );
    }

    if (config.animationStyle === 'blur-in') {
      return (
        <motion.span
          className={`inline-block ${fontClass}`}
          style={textStyle}
          initial={{ opacity: 0, filter: 'blur(12px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: startDelay + 0.1 }}
        >
          {config.text}
        </motion.span>
      );
    }

    if (config.animationStyle === 'typewriter') {
      const totalChars = letters.length;
      const perChar = Math.min(0.08, 0.7 / Math.max(totalChars, 1));
      return (
        <span className={`inline-block ${fontClass}`} style={textStyle}>
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: startDelay + 0.1 + i * perChar }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </span>
      );
    }

    // letter-stagger (default)
    return (
      <span className={`flex items-baseline overflow-hidden ${fontClass}`}>
        {letters.map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block"
            style={textStyle}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.55,
              delay: startDelay + 0.2 + i * 0.035,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </span>
    );
  };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="adelaja-intro"
          role="status"
          aria-label={config.text}
          onClick={config.tapToDismiss ? finish : undefined}
          className={`fixed inset-0 z-[200] flex items-center justify-center select-none ${
            config.tapToDismiss ? 'cursor-pointer' : ''
          }`}
          style={{ background: config.backgroundColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: exitDuration, ease: 'easeOut' }}
        >
          {config.showGlow && (
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${config.accentColor.replace(
                  /\/\s*[\d.]+\s*\)/,
                  '/ 0.10)'
                )}, transparent 60%)`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}

          <div className="relative flex flex-col items-center gap-3 px-6">
            {renderText()}

            {config.showAccentLine && (
              <motion.div
                className="h-px origin-left"
                style={{ background: config.accentColor, width: '8rem' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.7,
                  delay: reduceMotion ? startDelay + 0.2 : startDelay + 0.85,
                  ease: [0.65, 0, 0.35, 1],
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
