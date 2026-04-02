export class Audio {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.7;
    this.enabled = true;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  // Synthesize destruction sounds procedurally
  playDestroy(materialType, intensity = 1.0) {
    if (!this.enabled || !this.ctx) return;

    const sounds = {
      wood: () => this._playNoise(0.1, 200, 800, 0.3 * intensity),
      ice: () => this._playCrystal(800, 2000, 0.2, 0.25 * intensity),
      glass: () => this._playCrystal(1200, 4000, 0.15, 0.3 * intensity),
      metal: () => this._playMetal(150, 600, 0.4, 0.35 * intensity),
      concrete: () => this._playNoise(0.2, 80, 400, 0.4 * intensity),
      jelly: () => this._playBounce(300, 100, 0.15, 0.2 * intensity),
      sand: () => this._playNoise(0.05, 400, 2000, 0.15 * intensity),
    };

    const fn = sounds[materialType] || sounds.wood;
    fn();
  }

  playExplosion(intensity = 1.0) {
    if (!this.enabled || !this.ctx) return;
    this._playNoise(0.4 * intensity, 40, 300, 0.5);
    this._playSweep(200, 50, 0.3, 0.3 * intensity);
  }

  playChain(chainCount) {
    if (!this.enabled || !this.ctx) return;
    // Pitch rises with chain count for crescendo effect
    const baseFreq = 400 + chainCount * 100;
    const vol = Math.min(0.35, 0.2 + chainCount * 0.03);
    this._playTone(baseFreq, 0.18, vol, 'sine');
    this._playTone(baseFreq * 1.5, 0.12, vol * 0.6, 'triangle');
    // Add shimmer on longer chains
    if (chainCount >= 2) {
      this._playTone(baseFreq * 2, 0.08, vol * 0.3, 'sine');
    }
  }

  playPerfectChain() {
    if (!this.enabled || !this.ctx) return;
    // Major chord fanfare
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 0.2, 'sine'), i * 80);
    });
  }

  playTap() {
    if (!this.enabled || !this.ctx) return;
    this._playTone(600, 0.05, 0.15, 'sine');
  }

  playUIClick() {
    if (!this.enabled || !this.ctx) return;
    this._playTone(800, 0.03, 0.1, 'sine');
  }

  playToolSwitch() {
    if (!this.enabled || !this.ctx) return;
    this._playTone(1000, 0.04, 0.12, 'sine');
    setTimeout(() => this._playTone(1200, 0.03, 0.08, 'sine'), 30);
  }

  playSlowMoWhoosh() {
    if (!this.enabled || !this.ctx) return;
    this._playSweep(800, 200, 0.5, 0.2);
    this._playNoise(0.3, 100, 600, 0.1);
  }

  playLevelComplete() {
    if (!this.enabled || !this.ctx) return;
    // Ascending arpeggio: C5 E5 G5 C6 E6 G6
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.25, 0.2, 'sine'), i * 100);
    });
  }

  playBlockCrack(materialType, intensity = 1.0) {
    if (!this.enabled || !this.ctx) return;
    const matSounds = {
      wood: () => this._playNoise(0.08, 150, 600, 0.2 * intensity),
      ice: () => this._playCrystal(600, 1500, 0.12, 0.2 * intensity),
      glass: () => this._playCrystal(1500, 5000, 0.1, 0.25 * intensity),
      metal: () => this._playMetal(200, 800, 0.2, 0.25 * intensity),
      concrete: () => this._playNoise(0.12, 60, 300, 0.25 * intensity),
      jelly: () => this._playBounce(400, 150, 0.1, 0.15 * intensity),
      sand: () => this._playNoise(0.04, 300, 1500, 0.1 * intensity),
    };
    const fn = matSounds[materialType] || matSounds.wood;
    fn();
  }

  playStar() {
    if (!this.enabled || !this.ctx) return;
    this._playTone(880, 0.2, 0.2, 'sine');
    setTimeout(() => this._playTone(1100, 0.15, 0.15, 'sine'), 100);
  }

  _playTone(freq, duration, volume, type = 'sine') {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  _playNoise(duration, lowFreq, highFreq, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = (lowFreq + highFreq) / 2;
    bandpass.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  _playCrystal(freqStart, freqEnd, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration * 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  _playMetal(freqStart, freqEnd, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Two detuned oscillators for metallic quality
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqStart + detune, now);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration * 0.5);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  _playBounce(freqStart, freqEnd, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  _playSweep(freqStart, freqEnd, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Haptic feedback
  vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  vibrateImpact(intensity = 1.0) {
    this.vibrate(Math.round(30 * intensity));
  }

  vibrateChain() {
    this.vibrate([20, 30, 20, 30, 40]);
  }
}
