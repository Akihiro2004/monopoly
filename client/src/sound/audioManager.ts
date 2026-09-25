// Procedural Web Audio API sound synthesizer for 3D Monopoly
// Zero external asset dependencies, zero network latency, 100% offline reliable.

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private muted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTimer: any = null;
  private listeners: Array<(muted: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monopoly_muted');
      this.muted = saved === 'true';
    }
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.masterGain);

    if (!this.muted && !this.bgmPlaying) {
      this.startBGM();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public subscribe(cb: (muted: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public toggleMute(): boolean {
    this.initContext();
    this.muted = !this.muted;
    localStorage.setItem('monopoly_muted', String(this.muted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    this.listeners.forEach((l) => l(this.muted));
    if (!this.muted && !this.bgmPlaying) {
      this.startBGM();
    }
    return this.muted;
  }

  // Tactile UI button click
  public playClick() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (_) {}
  }

  // Wooden token step/hop
  public playStep() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (_) {}
  }

  // Dice roll / rattling
  public playDiceRoll() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;

      // Rapid wooden rattles over 0.7s
      for (let i = 0; i < 7; i++) {
        const time = now + i * 0.09 + Math.random() * 0.03;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(160 + Math.random() * 80, time);
        osc.frequency.exponentialRampToValueAtTime(60, time + 0.05);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.05);
      }
    } catch (_) {}
  }

  // Property bought chime
  public playBuy() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (_) {}
  }

  // Turn start alert chime
  public playTurnAlert() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;
      const notes = [440, 554.37]; // A4, C#5

      notes.forEach((freq, idx) => {
        const t = now + idx * 0.12;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (_) {}
  }

  // ---- Generic synth helpers for UI/game SFX ----

  private tone(
    freq: number,
    opts: {
      type?: OscillatorType;
      at?: number;
      dur?: number;
      vol?: number;
      slideTo?: number;
    } = {}
  ) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const { type = 'sine', at = 0, dur = 0.25, vol = 0.2, slideTo } = opts;
      const now = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch (_) {}
  }

  private noiseBurst(
    at = 0,
    dur = 0.1,
    vol = 0.2,
    filterFreq = 1000,
    filterType: BiquadFilterType = 'lowpass'
  ) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime + at;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + dur + 0.02);
    } catch (_) {}
  }

  // Modal / offer popup chime
  public playModal() {
    this.tone(660, { vol: 0.22, dur: 0.22 });
    this.tone(880, { at: 0.09, vol: 0.22, dur: 0.28 });
  }

  // Urgent force-buy alarm
  public playForceBuyAlarm() {
    this.tone(880, { type: 'square', vol: 0.12, dur: 0.11 });
    this.tone(880, { type: 'square', at: 0.14, vol: 0.12, dur: 0.11 });
    this.tone(1174.66, { type: 'square', at: 0.28, vol: 0.12, dur: 0.2 });
  }

  // Chance / chest card sparkle
  public playCardDraw() {
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((f, i) => this.tone(f, { at: i * 0.055, vol: 0.15, dur: 0.3 }));
  }

  // Debt warning (low double tone)
  public playDebtAlarm() {
    this.tone(220, { type: 'triangle', vol: 0.28, dur: 0.35 });
    this.tone(174.61, { type: 'triangle', at: 0.18, vol: 0.28, dur: 0.45 });
  }

  // Bankruptcy dirge (descending)
  public playBankrupt() {
    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((f, i) => this.tone(f, { at: i * 0.15, vol: 0.24, dur: 0.5 }));
  }

  // Victory fanfare
  public playVictory() {
    const seq: Array<[number, number]> = [
      [523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36],
      [783.99, 0.54], [1046.5, 0.66]
    ];
    seq.forEach(([f, at]) => this.tone(f, { type: 'triangle', at, vol: 0.26, dur: 0.5 }));
    this.tone(2093.0, { at: 0.66, vol: 0.1, dur: 0.6 });
  }

  // Incoming chat pop (soft)
  public playChat() {
    this.tone(990, { vol: 0.12, dur: 0.07, slideTo: 1320 });
  }

  // Error buzz
  public playError() {
    this.tone(160, { type: 'sawtooth', vol: 0.16, dur: 0.2, slideTo: 110 });
  }

  // Coin cascade (payment success)
  public playCoin() {
    this.tone(987.77, { vol: 0.18, dur: 0.25 });
    this.tone(1318.5, { at: 0.08, vol: 0.18, dur: 0.45 });
  }

  // Hammer thud + rising tone (building upgrade)
  public playBuild() {
    this.noiseBurst(0, 0.09, 0.25, 500);
    this.tone(330, { type: 'triangle', at: 0.05, vol: 0.2, dur: 0.3, slideTo: 495 });
  }

  // Coin drop (building sold)
  public playSell() {
    this.tone(1318.5, { vol: 0.16, dur: 0.2 });
    this.tone(987.77, { at: 0.08, vol: 0.16, dur: 0.35 });
  }

  // Subtle tick for info toasts
  public playTick() {
    this.tone(1200, { vol: 0.06, dur: 0.05 });
  }

  // Cheerful folk BGM loop (family game night): pentatonic melody over
  // ukulele-style strums, soft bass, shaker + tambourine. 8 bars, loops.
  public startBGM() {
    if (this.bgmPlaying) return;
    this.initContext();
    if (!this.ctx || !this.bgmGain) return;
    this.bgmPlaying = true;

    const BPM = 112;
    const BEAT = 60 / BPM;

    const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

    // [midi note, beats] — 8 bars x 4 beats = 32 beats total
    const melody: Array<[number, number]> = [
      [64, 0.5], [67, 0.5], [72, 1], [67, 0.5], [69, 0.5], [67, 1], // Bar 1 (C)
      [69, 0.5], [72, 0.5], [74, 1], [72, 0.5], [69, 0.5], [65, 1], // Bar 2 (F)
      [76, 1], [74, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [67, 1], // Bar 3 (C)
      [74, 1], [71, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [74, 1], // Bar 4 (G)
      [64, 0.5], [67, 0.5], [72, 1], [76, 1], [74, 0.5], [72, 0.5], // Bar 5 (C)
      [69, 1], [67, 0.5], [69, 0.5], [72, 1], [69, 1], // Bar 6 (F)
      [71, 0.5], [74, 0.5], [79, 1], [74, 0.5], [71, 0.5], [67, 1], // Bar 7 (G)
      [72, 1.5], [67, 0.5], [64, 1], [60, 1] // Bar 8 (C, resolve)
    ];

    // One chord per bar: bass root/fifth + strum tones (all MIDI)
    const bars = [
      { bass: [48, 55], tones: [60, 64, 67] }, // C
      { bass: [53, 60], tones: [57, 60, 65] }, // F
      { bass: [48, 55], tones: [60, 64, 67] }, // C
      { bass: [55, 62], tones: [55, 59, 62] }, // G
      { bass: [48, 55], tones: [60, 64, 67] }, // C
      { bass: [53, 60], tones: [57, 60, 65] }, // F
      { bass: [55, 62], tones: [55, 59, 62] }, // G
      { bass: [48, 55], tones: [60, 64, 67] } // C
    ];

    // Absolute beat position of every melody note (precomputed once)
    const melodyEvents: Array<{ beat: number; midi: number }> = [];
    let cursor = 0;
    for (const [m, d] of melody) {
      melodyEvents.push({ beat: cursor, midi: m });
      cursor += d;
    }

    const ctx = this.ctx;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

    // Plucky lead / strum voice
    const pluck = (freq: number, t: number, vol: number, dur = 0.45) => {
      if (!this.ctx || !this.bgmGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    };

    // Soft round bass voice
    const bassNote = (freq: number, t: number, vol = 0.24) => {
      if (!this.ctx || !this.bgmGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + 0.65);
    };

    // Short filtered noise tick (shaker / tambourine)
    const tick = (t: number, vol: number, filterFreq: number) => {
      if (!this.ctx || !this.bgmGain) return;
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      src.start(t);
      src.stop(t + 0.1);
    };

    const humanize = () => (Math.random() - 0.5) * 0.016;
    let bar = 0;

    const scheduleBar = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;
      const barStartBeat = bar * 4;
      const t0 = this.ctx.currentTime + 0.08;

      // Melody notes starting inside this bar
      for (const ev of melodyEvents) {
        if (ev.beat >= barStartBeat && ev.beat < barStartBeat + 4) {
          const t = t0 + (ev.beat - barStartBeat) * BEAT + humanize();
          pluck(midi(ev.midi), t, 0.15 + Math.random() * 0.04);
        }
      }

      // Boom-chick accompaniment: bass root, strum, bass fifth, strum
      const chord = bars[bar];
      const at = (beats: number) => t0 + beats * BEAT + humanize();
      bassNote(midi(chord.bass[0]), at(0));
      chord.tones.forEach((tone, i) => pluck(midi(tone), at(1) + i * 0.03, 0.055));
      bassNote(midi(chord.bass[1]), at(2));
      chord.tones.forEach((tone, i) => pluck(midi(tone), at(3) + i * 0.03, 0.05));

      // Shaker 8ths + tambourine on 2 & 4
      for (let s = 0; s < 8; s++) {
        tick(at(s * 0.5), s % 2 === 0 ? 0.028 : 0.02, 6500);
      }
      tick(at(1), 0.05, 8000);
      tick(at(3), 0.05, 8000);

      bar = (bar + 1) % bars.length;
      this.bgmTimer = setTimeout(scheduleBar, 4 * BEAT * 1000);
    };

    scheduleBar();
  }

  public stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audioManager = new AudioManager();
