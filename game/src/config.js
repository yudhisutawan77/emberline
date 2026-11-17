// Emberline tuning: every number the game plays by lives here, so a balance
// change is one edit, not a hunt through the code. The field is 960x640;
// the player fires every 0.16 s; the five enemy kinds and the boss each
// have their own speed, HP, score and colour; wave plans grow the counts
// and shrink the spawn gap as the waves climb to 10.
export const FIELD = { width: 960, height: 640 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberline-best';
export const FINAL_WAVE = 10;
export const START_LIVES = 3;
export const MAX_LIVES = 5;

export const PLAYER = {
  radius: 16,
  speed: 340,
  fireInterval: 0.16,
  bulletSpeed: 620,
  bulletRadius: 5,
  invulnerableSeconds: 2.0,
  bombStart: 1,
};

// Enemy kinds. Each one moves, scores and threatens differently, so a wave
// is never just "more of the same".
export const ENEMY = {
  drifter: { radius: 18, speed: 70, hp: 1, score: 50, color: '#ff5d8f' },
  weaver: { radius: 16, speed: 95, hp: 1, score: 80, color: '#c77dff' },
  splitter: { radius: 22, speed: 60, hp: 2, score: 120, color: '#ff9e00' },
  shardling: { radius: 11, speed: 150, hp: 1, score: 40, color: '#ffb703' },
  stinger: { radius: 17, speed: 55, hp: 2, score: 150, color: '#4cc9f0' },
  boss: { radius: 64, speed: 38, hp: 220, score: 5000, color: '#ff2e63' },
};

export const PICKUP = {
  spread: { color: '#4cc9f0', label: 'SPREAD' },
  shield: { color: '#80ed99', label: 'SHIELD' },
  life: { color: '#ff70a6', label: '+1 LIFE' },
  bomb: { color: '#ffd166', label: 'BOMB' },
};

// How a wave is built: how many of each kind, how fast they arrive, and
// whether the wave ends with the boss. Difficulty grows with the wave.
export function wavePlan(wave) {
  const n = (base, per) => Math.round(base + per * (wave - 1));
  if (wave === FINAL_WAVE) {
    return { drifters: 6, weavers: 6, splitters: 4, stingers: 4, boss: true, spawnGap: 0.85 };
  }
  return {
    drifters: n(5, 2),
    weavers: wave >= 2 ? n(2, 1.5) : 0,
    splitters: wave >= 3 ? n(1, 1) : 0,
    stingers: wave >= 4 ? n(1, 1) : 0,
    boss: false,
    spawnGap: Math.max(0.45, 1.15 - wave * 0.07),
  };
}

// The palette: deep night, ember orange, aurora cyan, void magenta.
export const PALETTE = {
  skyTop: '#0b0620',
  skyBottom: '#1b0f38',
  horizon: '#ff7b2f',
  ember: '#ffb703',
  cyan: '#4cc9f0',
  magenta: '#ff5d8f',
  violet: '#c77dff',
  white: '#f8f7ff',
  dim: '#8d86b8',
};
