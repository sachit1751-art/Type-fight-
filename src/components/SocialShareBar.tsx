import React, { useState } from 'react';
import { getFacebookShareUrl, getTwitterShareUrl } from '../game/shareCard';

interface SocialShareBarProps {
  shareText: string;
  cardFilename: string;
  renderCardPng: () => string;
  compact?: boolean;
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  shareText,
  cardFilename,
  renderCardPng,
  compact = false,
}) => {
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://hairlinetyping.vercel.app/';
  const twitterHref = getTwitterShareUrl(shareText, shareUrl);
  const facebookHref = getFacebookShareUrl(shareUrl, shareText);

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(''), 3200);
  };

  const handleCopyText = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      flashStatus('Summary copied to clipboard');
    } catch {
      flashStatus('Copy ready — select text manually if blocked');
    }
  };

  const handleInstagramExport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const dataUrl = renderCardPng();
    if (!dataUrl) return;

    // Copy caption automatically so pasting into Instagram is effortless
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      /* ignore clipboard denial */
    }

    // Try native Web Share with PNG file on supported mobile/desktop browsers first
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], cardFilename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Hairline Result Card',
            text: shareText,
            files: [file],
          });
          flashStatus('Shared card & copied Instagram caption');
          return;
        }
      } catch {
        /* fallback to direct PNG download */
      }
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = cardFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCardPreviewUrl(dataUrl);
    flashStatus('1080×1080 Instagram card downloaded & caption copied');
  };

  return (
    <div className={`share-bar${compact ? ' compact' : ''}`}>
      <div className="share-head">
        <span className="cap">Share results</span>
        {statusMsg && <span className="share-status mono">{statusMsg}</span>}
      </div>

      <div className="share-actions">
        <a
          className="tool share-link"
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share results on Twitter / X"
        >
          𝕏 TWITTER
        </a>

        <a
          className="tool share-link"
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share results on Facebook"
        >
          f FACEBOOK
        </a>

        <button
          type="button"
          className="tool"
          onClick={handleInstagramExport}
          title="Download 1080×1080 card PNG and copy caption for Instagram"
        >
          ◎ INSTAGRAM CARD
        </button>

        <button
          type="button"
          className="tool"
          onClick={handleCopyText}
          title="Copy result summary to clipboard"
        >
          ⧉ COPY TEXT
        </button>
      </div>

      {cardPreviewUrl && !compact && (
        <div className="share-preview">
          <div className="share-preview-head">
            <span className="cap">Instagram 1080×1080 card ready</span>
            <button
              type="button"
              className="tool"
              onClick={() => setCardPreviewUrl(null)}
            >
              ✕ HIDE
            </button>
          </div>
          <img
            src={cardPreviewUrl}
            alt="Generated 1080 by 1080 Instagram result card"
            className="share-preview-img"
          />
        </div>
      )}
    </div>
  );
};
