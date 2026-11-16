// All sound is synthesized with WebAudio: no audio files, no network, and
// nothing to load. Every effect is a short oscillator/noise burst; the music
// is a quiet two-bar bass-and-pad loop that starts on the first input.
export function createAudio() {
  let context = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ctx.currentTime + dur);
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Audio is decoration: a failure must never break the game.
    }
  }

  function noise(dur, gain, lowpass) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const amp = ctx.createGain();
      amp.gain.value = gain;
      source.connect(filter).connect(amp).connect(ctx.destination);
      source.start();
    } catch {
      // Ignore audio failures.
    }
  }

  // A slow minor-key loop: root notes under a soft pad. Quiet on purpose.
  const BASS = [110, 98, 87.31, 130.81];
  function startMusic() {
    if (musicTimer || muted) return;
    const ctx = ensure();
    if (!ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const root = BASS[musicStep % BASS.length];
      tone(root, 0.9, 'triangle', 0.05);
      tone(root * 1.5, 0.9, 'sine', 0.03);
      musicStep += 1;
    }, 450);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (!muted) startMusic();
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.08, 'square', 0.04, 220);
    },
    explosion(big) {
      noise(big ? 0.5 : 0.25, big ? 0.25 : 0.14, big ? 900 : 1400);
      tone(big ? 90 : 140, big ? 0.4 : 0.2, 'sawtooth', 0.12, 40);
    },
    hit() {
      tone(200, 0.12, 'sawtooth', 0.1, 90);
    },
    pickup() {
      tone(660, 0.1, 'sine', 0.09);
      window.setTimeout(() => tone(990, 0.14, 'sine', 0.09), 70);
    },
    waveHorn() {
      tone(220, 0.35, 'triangle', 0.1, 440);
      window.setTimeout(() => tone(330, 0.35, 'triangle', 0.08), 120);
    },
    bossRoar() {
      tone(70, 0.8, 'sawtooth', 0.16, 45);
      noise(0.7, 0.18, 500);
    },
    victory() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.3, 'triangle', 0.1), i * 130);
      });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.35, 'triangle', 0.09), i * 160);
      });
    },
  };
}
