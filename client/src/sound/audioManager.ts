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
      this.stopBGM();
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

  // Background music: "Blueprints and Tea", looped seamlessly.
  //
  // The track starts with 0.5 s of silence + a short fade-in and ends with a
  // ~5 s fade-out + 2.4 s of silence, so a plain `loop` leaves ~3 s of dead
  // air. Two streamed <audio> elements take turns instead: shortly before
  // the fade-out the next one starts at the first note and they crossfade
  // (equal-power) through Web Audio gain nodes (element.volume is ignored on
  // iOS). Streaming keeps memory low: no 57 MB decoded buffer.
  private static readonly BGM_URL = '/audio/blueprints-and-tea.mp3';
  // 96 kbps encode (~1.9 MB vs ~3.9 MB) for phones, weak devices and data-saver.
  private static readonly BGM_URL_LIGHT = '/audio/blueprints-and-tea-mobile.mp3';

  private static bgmUrl(): string {
    try {
      const nav = navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
        deviceMemory?: number;
      };
      const light =
        window.matchMedia?.('(pointer: coarse)').matches ||
        nav.connection?.saveData === true ||
        /(^|-)2g$|^3g$/.test(nav.connection?.effectiveType ?? '') ||
        (nav.deviceMemory !== undefined && nav.deviceMemory <= 4);
      return light ? AudioManager.BGM_URL_LIGHT : AudioManager.BGM_URL;
    } catch {
      return AudioManager.BGM_URL;
    }
  }
  private static readonly BGM_VOLUME = 0.35;
  private static readonly BGM_START = 0.5; // skip the leading silence
  private static readonly BGM_TAIL = 5.6; // hand over this long before the end
  private static readonly BGM_FADE = 3; // crossfade length (s)

  private decks: { el: HTMLAudioElement; gain: GainNode | null }[] = [];
  private deckIdx = 0;
  private crossfading = false;
  private loopTimer: ReturnType<typeof setInterval> | null = null;

  private ensureDecks(): boolean {
    if (typeof Audio === 'undefined') return false;
    if (this.decks.length) return true;
    const url = AudioManager.bgmUrl();
    for (let i = 0; i < 2; i++) {
      const el = new Audio(url);
      el.preload = i === 0 ? 'auto' : 'metadata';
      let gain: GainNode | null = null;
      if (this.ctx && this.masterGain) {
        try {
          const src = this.ctx.createMediaElementSource(el);
          gain = this.ctx.createGain();
          gain.gain.value = 0;
          src.connect(gain);
          gain.connect(this.masterGain);
        } catch {
          gain = null;
        }
      }
      if (!gain) {
        // No Web Audio: a single element with a plain loop still works.
        el.loop = true;
        el.volume = AudioManager.BGM_VOLUME;
      }
      this.decks.push({ el, gain });
    }
    // Pause while the tab / app is in the background (battery, data).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseDecks();
      else if (this.bgmPlaying && !this.muted) this.resumeCurrent();
    });
    return true;
  }

  private fadeTo(gain: GainNode | null, value: number, seconds: number) {
    if (!gain || !this.ctx) return;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    // Sine-shaped curve ~ equal power: no dip in loudness mid-crossfade.
    const steps = 24;
    const from = gain.gain.value;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const k = i / (steps - 1);
      curve[i] = value > from ? from + (value - from) * Math.sin((k * Math.PI) / 2) : value + (from - value) * Math.cos((k * Math.PI) / 2);
    }
    gain.gain.setValueCurveAtTime(curve, now, Math.max(0.05, seconds));
  }

  private resumeCurrent() {
    const deck = this.decks[this.deckIdx];
    if (!deck) return;
    this.crossfading = false;
    this.decks.forEach((d, i) => {
      if (i !== this.deckIdx) {
        d.el.pause();
        if (d.gain) d.gain.gain.value = 0;
      }
    });
    deck.el.play().then(
      () => this.fadeTo(deck.gain, AudioManager.BGM_VOLUME, 0.6),
      () => {
        this.bgmPlaying = false;
      }
    );
  }

  private pauseDecks() {
    this.decks.forEach((d) => d.el.pause());
    this.crossfading = false;
  }

  // Checks (10x a second) whether it is time to hand over to the other deck.
  private watchLoop() {
    if (this.loopTimer) return;
    this.loopTimer = setInterval(() => {
      if (!this.bgmPlaying || this.crossfading || document.hidden) return;
      const cur = this.decks[this.deckIdx];
      if (!cur?.gain) return; // plain-loop fallback
      const dur = cur.el.duration;
      if (!isFinite(dur) || cur.el.paused) return;
      if (cur.el.currentTime < dur - AudioManager.BGM_TAIL) return;

      this.crossfading = true;
      const nextIdx = 1 - this.deckIdx;
      const next = this.decks[nextIdx];
      next.el.currentTime = AudioManager.BGM_START;
      next.el.play().then(
        () => {
          this.fadeTo(next.gain, AudioManager.BGM_VOLUME, AudioManager.BGM_FADE);
          this.fadeTo(cur.gain, 0, AudioManager.BGM_FADE);
          this.deckIdx = nextIdx;
          setTimeout(() => {
            cur.el.pause();
            this.crossfading = false;
          }, AudioManager.BGM_FADE * 1000 + 300);
        },
        () => {
          // Could not start the next deck: fall back to restarting this one.
          cur.el.currentTime = AudioManager.BGM_START;
          this.crossfading = false;
        }
      );
    }, 100);
  }

  public startBGM() {
    if (this.muted || this.bgmPlaying) return;
    if (!this.ctx) {
      // Creating the context starts the music itself (see initContext).
      this.initContext();
      if (this.ctx) return;
    }
    if (!this.ensureDecks()) return;
    this.bgmPlaying = true;
    const deck = this.decks[this.deckIdx];
    if (deck.el.currentTime < AudioManager.BGM_START) deck.el.currentTime = AudioManager.BGM_START;
    // Browsers only allow audio after a user gesture; sounds are triggered by
    // clicks, so the first click starts the music.
    this.resumeCurrent();
    this.watchLoop();
  }

  public stopBGM() {
    this.bgmPlaying = false;
    this.pauseDecks();
  }
}

export const audioManager = new AudioManager();
