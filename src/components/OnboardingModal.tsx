import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DefenseHudSnapshot, TypingDefenseController } from '../defense/engine';
import { ensureAudio, SFX } from '../game/audio';
import {
  burst,
  createPillars,
  drawGame,
  EngineCallbacks,
  fireEnemyBullet,
  floatText,
  freshState,
  getHudSnapshot,
  H,
  handleChar as arcadeHandleChar,
  HERO_GY,
  HERO_X,
  LANES,
  LINE_X,
  updateGame,
  W,
} from '../game/engine';
import { GameState, HudSnapshot } from '../game/types';

interface OnboardingModalProps {
  open: boolean;
  targetGame: 'arcade' | 'defense';
  darkMode: boolean;
  onClose: () => void;
  onEnterGame: (game: 'arcade' | 'defense') => void;
}

const ARCADE_TUTORIAL_WORDS = ['aim', 'hit', 'fire'];

function seedArcadeStepState(step: 0 | 1): GameState {
  const G = freshState('standard', null);
  G.mode = 'playing';
  G.spawnT = 999999;

  if (step === 0) {
    ARCADE_TUTORIAL_WORDS.forEach((word, idx) => {
      const lane = LANES[idx % LANES.length];
      G.enemies.push({
        id: G.nextId++,
        type: idx === 2 ? 'brute' : idx === 0 ? 'runner' : 'walker',
        word,
        isLine: false,
        progress: 0,
        marks: [],
        completed: false,
        x: 500 + idx * 145,
        gy: lane.gy,
        s: lane.s,
        speed: 14,
        phase: idx * 1.4,
        state: 'alive',
        deathT: 0,
        flashT: 0,
        shakeT: 0,
        kb: 0,
        attackCd: 99,
        muzzleT: 0,
        seed: idx + 1,
      });
    });
  } else {
    G.shield.active = true;
    G.shield.cleanWords = 2;
    G.enemies.push({
      id: G.nextId++,
      type: 'walker',
      word: 'guard',
      isLine: false,
      progress: 0,
      marks: [],
      completed: false,
      x: 680,
      gy: LANES[1].gy,
      s: LANES[1].s,
      speed: 8,
      phase: 0.6,
      state: 'alive',
      deathT: 0,
      flashT: 0,
      shakeT: 0,
      kb: 0,
      attackCd: 99,
      muzzleT: 0,
      seed: 7,
    });
  }
  return G;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  targetGame,
  darkMode,
  onClose,
  onEnterGame,
}) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Type Arcade Mini-Canvas Refs & State
  const arcadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const arcadeGameRef = useRef<GameState>(seedArcadeStepState(0));
  const arcadePillarsRef = useRef(createPillars());
  const darkRef = useRef(darkMode);
  darkRef.current = darkMode;
  const fireFxTriggeredRef = useRef(false);
  const [arcadeHud, setArcadeHud] = useState<HudSnapshot>(() =>
    getHudSnapshot(arcadeGameRef.current)
  );
  const [fireFxTriggered, setFireFxTriggered] = useState(false);
  const [shieldBlocks, setShieldBlocks] = useState(0);

  // Typing Defence Real Engine Controller Refs & State
  const defFieldRef = useRef<HTMLDivElement | null>(null);
  const defBoardRef = useRef<HTMLDivElement | null>(null);
  const defLabelsRef = useRef<HTMLDivElement | null>(null);
  const defCtrlRef = useRef<TypingDefenseController | null>(null);
  const [defHud, setDefHud] = useState<DefenseHudSnapshot | null>(null);

  const timersRef = useRef<number[]>([]);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const clearScheduledTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => clearScheduledTimers, [clearScheduledTimers]);

  const triggerFireVisualEffect = useCallback((G: GameState) => {
    if (fireFxTriggeredRef.current) return;
    fireFxTriggeredRef.current = true;
    setFireFxTriggered(true);

    // Multi-lane hairline laser sweep + burst particles + FIRE! banner on mini-canvas
    const beamY = [LANES[0].gy - 42, LANES[1].gy - 42, LANES[2].gy - 42];
    beamY.forEach(by => {
      G.beams.push({
        x1: HERO_X + 44,
        y1: HERO_GY - 44,
        x2: W - 40,
        y2: by,
        life: 0,
        max: 0.55,
      });
    });
    burst(G, 460, 250, 28, true);
    burst(G, 620, 290, 22, false);
    floatText(G, 460, 195, '★ FIRE EFFECT ACTIVE ★', 'kill');
    G.hero.muzzleT = 0.25;
    G.shake = 0.55;
    G.shield.active = true;
    G.shield.flashT = 0.6;
    SFX.rail();
    scheduleTimer(() => SFX.word(), 110);
    setStatusMsg('3/3 words cleared — FIRE visual effect triggered! Continue to Step 2.');
  }, [scheduleTimer]);

  const arcadeCallbacksRef = useRef<EngineCallbacks>({
    onFeedback: () => {},
    onWave: () => {},
    onShake: () => {},
    onHitVignette: () => {},
    onStreakPop: () => {},
    onGameOver: () => {},
  });

  arcadeCallbacksRef.current = {
    onFeedback: (html: string) => {
      const clean = html.replace(/<[^>]+>/g, '');
      if (clean && !fireFxTriggeredRef.current) {
        setStatusMsg(clean);
      }
    },
    onWave: () => {},
    onShake: () => {},
    onHitVignette: () => {},
    onStreakPop: () => {},
    onGameOver: () => {},
  };

  // Reset back to Step 1 whenever the tutorial opens or switches games
  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open, targetGame]);

  // Initialize step state whenever modal opens, game changes, or step changes
  useEffect(() => {
    if (!open) {
      clearScheduledTimers();
      return;
    }
    if (targetGame === 'arcade') {
      fireFxTriggeredRef.current = false;
      setFireFxTriggered(false);
      setShieldBlocks(0);
      const next = seedArcadeStepState(step);
      arcadeGameRef.current = next;
      setArcadeHud(getHudSnapshot(next));
      setStatusMsg(
        step === 0
          ? 'Type all 3 simple words ("aim", "hit", "fire") to trigger the FIRE visual effect.'
          : 'Click TEST DEFLECT (or press any key) to watch the shield bounce enemy fire.'
      );
    } else {
      setStatusMsg(
        step === 0
          ? 'Type "keep" to shoot bolts from the Keep and collect Ink.'
          : 'Press 1 to place a turret in Lane 1, then press 2 for Lane 2.'
      );
    }
  }, [clearScheduledTimers, open, step, targetGame]);

  // Run Type Arcade Mini-Canvas animation loop when Type Arcade tutorial is open
  useEffect(() => {
    if (!open || targetGame !== 'arcade') return;
    let rafId = 0;

    const frame = (ts: number) => {
      const G = arcadeGameRef.current;
      const dt = Math.min(0.05, G.lastTs ? (ts - G.lastTs) / 1000 : 0.016);
      G.lastTs = ts;
      G.spawnT = 999999; // keep manual 3-word tutorial roster clean
      G.hero.hp = Math.max(25, G.hero.hp); // tutorial safety floor

      const prevKills = G.kills;
      const prevTarget = G.activeId;
      updateGame(G, dt, arcadeCallbacksRef.current);

      // Hold tutorial enemies well ahead of the hero line
      for (const e of G.enemies) {
        if (e.state === 'alive' && e.x < LINE_X + 75) {
          e.x = LINE_X + 75;
        }
        e.attackCd = 99;
      }

      if (step === 0 && G.kills >= 3 && !fireFxTriggeredRef.current) {
        triggerFireVisualEffect(G);
      }

      if (G.kills !== prevKills || G.activeId !== prevTarget) {
        setArcadeHud(getHudSnapshot(G));
      }

      const canvas = arcadeCanvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tw = Math.round(W * dpr);
        const th = Math.round(H * dpr);
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawGame(ctx, G, arcadePillarsRef.current, darkRef.current);
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, step, targetGame, triggerFireVisualEffect]);

  // Mount real TypingDefenseController when Typing Defence tutorial is open
  useEffect(() => {
    if (!open || targetGame !== 'defense') return;
    const boardEl = defBoardRef.current;
    const labelsEl = defLabelsRef.current;
    const fieldEl = defFieldRef.current;
    if (!boardEl || !labelsEl || !fieldEl) return;

    const ctrl = new TypingDefenseController(boardEl, labelsEl, fieldEl, {
      onHud: snap => {
        setDefHud(snap);
      },
      onFeed: msg => {
        const clean = msg.replace(/<[^>]+>/g, '');
        if (clean) setStatusMsg(clean);
      },
      onBanner: () => {},
      onShake: () => {},
    });
    defCtrlRef.current = ctrl;
    ctrl.startTutorial(step);

    return () => {
      ctrl.destroy();
      defCtrlRef.current = null;
    };
  }, [open, step, targetGame]);

  const handleArcadeKey = useCallback((ch: string) => {
    ensureAudio();
    const G = arcadeGameRef.current;
    arcadeHandleChar(G, ch, arcadeCallbacksRef.current);
    setArcadeHud(getHudSnapshot(G));
  }, []);

  const handleArcadeTestDeflect = useCallback(() => {
    ensureAudio();
    const G = arcadeGameRef.current;
    const enemy = G.enemies.find(e => e.state === 'alive');
    if (enemy) {
      fireEnemyBullet(G, enemy);
      setShieldBlocks(c => c + 1);
      setStatusMsg('Enemy shot inbound — watch it bounce harmlessly off the Keep/Hero shield!');
    }
  }, []);

  const handleDefenseInput = useCallback(
    (ch: string) => {
      ensureAudio();
      const ctrl = defCtrlRef.current;
      if (!ctrl) return;
      ctrl.handleChar(ch);
      const snap = ctrl.getSnapshot();
      setDefHud(snap);
      if (step === 1) {
        const t1 = snap.turrets[0]?.level >= 1;
        const t2 = snap.turrets[1]?.level >= 1;
        if (t1 && !t2 && ch === '1') {
          setStatusMsg('Lane 1 turret placed! Now press 2 to deploy a turret in the second lane.');
        } else if (t1 && t2) {
          setStatusMsg('Both Lane 1 & Lane 2 turrets active ✓ — ready to enter Typing Defence!');
        }
      }
    },
    [step]
  );

  const finishAndEnter = useCallback(() => {
    ensureAudio();
    SFX.wave();
    onEnterGame(targetGame);
  }, [onEnterGame, targetGame]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (step === 0) {
          setStep(1);
          ensureAudio();
          SFX.wave();
        } else {
          finishAndEnter();
        }
        return;
      }

      if (targetGame === 'defense') {
        if (/^[123]$/.test(e.key) || (step === 0 && /^[a-zA-Z ]$/.test(e.key))) {
          e.preventDefault();
          handleDefenseInput(e.key);
        }
        return;
      }

      // Type Arcade
      if (e.key.length === 1 && /^[a-zA-Z ]$/.test(e.key)) {
        e.preventDefault();
        if (step === 0) {
          handleArcadeKey(e.key);
        } else {
          handleArcadeTestDeflect();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    finishAndEnter,
    handleArcadeKey,
    handleArcadeTestDeflect,
    handleDefenseInput,
    onClose,
    open,
    step,
    targetGame,
  ]);

  if (!open) return null;

  const isArcade = targetGame === 'arcade';
  const lane1Done = (defHud?.turrets[0]?.level ?? 0) >= 1;
  const lane2Done = (defHud?.turrets[1]?.level ?? 0) >= 1;

  const arcadeStep1Done = fireFxTriggered || arcadeHud.kills >= 3;
  const arcadeStep2Done = shieldBlocks > 0;
  const defStep1Done = Boolean(defHud && !defHud.targetWord);
  const defStep2Done = lane1Done && lane2Done;

  const tutProgressPct = isArcade
    ? step === 0
      ? arcadeStep1Done
        ? 50
        : Math.round((Math.min(3, arcadeHud.kills) / 3) * 45)
      : arcadeStep2Done
        ? 100
        : 50
    : step === 0
      ? defStep1Done
        ? 50
        : Math.round((Math.min(4, defHud?.targetPos ?? 0) / 4) * 45)
      : 50 + (lane1Done ? 25 : 0) + (lane2Done ? 25 : 0);

  return (
    <div
      className="onboard-backdrop"
      role="presentation"
      onClick={() => {
        ensureAudio();
        onClose();
      }}
    >
      <div
        className="onboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboardTitle"
        onClick={e => e.stopPropagation()}
      >
        <div className="onboard-head">
          <div className="onboard-head-left">
            <span className="cap">
              {isArcade ? 'Type Arcade · Interactive Guide' : 'Typing Defence · Interactive Guide'}
            </span>
          </div>

          <div className="onboard-head-right">
            <span className="onboard-step-counter mono" aria-live="polite">
              Step {step + 1}/2 · {tutProgressPct}%
            </span>
            <button
              type="button"
              className="tool"
              onClick={() => {
                ensureAudio();
                onClose();
              }}
              aria-label="Skip tutorial and open game start screen"
            >
              SKIP TO GAME →
            </button>
          </div>
        </div>

        <div className="onboard-progress-wrap">
          <div
            className="onboard-progress-track"
            role="progressbar"
            aria-label="Tutorial completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={tutProgressPct}
          >
            <div
              className={`onboard-progress-fill${tutProgressPct === 100 ? ' complete' : ''}`}
              style={{ transform: `scaleX(${tutProgressPct / 100})` }}
            />
          </div>
          <div className="onboard-progress-labels mono">
            <span className={step === 0 ? 'cur' : 'done'}>
              01 · {isArcade ? 'Shoot 3 words' : 'Fire at Keep'}
              {(isArcade ? arcadeStep1Done : defStep1Done) ? ' ✓' : ''}
            </span>
            <span
              className={
                (isArcade ? arcadeStep2Done : defStep2Done)
                  ? 'done'
                  : step === 1
                    ? 'cur'
                    : ''
              }
            >
              02 · {isArcade ? 'Deflect shot' : 'Deploy turrets 1 & 2'}
              {(isArcade ? arcadeStep2Done : defStep2Done) ? ' ✓' : ''}
            </span>
          </div>
        </div>

        <div className="onboard-body">
          {/* Interactive Live Mini-Canvas (Type Arcade) or Real Isometric Board (Typing Defence) */}
          <div className="onboard-fig-wrap tut-stage">
            {isArcade ? (
              <div className="tut-canvas-wrap">
                <canvas
                  ref={arcadeCanvasRef}
                  width={W}
                  height={H}
                  className="tut-mini-canvas"
                  aria-label="Interactive Type Arcade mini canvas demonstrating typing as shooting."
                />
                {step === 0 && (
                  <div className="tut-canvas-hud mono">
                    <span>WORDS CLEARED: {Math.min(3, arcadeHud.kills)} / 3</span>
                    <span>{fireFxTriggered ? '★ FIRE EFFECT TRIGGERED' : 'CLEAR ALL 3 TO FIRE'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div ref={defFieldRef} className="td-field tut-def-field">
                <div
                  ref={defBoardRef}
                  className="hl-svg-stage tut-def-board"
                  data-hairline="board"
                  role="img"
                  aria-label="Interactive Typing Defence isometric keep and three lanes."
                />
                <div ref={defLabelsRef} className="td-labels" aria-hidden="true">
                  {(defHud?.padTags ?? []).map((pt, i) => (
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
                <div className="tut-canvas-hud mono">
                  <span>INK: {defHud?.ink ?? 50}</span>
                  <span>
                    L1: {lane1Done ? 'ACTIVE ✓' : 'EMPTY'} · L2: {lane2Done ? 'ACTIVE ✓' : 'EMPTY'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <span className="cap">
            Step {step + 1} of 2 · {isArcade ? 'Type Arcade' : 'Typing Defence'}
          </span>
          <h2 id="onboardTitle">
            {isArcade
              ? step === 0
                ? 'Every accurate key fires a bullet'
                : 'Two clean words raise a shield'
              : step === 0
                ? 'Type words to fire & collect Ink'
                : 'Press 1 then 2 to deploy lane turrets'}
          </h2>
          <p className="onboard-lede">
            {isArcade
              ? step === 0
                ? 'Type the three words ("aim", "hit", "fire") on your keyboard or tap the keys below to shoot each figure and trigger the FIRE visual effect.'
                : 'Your shield deflects enemy shots automatically until your next typo. Test a live deflection on the canvas below.'
              : step === 0
                ? 'Type "keep" to fire bolts from the Keep tower down the lanes. Correct shots build Ink currency.'
                : 'Press 1 to build a turret on the first lane, then press 2 to build a turret on the second lane — watch them open fire automatically.'}
          </p>

          {/* Interactive Practice Controls */}
          <div className="tut-practice">
            {isArcade ? (
              step === 0 ? (
                <div className="tut-keys-row" role="group" aria-label="Interactive shooting word keys">
                  {arcadeHud.targetWord ? (
                    [...arcadeHud.targetWord].map((ch, idx) => {
                      const done = idx < arcadeHud.targetProgress;
                      const cur = idx === arcadeHud.targetProgress;
                      return (
                        <button
                          key={`${arcadeHud.targetWord}-${idx}`}
                          type="button"
                          className={`tut-key-btn mono${done ? ' done' : cur ? ' cur' : ''}`}
                          onClick={() => {
                            if (cur) handleArcadeKey(ch);
                          }}
                        >
                          {ch.toUpperCase()}
                        </button>
                      );
                    })
                  ) : (
                    <span className="cap mono">
                      {fireFxTriggered ? '★ FIRE VISUAL EFFECT TRIGGERED ✓' : 'TARGET CLEARED'}
                    </span>
                  )}
                  {!fireFxTriggered && arcadeHud.targetWord && (
                    <button
                      type="button"
                      className="tool"
                      onClick={() => handleArcadeKey('z')}
                    >
                      ✕ TEST MISS
                    </button>
                  )}
                </div>
              ) : (
                <div className="tut-keys-row">
                  <button type="button" className="tool" onClick={handleArcadeTestDeflect}>
                    ⬡ TEST DEFLECT SHOT ({shieldBlocks})
                  </button>
                </div>
              )
            ) : step === 0 ? (
              <div className="tut-keys-row" role="group" aria-label="Interactive Keep typing keys">
                {defHud?.targetWord ? (
                  [...defHud.targetWord].map((ch, idx) => {
                    const done = idx < defHud.targetPos;
                    const cur = idx === defHud.targetPos;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`tut-key-btn mono${done ? ' done' : cur ? ' cur' : ''}`}
                        onClick={() => {
                          if (cur) handleDefenseInput(ch);
                        }}
                      >
                        {ch.toUpperCase()}
                      </button>
                    );
                  })
                ) : (
                  <span className="cap mono">WALKER DOWN · READY FOR TURRETS ✓</span>
                )}
              </div>
            ) : (
              <div className="tut-keys-row" role="group" aria-label="Guided turret placement">
                <button
                  type="button"
                  className={`tool${lane1Done ? ' tut-lane-built' : ' tut-lane-next'}`}
                  onClick={() => handleDefenseInput('1')}
                >
                  <kbd>1</kbd> {lane1Done ? 'LANE 1 TURRET ✓' : '1. PLACE IN LANE 1'}
                </button>
                <button
                  type="button"
                  className={`tool${
                    lane2Done ? ' tut-lane-built' : lane1Done ? ' tut-lane-next' : ''
                  }`}
                  onClick={() => handleDefenseInput('2')}
                >
                  <kbd>2</kbd> {lane2Done ? 'LANE 2 TURRET ✓' : '2. PLACE IN LANE 2'}
                </button>
              </div>
            )}

            <p className="tut-feedback mono" aria-live="polite">
              {statusMsg}
            </p>
          </div>
        </div>

        <div className="onboard-foot">
          <span className="cap mono">Sound active · Enter advances</span>
          <div className="onboard-nav">
            <button
              type="button"
              className="tool"
              disabled={step === 0}
              onClick={() => {
                ensureAudio();
                setStep(0);
              }}
            >
              ← BACK
            </button>
            {step === 0 ? (
              <button
                type="button"
                className="cta onboard-cta"
                onClick={() => {
                  ensureAudio();
                  SFX.wave();
                  setStep(1);
                }}
              >
                NEXT STEP →
              </button>
            ) : (
              <button type="button" className="cta onboard-cta" onClick={finishAndEnter}>
                {isArcade ? '▶ ENTER TYPE ARCADE' : '⛨ ENTER TYPING DEFENCE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
