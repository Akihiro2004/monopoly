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

  // Soft Ambient Jazz / Lo-fi BGM loop
  public startBGM() {
    if (this.bgmPlaying) return;
    this.initContext();
    if (!this.ctx || !this.bgmGain) return;
    this.bgmPlaying = true;

    // Jazz progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    const chords = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [164.81, 196.0, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
      [146.83, 174.61, 220.0, 261.63], // Dm7 (D3, F3, A3, C4)
      [130.81, 164.81, 196.0, 246.94]  // Cmaj7 (C3, E3, G3, B3)
    ];

    let step = 0;
    const playNextChord = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;
      const chord = chords[step % chords.length];
      const now = this.ctx.currentTime;
      const duration = 2.4;

      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Soft gentle attack & decay
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04 - i * 0.006, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain!);

        osc.start(now);
        osc.stop(now + duration);
      });

      step++;
      this.bgmTimer = setTimeout(playNextChord, 2200);
    };

    playNextChord();
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
