export interface UserPreferences {
  fastRestart: boolean;
  tutorialsCompleted: {
    arcade: boolean;
    defense: boolean;
  };
}

const PREFS_KEY = 'hairline-preferences-v1';

const DEFAULT_PREFS: UserPreferences = {
  fastRestart: false,
  tutorialsCompleted: {
    arcade: false,
    defense: false,
  },
};

function loadInitialPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        fastRestart: typeof parsed.fastRestart === 'boolean' ? parsed.fastRestart : false,
        tutorialsCompleted: {
          arcade: Boolean(parsed.tutorialsCompleted?.arcade),
          defense: Boolean(parsed.tutorialsCompleted?.defense),
        },
      };
    }
  } catch {
    /* ignore storage errors */
  }
  return {
    fastRestart: DEFAULT_PREFS.fastRestart,
    tutorialsCompleted: { ...DEFAULT_PREFS.tutorialsCompleted },
  };
}

let prefs: UserPreferences = loadInitialPreferences();
const listeners = new Set<(p: UserPreferences) => void>();

function clonePrefs(p: UserPreferences): UserPreferences {
  return {
    fastRestart: p.fastRestart,
    tutorialsCompleted: { ...p.tutorialsCompleted },
  };
}

function notify(): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  const snap = clonePrefs(prefs);
  for (const fn of listeners) fn(snap);
}

export function getPreferences(): UserPreferences {
  return clonePrefs(prefs);
}

export function subscribePreferences(fn: (p: UserPreferences) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setFastRestart(enabled: boolean): void {
  prefs = {
    ...prefs,
    fastRestart: enabled,
    tutorialsCompleted: { ...prefs.tutorialsCompleted },
  };
  notify();
}

export function markTutorialCompleted(game: 'arcade' | 'defense'): void {
  if (prefs.tutorialsCompleted[game]) return;
  prefs = {
    ...prefs,
    tutorialsCompleted: {
      ...prefs.tutorialsCompleted,
      [game]: true,
    },
  };
  notify();
}

export function resetPreferences(): void {
  prefs = clonePrefs(DEFAULT_PREFS);
  notify();
}
