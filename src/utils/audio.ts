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
 * Soft Futuristic Laser Scanner Sound Synthesizer:
 * - Smooth, gentle optical laser frequency sweep
 * - Soft sub-harmonic ambient glow
 * - ZERO mechanical ticks or 'put-put' click noises
 */
export function playPhotostatScannerSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const totalDuration = 3.6; // 3.6s matching the laser animation

    // 1. Primary Soft Laser Sweeper (Pure sine wave, smoothly sweeping optical frequency)
    const laserOsc = ctx.createOscillator();
    const laserGain = ctx.createGain();
    const laserFilter = ctx.createBiquadFilter();

    laserOsc.type = 'sine';
    laserFilter.type = 'lowpass';
    laserFilter.frequency.setValueAtTime(650, t);
    laserFilter.Q.setValueAtTime(1.8, t);

    // Laser frequency smoothly glides down then returns like an optical beam sweep
    laserOsc.frequency.setValueAtTime(260, t);
    laserOsc.frequency.exponentialRampToValueAtTime(390, t + 1.8);
    laserOsc.frequency.exponentialRampToValueAtTime(280, t + 3.2);
    laserOsc.frequency.exponentialRampToValueAtTime(220, t + totalDuration);

    // Gentle, soft gain envelope (no sudden spikes, no clicks)
    laserGain.gain.setValueAtTime(0.0001, t);
    laserGain.gain.linearRampToValueAtTime(0.045, t + 0.3);
    laserGain.gain.setValueAtTime(0.045, t + totalDuration - 0.4);
    laserGain.gain.linearRampToValueAtTime(0.0001, t + totalDuration);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(ctx.destination);

    laserOsc.start(t);
    laserOsc.stop(t + totalDuration);

    // 2. Soft Ambient Resonance Layer (Warm, subtle undertone)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.linearRampToValueAtTime(195, t + 1.8);
    subOsc.frequency.linearRampToValueAtTime(150, t + totalDuration);

    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.linearRampToValueAtTime(0.025, t + 0.4);
    subGain.gain.setValueAtTime(0.025, t + totalDuration - 0.3);
    subGain.gain.linearRampToValueAtTime(0.0001, t + totalDuration);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + totalDuration);
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

export function playResultSound(isCall: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const notes = isCall
      ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (Ascending arpeggio)
      : [783.99, 587.33, 440.00, 329.63]; // G5, D5, A4, E4 (Descending arpeggio)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      gain.gain.setValueAtTime(0.16, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.3);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
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

export const playScannerSound = playPhotostatScannerSound;
