import { SFX } from './audio';
import {
  BubbleRect,
  Bullet,
  Enemy,
  EnemyType,
  GameState,
  HudSnapshot,
  Palette,
  Pillar,
  Pose,
} from './types';
import { clamp, LINES, pick, rand, wordFor } from './words';

export const W = 960;
export const H = 420;
export const HERO_X = 138;
export const HERO_GY = 350;
export const LINE_X = 208;

export const LANES = [
  { gy: 322, s: 0.88 },
  { gy: 344, s: 0.99 },
  { gy: 364, s: 1.09 },
];

export function createPillars(): Pillar[] {
  const pillars: Pillar[] = [];
  for (let i = 0; i < 17; i++) {
    const x = 236 + i * 43 + rand(-6, 6);
    pillars.push({
      x,
      gy: 316 + (i % 3) * 7,
      h: 12 + 34 * Math.abs(Math.sin(i * 1.7)) + rand(0, 8),
      w: 15 + (i % 4) * 2,
    });
  }
  pillars.sort((a, b) => a.gy - b.gy);
  return pillars;
}

export function freshState(): GameState {
  return {
    mode: 'menu',
    time: 0,
    runTime: 0,
    lastTs: 0,
    hero: { hp: 100, recoil: 0, flashT: 0, hurtT: 0, muzzleT: 0, deadT: 0, phase: 0 },
    activeId: null,
    enemies: [],
    bullets: [],
    particles: [],
    floats: [],
    spawnT: 0.35,
    kills: 0,
    score: 0,
    wave: 1,
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    shield: { active: false, cleanWords: 0, flashT: 0 },
    linesIntroduced: false,
    shake: 0,
    nextId: 1,
    overT: 0,
  };
}

export function getPalette(dark: boolean): Palette {
  return dark
    ? { plate: '#08090a', hi: '#d0d6e0', edge: '#5b5d64', mid: '#3e3e44', lo: '#29292d', accent: '#ff6369' }
    : { plate: '#ffffff', hi: '#232327', edge: '#a4a4ac', mid: '#c3c3c9', lo: '#e0e0e4', accent: '#e5484d' };
}

export function aliveEnemies(G: GameState): Enemy[] {
  return G.enemies.filter(e => e.state === 'alive');
}

export function getTarget(G: GameState): Enemy | null {
  if (G.activeId != null) {
    const e = G.enemies.find(en => en.id === G.activeId);
    if (e && e.state === 'alive' && !e.completed) return e;
    G.activeId = null;
  }
  const next = G.enemies
    .filter(e => e.state === 'alive' && !e.completed)
    .sort((a, b) => a.x - b.x)[0];
  if (!next) return null;
  G.activeId = next.id;
  return next;
}

export interface EngineCallbacks {
  onFeedback: (html: string, kind?: '' | 'good' | 'bad') => void;
  onWave: (wave: number) => void;
  onShake: () => void;
  onHitVignette: () => void;
  onStreakPop: () => void;
  onGameOver: () => void;
}

export function spawnEnemy(G: GameState, cb: EngineCallbacks): void {
  const wave = G.wave;
  const r = Math.random();
  const type: EnemyType = G.kills === 0
    ? 'walker'
    : (r < 0.16 + wave * 0.012 ? 'brute' : r < 0.46 ? 'runner' : 'walker');
  const lane = LANES[Math.floor(Math.random() * LANES.length)];
  const typeMul = type === 'runner' ? 1.5 : type === 'brute' ? 0.62 : 1;
  const scaleMul = type === 'runner' ? 0.82 : type === 'brute' ? 1.24 : 1;

  const linesUnlocked = wave >= 3 || G.runTime >= 75;
  const isLine = linesUnlocked && type !== 'runner' && Math.random() < 0.34;
  let word = wordFor(type, wave, G.enemies);
  if (isLine) {
    const inUse = new Set(G.enemies.map(e => e.word));
    word = pick(LINES);
    for (let i = 0; i < 24 && inUse.has(word); i++) word = pick(LINES);
    if (!G.linesIntroduced) {
      G.linesIntroduced = true;
      cb.onFeedback('new carriers ahead: <b>LINES</b> — type the whole line, <b>spaces</b> too!', 'good');
    }
  }

  let spawnX = W + rand(30, 130);
  for (const o of G.enemies) {
    if (o.state === 'alive') spawnX = Math.max(spawnX, o.x + rand(60, 120));
  }

  G.enemies.push({
    id: G.nextId++,
    type,
    word,
    isLine,
    progress: 0,
    marks: [],
    completed: false,
    x: spawnX,
    gy: lane.gy,
    s: lane.s * scaleMul,
    speed: (30 + wave * 2.1 + rand(0, 10)) * typeMul * (isLine ? 0.72 : 1),
    phase: rand(0, Math.PI * 2),
    state: 'alive',
    deathT: 0,
    flashT: 0,
    shakeT: 0,
    kb: 0,
    attackCd: rand(0.7, 1.2),
    muzzleT: 0,
    seed: rand(0, 100),
  });
}

export function pose(
  x: number,
  gy: number,
  s: number,
  facing: number,
  phase: number,
  walking: boolean,
  aimAngle: number,
  recoil: number
): Pose {
  const head = { x, y: gy - 57 * s };
  const hr = 9 * s;
  const neck = { x, y: head.y + hr * 0.9 };
  const hip = { x: x - facing * 1.5 * s, y: gy - 29 * s };
  const shoulder = { x, y: gy - 43 * s };
  const swing = walking ? Math.sin(phase) * 11 * s : 7 * s;
  const swing2 = walking ? Math.sin(phase + Math.PI) * 11 * s : -6 * s;
  const footA = { x: x + swing, y: gy };
  const footB = { x: x + swing2, y: gy };
  const kneeA = { x: (hip.x + footA.x) / 2 + facing * 3.5 * s, y: (hip.y + gy) / 2 };
  const kneeB = { x: (hip.x + footB.x) / 2 - facing * 1 * s, y: (hip.y + gy) / 2 };
  const gx = Math.cos(aimAngle);
  const gyv = Math.sin(aimAngle);
  const hand = { x: shoulder.x + gx * 19 * s - recoil * facing, y: shoulder.y + gyv * 19 * s };
  const muzzle = { x: hand.x + gx * 25 * s, y: hand.y + gyv * 25 * s };
  const backHand = { x: shoulder.x - facing * 9 * s, y: shoulder.y + 13 * s };
  const chest = { x, y: gy - 42 * s };
  return { head, hr, neck, hip, shoulder, footA, footB, kneeA, kneeB, hand, muzzle, backHand, chest };
}

export function heroPose(G: GameState): Pose {
  const t = getTarget(G);
  let aim = -0.04;
  if (t) {
    const tc = { x: t.x, y: t.gy - 42 * t.s };
    aim = Math.atan2(tc.y - (HERO_GY - 43), tc.x - HERO_X);
  }
  return pose(HERO_X, HERO_GY, 1.06, 1, G.hero.phase, false, aim, G.hero.recoil);
}

export function enemyPose(e: Enemy): Pose {
  const hc = { x: HERO_X, y: HERO_GY - 42 };
  const walking = e.x > LINE_X && e.state === 'alive';
  const aim = Math.atan2(hc.y - (e.gy - 43 * e.s), hc.x - e.x);
  return pose(e.x, e.gy, e.s, -1, e.phase, walking, aim, 0);
}

export function burst(G: GameState, x: number, y: number, n: number, accent = false): void {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(28, 120);
    G.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 22,
      life: 0,
      max: rand(0.22, 0.5),
      len: rand(3, 9),
      accent,
    });
  }
}

export function floatText(G: GameState, x: number, y: number, text: string, kind: '' | 'good' | 'bad' | 'kill' = ''): void {
  G.floats.push({ x, y, text, kind, life: 0 });
}

function doShake(G: GameState, n: number, cb: EngineCallbacks): void {
  G.shake = Math.max(G.shake, n);
  cb.onShake();
}

export function fireHeroBullet(G: GameState, enemy: Enemy, ch: string, isFinal: boolean): void {
  const hp = heroPose(G);
  G.hero.recoil = 5;
  G.hero.muzzleT = 0.07;
  G.bullets.push({
    from: 'hero',
    x: hp.muzzle.x,
    y: hp.muzzle.y,
    target: enemy,
    ch,
    isFinal,
    speed: 780,
    trail: [],
  });
  SFX.shoot();
}

export function fireEnemyBullet(G: GameState, enemy: Enemy): void {
  const ep = enemyPose(enemy);
  enemy.muzzleT = 0.08;
  G.bullets.push({
    from: 'enemy',
    x: ep.muzzle.x,
    y: ep.muzzle.y,
    target: null,
    ch: '',
    isFinal: false,
    speed: 560,
    trail: [],
  });
  SFX.eshoot();
}

function addScore(G: GameState, n: number, x: number, y: number): void {
  const mult = 1 + Math.floor(G.streak / 12);
  const gain = n * mult;
  G.score += gain;
  if (n >= 10 && Math.random() < 0.4) {
    floatText(G, x, y, `+${gain}`, 'good');
  }
}

function checkWave(G: GameState, cb: EngineCallbacks): void {
  const w = Math.floor(G.kills / 8) + 1;
  if (w !== G.wave) {
    G.wave = w;
    SFX.wave();
    cb.onWave(w);
  }
}

export function finishEnemy(G: GameState, e: Enemy, cb: EngineCallbacks): void {
  if (!e || e.state !== 'alive') return;
  e.state = 'dying';
  e.deathT = 0;
  if (G.activeId === e.id) G.activeId = null;
  G.kills++;
  const bonus = 30 + e.word.length * 5;
  G.score += bonus;
  floatText(G, e.x, e.gy - 96 * e.s, `${e.word}  +${bonus}`, 'kill');
  burst(G, e.x, e.gy - 40 * e.s, 18, false);
  SFX.die();
  checkWave(G, cb);
}

export function handleChar(G: GameState, raw: string, cb: EngineCallbacks): void {
  if (G.mode !== 'playing') return;
  const ch = raw.toLowerCase();
  if (!/^[a-z ]$/.test(ch)) return;
  const field = G.enemies.filter(e => e.state === 'alive' && !e.completed);
  if (!field.length) return;
  G.total++;

  let active = getTarget(G);
  if (!active) return;

  if (active.progress === 0 && ch !== active.word[0]) {
    const other = field
      .filter(e => e !== active && e.progress === 0 && e.word[0] === ch)
      .sort((a, b) => a.x - b.x)[0];
    if (other) {
      active = other;
      G.activeId = other.id;
    }
  }

  const expected = active.word[active.progress];
  const isCorrect = ch === expected;
  active.marks.push(isCorrect);
  active.progress++;
  const isFinal = active.progress >= active.word.length;
  const wrongs = active.marks.filter(m => !m).length;
  if (isFinal) {
    active.completed = true;
    G.activeId = null;
  }

  const shown = (c: string) => (c === ' ' ? '␣ space' : c);

  if (isCorrect) {
    G.correct++;
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    cb.onStreakPop();
    fireHeroBullet(G, active, ch, isFinal);
    addScore(G, 10, active.x, active.gy - 92 * active.s);

    if (isFinal) {
      let shieldMsg = '';
      if (wrongs === 0) {
        const healed = Math.min(2, 100 - G.hero.hp);
        if (healed > 0) {
          G.hero.hp += healed;
          floatText(G, HERO_X + 18, HERO_GY - 104, `+${healed} HP`, 'good');
          shieldMsg += ` <b>+${healed} HP</b>.`;
        }
        G.shield.cleanWords++;
        if (!G.shield.active && G.shield.cleanWords >= 2) {
          G.shield.active = true;
          G.shield.flashT = 0.45;
          SFX.shield();
          shieldMsg = ' ⬡ <b>SHIELD UP</b> — two clean words in a row! It blocks enemy shots, and falls on your next typo.';
        } else {
          SFX.word();
        }
      } else {
        G.shield.cleanWords = 0;
      }
      cb.onFeedback(
        `“${active.word}” finished${wrongs ? ` with ${wrongs} miss${wrongs > 1 ? 'es' : ''}` : ' — clean'}! Next word up.${shieldMsg}`,
        wrongs ? '' : 'good'
      );
    } else {
      cb.onFeedback(`<b>${shown(ch)}</b> ✓ — hit inbound · streak ×${G.streak}`, 'good');
    }
  } else {
    const hadShield = G.shield.active;
    G.shield.active = false;
    G.shield.cleanWords = 0;
    G.streak = 0;
    active.shakeT = 0.3;
    fireEnemyBullet(G, active);
    SFX.wrong();

    if (isFinal) {
      cb.onFeedback(
        `✕ <b>${shown(ch)}</b> (wanted <b>${shown(expected)}</b>) — “${active.word}” finished with ${wrongs} miss${wrongs > 1 ? 'es' : ''}; its last shot is incoming!${hadShield ? ' ⬡ <b>SHIELD DOWN.</b>' : ''}`,
        'bad'
      );
      finishEnemy(G, active, cb);
    } else {
      cb.onFeedback(
        `✕ <b>${shown(ch)}</b> (wanted <b>${shown(expected)}</b>) — ${active.type} fires back · next: <b>${shown(active.word[active.progress])}</b>${hadShield ? ' · ⬡ <b>SHIELD DOWN</b>' : ''}`,
        'bad'
      );
    }
  }
}

function bulletHit(G: GameState, b: Bullet, cb: EngineCallbacks): void {
  if (b.from === 'hero') {
    const e = b.target;
    if (!e || e.state !== 'alive') return;
    e.flashT = 0.16;
    e.kb = 26;
    burst(G, e.x, e.gy - 42 * e.s, b.isFinal ? 16 : 7, false);
    SFX.hit();
    if (b.isFinal) finishEnemy(G, e, cb);
  } else if (G.shield.active) {
    G.shield.flashT = 0.3;
    burst(G, HERO_X + 10, HERO_GY - 42, 8, false);
    floatText(G, HERO_X + 26, HERO_GY - 96, '⬡ BLOCKED', 'good');
    SFX.block();
  } else {
    G.hero.hp = Math.max(0, G.hero.hp - 8);
    G.hero.hurtT = 0.3;
    G.hero.flashT = 0.2;
    burst(G, HERO_X + 6, HERO_GY - 42, 10, true);
    floatText(G, HERO_X + 16, HERO_GY - 96, '−8 HP', 'bad');
    cb.onHitVignette();
    doShake(G, 1, cb);
    SFX.hurt();
    if (G.hero.hp <= 0 && G.mode === 'playing') {
      G.mode = 'dying';
      G.overT = 0;
    }
  }
}

function stepFx(G: GameState, dt: number): void {
  for (const p of G.particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 190 * dt;
  }
  G.particles = G.particles.filter(p => p.life < p.max);
  for (const f of G.floats) {
    f.life += dt;
    f.y -= 26 * dt;
  }
  G.floats = G.floats.filter(f => f.life < 1.05);
}

export function updateGame(G: GameState, dt: number, cb: EngineCallbacks): void {
  G.time += dt;
  const hero = G.hero;
  hero.phase += dt * 2.2;
  hero.recoil *= Math.pow(0.0001, dt);
  if (hero.recoil < 0.05) hero.recoil = 0;
  hero.muzzleT = Math.max(0, hero.muzzleT - dt);
  hero.flashT = Math.max(0, hero.flashT - dt);
  hero.hurtT = Math.max(0, hero.hurtT - dt);
  G.shield.flashT = Math.max(0, G.shield.flashT - dt);
  G.shake = Math.max(0, G.shake - dt * 3);

  if (G.mode === 'dying') {
    hero.deadT = Math.min(1, hero.deadT + dt * 1.4);
    G.overT += dt;
    stepFx(G, dt);
    if (G.overT > 0.85) {
      G.mode = 'over';
      cb.onGameOver();
    }
    return;
  }

  if (G.mode !== 'playing') {
    stepFx(G, dt);
    return;
  }

  G.runTime += dt;

  G.spawnT -= dt;
  const cap = Math.min(6, 3 + G.wave);
  if (G.spawnT <= 0 && aliveEnemies(G).length < cap) {
    spawnEnemy(G, cb);
    G.spawnT = Math.max(1.05, 2.55 - G.wave * 0.15) * rand(0.75, 1.25);
  }

  for (const e of G.enemies) {
    e.flashT = Math.max(0, e.flashT - dt);
    e.shakeT = Math.max(0, e.shakeT - dt);
    e.muzzleT = Math.max(0, e.muzzleT - dt);
    if (e.state === 'dying') {
      e.deathT += dt / 0.55;
      continue;
    }
    e.x += e.kb * dt;
    e.kb *= Math.pow(0.0001, dt);
    if (e.x > LINE_X) {
      e.x -= e.speed * dt;
      e.phase += dt * (4 + e.speed * 0.09);
      if (e.x < LINE_X) e.x = LINE_X;
    } else {
      e.attackCd -= dt;
      if (e.attackCd <= 0) {
        fireEnemyBullet(G, e);
        e.attackCd = 1.35;
      }
    }
  }
  G.enemies = G.enemies.filter(e => !(e.state === 'dying' && e.deathT >= 1));

  for (const b of G.bullets) {
    const tp = b.from === 'hero'
      ? (b.target ? { x: b.target.x, y: b.target.gy - 42 * b.target.s } : { x: b.x + 10, y: b.y })
      : { x: HERO_X + 4, y: HERO_GY - 42 };
    const dx = tp.x - b.x;
    const dy = tp.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = b.speed * dt;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 5) b.trail.shift();
    if (d <= step + 4) {
      b.x = tp.x;
      b.y = tp.y;
      b.dead = true;
      bulletHit(G, b, cb);
    } else {
      b.x += (dx / d) * step;
      b.y += (dy / d) * step;
    }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
  stepFx(G, dt);
}

export function getHudSnapshot(G: GameState): HudSnapshot {
  const acc = G.total ? Math.round((G.correct / G.total) * 100) : 100;
  const mins = G.runTime / 60;
  const wpm = mins > 0.04 ? Math.round((G.correct / 5) / mins) : 0;
  const mult = 1 + Math.floor(G.streak / 12);
  const t = getTarget(G);
  const readout = G.mode === 'playing' && t
    ? `${t.isLine ? 'line' : 'target'} “${t.word}” · ${t.progress}/${t.word.length} · wave ${G.wave}`
    : G.mode === 'playing'
      ? `waiting for the next word · wave ${G.wave}`
      : G.mode === 'paused'
        ? 'paused'
        : G.mode === 'over' || G.mode === 'dying'
          ? 'hero down'
          : 'rest';

  return {
    mode: G.mode,
    hp: G.hero.hp,
    score: G.score,
    wave: G.wave,
    kills: G.kills,
    acc,
    wpm,
    streak: G.streak,
    bestStreak: G.bestStreak,
    mult,
    shieldActive: G.shield.active,
    cleanWords: G.shield.cleanWords,
    readout,
    targetWord: t ? t.word : null,
    targetProgress: t ? t.progress : 0,
    targetMarks: t ? [...t.marks] : [],
    targetIsLine: t ? t.isLine : false,
  };
}

/* =============== drawing =============== */

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function setStroke(ctx: CanvasRenderingContext2D, color: string, w = 1.2): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 6): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
}

function drawIsoBlock(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, P: Palette): void {
  const dx = 9;
  const dy = -6;
  ctx.fillStyle = P.plate;
  setStroke(ctx, P.mid, 1);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, gy);
  ctx.lineTo(x + w / 2, gy);
  ctx.lineTo(x + w / 2, gy - h);
  ctx.lineTo(x - w / 2, gy - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - w / 2, gy - h);
  ctx.lineTo(x - w / 2 + dx, gy - h + dy);
  ctx.lineTo(x + w / 2 + dx, gy - h + dy);
  ctx.lineTo(x + w / 2, gy - h);
  ctx.closePath();
  ctx.fill();
  setStroke(ctx, P.lo, 1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w / 2, gy);
  ctx.lineTo(x + w / 2 + dx, gy + dy);
  ctx.lineTo(x + w / 2 + dx, gy - h + dy);
  ctx.lineTo(x + w / 2, gy - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

interface StickDrawOpts {
  s: number;
  facing: number;
  color: string;
  type: 'hero' | EnemyType;
  isHero?: boolean;
  flash: number;
  muzzleT: number;
  deadT: number;
  shield?: boolean;
  shieldFlash?: number;
}

function drawStick(ctx: CanvasRenderingContext2D, p: Pose, o: StickDrawOpts, P: Palette): void {
  ctx.save();
  if (o.deadT > 0) {
    ctx.translate(p.footA.x, p.footA.y);
    ctx.rotate(-o.facing * o.deadT * 1.35);
    ctx.translate(-p.footA.x, -p.footA.y);
    ctx.globalAlpha = 1 - o.deadT * 0.9;
  }

  if (o.shield) {
    const sf = o.shieldFlash ?? 0;
    setStroke(ctx, sf > 0 ? P.hi : P.edge, sf > 0 ? 1.8 : 1.1);
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(p.head.x + 2, (p.head.y + p.footA.y) / 2 - 2, 37 * o.s, 52 * o.s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = sf > 0 ? P.hi : P.edge;
    ctx.font = '700 7.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHIELD', p.head.x + 2, p.head.y - 56 * o.s);
    ctx.textAlign = 'left';
  }

  const col = o.flash > 0 ? P.accent : o.color;
  setStroke(ctx, col, o.flash > 0 ? 1.9 : 1.45);

  line(ctx, p.hip.x, p.hip.y, p.kneeA.x, p.kneeA.y);
  line(ctx, p.kneeA.x, p.kneeA.y, p.footA.x, p.footA.y);
  line(ctx, p.hip.x, p.hip.y, p.kneeB.x, p.kneeB.y);
  line(ctx, p.kneeB.x, p.kneeB.y, p.footB.x, p.footB.y);

  line(ctx, p.neck.x, p.neck.y, p.hip.x, p.hip.y);
  line(ctx, p.shoulder.x, p.shoulder.y, p.backHand.x, p.backHand.y);
  line(ctx, p.shoulder.x, p.shoulder.y, p.hand.x, p.hand.y);

  setStroke(ctx, o.flash > 0 ? P.accent : P.hi, 1.7);
  line(
    ctx,
    p.hand.x - (p.muzzle.x - p.hand.x) * 0.25,
    p.hand.y - (p.muzzle.y - p.hand.y) * 0.25,
    p.muzzle.x,
    p.muzzle.y
  );
  line(ctx, p.muzzle.x, p.muzzle.y, p.muzzle.x, p.muzzle.y - 4 * o.s);

  setStroke(ctx, col, 1.45);
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, p.hr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(p.head.x + o.facing * 3.6 * o.s, p.head.y - 1, 1.15, 0, Math.PI * 2);
  ctx.fill();

  setStroke(ctx, col, 1.25);
  if (o.isHero) {
    line(ctx, p.head.x - p.hr, p.head.y - 2.5 * o.s, p.head.x + p.hr, p.head.y - 2.5 * o.s);
    line(ctx, p.head.x - p.hr, p.head.y - 2.5 * o.s, p.head.x - p.hr - 6 * o.s, p.head.y + 1);
  } else if (o.type === 'runner') {
    line(ctx, p.head.x, p.head.y - p.hr, p.head.x + 4 * o.s, p.head.y - p.hr - 8 * o.s);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p.head.x + 4.5 * o.s, p.head.y - p.hr - 9 * o.s, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.type === 'brute') {
    line(ctx, p.head.x - 4 * o.s, p.head.y - p.hr + 1, p.head.x - 10 * o.s, p.head.y - p.hr - 5 * o.s);
    line(ctx, p.head.x + 4 * o.s, p.head.y - p.hr + 1, p.head.x + 10 * o.s, p.head.y - p.hr - 5 * o.s);
    line(ctx, p.shoulder.x - 9 * o.s, p.shoulder.y - 4 * o.s, p.shoulder.x + 9 * o.s, p.shoulder.y - 4 * o.s);
  } else {
    line(ctx, p.head.x + 2 * o.s, p.head.y - p.hr + 1, p.head.x + 7 * o.s, p.head.y - p.hr - 6 * o.s);
  }

  if (o.muzzleT > 0) {
    setStroke(ctx, P.hi, 1.3);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const r = 7 * o.s;
      line(ctx, p.muzzle.x, p.muzzle.y, p.muzzle.x + Math.cos(a) * r, p.muzzle.y + Math.sin(a) * r);
    }
  }
  ctx.restore();
}

const bubbleFont = (e: Enemy) => `600 ${e.isLine ? 13 : 15}px ui-monospace, Menlo, Consolas, monospace`;

function bubbleRectFor(ctx: CanvasRenderingContext2D, e: Enemy): BubbleRect {
  ctx.font = bubbleFont(e);
  const charW = ctx.measureText('M').width + 1.5;
  const bw = charW * e.word.length + 20;
  const bh = 27;
  return {
    bx: clamp(e.x - bw / 2, 8, W - bw - 8),
    by: e.gy - 96 * e.s,
    bw,
    bh,
    charW,
  };
}

function layoutBubbles(ctx: CanvasRenderingContext2D, G: GameState, target: Enemy | null): Map<number, BubbleRect> {
  const placed: BubbleRect[] = [];
  const rects = new Map<number, BubbleRect>();
  const ordered = aliveEnemies(G).sort(
    (a, b) => (Number(b === target) - Number(a === target)) || (a.x - b.x)
  );
  for (const e of ordered) {
    const r = bubbleRectFor(ctx, e);
    let guard = 0;
    const hits = () => placed.some(
      q => r.bx < q.bx + q.bw + 5 && r.bx + r.bw + 5 > q.bx && r.by < q.by + q.bh + 9 && r.by + r.bh + 9 > q.by
    );
    while (hits() && r.by > 8 && guard++ < 8) {
      r.by -= r.bh + 7;
    }
    if (r.by < 8) r.by = 8;
    placed.push(r);
    rects.set(e.id, r);
  }
  return rects;
}

function drawWordBubble(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  isTarget: boolean,
  P: Palette,
  rect: BubbleRect
): void {
  const s = e.s;
  ctx.save();
  ctx.font = bubbleFont(e);
  if (e.isLine) {
    ctx.fillStyle = P.edge;
    ctx.font = '700 7.5px ui-monospace, monospace';
    ctx.fillText('— LINE —', rect.bx + 3, rect.by - 5);
    ctx.font = bubbleFont(e);
  }

  const { bw, bh, charW } = rect;
  let bx = rect.bx;
  const by = rect.by;
  if (e.shakeT > 0) bx += rand(-2.5, 2.5);

  setStroke(ctx, isTarget ? P.hi : P.edge, 1);
  ctx.setLineDash([2, 3]);
  line(ctx, clamp(e.x, bx + 10, bx + bw - 10), by + bh, e.x, e.gy - 70 * s);
  ctx.setLineDash([]);

  if (isTarget) {
    ctx.fillStyle = P.lo;
    ctx.strokeStyle = P.edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundedRect(ctx, bx + 3, by + 3, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = P.plate;
  ctx.strokeStyle = e.flashT > 0 ? P.accent : (isTarget ? P.hi : P.edge);
  ctx.lineWidth = isTarget ? 1.5 : 1;
  ctx.beginPath();
  drawRoundedRect(ctx, bx, by, bw, bh, 6);
  ctx.fill();
  ctx.stroke();

  let cx = bx + 10;
  for (let i = 0; i < e.word.length; i++) {
    const ch = e.word[i];
    const wrong = i < e.progress && e.marks[i] === false;
    if (wrong) {
      ctx.fillStyle = P.accent;
    } else if (i < e.progress) {
      ctx.fillStyle = P.mid;
    } else if (i === e.progress && isTarget) {
      ctx.fillStyle = P.hi;
    } else {
      ctx.fillStyle = P.hi;
      ctx.globalAlpha = isTarget ? 0.85 : 0.5;
    }
    ctx.fillText(ch, cx, by + 18.5);
    ctx.globalAlpha = 1;

    if (i < e.progress) {
      setStroke(ctx, wrong ? P.accent : P.mid, 1);
      line(ctx, cx, by + 14, cx + charW - 3, by + 14);
    }
    if (i === e.progress && isTarget) {
      setStroke(ctx, P.hi, 2);
      line(ctx, cx, by + 22.5, cx + charW - 3, by + 22.5);
    }
    cx += charW;
  }

  const remain = (e.word.length - e.progress) / e.word.length;
  setStroke(ctx, P.lo, 3);
  line(ctx, bx + 3, by + bh + 4.5, bx + bw - 3, by + bh + 4.5);
  setStroke(ctx, e.flashT > 0 ? P.accent : P.hi, 3);
  line(ctx, bx + 3, by + bh + 4.5, bx + 3 + (bw - 6) * remain, by + bh + 4.5);
  ctx.restore();
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  G: GameState,
  pillars: Pillar[],
  dark: boolean
): void {
  const P = getPalette(dark);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = P.plate;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (G.shake > 0) {
    ctx.translate(rand(-1, 1) * G.shake * 4, rand(-1, 1) * G.shake * 3);
  }

  ctx.fillStyle = P.lo;
  for (let gx = 46; gx < W - 20; gx += 46) {
    for (let gy = 44; gy < 268; gy += 46) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const pl of pillars) {
    drawIsoBlock(ctx, pl.x, pl.gy, pl.w, pl.h, P);
  }

  setStroke(ctx, P.edge, 1.2);
  line(ctx, 34, 352, W - 30, 352);
  setStroke(ctx, P.lo, 1);
  for (let x = 60; x < W - 40; x += 44) {
    line(ctx, x, 352, x - 15, 367);
  }
  setStroke(ctx, P.mid, 1);
  ctx.setLineDash([1, 4]);
  line(ctx, 34, 374, W - 30, 374);
  ctx.setLineDash([]);

  ctx.fillStyle = P.plate;
  setStroke(ctx, P.edge, 1.1);
  ctx.beginPath();
  ctx.moveTo(HERO_X - 52, 368);
  ctx.lineTo(HERO_X + 58, 368);
  ctx.lineTo(HERO_X + 44, 352);
  ctx.lineTo(HERO_X - 38, 352);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  setStroke(ctx, P.accent, 1);
  ctx.setLineDash([3, 5]);
  line(ctx, LINE_X, 300, LINE_X, 372);
  ctx.setLineDash([]);
  ctx.fillStyle = P.accent;
  ctx.font = '9px ui-monospace, monospace';
  ctx.fillText('THE LINE', LINE_X - 18, 292);

  const target = getTarget(G);

  if (target && (G.mode === 'playing' || G.mode === 'dying')) {
    const hp = heroPose(G);
    setStroke(ctx, P.edge, 1);
    ctx.setLineDash([2, 6]);
    line(ctx, hp.muzzle.x, hp.muzzle.y, target.x, target.gy - 42 * target.s);
    ctx.setLineDash([]);

    setStroke(ctx, P.hi, 1.1);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(target.x, target.gy + 5, 20 * target.s, 6 * target.s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const drawList = [...G.enemies].sort((a, b) => a.gy - b.gy);
  let heroDrawn = false;
  const maybeHero = (beforeGy: number) => {
    if (!heroDrawn && HERO_GY <= beforeGy) {
      const p = heroPose(G);
      drawStick(
        ctx,
        p,
        {
          s: 1.06,
          facing: 1,
          color: G.hero.hurtT > 0 ? P.accent : P.hi,
          type: 'hero',
          isHero: true,
          flash: G.hero.flashT,
          muzzleT: G.hero.muzzleT,
          deadT: G.hero.deadT,
          shield: G.shield.active,
          shieldFlash: G.shield.flashT,
        },
        P
      );
      heroDrawn = true;
    }
  };

  for (const e of drawList) {
    maybeHero(e.gy);
    const p = enemyPose(e);
    const isT = target === e;
    drawStick(
      ctx,
      p,
      {
        s: e.s,
        facing: -1,
        type: e.type,
        color: e.state === 'dying' ? P.edge : (isT ? P.hi : P.edge),
        flash: e.flashT,
        muzzleT: e.muzzleT,
        deadT: e.state === 'dying' ? e.deathT : 0,
      },
      P
    );
  }
  maybeHero(Infinity);

  const bubbleRects = layoutBubbles(ctx, G, target);
  const bubbleOrder = aliveEnemies(G).sort((a, b) => Number(a === target) - Number(b === target));
  for (const e of bubbleOrder) {
    const rect = bubbleRects.get(e.id);
    if (rect) drawWordBubble(ctx, e, target === e, P, rect);
  }

  for (const b of G.bullets) {
    const isHero = b.from === 'hero';
    setStroke(ctx, isHero ? P.hi : P.accent, isHero ? 1.4 : 1.6);
    for (let i = 1; i < b.trail.length; i++) {
      ctx.globalAlpha = (i / b.trail.length) * 0.4;
      line(ctx, b.trail[i - 1].x, b.trail[i - 1].y, b.trail[i].x, b.trail[i].y);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = isHero ? P.hi : P.accent;
    ctx.beginPath();
    ctx.arc(b.x, b.y, isHero ? 2.1 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (isHero && b.ch) {
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = P.hi;
      ctx.fillText(b.ch, b.x - 3, b.y - 8);
    }
  }

  for (const p of G.particles) {
    const a = Math.atan2(p.vy, p.vx);
    const lifeK = 1 - p.life / p.max;
    setStroke(ctx, p.accent ? P.accent : P.hi, 1.2);
    ctx.globalAlpha = lifeK;
    line(ctx, p.x, p.y, p.x - Math.cos(a) * p.len, p.y - Math.sin(a) * p.len);
    ctx.globalAlpha = 1;
  }

  ctx.font = '600 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (const f of G.floats) {
    ctx.globalAlpha = 1 - f.life / 1.05;
    ctx.fillStyle = f.kind === 'bad' ? P.accent : P.hi;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  if (G.mode === 'menu') {
    ctx.fillStyle = P.edge;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('fig. 01 — hero at rest · press START, then type', 40, 404);
  }

  ctx.restore();
}
