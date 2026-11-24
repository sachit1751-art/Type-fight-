import { DailyChallenge, PlayVariant, WeaponType } from './challenge';

export type GameMode = 'menu' | 'playing' | 'paused' | 'dying' | 'over';

export type EnemyType = 'runner' | 'walker' | 'brute';

export interface HeroState {
  hp: number;
  maxHp: number;
  recoil: number;
  flashT: number;
  hurtT: number;
  muzzleT: number;
  deadT: number;
  phase: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  word: string;
  isLine: boolean;
  progress: number;
  marks: boolean[];
  completed: boolean;
  x: number;
  gy: number;
  s: number;
  speed: number;
  phase: number;
  state: 'alive' | 'dying';
  deathT: number;
  flashT: number;
  shakeT: number;
  kb: number;
  attackCd: number;
  muzzleT: number;
  seed: number;
}

export interface Bullet {
  from: 'hero' | 'enemy';
  x: number;
  y: number;
  target: Enemy | null;
  ch: string;
  isFinal: boolean;
  speed: number;
  trail: Array<{ x: number; y: number }>;
  dead?: boolean;
  isRail?: boolean;
  isSplit?: boolean;
}

export interface BeamEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  len: number;
  accent: boolean;
  gravity?: number;
  drag?: number;
}

export interface PulseRing {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  accent: boolean;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  kind: '' | 'good' | 'bad' | 'kill';
  life: number;
}

export interface ShieldState {
  active: boolean;
  cleanWords: number;
  flashT: number;
}

export interface Pillar {
  x: number;
  gy: number;
  h: number;
  w: number;
}

export interface WpmPoint {
  t: number;
  wpm: number;
}

export interface GameState {
  mode: GameMode;
  variant: PlayVariant;
  challenge: DailyChallenge | null;
  weapon: WeaponType;
  weaponCharge: number;
  time: number;
  runTime: number;
  lastTs: number;
  hero: HeroState;
  activeId: number | null;
  enemies: Enemy[];
  bullets: Bullet[];
  beams: BeamEffect[];
  particles: Particle[];
  rings: PulseRing[];
  floats: FloatText[];
  spawnT: number;
  kills: number;
  score: number;
  wave: number;
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
  shield: ShieldState;
  linesIntroduced: boolean;
  shake: number;
  nextId: number;
  overT: number;
  wpmHistory: WpmPoint[];
  wpmSampleT: number;
}

export interface Palette {
  plate: string;
  hi: string;
  edge: string;
  mid: string;
  lo: string;
  accent: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Pose {
  head: Point;
  hr: number;
  neck: Point;
  hip: Point;
  shoulder: Point;
  footA: Point;
  footB: Point;
  kneeA: Point;
  kneeB: Point;
  hand: Point;
  muzzle: Point;
  backHand: Point;
  chest: Point;
}

export interface BubbleRect {
  bx: number;
  by: number;
  bw: number;
  bh: number;
  charW: number;
}

export interface HudSnapshot {
  mode: GameMode;
  variant: PlayVariant;
  challengeName: string | null;
  weapon: WeaponType;
  weaponLabel: string;
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  kills: number;
  acc: number;
  wpm: number;
  streak: number;
  bestStreak: number;
  mult: number;
  shieldActive: boolean;
  cleanWords: number;
  readout: string;
  targetWord: string | null;
  targetProgress: number;
  targetMarks: boolean[];
  targetIsLine: boolean;
  wpmHistory: WpmPoint[];
}
