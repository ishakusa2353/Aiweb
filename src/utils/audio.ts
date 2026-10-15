// Realistic Photostat / Photocopier Optical Scanner Sound Synthesizer using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Futuristic Cyber Quantum Radar & Matrix Telemetry Sound Synthesizer:
 * - Synchronized 3.5s multi-layer sound with quantum radar sweep pings (every 400ms)
 * - Micro cybernetic data telemetry blips matching the Matrix terminal stream
 * - Deep resonant sub-frequency hum and zero mechanical distortion
 */
export function playPhotostatScannerSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const totalDuration = 3.5;

    // Master Limiter / Compressor for clean, loud, punchy cyber audio
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-4, t);
    compressor.knee.setValueAtTime(6, t);
    compressor.ratio.setValueAtTime(3.5, t);
    compressor.attack.setValueAtTime(0.002, t);
    compressor.release.setValueAtTime(0.1, t);
    compressor.connect(ctx.destination);

    // 1. Deep Sub-Bass Quantum Resonance Hum
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, t);
    subOsc.frequency.linearRampToValueAtTime(145, t + 1.8);
    subOsc.frequency.linearRampToValueAtTime(90, t + totalDuration);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.38, t + 0.2);
    subGain.gain.setValueAtTime(0.38, t + totalDuration - 0.25);
    subGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    subOsc.connect(subGain);
    subGain.connect(compressor);
    subOsc.start(t);
    subOsc.stop(t + totalDuration);

    // 2. Continuous Cyber Harmonic Frequency Sweep (Optical Radar)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweepOsc.type = 'sawtooth';
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(450, t);
    sweepFilter.Q.setValueAtTime(3.5, t);

    sweepOsc.frequency.setValueAtTime(280, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(620, t + 1.7);
    sweepOsc.frequency.exponentialRampToValueAtTime(420, t + totalDuration);
    sweepFilter.frequency.exponentialRampToValueAtTime(950, t + 1.7);
    sweepFilter.frequency.exponentialRampToValueAtTime(500, t + totalDuration);

    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.linearRampToValueAtTime(0.28, t + 0.15);
    sweepGain.gain.setValueAtTime(0.28, t + totalDuration - 0.3);
    sweepGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(compressor);
    sweepOsc.start(t);
    sweepOsc.stop(t + totalDuration);

    // 3. Rhythmic Radar Sweep Pings (every ~450ms)
    const pingTimes = [0.05, 0.5, 0.95, 1.4, 1.85, 2.3, 2.75, 3.15];
    pingTimes.forEach((pt, idx) => {
      if (t + pt + 0.25 > t + totalDuration) return;
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      pingOsc.type = 'sine';
      const baseFreq = 880 + idx * 85;
      pingOsc.frequency.setValueAtTime(baseFreq, t + pt);
      pingOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + pt + 0.12);

      pingGain.gain.setValueAtTime(0.18, t + pt);
      pingGain.gain.exponentialRampToValueAtTime(0.001, t + pt + 0.16);

      pingOsc.connect(pingGain);
      pingGain.connect(compressor);
      pingOsc.start(t + pt);
      pingOsc.stop(t + pt + 0.18);
    });

    // 4. Fast High-Tech Telemetry Data Chirps (Matrix typing simulation)
    const dataChirps = [0.2, 0.4, 0.7, 0.85, 1.1, 1.25, 1.6, 1.75, 2.05, 2.2, 2.5, 2.65, 2.95, 3.1];
    dataChirps.forEach((dt) => {
      const chirpOsc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirpOsc.type = 'triangle';
      chirpOsc.frequency.setValueAtTime(1400 + Math.random() * 800, t + dt);
      chirpGain.gain.setValueAtTime(0.09, t + dt);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.04);
      chirpOsc.connect(chirpGain);
      chirpGain.connect(compressor);
      chirpOsc.start(t + dt);
      chirpOsc.stop(t + dt + 0.05);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

export function playTradeLockedSound(isCall: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Powerful sci-fi lock confirmation sound
    const chords = isCall
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51] // High C-Major triumphant arpeggio
      : [880.00, 698.46, 554.37, 440.00, 329.63]; // Dramatic descending lock chord

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.22, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.4);
    });
  } catch (e) {
    console.warn('Audio lock error', e);
  }
}

export function playResultSound(isCall: boolean): void {
  playTradeLockedSound(isCall);
}

export function playRiskWarningSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Double warning buzzer beep
    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t + offset);
      osc.frequency.linearRampToValueAtTime(190, t + offset + 0.14);

      gain.gain.setValueAtTime(0.12, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.16);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

export function playDataInjectionSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Harmonic Quantum Chime: Rapid cyber data sync chords
    const chordFrequencies = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    chordFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.06 + 0.25);

      gain.gain.setValueAtTime(0.14, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.4);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

export const playScannerSound = playPhotostatScannerSound;
