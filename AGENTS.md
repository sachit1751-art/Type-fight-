# AGENTS.md — AI Coding Agent Guide

This repository implements **HAIRLINE — Type Arcade & Typing Defense**, a React + Vite + TypeScript dual typing-game platform rendered in a minimalist monochrome hairline illustration language with interactive D3 speed analytics.

## Repository Architecture

- **Framework**: React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), D3 v7 (`d3`).
- **Entry Point**: `src/main.tsx` -> `src/App.tsx`.
- **Styling**: `src/index.css` defines the 6-token hairline palette (`--hairline-plate`, `--hairline-hi`, `--hairline-edge`, `--hairline-mid`, `--hairline-lo`, `--accent`), Light/Dark plate switching (`body.dark-plate`), responsive game HUDs, console bars, isometric SVG `[data-hairline]` styling, D3 chart classes, and mobile bottom dock (`<= 720px`).

### Key Modules

1. **Workspace & Shell (`src/App.tsx`, `src/components/TopBar.tsx`, `src/components/HomeLanding.tsx`, `src/components/OnboardingModal.tsx`, `src/components/AudioSettingsDrawer.tsx`)**
   - `activeView` switches cleanly between `'home'`, `'arcade'`, and `'defense'`.
   - Switching away from an active game automatically pauses it; opening Help, Audio Mixer (`⚙ AUDIO`), or Onboarding Tour also auto-pauses and resumes cleanly on close.
   - `TopBar` delegates `? HELP`, `⚙ AUDIO`, `Ⅱ PAUSE / ▶ RESUME`, and `↻ RESTART` to whichever game (`arcade` or `defense`) is active.

2. **Game 1: Type Arcade (`src/game/engine.ts`, `src/game/words.ts`, `src/game/types.ts`, `src/game/challenge.ts`)**
   - Canvas-based (`960×420` HiDPI-scaled) side-scroller typing shooter (`Hero` on the left defending **THE LINE** against advancing `runner`, `walker`, `brute`, and `line` figures).
   - Supports **Standard** mode and deterministic **Daily Rotating Challenge Mode** (`Twin-Bolt`, `Railgun`, `Scattergun`, `Hyper-Carbine` + custom speed, HP, typo damage, and score multipliers).
   - Pure positional typing with zero Backspace: correct letters fire rifle projectiles, wrong letters fire back, two typo-free words raise a persistent deflecting shield.
   - Samples WPM every `1.5s` into `GameState.wpmHistory` for post-run D3 graphing.

3. **Game 2: Typing Defense (`src/defense/kernel.ts`, `src/defense/engine.ts`, `src/defense/words.ts`, `src/components/TypingDefenseView.tsx`, `src/components/MenuKeepFigure.tsx`)**
   - `src/defense/kernel.ts`: Self-contained isometric 3D projection and SVG extrusion kernel (`Cam`, `proj`, `fit`, `prism`, `rings`, `solid`, `spring`, `tween`).
   - `src/defense/engine.ts`: `TypingDefenseController` manages the isometric Keep (`10` HP windows & 3-ring shield), 3 lanes, 3 turret pads (levels `1–3`, Ink cost `25/45/70`, reach `240/330/420`), 4 walker classes (`runner`, `walker`, `brute`, `herald`), bouncing 3D shards, Ink economy, Daily Challenge weapon & modifier hooks, `localStorage` best-score/streak persistence, and `1.5s` `wpmHistory` sampling.

4. **Data Visualization, Audio Mixer & Sharing (`src/components/WpmTrendChart.tsx`, `src/components/SocialShareBar.tsx`, `src/game/shareCard.ts`, `src/game/audio.ts`)**
   - `WpmTrendChart`: Uses `d3.scaleLinear`, `d3.line`, `d3.area`, `d3.axisBottom`, `d3.axisLeft`, and `d3.mean` to render a hairline WPM curve with peak dot and average reference line on both Game Over overlays. Respects `prefers-reduced-motion`.
   - `shareCard.ts`: Builds Twitter/X and Facebook share intents plus 1080×1080 PNG result cards tailored per game.
   - `audio.ts` + `AudioSettingsDrawer.tsx`: Web Audio API procedural synthesizer (`shoot`, `hit`, `eshoot`, `hurt`, `block`, `shield`, `word`, `die`, `wrong`, `wave`, `build`, `nope`, `turret`, `rail`, `scatter`) with master volume (`0–100%`) and independent `shooting`, `enemies`, and `ui` category toggles.

## Conventions & Constraints

- **No unrelated features**: Keep the app strictly focused on typing games, onboarding, D3 speed charts, and sharing.
- **No raw HTML injection**: Never introduce `dangerouslySetInnerHTML`. Use explicit token parsing for inline highlight tags.
- **No browser popups**: Avoid `window.alert` and `window.open`; external share actions use anchor links or Web Share / file download.
- **Hairline Discipline**: Honor Light and Dark plate custom properties; never introduce gradients, drop-shadow clutter, or off-palette hues beyond `--accent` warning red.
- **Tabular Numerals**: Numeric readouts, HUD stats, and D3 metrics must retain `font-variant-numeric: tabular-nums`.

## Verification Commands

```bash
npm run lint     # TypeScript type-check (tsc --noEmit)
npm run build    # Production Vite bundle build
```
