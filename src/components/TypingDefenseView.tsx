import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { DefenseHudSnapshot, TypingDefenseController } from '../defense/engine';
import { DailyChallenge, PlayVariant } from '../game/challenge';
import { buildDefenseShareText, renderDefenseShareCardPng } from '../game/shareCard';
import { MenuKeepFigure } from './MenuKeepFigure';
import { SocialShareBar } from './SocialShareBar';
import { WpmTrendChart } from './WpmTrendChart';

export interface TypingDefenseHandle {
  togglePause: () => void;
  restart: () => void;
}

interface TypingDefenseViewProps {
  darkMode: boolean;
  helpOpen: boolean;
  audioOpen: boolean;
  tutorialOpen: boolean;
  fastRestart: boolean;
  variant: PlayVariant;
  dailyChallenge: DailyChallenge;
  onChangeVariant: (v: PlayVariant) => void;
  onRunEnd: () => void;
  onCloseHelp: () => void;
  onStateSync: (state: { running: boolean; paused: boolean; over: boolean }) => void;
}

const INITIAL_HUD: DefenseHudSnapshot = {
  running: false,
  paused: false,
  over: false,
  variant: 'standard',
  challengeName: null,
  weaponLabel: 'Standard Tower',
  hp: 100,
  maxHp: 100,
  ink: 25,
  score: 0,
  wave: 0,
  kills: 0,
  acc: 100,
  wpm: 0,
  mult: 1,
  streak: 0,
  bestStreak: 0,
  bestScore: 0,
  shield: 0,
  cleanRun: 0,
  inter: 0,
  readout: 'rest',
  targetWord: null,
  targetPos: 0,
  targetMarks: [],
  turrets: [
    { level: 0, cost: 25, max: false, can: false },
    { level: 0, cost: 25, max: false, can: false },
    { level: 0, cost: 25, max: false, can: false },
  ],
  padTags: [],
  wpmHistory: [{ t: 0, wpm: 0 }],
};

function renderFeedTokens(text: string): React.ReactNode {
  return text.split(/(<b>.*?<\/b>|<span class="bad">.*?<\/span>)/g).map((part, idx) => {
    if (part.startsWith('<b>') && part.endsWith('</b>')) {
      return <b key={idx}>{part.slice(3, -4)}</b>;
    }
    if (part.startsWith('<span class="bad">') && part.endsWith('</span>')) {
      return (
        <span key={idx} className="bad">
          {part.slice(18, -7)}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const TypingDefenseView = forwardRef<TypingDefenseHandle, TypingDefenseViewProps>(
  (
    {
      darkMode,
      helpOpen,
      audioOpen,
      tutorialOpen,
      fastRestart,
      variant,
      dailyChallenge,
      onChangeVariant,
      onRunEnd,
      onCloseHelp,
      onStateSync,
    },
    ref
  ) => {
    const fieldRef = useRef<HTMLDivElement | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const labelsRef = useRef<HTMLDivElement | null>(null);
    const mobileInputRef = useRef<HTMLInputElement | null>(null);
    const controllerRef = useRef<TypingDefenseController | null>(null);

    const [hud, setHud] = useState<DefenseHudSnapshot>(INITIAL_HUD);
    const [feed, setFeed] = useState<string>(
      'type the first letter of any word to lock on — <b>1 · 2 · 3</b> build turrets'
    );
    const [banner, setBanner] = useState<{ title: string; sub?: string } | null>(null);
    const [shaking, setShaking] = useState<boolean>(false);
    const [inkBump, setInkBump] = useState<boolean>(false);
    const prevInkRef = useRef<number>(25);
    const prevOverRef = useRef<boolean>(false);
    const helpPausedRef = useRef<boolean>(false);
    const prevHelpRef = useRef<boolean>(false);
    const audioPausedRef = useRef<boolean>(false);
    const prevAudioRef = useRef<boolean>(false);
    const prevTutorialRef = useRef<boolean>(false);
    const tutorialPausedRef = useRef<boolean>(false);

    const variantRef = useRef(variant);
    variantRef.current = variant;
    const dailyRef = useRef(dailyChallenge);
    dailyRef.current = dailyChallenge;
    const onRunEndRef = useRef(onRunEnd);
    onRunEndRef.current = onRunEnd;
    const onStateSyncRef = useRef(onStateSync);
    onStateSyncRef.current = onStateSync;

    useEffect(() => {
      const boardEl = boardRef.current;
      const labelsEl = labelsRef.current;
      const fieldEl = fieldRef.current;
      if (!boardEl || !labelsEl || !fieldEl) return;

      const ctrl = new TypingDefenseController(boardEl, labelsEl, fieldEl, {
        onHud: snap => {
          setHud(snap);
          if (snap.over && !prevOverRef.current) {
            onRunEndRef.current();
          }
          prevOverRef.current = snap.over;
          if (snap.ink !== prevInkRef.current) {
            prevInkRef.current = snap.ink;
            setInkBump(false);
            window.requestAnimationFrame(() => setInkBump(true));
          }
          onStateSyncRef.current({
            running: snap.running,
            paused: snap.paused,
            over: snap.over,
          });
        },
        onFeed: msg => setFeed(msg),
        onBanner: (title, sub) => {
          if (title) setBanner({ title, sub });
          else setBanner(null);
        },
        onShake: () => {
          setShaking(false);
          window.requestAnimationFrame(() => {
            setShaking(true);
            window.setTimeout(() => setShaking(false), 300);
          });
        },
      });

      controllerRef.current = ctrl;
      return () => {
        ctrl.destroy();
        controllerRef.current = null;
      };
    }, []);

    // Pause automatically while Help, Audio, or Onboarding drawer opens
    useEffect(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      if (helpOpen && !prevHelpRef.current) {
        if (hud.running && !hud.paused) {
          helpPausedRef.current = true;
          ctrl.pause(true);
        }
      } else if (!helpOpen && prevHelpRef.current) {
        if (helpPausedRef.current && hud.running && hud.paused) {
          ctrl.pause(false);
        }
        helpPausedRef.current = false;
      }
      prevHelpRef.current = helpOpen;
    }, [helpOpen, hud.paused, hud.running]);

    useEffect(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      if (audioOpen && !prevAudioRef.current) {
        if (hud.running && !hud.paused) {
          audioPausedRef.current = true;
          ctrl.pause(true);
        }
      } else if (!audioOpen && prevAudioRef.current) {
        if (audioPausedRef.current && hud.running && hud.paused) {
          ctrl.pause(false);
        }
        audioPausedRef.current = false;
      }
      prevAudioRef.current = audioOpen;
    }, [audioOpen, hud.paused, hud.running]);

    useEffect(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      if (tutorialOpen && !prevTutorialRef.current) {
        if (hud.running && !hud.paused) {
          tutorialPausedRef.current = true;
          ctrl.pause(true);
        }
      } else if (!tutorialOpen && prevTutorialRef.current) {
        if (tutorialPausedRef.current && hud.running && hud.paused) {
          ctrl.pause(false);
        }
        tutorialPausedRef.current = false;
      }
      prevTutorialRef.current = tutorialOpen;
    }, [tutorialOpen, hud.paused, hud.running]);

    const startGame = useCallback(() => {
      prevOverRef.current = false;
      controllerRef.current?.start(variantRef.current, dailyRef.current);
    }, []);

    const togglePause = useCallback(() => {
      controllerRef.current?.pause();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        togglePause,
        restart: startGame,
      }),
      [startGame, togglePause]
    );

    // Keyboard & blur controls
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (helpOpen) {
            e.preventDefault();
            onCloseHelp();
            return;
          }
          if (tutorialOpen) return;
          if (hud.running) {
            e.preventDefault();
            togglePause();
          }
          return;
        }

        if (helpOpen || audioOpen || tutorialOpen) return;

        if (!hud.running) {
          if (e.key === 'Enter') {
            e.preventDefault();
            startGame();
            return;
          }
          if (hud.over && fastRestart && !(e.metaKey || e.ctrlKey || e.altKey)) {
            if (/^[a-zA-Z ]$/.test(e.key)) {
              e.preventDefault();
              startGame();
              return;
            }
            if (/^[123]$/.test(e.key)) {
              e.preventDefault();
              startGame();
              controllerRef.current?.build(Number(e.key) - 1);
              return;
            }
          }
          return;
        }

        if (hud.paused || e.metaKey || e.ctrlKey || e.altKey) return;
        if (document.activeElement === mobileInputRef.current) return;

        if (/^[123]$/.test(e.key)) {
          e.preventDefault();
          controllerRef.current?.build(Number(e.key) - 1);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          setFeed('no backspace — every key counts and moves on');
          return;
        }
        if (/^[a-zA-Z ]$/.test(e.key)) {
          e.preventDefault();
          controllerRef.current?.handleChar(e.key);
        }
      };

      const onBlur = () => {
        if (hud.running && !hud.paused) {
          controllerRef.current?.pause(true);
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('blur', onBlur);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('blur', onBlur);
      };
    }, [
      helpOpen,
      audioOpen,
      tutorialOpen,
      fastRestart,
      hud.running,
      hud.paused,
      hud.over,
      onCloseHelp,
      startGame,
      togglePause,
    ]);

    const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      e.target.value = '';
      for (const ch of v) {
        if (/^[123]$/.test(ch)) controllerRef.current?.build(Number(ch) - 1);
        else controllerRef.current?.handleChar(ch);
      }
    };

    const showOverlay = !hud.running || hud.paused || hud.over;
    const shieldLabel =
      hud.shield > 0
        ? `shield up · ${hud.shield} hit${hud.shield > 1 ? 's' : ''} left`
        : `shield · ${hud.cleanRun % 2}/2 clean`;

    return (
      <div className="td-view">
        {/* 7-Cell Defense HUD */}
        <section className="hud td-hud" aria-label="Keep defense status">
          <div className="hud-cell hud-hero">
            <span className="cap">Keep</span>
            <div className="hp-row">
              <div className={`hp-track${hud.hp <= Math.round(hud.maxHp * 0.3) ? ' low' : ''}`}>
                <div
                  className="hp-fill"
                  style={{ width: `${Math.min(100, Math.round((hud.hp / hud.maxHp) * 100))}%` }}
                />
              </div>
              <b className="mono">{hud.hp}</b>
            </div>
            <span className={`shield-status mono${hud.shield > 0 ? ' on' : ''}`}>
              {shieldLabel}
            </span>
          </div>

          <div className="hud-cell">
            <span className="cap">Ink</span>
            <b
              className={`hud-num mono${inkBump ? ' td-bump' : ''}`}
              onAnimationEnd={() => setInkBump(false)}
            >
              {hud.ink}
            </b>
          </div>

          <div className="hud-cell">
            <span className="cap">Score</span>
            <b className="hud-num mono">{hud.score.toLocaleString()}</b>
          </div>

          <div className="hud-cell td-hide-xs">
            <span className="cap">Wave</span>
            <b className="hud-num mono">{hud.wave}</b>
          </div>

          <div className="hud-cell">
            <span className="cap">Accuracy</span>
            <b className="hud-num mono">
              {hud.acc}
              <small>%</small>
            </b>
          </div>

          <div className="hud-cell">
            <span className="cap">Speed</span>
            <b className="hud-num mono">
              {hud.wpm} <small>wpm</small>
            </b>
          </div>

          <div className="hud-cell td-hide-xs">
            <span className="cap">Combo</span>
            <b className="hud-num mono">
              ×{hud.mult} <small>· {hud.streak}</small>
            </b>
          </div>
        </section>

        {/* Isometric Keep & Three Lanes Stage */}
        <section className="stage-wrap">
          <div className="stage-head">
            <span className="cap">
              {hud.running && hud.variant === 'daily' && hud.challengeName
                ? `Fig. 02 — Daily Challenge · ${hud.challengeName} (${hud.weaponLabel})`
                : 'Fig. 02 — The keep & three lanes'}
            </span>
            <span className="cap dim">{hud.readout}</span>
          </div>

          <div
            ref={fieldRef}
            className={`td-field${shaking ? ' shake' : ''}`}
          >
            <div
              ref={boardRef}
              id="board"
              className="hl-svg-stage"
              data-hairline="board"
              role="img"
              aria-label="An isometric keep at the left end of three lanes; words march from the gate on the right."
            />
            <div ref={labelsRef} className="td-labels" aria-hidden="true">
              {hud.padTags.map((pt, i) => (
                <div
                  key={i}
                  className={`td-padtag${pt.can ? ' can' : ''}`}
                  style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                >
                  <kbd>{i + 1}</kbd>
                  <span>{pt.max ? 'max' : pt.cost}</span>
                </div>
              ))}
            </div>

            {banner && (
              <div className="td-banner">
                {banner.title}
                {banner.sub && (
                  <>
                    {' '}
                    <small>· {banner.sub}</small>
                  </>
                )}
              </div>
            )}

            {/* MENU / PAUSE / GAME OVER OVERLAY */}
            <div className="overlay td-overlay" hidden={!showOverlay}>
              {!hud.over && !hud.paused && (
                <div className="td-card td-card-menu">
                  <MenuKeepFigure />
                  <div>
                    <span className="cap accent-cap">
                      {variant === 'daily' ? `Daily Challenge · ${dailyChallenge.dateKey}` : 'Typing defense'}
                    </span>
                    <h1 className="td-h1">
                      TYPING
                      <br />
                      DEFENSE
                    </h1>

                    <div className="variant-switch" role="tablist" aria-label="Game ruleset">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={variant === 'standard'}
                        className={`variant-tab mono${variant === 'standard' ? ' active' : ''}`}
                        onClick={() => onChangeVariant('standard')}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={variant === 'daily'}
                        className={`variant-tab mono${variant === 'daily' ? ' active' : ''}`}
                        onClick={() => onChangeVariant('daily')}
                      >
                        Daily: {dailyChallenge.weaponLabel}
                      </button>
                    </div>

                    {variant === 'daily' ? (
                      <div className="challenge-brief">
                        <strong>{dailyChallenge.name}</strong>
                        <p>{dailyChallenge.weaponDesc}</p>
                        <span className="mono challenge-mods">
                          Speed ×{dailyChallenge.enemySpeedMul} · Start Ink {dailyChallenge.startingInk} · Score ×{dailyChallenge.scoreMul}
                        </span>
                      </div>
                    ) : (
                      <p className="lede">
                        Words march down three lanes toward your keep. <b>Type them</b> before they
                        reach the line — every key fires, wrong keys draw a shot back.
                      </p>
                    )}

                    <button
                      className="cta"
                      type="button"
                      onClick={e => {
                        startGame();
                        e.currentTarget.blur();
                      }}
                    >
                      ▶ &nbsp;{variant === 'daily' ? 'START CHALLENGE' : 'START'}
                    </button>
                    <p className="fine">
                      {hud.bestScore > 0 ? (
                        <>
                          best score <b className="mono">{hud.bestScore.toLocaleString()}</b> ·{' '}
                        </>
                      ) : null}
                      press <kbd>Enter</kbd> to begin
                    </p>
                  </div>
                </div>
              )}

              {hud.paused && !hud.over && (
                <div className="overlay-card small">
                  <p className="cap accent-cap">Held</p>
                  <h2>PAUSED</h2>
                  <p className="lede">The lanes are holding.</p>
                  <button
                    className="cta"
                    type="button"
                    onClick={e => {
                      togglePause();
                      e.currentTarget.blur();
                    }}
                  >
                    ▶ &nbsp;RESUME
                  </button>
                  <p className="fine">
                    <kbd>Esc</kbd> resumes
                  </p>
                </div>
              )}

              {hud.over && (
                <div className="overlay-card over-wide">
                  <p className="cap accent-cap">The keep has fallen</p>
                  <h2>GAME OVER</h2>
                  <div className="final-stats">
                    <div>
                      <span className="cap">Score</span>
                      <b>{hud.score.toLocaleString()}</b>
                    </div>
                    <div>
                      <span className="cap">Walkers down</span>
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
                      <b>
                        ×{hud.bestStreak} · best {hud.bestScore.toLocaleString()}
                      </b>
                    </div>
                  </div>

                  <WpmTrendChart samples={hud.wpmHistory} finalWpm={hud.wpm} />

                  <SocialShareBar
                    compact
                    shareText={buildDefenseShareText(hud)}
                    cardFilename={`hairline-defense-wave-${hud.wave}.png`}
                    renderCardPng={() => renderDefenseShareCardPng(hud, darkMode)}
                  />

                  <div className="over-actions">
                    <button
                      className="cta"
                      type="button"
                      onClick={e => {
                        startGame();
                        e.currentTarget.blur();
                      }}
                    >
                      ↻ &nbsp;PLAY AGAIN
                    </button>
                    <p className="fine">
                      {fastRestart ? (
                        <>
                          Fast Restart ON — type <kbd>A–Z</kbd> to jump back in, or{' '}
                          <kbd>Enter</kbd>
                        </>
                      ) : (
                        <>
                          <kbd>Enter</kbd> also restarts
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── TYPING CONSOLE & LANE TURRET BUILDERS ── */}
          <div className="console">
            <div className="console-target">
              <span className="cap">Target</span>
              <div className="target-word mono td-target" aria-live="polite">
                {hud.targetWord ? (
                  [...hud.targetWord].map((c, i) => {
                    const m = hud.targetMarks[i];
                    const ch = c === ' ' ? '␣' : c;
                    const cls =
                      m === 'ok'
                        ? 'done'
                        : m === 'bad'
                          ? 'wronged'
                          : m === 'cut'
                            ? 'cut'
                            : i === hud.targetPos
                              ? 'cur'
                              : 'todo';
                    return (
                      <span key={i} className={cls}>
                        {ch}
                      </span>
                    );
                  })
                ) : (
                  <span className="tw-empty">—</span>
                )}
              </div>
            </div>

            <div className="console-feedback mono" aria-live="polite">
              {renderFeedTokens(feed)}
            </div>

            <div className="builds" role="group" aria-label="Lane turrets">
              {hud.turrets.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className={`build${t.can ? ' can' : ''}${t.max ? ' max' : ''}`}
                  disabled={t.max}
                  onClick={e => {
                    controllerRef.current?.build(i);
                    e.currentTarget.blur();
                  }}
                >
                  <kbd>{i + 1}</kbd>
                  <span className="b-lv">{t.level ? `L${t.level}` : '—'}</span>
                  <span className="b-cost">{t.max ? 'max' : `${t.cost} ink`}</span>
                </button>
              ))}
            </div>

            <button
              className="tool console-key"
              type="button"
              onClick={e => {
                if (!hud.running) startGame();
                window.requestAnimationFrame(() => {
                  mobileInputRef.current?.focus({ preventScroll: true });
                });
                e.currentTarget.blur();
              }}
            >
              ⌨ TYPE
            </button>

            <input
              ref={mobileInputRef}
              className="mobile-input"
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
      </div>
    );
  }
);

TypingDefenseView.displayName = 'TypingDefenseView';
