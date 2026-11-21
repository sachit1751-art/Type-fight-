import React, { useRef, useState } from 'react';
import {
  DailyChallenge,
  DailyProgress,
  getNextRotationCountdown,
} from '../game/challenge';

interface HomeLandingProps {
  dailyChallenge: DailyChallenge;
  dailyProgress: DailyProgress;
  onGoArcade: (daily?: boolean) => void;
  onGoDefense: (daily?: boolean) => void;
  onOpenTutorial: () => void;
}

interface OnboardingSlide {
  step: string;
  label: string;
  title: string;
  summary: string;
  actionLabel: string;
  actionTarget: 'arcade' | 'defense' | 'daily-arcade';
}

const SLIDES: OnboardingSlide[] = [
  {
    step: '01',
    label: 'Type Arcade',
    title: 'Type straight through the firing line',
    summary:
      'Stick-figure enemies march from the right carrying words overhead. Every right letter fires a bullet; two clean words raise a shield.',
    actionLabel: 'Launch Type Arcade',
    actionTarget: 'arcade',
  },
  {
    step: '02',
    label: 'Typing Defense',
    title: 'Defend the isometric keep & three lanes',
    summary:
      'Lock onto approaching walkers with their first letter, soak three hits behind clean-word shields, and defend the keep across endless waves.',
    actionLabel: 'Launch Typing Defense',
    actionTarget: 'defense',
  },
  {
    step: '03',
    label: 'Daily Challenge',
    title: 'Daily rotating weapons & modifiers',
    summary:
      'Every calendar day introduces a fresh ruleset—Twin-Bolt, Scattergun, Railgun, or Hyper-Carbine—with custom speeds, HP, and streak tracking.',
    actionLabel: 'Try Today’s Challenge',
    actionTarget: 'daily-arcade',
  },
  {
    step: '04',
    label: 'D3 WPM & Audio Mixer',
    title: 'Inspect your WPM trend & mix your audio',
    summary:
      'Review a D3 hairline curve of your speed on Game Over, export 1080×1080 cards, or tune master volume and Shooting / Enemies / UI SFX.',
    actionLabel: 'Play Type Arcade',
    actionTarget: 'arcade',
  },
];

export const HomeLanding: React.FC<HomeLandingProps> = ({
  dailyChallenge,
  dailyProgress,
  onGoArcade,
  onGoDefense,
  onOpenTutorial,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const current = SLIDES[slideIdx];
  const todayRecord = dailyProgress.days[dailyChallenge.dateKey];
  const countdown = getNextRotationCountdown();

  const prevSlide = () => setSlideIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % SLIDES.length);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 36) return;
    if (delta < 0) nextSlide();
    else prevSlide();
  };

  return (
    <section className="home-landing" aria-label="Welcome and game modes">
      {/* ── HERO SPLIT (Desktop 2-col / Mobile Native Swipe Deck) ── */}
      <div className="home-hero">
        <div className="home-hero-copy">
          <span className="cap">Hairline · Desktop &amp; Mobile Typing Games</span>
          <h1 className="home-title">Two minimalist typing games, drawn in hairlines.</h1>
          <p className="home-lede">
            Hold the flat-ground firing line in <strong>Type Arcade</strong> or command the isometric
            three-lane fortress in <strong>Typing Defense</strong> — zero-backspace positional
            typing where every keystroke fires and every miss shoots back.
          </p>

          <div className="home-cta-row">
            <button
              type="button"
              className="cta"
              onClick={e => {
                onGoArcade(false);
                e.currentTarget.blur();
              }}
            >
              ▶ &nbsp;PLAY TYPE ARCADE
            </button>
            <button
              type="button"
              className="cta cta-outline"
              onClick={e => {
                onGoDefense(false);
                e.currentTarget.blur();
              }}
            >
              ⛨ &nbsp;PLAY TYPING DEFENSE
            </button>
          </div>

          <div className="home-meta-row mono">
            <button
              type="button"
              className="home-text-link"
              onClick={e => {
                onOpenTutorial();
                e.currentTarget.blur();
              }}
            >
              ◈ Launch 4-step game tour
            </button>
            <span aria-hidden="true">·</span>
            <span>Daily Challenge Rotation</span>
            <span aria-hidden="true">·</span>
            <span>D3 WPM Analytics</span>
          </div>
        </div>

        {/* Interactive Swipeable Onboarding Card (Mobile-Native + Desktop) */}
        <div
          className="home-deck"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription="carousel"
          aria-label="Game mechanics overview"
        >
          <div className="home-deck-top">
            <span className="cap">
              Guide · {current.step} / 0{SLIDES.length}
            </span>
            <span className="cap dim">swipe or tap steps</span>
          </div>

          <div className="home-deck-stage">
            {slideIdx === 0 && (
              <svg className="deck-svg" viewBox="0 0 320 120" fill="none" aria-hidden="true">
                <circle cx="42" cy="34" r="9" />
                <path d="M42 43v24M42 49l18-5 24 1M42 67l-10 24M42 67l12 22" />
                <path d="M88 45h54" strokeDasharray="2 5" />
                <rect x="156" y="20" width="68" height="26" rx="5" />
                <text x="172" y="37" className="deck-lbl">
                  code
                </text>
                <circle cx="268" cy="40" r="9" />
                <path d="M268 49v22M268 55l-16-4M268 71l-9 20M268 71l10 19" />
                <line x1="22" y1="94" x2="298" y2="94" />
              </svg>
            )}
            {slideIdx === 1 && (
              <svg className="deck-svg" viewBox="0 0 320 120" fill="none" aria-hidden="true">
                <rect x="34" y="26" width="38" height="68" rx="4" />
                <rect x="30" y="18" width="46" height="10" rx="2" />
                <line x1="53" y1="18" x2="53" y2="6" />
                <path d="M53 6l16 5-16 5" />
                <line x1="86" y1="36" x2="292" y2="36" strokeDasharray="2 4" />
                <line x1="86" y1="62" x2="292" y2="62" strokeDasharray="2 4" />
                <line x1="86" y1="88" x2="292" y2="88" strokeDasharray="2 4" />
                <rect x="218" y="48" width="18" height="24" rx="4" />
                <rect x="180" y="74" width="18" height="24" rx="4" />
                <circle cx="144" cy="36" r="3" className="deck-dot" />
              </svg>
            )}
            {slideIdx === 2 && (
              <svg className="deck-svg" viewBox="0 0 320 120" fill="none" aria-hidden="true">
                <line x1="36" y1="58" x2="284" y2="58" className="deck-accent" />
                <line x1="36" y1="54" x2="284" y2="54" strokeDasharray="3 5" />
                <circle cx="104" cy="58" r="4" className="deck-dot" />
                <circle cx="196" cy="58" r="4" className="deck-dot" />
                <rect x="234" y="22" width="54" height="24" rx="5" />
                <text x="242" y="38" className="deck-lbl">
                  ×2 HIT
                </text>
                <text x="36" y="92" className="deck-lbl">
                  DAILY ROTATION · {dailyChallenge.weaponLabel.toUpperCase()}
                </text>
              </svg>
            )}
            {slideIdx === 3 && (
              <svg className="deck-svg" viewBox="0 0 320 120" fill="none" aria-hidden="true">
                <rect x="24" y="16" width="272" height="88" rx="6" />
                <line x1="42" y1="84" x2="278" y2="84" />
                <line x1="42" y1="54" x2="278" y2="54" strokeDasharray="2 4" />
                <path
                  d="M44 82 C84 72, 106 42, 142 50 C178 58, 206 24, 242 32 L274 28"
                  className="deck-accent"
                />
                <circle cx="242" cy="32" r="4" className="deck-dot" />
                <text x="200" y="24" className="deck-lbl">
                  PEAK WPM
                </text>
              </svg>
            )}
          </div>

          <div className="home-deck-copy">
            <span className="cap">{current.label}</span>
            <h2>{current.title}</h2>
            <p>{current.summary}</p>
          </div>

          <div className="home-deck-controls">
            <div className="deck-dots" role="tablist" aria-label="Guide slides">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.step}
                  type="button"
                  role="tab"
                  aria-selected={idx === slideIdx}
                  aria-label={`Slide ${idx + 1}: ${s.label}`}
                  className={`deck-dot-btn${idx === slideIdx ? ' active' : ''}`}
                  onClick={() => setSlideIdx(idx)}
                >
                  <span className="deck-dot-pip" />
                </button>
              ))}
            </div>

            <div className="deck-btns">
              <button
                type="button"
                className="tool deck-nav-btn"
                onClick={prevSlide}
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                type="button"
                className="tool deck-nav-btn"
                onClick={nextSlide}
                aria-label="Next slide"
              >
                →
              </button>
              <button
                type="button"
                className="tool deck-action-btn"
                onClick={e => {
                  e.currentTarget.blur();
                  if (current.actionTarget === 'arcade') onGoArcade(false);
                  else if (current.actionTarget === 'daily-arcade') onGoArcade(true);
                  else onGoDefense(false);
                }}
              >
                {current.actionLabel} ↗
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DAILY ROTATING CHALLENGE PANEL ── */}
      <section className="daily-card" aria-label="Daily Rotating Challenge Mode">
        <div className="daily-card-main">
          <div className="daily-meta mono">
            <span>Daily Challenge</span>
            <span aria-hidden="true">·</span>
            <span>{dailyChallenge.dateKey}</span>
            <span aria-hidden="true">·</span>
            <span>Rotates in {countdown}</span>
            <span aria-hidden="true">·</span>
            <span>
              Streak {dailyProgress.streakDays} {dailyProgress.streakDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          <h2 className="daily-title">{dailyChallenge.name}</h2>
          <p className="daily-tagline">{dailyChallenge.tagline}</p>

          <ul className="daily-rules">
            {dailyChallenge.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="daily-card-side">
          <div className="daily-stats-grid">
            <div>
              <span className="cap">Weapon</span>
              <b className="mono">{dailyChallenge.weaponLabel}</b>
            </div>
            <div>
              <span className="cap">Arcade Best</span>
              <b className="mono">{(todayRecord?.arcadeBest ?? 0).toLocaleString()}</b>
            </div>
            <div>
              <span className="cap">Defense Best</span>
              <b className="mono">{(todayRecord?.defenseBest ?? 0).toLocaleString()}</b>
            </div>
            <div>
              <span className="cap">Today Status</span>
              <b className="mono">{todayRecord?.completed ? 'Cleared ✓' : 'Open (Wave 2+)'}</b>
            </div>
          </div>

          <div className="daily-actions">
            <button
              type="button"
              className="cta daily-cta"
              onClick={e => {
                onGoArcade(true);
                e.currentTarget.blur();
              }}
            >
              ▶ ARCADE CHALLENGE
            </button>
            <button
              type="button"
              className="tool"
              onClick={e => {
                onGoDefense(true);
                e.currentTarget.blur();
              }}
            >
              ⛨ DEFENSE CHALLENGE
            </button>
          </div>
        </div>
      </section>

      {/* ── TWO-UP GAME MODE LAUNCHERS ── */}
      <div className="home-modes">
        <article className="home-mode-card">
          <div className="mode-card-head">
            <span className="cap">01 · Side-Scroller Shooter</span>
            <span className="cap dim">keyboard &amp; touch</span>
          </div>
          <h3>HAIRLINE / Type Arcade</h3>
          <p>
            Stick-figure defenders hold the firing line against marching runners, walkers, and
            brutes. Every correct letter fires a rifle round; two clean words raise a protective
            shield.
          </p>
          <div className="mode-card-foot">
            <span className="mono mode-specs">WPM · Accuracy · Streak · D3 Chart</span>
            <button
              type="button"
              className="tool"
              onClick={e => {
                onGoArcade(false);
                e.currentTarget.blur();
              }}
            >
              ▶ PLAY ARCADE
            </button>
          </div>
        </article>

        <article className="home-mode-card">
          <div className="mode-card-head">
            <span className="cap">02 · Isometric Lane Defense</span>
            <span className="cap dim">turrets · ink · 3 lanes</span>
          </div>
          <h3>HAIRLINE / Typing Defense</h3>
          <p>
            Command the three-lane isometric keep. Lock onto walkers, spend Ink with keys{' '}
            <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to upgrade lane turrets, and survive endless waves.
          </p>
          <div className="mode-card-foot">
            <span className="mono mode-specs">Keep HP · Ink · Turrets · D3 Chart</span>
            <button
              type="button"
              className="tool"
              onClick={e => {
                onGoDefense(false);
                e.currentTarget.blur();
              }}
            >
              ⛨ PLAY DEFENSE
            </button>
          </div>
        </article>
      </div>

      {/* ── 4-CELL ARCADE MECHANICS STRIP ── */}
      <div className="home-strip" aria-label="Shared typing mechanics">
        <div className="strip-cell">
          <span className="cap">Rule 01</span>
          <strong>Zero Backspace</strong>
          <span>Every letter advances the word. Misses hurt, but never jam your flow.</span>
        </div>
        <div className="strip-cell">
          <span className="cap">Rule 02</span>
          <strong>Clean Shield</strong>
          <span>Two typo-free words in a row heal HP and raise a deflecting shield.</span>
        </div>
        <div className="strip-cell">
          <span className="cap">Rule 03</span>
          <strong>Daily Rotations</strong>
          <span>New custom weapon and speed modifiers unlock daily at midnight.</span>
        </div>
        <div className="strip-cell">
          <span className="cap">Rule 04</span>
          <strong>D3 Speed Telemetry</strong>
          <span>Inspect your WPM trend graph on Game Over and share 1080×1080 cards.</span>
        </div>
      </div>
    </section>
  );
};
