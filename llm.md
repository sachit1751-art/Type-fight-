# HAIRLINE — Type Arcade & Typing Defense

> Minimalist monochrome hairline typing games built with React, TypeScript, HTML5 Canvas, Isometric SVG, and D3.js.

## Overview

**HAIRLINE** is a pure browser typing-game arcade featuring two distinct modes rendered in a single technical illustration system (`plate · hi · edge · mid · lo · accent`) with Light and Dark plate themes and procedural Web Audio sound synthesis.

## Playable Games

### 1. HAIRLINE / Type Arcade
- **Genre**: Side-scrolling stick-figure typing shooter.
- **Gameplay**: Enemies (`runner`, `walker`, `brute`, and `line` phrase carriers) march from the right toward **THE LINE**. Each correct letter fires a rifle shot at the targeted word. Typing another idle enemy's starting letter before a word begins switches lock-on.
- **Zero-Backspace Penalty**: Wrong letters mark the character red, trigger enemy counter-fire (`-8 HP`), reset streak, and advance forward without blocking flow.
- **Clean-Word Shield**: Finishing a word with zero typos heals `+2 HP`. Two typo-free words in a row raise a shield that deflects enemy shots until the next typo.
- **Progression**: Every 8 kills advances the wave (`WAVE N`) with faster spawns, longer words, and phrase lines requiring `<Space>`.

### 2. HAIRLINE / Typing Defense
- **Genre**: Isometric 3-lane keep & turret typing defense.
- **Gameplay**: Command the central Keep against walkers (`runner`, `walker`, `brute`, `herald`) advancing down three parallel lanes.
- **Ink & Automated Turrets**: Every accurate keystroke yields `+1 Ink`, defeated walkers drop Ink bounties, and clearing a wave grants a bonus (`10 + 2 × wave`). Press `1`, `2`, or `3` (or click/tap console turret buttons) to build and upgrade lane turrets (`25 / 45 / 70 Ink`) that slice letters off the right end of approaching words.
- **Clean Shield**: Clean words heal `+2 HP` and grant `+3 Ink`; two consecutive clean words raise a 3-ring keep shield absorbing up to 3 hits (dropped immediately on a typo).

## Daily Challenge & Audio Mixer

- **Daily Rotating Challenge Mode**: Each calendar day rotates a curated ruleset featuring custom enemy speed, spawn pace, starting HP/Ink, typo penalties, and specialized weapons (**Twin-Bolt**, **Railgun**, **Scattergun**, **Hyper-Carbine**), with daily best scores and completion streaks saved locally.
- **Advanced Audio Settings (`⚙ AUDIO`)**: Independently adjust master volume (`0–100%`), toggle sound master output, and toggle **Shooting & Weapons**, **Enemies & Combat**, and **UI & Feedback** sound categories in both games.

## Post-Run D3 Analytics & Sharing

- **D3 WPM Trend Chart**: Both Game Over screens sample words-per-minute every `1.5s` during active play and render a smooth `d3.curveMonotoneX` SVG line + area chart highlighting average WPM and peak speed.
- **Social Sharing**: Export a 1080×1080 PNG score card matching the active Light/Dark plate theme or share run summaries directly to Twitter/X and Facebook.

## Controls

| Input | Type Arcade | Typing Defense |
| --- | --- | --- |
| `A–Z`, `Space` | Fire letters & spaces | Fire bolts & spaces |
| `1`, `2`, `3` | — | Build / upgrade turret on Lane 1–3 |
| `Esc` | Pause / Resume / Close drawer | Pause / Resume / Close drawer |
| `Enter` | Start / Play Again | Start / Play Again |
| `⌨ TYPE` | Open mobile touch keyboard | Open mobile touch keyboard |
