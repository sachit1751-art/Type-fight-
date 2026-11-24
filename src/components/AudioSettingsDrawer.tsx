import React, { useEffect, useState } from 'react';
import {
  AudioSettings,
  getAudioSettings,
  previewAudioCategory,
  resetAudioSettings,
  setCategoryEnabled,
  setMasterVolume,
  setSoundEnabled,
  SfxCategory,
  subscribeAudioSettings,
} from '../game/audio';
import {
  getPreferences,
  resetPreferences,
  setDraftingGrid,
  setFastRestart,
  subscribePreferences,
  UserPreferences,
} from '../game/preferences';

interface AudioSettingsDrawerProps {
  open: boolean;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

const CATEGORY_META: Array<{
  key: SfxCategory;
  title: string;
  desc: string;
}> = [
  {
    key: 'shooting',
    title: 'Shooting & Weapons',
    desc: 'Hero rifle fire, Keep turrets, Railgun/Twin/Scatter shots, and hit impacts.',
  },
  {
    key: 'enemies',
    title: 'Enemies & Combat',
    desc: 'Enemy counter-fire, incoming damage cues, and figure takedowns.',
  },
  {
    key: 'ui',
    title: 'UI & Feedback',
    desc: 'Word completion chimes, shield raise/block, typos, wave transitions, and Ink turret builds.',
  },
];

export const AudioSettingsDrawer: React.FC<AudioSettingsDrawerProps> = ({
  open,
  closeBtnRef,
  onClose,
}) => {
  const [audio, setAudio] = useState<AudioSettings>(() => getAudioSettings());
  const [prefs, setPrefs] = useState<UserPreferences>(() => getPreferences());

  useEffect(() => {
    setAudio(getAudioSettings());
    setPrefs(getPreferences());
    const unsubAudio = subscribeAudioSettings(setAudio);
    const unsubPrefs = subscribePreferences(setPrefs);
    return () => {
      unsubAudio();
      unsubPrefs();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const effectiveActive = audio.enabled && audio.masterVolume > 0;

  return (
    <>
      <div className="help-backdrop" hidden={!open} onClick={onClose} />
      <aside
        className="help-panel audio-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audioSettingsTitle"
        hidden={!open}
      >
        <div className="help-head">
          <div>
            <span className="cap">Audio &amp; Gameplay · Type Arcade &amp; Typing Defense</span>
            <h2 id="audioSettingsTitle">Audio &amp; Settings</h2>
          </div>
          <button
            ref={closeBtnRef}
            className="tool"
            type="button"
            title="Close settings (Esc)"
            onClick={onClose}
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="help-body audio-body">
          {/* Master Output & Volume Slider */}
          <section className="audio-section">
            <div className="audio-row-head">
              <div>
                <span className="cap">Master Output</span>
                <h3 className="audio-label">Master volume</h3>
              </div>
              <div className="audio-row-actions">
                <span className="audio-pct mono">
                  {audio.enabled ? `${audio.masterVolume}%` : 'MUTED'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={audio.enabled}
                  className={`audio-switch mono${audio.enabled ? ' on' : ''}`}
                  onClick={() => setSoundEnabled(!audio.enabled, true)}
                >
                  {audio.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="audio-slider-wrap">
              <input
                id="masterVolumeRange"
                type="range"
                min={0}
                max={100}
                step={1}
                value={audio.masterVolume}
                aria-label="Master volume"
                className="audio-range"
                onChange={e => setMasterVolume(Number(e.target.value))}
              />
              <button
                type="button"
                className="tool"
                disabled={!effectiveActive}
                onClick={e => {
                  previewAudioCategory('master');
                  e.currentTarget.blur();
                }}
              >
                ▶ TEST
              </button>
            </div>
            <p className="audio-hint">
              Applies immediately to all synthesized Web Audio cues across both games.
            </p>
          </section>

          {/* Category Toggles */}
          <section className="audio-section">
            <span className="cap">Sound Effect Categories</span>
            <div className="audio-cat-list">
              {CATEGORY_META.map(cat => {
                const isOn = audio.categories[cat.key];
                return (
                  <div key={cat.key} className="audio-cat-item">
                    <div className="audio-cat-copy">
                      <strong>{cat.title}</strong>
                      <span>{cat.desc}</span>
                    </div>
                    <div className="audio-cat-controls">
                      <button
                        type="button"
                        className="tool audio-test-btn"
                        disabled={!effectiveActive || !isOn}
                        title={`Preview ${cat.title} sound`}
                        onClick={e => {
                          previewAudioCategory(cat.key);
                          e.currentTarget.blur();
                        }}
                      >
                        ♪
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`Toggle ${cat.title} sound effects`}
                        className={`audio-switch mono${isOn ? ' on' : ''}`}
                        onClick={() => setCategoryEnabled(cat.key, !isOn)}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gameplay & Display Controls */}
          <section className="audio-section">
            <span className="cap">Gameplay &amp; Display</span>
            <div className="audio-cat-list">
              <div className="audio-cat-item">
                <div className="audio-cat-copy">
                  <strong>Architectural Drafting Grid</strong>
                  <span>
                    Subtle hairline paper grid across the workspace and arenas for crisp drafting-board
                    depth.
                  </span>
                </div>
                <div className="audio-cat-controls">
                  <button
                    id="toggleDraftingGrid"
                    type="button"
                    role="switch"
                    aria-checked={prefs.draftingGrid}
                    aria-label="Toggle Architectural Drafting Grid"
                    className={`audio-switch mono${prefs.draftingGrid ? ' on' : ''}`}
                    onClick={() => setDraftingGrid(!prefs.draftingGrid)}
                  >
                    {prefs.draftingGrid ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="audio-cat-item">
                <div className="audio-cat-copy">
                  <strong>Fast Restart on Game Over</strong>
                  <span>
                    Jump straight back into action by typing any letter (<kbd>A–Z</kbd>) or{' '}
                    <kbd>Space</kbd> on the Game Over screen, skipping overlay buttons.
                  </span>
                </div>
                <div className="audio-cat-controls">
                  <button
                    id="toggleFastRestart"
                    type="button"
                    role="switch"
                    aria-checked={prefs.fastRestart}
                    aria-label="Toggle Fast Restart on Game Over"
                    className={`audio-switch mono${prefs.fastRestart ? ' on' : ''}`}
                    onClick={() => setFastRestart(!prefs.fastRestart)}
                  >
                    {prefs.fastRestart ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="audio-section audio-foot-actions">
            <button
              type="button"
              className="tool"
              onClick={e => {
                resetAudioSettings();
                resetPreferences();
                previewAudioCategory('master');
                e.currentTarget.blur();
              }}
            >
              ↻ RESET DEFAULTS
            </button>
            <span className="cap dim">Saved automatically in browser storage</span>
          </section>
        </div>
      </aside>
    </>
  );
};
