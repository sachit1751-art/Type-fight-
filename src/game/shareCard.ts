import { HudSnapshot } from './types';

export interface DefenseStatsSnapshot {
  score: number;
  wave: number;
  kills: number;
  acc: number;
  wpm: number;
  bestStreak: number;
  bestScore: number;
}

export function buildArcadeShareText(hud: HudSnapshot): string {
  return `HAIRLINE // TYPE ARCADE — Score ${hud.score.toLocaleString()} · Wave ${hud.wave} · ${hud.wpm} WPM · ${hud.acc}% Accuracy · Best Streak ×${hud.bestStreak}. #HairlineTyping #TypeArcade`;
}

export function buildDefenseShareText(stats: DefenseStatsSnapshot): string {
  return `HAIRLINE // TYPING DEFENSE — Score ${stats.score.toLocaleString()} · Wave ${stats.wave} · ${stats.wpm} WPM · ${stats.acc}% Accuracy · Best Combo ×${stats.bestStreak}. #TypingDefense #HairlineTyping`;
}

export function getTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getFacebookShareUrl(url: string, quote: string): string {
  const params = new URLSearchParams({ u: url, quote });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

function drawCardFrame(
  ctx: CanvasRenderingContext2D,
  size: number,
  dark: boolean
): { plate: string; hi: string; edge: string; mid: string; lo: string; accent: string } {
  const P = dark
    ? { plate: '#08090a', hi: '#d0d6e0', edge: '#5b5d64', mid: '#3e3e44', lo: '#29292d', accent: '#ff6369' }
    : { plate: '#ffffff', hi: '#232327', edge: '#a4a4ac', mid: '#c3c3c9', lo: '#e0e0e4', accent: '#e5484d' };

  ctx.fillStyle = P.plate;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = P.lo;
  for (let gx = 64; gx < size - 48; gx += 52) {
    for (let gy = 64; gy < size - 48; gy += 52) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, size - 96, size - 96);

  return P;
}

export function renderArcadeShareCardPng(hud: HudSnapshot, dark: boolean): string {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const P = drawCardFrame(ctx, size, dark);

  ctx.fillStyle = P.edge;
  ctx.font = '600 22px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText('HAIRLINE / TYPE ARCADE RUN SUMMARY', 88, 114);

  ctx.strokeStyle = P.lo;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(88, 142);
  ctx.lineTo(size - 88, 142);
  ctx.stroke();

  // Stick hero hairline badge
  ctx.strokeStyle = P.hi;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(148, 260, 22, 0, Math.PI * 2);
  ctx.moveTo(148, 282);
  ctx.lineTo(148, 344);
  ctx.moveTo(148, 304);
  ctx.lineTo(192, 294);
  ctx.lineTo(246, 294);
  ctx.moveTo(148, 344);
  ctx.lineTo(124, 396);
  ctx.moveTo(148, 344);
  ctx.lineTo(174, 396);
  ctx.stroke();

  ctx.fillStyle = P.hi;
  ctx.font = '800 112px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(hud.score.toLocaleString(), 290, 316);

  ctx.fillStyle = P.edge;
  ctx.font = '600 24px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText('FINAL SCORE', 294, 360);

  const stats = [
    { label: 'WAVE REACHED', value: `Wave ${hud.wave}` },
    { label: 'SPEED', value: `${hud.wpm} wpm` },
    { label: 'ACCURACY', value: `${hud.acc}%` },
    { label: 'BEST STREAK', value: `×${hud.bestStreak}` },
  ];

  const boxW = 436;
  const boxH = 128;
  stats.forEach((s, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 92 + col * (boxW + 24);
    const by = 480 + row * (boxH + 24);
    ctx.strokeStyle = P.edge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = P.edge;
    ctx.font = '600 18px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(s.label, bx + 24, by + 42);

    ctx.fillStyle = P.hi;
    ctx.font = '700 44px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(s.value, bx + 24, by + 98);
  });

  ctx.strokeStyle = P.lo;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(88, 860);
  ctx.lineTo(size - 88, 860);
  ctx.stroke();

  ctx.fillStyle = P.edge;
  ctx.font = '500 22px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(`ENEMIES DOWN: ${hud.kills}  ·  EVERY LETTER IS A BULLET`, 92, 924);

  return canvas.toDataURL('image/png');
}

export function renderDefenseShareCardPng(stats: DefenseStatsSnapshot, dark: boolean): string {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const P = drawCardFrame(ctx, size, dark);

  ctx.fillStyle = P.edge;
  ctx.font = '600 22px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText('HAIRLINE / TYPING DEFENSE SUMMARY', 88, 114);

  ctx.strokeStyle = P.lo;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(88, 142);
  ctx.lineTo(size - 88, 142);
  ctx.stroke();

  // Isometric keep hairline icon
  ctx.strokeStyle = P.hi;
  ctx.lineWidth = 2.6;
  ctx.strokeRect(108, 250, 96, 130);
  ctx.strokeRect(98, 226, 116, 24);
  ctx.beginPath();
  ctx.moveTo(156, 226);
  ctx.lineTo(156, 186);
  ctx.lineTo(188, 198);
  ctx.lineTo(156, 210);
  ctx.stroke();

  ctx.fillStyle = P.hi;
  ctx.font = '800 112px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(stats.score.toLocaleString(), 272, 316);

  ctx.fillStyle = P.edge;
  ctx.font = '600 24px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(`FINAL SCORE  ·  BEST ${stats.bestScore.toLocaleString()}`, 276, 360);

  const cells = [
    { label: 'WAVE HELD', value: `Wave ${stats.wave}` },
    { label: 'SPEED', value: `${stats.wpm} wpm` },
    { label: 'ACCURACY', value: `${stats.acc}%` },
    { label: 'BEST STREAK', value: `${stats.bestStreak}` },
  ];

  const boxW = 436;
  const boxH = 128;
  cells.forEach((s, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 92 + col * (boxW + 24);
    const by = 480 + row * (boxH + 24);
    ctx.strokeStyle = P.edge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = P.edge;
    ctx.font = '600 18px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(s.label, bx + 24, by + 42);

    ctx.fillStyle = P.hi;
    ctx.font = '700 44px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(s.value, bx + 24, by + 98);
  });

  ctx.strokeStyle = P.lo;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(88, 860);
  ctx.lineTo(size - 88, 860);
  ctx.stroke();

  ctx.fillStyle = P.edge;
  ctx.font = '500 22px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(`WALKERS DOWN: ${stats.kills}  ·  THE KEEP & THREE LANES`, 92, 924);

  return canvas.toDataURL('image/png');
}
