// TMpoly audio: procedural Web Audio sound effects + a streamed music track.

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted: boolean = false;
  private bgmPlaying: boolean = false;
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
    if (this.muted) {
      this.bgm?.pause();
      this.bgmPlaying = false;
    } else {
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

  // Background music: "Blueprints and Tea", streamed from a file and looped.
  // An <audio> element decodes in the browser's media pipeline (cheap, and it
  // streams: playback starts before the whole file is downloaded).
  private bgm: HTMLAudioElement | null = null;
  private static readonly BGM_URL = '/audio/blueprints-and-tea.mp3';
  private static readonly BGM_VOLUME = 0.35;

  private ensureBgm(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (!this.bgm) {
      const el = new Audio(AudioManager.BGM_URL);
      el.loop = true;
      el.preload = 'auto';
      el.volume = AudioManager.BGM_VOLUME;
      this.bgm = el;
      // Pause while the tab / app is in the background (battery, data).
      document.addEventListener('visibilitychange', () => {
        if (!this.bgm) return;
        if (document.hidden) this.bgm.pause();
        else if (this.bgmPlaying && !this.muted) this.bgm.play().catch(() => {});
      });
    }
    return this.bgm;
  }

  public startBGM() {
    if (this.muted) return;
    const el = this.ensureBgm();
    if (!el) return;
    this.bgmPlaying = true;
    // Browsers only allow audio after a user gesture; sounds are triggered
    // by clicks, so the first click starts the music.
    el.play().catch(() => {
      this.bgmPlaying = false;
    });
  }

  public stopBGM() {
    this.bgmPlaying = false;
    this.bgm?.pause();
  }
}

export const audioManager = new AudioManager();
