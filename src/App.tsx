import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSettingsDrawer } from './components/AudioSettingsDrawer';
import { HelpDrawer } from './components/HelpDrawer';
import { HomeLanding } from './components/HomeLanding';
import { HudBar } from './components/HudBar';
import { OnboardingModal } from './components/OnboardingModal';
import { SocialShareBar } from './components/SocialShareBar';
import { TopBar, WorkspaceView } from './components/TopBar';
import { TypingDefenseHandle, TypingDefenseView } from './components/TypingDefenseView';
import { WpmTrendChart } from './components/WpmTrendChart';
import {
  ensureAudio,
  getAudioSettings,
  setSoundEnabled,
  SFX,
  subscribeAudioSettings,
} from './game/audio';
import {
  DailyChallenge,
  DailyProgress,
  formatLocalDateKey,
  getDailyChallenge,
  getDailyProgress,
  PlayVariant,
  recordDailyRun,
} from './game/challenge';
import {
  getPlayerHistory,
  PlayerHistory,
  recordRunHistory,
  subscribePlayerHistory,
} from './game/history';
import {
  getPreferences,
  markTutorialCompleted,
  subscribePreferences,
} from './game/preferences';
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
import { buildArcadeShareText, renderArcadeShareCardPng } from './game/shareCard';
import { computeArcadeRank, RunRecordFlags } from './game/rank';
import { GameState, HudSnapshot } from './game/types';
import {
  centerElementInVisibleViewport,
  isMobileFocusViewport,
  isSoftKeyboardActive,
} from './game/viewportFocus';

const THEME_KEY = 'hairline-type-defense-theme';

export default function App() {
  const stageWrapRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);
  const helpCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const audioBtnRef = useRef<HTMLButtonElement | null>(null);
  const audioCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const defenseRef = useRef<TypingDefenseHandle | null>(null);

  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(() => getDailyChallenge());
  const dailyChallengeRef = useRef(dailyChallenge);
  dailyChallengeRef.current = dailyChallenge;

  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => getDailyProgress());
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory>(() => getPlayerHistory());

  const [arcadeVariant, setArcadeVariant] = useState<PlayVariant>('standard');
  const arcadeVariantRef = useRef(arcadeVariant);
  arcadeVariantRef.current = arcadeVariant;

  const [defenseVariant, setDefenseVariant] = useState<PlayVariant>('standard');

  const gameRef = useRef<GameState>(freshState('standard', dailyChallenge));
  const pillarsRef = useRef(createPillars());

  const [activeView, setActiveView] = useState<WorkspaceView>('home');
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;
  const [viewTransition, setViewTransition] = useState<{
    key: number;
    dir: 'init' | 'to-game' | 'to-home' | 'switch';
  }>({ key: 0, dir: 'init' });

  const [defenseStatus, setDefenseStatus] = useState<{
    running: boolean;
    paused: boolean;
    over: boolean;
  }>({ running: false, paused: false, over: false });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const darkRef = useRef(darkMode);
  darkRef.current = darkMode;

  const [soundOn, setSoundOn] = useState<boolean>(() => getAudioSettings().enabled);
  const [fastRestart, setFastRestartState] = useState<boolean>(() => getPreferences().fastRestart);
  const [draftingGrid, setDraftingGridState] = useState<boolean>(() => getPreferences().draftingGrid);
  const fastRestartRef = useRef(fastRestart);
  fastRestartRef.current = fastRestart;

  const [arcadeRunRecords, setArcadeRunRecords] = useState<RunRecordFlags | null>(null);
  const [targetTypoKey, setTargetTypoKey] = useState<number>(0);
  const [targetCleanKey, setTargetCleanKey] = useState<number>(0);
  const prevArcadeWrongRef = useRef<number>(0);
  const prevArcadeKillsRef = useRef<number>(0);

  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const helpOpenRef = useRef(helpOpen);
  helpOpenRef.current = helpOpen;
  const helpPausedGameRef = useRef<boolean>(false);

  const [audioOpen, setAudioOpen] = useState<boolean>(false);
  const audioOpenRef = useRef(audioOpen);
  audioOpenRef.current = audioOpen;
  const audioPausedGameRef = useRef<boolean>(false);

  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [tutorialGame, setTutorialGame] = useState<'arcade' | 'defense'>('arcade');
  const tutorialOpenRef = useRef(tutorialOpen);
  tutorialOpenRef.current = tutorialOpen;
  const tutorialPausedGameRef = useRef<boolean>(false);

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
  const [mobileViewport, setMobileViewport] = useState<boolean>(isMobileFocusViewport);
  const [softKeyboardOpen, setSoftKeyboardOpen] = useState<boolean>(false);
  const consoleTouchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    document.body.classList.toggle('dark-plate', darkMode);
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  useEffect(() => {
    document.body.classList.toggle('drafting-grid', draftingGrid);
  }, [draftingGrid]);

  /* Keep TopBar sound indicator synchronized with AudioSettingsDrawer */
  useEffect(() => {
    return subscribeAudioSettings(settings => {
      setSoundOn(settings.enabled);
    });
  }, []);

  /* Keep Fast Restart & Drafting Grid preferences synchronized with AudioSettingsDrawer */
  useEffect(() => {
    return subscribePreferences(prefs => {
      setFastRestartState(prefs.fastRestart);
      setDraftingGridState(prefs.draftingGrid);
    });
  }, []);

  /* Subscribe to persistent lifetime accuracy & last score records */
  useEffect(() => {
    return subscribePlayerHistory(setPlayerHistory);
  }, []);

  /* Detect mobile viewport & soft keyboard via visualViewport + input focus */
  useEffect(() => {
    const vv = window.visualViewport;
    const syncViewport = () => {
      setMobileViewport(isMobileFocusViewport());
      setSoftKeyboardOpen(isSoftKeyboardActive());
    };
    syncViewport();
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    document.addEventListener('focusin', syncViewport);
    document.addEventListener('focusout', syncViewport);
    return () => {
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      document.removeEventListener('focusin', syncViewport);
      document.removeEventListener('focusout', syncViewport);
    };
  }, []);

  /* Unlock Web Audio on first user interaction across all browsers */
  useEffect(() => {
    const unlock = () => {
      ensureAudio();
    };
    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /* Refresh daily challenge automatically when crossing midnight */
  useEffect(() => {
    const checkDate = () => {
      const todayKey = formatLocalDateKey();
      if (todayKey !== dailyChallengeRef.current.dateKey) {
        setDailyChallenge(getDailyChallenge());
      }
    };
    const timer = window.setInterval(checkDate, 60000);
    window.addEventListener('focus', checkDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkDate);
    };
  }, []);

  const syncHudNow = useCallback(() => {
    const snap = getHudSnapshot(gameRef.current);
    const wrongCount = snap.targetMarks.filter(m => m === false).length;
    if (wrongCount > prevArcadeWrongRef.current) {
      setTargetTypoKey(k => k + 1);
    }
    prevArcadeWrongRef.current = wrongCount;
    if (snap.kills > prevArcadeKillsRef.current) {
      setTargetCleanKey(k => k + 1);
    }
    prevArcadeKillsRef.current = snap.kills;
    setHud(snap);
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
      const G = gameRef.current;
      const snap = getHudSnapshot(G);
      const res = recordRunHistory('arcade', {
        score: snap.score,
        accuracy: snap.acc,
        wpm: snap.wpm,
        wave: snap.wave,
      });
      setArcadeRunRecords({
        isNewBestScore: res.isNewBestScore,
        isNewFastestWpm: res.isNewFastestWpm,
        isNewLifetimeAcc: res.isNewLifetimeAcc,
      });
      if (G.variant === 'daily' && G.challenge) {
        const updated = recordDailyRun('arcade', G.challenge.dateKey, G.score, G.wave, G.kills);
        setDailyProgress(updated);
      }
      triggerFeedback(
        fastRestartRef.current
          ? 'the hero is down — <b>Fast Restart</b>: type any letter to jump back in'
          : 'the hero is down — press <b>PLAY AGAIN</b> or <kbd>Enter</kbd>',
        'bad'
      );
      syncHudNow();
    },
  };

  const selectArcadeVariant = useCallback(
    (next: PlayVariant) => {
      setArcadeVariant(next);
      arcadeVariantRef.current = next;
      if (gameRef.current.mode === 'menu') {
        gameRef.current = freshState(next, dailyChallengeRef.current);
        syncHudNow();
      }
    },
    [syncHudNow]
  );

  const focusArcadeCard = useCallback((openKeyboard = false) => {
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

  const startGame = useCallback(
    (overrideVariant?: PlayVariant) => {
      setArcadeRunRecords(null);
      setTargetTypoKey(0);
      setTargetCleanKey(0);
      prevArcadeWrongRef.current = 0;
      prevArcadeKillsRef.current = 0;
      const variant = overrideVariant ?? arcadeVariantRef.current;
      const challenge = dailyChallengeRef.current;
      const G = freshState(variant, challenge);
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
        variant === 'daily'
          ? `<b>${challenge.name}</b> — ${challenge.weaponLabel} online.`
          : 'type straight through the <b>current word</b> — wrong letters count, but never block you.',
        'good'
      );
      ensureAudio();
      SFX.wave();
      syncHudNow();
      focusArcadeCard(false);
    },
    [focusArcadeCard, showWaveBanner, syncHudNow, triggerFeedback]
  );

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
    if (audioOpenRef.current) {
      setAudioOpen(false);
      audioPausedGameRef.current = false;
    }
    const G = gameRef.current;
    helpPausedGameRef.current = activeViewRef.current === 'arcade' && G.mode === 'playing';
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
    if (helpPausedGameRef.current && G.mode === 'paused' && activeViewRef.current === 'arcade') {
      G.mode = 'playing';
      syncHudNow();
    }
    helpPausedGameRef.current = false;
    window.requestAnimationFrame(() => {
      helpBtnRef.current?.focus({ preventScroll: true });
    });
  }, [syncHudNow]);

  const openAudio = useCallback(() => {
    if (audioOpenRef.current) return;
    if (helpOpenRef.current) {
      setHelpOpen(false);
      helpPausedGameRef.current = false;
    }
    const G = gameRef.current;
    audioPausedGameRef.current = activeViewRef.current === 'arcade' && G.mode === 'playing';
    if (audioPausedGameRef.current) {
      G.mode = 'paused';
      syncHudNow();
    }
    setAudioOpen(true);
    window.requestAnimationFrame(() => {
      audioCloseBtnRef.current?.focus({ preventScroll: true });
    });
  }, [syncHudNow]);

  const closeAudio = useCallback(() => {
    if (!audioOpenRef.current) return;
    setAudioOpen(false);
    const G = gameRef.current;
    if (audioPausedGameRef.current && G.mode === 'paused' && activeViewRef.current === 'arcade') {
      G.mode = 'playing';
      syncHudNow();
    }
    audioPausedGameRef.current = false;
    window.requestAnimationFrame(() => {
      audioBtnRef.current?.focus({ preventScroll: true });
    });
  }, [syncHudNow]);

  const openTutorial = useCallback(
    (forGame?: 'arcade' | 'defense') => {
      if (tutorialOpenRef.current) return;
      ensureAudio();
      const target: 'arcade' | 'defense' =
        forGame ?? (activeViewRef.current === 'defense' ? 'defense' : 'arcade');
      setTutorialGame(target);
      const G = gameRef.current;
      tutorialPausedGameRef.current = activeViewRef.current === 'arcade' && G.mode === 'playing';
      if (tutorialPausedGameRef.current) {
        G.mode = 'paused';
        syncHudNow();
      }
      setTutorialOpen(true);
    },
    [syncHudNow]
  );

  const closeTutorial = useCallback(() => {
    if (!tutorialOpenRef.current) return;
    markTutorialCompleted(tutorialGame);
    setTutorialOpen(false);
    const G = gameRef.current;
    if (tutorialPausedGameRef.current && G.mode === 'paused' && activeViewRef.current === 'arcade') {
      G.mode = 'playing';
      syncHudNow();
    }
    tutorialPausedGameRef.current = false;
  }, [syncHudNow, tutorialGame]);

  const switchView = useCallback(
    (next: WorkspaceView) => {
      ensureAudio();
      if (next !== 'arcade' && gameRef.current.mode === 'playing') {
        gameRef.current.mode = 'paused';
        syncHudNow();
      }
      if (helpOpenRef.current) {
        setHelpOpen(false);
        helpPausedGameRef.current = false;
      }
      if (audioOpenRef.current) {
        setAudioOpen(false);
        audioPausedGameRef.current = false;
      }
      const prev = activeViewRef.current;
      if (next !== prev) {
        const dir = next === 'home' ? 'to-home' : prev === 'home' ? 'to-game' : 'switch';
        setViewTransition(vt => ({ key: vt.key + 1, dir }));
      }
      setActiveView(next);
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (next !== 'home' && !getPreferences().tutorialsCompleted[next]) {
        setTutorialGame(next);
        tutorialPausedGameRef.current = false;
        setTutorialOpen(true);
      }
    },
    [syncHudNow]
  );

  const launchGameFromHome = useCallback(
    (game: 'arcade' | 'defense', daily?: boolean) => {
      ensureAudio();
      SFX.word();
      if (game === 'arcade') {
        if (typeof daily === 'boolean') {
          selectArcadeVariant(daily ? 'daily' : 'standard');
        }
        switchView('arcade');
      } else {
        if (typeof daily === 'boolean') {
          setDefenseVariant(daily ? 'daily' : 'standard');
        }
        switchView('defense');
      }
    },
    [selectArcadeVariant, switchView]
  );

  const processChar = useCallback(
    (ch: string) => {
      handleChar(gameRef.current, ch, callbacksRef.current);
      syncHudNow();
    },
    [syncHudNow]
  );

  /* Main 60fps canvas animation loop for Type Arcade */
  useEffect(() => {
    let rafId = 0;
    const frame = (ts: number) => {
      const G = gameRef.current;
      const dt = Math.min(0.05, G.lastTs ? (ts - G.lastTs) / 1000 : 0.016);
      G.lastTs = ts;
      if (activeViewRef.current === 'arcade' && G.mode !== 'paused') {
        const prevKills = G.kills;
        const prevHp = G.hero.hp;
        const prevTarget = G.activeId;
        updateGame(G, dt, callbacksRef.current);
        if (G.kills !== prevKills || G.hero.hp !== prevHp || G.activeId !== prevTarget) {
          setHud(getHudSnapshot(G));
        }
      }
      const canvas = canvasRef.current;
      if (canvas && activeViewRef.current === 'arcade') {
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

  /* Periodic HUD sync for WPM readout while playing Type Arcade */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (activeViewRef.current === 'arcade' && gameRef.current.mode === 'playing') {
        syncHudNow();
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [syncHudNow]);

  /* Global keyboard & window blur listeners for Type Arcade & shared Esc help close */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeViewRef.current === 'defense') return; // handled by TypingDefenseView

      if (e.key === 'Escape') {
        if (helpOpenRef.current) {
          e.preventDefault();
          closeHelp();
          return;
        }
        if (tutorialOpenRef.current) return; // handled by OnboardingModal
        if (activeViewRef.current === 'arcade') {
          const mode = gameRef.current.mode;
          if (mode === 'playing' || mode === 'paused') {
            e.preventDefault();
            togglePause();
          }
        }
        return;
      }

      if (helpOpenRef.current || audioOpenRef.current || tutorialOpenRef.current) return;
      if (activeViewRef.current !== 'arcade') return;

      if (e.key === 'Enter') {
        const mode = gameRef.current.mode;
        if (mode === 'menu' || mode === 'over') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement === mobileInputRef.current) return;

      if (
        gameRef.current.mode === 'over' &&
        fastRestartRef.current &&
        e.key.length === 1 &&
        /[a-zA-Z ]/.test(e.key)
      ) {
        e.preventDefault();
        startGame();
        if (/[a-zA-Z]/.test(e.key)) {
          const lower = e.key.toLowerCase();
          if (gameRef.current.enemies.some(en => en.word[0] === lower)) {
            processChar(e.key);
          }
        }
        return;
      }

      if (gameRef.current.mode !== 'playing') return;

      if (e.key.length === 1 && /[a-zA-Z ]/.test(e.key)) {
        e.preventDefault();
        processChar(e.key);
      }
    };

    const onBlur = () => {
      if (activeViewRef.current === 'arcade' && gameRef.current.mode === 'playing') {
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
    if (!v) return;
    if (gameRef.current.mode === 'over' && fastRestartRef.current) {
      startGame();
      const first = v[0];
      if (/[a-zA-Z]/.test(first)) {
        const lower = first.toLowerCase();
        if (gameRef.current.enemies.some(en => en.word[0] === lower)) {
          processChar(first);
        }
      }
      for (const ch of v.slice(1)) {
        processChar(ch);
      }
      return;
    }
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
    if (activeView === 'arcade') {
      const mode = gameRef.current.mode;
      if (mode === 'playing' || mode === 'paused') {
        togglePause();
      }
    } else if (activeView === 'defense') {
      defenseRef.current?.togglePause();
    }
    e.currentTarget.blur();
  };

  const handleRestart = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (activeView === 'arcade') {
      startGame();
    } else if (activeView === 'defense') {
      defenseRef.current?.restart();
    }
    e.currentTarget.blur();
  };

  const handleKeyboardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const mode = gameRef.current.mode;
    if (mode === 'menu' || mode === 'over') {
      startGame();
    }
    focusArcadeCard(true);
    e.currentTarget.blur();
  };

  const canPause =
    (activeView === 'arcade' && (hud.mode === 'playing' || hud.mode === 'paused')) ||
    (activeView === 'defense' && defenseStatus.running);
  const isPaused =
    (activeView === 'arcade' && hud.mode === 'paused') ||
    (activeView === 'defense' && defenseStatus.paused);
  const canRestart = activeView === 'arcade' || activeView === 'defense';

  const showInGameChrome = activeView !== 'home' && !tutorialOpen;
  const isActivelyPlaying =
    (activeView === 'arcade' && hud.mode === 'playing') ||
    (activeView === 'defense' && defenseStatus.running && !defenseStatus.paused && !defenseStatus.over);
  const mobileFocusActive =
    mobileViewport && isActivelyPlaying && !helpOpen && !audioOpen && !tutorialOpen;

  /* Sync body focus-mode classes so CSS compacts non-essential chrome during mobile play */
  useEffect(() => {
    document.body.classList.toggle('mobile-focus-active', mobileFocusActive);
    document.body.classList.toggle('mobile-keyboard-open', mobileFocusActive && softKeyboardOpen);
    return () => {
      document.body.classList.remove('mobile-focus-active');
      document.body.classList.remove('mobile-keyboard-open');
    };
  }, [mobileFocusActive, softKeyboardOpen]);

  /* Keep active Type Arcade card centered across mobile screen resize / keyboard events */
  useEffect(() => {
    if (activeView !== 'arcade' || hud.mode !== 'playing') return;
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
  }, [activeView, hud.mode, softKeyboardOpen]);

  return (
    <>
      {viewTransition.key > 0 && (
        <div
          key={viewTransition.key}
          className={`view-wipe-line view-wipe--${viewTransition.dir}`}
          aria-hidden="true"
        />
      )}

      {showInGameChrome && (
        <TopBar
          activeView={activeView}
          canPause={canPause}
          isPaused={isPaused}
          canRestart={canRestart}
          soundOn={soundOn}
          darkMode={darkMode}
          helpOpen={helpOpen}
          audioOpen={audioOpen}
          compactKeyboard={softKeyboardOpen}
          helpBtnRef={helpBtnRef}
          audioBtnRef={audioBtnRef}
          onGoHome={() => switchView('home')}
          onOpenHelp={() => {
            openHelp();
            helpBtnRef.current?.blur();
          }}
          onOpenAudio={() => {
            openAudio();
            audioBtnRef.current?.blur();
          }}
          onOpenTutorial={() => openTutorial()}
          onToggleSound={handleToggleSound}
          onToggleTheme={handleToggleTheme}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
        />
      )}

      <main className={`shell${activeView === 'home' ? ' shell-home' : ''}`}>
        {showInGameChrome && (
          <div className="workspace-bar">
            <div className="mode-switch" role="tablist" aria-label="Game workspace">
              <button
                type="button"
                role="tab"
                aria-selected={false}
                className="mode-tab mono"
                onClick={e => {
                  switchView('home');
                  e.currentTarget.blur();
                }}
              >
                ⌂ HOME
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'arcade'}
                className={`mode-tab mono${activeView === 'arcade' ? ' active' : ''}`}
                onClick={e => {
                  switchView('arcade');
                  e.currentTarget.blur();
                }}
              >
                ▸ TYPE ARCADE
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'defense'}
                className={`mode-tab mono${activeView === 'defense' ? ' active' : ''}`}
                onClick={e => {
                  switchView('defense');
                  e.currentTarget.blur();
                }}
              >
                ⛨ TYPING DEFENCE
              </button>
            </div>

            <span className="cap dim workspace-note">
              {activeView === 'arcade'
                ? 'stick-figure firing line · D3 WPM trend on game over'
                : 'isometric keep & 3 lanes · keys 1–3 build turrets'}
            </span>
          </div>
        )}

        <div key={activeView} className={`view-stage view-stage--${viewTransition.dir}`}>
          {activeView === 'home' ? (
          <HomeLanding
            dailyChallenge={dailyChallenge}
            dailyProgress={dailyProgress}
            playerHistory={playerHistory}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode(d => !d)}
            onOpenSettings={openAudio}
            onStartArcade={daily => launchGameFromHome('arcade', daily)}
            onStartDefense={daily => launchGameFromHome('defense', daily)}
          />
        ) : activeView === 'arcade' ? (
          <>
            <HudBar hud={hud} streakPop={streakPop} />

            <section ref={stageWrapRef} className="stage-wrap" aria-label="Type Arcade battlefield card">
              <div className="stage-head">
                <span className="cap">
                  {hud.mode !== 'menu' && hud.variant === 'daily' && hud.challengeName
                    ? `Fig. 01 — Daily Challenge · ${hud.challengeName} (${hud.weaponLabel})`
                    : 'Fig. 01 — The firing line'}
                </span>
                <span className="cap dim" id="stageReadout">
                  {hud.readout}
                </span>
              </div>

              <div
                className={`stage${shaking ? ' shake' : ''}`}
                id="stage"
                onClick={e => {
                  if (
                    gameRef.current.mode === 'playing' &&
                    window.innerWidth <= 860 &&
                    (e.target === e.currentTarget || e.target === canvasRef.current)
                  ) {
                    focusArcadeCard(true);
                  }
                }}
              >
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
                    <p className="cap accent-cap">
                      {arcadeVariant === 'daily'
                        ? `Daily Challenge · ${dailyChallenge.dateKey}`
                        : 'A typing shooter · drawn with hairlines'}
                    </p>
                    <h1>
                      TYPE
                      <br />
                      ARCADE
                    </h1>

                    <div className="variant-switch" role="tablist" aria-label="Game ruleset">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={arcadeVariant === 'standard'}
                        className={`variant-tab mono${arcadeVariant === 'standard' ? ' active' : ''}`}
                        onClick={() => selectArcadeVariant('standard')}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={arcadeVariant === 'daily'}
                        className={`variant-tab mono${arcadeVariant === 'daily' ? ' active' : ''}`}
                        onClick={() => selectArcadeVariant('daily')}
                      >
                        Daily: {dailyChallenge.weaponLabel}
                      </button>
                    </div>

                    {arcadeVariant === 'daily' ? (
                      <div className="challenge-brief">
                        <strong>{dailyChallenge.name}</strong>
                        <p>{dailyChallenge.weaponDesc}</p>
                        <span className="mono challenge-mods">
                          Speed ×{dailyChallenge.enemySpeedMul} · Start HP {dailyChallenge.startingHp} · Score ×{dailyChallenge.scoreMul}
                        </span>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}

                    <button
                      className="cta"
                      id="btnStart"
                      type="button"
                      onClick={e => {
                        startGame();
                        e.currentTarget.blur();
                      }}
                    >
                      ▶ &nbsp;{arcadeVariant === 'daily' ? 'START CHALLENGE — just type' : 'START — then just type'}
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
                  {(() => {
                    const rank = computeArcadeRank({
                      wpm: hud.wpm,
                      acc: hud.acc,
                      wave: hud.wave,
                      kills: hud.kills,
                    });
                    const rec = arcadeRunRecords;
                    return (
                      <div className="overlay-card over-wide">
                        <p className="cap accent-cap">The hero is down</p>
                        <h2>GAME OVER</h2>

                        <div
                          className={`rank-banner${rank.isTopTier ? ' top' : ''}`}
                          aria-label={`Run rank ${rank.grade}, ${rank.title}`}
                        >
                          <span className="rank-grade mono">{rank.grade}</span>
                          <div className="rank-copy">
                            <strong>{rank.title}</strong>
                            <span className="mono">{rank.note}</span>
                          </div>
                        </div>

                        <div className="final-stats" id="finalStats">
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
                            <span className="cap">Wave &amp; Kills</span>
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
                            <b>
                              {Math.max(hud.score, playerHistory.arcade.bestScore).toLocaleString()}
                            </b>
                          </div>
                        </div>

                        <WpmTrendChart samples={hud.wpmHistory} finalWpm={hud.wpm} />

                        <SocialShareBar
                          compact
                          shareText={buildArcadeShareText(hud)}
                          cardFilename={`hairline-arcade-wave-${hud.wave}.png`}
                          renderCardPng={() => renderArcadeShareCardPng(hud, darkMode)}
                        />

                        <div className="over-actions">
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

              {/* ── TYPING CONSOLE ── */}
              <div
                className="console"
                id="consoleBar"
                onTouchStart={e => {
                  const t = e.touches[0];
                  if (t) consoleTouchRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={e => {
                  const o = consoleTouchRef.current;
                  consoleTouchRef.current = null;
                  const t = e.changedTouches[0];
                  if (!o || !t) return;
                  const dx = t.clientX - o.x;
                  const dy = t.clientY - o.y;
                  if (Math.abs(dy) < 42 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
                  if (dy < 0 && gameRef.current.mode === 'playing') {
                    focusArcadeCard(true);
                  } else if (dy > 0 && gameRef.current.mode === 'playing') {
                    togglePause(true);
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
                    className={`target-word mono${hud.targetIsLine ? ' phrase' : ''}${
                      targetTypoKey > 0 ? ' target-typo-nudge' : ''
                    }`}
                    id="targetWord"
                    aria-live="polite"
                  >
                    {hud.targetWord ? (
                      [...hud.targetWord].map((ch, i) => {
                        const glyph = ch === ' ' ? '␣' : ch;
                        const justHit = i === hud.targetProgress - 1;
                        const cls =
                          i < hud.targetProgress
                            ? hud.targetMarks[i] === false
                              ? `wronged${justHit ? ' char-pop' : ''}`
                              : `done${justHit ? ' char-pop' : ''}`
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

                <div className="console-actions">
                  <button
                    className="tool console-pause-btn"
                    type="button"
                    title="Pause game"
                    aria-label="Pause game"
                    onClick={e => {
                      togglePause(true);
                      e.currentTarget.blur();
                    }}
                  >
                    Ⅱ
                  </button>
                  <button
                    className="tool console-key"
                    id="btnKeyboard"
                    type="button"
                    title="Open the touch / on-screen keyboard"
                    onClick={handleKeyboardClick}
                  >
                    ⌨ TYPE HERE
                  </button>
                </div>

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
                  onBlur={() => setMobileLive(false)}
                  onChange={handleMobileInput}
                />
              </div>
            </section>
          </>
        ) : (
          <TypingDefenseView
            ref={defenseRef}
            darkMode={darkMode}
            helpOpen={helpOpen}
            audioOpen={audioOpen}
            tutorialOpen={tutorialOpen}
            fastRestart={fastRestart}
            variant={defenseVariant}
            dailyChallenge={dailyChallenge}
            playerHistory={playerHistory}
            onChangeVariant={setDefenseVariant}
            onRunEnd={() => setDailyProgress(getDailyProgress())}
            onCloseHelp={closeHelp}
            onStateSync={setDefenseStatus}
          />
        )}
        </div>
      </main>

      <HelpDrawer
        open={helpOpen}
        activeView={activeView}
        arcadeMode={hud.mode}
        defenseStatus={defenseStatus}
        fastRestart={fastRestart}
        closeBtnRef={helpCloseBtnRef}
        onClose={closeHelp}
      />

      <AudioSettingsDrawer
        open={audioOpen}
        closeBtnRef={audioCloseBtnRef}
        onClose={closeAudio}
      />

      <OnboardingModal
        open={tutorialOpen}
        targetGame={tutorialGame}
        darkMode={darkMode}
        onClose={closeTutorial}
        onEnterGame={g => {
          markTutorialCompleted(g);
          setTutorialOpen(false);
          tutorialPausedGameRef.current = false;
          setViewTransition(vt => ({ key: vt.key + 1, dir: 'to-game' }));
          setActiveView(g);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />

      {/* Mobile-native bottom thumb dock (hidden during active play or when soft keyboard is open so play card stays unobstructed) */}
      {showInGameChrome && !isActivelyPlaying && !softKeyboardOpen && (
        <nav className="mobile-dock" aria-label="Mobile quick navigation">
          <button
            type="button"
            className="dock-btn mono"
            onClick={() => switchView('home')}
          >
            <span className="dock-ico" aria-hidden="true">⌂</span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`dock-btn mono${activeView === 'arcade' ? ' active' : ''}`}
            onClick={() => switchView('arcade')}
          >
            <span className="dock-ico" aria-hidden="true">▸</span>
            <span>Arcade</span>
          </button>
          <button
            type="button"
            className={`dock-btn mono${activeView === 'defense' ? ' active' : ''}`}
            onClick={() => switchView('defense')}
          >
            <span className="dock-ico" aria-hidden="true">⛨</span>
            <span>Defence</span>
          </button>
          <button
            type="button"
            className="dock-btn mono"
            onClick={() => openTutorial()}
          >
            <span className="dock-ico" aria-hidden="true">◈</span>
            <span>Tour</span>
          </button>
        </nav>
      )}
    </>
  );
}
