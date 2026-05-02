## Adoption Story — Cinematic Rewrite

Redesign `src/pages/AdoptionStory.tsx` into a longer, more dramatic, easier‑to‑read story. Drop the gradient text, drop the laggy "all IDs flying at once" effect, and lean into the app's existing corporate navy/blue theme.

### Design rules (strict)
- **No gradient text.** Use solid `text-white`, `text-slate-200`, and `text-primary` (navy/blue from the app theme).
- **Stick to the app palette:** navy `hsl(var(--primary))`, soft blue accents, white text on a deep navy backdrop (`bg-slate-950` with subtle navy radial glow — no pink/fuchsia/emerald).
- **Conversational English.** Short sentences. Speak directly to the user ("you", "we", "your team").
- **Solid card backgrounds** for IDs (deep navy with a thin blue border) so the white ID text never blends in.

### New 7‑scene structure (longer, more dramatic)

**Scene 1 — Cold open (5s)**
A single dot of light pulses in the dark.
- Line 1 (small caps): "A short story"
- Line 2 (big): "Not long ago, this app didn't exist."
- Line 3: "Then one person opened it for the first time."

**Scene 2 — The first spark (4s)**
The dot grows into a single ID card that gently floats to center.
- "That was the very first one."
- "One worker. One screen. One small idea."

**Scene 3 — Word spreads (6s)** *(replaces the laggy swarm)*
Instead of dozens of cards flying in at once, IDs appear **one or two at a time** in a calm vertical/grid stream — like names being added to a roll call. Each card fades + slides in with a tiny scale, then settles into a soft scrolling marquee column on each side of the screen. Much lighter on the GPU.
- "Then they told a friend."
- "And that friend told another."
- "Slowly, real worker IDs started showing up."

Cards: solid `bg-slate-900` with `border-blue-400/30`, white bold ID text — fully readable, no gradient bleed.

**Scene 4 — The number (5s)**
Side marquees keep drifting quietly in the background. Center stage: a single bold count‑up.
- Small caps above: "Right now"
- Huge solid white number: `{count}`
- Below: "people are actively using this app."
- Sub‑line: "And the number keeps growing every week."

**Scene 5 — Momentum (4s)**
Background: concentric navy rings expanding outward like ripples on water (pure CSS animation, no per‑frame JS).
- "What started as one screen has turned into a daily habit for many."
- "Teammates check it before shift. Friends share it after work."
- "It's quietly becoming part of how we all work."

**Scene 6 — Thank you (5s)**
A soft blue glow behind a simple line drawing of a hand / heart icon (lucide `HandHeart` or `Sparkles`, solid color — no emoji).
- "Thank you for being part of this."
- "Seriously — every single one of you matters."
- "Keep showing it to one more teammate."
- "That's how small tools become big ones."

**Scene 7 — Signature (holds)**
Two slow rotating navy rings. Letters of "Adelaja" drop in one by one in **solid white** (no gradient). A thin blue underline draws across.
- Above: "Built with care by"
- Big: "Adelaja"
- Below: "More chapters coming soon."

### Performance fix for the "flying IDs" problem
Root cause: animating 50+ absolutely‑positioned elements with random transforms simultaneously is heavy on mobile. New approach:

1. **Marquee columns** — split IDs into 2 columns (left + right edge). Use a single CSS `translateY` keyframe on each column (one transform per column, not per card). This is GPU‑cheap and butter smooth on mobile.
2. **Hero entrance cards** — only 5–7 individual `motion.div` cards animate in scene 3's intro, then they "join" the marquee.
3. **Card style** — solid `bg-slate-900/95` + `border border-blue-400/20` + `text-white font-bold`. Guaranteed contrast.

### Technical plan
- File: `src/pages/AdoptionStory.tsx` (full rewrite, no other files touched).
- Keep the existing Supabase fetch from `worker_pins` for `ids` + `count`.
- Replace `buildFlyingCards` with a `MarqueeColumn` component (two instances, opposite directions, CSS keyframe animation defined inline via `style` + a `<style>` tag or a `motion.div` with infinite `y` animation).
- Remove all `from-fuchsia`, `from-emerald`, `from-rose`, `bg-clip-text text-transparent` usages. Replace with solid `text-white` / `text-slate-100` / `text-blue-300` for accents only.
- Replace emoji (💚, ✦) with lucide icons (`HandHeart`, `Sparkles`, `Heart`) styled in `text-blue-300`.
- Increase total runtime from ~22s to ~33s for proper storytelling pacing.
- Keep `AnimatePresence mode="wait"` scene state machine.
- Backdrop: replace pink/purple radial gradients with navy ones only:
  `radial-gradient(circle at 30% 20%, hsl(215 70% 35% / 0.35), transparent 55%), radial-gradient(circle at 70% 80%, hsl(210 80% 45% / 0.25), transparent 60%)`.
- Stars stay (subtle white dots) — they add scenery cheaply.

### What stays the same
- Route, data fetch, loader, scene state machine pattern, framer‑motion as the engine.

### What you'll see after
A calmer, longer, more readable story that feels like a short film: spark → first user → word spreads → the real number → momentum → thank you → signature. No lag. No unreadable cards. No off‑brand colors.