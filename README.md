# HAIRLINE — Type Arcade & Typing Defense

**A minimalist typing-game arcade built by Sachit.** Play two distinct game modes that turn accurate typing into an arcade skill: a side-scrolling Type Arcade and an isometric, three-lane Typing Defense game.

<p align="center">
  <a href="https://type-fg.sachit1751.workers.dev/"><strong>▶ Play HAIRLINE</strong></a>
</p>

## Game modes

### Type Arcade
- Type approaching words to fire at targets in a side-scrolling arena.
- Build streaks, manage health, and progress through increasingly difficult waves.
- Clean-word bonuses reward accurate typing.

### Typing Defense
- Defend a central keep across three isometric lanes.
- Earn Ink through accurate keystrokes and defeated enemies.
- Build and upgrade automated lane turrets with the `1`, `2`, and `3` keys.

## Features

- Positional typing gameplay with a zero-backspace rule.
- Daily rotating challenges and locally saved progress.
- Light and dark visual themes.
- Procedural Web Audio effects with category-level audio controls.
- Post-run D3.js WPM trend charts and shareable score cards.
- Responsive controls, including an on-screen keyboard for touch devices.

## Tech stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- HTML Canvas and SVG for game rendering
- D3.js for WPM analytics
- Web Audio API for synthesized sound
- Cloudflare Workers Static Assets for hosting

## Run locally

Requires [Bun](https://bun.sh/) (the repository includes `bun.lock`).

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`.

Create a production build:

```bash
bun run build
```

## Deploy to Cloudflare Workers

The production Worker is named `type-fg` and serves the Vite build from `dist/`.

```bash
bun run build
bun run deploy
```

Live game: **[https://type-fg.sachit1751.workers.dev/](https://type-fg.sachit1751.workers.dev/)**

The `wrangler.jsonc` file configures the stable Worker name, static asset directory, and SPA fallback. The `workers.dev` hostname is tied to the Cloudflare account's `sachit1751` subdomain.

## Repository

- Source: [sachit1751-art/Type-fight-](https://github.com/sachit1751-art/Type-fight-)
- Live game: [type-fg.sachit1751.workers.dev](https://type-fg.sachit1751.workers.dev/)

---

Built by **Sachit**.
