export type ArcadeGrade = 'S+' | 'S' | 'A' | 'B' | 'C';

export interface ArcadeRankResult {
  grade: ArcadeGrade;
  title: string;
  note: string;
  isTopTier: boolean;
}

export interface RunRecordFlags {
  isNewBestScore: boolean;
  isNewFastestWpm: boolean;
  isNewLifetimeAcc: boolean;
}

export function computeArcadeRank(input: {
  wpm: number;
  acc: number;
  wave: number;
  kills: number;
}): ArcadeRankResult {
  const wpm = Math.max(0, input.wpm);
  const acc = Math.max(0, Math.min(100, input.acc));
  const wave = Math.max(1, input.wave);
  const kills = Math.max(0, input.kills);

  // Composite score balancing precision, speed, and wave survival
  const speedPts = Math.min(60, wpm * 0.65);
  const accPts = Math.max(0, acc - 65) * 0.9;
  const wavePts = Math.min(25, (wave - 1) * 4.5 + Math.min(10, kills * 0.25));
  const index = speedPts + accPts + wavePts;

  if (kills >= 12 && wpm >= 62 && acc >= 96 && index >= 88) {
    return {
      grade: 'S+',
      title: 'Apex Marksman',
      note: `${wpm} wpm at ${acc}% precision`,
      isTopTier: true,
    };
  }
  if (kills >= 8 && wpm >= 48 && acc >= 92 && index >= 70) {
    return {
      grade: 'S',
      title: 'Sharp Line',
      note: `${wpm} wpm · ${acc}% accuracy`,
      isTopTier: true,
    };
  }
  if (kills >= 4 && wpm >= 34 && acc >= 85 && index >= 48) {
    return {
      grade: 'A',
      title: 'Steady Trigger',
      note: `${wpm} wpm · W${wave} reached`,
      isTopTier: false,
    };
  }
  if (kills >= 2 && index >= 26) {
    return {
      grade: 'B',
      title: 'Hold Fast',
      note: `${wpm} wpm · keep chaining clean words`,
      isTopTier: false,
    };
  }
  return {
    grade: 'C',
    title: 'Warm-Up Run',
    note: 'Chain two clean words for shield cover',
    isTopTier: false,
  };
}
