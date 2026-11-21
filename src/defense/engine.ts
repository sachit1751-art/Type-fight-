import { ensureAudio, SFX } from '../game/audio';
import { DailyChallenge, PlayVariant, recordDailyRun, WeaponType } from '../game/challenge';
import { WpmPoint } from '../game/types';
import {
  Cam,
  circ,
  clamp,
  disc,
  facing,
  fit,
  flatDot,
  lerp,
  mk,
  openPoly,
  place,
  poly,
  prism,
  proj,
  Pt2,
  Pt3,
  put,
  rad,
  ringAt,
  rings,
  rrect,
  run,
  seg,
  shiftRing,
  solid,
  SolidNode,
  spring,
  Spring,
  stepS,
  tdone,
  tset,
  turnedRing,
  tval,
  tween,
  Tween,
} from './kernel';
import { DEFENSE_LINES, DEFENSE_LONG, DEFENSE_MID, DEFENSE_SHORT, pickDefense, randDefense } from './words';

const VW = 960;
const VH = 430;
const AZ = -16;
const LANES = [20, 62, 104];
const LW = 42;
const BX0 = -48;
const BX1 = 480;
const BY0 = -10;
const BY1 = 134;
const KX = 0;
const KY = 62;
const PAD_X = 64;
const LINE_X = 104;
const STOP_X = 120;
const SPAWN_X = 432;
const GATE_X = 456;

export const TURRET_COST = [25, 45, 70];
const TURRET_RATE = [2.6, 1.8, 1.2];
const TURRET_REACH = [240, 330, 420];

type WalkerKind = 'runner' | 'walker' | 'brute' | 'herald';

interface WalkerSpec {
  hw: number;
  foot: number;
  body: [number, number];
  head: [number, number, number] | null;
  shoulders?: boolean;
  sign?: boolean;
  speed: number;
  dmg: number;
  bounty: number;
  atk: number;
}

const TYPES: Record<WalkerKind, WalkerSpec> = {
  runner: { hw: 6, foot: 2.6, body: [3, 13], head: null, speed: 21, dmg: 3, bounty: 2, atk: 1.3 },
  walker: { hw: 8, foot: 3.2, body: [4, 19], head: [5, 19, 28], speed: 14.5, dmg: 5, bounty: 3, atk: 1.6 },
  brute: { hw: 12, foot: 4.2, body: [5, 26], head: [6, 26, 35], shoulders: true, speed: 9.5, dmg: 9, bounty: 6, atk: 2.0 },
  herald: { hw: 8, foot: 3.2, body: [4, 19], head: [5, 19, 28], sign: true, speed: 10, dmg: 5, bounty: 6, atk: 1.8 },
};

type PartTemplate = {
  kind: string;
  ring: ReturnType<typeof rrect>;
  inner: ReturnType<typeof rrect>;
  z0: number;
  z1: number;
};

function partsOf(T: WalkerSpec): PartTemplate[] {
  const hw = T.hw;
  const list: Array<[string, number, number, number, number, number, number, number, number]> = [];
  if (T.sign) {
    list.push(['post', 6.4, -0.9, 8.2, 0.9, 10, 46, 0.8, 0.3]);
    list.push(['sign', 6.8, -13, 8.6, 13, 32, 46, 0.8, 0.3]);
  }
  const f = T.foot;
  list.push(['footL', -f, -hw + 0.5, f, -hw + 0.5 + f * 1.4, 0, 4, 1.2, 0.5]);
  list.push(['footR', -f, hw - 0.5 - f * 1.4, f, hw - 0.5, 0, 4, 1.2, 0.5]);
  if (T.shoulders) list.push(['shL', -5, -hw - 6, 5, -hw + 3, T.body[1] - 9, T.body[1] + 2, 3, 1]);
  list.push(['body', -hw, -hw, hw, hw, T.body[0], T.body[1], hw * 0.42, 1.2]);
  if (T.head) {
    const hh = T.head[0];
    list.push(['head', -hh, -hh, hh, hh, T.head[1], T.head[2], hh * 0.45, 0.9]);
  }
  if (T.shoulders) list.push(['shR', -5, hw - 3, 5, hw + 6, T.body[1] - 9, T.body[1] + 2, 3, 1]);
  return list.map(([kind, x0, y0, x1, y1, z0, z1, r, b]) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    return { kind, ring, inner, z0, z1 };
  });
}

const TEMPLATES: Record<WalkerKind, PartTemplate[]> = {
  runner: partsOf(TYPES.runner),
  walker: partsOf(TYPES.walker),
  brute: partsOf(TYPES.brute),
  herald: partsOf(TYPES.herald),
};

export interface DefenseHudSnapshot {
  running: boolean;
  paused: boolean;
  over: boolean;
  variant: PlayVariant;
  challengeName: string | null;
  weaponLabel: string;
  hp: number;
  maxHp: number;
  ink: number;
  score: number;
  wave: number;
  kills: number;
  acc: number;
  wpm: number;
  mult: number;
  streak: number;
  bestStreak: number;
  bestScore: number;
  shield: number;
  cleanRun: number;
  inter: number;
  readout: string;
  targetWord: string | null;
  targetPos: number;
  targetMarks: string[];
  turrets: Array<{ level: number; cost: number; max: boolean; can: boolean }>;
  padTags: Array<{ xPct: number; yPct: number; cost: number; max: boolean; can: boolean }>;
  wpmHistory: WpmPoint[];
}

export interface DefenseCallbacks {
  onHud: (snap: DefenseHudSnapshot) => void;
  onFeed: (html: string) => void;
  onBanner: (title: string | null, sub?: string) => void;
  onShake: () => void;
}

interface EnemyEntity {
  id: number;
  type: WalkerKind;
  T: WalkerSpec;
  lane: number;
  x: number;
  y: number;
  word: string;
  marks: string[];
  pos: number;
  end: number;
  clean: boolean;
  speed: number;
  phase: number;
  drop: Tween;
  atk: number;
  dying: boolean;
  dieAt: number;
  g: SVGGElement;
  ringEl: SVGPathElement;
  parts: Array<PartTemplate & { s: SolidNode }>;
  visor: SVGPathElement;
  bubble: HTMLDivElement;
  dirty: boolean;
  flash: number;
}

interface BoltEntity {
  from: Pt3;
  to: Pt3;
  dur: number;
  arc: number;
  t: number;
  el: SVGCircleElement;
  onHit?: () => void;
}

interface ShardEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  a: ReturnType<typeof rrect>;
  b: ReturnType<typeof rrect>;
  s: number;
  life: number;
  el: SolidNode;
}

interface RippleEntity {
  x: number;
  y: number;
  t: number;
  el: SVGPathElement;
}

interface TurretEntity {
  lane: number;
  x: number;
  y: number;
  g: SVGGElement;
  lv: SVGEllipseElement[];
  parts: { base: SolidNode; drum: SolidNode; barrel: SolidNode; cap: SolidNode };
  level: number;
  cd: number;
  h: Tween;
  aim: Spring;
  recoil: Spring;
  d: number;
  drawn: string;
}

const BEST_KEY = 'typing-defense-best';

export class TypingDefenseController {
  private boardEl: HTMLElement;
  private labelsEl: HTMLElement;
  private fieldEl: HTMLElement;
  private cb: DefenseCallbacks;

  private svg: SVGSVGElement;
  private gLive: SVGGElement;
  private gFx: SVGGElement;
  private P: (x: number, y: number, z: number) => Pt2;
  private front: ReturnType<typeof facing>;
  private depth: (x: number, y: number) => number;
  private pct: (q: Pt2) => [number, number];

  private keepWindows: SVGPathElement[] = [];
  private keepPennant!: SolidNode;
  private keepShield: SVGPathElement[] = [];
  private turrets: TurretEntity[] = [];
  private props: Array<{ g: SVGGElement; d: number }> = [];
  private padTagsPos: Array<{ xPct: number; yPct: number }> = [];

  private G = this.freshState();
  private target: EnemyEntity | null = null;
  private uid = 0;
  private rafId = 0;
  private lastTs = 0;
  private destroyed = false;
  private lastLabelW = 0;
  private fontU = 13;
  private wpmSampleT = 1.5;

  constructor(
    boardEl: HTMLElement,
    labelsEl: HTMLElement,
    fieldEl: HTMLElement,
    cb: DefenseCallbacks
  ) {
    this.boardEl = boardEl;
    this.labelsEl = labelsEl;
    this.fieldEl = fieldEl;
    this.cb = cb;

    this.svg = mk('svg', { viewBox: `0 0 ${VW} ${VH}`, 'aria-hidden': 'true' }, this.boardEl);

    const C = Cam(AZ, 0.5, 1);
    const FRAME: Pt3[] = [
      [BX0, BY0, -9],
      [BX1, BY0, -9],
      [BX0, BY1, -9],
      [BX1, BY1, -9],
      [KX, KY, 122],
      [GATE_X, BY0, 64],
      [GATE_X, BY1, 64],
      [SPAWN_X, LANES[0], 80],
    ];
    fit(C, FRAME, 0, 0);
    const P0 = proj(C);
    let a = 1e9;
    let b = -1e9;
    let c = 1e9;
    let d = -1e9;
    for (const p of FRAME) {
      const q = P0(...p);
      a = Math.min(a, q[0]);
      b = Math.max(b, q[0]);
      c = Math.min(c, q[1]);
      d = Math.max(d, q[1]);
    }
    C.S = Math.min((VW - 36) / (b - a), (VH - 30) / (d - c));
    fit(C, FRAME, VW / 2, VH / 2 + 8);

    this.P = proj(C);
    this.front = facing(C);
    const SA = Math.sin(rad(AZ));
    const CA = Math.cos(rad(AZ));
    this.depth = (x: number, y: number) => x * SA + y * CA;
    this.pct = (q: Pt2) => [(q[0] / VW) * 100, (q[1] / VH) * 100];

    const gBoard = mk('g', {}, this.svg);
    const gKeepBack = mk('g', {}, this.svg);
    const gKeep = mk('g', {}, this.svg);
    const gKeepFront = mk('g', {}, this.svg);
    this.gLive = mk('g', {}, this.svg);
    this.gFx = mk('g', {}, this.svg);

    const block = (
      parent: Element,
      ring: ReturnType<typeof rrect>,
      inner: ReturnType<typeof rrect>,
      z0: number,
      z1: number,
      cls?: string
    ) => {
      const s = solid(parent);
      put(s, prism(this.P, this.front, ring, inner, z0, z1));
      if (cls) s.sil.setAttribute('class', cls);
      return s;
    };

    // Board & lanes
    {
      const [r0, r1] = rings(BX0, BY0, BX1, BY1, 14, 2.4);
      block(gBoard, r0, r1, -9, 0);
      for (const y of [LANES[0] + LW / 2, LANES[1] + LW / 2]) {
        mk('path', { d: seg(this.P(PAD_X + 22, y, 0), this.P(GATE_X - 14, y, 0)), class: 'nf lo dash' }, gBoard);
      }
      mk('path', { d: seg(this.P(LINE_X, BY0 + 6, 0), this.P(LINE_X, BY1 - 6, 0)), class: 'nf dash' }, gBoard);
      for (const y of [BY0 + 6, LANES[0] + LW / 2, LANES[1] + LW / 2, BY1 - 6]) {
        const [g0, g1] = rings(GATE_X - 6, y - 6, GATE_X + 6, y + 6, 3, 1);
        block(gBoard, g0, g1, 0, 56);
      }
      const [l0, l1] = rings(GATE_X - 9, BY0, GATE_X + 9, BY1, 4, 1.4);
      block(gBoard, l0, l1, 56, 64);
    }

    // Keep
    {
      const [p0, p1] = rings(KX - 32, KY - 52, KX + 28, KY + 52, 10, 2);
      block(gKeep, p0, p1, 0, 10);
      const side = (y: number) => {
        const [sa, sb] = disc(KX - 8, y, 11, 1.4);
        block(gKeep, sa, sb, 10, 58);
        const [sc, sd] = disc(KX - 8, y, 13.5, 1.6);
        block(gKeep, sc, sd, 58, 64);
      };
      side(KY - 38);
      const [t0, t1] = disc(KX, KY, 22, 2);
      block(gKeep, t0, t1, 10, 92);

      const face = (Math.atan2(CA, SA) * 180) / Math.PI;
      for (const [z0, z1] of [
        [66, 76],
        [44, 54],
      ]) {
        for (const o of [-48, -24, 0, 24, 48]) {
          const ang = rad(face + o);
          const x = KX + 22 * Math.cos(ang);
          const y = KY + 22 * Math.sin(ang);
          this.keepWindows.push(mk('path', { d: seg(this.P(x, y, z0), this.P(x, y, z1)), class: 'nf sil' }, gKeep));
        }
      }

      const [c0, c1] = disc(KX, KY, 26, 2.2, 16);
      block(gKeep, c0, c1, 92, 100);
      const merl: Pt2[] = [];
      for (let k = 0; k < 10; k++) {
        const ang = rad(k * 36);
        merl.push([KX + 22.5 * Math.cos(ang), KY + 22.5 * Math.sin(ang)]);
      }
      merl.sort((p, q) => this.depth(p[0], p[1]) - this.depth(q[0], q[1]));
      for (const [x, y] of merl) {
        const [m0, m1] = rings(x - 3, y - 3, x + 3, y + 3, 1.3, 0.6);
        block(gKeep, m0, m1, 100, 105);
      }

      const [f0, f1] = rings(KX - 0.8, KY - 0.8, KX + 0.8, KY + 0.8, 0.8, 0.3);
      block(gKeep, f0, f1, 100, 124);
      const [g0, g1] = rings(KX, KY - 0.7, KX + 15, KY + 0.7, 0.6, 0.25);
      this.keepPennant = block(gKeep, g0, g1, 115, 123);
      side(KY + 38);

      for (const [z, R] of [
        [2, 74],
        [46, 64],
        [92, 42],
        [118, 16],
      ]) {
        const ring = circ(R, 64).map(q => ({ ...q, u: q.u + KX, v: q.v + KY }));
        this.keepShield.push(
          mk('path', { d: openPoly(ringAt(this.P, run(ring, q => !this.front(q)), z)), class: 'nf dash', visibility: 'hidden' }, gKeepBack)
        );
        this.keepShield.push(
          mk('path', { d: openPoly(ringAt(this.P, run(ring, this.front), z)), class: 'nf dash', visibility: 'hidden' }, gKeepFront)
        );
      }
    }

    // Turrets on 3 lanes
    this.turrets = LANES.map((ly, lane) => {
      const g = mk('g', {}, this.gLive);
      const [r0, r1] = rings(PAD_X - 12, ly - 12, PAD_X + 12, ly + 12, 4, 1);
      block(g, r0, r1, 0, 1.8);
      const lv = [0, 1, 2].map(k => {
        const dot = flatDot(g, C, 1.3, 'dot off');
        place(dot, this.P(PAD_X + 9, ly - 6 + 6 * k, 1.8));
        return dot;
      });
      const parts = {
        base: solid(g),
        drum: solid(g),
        barrel: solid(g),
        cap: solid(g),
      };
      for (const s of Object.values(parts)) s.g.setAttribute('visibility', 'hidden');
      return {
        lane,
        x: PAD_X,
        y: ly,
        g,
        lv,
        parts,
        level: 0,
        cd: 0,
        h: tween(0),
        aim: spring(-12),
        recoil: spring(0, { k: 260, c: 22 }),
        d: this.depth(PAD_X, ly),
        drawn: '',
      };
    });

    // Line stones & lane dots
    for (const [x, y, h] of [
      [LINE_X, BY0 + 2, 14],
      [LINE_X, BY1 - 2, 14],
    ]) {
      const g = mk('g', {}, this.gLive);
      const [r0, r1] = rings(x - 3.5, y - 3.5, x + 3.5, y + 3.5, 1.4, 0.7);
      block(g, r0, r1, 0, h);
      this.props.push({ g, d: this.depth(x, y) });
    }
    for (let i = 0; i < LANES.length; i++) {
      const ly = LANES[i];
      for (let k = 0; k <= i; k++) {
        const dDot = flatDot(gBoard, C, 1.2, 'dot m');
        place(dDot, this.P(PAD_X + 18, ly - 3 * i + 6 * k, 0));
      }
      const [px, py] = this.pct(this.P(PAD_X - 2, ly + 18, 0));
      this.padTagsPos.push({ xPct: px, yPct: py });
    }

    this.emitHud();
    this.startLoop();
  }

  private getBestScore(): number {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }

  private setBestScore(v: number): void {
    try {
      localStorage.setItem(BEST_KEY, String(v));
    } catch {
      /* ignore */
    }
  }

  private freshState(
    variant: PlayVariant = 'standard',
    challenge: DailyChallenge | null = null
  ) {
    const ch = variant === 'daily' ? challenge : null;
    return {
      running: false,
      paused: false,
      over: false,
      variant,
      challenge: ch,
      weapon: (ch?.weapon ?? 'standard') as WeaponType,
      weaponCharge: 0,
      t: 0,
      playT: 0,
      wave: 0,
      toSpawn: 0,
      spawnT: 0,
      interval: 2.5,
      speedMul: ch?.enemySpeedMul ?? 1,
      inter: 0,
      hp: ch?.startingHp ?? 100,
      maxHp: ch?.maxHp ?? 100,
      ink: ch?.startingInk ?? 25,
      score: 0,
      streak: 0,
      bestStreak: 0,
      cleanRun: 0,
      shield: 0,
      correct: 0,
      wrong: 0,
      kills: 0,
      enemies: [] as EnemyEntity[],
      bolts: [] as BoltEntity[],
      shards: [] as ShardEntity[],
      ripples: [] as RippleEntity[],
      wpmHistory: [{ t: 0, wpm: 0 }] as WpmPoint[],
    };
  }

  private isReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private mult(): number {
    return Math.min(5, 1 + Math.floor(this.G.streak / 15));
  }

  private currentWpm(): number {
    return this.G.playT > 3 ? Math.round(this.G.correct / 5 / (this.G.playT / 60)) : 0;
  }

  public getSnapshot(): DefenseHudSnapshot {
    const tot = this.G.correct + this.G.wrong;
    const acc = tot ? Math.round((this.G.correct / tot) * 100) : 100;
    const wpm = this.currentWpm();
    const readout = this.target
      ? `${this.target.type} · lane ${this.target.lane + 1}`
      : this.G.running
        ? 'no target'
        : 'rest';

    return {
      running: this.G.running,
      paused: this.G.paused,
      over: this.G.over,
      variant: this.G.variant,
      challengeName: this.G.challenge?.name ?? null,
      weaponLabel: this.G.challenge?.weaponLabel ?? 'Standard Tower',
      hp: Math.ceil(this.G.hp),
      maxHp: this.G.maxHp,
      ink: this.G.ink,
      score: this.G.score,
      wave: this.G.wave,
      kills: this.G.kills,
      acc,
      wpm,
      mult: this.mult(),
      streak: this.G.streak,
      bestStreak: this.G.bestStreak,
      bestScore: this.getBestScore(),
      shield: this.G.shield,
      cleanRun: this.G.cleanRun,
      inter: this.G.inter,
      readout,
      targetWord: this.target ? this.target.word : null,
      targetPos: this.target ? this.target.pos : 0,
      targetMarks: this.target ? [...this.target.marks] : [],
      turrets: this.turrets.map(t => {
        const max = t.level >= 3;
        const cost = TURRET_COST[t.level] ?? 70;
        const can = !max && this.G.ink >= cost && this.G.running;
        return { level: t.level, cost, max, can };
      }),
      padTags: this.turrets.map((t, i) => {
        const max = t.level >= 3;
        const cost = TURRET_COST[t.level] ?? 70;
        const can = !max && this.G.ink >= cost && this.G.running;
        return {
          xPct: this.padTagsPos[i]?.xPct ?? 20,
          yPct: this.padTagsPos[i]?.yPct ?? 60,
          cost,
          max,
          can,
        };
      }),
      wpmHistory: [...this.G.wpmHistory],
    };
  }

  private emitHud(): void {
    this.keepShield.forEach(p => p.setAttribute('visibility', this.G.shield ? 'visible' : 'hidden'));
    const hpRatio = this.G.hp / this.G.maxHp;
    this.keepWindows.forEach((wEl, i) =>
      wEl.setAttribute('class', i < Math.ceil(hpRatio * 10) ? 'nf sil' : 'nf lo')
    );
    this.keepPennant.sil.classList.toggle('hi', !this.target);
    this.cb.onHud(this.getSnapshot());
  }

  private floatText(worldPt: Pt3, text: string, bad = false): void {
    const [x, y] = this.pct(this.P(...worldPt));
    const el = document.createElement('span');
    el.className = 'td-float' + (bad ? ' bad' : '');
    el.textContent = text;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    this.labelsEl.appendChild(el);
    window.setTimeout(() => el.remove(), 850);
  }

  private clearField(): void {
    for (const e of this.G.enemies) {
      e.g.remove();
      e.bubble.remove();
    }
    for (const b of this.G.bolts) b.el.remove();
    for (const s of this.G.shards) s.el.g.remove();
    for (const r of this.G.ripples) r.el.remove();
    const now = performance.now();
    this.turrets.forEach(t => {
      t.level = 0;
      t.cd = 0;
      t.drawn = '';
      tset(t.h, 0, now, 0, this.isReducedMotion());
      t.lv.forEach(d => d.setAttribute('class', 'dot off'));
      window.setTimeout(() => {
        if (!t.level) {
          for (const s of Object.values(t.parts)) s.g.setAttribute('visibility', 'hidden');
        }
      }, 750);
    });
  }

  public start(
    variant: PlayVariant = 'standard',
    challenge: DailyChallenge | null = null
  ): void {
    this.clearField();
    this.G = this.freshState(variant, challenge);
    this.target = null;
    this.wpmSampleT = 1.5;
    this.G.running = true;
    this.G.wave = 0;
    this.G.inter = 5;
    const chSub =
      variant === 'daily' && challenge
        ? `${challenge.weaponLabel} · ${this.G.ink} ink · press 1, 2 or 3 to build`
        : `you have ${this.G.ink} ink — press 1, 2 or 3 to build a turret`;
    this.cb.onBanner('Wave 1 in 5', chSub);
    this.cb.onFeed(
      variant === 'daily' && challenge
        ? `<b>${challenge.name}</b> active — ${challenge.weaponDesc}`
        : 'type the first letter of any word to lock on — <b>1 · 2 · 3</b> build turrets'
    );
    ensureAudio();
    this.emitHud();
  }

  public pause(force?: boolean): void {
    if (!this.G.running) return;
    this.G.paused = force ?? !this.G.paused;
    this.emitHud();
  }

  public build(lane: number): void {
    const t = this.turrets[lane];
    if (!t || !this.G.running || this.G.paused) return;
    if (t.level >= 3) {
      SFX.nope();
      this.cb.onFeed(`turret ${lane + 1} is at full level`);
      return;
    }
    const cost = TURRET_COST[t.level];
    if (this.G.ink < cost) {
      SFX.nope();
      this.cb.onFeed(`turret ${lane + 1} needs <b>${cost}</b> ink — you have ${this.G.ink}`);
      return;
    }
    this.G.ink -= cost;
    t.level++;
    t.cd = 0.6;
    for (const s of Object.values(t.parts)) s.g.setAttribute('visibility', 'visible');
    tset(t.h, [0, 6, 12, 19][t.level], performance.now(), 0, this.isReducedMotion());
    t.lv.forEach((d, k) => d.setAttribute('class', 'dot ' + (k < t.level ? 'm' : 'off')));
    SFX.build();
    this.cb.onFeed(`turret <b>${lane + 1}</b> → level ${t.level}`);
    this.floatText([t.x, t.y, 30], `L${t.level}`);
    this.emitHud();
  }

  private trimTrailingLetter(targetEnemy: EnemyEntity, tag: string): void {
    if (targetEnemy.dying || targetEnemy.end - 1 <= targetEnemy.pos) return;
    targetEnemy.end--;
    targetEnemy.marks[targetEnemy.end] = 'cut';
    targetEnemy.dirty = true;
    const kill = targetEnemy.pos >= targetEnemy.end;
    if (kill) {
      targetEnemy.dying = true;
      targetEnemy.bubble.classList.add('dying');
      targetEnemy.dieAt = this.G.t + 0.6;
      if (this.target === targetEnemy) this.retarget(null);
    }
    this.bolt([KX + 2, KY, 106], this.headOf(targetEnemy), 0.22, 16, 'dot hi', 2.4, () => {
      targetEnemy.flash = 0.14;
      this.shards(targetEnemy, 2);
      if (kill) this.explode(targetEnemy);
    });
    this.floatText(this.headOf(targetEnemy), tag);
  }

  public handleChar(chRaw: string): void {
    if (!this.G.running || this.G.paused) return;
    const ch = chRaw.toLowerCase();
    if (!/^[a-z ]$/.test(ch)) return;

    let t = this.target && !this.target.dying ? this.target : null;
    if (!t || t.pos === 0) {
      const pool = this.live();
      if (!(t && t.word[0] === ch)) {
        const m = this.nearest(pool.filter(e => e.pos === 0 && e.word[0] === ch));
        if (m) t = m;
        else if (!t) t = this.nearest(pool);
      }
    }
    if (!t) {
      this.cb.onFeed('nothing on the field yet');
      return;
    }
    if (t !== this.target) this.retarget(t);

    const want = t.word[t.pos];
    const i = t.pos;
    if (ch === want) {
      t.marks[i] = 'ok';
      this.G.correct++;
      this.G.streak++;
      this.G.weaponCharge++;
      this.G.bestStreak = Math.max(this.G.bestStreak, this.G.streak);
      this.G.ink += 1;
      const cMul = this.G.challenge?.scoreMul ?? 1;
      this.G.score += Math.round(10 * this.mult() * cMul);

      // Challenge weapon discharge effects
      let firedSpecial = false;
      if (this.G.weapon === 'rail' && this.G.weaponCharge % 4 === 0) {
        SFX.rail();
        firedSpecial = true;
        if (t.end - 1 > t.pos + 1) {
          t.end--;
          t.marks[t.end] = 'cut';
        }
        this.floatText(this.headOf(t), 'RAIL ×2');
      } else if (this.G.weapon === 'hyper' && this.G.weaponCharge % 2 === 0) {
        if (t.end - 1 > t.pos + 1) {
          t.end--;
          t.marks[t.end] = 'cut';
          this.floatText(this.headOf(t), 'HYPER');
        }
      } else if (this.G.weapon === 'twin' && this.G.weaponCharge % 3 === 0) {
        const second = this.nearest(this.live().filter(e => e.id !== t.id && e.end - e.pos > 1));
        if (second) this.trimTrailingLetter(second, 'TWIN');
      } else if (this.G.weapon === 'scatter' && this.G.weaponCharge % 4 === 0) {
        const others = this.live()
          .filter(e => e.id !== t.id && e.end - e.pos > 1)
          .sort((a, b) => a.x - b.x)
          .slice(0, 2);
        if (others.length) {
          SFX.scatter();
          firedSpecial = true;
          others.forEach(o => this.trimTrailingLetter(o, 'SCATTER'));
        }
      }

      if (!firedSpecial) SFX.shoot();
      const last = t.pos + 1 >= t.end;
      const locked = t;
      this.bolt([KX + 2, KY, 106], this.headOf(locked), 0.26, 26, 'dot', firedSpecial ? 3.2 : 2.6, () => {
        locked.flash = 0.12;
        SFX.hit();
        if (last) this.explode(locked);
        else this.shards(locked, 2);
      });
    } else {
      t.marks[i] = 'bad';
      t.clean = false;
      this.G.wrong++;
      this.G.streak = 0;
      this.G.weaponCharge = 0;
      this.G.cleanRun = 0;
      if (this.G.shield > 0) {
        this.G.shield = 0;
        this.cb.onFeed('<span class="bad">typo — the shield drops</span>');
      } else {
        this.cb.onFeed(
          `<span class="bad">typo</span> — wanted <b>${want === ' ' ? '␣' : want}</b>, got <b>${ch === ' ' ? '␣' : ch}</b>`
        );
      }
      SFX.wrong();
      window.setTimeout(() => SFX.eshoot(), 60);
      const typoDmg = this.G.challenge?.typoDmgDefense ?? 3;
      this.bolt(this.headOf(t), [KX + 8, KY, 64], 0.55, 22, 'dot m', 3, () => this.damage(typoDmg));
      this.floatText(this.headOf(t), '✕', true);
    }

    t.pos++;
    t.dirty = true;
    if (t.pos >= t.end) this.finishWord(t);
    this.emitHud();
  }

  private finishWord(t: EnemyEntity): void {
    t.dying = true;
    t.bubble.classList.add('dying');
    const cMul = this.G.challenge?.scoreMul ?? 1;
    if (t.clean) {
      const heal = this.G.challenge?.cleanHeal ?? 2;
      this.G.cleanRun++;
      this.G.hp = Math.min(this.G.maxHp, this.G.hp + heal);
      this.G.ink += 3;
      this.G.score += Math.round(25 * this.mult() * cMul);
      if (this.G.cleanRun % 2 === 0) {
        const was = this.G.shield;
        this.G.shield = 3;
        if (!was) {
          SFX.shield();
          this.cb.onFeed('<b>shield up</b> — two clean words · soaks three hits · drops on a typo');
        }
      } else {
        this.cb.onFeed(`<b>clean</b> · +${heal} keep · +3 ink`);
      }
    } else {
      this.cb.onFeed('word done — with typos, no heal');
    }
    this.G.score += Math.round(t.word.length * 5 * this.mult() * cMul);
    SFX.word();
    if (this.target === t) this.retarget(null);
    t.dieAt = this.G.t + 0.6;
  }

  private explode(e: EnemyEntity): void {
    if (!this.G.enemies.includes(e)) return;
    this.G.enemies = this.G.enemies.filter(x => x !== e);
    this.shards(e, e.type === 'brute' ? 12 : 8, true);
    this.ripple(e.x, e.y);
    this.G.kills++;
    this.G.ink += e.T.bounty;
    this.floatText([e.x, e.y, this.topOf(e)], `+${e.T.bounty} ink`);
    if (this.target === e) this.retarget(null);
    e.g.remove();
    window.setTimeout(() => e.bubble.remove(), 260);
    SFX.die();
    this.emitHud();
  }

  private damage(n: number): void {
    if (!this.G.running) return;
    if (this.G.shield > 0) {
      this.G.shield--;
      SFX.block();
      this.floatText([KX, KY, 112], this.G.shield ? 'blocked' : 'shield down');
      this.emitHud();
      return;
    }
    this.G.hp = Math.max(0, this.G.hp - n);
    SFX.hurt();
    this.floatText([KX + 4, KY, 100], `−${n}`, true);
    this.cb.onShake();
    this.emitHud();
    if (this.G.hp <= 0) this.gameOver();
  }

  private gameOver(): void {
    this.G.running = false;
    this.G.over = true;
    const best = Math.max(this.getBestScore(), this.G.score);
    this.setBestScore(best);

    if (this.G.variant === 'daily' && this.G.challenge) {
      recordDailyRun('defense', this.G.challenge.dateKey, this.G.score, this.G.wave, this.G.kills);
    }

    const finalWpm = this.currentWpm();
    const lastPt = this.G.wpmHistory[this.G.wpmHistory.length - 1];
    if (!lastPt || this.G.playT - lastPt.t > 0.25) {
      this.G.wpmHistory.push({ t: Math.round(this.G.playT * 10) / 10, wpm: finalWpm });
    }

    this.cb.onBanner(null);
    SFX.die();
    this.cb.onFeed('the keep has fallen — <b>Enter</b> to play again');
    this.emitHud();
  }

  private retarget(t: EnemyEntity | null): void {
    if (this.target && this.target !== t && this.G.enemies.includes(this.target)) {
      this.setLit(this.target, false);
    }
    this.target = t;
    if (t) this.setLit(t, true);
  }

  private setLit(e: EnemyEntity, on: boolean): void {
    for (const p of e.parts) p.s.sil.classList.toggle('hi', on);
    e.visor.setAttribute('class', on ? 'nf hi' : 'nf');
    e.ringEl.setAttribute('visibility', on ? 'visible' : 'hidden');
    e.bubble.classList.toggle('target', on);
  }

  private nearest(list: EnemyEntity[]): EnemyEntity | null {
    return list.reduce<EnemyEntity | null>((m, e) => (!m || e.x < m.x ? e : m), null);
  }

  private live(): EnemyEntity[] {
    return this.G.enemies.filter(e => !e.dying);
  }

  private chooseType(w: number): WalkerKind {
    const bias = this.G.challenge?.bias ?? 'balanced';
    const wts: Record<WalkerKind, number> =
      bias === 'runner'
        ? {
            runner: 0.56,
            walker: 0.3,
            brute: w >= 2 ? Math.min(0.24, 0.03 + 0.03 * w) : 0,
            herald: w >= 3 ? Math.min(0.16, 0.03 + 0.02 * w) : 0,
          }
        : bias === 'brute'
          ? {
              runner: 0.18,
              walker: 0.42,
              brute: w >= 1 ? Math.min(0.45, 0.14 + 0.05 * w) : 0.18,
              herald: w >= 2 ? Math.min(0.25, 0.06 + 0.03 * w) : 0,
            }
          : {
              runner: 0.32,
              walker: 0.5,
              brute: w >= 2 ? Math.min(0.32, 0.04 + 0.04 * w) : 0,
              herald: w >= 3 ? Math.min(0.2, 0.04 + 0.025 * w) : 0,
            };
    let s = Object.values(wts).reduce((a, b) => a + b, 0) * Math.random();
    for (const [k, v] of Object.entries(wts) as Array<[WalkerKind, number]>) {
      if ((s -= v) <= 0) return k;
    }
    return 'walker';
  }

  private chooseWord(type: WalkerKind, w: number): string {
    const pool =
      type === 'herald'
        ? DEFENSE_LINES
        : type === 'runner'
          ? DEFENSE_SHORT
          : type === 'brute'
            ? w >= 4
              ? DEFENSE_LONG
              : DEFENSE_MID
            : w <= 2
              ? DEFENSE_SHORT.concat(DEFENSE_MID.filter(m => m.length <= 6))
              : w <= 5
                ? DEFENSE_MID
                : DEFENSE_MID.concat(DEFENSE_LONG);
    const used = new Set(this.G.enemies.filter(e => !e.dying).map(e => e.word[0]));
    for (let i = 0; i < 40; i++) {
      const wd = pickDefense(pool);
      if (!used.has(wd[0]) && !this.G.enemies.some(e => e.word === wd)) return wd;
    }
    return pickDefense(pool);
  }

  private spawn(): boolean {
    const type = this.chooseType(this.G.wave);
    const T = TYPES[type];
    const free = [0, 1, 2].filter(l => !this.G.enemies.some(e => e.lane === l && e.x > SPAWN_X - 34));
    if (!free.length) return false;
    const lane = pickDefense(free);
    const word = this.chooseWord(type, this.G.wave);
    const g = mk('g', {}, this.gLive);
    const ringEl = mk('path', { class: 'nf dash', visibility: 'hidden' }, g);
    const parts = TEMPLATES[type].map(p => ({ ...p, s: solid(g) }));
    const visor = mk('path', { class: 'nf' }, g);
    const bubble = document.createElement('div');
    bubble.className = 'td-bubble' + (type === 'herald' ? ' line' : '');
    this.labelsEl.appendChild(bubble);

    const drop = tween(70);
    tset(drop, 0, performance.now(), 0, this.isReducedMotion());

    const e: EnemyEntity = {
      id: ++this.uid,
      type,
      T,
      lane,
      x: SPAWN_X,
      y: LANES[lane] + randDefense(-3, 3),
      word,
      marks: Array(word.length).fill(''),
      pos: 0,
      end: word.length,
      clean: true,
      speed: T.speed * this.G.speedMul * randDefense(0.92, 1.08),
      phase: randDefense(0, 6),
      drop,
      atk: T.atk * 0.6,
      dying: false,
      dieAt: 0,
      g,
      ringEl,
      parts,
      visor,
      bubble,
      dirty: true,
      flash: 0,
    };
    this.G.enemies.push(e);
    return true;
  }

  private headOf(e: EnemyEntity): Pt3 {
    return [e.x - 2, e.y, (e.T.head ? e.T.head[2] : e.T.body[1]) - 4];
  }

  private topOf(e: EnemyEntity): number {
    return (
      (e.T.sign ? 46 : e.T.head ? e.T.head[2] : e.T.body[1]) +
      7 +
      tval(e.drop, performance.now(), this.isReducedMotion())
    );
  }

  private tipOf(t: TurretEntity): Pt3 {
    const a = rad(t.aim.x);
    const h = tval(t.h, performance.now(), this.isReducedMotion());
    const L = 17 - t.recoil.x * 4;
    return [t.x + Math.cos(a) * L, t.y + Math.sin(a) * L, 1.8 + 2 + h + 4.4];
  }

  private bolt(
    from: Pt3,
    to: Pt3,
    dur: number,
    arc: number,
    cls: string,
    r: number,
    onHit?: () => void
  ): void {
    const el = mk('circle', { r, class: cls }, this.gFx);
    this.G.bolts.push({ from, to, dur, arc, t: 0, el, onHit });
  }

  private shards(e: EnemyEntity, n: number, big = false): void {
    for (let i = 0; i < n; i++) {
      const s = big ? randDefense(2.2, 4) : randDefense(1.2, 2);
      const [a, b] = rings(-s, -s, s, s, s * 0.4, s * 0.25);
      const ang = randDefense(0, Math.PI * 2);
      const sp = randDefense(18, big ? 70 : 34);
      this.G.shards.push({
        x: e.x + randDefense(-4, 4),
        y: e.y + randDefense(-4, 4),
        z: randDefense(6, big ? 26 : 18),
        vx: Math.cos(ang) * sp + (big ? 20 : 0),
        vy: Math.sin(ang) * sp,
        vz: randDefense(30, 80),
        a,
        b,
        s,
        life: randDefense(0.6, 1.0),
        el: solid(this.gFx),
      });
    }
  }

  private ripple(x: number, y: number): void {
    const el = mk('path', { class: 'nf dash' }, this.gFx);
    this.G.ripples.push({ x, y, t: 0, el });
  }

  private turretTick(t: TurretEntity, dt: number): void {
    if (!t.level) return;
    const cands = this.G.enemies.filter(
      e =>
        e.lane === t.lane &&
        !e.dying &&
        e.x < PAD_X + TURRET_REACH[t.level - 1] &&
        e.x < SPAWN_X - 6 &&
        e.end - e.pos > 0
    );
    const e = this.nearest(cands);
    if (e) t.aim.t = (Math.atan2(e.y - t.y, e.x - t.x) * 180) / Math.PI;
    t.cd -= dt;
    if (t.cd > 0 || !e) return;
    t.cd = TURRET_RATE[t.level - 1];
    t.recoil.x = 1;
    t.recoil.v = 0;
    e.end--;
    e.marks[e.end] = 'cut';
    e.dirty = true;
    const kill = e.pos >= e.end;
    if (kill) {
      e.dying = true;
      e.bubble.classList.add('dying');
      e.dieAt = this.G.t + 0.6;
      if (this.target === e) this.retarget(null);
    }
    this.emitHud();
    SFX.turret();
    this.bolt(this.tipOf(t), this.headOf(e), 0.2, 4, 'dot', 2, () => {
      this.shards(e, 2);
      if (kill) this.explode(e);
    });
  }

  private startWave(w: number): void {
    this.G.wave = w;
    this.G.toSpawn = Math.min(30, 5 + 2 * w);
    const spawnMul = this.G.challenge?.spawnMul ?? 1;
    const chSpeedMul = this.G.challenge?.enemySpeedMul ?? 1;
    this.G.interval = Math.max(0.7, (2.6 - 0.16 * (w - 1)) * spawnMul);
    this.G.speedMul = (1 + 0.055 * (w - 1)) * chSpeedMul;
    this.G.spawnT = 0.4;
    this.G.inter = 0;
    this.cb.onBanner(
      `Wave ${w}`,
      w === 3
        ? 'heralds carry whole lines — spaces count'
        : w === 2
          ? 'brutes join — long words, heavy blows'
          : ''
    );
    SFX.wave();
    window.setTimeout(() => {
      if (this.G.inter === 0 && this.G.wave === w && this.G.running) {
        this.cb.onBanner(null);
      }
    }, 1800);
    this.emitHud();
  }

  private waveClear(): void {
    const bonus = 10 + 2 * this.G.wave;
    this.G.ink += bonus;
    this.G.inter = 6;
    this.cb.onBanner(`Wave ${this.G.wave} held · +${bonus} ink`, 'build with 1 · 2 · 3 — next wave in 6');
    this.emitHud();
  }

  private drawTurret(t: TurretEntity, now: number): void {
    const reduced = this.isReducedMotion();
    const h = tval(t.h, now, reduced);
    if (t.level === 0 && h < 0.05) return;
    const z0 = 1.8;
    const z1 = z0 + 2 + h;
    const z2 = z1 + 8;
    const a = t.aim.x;
    const rc = t.recoil.x;
    const key = `${h.toFixed(2)}|${a.toFixed(1)}|${rc.toFixed(2)}`;
    if (key === t.drawn) return;
    t.drawn = key;
    const [b0, b1] = disc(t.x, t.y, 9, 1.2, 10);
    put(t.parts.base, prism(this.P, this.front, b0, b1, z0, z1));
    const [d0, d1] = disc(t.x, t.y, 6.4, 1, 10);
    put(t.parts.drum, prism(this.P, this.front, d0, d1, z1, z2));
    const L = 17 - rc * 4;
    const bar = rrect(1, -1.8, L, 1.8, 1.5, 3);
    const bin = rrect(1.6, -1.1, L - 0.6, 1.1, 0.8, 3);
    put(
      t.parts.barrel,
      prism(this.P, this.front, turnedRing(bar, t.x, t.y, a), turnedRing(bin, t.x, t.y, a), z1 + 2.6, z1 + 6.2)
    );
    const [c0, c1] = disc(t.x, t.y, 3.8, 0.8, 8);
    put(t.parts.cap, prism(this.P, this.front, c0, c1, z2, z2 + 1.6));
  }

  private drawEnemy(e: EnemyEntity, now: number): void {
    const T = e.T;
    const ph = e.phase;
    const dz = tval(e.drop, now, this.isReducedMotion());
    const lift = (s: number) => Math.max(0, Math.sin(s)) * T.foot * 0.9;
    const bob = Math.abs(Math.sin(ph)) * 1.1 + dz;
    for (const p of e.parts) {
      const dzp =
        p.kind === 'footL'
          ? lift(ph) + dz
          : p.kind === 'footR'
            ? lift(ph + Math.PI) + dz
            : bob;
      put(
        p.s,
        prism(this.P, this.front, shiftRing(p.ring, e.x, e.y), shiftRing(p.inner, e.x, e.y), p.z0 + dzp, p.z1 + dzp)
      );
    }
    const top = T.head || ([T.hw * 0.6, T.body[0], T.body[1]] as [number, number, number]);
    const hz = (top[1] + top[2]) / 2 + 1 + bob;
    const fx = e.x - top[0];
    e.visor.setAttribute('d', seg(this.P(fx, e.y - top[0] * 0.55, hz), this.P(fx, e.y + top[0] * 0.55, hz)));
    if (e === this.target) {
      const rr = circ(T.hw + 7, 40).map(q => ({ ...q, u: q.u + e.x, v: q.v + e.y }));
      e.ringEl.setAttribute('d', poly(ringAt(this.P, rr, 0)));
    }
  }

  private bubbleHTML(e: EnemyEntity): string {
    const isT = e === this.target;
    return e.word
      .split('')
      .map((c, i) => {
        const m = e.marks[i];
        const ch = c === ' ' ? '␣' : c;
        const cls =
          m === 'ok' ? 'ok' : m === 'bad' ? 'bad' : m === 'cut' ? 'cut' : isT && i === e.pos ? 'cur' : '';
        return `<span class="${cls}${c === ' ' ? ' sp' : ''}">${ch}</span>`;
      })
      .join('');
  }

  private layoutLabels(): void {
    const W = this.fieldEl.clientWidth || 960;
    if (W !== this.lastLabelW) {
      this.lastLabelW = W;
      this.fontU = (clamp(W * 0.0132, W < 560 ? 9 : 10, 15) * VW) / W;
    }
    const cw = this.fontU * 0.61;
    const h = this.fontU * 1.7 + 2;
    const list = this.G.enemies
      .slice()
      .sort((a, b) => (a === this.target ? -1 : b === this.target ? 1 : a.x - b.x));
    const placed: Array<{ x: number; y: number; w: number }> = [];
    for (const e of list) {
      if (e.dirty) {
        e.bubble.innerHTML = this.bubbleHTML(e);
        e.dirty = false;
      }
      const q = this.P(e.x, e.y, this.topOf(e));
      const w = e.word.length * cw + this.fontU + 4;
      const x = q[0];
      let y = q[1];
      for (let n = 0; n < 10; n++) {
        const hit = placed.find(r => Math.abs(r.x - x) < (r.w + w) / 2 + 2 && Math.abs(r.y - y) < h);
        if (!hit) break;
        y = hit.y - h - 1;
      }
      y = Math.max(h + 2, y);
      placed.push({ x, y, w });
      e.bubble.style.left = `${(x / VW) * 100}%`;
      e.bubble.style.top = `${(y / VH) * 100}%`;
    }
  }

  private tick(dtRaw: number, now: number): void {
    const dt = Math.min(0.05, dtRaw);
    const reduced = this.isReducedMotion();

    if (this.G.running && !this.G.paused) {
      this.G.t += dt;
      if (this.G.inter > 0) {
        const before = Math.ceil(this.G.inter);
        this.G.inter -= dt;
        if (Math.ceil(this.G.inter) !== before && this.G.inter > 0) {
          if (this.G.wave) {
            this.cb.onBanner(
              `Wave ${this.G.wave} held`,
              `build with 1 · 2 · 3 — next wave in ${Math.ceil(this.G.inter)}`
            );
          } else {
            this.cb.onBanner(
              `Wave 1 in ${Math.ceil(this.G.inter)}`,
              'you have 25 ink — press 1, 2 or 3 to build a turret'
            );
          }
        }
        if (this.G.inter <= 0) this.startWave(this.G.wave + 1);
      } else {
        this.G.playT += dt;
        this.wpmSampleT -= dt;
        if (this.wpmSampleT <= 0) {
          this.wpmSampleT = 1.5;
          this.G.wpmHistory.push({
            t: Math.round(this.G.playT * 10) / 10,
            wpm: this.currentWpm(),
          });
          this.emitHud();
        }

        if (this.G.toSpawn > 0) {
          this.G.spawnT -= dt;
          if (this.G.spawnT <= 0 && this.spawn()) {
            this.G.toSpawn--;
            this.G.spawnT = this.G.interval * randDefense(0.75, 1.25);
          }
        } else if (!this.G.enemies.length) {
          this.waveClear();
        }
      }

      const byLane: EnemyEntity[][] = [[], [], []];
      this.G.enemies.forEach(e => byLane[e.lane].push(e));
      byLane.forEach(l => l.sort((a, b) => a.x - b.x));
      for (const l of byLane) {
        l.forEach((e, i) => {
          if (e.dieAt && this.G.t > e.dieAt) {
            this.explode(e);
            return;
          }
          if (!tdone(e.drop, now, reduced)) return;
          const ahead = l[i - 1];
          const stopAt = ahead ? Math.max(STOP_X, ahead.x + ahead.T.hw + e.T.hw + 8) : STOP_X;
          if (e.x > stopAt) {
            e.x = Math.max(stopAt, e.x - e.speed * dt);
            e.phase += dt * e.speed * 0.32;
          } else if (Math.sin(e.phase) > 0.05 || Math.sin(e.phase) < -0.05) {
            e.phase += dt * 6;
          }
          if (!e.dying && e.x <= STOP_X + 0.5) {
            e.atk -= dt;
            if (e.atk <= 0) {
              e.atk = e.T.atk;
              SFX.eshoot();
              this.bolt(this.headOf(e), [KX + 8, KY, 60], 0.5, 18, 'dot m', 3, () =>
                this.damage(e.T.dmg)
              );
            }
          }
        });
      }
      this.turrets.forEach(t => this.turretTick(t, dt));
    }

    for (const t of this.turrets) {
      stepS(t.aim, dt, reduced);
      stepS(t.recoil, dt, reduced);
      this.drawTurret(t, now);
    }
    for (const e of this.G.enemies) {
      this.drawEnemy(e, now);
      e.flash = Math.max(0, e.flash - dt);
    }

    const items = [
      ...this.turrets.map(t => ({ g: t.g, d: t.d })),
      ...this.props,
      ...this.G.enemies.map(e => ({ g: e.g, d: this.depth(e.x, e.y) })),
    ].sort((a, b) => a.d - b.d);
    let prev: Element | null = null;
    for (const it of items) {
      if (prev ? prev.nextSibling !== it.g : this.gLive.firstChild !== it.g) {
        if (prev) prev.after(it.g);
        else this.gLive.prepend(it.g);
      }
      prev = it.g;
    }

    this.G.bolts = this.G.bolts.filter(b => {
      b.t += dt / b.dur;
      const k = Math.min(1, b.t);
      const q: Pt3 = [
        lerp(b.from[0], b.to[0], k),
        lerp(b.from[1], b.to[1], k),
        lerp(b.from[2], b.to[2], k) + Math.sin(Math.PI * k) * b.arc,
      ];
      place(b.el, this.P(...q));
      if (k >= 1) {
        b.el.remove();
        if (b.onHit) b.onHit();
        return false;
      }
      return true;
    });

    this.G.shards = this.G.shards.filter(s => {
      s.life -= dt;
      s.vz -= 220 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.z < 0) {
        s.z = 0;
        s.vz *= -0.35;
        s.vx *= 0.6;
        s.vy *= 0.6;
      }
      if (s.life <= 0) {
        s.el.g.remove();
        return false;
      }
      const k = Math.min(1, s.life / 0.3);
      const sc = s.s * k;
      put(
        s.el,
        prism(
          this.P,
          this.front,
          shiftRing(
            s.a.map(q => ({ ...q, u: q.u * k, v: q.v * k })),
            s.x,
            s.y
          ),
          shiftRing(
            s.b.map(q => ({ ...q, u: q.u * k, v: q.v * k })),
            s.x,
            s.y
          ),
          s.z,
          s.z + sc * 2
        )
      );
      return true;
    });

    this.G.ripples = this.G.ripples.filter(r => {
      r.t += dt / 0.55;
      if (r.t >= 1) {
        r.el.remove();
        return false;
      }
      const R = 8 + 26 * Math.sin((r.t * Math.PI) / 2);
      const rr = circ(R, 40).map(q => ({ ...q, u: q.u + r.x, v: q.v + r.y }));
      r.el.setAttribute('d', poly(ringAt(this.P, rr, 0)));
      r.el.setAttribute('class', r.t > 0.6 ? 'nf lo dash' : 'nf dash');
      return true;
    });

    this.layoutLabels();
  }

  private startLoop(): void {
    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = this.lastTs ? Math.max(0, (now - this.lastTs) / 1000) : 0.016;
      this.lastTs = now;
      this.tick(dt, now);
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    this.clearField();
    this.svg.remove();
  }
}
