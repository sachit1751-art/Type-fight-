import React from 'react';
import { GameMode } from '../game/types';
import { KeyboardShortcutsGuide } from './KeyboardShortcutsGuide';
import { WorkspaceView } from './TopBar';

interface HelpDrawerProps {
  open: boolean;
  activeView: WorkspaceView;
  arcadeMode: GameMode;
  defenseStatus: { running: boolean; paused: boolean; over: boolean };
  fastRestart: boolean;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  open,
  activeView,
  arcadeMode,
  defenseStatus,
  fastRestart,
  closeBtnRef,
  onClose,
}) => {
  const isDefense = activeView === 'defense';

  return (
    <>
      <div
        className="help-backdrop"
        hidden={!open}
        onClick={onClose}
      />
      <aside
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="helpTitle"
        hidden={!open}
      >
        <div className="help-head">
          <div>
            <span className="cap">
              {isDefense ? 'Hairline · Typing Defense' : 'Hairline · Type Arcade'}
            </span>
            <h2 id="helpTitle">{isDefense ? 'How to defend the keep' : 'How to play'}</h2>
          </div>
          <button
            ref={closeBtnRef}
            id="btnHelpClose"
            className="tool"
            type="button"
            title="Close help (Esc)"
            onClick={onClose}
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="help-body">
          <section>
            <span className="cap">01 · Visual keyboard shortcuts</span>
            <KeyboardShortcutsGuide
              activeView={activeView}
              arcadeMode={arcadeMode}
              defenseStatus={defenseStatus}
              fastRestart={fastRestart}
            />
          </section>

          {isDefense ? (
            <>
              <section>
                <span className="cap">02 · Type to fire</span>
                <p>
                  Every walker down the lanes carries a word. Type its first letter to lock on and
                  shoot from the keep tower — one bolt per letter, and the figure breaks when the
                  last letter lands. Typing a different starting letter switches targets before a
                  word is underway.
                </p>
              </section>
              <section>
                <span className="cap">03 · A typo fires back</span>
                <p>
                  A wrong letter never halts you: the walker fires a bolt back at the keep, your
                  streak resets, and the word advances to the next position. Every key counts and
                  moves forward — there is no backspace.
                </p>
              </section>
              <section>
                <span className="cap">04 · Ink &amp; turrets</span>
                <p>
                  Every correct letter earns <b>1 ink</b>; every down walker pays a bounty; holding
                  a wave adds a bonus. Press <kbd>1</kbd>, <kbd>2</kbd>, or <kbd>3</kbd> (or tap a
                  pad button) to build or upgrade a turret on that lane: <b>25 / 45 / 70 ink</b>.
                  Turrets chip letters off the right end of approaching words.
                </p>
              </section>
              <section>
                <span className="cap">05 · Clean words &amp; shield</span>
                <p>
                  A word finished without a typo heals <b>+2 HP</b> and grants <b>+3 ink</b>.{' '}
                  <b>Two clean words in a row</b> raise a shield around the keep that absorbs three
                  hits. A single typo drops it at once.
                </p>
              </section>
              <section>
                <span className="cap">06 · Walkers</span>
                <div className="legend">
                  <div>
                    <span className="legend-name">RUNNER</span>
                    <span>fast, short word · +2 ink</span>
                  </div>
                  <div>
                    <span className="legend-name">WALKER</span>
                    <span>standard pace · +3 ink</span>
                  </div>
                  <div>
                    <span className="legend-name">BRUTE</span>
                    <span>slow, heavy blows, long word · +6 ink</span>
                  </div>
                  <div>
                    <span className="legend-name">HERALD</span>
                    <span>dashed sign — full phrases, spaces count · +6 ink</span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <span className="cap">02 · Type to fire</span>
                <svg className="card-fig" viewBox="0 0 220 84" fill="none" aria-hidden="true">
                  <circle cx="34" cy="22" r="8" />
                  <path
                    d="M34 30v20M34 36l16-5 22 1M34 50l-10 22M34 50l12 20M50 31l34-4M84 26l6 0M96 25h44"
                    strokeDasharray="2 5"
                  />
                  <g className="fig-word">
                    <rect x="146" y="4" width="66" height="22" />
                    <text x="154" y="19">code</text>
                  </g>
                  <circle cx="196" cy="30" r="8" />
                  <path d="M196 38v18M196 44l-14-3M196 56l-8 18M196 56l9 17" />
                </svg>
                <p>
                  The <b>current word</b> is always in the TARGET box under the battlefield (normally
                  the nearest enemy&apos;s; at the start of a word, typing another enemy&apos;s first
                  letter makes that word current instead). Its bubble sits on top of the others, with
                  a dashed sight-line and a ring under its feet. Type straight through it: the next
                  letter is always <span className="help-cur">underlined</span>, every correct
                  letter fires, and the letter rides the bullet, hits, and greys out. When every
                  letter position has been entered, the enemy falls and the next word comes up.
                </p>
              </section>

              <section>
                <span className="cap">03 · A miss fires back</span>
                <svg className="card-fig" viewBox="0 0 220 84" fill="none" aria-hidden="true">
                  <circle cx="34" cy="22" r="8" />
                  <path d="M34 30v20M34 36l14-4M34 50l-10 22M34 50l12 20" />
                  <circle cx="186" cy="26" r="8" />
                  <path
                    d="M186 34v20M186 40l-18-4-24 1M186 54l-9 20M186 54l10 19M144 36H84"
                    strokeDasharray="2 5"
                  />
                  <text x="92" y="26" className="fig-x">
                    ✕
                  </text>
                </svg>
                <p>
                  A <b>wrong letter never halts you</b> — including the very first letter of a word.
                  It is marked red, the enemy fires back (hero −<b>8 HP</b> when the shot lands,
                  streak reset) — and the word simply moves on to the next letter. Example: for{' '}
                  <span className="mono">apple</span>, typing <span className="mono">appel</span>{' '}
                  scores <span className="mono">app</span> as three hits and the last two keys as
                  two misses, and the word is finished. There is no backspace; every letter key
                  counts and moves you forward.
                </p>
              </section>

              <section>
                <span className="cap">04 · Kills, the line &amp; waves</span>
                <p>
                  An enemy&apos;s health <em>is</em> its word: one hit per letter, and it falls on
                  the last one. Score is 10 per letter (with a streak multiplier every 12 in a row)
                  plus a completion bonus. An enemy that reaches <b>THE LINE</b> stops there and
                  keeps shooting the hero. Every 8 kills starts a new wave: faster walkers, faster
                  spawns, longer words, more brutes. The run ends when the hero&apos;s HP reaches
                  zero.
                </p>
                <div className="legend">
                  <div>
                    <span className="legend-name">▸ RUNNER</span>
                    <span>small &amp; quick · short words</span>
                  </div>
                  <div>
                    <span className="legend-name">▸ WALKER</span>
                    <span>the standard march · mid words</span>
                  </div>
                  <div>
                    <span className="legend-name">▸ BRUTE</span>
                    <span>slow &amp; tall · long words, many hits</span>
                  </div>
                </div>
              </section>

              <section>
                <span className="cap">05 · Shield &amp; lines</span>
                <p>
                  Every word finished <b>with no typo</b> also heals the hero <b>+2 HP</b> (up to
                  100). Type <b>two of those in a row</b> and a <b>shield</b> rises around the hero
                  (watch the HUD under his HP). While it is up, enemy shots{' '}
                  <b>bounce off — no HP lost</b>. It stays until your <b>first typo</b>, which brings
                  it down at once; then you must earn it again with two more clean words.
                </p>
                <p>
                  Later on (wave 3) some enemies carry a simple <b>line</b> instead of a word,
                  tagged <span className="mono">— LINE —</span>. Type the whole line:{' '}
                  <b>spaces count</b> and are shown as <span className="mono">␣</span>. Line
                  carriers walk slower, but their lines are long.
                </p>
              </section>
            </>
          )}

          <footer className="help-foot">
            Visual language after{' '}
            <a
              href="https://github.com/lucasmarkes/hairline"
              target="_blank"
              rel="noreferrer"
            >
              lucasmarkes/hairline
            </a>{' '}
            — isometric line figures on a plate:{' '}
            <span className="mono">plate · hi · edge · mid · lo</span>, hairline stroke, no fills
            but the plate.
            <br />
            <span className="mono">Daily Challenge &amp; Fast Restart available in ⚙ AUDIO</span>
          </footer>
        </div>
      </aside>
    </>
  );
};
