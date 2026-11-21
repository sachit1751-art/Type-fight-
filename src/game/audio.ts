export type SfxCategory = 'shooting' | 'enemies' | 'ui';

export interface AudioSettings {
  enabled: boolean;
  masterVolume: number; // 0..100
  categories: Record<SfxCategory, boolean>;
}

const SOUND_KEY = 'hairline-type-defense-sound';
const AUDIO_SETTINGS_KEY = 'hairline-audio-settings-v1';

const DEFAULT_SETTINGS: AudioSettings = {
  enabled: true,
  masterVolume: 90,
  categories: {
    shooting: true,
    enemies: true,
    ui: true,
  },
};

function loadInitialSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
        masterVolume:
          typeof parsed.masterVolume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.masterVolume)))
            : DEFAULT_SETTINGS.masterVolume,
        categories: {
          shooting: parsed.categories?.shooting ?? true,
          enemies: parsed.categories?.enemies ?? true,
          ui: parsed.categories?.ui ?? true,
        },
      };
    }
    const legacy = localStorage.getItem(SOUND_KEY);
    if (legacy === 'off') {
      return { ...DEFAULT_SETTINGS, enabled: false, categories: { ...DEFAULT_SETTINGS.categories } };
    }
  } catch {
    /* ignore storage errors */
  }
  return { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } };
}

let settings: AudioSettings = loadInitialSettings();
let AC: AudioContext | null = null;
let masterGain: GainNode | null = null;

const listeners = new Set<(s: AudioSettings) => void>();

function cloneSettings(): AudioSettings {
  return {
    enabled: settings.enabled,
    masterVolume: settings.masterVolume,
    categories: { ...settings.categories },
  };
}

function persistAndNotify(): void {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(SOUND_KEY, settings.enabled ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  const snap = cloneSettings();
  for (const fn of listeners) fn(snap);
}

function syncMasterGain(): void {
  if (!AC || !masterGain) return;
  const target = settings.enabled ? (settings.masterVolume / 100) * 0.9 : 0;
  try {
    masterGain.gain.setTargetAtTime(target, AC.currentTime, 0.015);
  } catch {
    masterGain.gain.value = target;
  }
}

export function getAudioSettings(): AudioSettings {
  return cloneSettings();
}

export function subscribeAudioSettings(fn: (s: AudioSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isSoundOn(): boolean {
  return settings.enabled;
}

export function ensureAudio(): AudioContext | null {
  if (!settings.enabled || settings.masterVolume <= 0) return null;
  if (!AC) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      AC = new Ctor();
      masterGain = AC.createGain();
      masterGain.gain.value = (settings.masterVolume / 100) * 0.9;
      masterGain.connect(AC.destination);
    } catch {
      AC = null;
    }
  }
  if (AC && AC.state === 'suspended') {
    void AC.resume();
  }
  syncMasterGain();
  return AC;
}

function tone(
  category: SfxCategory,
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.12,
  delay = 0
): void {
  if (!settings.enabled || settings.masterVolume <= 0) return;
  if (!settings.categories[category]) return;
  const ac = ensureAudio();
  if (!ac || !masterGain) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const SFX = {
  // Shooting & player weapon fire
  shoot()   { tone('shooting', 760, 170, 0.08, 'square', 0.10); },
  hit()     { tone('shooting', 1250, 900, 0.035, 'square', 0.06); },
  turret()  { tone('shooting', 580, 260, 0.06, 'triangle', 0.07); },
  rail()    { tone('shooting', 1420, 220, 0.16, 'sawtooth', 0.11); tone('shooting', 880, 440, 0.12, 'triangle', 0.08, 0.02); },
  scatter() { tone('shooting', 640, 140, 0.09, 'square', 0.09); tone('shooting', 920, 220, 0.07, 'triangle', 0.07, 0.025); },

  // Enemies & combat hazards
  eshoot()  { tone('enemies', 210, 65, 0.14, 'sawtooth', 0.10); },
  hurt()    { tone('enemies', 140, 48, 0.22, 'sawtooth', 0.16); tone('enemies', 90, 40, 0.25, 'triangle', 0.12, 0.02); },
  die()     { tone('enemies', 520, 60, 0.3, 'square', 0.11); tone('enemies', 880, 120, 0.22, 'triangle', 0.07, 0.03); },

  // UI, words, shields, waves, turrets construction
  word()    { tone('ui', 660, 660, 0.07, 'sine', 0.10); tone('ui', 990, 990, 0.1, 'sine', 0.10, 0.07); },
  wrong()   { tone('ui', 180, 90, 0.12, 'square', 0.09); },
  shield()  { tone('ui', 520, 520, 0.09, 'sine', 0.10); tone('ui', 784, 784, 0.14, 'sine', 0.10, 0.08); },
  block()   { tone('ui', 340, 190, 0.09, 'triangle', 0.12); },
  wave()    { tone('ui', 440, 440, 0.09, 'sine', 0.09); tone('ui', 660, 660, 0.12, 'sine', 0.09, 0.09); },
  build()   { tone('ui', 330, 660, 0.10, 'triangle', 0.10); tone('ui', 660, 880, 0.08, 'sine', 0.08, 0.07); },
  nope()    { tone('ui', 150, 110, 0.09, 'square', 0.07); },
};

export function setSoundEnabled(on: boolean, announce = true): void {
  settings = { ...settings, enabled: on, categories: { ...settings.categories } };
  if (!on) {
    syncMasterGain();
    if (AC && AC.state === 'running') {
      void AC.suspend();
    }
  } else {
    ensureAudio();
    syncMasterGain();
    if (announce && settings.categories.ui) {
      SFX.word();
    }
  }
  persistAndNotify();
}

export function setMasterVolume(volPercent: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(volPercent)));
  settings = {
    ...settings,
    masterVolume: clamped,
    enabled: clamped > 0 ? true : settings.enabled,
    categories: { ...settings.categories },
  };
  if (settings.enabled && settings.masterVolume > 0) {
    ensureAudio();
  }
  syncMasterGain();
  persistAndNotify();
}

export function setCategoryEnabled(cat: SfxCategory, enabled: boolean): void {
  settings = {
    ...settings,
    categories: {
      ...settings.categories,
      [cat]: enabled,
    },
  };
  persistAndNotify();
}

export function resetAudioSettings(): void {
  settings = {
    enabled: DEFAULT_SETTINGS.enabled,
    masterVolume: DEFAULT_SETTINGS.masterVolume,
    categories: { ...DEFAULT_SETTINGS.categories },
  };
  ensureAudio();
  syncMasterGain();
  persistAndNotify();
}

export function previewAudioCategory(target: SfxCategory | 'master'): void {
  if (!settings.enabled || settings.masterVolume <= 0) return;
  if (target === 'shooting') {
    SFX.shoot();
    window.setTimeout(() => SFX.hit(), 85);
  } else if (target === 'enemies') {
    SFX.eshoot();
    window.setTimeout(() => SFX.die(), 130);
  } else {
    SFX.word();
  }
}
