const SOUND_KEY = 'hairline-type-defense-sound';

let AC: AudioContext | null = null;
let masterGain: GainNode | null = null;
let soundOn = true;

try {
  soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
} catch {
  soundOn = true;
}

export function isSoundOn(): boolean {
  return soundOn;
}

export function ensureAudio(): AudioContext | null {
  if (!soundOn) return null;
  if (!AC) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      AC = new Ctor();
      masterGain = AC.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(AC.destination);
    } catch {
      AC = null;
    }
  }
  if (AC && AC.state === 'suspended') {
    void AC.resume();
  }
  return AC;
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.12,
  delay = 0
): void {
  if (!soundOn) return;
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
  shoot()  { tone(760, 170, 0.08, 'square', 0.10); },
  eshoot() { tone(210, 65, 0.14, 'sawtooth', 0.10); },
  hit()    { tone(1250, 900, 0.035, 'square', 0.06); },
  hurt()   { tone(140, 48, 0.22, 'sawtooth', 0.16); tone(90, 40, 0.25, 'triangle', 0.12, 0.02); },
  die()    { tone(520, 60, 0.3, 'square', 0.11); tone(880, 120, 0.22, 'triangle', 0.07, 0.03); },
  word()   { tone(660, 660, 0.07, 'sine', 0.10); tone(990, 990, 0.1, 'sine', 0.10, 0.07); },
  wrong()  { tone(180, 90, 0.12, 'square', 0.09); },
  shield() { tone(520, 520, 0.09, 'sine', 0.10); tone(784, 784, 0.14, 'sine', 0.10, 0.08); },
  block()  { tone(340, 190, 0.09, 'triangle', 0.12); },
  wave()   { tone(440, 440, 0.09, 'sine', 0.09); tone(660, 660, 0.12, 'sine', 0.09, 0.09); },
};

export function setSoundEnabled(on: boolean, announce = true): void {
  soundOn = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  if (!on) {
    if (AC && AC.state === 'running') {
      void AC.suspend();
    }
  } else if (announce) {
    ensureAudio();
    SFX.word();
  }
}
