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
 * Futuristic Laser Scanner Sound Synthesizer:
 * - High-impact, powerful and loud optical laser frequency sweep
 * - Deep sub-harmonic resonance & airy laser harmonics
 * - ZERO mechanical ticks or 'put-put' click noises
 */
export function playPhotostatScannerSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const totalDuration = 3.6; // 3.6s matching the laser animation

    // Master Limiter / Compressor to allow rich, loud audio without digital clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, t);
    compressor.knee.setValueAtTime(8, t);
    compressor.ratio.setValueAtTime(4, t);
    compressor.attack.setValueAtTime(0.005, t);
    compressor.release.setValueAtTime(0.15, t);
    compressor.connect(ctx.destination);

    // 1. Primary Powerful Laser Sweeper
    const laserOsc = ctx.createOscillator();
    const laserGain = ctx.createGain();
    const laserFilter = ctx.createBiquadFilter();

    laserOsc.type = 'sine';
    laserFilter.type = 'lowpass';
    laserFilter.frequency.setValueAtTime(850, t);
    laserFilter.Q.setValueAtTime(2.2, t);

    // Laser frequency sweep
    laserOsc.frequency.setValueAtTime(280, t);
    laserOsc.frequency.exponentialRampToValueAtTime(440, t + 1.8);
    laserOsc.frequency.exponentialRampToValueAtTime(320, t + 3.2);
    laserOsc.frequency.exponentialRampToValueAtTime(240, t + totalDuration);

    // Strong, loud gain envelope (Noticeably louder as requested)
    laserGain.gain.setValueAtTime(0.001, t);
    laserGain.gain.linearRampToValueAtTime(0.26, t + 0.25);
    laserGain.gain.setValueAtTime(0.26, t + totalDuration - 0.35);
    laserGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(compressor);

    laserOsc.start(t);
    laserOsc.stop(t + totalDuration);

    // 2. Sub Ambient Resonance Layer (Deep power undertone)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.linearRampToValueAtTime(185, t + 1.8);
    subOsc.frequency.linearRampToValueAtTime(130, t + totalDuration);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.15, t + 0.3);
    subGain.gain.setValueAtTime(0.15, t + totalDuration - 0.25);
    subGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    subOsc.connect(subGain);
    subGain.connect(compressor);

    subOsc.start(t);
    subOsc.stop(t + totalDuration);

    // 3. Cyber Harmonic Sheen Layer (High optical shimmer)
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(560, t);
    shimmerOsc.frequency.exponentialRampToValueAtTime(880, t + 1.8);
    shimmerOsc.frequency.exponentialRampToValueAtTime(480, t + totalDuration);

    shimmerGain.gain.setValueAtTime(0.001, t);
    shimmerGain.gain.linearRampToValueAtTime(0.08, t + 0.35);
    shimmerGain.gain.setValueAtTime(0.08, t + totalDuration - 0.35);
    shimmerGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(compressor);

    shimmerOsc.start(t);
    shimmerOsc.stop(t + totalDuration);
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
