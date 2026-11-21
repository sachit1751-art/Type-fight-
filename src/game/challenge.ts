export type PlayVariant = 'standard' | 'daily';

export type WeaponType = 'standard' | 'twin' | 'scatter' | 'rail' | 'hyper';

export interface DailyChallenge {
  dateKey: string;
  dayNumber: number;
  index: number;
  id: string;
  name: string;
  tagline: string;
  weapon: WeaponType;
  weaponLabel: string;
  weaponDesc: string;
  enemySpeedMul: number;
  spawnMul: number;
  startingHp: number;
  maxHp: number;
  startingInk: number;
  typoDmgArcade: number;
  typoDmgDefense: number;
  cleanHeal: number;
  scoreMul: number;
  bias: 'balanced' | 'runner' | 'brute';
  rules: string[];
}

export interface DailyDayRecord {
  arcadeBest: number;
  defenseBest: number;
  completed: boolean;
  waveReached: number;
}

export interface DailyProgress {
  streakDays: number;
  lastCompletedDate: string | null;
  days: Record<string, DailyDayRecord>;
}

const DAILY_STORAGE_KEY = 'hairline-daily-challenges-v1';

interface ChallengePreset {
  id: string;
  name: string;
  tagline: string;
  weapon: WeaponType;
  weaponLabel: string;
  weaponDesc: string;
  enemySpeedMul: number;
  spawnMul: number;
  startingHp: number;
  maxHp: number;
  startingInk: number;
  typoDmgArcade: number;
  typoDmgDefense: number;
  cleanHeal: number;
  scoreMul: number;
  bias: 'balanced' | 'runner' | 'brute';
  rules: string[];
}

const CHALLENGE_POOL: ChallengePreset[] = [
  {
    id: 'overdrive-twin',
    name: 'Overdrive Twin-Bolt',
    tagline: 'Faster waves answered with dual ricochet rifle fire.',
    weapon: 'twin',
    weaponLabel: 'Twin-Bolt',
    weaponDesc: 'Every 3rd accurate key fires a bonus ricochet bolt at another active word.',
    enemySpeedMul: 1.28,
    spawnMul: 0.85,
    startingHp: 100,
    maxHp: 100,
    startingInk: 30,
    typoDmgArcade: 8,
    typoDmgDefense: 3,
    cleanHeal: 2,
    scoreMul: 1.25,
    bias: 'balanced',
    rules: [
      'Weapon: Twin-Bolt (every 3rd hit strikes a second enemy word)',
      'Enemy speed +28% · Spawn delay -15%',
      'Score multiplier ×1.25 · Clear Wave 2+ to log daily streak',
    ],
  },
  {
    id: 'precision-rail',
    name: 'Precision Railgun',
    tagline: 'Heavy armor ahead — charge piercing double-letter slugs.',
    weapon: 'rail',
    weaponLabel: 'Railgun',
    weaponDesc: 'Every 4th consecutive hit discharges a piercing slug worth 2 letters at once.',
    enemySpeedMul: 1.05,
    spawnMul: 0.92,
    startingHp: 100,
    maxHp: 100,
    startingInk: 35,
    typoDmgArcade: 10,
    typoDmgDefense: 4,
    cleanHeal: 2,
    scoreMul: 1.35,
    bias: 'brute',
    rules: [
      'Weapon: Railgun (4th hit pierces 2 letters automatically)',
      'Brute-heavy waves · Typo counter-fire +25%',
      'Score multiplier ×1.35 · Starting Ink 35 in Defense',
    ],
  },
  {
    id: 'blitz-scatter',
    name: 'Blitz Scattergun',
    tagline: 'Swarming runners trimmed down by crowd-clearing buckshot.',
    weapon: 'scatter',
    weaponLabel: 'Scattergun',
    weaponDesc: 'Every 4th hit sprays scatter pellets across up to 2 neighboring enemy words.',
    enemySpeedMul: 1.36,
    spawnMul: 0.78,
    startingHp: 100,
    maxHp: 100,
    startingInk: 30,
    typoDmgArcade: 8,
    typoDmgDefense: 3,
    cleanHeal: 2,
    scoreMul: 1.3,
    bias: 'runner',
    rules: [
      'Weapon: Scattergun (4th hit chips up to 2 adjacent words)',
      'Runner swarm +36% pace · Rapid spawn cadence',
      'Score multiplier ×1.30 · Clear Wave 2+ to log daily streak',
    ],
  },
  {
    id: 'glass-hyper',
    name: 'Glass Cannon Hyper',
    tagline: 'Start at 60 HP with rapid-fire double-stride Hyper-Carbine.',
    weapon: 'hyper',
    weaponLabel: 'Hyper-Carbine',
    weaponDesc: 'Every 2nd consecutive accurate key strikes for 2 letters on the active word.',
    enemySpeedMul: 1.22,
    spawnMul: 0.86,
    startingHp: 60,
    maxHp: 60,
    startingInk: 35,
    typoDmgArcade: 10,
    typoDmgDefense: 4,
    cleanHeal: 3,
    scoreMul: 1.5,
    bias: 'balanced',
    rules: [
      'Weapon: Hyper-Carbine (every 2nd hit clears 2 letters)',
      'Fragile start: 60 max HP · Clean words heal +3 HP',
      'Score multiplier ×1.50 · Clear Wave 2+ to log daily streak',
    ],
  },
  {
    id: 'iron-siege',
    name: 'Iron Keep Siege',
    tagline: 'Slow heavy columns vs. fortified Ink reserves and twin bolts.',
    weapon: 'twin',
    weaponLabel: 'Twin-Bolt',
    weaponDesc: 'Every 3rd accurate key fires a bonus ricochet bolt at another active word.',
    enemySpeedMul: 0.92,
    spawnMul: 0.82,
    startingHp: 100,
    maxHp: 100,
    startingInk: 50,
    typoDmgArcade: 12,
    typoDmgDefense: 5,
    cleanHeal: 4,
    scoreMul: 1.35,
    bias: 'brute',
    rules: [
      'Weapon: Twin-Bolt · Defense starts with 50 Ink (2 instant turrets)',
      'Brute-heavy siege · Heavy typo damage (-12 Arcade / -5 Defense)',
      'Clean words heal +4 HP · Score multiplier ×1.35',
    ],
  },
  {
    id: 'phantom-rail',
    name: 'Velocity Rail Sprint',
    tagline: 'High-speed sprints matched by fast-charging piercing shots.',
    weapon: 'rail',
    weaponLabel: 'Railgun',
    weaponDesc: 'Every 4th consecutive hit discharges a piercing slug worth 2 letters at once.',
    enemySpeedMul: 1.34,
    spawnMul: 0.84,
    startingHp: 85,
    maxHp: 85,
    startingInk: 30,
    typoDmgArcade: 9,
    typoDmgDefense: 4,
    cleanHeal: 2,
    scoreMul: 1.4,
    bias: 'runner',
    rules: [
      'Weapon: Railgun (every 4th hit pierces 2 letters)',
      '85 max HP · Runner-heavy sprint at +34% speed',
      'Score multiplier ×1.40 · Clear Wave 2+ to log daily streak',
    ],
  },
];

export function formatLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumberFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function prevDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  const py = dt.getUTCFullYear();
  const pm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(dt.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

export function getDailyChallenge(date = new Date()): DailyChallenge {
  const dateKey = formatLocalDateKey(date);
  const dayNumber = dayNumberFromKey(dateKey);
  // Scramble index cleanly across weeks so consecutive days stay varied
  const index = ((dayNumber * 5 + 3) % CHALLENGE_POOL.length + CHALLENGE_POOL.length) % CHALLENGE_POOL.length;
  const preset = CHALLENGE_POOL[index];
  return {
    ...preset,
    dateKey,
    dayNumber,
    index,
  };
}

export function getNextRotationCountdown(now = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${String(remMins).padStart(2, '0')}m`;
}

export function getDailyProgress(): DailyProgress {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyProgress>;
      return {
        streakDays: typeof parsed.streakDays === 'number' ? parsed.streakDays : 0,
        lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : null,
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      };
    }
  } catch {
    /* ignore */
  }
  return { streakDays: 0, lastCompletedDate: null, days: {} };
}

export function recordDailyRun(
  game: 'arcade' | 'defense',
  dateKey: string,
  score: number,
  wave: number,
  kills: number
): DailyProgress {
  const prog = getDailyProgress();
  const existing = prog.days[dateKey] ?? {
    arcadeBest: 0,
    defenseBest: 0,
    completed: false,
    waveReached: 0,
  };

  const clearedNow = wave >= 2 || kills >= 8;
  const updatedRecord: DailyDayRecord = {
    arcadeBest: game === 'arcade' ? Math.max(existing.arcadeBest, score) : existing.arcadeBest,
    defenseBest: game === 'defense' ? Math.max(existing.defenseBest, score) : existing.defenseBest,
    completed: existing.completed || clearedNow,
    waveReached: Math.max(existing.waveReached, wave),
  };

  let streakDays = prog.streakDays;
  let lastCompletedDate = prog.lastCompletedDate;

  if (updatedRecord.completed && lastCompletedDate !== dateKey) {
    if (lastCompletedDate === prevDateKey(dateKey)) {
      streakDays = Math.max(1, streakDays + 1);
    } else {
      streakDays = 1;
    }
    lastCompletedDate = dateKey;
  }

  const next: DailyProgress = {
    streakDays,
    lastCompletedDate,
    days: {
      ...prog.days,
      [dateKey]: updatedRecord,
    },
  };

  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
