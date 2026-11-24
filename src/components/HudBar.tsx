import React from 'react';
import { HudSnapshot } from '../game/types';

interface HudBarProps {
  hud: HudSnapshot;
  streakPop: boolean;
}

export const HudBar: React.FC<HudBarProps> = ({ hud, streakPop }) => {
  return (
    <section className="hud" aria-label="Game status">
      <div className="hud-cell hud-hero">
        <span className="cap">Hero · HP</span>
        <div className="hp-row">
          <div
            className="hp-track"
            role="progressbar"
            aria-label="Hero health"
            aria-valuemin={0}
            aria-valuemax={hud.maxHp}
            aria-valuenow={hud.hp}
          >
            <div
              className={`hp-fill${hud.hp <= Math.round(hud.maxHp * 0.3) ? ' low' : ''}`}
              style={{ width: `${Math.min(100, Math.round((hud.hp / hud.maxHp) * 100))}%` }}
            />
          </div>
          <b className="mono">{hud.hp}</b>
        </div>
        <span key={`sh-${hud.shieldActive}`} className={`shield-status mono${hud.shieldActive ? ' on hud-pop' : ''}`}>
          {hud.shieldActive
            ? 'SHIELD UP · falls on a typo'
            : `◇ SHIELD OFF · clean words ${Math.min(hud.cleanWords, 2)}/2`}
        </span>
      </div>

      <div className="hud-cell">
        <span className="cap">Score</span>
        <b className="mono hud-num">{hud.score.toLocaleString()}</b>
      </div>

      <div className="hud-cell">
        <span className="cap">Wave</span>
        <b key={`w-${hud.wave}`} className="mono hud-num hud-pop">
          {hud.mode === 'menu' ? '—' : hud.wave}
        </b>
      </div>

      <div className="hud-cell">
        <span className="cap">Down</span>
        <b key={`k-${hud.kills}`} className="mono hud-num hud-pop">
          {hud.kills}
        </b>
      </div>

      <div className="hud-cell">
        <span className="cap">Accuracy</span>
        <b className="mono hud-num">{hud.acc}%</b>
      </div>

      <div className="hud-cell">
        <span className="cap">Speed</span>
        <b className="mono hud-num">
          <span>{hud.wpm}</span>
          <small> wpm</small>
        </b>
      </div>

      <div className={`hud-cell hud-streak${streakPop ? ' pop' : ''}`}>
        <span className="cap">Streak</span>
        <b className="mono hud-num">
          ×{hud.streak}
          {hud.mult > 1 ? ` · ${hud.mult}× pts` : ''}
        </b>
      </div>
    </section>
  );
};
