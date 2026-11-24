export interface UserPreferences {
  fastRestart: boolean;
  draftingGrid: boolean;
  tutorialsCompleted: {
    arcade: boolean;
    defense: boolean;
  };
}

const PREFS_KEY = 'hairline-preferences-v1';

const DEFAULT_PREFS: UserPreferences = {
  fastRestart: false,
  draftingGrid: true,
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
        draftingGrid: typeof parsed.draftingGrid === 'boolean' ? parsed.draftingGrid : true,
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
    draftingGrid: DEFAULT_PREFS.draftingGrid,
    tutorialsCompleted: { ...DEFAULT_PREFS.tutorialsCompleted },
  };
}

let prefs: UserPreferences = loadInitialPreferences();
const listeners = new Set<(p: UserPreferences) => void>();

function clonePrefs(p: UserPreferences): UserPreferences {
  return {
    fastRestart: p.fastRestart,
    draftingGrid: p.draftingGrid,
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

export function setDraftingGrid(enabled: boolean): void {
  prefs = {
    ...prefs,
    draftingGrid: enabled,
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
