import React, { useEffect } from 'react';
import { DailyChallenge, DailyProgress, getNextRotationCountdown } from '../game/challenge';
import { PlayerHistory } from '../game/history';

interface HomeLandingProps {
  dailyChallenge: DailyChallenge;
  dailyProgress: DailyProgress;
  playerHistory: PlayerHistory;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onStartArcade: (daily?: boolean) => void;
  onStartDefense: (daily?: boolean) => void;
}

function handleCardPointerMove(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (e.clientX - rect.left) / rect.width - 0.5;
  const ny = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--tilt-x', `${(nx * 3.2).toFixed(2)}deg`);
  el.style.setProperty('--tilt-y', `${(-ny * 3.2).toFixed(2)}deg`);
}

function handleCardPointerLeave(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.removeProperty('--tilt-x');
  el.style.removeProperty('--tilt-y');
}

export const HomeLanding: React.FC<HomeLandingProps> = ({
  dailyChallenge,
  dailyProgress,
  playerHistory,
  darkMode,
  onToggleTheme,
  onOpenSettings,
  onStartArcade,
  onStartDefense,
}) => {
  const countdown = getNextRotationCountdown();
  const todayRecord = dailyProgress.days[dailyChallenge.dateKey];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '1') {
        e.preventDefault();
        onStartArcade(false);
      } else if (e.key === '2') {
        e.preventDefault();
        onStartDefense(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartArcade, onStartDefense]);

  const lastGame = playerHistory.lastPlayedGame;
  const lastSummary = lastGame ? playerHistory[lastGame] : null;
  const lastScoreDisplay =
    lastSummary && lastSummary.lastScore !== null
      ? `${lastSummary.lastScore.toLocaleString()} · ${
          lastGame === 'arcade' ? 'Type Arcade' : 'Typing Defence'
        }`
      : 'No runs yet';

  const lifetimeAccDisplay =
    playerHistory.totalRuns > 0 ? `${playerHistory.lifetimeBestAccuracy}%` : '—';

  const fastestWpm = playerHistory.allTimeFastestWpm;
  const fastestGameLabel =
    fastestWpm > 0
      ? playerHistory.arcade.bestWpm >= playerHistory.defense.bestWpm
        ? 'Type Arcade'
        : 'Typing Defence'
      : null;
  const fastestWpmDisplay =
    fastestWpm > 0 ? `${fastestWpm} wpm · ${fastestGameLabel}` : '—';

  return (
    <section className="home-landing home-clean" aria-label="Games by Sachit">
      {/* ── QUIET CORNER THEME & SETTINGS STRIP ── */}
      <div className="home-corner-bar">
        <button
          type="button"
          className="tool home-corner-btn"
          aria-pressed={darkMode}
          title={darkMode ? 'Switch to Light Plate' : 'Switch to Dark Plate'}
          onClick={e => {
            onToggleTheme();
            e.currentTarget.blur();
          }}
        >
          {darkMode ? '☀ LIGHT PLATE' : '☾ DARK PLATE'}
        </button>
        <button
          type="button"
          className="tool home-corner-btn"
          title="Audio mixer, Drafting Grid & Fast Restart settings"
          onClick={e => {
            onOpenSettings();
            e.currentTarget.blur();
          }}
        >
          ⚙ SETTINGS
        </button>
      </div>

      {/* ── CENTRAL HEADING ── */}
      <header className="home-header">
        <span className="cap">Hairline · Typing Collection</span>
        <h1 className="home-brand-title">Games by Sachit</h1>
        <p className="home-brand-sub">Select a game to begin.</p>
      </header>

      {/* ── TWO CLEAN GAME CARDS ── */}
      <div className="home-modes home-cards-centered">
        {/* Card 1: Type Arcade */}
        <article
          className="home-mode-card home-game-card"
          onPointerMove={handleCardPointerMove}
          onPointerLeave={handleCardPointerLeave}
        >
          <span className="card-reg-tl" aria-hidden="true" />
          <span className="card-reg-br" aria-hidden="true" />
          <div className="mode-card-head">
            <span className="cap">01 · Shooting</span>
            <span className="cap dim">
              {playerHistory.arcade.lastScore !== null
                ? `last ${playerHistory.arcade.lastScore.toLocaleString()}`
                : 'rifle · shield'}
            </span>
          </div>

          <div className="home-game-fig" aria-hidden="true">
            <svg className="deck-svg home-anim-arcade" viewBox="0 0 320 110" fill="none">
              <line x1="22" y1="86" x2="298" y2="86" />
              {/* Hero stick-figure + rifle recoil */}
              <g className="svg-hero-group">
                <circle cx="46" cy="30" r="8.5" />
                <path d="M46 38.5v22M46 44l18-5 24 1M46 60.5l-10 22M46 60.5l12 20" />
                <circle cx="91" cy="40" r="3" className="svg-muzzle" />
              </g>
              {/* Traveling tracer & firing line */}
              <path d="M94 40h60" strokeDasharray="2 5" />
              <line x1="94" y1="40" x2="110" y2="40" className="svg-bullet-travel" />
              {/* Target word lock reticle */}
              <g className="svg-word-lock">
                <rect x="164" y="16" width="66" height="26" rx="5" />
                <text x="180" y="33" className="deck-lbl">
                  fire
                </text>
              </g>
              {/* Advancing enemy figure */}
              <g className="svg-enemy-march">
                <circle cx="272" cy="36" r="8.5" />
                <path d="M272 44.5v20M272 50l-16-4M272 64.5l-9 18M272 64.5l10 17" />
              </g>
            </svg>
          </div>

          <h2>Type Arcade</h2>
          <p>
            Hold the firing line. Every accurate letter fires a bullet; two clean words raise a
            deflecting shield.
          </p>

          <div className="card-best-perf" aria-label="Type Arcade best performance">
            <div className="card-best-head">
              <span className="cap">Best Performance</span>
              <span className="cap dim mono">
                All-Time Fastest: {fastestWpm > 0 ? `${fastestWpm} wpm` : '—'}
              </span>
            </div>
            <div className="card-best-grid">
              <div>
                <span className="cap">Fastest WPM</span>
                <b className="mono">
                  {playerHistory.arcade.bestWpm > 0 ? `${playerHistory.arcade.bestWpm} wpm` : '—'}
                </b>
              </div>
              <div>
                <span className="cap">Best Score</span>
                <b className="mono">
                  {playerHistory.arcade.bestScore > 0
                    ? playerHistory.arcade.bestScore.toLocaleString()
                    : '—'}
                </b>
              </div>
              <div>
                <span className="cap">Best Accuracy</span>
                <b className="mono">
                  {playerHistory.arcade.runsPlayed > 0
                    ? `${playerHistory.arcade.bestAccuracy}%`
                    : '—'}
                </b>
              </div>
            </div>
          </div>

          <div className="mode-card-foot home-card-actions">
            <button
              type="button"
              className="cta"
              onClick={e => {
                onStartArcade(false);
                e.currentTarget.blur();
              }}
            >
              ▶ &nbsp;PLAY TYPE ARCADE
            </button>
            <button
              type="button"
              className="tool"
              onClick={e => {
                onStartArcade(true);
                e.currentTarget.blur();
              }}
            >
              Daily: {dailyChallenge.weaponLabel}
            </button>
          </div>
        </article>

        {/* Card 2: Typing Defence */}
        <article
          className="home-mode-card home-game-card"
          onPointerMove={handleCardPointerMove}
          onPointerLeave={handleCardPointerLeave}
        >
          <span className="card-reg-tl" aria-hidden="true" />
          <span className="card-reg-br" aria-hidden="true" />
          <div className="mode-card-head">
            <span className="cap">02 · Defence</span>
            <span className="cap dim">
              {playerHistory.defense.lastScore !== null
                ? `last ${playerHistory.defense.lastScore.toLocaleString()}`
                : 'turrets · ×4 ink'}
            </span>
          </div>

          <div className="home-game-fig" aria-hidden="true">
            <svg className="deck-svg home-anim-defense" viewBox="0 0 320 110" fill="none">
              <rect x="34" y="24" width="38" height="62" rx="4" />
              <rect x="30" y="16" width="46" height="10" rx="2" />
              <line x1="53" y1="16" x2="53" y2="5" />
              <path d="M53 5l15 5-15 4" className="svg-pennant" />
              <line x1="86" y1="34" x2="292" y2="34" strokeDasharray="2 4" />
              <line x1="86" y1="58" x2="292" y2="58" strokeDasharray="2 4" />
              <line x1="86" y1="82" x2="292" y2="82" strokeDasharray="2 4" />
              {/* Turret pad + barrel */}
              <g className="svg-turret-pulse">
                <rect x="116" y="50" width="14" height="16" rx="2" />
                <line x1="130" y1="58" x2="140" y2="58" />
              </g>
              {/* Turret & Keep bolts */}
              <circle cx="146" cy="34" r="3" className="deck-dot svg-bolt-lane1" />
              <circle cx="142" cy="58" r="2.8" className="deck-dot svg-bolt-lane2" />
              {/* Patrolling walkers */}
              <rect x="216" y="44" width="18" height="22" rx="4" className="svg-walker-a" />
              <rect x="176" y="68" width="18" height="22" rx="4" className="svg-walker-b" />
            </svg>
          </div>

          <h2>Typing Defence</h2>
          <p>
            Guard the three-lane keep. Chain rapid kills for ×4 Ink combos and deploy turrets with
            keys 1–3.
          </p>

          <div className="card-best-perf" aria-label="Typing Defence best performance">
            <div className="card-best-head">
              <span className="cap">Best Performance</span>
              <span className="cap dim mono">
                All-Time Fastest: {fastestWpm > 0 ? `${fastestWpm} wpm` : '—'}
              </span>
            </div>
            <div className="card-best-grid">
              <div>
                <span className="cap">Fastest WPM</span>
                <b className="mono">
                  {playerHistory.defense.bestWpm > 0 ? `${playerHistory.defense.bestWpm} wpm` : '—'}
                </b>
              </div>
              <div>
                <span className="cap">Best Score</span>
                <b className="mono">
                  {playerHistory.defense.bestScore > 0
                    ? playerHistory.defense.bestScore.toLocaleString()
                    : '—'}
                </b>
              </div>
              <div>
                <span className="cap">Best Accuracy</span>
                <b className="mono">
                  {playerHistory.defense.runsPlayed > 0
                    ? `${playerHistory.defense.bestAccuracy}%`
                    : '—'}
                </b>
              </div>
            </div>
          </div>

          <div className="mode-card-foot home-card-actions">
            <button
              type="button"
              className="cta"
              onClick={e => {
                onStartDefense(false);
                e.currentTarget.blur();
              }}
            >
              ⛨ &nbsp;PLAY TYPING DEFENCE
            </button>
            <button
              type="button"
              className="tool"
              onClick={e => {
                onStartDefense(true);
                e.currentTarget.blur();
              }}
            >
              Daily: {dailyChallenge.weaponLabel}
            </button>
          </div>
        </article>
      </div>

      {/* ── BEST PERFORMANCE RECORD BAR BELOW CARDS ── */}
      <div className="home-record-strip home-record-strip-4" aria-label="Player lifetime records">
        <div className="record-cell">
          <span className="cap">All-Time Fastest WPM</span>
          <b className="mono">{fastestWpmDisplay}</b>
        </div>
        <div className="record-cell">
          <span className="cap">Lifetime Best Accuracy</span>
          <b className="mono">{lifetimeAccDisplay}</b>
        </div>
        <div className="record-cell">
          <span className="cap">Last Score</span>
          <b className="mono">{lastScoreDisplay}</b>
        </div>
        <div className="record-cell">
          <span className="cap">Daily Challenge ({countdown})</span>
          <b className="mono">
            {dailyChallenge.name}
            {todayRecord?.completed ? ' · Cleared ✓' : ''}
          </b>
        </div>
      </div>
    </section>
  );
};
