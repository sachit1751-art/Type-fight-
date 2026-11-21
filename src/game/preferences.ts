export interface UserPreferences {
  fastRestart: boolean;
}

const PREFS_KEY = 'hairline-preferences-v1';

const DEFAULT_PREFS: UserPreferences = {
  fastRestart: false,
};

function loadInitialPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        fastRestart: typeof parsed.fastRestart === 'boolean' ? parsed.fastRestart : false,
      };
    }
  } catch {
    /* ignore storage errors */
  }
  return { ...DEFAULT_PREFS };
}

let prefs: UserPreferences = loadInitialPreferences();
const listeners = new Set<(p: UserPreferences) => void>();

function notify(): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  const snap = { ...prefs };
  for (const fn of listeners) fn(snap);
}

export function getPreferences(): UserPreferences {
  return { ...prefs };
}

export function subscribePreferences(fn: (p: UserPreferences) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setFastRestart(enabled: boolean): void {
  prefs = { ...prefs, fastRestart: enabled };
  notify();
}

export function resetPreferences(): void {
  prefs = { ...DEFAULT_PREFS };
  notify();
}
