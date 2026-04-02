import { Weather, TimeOfDay } from './types';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private birdGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private birdNode: AudioBufferSourceNode | null = null;
  private ambientNode: OscillatorNode | null = null;
  private initialized = false;
  private muted = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainGain.connect(this.masterGain);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      this.windGain.connect(this.masterGain);

      this.birdGain = this.ctx.createGain();
      this.birdGain.gain.value = 0;
      this.birdGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.15;
      this.ambientGain.connect(this.masterGain);

      this.startRainSound();
      this.startWindSound();
      this.startBirdSound();
      this.startAmbientDrone();

      this.initialized = true;
    } catch {
      // Audio not available
    }
  }

  private createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white * 0.5;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      } else {
        // brown noise
        b0 += white * 0.02;
        b0 *= 0.998;
        data[i] = b0 * 3.5;
      }
    }
    return buffer;
  }

  private startRainSound(): void {
    if (!this.ctx || !this.rainGain) return;
    const buffer = this.createNoiseBuffer(4, 'pink');
    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = buffer;
    this.rainNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    this.rainNode.connect(filter);
    filter.connect(this.rainGain);
    this.rainNode.start();
  }

  private startWindSound(): void {
    if (!this.ctx || !this.windGain) return;
    const buffer = this.createNoiseBuffer(6, 'brown');
    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = buffer;
    this.windNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.windNode.connect(filter);
    filter.connect(this.windGain);
    this.windNode.start();
  }

  private startBirdSound(): void {
    if (!this.ctx || !this.birdGain) return;
    // Create chirping sounds using oscillators
    const scheduleBird = () => {
      if (!this.ctx || !this.birdGain) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + Math.random() * 2000, now);
      osc.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 1500, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(2500 + Math.random() * 2000, now + 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);

      osc.connect(gain);
      gain.connect(this.birdGain!);
      osc.start(now);
      osc.stop(now + 0.25);

      setTimeout(scheduleBird, 2000 + Math.random() * 5000);
    };
    setTimeout(scheduleBird, 1000);
  }

  private startAmbientDrone(): void {
    if (!this.ctx || !this.ambientGain) return;
    // Gentle pad-like drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 130.81; // C3

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 196.00; // G3

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 261.63; // C4

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(this.ambientGain);

    osc1.start();
    osc2.start();
    osc3.start();
    this.ambientNode = osc1;
  }

  update(weather: Weather, timeOfDay: TimeOfDay): void {
    if (!this.initialized || this.muted) return;

    const rainTarget = weather === 'rain' ? 0.4 : 0;
    const windTarget = weather === 'wind' ? 0.3 : (weather === 'rain' ? 0.1 : 0.05);
    const birdTarget = (timeOfDay === 'morning' || timeOfDay === 'dawn') && weather !== 'rain' ? 0.5 : 0.1;
    const ambientTarget = timeOfDay === 'night' ? 0.2 : 0.1;

    if (this.rainGain) {
      this.rainGain.gain.value += (rainTarget - this.rainGain.gain.value) * 0.02;
    }
    if (this.windGain) {
      this.windGain.gain.value += (windTarget - this.windGain.gain.value) * 0.02;
    }
    if (this.birdGain) {
      this.birdGain.gain.value += (birdTarget - this.birdGain.gain.value) * 0.02;
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value += (ambientTarget - this.ambientGain.gain.value) * 0.02;
    }
  }

  playWaterSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playPlantSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Pleasant planting chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }

  playClickSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playDigSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Low noise + tone for digging
    const bufLen = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass'; bp.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(bp); bp.connect(g); g.connect(this.masterGain);
    src.start(now);
    // Add a low tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 120;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.1, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(og); og.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.1);
  }

  playWaterDropSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.2);
  }

  playGrowthChime(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine'; osc.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(g); g.connect(this.masterGain!);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
    });
  }

  /** Shift ambient drone frequency based on time of day */
  setAmbientTone(timeOfDay: TimeOfDay): void {
    if (!this.ctx || !this.ambientNode) return;
    const freqs: Record<TimeOfDay, number> = {
      dawn: 146.83,    // D3
      morning: 164.81,  // E3
      noon: 196.00,     // G3
      evening: 146.83,  // D3
      night: 110.00,    // A2
    };
    const target = freqs[timeOfDay] || 130.81;
    this.ambientNode.frequency.setTargetAtTime(target, this.ctx.currentTime, 2.0);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
