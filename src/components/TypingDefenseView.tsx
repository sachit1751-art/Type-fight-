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
import { PlayerHistory } from '../game/history';
import { computeArcadeRank } from '../game/rank';
import { buildDefenseShareText, renderDefenseShareCardPng } from '../game/shareCard';
import { MenuKeepFigure } from './MenuKeepFigure';
import { SocialShareBar } from './SocialShareBar';
import { WpmTrendChart } from './WpmTrendChart';
import { centerElementInVisibleViewport, isMobileFocusViewport } from '../game/viewportFocus';

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
  playerHistory: PlayerHistory;
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
  inkCombo: 0,
  inkMult: 1,
  inkComboRatio: 0,
  shield: 0,
  cleanRun: 0,
  inter: 0,
  readout: 'rest',
  targetWord: null,
  targetPos: 0,
  targetMarks: [],
  turrets: [
    { level: 0, cost: 25, max: false, can: false, cooldown: 0, cooldownRatio: 0, firing: false },
    { level: 0, cost: 25, max: false, can: false, cooldown: 0, cooldownRatio: 0, firing: false },
    { level: 0, cost: 25, max: false, can: false, cooldown: 0, cooldownRatio: 0, firing: false },
  ],
  padTags: [],
  wpmHistory: [{ t: 0, wpm: 0 }],
  lastRunRecords: null,
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
      playerHistory,
      onChangeVariant,
      onRunEnd,
      onCloseHelp,
      onStateSync,
    },
    ref
  ) => {
    const stageWrapRef = useRef<HTMLElement | null>(null);
    const fieldRef = useRef<HTMLDivElement | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const labelsRef = useRef<HTMLDivElement | null>(null);
    const mobileInputRef = useRef<HTMLInputElement | null>(null);
    const controllerRef = useRef<TypingDefenseController | null>(null);

    const [hud, setHud] = useState<DefenseHudSnapshot>(INITIAL_HUD);
    const [mobileLive, setMobileLive] = useState<boolean>(false);
    const consoleTouchRef = useRef<{ x: number; y: number } | null>(null);
    const [feed, setFeed] = useState<string>(
      'type the first letter of any word to lock on — <b>1 · 2 · 3</b> build turrets'
    );
    const [banner, setBanner] = useState<{
      title: string;
      sub?: string;
      isLevelUp?: boolean;
      isSpike?: boolean;
      key: number;
    } | null>(null);
    const [shaking, setShaking] = useState<boolean>(false);
    const [inkBump, setInkBump] = useState<boolean>(false);
    const [comboBump, setComboBump] = useState<boolean>(false);
    const [targetTypoKey, setTargetTypoKey] = useState<number>(0);
    const [targetCleanKey, setTargetCleanKey] = useState<number>(0);
    const prevInkRef = useRef<number>(25);
    const prevComboRef = useRef<number>(0);
    const prevWrongMarksRef = useRef<number>(0);
    const prevKillsRef = useRef<number>(0);
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
          if (snap.inkCombo !== prevComboRef.current) {
            const grew = snap.inkCombo > prevComboRef.current;
            prevComboRef.current = snap.inkCombo;
            if (grew) {
              setComboBump(false);
              window.requestAnimationFrame(() => setComboBump(true));
            }
          }
          const wrongCount = snap.targetMarks.filter(m => m === 'bad').length;
          if (wrongCount > prevWrongMarksRef.current) {
            setTargetTypoKey(k => k + 1);
          }
          prevWrongMarksRef.current = wrongCount;
          if (snap.kills > prevKillsRef.current) {
            setTargetCleanKey(k => k + 1);
          }
          prevKillsRef.current = snap.kills;
          onStateSyncRef.current({
            running: snap.running,
            paused: snap.paused,
            over: snap.over,
          });
        },
        onFeed: msg => setFeed(msg),
        onBanner: (title, sub, meta) => {
          if (title) {
            setBanner({
              title,
              sub,
              isLevelUp: meta?.isLevelUp,
              isSpike: meta?.isSpike,
              key: meta?.isLevelUp ? Date.now() + Math.random() : 0,
            });
          } else {
            setBanner(null);
          }
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

    const focusPlayCard = useCallback((openKeyboard = false) => {
      if (isMobileFocusViewport()) {
        window.requestAnimationFrame(() => {
          centerElementInVisibleViewport(stageWrapRef.current, 'smooth');
          if (openKeyboard) {
            setMobileLive(true);
            mobileInputRef.current?.focus({ preventScroll: true });
          }
        });
      } else if (openKeyboard) {
        setMobileLive(true);
        window.requestAnimationFrame(() => {
          mobileInputRef.current?.focus({ preventScroll: true });
        });
      }
    }, []);

    // Keep active Typing Defence card centered across mobile screen resize / keyboard events
    useEffect(() => {
      if (!hud.running || hud.paused || hud.over || helpOpen || audioOpen || tutorialOpen) return;
      let settleTimer = 0;
      const recenter = () => {
        if (!isMobileFocusViewport()) return;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          window.requestAnimationFrame(() => {
            centerElementInVisibleViewport(stageWrapRef.current, 'smooth');
          });
        }, 85);
      };
      recenter();
      const vv = window.visualViewport;
      vv?.addEventListener('resize', recenter);
      window.addEventListener('resize', recenter);
      window.addEventListener('orientationchange', recenter);
      return () => {
        window.clearTimeout(settleTimer);
        vv?.removeEventListener('resize', recenter);
        window.removeEventListener('resize', recenter);
        window.removeEventListener('orientationchange', recenter);
      };
    }, [hud.running, hud.paused, hud.over, helpOpen, audioOpen, tutorialOpen]);

    const startGame = useCallback(() => {
      prevOverRef.current = false;
      prevWrongMarksRef.current = 0;
      prevKillsRef.current = 0;
      setTargetTypoKey(0);
      setTargetCleanKey(0);
      controllerRef.current?.start(variantRef.current, dailyRef.current);
      focusPlayCard(false);
    }, [focusPlayCard]);

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
            <span key={`td-sh-${hud.shield}`} className={`shield-status mono${hud.shield > 0 ? ' on hud-pop' : ''}`}>
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
              {hud.inkMult > 1 ? <small> · ×{hud.inkMult}</small> : null}
            </b>
          </div>

          <div className="hud-cell">
            <span className="cap">Score</span>
            <b className="hud-num mono">{hud.score.toLocaleString()}</b>
          </div>

          <div className="hud-cell td-hide-xs">
            <span className="cap">Wave</span>
            <b key={`td-w-${hud.wave}`} className="hud-num mono hud-pop">
              {hud.wave}
            </b>
          </div>

          <div className="hud-cell">
            <span className="cap">Accuracy</span>
            <b className="mono hud-num">
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

          <div
            className={`hud-cell td-combo-cell${hud.inkMult > 1 ? ' td-combo-active' : ''}`}
            role="status"
            aria-label={`Ink combo multiplier ${hud.inkMult}x, ${hud.inkCombo} consecutive kills`}
          >
            <span className="cap">Ink Combo</span>
            <b
              className={`hud-num mono${hud.inkMult > 1 ? ' td-combo-hot' : ''}${
                comboBump ? ' td-bump' : ''
              }`}
              onAnimationEnd={() => setComboBump(false)}
            >
              ×{hud.inkMult}{' '}
              <small>
                {hud.inkCombo > 0 ? `· ${hud.inkCombo} chain` : `· pts ×${hud.mult}`}
              </small>
            </b>
            <div className="td-combo-track" aria-hidden="true">
              <div
                className={`td-combo-fill${hud.inkMult > 1 ? ' hot' : ''}`}
                style={{ width: `${Math.round(hud.inkComboRatio * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Persistent On-Screen Turret Keyboard Guide (Keys 1–3) */}
        <section className="td-keybar" aria-label="Turret placement and cooldown keyboard guide">
          <span className="cap td-keybar-label">Turret Keys</span>
          <div className="td-keybar-keys" role="group" aria-label="Turret shortcut keys 1 to 3">
            {hud.turrets.map((t, i) => {
              const isCooling = t.level > 0 && t.cooldown > 0;
              const isActive = t.level > 0 && !isCooling;
              const isReadyToBuild = t.level === 0 && t.can;
              const stateCls = isCooling
                ? 'cooling'
                : isActive
                  ? 'active'
                  : isReadyToBuild
                    ? 'ready'
                    : 'idle';
              const statusText = isCooling
                ? `COOL ${t.cooldown.toFixed(1)}s`
                : isActive
                  ? t.max
                    ? 'ACTIVE MAX'
                    : t.can
                      ? `UPG ${t.cost}`
                      : 'ACTIVE'
                  : t.can
                    ? `BUILD ${t.cost}`
                    : `NEED ${t.cost}`;

              return (
                <button
                  key={i}
                  type="button"
                  className={`td-keycap mono ${stateCls}`}
                  disabled={!hud.running || t.max}
                  title={`Press ${i + 1} for Lane ${i + 1} turret (${statusText})`}
                  aria-label={`Key ${i + 1}, Lane ${i + 1}, ${
                    t.level > 0 ? `Level ${t.level}` : 'Unbuilt'
                  }, ${statusText}`}
                  onClick={e => {
                    controllerRef.current?.build(i);
                    e.currentTarget.blur();
                  }}
                >
                  <kbd>{i + 1}</kbd>
                  <span className="td-keycap-lane">
                    L{i + 1}
                    {t.level > 0 ? `·Lv${t.level}` : ''}
                  </span>
                  <span className="td-keycap-state">{statusText}</span>
                  {isCooling && (
                    <span className="td-keycap-cd" aria-hidden="true">
                      <span
                        className="td-keycap-cd-fill"
                        style={{ transform: `scaleX(${t.cooldownRatio})` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Isometric Keep & Three Lanes Stage */}
        <section ref={stageWrapRef} className="stage-wrap" aria-label="Typing Defence arena card">
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
            onClick={e => {
              if (
                hud.running &&
                !hud.paused &&
                !hud.over &&
                window.innerWidth <= 860 &&
                (e.target === e.currentTarget || Boolean(boardRef.current?.contains(e.target as Node)))
              ) {
                focusPlayCard(true);
              }
            }}
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

            {banner &&
              (banner.isLevelUp ? (
                <div
                  key={banner.key}
                  className={`level-wipe-overlay is-levelup${banner.isSpike ? ' is-spike' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="level-wipe-rule level-wipe-rule--top" aria-hidden="true" />
                  <span className="level-wipe-body">
                    <span className="level-wipe-title">{banner.title}</span>
                    {banner.sub && (
                      <>
                        <span className="level-wipe-sep" aria-hidden="true" />
                        <span className="level-wipe-sub">{banner.sub}</span>
                      </>
                    )}
                  </span>
                  <span className="level-wipe-rule level-wipe-rule--bot" aria-hidden="true" />
                </div>
              ) : (
                <div className="td-banner">
                  {banner.title}
                  {banner.sub && (
                    <>
                      {' '}
                      <small>· {banner.sub}</small>
                    </>
                  )}
                </div>
              ))}

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

              {hud.over && (() => {
                const rank = computeArcadeRank({
                  wpm: hud.wpm,
                  acc: hud.acc,
                  wave: hud.wave,
                  kills: hud.kills,
                });
                const rec = hud.lastRunRecords;
                return (
                  <div className="overlay-card over-wide">
                    <p className="cap accent-cap">The keep has fallen</p>
                    <h2>GAME OVER</h2>

                    <div className={`rank-banner${rank.isTopTier ? ' top' : ''}`} aria-label={`Run rank ${rank.grade}, ${rank.title}`}>
                      <span className="rank-grade mono">{rank.grade}</span>
                      <div className="rank-copy">
                        <strong>{rank.title}</strong>
                        <span className="mono">{rank.note}</span>
                      </div>
                    </div>

                    <div className="final-stats">
                      <div>
                        <span className="cap">
                          Session Score{' '}
                          {rec?.isNewBestScore && <em className="new-rec-tag">NEW</em>}
                        </span>
                        <b>{hud.score.toLocaleString()}</b>
                      </div>
                      <div>
                        <span className="cap">Session Accuracy</span>
                        <b>{hud.acc}%</b>
                      </div>
                      <div>
                        <span className="cap">
                          Lifetime Best Acc{' '}
                          {rec?.isNewLifetimeAcc && <em className="new-rec-tag">NEW</em>}
                        </span>
                        <b>{Math.max(playerHistory.lifetimeBestAccuracy, hud.acc)}%</b>
                      </div>
                      <div>
                        <span className="cap">Wave &amp; Walkers</span>
                        <b>
                          W{hud.wave} · {hud.kills} down
                        </b>
                      </div>
                      <div>
                        <span className="cap">
                          Speed{' '}
                          {rec?.isNewFastestWpm && <em className="new-rec-tag">NEW</em>}
                        </span>
                        <b>{hud.wpm} wpm</b>
                      </div>
                      <div>
                        <span className="cap">Best Score</span>
                        <b>{Math.max(hud.bestScore, playerHistory.defense.bestScore).toLocaleString()}</b>
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
                );
              })()}
            </div>
          </div>

          {/* ── TYPING CONSOLE & LANE TURRET BUILDERS ── */}
          <div
            className="console"
            onTouchStart={e => {
              const t = e.touches[0];
              if (t) consoleTouchRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={e => {
              const o = consoleTouchRef.current;
              consoleTouchRef.current = null;
              const t = e.changedTouches[0];
              if (!o || !t || !hud.running || hud.paused) return;
              const dx = t.clientX - o.x;
              const dy = t.clientY - o.y;
              if (Math.abs(dy) < 42 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
              if (dy < 0) {
                focusPlayCard(true);
              } else {
                controllerRef.current?.pause(true);
              }
            }}
          >
            <div className={`console-target${hud.targetWord ? ' has-target' : ''}`}>
              {targetCleanKey > 0 && (
                <span key={targetCleanKey} className="target-sweep" aria-hidden="true" />
              )}
              <span className="cap">Target</span>
              <div
                key={`typo-${targetTypoKey}`}
                className={`target-word mono td-target${
                  targetTypoKey > 0 ? ' target-typo-nudge' : ''
                }`}
                aria-live="polite"
              >
                {hud.targetWord ? (
                  [...hud.targetWord].map((c, i) => {
                    const m = hud.targetMarks[i];
                    const ch = c === ' ' ? '␣' : c;
                    const justHit = i === hud.targetPos - 1;
                    const cls =
                      m === 'ok'
                        ? `done${justHit ? ' char-pop' : ''}`
                        : m === 'bad'
                          ? `wronged${justHit ? ' char-pop' : ''}`
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

            <div className="console-actions">
              <button
                className="tool console-pause-btn"
                type="button"
                title="Pause game"
                aria-label="Pause game"
                onClick={e => {
                  controllerRef.current?.pause(true);
                  e.currentTarget.blur();
                }}
              >
                Ⅱ
              </button>
              <button
                className="tool console-key"
                type="button"
                onClick={e => {
                  if (!hud.running) startGame();
                  focusPlayCard(true);
                  e.currentTarget.blur();
                }}
              >
                ⌨ TYPE
              </button>
            </div>

            <input
              ref={mobileInputRef}
              className={`mobile-input${mobileLive ? ' live' : ''}`}
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Type here"
              onBlur={() => setMobileLive(false)}
              onChange={handleMobileInput}
            />
          </div>
        </section>
      </div>
    );
  }
);

TypingDefenseView.displayName = 'TypingDefenseView';
