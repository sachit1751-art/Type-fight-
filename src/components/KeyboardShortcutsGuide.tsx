import React, { useEffect, useState } from 'react';
import { GameMode } from '../game/types';
import { WorkspaceView } from './TopBar';

interface KeyboardShortcutsGuideProps {
  activeView: WorkspaceView;
  arcadeMode: GameMode;
  defenseStatus: { running: boolean; paused: boolean; over: boolean };
  fastRestart: boolean;
}

type InspectedGame = 'arcade' | 'defense';

interface ShortcutRow {
  keys: string;
  action: string;
  active: boolean;
  highlightAccent?: boolean;
  note?: string;
}

export const KeyboardShortcutsGuide: React.FC<KeyboardShortcutsGuideProps> = ({
  activeView,
  arcadeMode,
  defenseStatus,
  fastRestart,
}) => {
  const [inspected, setInspected] = useState<InspectedGame>(
    activeView === 'defense' ? 'defense' : 'arcade'
  );

  // Automatically sync inspected shortcuts whenever the active game switches
  useEffect(() => {
    if (activeView === 'defense') setInspected('defense');
    else if (activeView === 'arcade') setInspected('arcade');
  }, [activeView]);

  const isDefense = inspected === 'defense';

  // Determine exact live phase of the inspected game
  const liveInInspected =
    (activeView === 'defense' && isDefense) || (activeView !== 'defense' && !isDefense);

  const phase: 'menu' | 'playing' | 'paused' | 'over' = isDefense
    ? defenseStatus.over
      ? 'over'
      : defenseStatus.paused
        ? 'paused'
        : defenseStatus.running
          ? 'playing'
          : 'menu'
    : arcadeMode === 'over' || arcadeMode === 'dying'
      ? 'over'
      : arcadeMode === 'paused'
        ? 'paused'
        : arcadeMode === 'playing'
          ? 'playing'
          : 'menu';

  const phaseLabel =
    phase === 'playing'
      ? 'Active run'
      : phase === 'paused'
        ? 'Paused'
        : phase === 'over'
          ? 'Game Over'
          : 'Start menu';

  const numbersActive = isDefense && (phase === 'playing' || (phase === 'over' && fastRestart));
  const typingActive = phase === 'playing' || (phase === 'over' && fastRestart);
  const spaceActive = phase === 'playing' || (phase === 'over' && fastRestart);
  const enterActive = phase === 'menu' || phase === 'over';
  const escActive = true; // Closes HelpDrawer or toggles pause in both games

  const rows: ShortcutRow[] = isDefense
    ? [
        {
          keys: '1 · 2 · 3',
          action:
            phase === 'over' && fastRestart
              ? 'Fast Restart & build turret on Lane 1–3'
              : 'Build / upgrade lane turret (25 / 45 / 70 Ink)',
          active: numbersActive,
          note: phase === 'playing' ? 'Live' : phase === 'menu' ? 'In run' : undefined,
        },
        {
          keys: 'A–Z',
          action:
            phase === 'over' && fastRestart
              ? 'Fast Restart — type immediately to jump back in'
              : 'Lock target & shoot bolts down lanes',
          active: typingActive,
          highlightAccent: phase === 'over' && fastRestart,
          note: phase === 'over' && fastRestart ? 'Fast' : phase === 'playing' ? 'Live' : undefined,
        },
        {
          keys: '␣ SPACE',
          action:
            phase === 'over' && fastRestart
              ? 'Fast Restart / type Herald phrase spaces'
              : 'Type spaces inside Herald phrases',
          active: spaceActive,
          highlightAccent: phase === 'over' && fastRestart,
        },
        {
          keys: 'ENTER',
          action: 'Start Defense run / Play Again',
          active: enterActive,
          note: enterActive ? 'Ready' : undefined,
        },
        {
          keys: 'ESC',
          action: 'Pause / resume · close open drawers',
          active: escActive,
          note: 'Always',
        },
      ]
    : [
        {
          keys: 'ENTER',
          action: 'Start Type Arcade / Play Again',
          active: enterActive,
          note: enterActive ? 'Ready' : undefined,
        },
        {
          keys: 'A–Z',
          action:
            phase === 'over' && fastRestart
              ? 'Fast Restart — jump back in & fire immediately'
              : 'Fire rifle bullets at the active word',
          active: typingActive,
          highlightAccent: phase === 'over' && fastRestart,
          note: phase === 'over' && fastRestart ? 'Fast' : phase === 'playing' ? 'Live' : undefined,
        },
        {
          keys: '␣ SPACE',
          action:
            phase === 'over' && fastRestart
              ? 'Fast Restart / type spaces in Line phrases'
              : 'Type spaces inside Wave 3+ Line phrases',
          active: spaceActive,
          highlightAccent: phase === 'over' && fastRestart,
        },
        {
          keys: 'ESC',
          action: 'Pause / resume · close open drawers',
          active: escActive,
          note: 'Always',
        },
        {
          keys: '1 · 2 · 3',
          action: 'Not mapped in Type Arcade (used for Defense turrets)',
          active: false,
          note: 'Defense',
        },
      ];

  return (
    <div className="kbd-guide" aria-label="Interactive keyboard shortcuts guide">
      <div className="kbd-guide-head">
        <div className="kbd-status-line mono">
          <span>{isDefense ? 'Typing Defense' : 'Type Arcade'}</span>
          <span aria-hidden="true">·</span>
          <span>{phaseLabel}</span>
          {liveInInspected && (
            <>
              <span aria-hidden="true">·</span>
              <span className="kbd-live-text">Current View</span>
            </>
          )}
        </div>

        <div className="variant-switch kbd-game-tabs" role="tablist" aria-label="Shortcut game context">
          <button
            type="button"
            role="tab"
            aria-selected={inspected === 'arcade'}
            className={`variant-tab mono${inspected === 'arcade' ? ' active' : ''}`}
            onClick={() => setInspected('arcade')}
          >
            Type Arcade
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inspected === 'defense'}
            className={`variant-tab mono${inspected === 'defense' ? ' active' : ''}`}
            onClick={() => setInspected('defense')}
          >
            Typing Defense
          </button>
        </div>
      </div>

      {/* Visual Tactile Keycap Board */}
      <div className="kbd-board" aria-hidden="true">
        <div className="kbd-row">
          <div className={`keycap mono${escActive ? ' active' : ''}`}>
            <b>ESC</b>
            <span>Pause / Close</span>
          </div>
          <div className="keycap-cluster">
            {['1', '2', '3'].map(num => (
              <div
                key={num}
                className={`keycap keycap-sq mono${numbersActive ? ' active' : ' unused'}`}
              >
                <b>{num}</b>
                <span>{isDefense ? `L${num}` : '—'}</span>
              </div>
            ))}
          </div>
          <div className="keycap keycap-locked mono">
            <b>⌫ BACKSPACE</b>
            <span>Disabled</span>
          </div>
        </div>

        <div className="kbd-row">
          <div
            className={`keycap keycap-wide mono${typingActive ? ' active' : ''}${phase === 'over' && fastRestart ? ' fast' : ''}`}
          >
            <b>A – Z</b>
            <span>
              {phase === 'over' && fastRestart
                ? 'Fast Restart'
                : isDefense
                  ? 'Fire Keep Bolt'
                  : 'Shoot Word'}
            </span>
          </div>
          <div className={`keycap keycap-enter mono${enterActive ? ' active' : ''}`}>
            <b>↵ ENTER</b>
            <span>{phase === 'over' ? 'Play Again' : 'Start'}</span>
          </div>
        </div>

        <div className="kbd-row">
          <div
            className={`keycap keycap-space mono${spaceActive ? ' active' : ''}${phase === 'over' && fastRestart ? ' fast' : ''}`}
          >
            <b>␣ SPACE</b>
            <span>{isDefense ? 'Herald Phrase Space' : 'Line Phrase Space'}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Action Mapping Table */}
      <div className="kbd-legend">
        {rows.map(row => (
          <div
            key={row.keys}
            className={`kbd-legend-row${row.active ? ' active' : ' muted'}${row.highlightAccent ? ' fast' : ''}`}
          >
            <span className="kbd-keys mono">{row.keys}</span>
            <span className="kbd-desc">{row.action}</span>
            {row.note && <span className="kbd-state mono">{row.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
