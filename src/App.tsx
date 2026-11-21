import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HelpDrawer } from './components/HelpDrawer';
import { HudBar } from './components/HudBar';
import { TopBar } from './components/TopBar';
import { ensureAudio, isSoundOn, setSoundEnabled, SFX } from './game/audio';
import {
  createPillars,
  drawGame,
  EngineCallbacks,
  freshState,
  getHudSnapshot,
  H,
  handleChar,
  spawnEnemy,
  updateGame,
  W,
} from './game/engine';
import { GameState, HudSnapshot } from './game/types';

const THEME_KEY = 'hairline-type-defense-theme';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);
  const helpCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  const gameRef = useRef<GameState>(freshState());
  const pillarsRef = useRef(createPillars());

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const darkRef = useRef(darkMode);
  darkRef.current = darkMode;

  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundOn());
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const helpOpenRef = useRef(helpOpen);
  helpOpenRef.current = helpOpen;
  const helpPausedGameRef = useRef<boolean>(false);

  const [hud, setHud] = useState<HudSnapshot>(() => getHudSnapshot(gameRef.current));
  const [feedbackHtml, setFeedbackHtml] = useState<string>(
    'press START, then type straight through the current word'
  );
  const [feedbackKind, setFeedbackKind] = useState<'' | 'good' | 'bad'>('');
  const feedbackTimerRef = useRef<number | null>(null);

  const [waveBanner, setWaveBanner] = useState<{ text: string; key: number } | null>(null);
  const waveTimerRef = useRef<number | null>(null);

  const [shaking, setShaking] = useState<boolean>(false);
  const shakeTimerRef = useRef<number | null>(null);

  const [vignetteKey, setVignetteKey] = useState<number>(0);
  const [streakPop, setStreakPop] = useState<boolean>(false);
  const streakPopTimerRef = useRef<number | null>(null);
  const [mobileLive, setMobileLive] = useState<boolean>(false);

  useEffect(() => {
    document.body.classList.toggle('dark-plate', darkMode);
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const syncHudNow = useCallback(() => {
    setHud(getHudSnapshot(gameRef.current));
  }, []);

  const triggerFeedback = useCallback((html: string, kind: '' | 'good' | 'bad' = '') => {
    setFeedbackHtml(html);
    setFeedbackKind(kind);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    if (kind) {
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedbackKind('');
      }, 2600);
    }
  }, []);

  const showWaveBanner = useCallback((w: number) => {
    setWaveBanner({ text: `WAVE ${w}`, key: Date.now() + Math.random() });
    if (waveTimerRef.current) window.clearTimeout(waveTimerRef.current);
    waveTimerRef.current = window.setTimeout(() => {
      setWaveBanner(null);
    }, 1850);
  }, []);

  const callbacksRef = useRef<EngineCallbacks>({
    onFeedback: () => {},
    onWave: () => {},
    onShake: () => {},
    onHitVignette: () => {},
    onStreakPop: () => {},
    onGameOver: () => {},
  });

  callbacksRef.current = {
    onFeedback: triggerFeedback,
    onWave: (w: number) => {
      showWaveBanner(w);
      syncHudNow();
    },
    onShake: () => {
      setShaking(false);
      window.requestAnimationFrame(() => {
        setShaking(true);
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = window.setTimeout(() => setShaking(false), 340);
      });
    },
    onHitVignette: () => {
      setVignetteKey(k => k + 1);
    },
    onStreakPop: () => {
      setStreakPop(true);
      if (streakPopTimerRef.current) window.clearTimeout(streakPopTimerRef.current);
      streakPopTimerRef.current = window.setTimeout(() => setStreakPop(false), 140);
    },
    onGameOver: () => {
      triggerFeedback('the hero is down — press <b>PLAY AGAIN</b> or <kbd>Enter</kbd>', 'bad');
      syncHudNow();
    },
  };

  const startGame = useCallback(() => {
    const G = freshState();
    G.mode = 'playing';
    G.spawnT = 2.4;
    gameRef.current = G;

    spawnEnemy(G, callbacksRef.current);
    spawnEnemy(G, callbacksRef.current);
    if (G.enemies[1]) {
      G.enemies[1].x = W + 260;
    }

    showWaveBanner(1);
    triggerFeedback(
      'type straight through the <b>current word</b> — wrong letters count, but never block you.',
      'good'
    );
    ensureAudio();
    SFX.wave();
    syncHudNow();
  }, [showWaveBanner, syncHudNow, triggerFeedback]);

  const togglePause = useCallback(
    (force?: boolean) => {
      const G = gameRef.current;
      if (G.mode === 'playing' || (force === true && G.mode === 'paused')) {
        if (G.mode === 'playing') {
          G.mode = 'paused';
        }
      } else if (G.mode === 'paused') {
        G.mode = 'playing';
      }
      syncHudNow();
    },
    [syncHudNow]
  );

  const openHelp = useCallback(() => {
    if (helpOpenRef.current) return;
    const G = gameRef.current;
    helpPausedGameRef.current = G.mode === 'playing';
    if (helpPausedGameRef.current) {
      G.mode = 'paused';
      syncHudNow();
    }
    setHelpOpen(true);
    window.requestAnimationFrame(() => {
      helpCloseBtnRef.current?.focus({ preventScroll: true });
    });
  }, [syncHudNow]);

  const closeHelp = useCallback(() => {
    if (!helpOpenRef.current) return;
    setHelpOpen(false);
    const G = gameRef.current;
    if (helpPausedGameRef.current && G.mode === 'paused') {
      G.mode = 'playing';
      syncHudNow();
    }
    helpPausedGameRef.current = false;
    window.requestAnimationFrame(() => {
      helpBtnRef.current?.focus({ preventScroll: true });
    });
  }, [syncHudNow]);

  const processChar = useCallback(
    (ch: string) => {
      handleChar(gameRef.current, ch, callbacksRef.current);
      syncHudNow();
    },
    [syncHudNow]
  );

  /* Main 60fps canvas animation loop */
  useEffect(() => {
    let rafId = 0;
    const frame = (ts: number) => {
      const G = gameRef.current;
      const dt = Math.min(0.05, G.lastTs ? (ts - G.lastTs) / 1000 : 0.016);
      G.lastTs = ts;
      if (G.mode !== 'paused') {
        const prevKills = G.kills;
        const prevHp = G.hero.hp;
        const prevTarget = G.activeId;
        updateGame(G, dt, callbacksRef.current);
        if (G.kills !== prevKills || G.hero.hp !== prevHp || G.activeId !== prevTarget) {
          setHud(getHudSnapshot(G));
        }
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.round(W * dpr);
        const targetH = Math.round(H * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawGame(ctx, G, pillarsRef.current, darkRef.current);
        }
      }
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  /* Periodic HUD sync for WPM readout while playing */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (gameRef.current.mode === 'playing') {
        syncHudNow();
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [syncHudNow]);

  /* Global keyboard & window blur listeners */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (helpOpenRef.current) {
          e.preventDefault();
          closeHelp();
          return;
        }
        const mode = gameRef.current.mode;
        if (mode === 'playing' || mode === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (helpOpenRef.current) return;

      if (e.key === 'Enter') {
        const mode = gameRef.current.mode;
        if (mode === 'menu' || mode === 'over') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (gameRef.current.mode !== 'playing') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement === mobileInputRef.current) return;

      if (e.key.length === 1 && /[a-zA-Z ]/.test(e.key)) {
        e.preventDefault();
        processChar(e.key);
      }
    };

    const onBlur = () => {
      if (gameRef.current.mode === 'playing') {
        togglePause(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [closeHelp, processChar, startGame, togglePause]);

  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    e.target.value = '';
    for (const ch of v) {
      processChar(ch);
    }
  };

  const handleToggleSound = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !soundOn;
    setSoundEnabled(next, true);
    setSoundOn(next);
    e.currentTarget.blur();
  };

  const handleToggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    setDarkMode(d => !d);
    e.currentTarget.blur();
  };

  const handleTogglePause = (e: React.MouseEvent<HTMLButtonElement>) => {
    const mode = gameRef.current.mode;
    if (mode === 'playing' || mode === 'paused') {
      togglePause();
    }
    e.currentTarget.blur();
  };

  const handleRestart = (e: React.MouseEvent<HTMLButtonElement>) => {
    startGame();
    e.currentTarget.blur();
  };

  const handleKeyboardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const mode = gameRef.current.mode;
    if (mode === 'menu' || mode === 'over') {
      startGame();
    }
    setMobileLive(true);
    window.requestAnimationFrame(() => {
      mobileInputRef.current?.focus({ preventScroll: true });
    });
    e.currentTarget.blur();
  };

  return (
    <>
      <TopBar
        mode={hud.mode}
        soundOn={soundOn}
        darkMode={darkMode}
        helpOpen={helpOpen}
        helpBtnRef={helpBtnRef}
        onOpenHelp={() => {
          openHelp();
          helpBtnRef.current?.blur();
        }}
        onToggleSound={handleToggleSound}
        onToggleTheme={handleToggleTheme}
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
      />

      <main className="shell">
        <HudBar hud={hud} streakPop={streakPop} />

        <section className="stage-wrap">
          <div className="stage-head">
            <span className="cap">Fig. 01 — The firing line</span>
            <span className="cap dim" id="stageReadout">
              {hud.readout}
            </span>
          </div>

          <div className={`stage${shaking ? ' shake' : ''}`} id="stage">
            <canvas
              ref={canvasRef}
              id="game"
              width={W}
              height={H}
              aria-label="Battlefield: a stick-figure hero on the left shooting typed letters at stick-figure enemies approaching from the right."
            />

            {waveBanner && (
              <div key={waveBanner.key} className="wave-banner" id="waveBanner">
                {waveBanner.text}
              </div>
            )}

            <div
              key={vignetteKey}
              className={`hit-vignette${vignetteKey > 0 ? ' on' : ''}`}
              id="hitVignette"
              aria-hidden="true"
            />

            {/* MENU */}
            <div className="overlay" id="menuOverlay" hidden={hud.mode !== 'menu'}>
              <div className="overlay-card">
                <p className="cap accent-cap">A typing shooter · drawn with hairlines</p>
                <h1>
                  TYPE
                  <br />
                  ARCADE
                </h1>
                <p className="lede">
                  Enemies march in from the right, each carrying a word over its head.{' '}
                  <strong>Type the word</strong> — every correct letter is a bullet from the
                  hero&apos;s rifle. Finish the word and the enemy falls.{' '}
                  <strong>Type a wrong letter and that enemy fires back.</strong>
                </p>
                <div className="rules-mini">
                  <div>
                    <span className="rule-glyph ok">a →</span>
                    <span>correct letter — hero fires</span>
                  </div>
                  <div>
                    <span className="rule-glyph bad">a ✕</span>
                    <span>wrong letter — the enemy fires back</span>
                  </div>
                </div>
                <button
                  className="cta"
                  id="btnStart"
                  type="button"
                  onClick={e => {
                    startGame();
                    e.currentTarget.blur();
                  }}
                >
                  ▶ &nbsp;START — then just type
                </button>
                <p className="fine">
                  Full instructions live under <em>? HELP</em> in the top bar.
                </p>
              </div>
            </div>

            {/* PAUSE */}
            <div className="overlay" id="pauseOverlay" hidden={hud.mode !== 'paused'}>
              <div className="overlay-card small">
                <p className="cap accent-cap">Held</p>
                <h2>PAUSED</h2>
                <p className="lede">The line is holding. Breathe.</p>
                <button
                  className="cta"
                  id="btnResume"
                  type="button"
                  onClick={e => {
                    togglePause();
                    e.currentTarget.blur();
                  }}
                >
                  ▶ &nbsp;RESUME
                </button>
                <p className="fine">
                  <kbd>Esc</kbd> also resumes
                </p>
              </div>
            </div>

            {/* GAME OVER */}
            <div className="overlay" id="overOverlay" hidden={hud.mode !== 'over'}>
              <div className="overlay-card small">
                <p className="cap accent-cap">The hero is down</p>
                <h2>GAME OVER</h2>
                <div className="final-stats" id="finalStats">
                  <div>
                    <span className="cap">Score</span>
                    <b>{hud.score.toLocaleString()}</b>
                  </div>
                  <div>
                    <span className="cap">Enemies down</span>
                    <b>{hud.kills}</b>
                  </div>
                  <div>
                    <span className="cap">Wave reached</span>
                    <b>{hud.wave}</b>
                  </div>
                  <div>
                    <span className="cap">Accuracy</span>
                    <b>{hud.acc}%</b>
                  </div>
                  <div>
                    <span className="cap">Speed</span>
                    <b>{hud.wpm} wpm</b>
                  </div>
                  <div>
                    <span className="cap">Best streak</span>
                    <b>×{hud.bestStreak}</b>
                  </div>
                </div>
                <button
                  className="cta"
                  id="btnAgain"
                  type="button"
                  onClick={e => {
                    startGame();
                    e.currentTarget.blur();
                  }}
                >
                  ↻ &nbsp;PLAY AGAIN
                </button>
                <p className="fine">
                  <kbd>Enter</kbd> also restarts
                </p>
              </div>
            </div>
          </div>

          {/* ── TYPING CONSOLE ── */}
          <div className="console" id="consoleBar">
            <div className="console-target">
              <span className="cap">Target</span>
              <div
                className={`target-word mono${hud.targetIsLine ? ' phrase' : ''}`}
                id="targetWord"
                aria-live="polite"
              >
                {hud.targetWord ? (
                  [...hud.targetWord].map((ch, i) => {
                    const glyph = ch === ' ' ? '␣' : ch;
                    const cls =
                      i < hud.targetProgress
                        ? hud.targetMarks[i] === false
                          ? 'wronged'
                          : 'done'
                        : i === hud.targetProgress
                          ? 'cur'
                          : 'todo';
                    return (
                      <span key={i} className={cls}>
                        {glyph}
                      </span>
                    );
                  })
                ) : (
                  <span className="tw-empty">— waiting for the next word —</span>
                )}
              </div>
            </div>

            <div
              className={`console-feedback mono${feedbackKind ? ` ${feedbackKind}` : ''}`}
              id="feedback"
              aria-live="polite"
            >
              {feedbackHtml.split(/(<b>.*?<\/b>|<kbd>.*?<\/kbd>)/g).map((part, idx) => {
                if (part.startsWith('<b>') && part.endsWith('</b>')) {
                  return <b key={idx}>{part.slice(3, -4)}</b>;
                }
                if (part.startsWith('<kbd>') && part.endsWith('</kbd>')) {
                  return <kbd key={idx}>{part.slice(5, -6)}</kbd>;
                }
                return <React.Fragment key={idx}>{part}</React.Fragment>;
              })}
            </div>

            <button
              className="tool console-key"
              id="btnKeyboard"
              type="button"
              title="Open the touch / on-screen keyboard"
              onClick={handleKeyboardClick}
            >
              ⌨ TYPE HERE
            </button>

            <input
              ref={mobileInputRef}
              id="mobileInput"
              className={`mobile-input${mobileLive ? ' live' : ''}`}
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Type here"
              onChange={handleMobileInput}
            />
          </div>
        </section>
      </main>

      <HelpDrawer
        open={helpOpen}
        closeBtnRef={helpCloseBtnRef}
        onClose={closeHelp}
      />
    </>
  );
}
