import { Enemy, EnemyType } from './types';

export const WORDS_SHORT = [
  'cat', 'dog', 'run', 'jump', 'code', 'type', 'fast', 'line', 'ink', 'pen',
  'dot', 'dash', 'arc', 'grid', 'wave', 'bolt', 'spark', 'pixel', 'laser',
  'robot', 'storm', 'cloud', 'flame', 'stone', 'blade', 'arrow', 'shield',
  'quest', 'map', 'key', 'lock', 'star', 'moon', 'sun', 'wind', 'rain',
  'fire', 'wolf', 'bear', 'fox', 'owl', 'elk',
];

export const WORDS_MID = [
  'typing', 'runner', 'walker', 'pencil', 'paper', 'planet', 'rocket',
  'garden', 'bridge', 'castle', 'dragon', 'knight', 'sniper', 'bullet',
  'letter', 'screen', 'keyboard', 'winter', 'summer', 'harbor', 'lantern',
  'meadow', 'canyon', 'falcon', 'viper', 'cobra', 'tiger', 'eagle', 'comet',
  'orbit', 'vector', 'syntax', 'cursor', 'button', 'window', 'ladder',
  'hammer', 'anchor', 'beacon', 'cipher', 'delta', 'echo', 'flux', 'glyph',
  'haven', 'iris', 'jade', 'karma', 'lumen', 'misty', 'novel', 'onyx',
  'prism', 'quartz', 'ridge', 'solar', 'tulip', 'umbra', 'vault', 'willow',
  'xenon', 'yield', 'zephyr', 'isometric', 'hairline',
];

export const WORDS_LONG = [
  'adventure', 'battlefield', 'champion', 'dangerous', 'evergreen',
  'firewall', 'guardian', 'labyrinth', 'moonlight', 'nightfall',
  'overdrive', 'paperwork', 'quicksand', 'riverbank', 'storyteller',
  'thunder', 'umbrella', 'vagabond', 'waterfall', 'yesterday', 'zigzag',
  'aftermath', 'blueprint', 'crossfire', 'daydream', 'earthquake',
  'footsteps', 'gunpowder', 'headlight', 'ironwood', 'jackhammer',
  'keystroke', 'landmark', 'mastermind', 'notebook', 'outlander',
  'pathfinder', 'quicksilver', 'rainmaker', 'sidewinder', 'trailhead',
  'uppercut', 'viewpoint', 'wanderer', 'yardstick', 'zenith', 'blacksmith',
  'counterpart', 'drawbridge', 'elsewhere', 'framework', 'grandfather',
  'hemisphere', 'illustration', 'journeyman', 'kindergarten', 'longbowman',
  'mountaineer', 'nevertheless', 'oscilloscope', 'protagonist',
  'quarterback', 'rattlesnake', 'silhouette', 'transmission',
  'undercurrent', 'verification', 'watchtower', 'extinguisher',
  'yellowhammer', 'zoetrope',
];

export const ALL_WORDS = [...WORDS_SHORT, ...WORDS_MID, ...WORDS_LONG];

export const LINES = [
  'the sun is hot',
  'i can type fast',
  'type to win',
  'the hero aims well',
  'shoot every letter',
  'the line holds',
  'we march at dawn',
  'a quick red fox',
  'stay on target',
  'the shield is up',
  'run to the line',
  'words become lines',
  'simple lines only',
  'fire on my mark',
  'hold the line',
  'the dawn is near',
  'type the line',
  'we walk in line',
  'aim shoot type',
  'the fox runs fast',
];

export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function wordFor(type: EnemyType, wave: number, enemies: Enemy[]): string {
  const inUse = new Set(enemies.map(e => e.word));
  let pool: string[];
  if (type === 'runner') {
    pool = WORDS_SHORT.concat(WORDS_MID.filter(w => w.length <= 6));
  } else if (type === 'brute') {
    pool = wave >= 3 ? WORDS_LONG : WORDS_MID.filter(w => w.length >= 6).concat(WORDS_LONG.slice(0, 24));
  } else {
    pool = wave <= 1 ? WORDS_MID.filter(w => w.length <= 7) : WORDS_MID.concat(WORDS_LONG.filter(w => w.length <= 9));
  }
  for (let i = 0; i < 24; i++) {
    const w = pick(pool);
    if (!inUse.has(w)) return w;
  }
  return pick(ALL_WORDS);
}
