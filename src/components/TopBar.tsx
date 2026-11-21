import React from 'react';

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
  const brandSub =
    activeView === 'defense'
      ? 'TYPING DEFENSE'
      : activeView === 'arcade'
        ? 'TYPE ARCADE'
        : 'TYPING ARCADE';

  return (
    <header className="topbar">
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

      <nav className="top-actions" aria-label="Game controls">
        <button
          id="btnTutorial"
          className="tool"
          type="button"
          title="Interactive 4-step game tour"
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
          title="Master volume & SFX category mixer"
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
      </nav>
    </header>
  );
};
