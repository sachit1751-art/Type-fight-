import React, { useEffect, useRef, useState } from 'react';

export type WorkspaceView = 'home' | 'arcade' | 'defense';

interface TopBarProps {
  activeView: WorkspaceView;
  canPause: boolean;
  isPaused: boolean;
  canRestart: boolean;
  soundOn: boolean;
  darkMode: boolean;
  helpOpen: boolean;
  audioOpen: boolean;
  compactKeyboard?: boolean;
  helpBtnRef: React.RefObject<HTMLButtonElement | null>;
  audioBtnRef: React.RefObject<HTMLButtonElement | null>;
  onGoHome: () => void;
  onOpenHelp: () => void;
  onOpenAudio: () => void;
  onOpenTutorial: () => void;
  onToggleSound: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleTheme: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePause: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRestart: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  canPause,
  isPaused,
  canRestart,
  soundOn,
  darkMode,
  helpOpen,
  audioOpen,
  compactKeyboard = false,
  helpBtnRef,
  audioBtnRef,
  onGoHome,
  onOpenHelp,
  onOpenAudio,
  onOpenTutorial,
  onToggleSound,
  onToggleTheme,
  onTogglePause,
  onRestart,
}) => {
  const [mobileCollapsed, setMobileCollapsed] = useState<boolean>(false);
  const lastScrollYRef = useRef<number>(0);

  useEffect(() => {
    setMobileCollapsed(false);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [activeView]);

  useEffect(() => {
    if (compactKeyboard) {
      setMobileCollapsed(true);
    }
  }, [compactKeyboard]);

  useEffect(() => {
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollYRef.current;
      if (y <= 12) {
        setMobileCollapsed(false);
      } else if (y > 24 && y > prev + 4) {
        setMobileCollapsed(true);
      } else if (y < prev - 16) {
        setMobileCollapsed(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const brandSub =
    activeView === 'defense'
      ? 'TYPING DEFENCE'
      : activeView === 'arcade'
        ? 'TYPE ARCADE'
        : 'TYPING ARCADE';

  return (
    <header className={`topbar${mobileCollapsed ? ' mobile-collapsed' : ''}`}>
      <div className="topbar-row">
        <a
          className="brand"
          href="#home"
          aria-label="Hairline Typing Arcade — home"
          onClick={e => {
            e.preventDefault();
            onGoHome();
          }}
        >
          <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="14" cy="10" r="5" />
            <path d="M14 15v11M14 19l10-3 8 1M14 26l-6 10M14 26l7 9M24 16l14-2M34 12v4M38 14h4" />
          </svg>
          <span className="brand-word">HAIRLINE</span>
          <span className="brand-sep">/</span>
          <span className="brand-sub">{brandSub}</span>
        </a>

        <div className="mobile-header-toggle">
          {canPause && (
            <button
              type="button"
              className="tool mobile-quick-btn"
              title={isPaused ? 'Resume game' : 'Pause game'}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              onClick={onTogglePause}
            >
              {isPaused ? '▶' : 'Ⅱ'}
            </button>
          )}
          <button
            type="button"
            className="tool mobile-quick-btn"
            title="Help & shortcuts"
            aria-label="Help & shortcuts"
            aria-haspopup="dialog"
            aria-expanded={helpOpen}
            onClick={e => {
              onOpenHelp();
              e.currentTarget.blur();
            }}
          >
            ?
          </button>
          <button
            type="button"
            className="tool mobile-ctrl-btn"
            aria-expanded={!mobileCollapsed}
            aria-controls="topControlsNav"
            onClick={e => {
              setMobileCollapsed(c => !c);
              e.currentTarget.blur();
            }}
          >
            {mobileCollapsed ? '⚙ CONTROLS ▾' : '▴ HIDE'}
          </button>
        </div>
      </div>

      <nav
        id="topControlsNav"
        className={`top-actions${mobileCollapsed ? ' is-collapsed' : ''}`}
        aria-label="Game controls"
      >
        <div className="top-actions-inner">
          <button
            id="btnTutorial"
            className="tool"
            type="button"
            title="Interactive game guide"
            onClick={e => {
              onOpenTutorial();
              e.currentTarget.blur();
            }}
          >
            ◈ TOUR
          </button>
          <button
            ref={helpBtnRef}
            id="btnHelp"
            className="tool tool-help"
            type="button"
            title="Instructions & help"
            aria-haspopup="dialog"
            aria-expanded={helpOpen}
            onClick={onOpenHelp}
          >
            ? HELP
          </button>
          <button
            id="btnSound"
            className={`tool${soundOn ? '' : ' off'}`}
            type="button"
            title={soundOn ? 'Sound is ON — click to mute' : 'Sound is OFF — click to play sound'}
            aria-pressed={soundOn}
            onClick={onToggleSound}
          >
            {soundOn ? '♪ SOUND: ON' : '♪ SOUND: OFF'}
          </button>
          <button
            ref={audioBtnRef}
            id="btnAudioSettings"
            className="tool"
            type="button"
            title="Audio mixer & Fast Restart settings"
            aria-haspopup="dialog"
            aria-expanded={audioOpen}
            onClick={onOpenAudio}
          >
            ⚙ AUDIO
          </button>
          <button
            id="btnTheme"
            className="tool"
            type="button"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            onClick={onToggleTheme}
          >
            {darkMode ? '☀ LIGHT MODE' : '☾ DARK MODE'}
          </button>
          <button
            id="btnPause"
            className="tool"
            type="button"
            title="Pause (Esc)"
            disabled={!canPause}
            onClick={onTogglePause}
          >
            {isPaused ? '▶ RESUME' : 'Ⅱ PAUSE'}
          </button>
          <button
            id="btnRestart"
            className="tool"
            type="button"
            title="Restart run"
            disabled={!canRestart}
            onClick={onRestart}
          >
            ↻ RESTART
          </button>
        </div>
      </nav>
    </header>
  );
};
