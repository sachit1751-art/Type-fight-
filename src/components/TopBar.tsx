import React from 'react';
import { GameMode } from '../game/types';

interface TopBarProps {
  mode: GameMode;
  soundOn: boolean;
  darkMode: boolean;
  helpOpen: boolean;
  helpBtnRef: React.RefObject<HTMLButtonElement | null>;
  onOpenHelp: () => void;
  onToggleSound: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleTheme: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePause: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRestart: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  soundOn,
  darkMode,
  helpOpen,
  helpBtnRef,
  onOpenHelp,
  onToggleSound,
  onToggleTheme,
  onTogglePause,
  onRestart,
}) => {
  const canPause = mode === 'playing' || mode === 'paused';

  return (
    <header className="topbar">
      <a
        className="brand"
        href="#top"
        aria-label="Hairline Type Arcade — home"
        onClick={e => e.preventDefault()}
      >
        <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="14" cy="10" r="5" />
          <path d="M14 15v11M14 19l10-3 8 1M14 26l-6 10M14 26l7 9M24 16l14-2M34 12v4M38 14h4" />
        </svg>
        <span className="brand-word">HAIRLINE</span>
        <span className="brand-sep">/</span>
        <span className="brand-sub">TYPE&nbsp;ARCADE</span>
      </a>

      <nav className="top-actions" aria-label="Game controls">
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
          {mode === 'paused' ? '▶ RESUME' : 'Ⅱ PAUSE'}
        </button>
        <button
          id="btnRestart"
          className="tool"
          type="button"
          title="Restart run"
          onClick={onRestart}
        >
          ↻ RESTART
        </button>
      </nav>
    </header>
  );
};
