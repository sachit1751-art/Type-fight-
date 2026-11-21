import React, { useEffect, useState } from 'react';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onCompleteGoToDefense: () => void;
}

interface StepDef {
  num: string;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
}

const STEPS: StepDef[] = [
  {
    num: '01',
    kicker: 'Step 01 · Positional Typing',
    title: 'Type straight through each target word',
    body: 'Whether holding the firing line in Type Arcade or defending the keep in Typing Defense, every correct letter fires immediately and advances the cursor.',
    bullets: [
      'Type any idle word’s starting letter before a word begins to switch targets on the fly.',
      'Spacebars count inside multi-word phrases carried by late-wave enemies and heralds.',
      'On touch devices, tap TYPE / TYPE HERE to open the mobile keyboard dock.',
    ],
  },
  {
    num: '02',
    kicker: 'Step 02 · Typos & Shields',
    title: 'Every miss fires back — never freezes',
    body: 'There is no Backspace: a mistyped character marks the position red, lets the enemy fire back, and immediately moves to the next letter.',
    bullets: [
      'Finish a word cleanly with zero typos to heal +2 HP.',
      'Finish two clean words in a row to raise a defensive shield (persistent in Arcade, 3-hit buffer in Defense).',
      'Your first typo drops the shield immediately, raising the stakes on every keystroke.',
    ],
  },
  {
    num: '03',
    kicker: 'Step 03 · Ink & Turrets',
    title: 'Build lane turrets in Typing Defense',
    body: 'In Typing Defense, every accurate keystroke generates Ink, while defeated walkers drop bounties and wave clears pay extra bonuses.',
    bullets: [
      'Press 1, 2, or 3 (or tap a console pad button) to build or upgrade a turret in that lane.',
      'Upgrade costs scale 25 → 45 → 70 Ink for faster fire rates and longer lane reach.',
      'Turrets trim letters off the right end of approaching enemy words.',
    ],
  },
  {
    num: '04',
    kicker: 'Step 04 · D3 WPM & Sharing',
    title: 'Analyze your WPM trend & share results',
    body: 'Every Game Over screen draws a D3 hairline trend graph plotting your typing speed across the run along with peak and average WPM.',
    bullets: [
      'Review how your speed climbed or dipped through intense late waves.',
      'Post your run score, wave, and WPM directly to Twitter / X or Facebook.',
      'Export a crisp 1080×1080 monochrome result PNG ready for Instagram.',
    ],
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  onClose,
  onCompleteGoToDefense,
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStep(s => Math.min(STEPS.length - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep(s => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboard-backdrop" role="presentation" onClick={onClose}>
      <div
        className="onboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboardTitle"
        onClick={e => e.stopPropagation()}
      >
        <div className="onboard-head">
          <div className="onboard-steps" role="tablist" aria-label="Tutorial steps">
            {STEPS.map((s, idx) => (
              <button
                key={s.num}
                type="button"
                role="tab"
                aria-selected={idx === step}
                className={`onboard-tab mono${idx === step ? ' active' : ''}${idx < step ? ' done' : ''}`}
                onClick={() => setStep(idx)}
              >
                {s.num}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tool"
            onClick={onClose}
            aria-label="Close tutorial"
          >
            ✕ SKIP
          </button>
        </div>

        <div className="onboard-body">
          <div className="onboard-fig-wrap">
            {step === 0 && (
              <svg className="onboard-fig" viewBox="0 0 360 110" fill="none" aria-hidden="true">
                <circle cx="46" cy="34" r="9" />
                <path d="M46 43v24M46 49l18-5 24 1M46 67l-10 22M46 67l12 20" />
                <path d="M96 46h56" strokeDasharray="2 5" />
                <rect x="164" y="20" width="76" height="28" rx="6" />
                <text x="182" y="39" className="fig-lbl">
                  pulse
                </text>
                <circle cx="294" cy="40" r="9" />
                <path d="M294 49v22M294 55l-16-4M294 71l-9 18M294 71l10 17" />
                <line x1="22" y1="92" x2="338" y2="92" />
              </svg>
            )}
            {step === 1 && (
              <svg className="onboard-fig" viewBox="0 0 360 110" fill="none" aria-hidden="true">
                <rect x="28" y="20" width="128" height="70" rx="6" />
                <text x="50" y="54" className="fig-lbl">
                  st r i k e
                </text>
                <text x="72" y="72" className="fig-accent" style={{ fontSize: 12, stroke: 'none', fill: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                  ✕ typo fires back
                </text>
                <path d="M170 55h28" strokeDasharray="2 4" />
                <circle cx="268" cy="55" r="30" strokeDasharray="3 4" />
                <text x="234" y="59" className="fig-lbl">
                  ⬡ SHIELD
                </text>
              </svg>
            )}
            {step === 2 && (
              <svg className="onboard-fig" viewBox="0 0 360 110" fill="none" aria-hidden="true">
                <rect x="30" y="20" width="70" height="70" rx="6" />
                <text x="48" y="58" className="fig-lbl">
                  [1] L1
                </text>
                <rect x="145" y="20" width="70" height="70" rx="6" />
                <text x="163" y="58" className="fig-lbl">
                  [2] L2
                </text>
                <rect x="260" y="20" width="70" height="70" rx="6" />
                <text x="278" y="58" className="fig-lbl">
                  [3] L3
                </text>
                <path d="M104 55h36M219 55h36" strokeDasharray="2 4" />
              </svg>
            )}
            {step === 3 && (
              <svg className="onboard-fig" viewBox="0 0 360 110" fill="none" aria-hidden="true">
                <rect x="24" y="16" width="180" height="78" rx="6" />
                <path d="M38 78 C66 66, 86 44, 114 48 C142 52, 160 28, 192 26" className="fig-accent" />
                <line x1="38" y1="80" x2="192" y2="80" strokeDasharray="2 3" />
                <rect x="220" y="16" width="116" height="22" rx="11" />
                <rect x="220" y="44" width="116" height="22" rx="11" />
                <rect x="220" y="72" width="116" height="22" rx="11" />
                <text x="238" y="31" className="fig-lbl">
                  𝕏 TWITTER
                </text>
                <text x="238" y="59" className="fig-lbl">
                  f FACEBOOK
                </text>
                <text x="238" y="87" className="fig-lbl">
                  ◎ 1080×1080
                </text>
              </svg>
            )}
          </div>

          <span className="cap">{current.kicker}</span>
          <h2 id="onboardTitle">{current.title}</h2>
          <p className="onboard-lede">{current.body}</p>

          <ul className="onboard-list">
            {current.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="onboard-foot">
          <span className="cap mono">
            Step {step + 1} of {STEPS.length} · ← → keys navigate
          </span>
          <div className="onboard-nav">
            <button
              type="button"
              className="tool"
              disabled={step === 0}
              onClick={() => setStep(s => Math.max(0, s - 1))}
            >
              ← BACK
            </button>
            {isLast ? (
              <button
                type="button"
                className="cta onboard-cta"
                onClick={() => {
                  onClose();
                  onCompleteGoToDefense();
                }}
              >
                ⛨ PLAY TYPING DEFENSE
              </button>
            ) : (
              <button
                type="button"
                className="cta onboard-cta"
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              >
                NEXT →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
