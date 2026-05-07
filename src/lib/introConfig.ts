export type IntroAnimationStyle =
  | 'letter-stagger'
  | 'fade'
  | 'slide-up'
  | 'scale'
  | 'typewriter'
  | 'blur-in';

export type IntroFontFamily =
  | 'sans'
  | 'serif'
  | 'mono'
  | 'display';

export interface IntroConfig {
  enabled: boolean;
  text: string;
  showsPerDay: number; // 0 = unlimited (every load), N = max N times per day
  startDelayMs: number; // delay before fading in
  totalDurationMs: number; // total visible time
  exitDurationMs: number; // exit fade duration
  animationStyle: IntroAnimationStyle;
  fontFamily: IntroFontFamily;
  fontSizeRem: number;
  letterSpacingEm: number;
  uppercase: boolean;
  fontWeight: number; // 100-900
  textColor: string; // hsl token reference OR raw css color
  backgroundColor: string;
  showAccentLine: boolean;
  accentColor: string;
  showGlow: boolean;
  tapToDismiss: boolean;
}

export const DEFAULT_INTRO_CONFIG: IntroConfig = {
  enabled: true,
  text: 'Built by Adelaja',
  showsPerDay: 1,
  startDelayMs: 0,
  totalDurationMs: 2000,
  exitDurationMs: 350,
  animationStyle: 'letter-stagger',
  fontFamily: 'sans',
  fontSizeRem: 1.75,
  letterSpacingEm: 0.2,
  uppercase: true,
  fontWeight: 300,
  textColor: 'hsl(var(--foreground) / 0.9)',
  backgroundColor: 'hsl(var(--background))',
  showAccentLine: true,
  accentColor: 'hsl(var(--primary) / 0.7)',
  showGlow: true,
  tapToDismiss: true,
};

export function mergeIntroConfig(partial: Partial<IntroConfig> | null | undefined): IntroConfig {
  return { ...DEFAULT_INTRO_CONFIG, ...(partial || {}) };
}

export const FONT_FAMILY_CLASS: Record<IntroFontFamily, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
  display: 'font-serif italic',
};
