export type GameKey = 'arcade' | 'defense';

export interface GameHistorySummary {
  bestScore: number;
  bestAccuracy: number;
  bestWpm: number;
  lastScore: number | null;
  lastAccuracy: number | null;
  lastWpm: number | null;
  lastWave: number | null;
  lastPlayedAt: string | null;
  runsPlayed: number;
}

export interface PlayerHistory {
  lifetimeBestAccuracy: number;
  allTimeFastestWpm: number;
  totalRuns: number;
  lastPlayedGame: GameKey | null;
  arcade: GameHistorySummary;
  defense: GameHistorySummary;
}

export interface RecordRunResult {
  history: PlayerHistory;
  isNewLifetimeAcc: boolean;
  isNewFastestWpm: boolean;
  isNewBestScore: boolean;
}

const HISTORY_KEY = 'hairline-player-history-v1';
const LEGACY_DEFENSE_BEST_KEY = 'typing-defense-best';

function emptyGameSummary(seedBestScore = 0): GameHistorySummary {
  return {
    bestScore: seedBestScore,
    bestAccuracy: 0,
    bestWpm: 0,
    lastScore: null,
    lastAccuracy: null,
    lastWpm: null,
    lastWave: null,
    lastPlayedAt: null,
    runsPlayed: 0,
  };
}

function safeNum(val: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function safeNullableNum(val: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sanitizeGameSummary(raw: unknown, legacyBest = 0): GameHistorySummary {
  if (!raw || typeof raw !== 'object') {
    return emptyGameSummary(legacyBest);
  }
  const obj = raw as Record<string, unknown>;
  const lastWpm = safeNullableNum(obj.lastWpm, 0);
  return {
    bestScore: Math.max(legacyBest, safeNum(obj.bestScore, 0)),
    bestAccuracy: safeNum(obj.bestAccuracy, 0, 0, 100),
    bestWpm: Math.max(safeNum(obj.bestWpm, 0), lastWpm ?? 0),
    lastScore: safeNullableNum(obj.lastScore, 0),
    lastAccuracy: safeNullableNum(obj.lastAccuracy, 0, 100),
    lastWpm,
    lastWave: safeNullableNum(obj.lastWave, 0),
    lastPlayedAt: typeof obj.lastPlayedAt === 'string' ? obj.lastPlayedAt : null,
    runsPlayed: safeNum(obj.runsPlayed, 0),
  };
}

function readLegacyDefenseBest(): number {
  try {
    const val = Number(localStorage.getItem(LEGACY_DEFENSE_BEST_KEY) || 0);
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0;
  } catch {
    return 0;
  }
}

function loadHistory(): PlayerHistory {
  const legacyDefenseBest = readLegacyDefenseBest();
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const arcade = sanitizeGameSummary(parsed.arcade, 0);
      const defense = sanitizeGameSummary(parsed.defense, legacyDefenseBest);
      const totalRuns = Math.max(
        safeNum(parsed.totalRuns, 0),
        arcade.runsPlayed + defense.runsPlayed
      );
      const lifetimeBestAccuracy = Math.max(
        safeNum(parsed.lifetimeBestAccuracy, 0, 0, 100),
        arcade.bestAccuracy,
        defense.bestAccuracy
      );
      const allTimeFastestWpm = Math.max(
        safeNum(parsed.allTimeFastestWpm, 0),
        arcade.bestWpm,
        defense.bestWpm
      );
      const lastPlayedGame =
        parsed.lastPlayedGame === 'arcade' || parsed.lastPlayedGame === 'defense'
          ? parsed.lastPlayedGame
          : null;
      return {
        lifetimeBestAccuracy,
        allTimeFastestWpm,
        totalRuns,
        lastPlayedGame,
        arcade,
        defense,
      };
    }
  } catch {
    /* ignore storage / JSON errors */
  }
  return {
    lifetimeBestAccuracy: 0,
    allTimeFastestWpm: 0,
    totalRuns: 0,
    lastPlayedGame: null,
    arcade: emptyGameSummary(0),
    defense: emptyGameSummary(legacyDefenseBest),
  };
}

let cachedHistory: PlayerHistory = loadHistory();
const listeners = new Set<(h: PlayerHistory) => void>();

function cloneHistory(h: PlayerHistory): PlayerHistory {
  return {
    ...h,
    arcade: { ...h.arcade },
    defense: { ...h.defense },
  };
}

function saveAndNotify(next: PlayerHistory): void {
  cachedHistory = cloneHistory(next);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cachedHistory));
  } catch {
    /* ignore quota / private mode errors */
  }
  const snap = cloneHistory(cachedHistory);
  for (const fn of listeners) {
    try {
      fn(snap);
    } catch {
      /* protect subscriber loop */
    }
  }
}

export function getPlayerHistory(): PlayerHistory {
  return cloneHistory(cachedHistory);
}

export function subscribePlayerHistory(fn: (h: PlayerHistory) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function recordRunHistory(
  game: GameKey,
  run: { score: number; accuracy: number; wpm: number; wave: number }
): RecordRunResult {
  const prev = cachedHistory;
  const cleanScore = Math.max(0, Math.round(Number.isFinite(run.score) ? run.score : 0));
  const cleanAcc = Math.max(0, Math.min(100, Math.round(Number.isFinite(run.accuracy) ? run.accuracy : 0)));
  const cleanWpm = Math.max(0, Math.round(Number.isFinite(run.wpm) ? run.wpm : 0));
  const cleanWave = Math.max(0, Math.round(Number.isFinite(run.wave) ? run.wave : 0));

  const prevGame = prev[game];
  const isNewLifetimeAcc = prev.totalRuns === 0 || cleanAcc > prev.lifetimeBestAccuracy;
  const isNewFastestWpm = cleanWpm > 0 && (prev.allTimeFastestWpm === 0 || cleanWpm > prev.allTimeFastestWpm);
  const isNewBestScore = prevGame.runsPlayed === 0 || cleanScore > prevGame.bestScore;

  const nextGame: GameHistorySummary = {
    bestScore: Math.max(prevGame.bestScore, cleanScore),
    bestAccuracy: Math.max(prevGame.bestAccuracy, cleanAcc),
    bestWpm: Math.max(prevGame.bestWpm, cleanWpm),
    lastScore: cleanScore,
    lastAccuracy: cleanAcc,
    lastWpm: cleanWpm,
    lastWave: cleanWave,
    lastPlayedAt: new Date().toISOString(),
    runsPlayed: prevGame.runsPlayed + 1,
  };

  const next: PlayerHistory = {
    lifetimeBestAccuracy: Math.max(prev.lifetimeBestAccuracy, cleanAcc),
    allTimeFastestWpm: Math.max(prev.allTimeFastestWpm, cleanWpm),
    totalRuns: prev.totalRuns + 1,
    lastPlayedGame: game,
    arcade: game === 'arcade' ? nextGame : { ...prev.arcade },
    defense: game === 'defense' ? nextGame : { ...prev.defense },
  };

  saveAndNotify(next);
  return {
    history: cloneHistory(next),
    isNewLifetimeAcc,
    isNewFastestWpm,
    isNewBestScore,
  };
}

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(LEGACY_DEFENSE_BEST_KEY);
    localStorage.removeItem('hairline-daily-challenges-v1');
    localStorage.removeItem('hairline-audio-settings-v1');
    localStorage.removeItem('hairline-preferences-v1');
  } catch {
    /* ignore */
  }
  cachedHistory = {
    lifetimeBestAccuracy: 0,
    allTimeFastestWpm: 0,
    totalRuns: 0,
    lastPlayedGame: null,
    arcade: emptyGameSummary(0),
    defense: emptyGameSummary(0),
  };
  saveAndNotify(cachedHistory);
}
