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
 * Replicates a photostat/photocopier carriage scanner:
 * - Mechanical motor hum
 * - Optical stepper carriage gear sweep (Downwards -> Upwards -> Settle)
 * - Optical sensor hum with pulse clicks
 */
export function playPhotostatScannerSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const totalDuration = 3.6; // 3.6s matching the laser animation

    // 1. Photostat Stepper Motor (Low mechanical buzz)
    const motorOsc = ctx.createOscillator();
    const motorGain = ctx.createGain();
    const motorFilter = ctx.createBiquadFilter();

    motorOsc.type = 'sawtooth';
    motorFilter.type = 'bandpass';
    motorFilter.frequency.setValueAtTime(140, t);
    motorFilter.Q.setValueAtTime(3.5, t);

    // Motor sweeps down then up like a photocopier lamp carriage
    motorOsc.frequency.setValueAtTime(120, t);
    motorOsc.frequency.linearRampToValueAtTime(185, t + 1.6); // Carriage down
    motorOsc.frequency.linearRampToValueAtTime(220, t + 3.0); // Carriage back up
    motorOsc.frequency.linearRampToValueAtTime(110, t + totalDuration); // Settle

    motorGain.gain.setValueAtTime(0.01, t);
    motorGain.gain.linearRampToValueAtTime(0.09, t + 0.15);
    motorGain.gain.setValueAtTime(0.09, t + totalDuration - 0.2);
    motorGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    motorOsc.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(ctx.destination);

    motorOsc.start(t);
    motorOsc.stop(t + totalDuration);

    // 2. Optical Lamp Hum (High-voltage xenon / LED tube hum)
    const lampOsc = ctx.createOscillator();
    const lampGain = ctx.createGain();
    lampOsc.type = 'sine';
    lampOsc.frequency.setValueAtTime(440, t);
    lampOsc.frequency.linearRampToValueAtTime(520, t + 1.6);
    lampOsc.frequency.linearRampToValueAtTime(460, t + 3.0);

    lampGain.gain.setValueAtTime(0.001, t);
    lampGain.gain.linearRampToValueAtTime(0.05, t + 0.2);
    lampGain.gain.linearRampToValueAtTime(0.05, t + totalDuration - 0.3);
    lampGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    lampOsc.connect(lampGain);
    lampGain.connect(ctx.destination);
    lampOsc.start(t);
    lampOsc.stop(t + totalDuration);

    // 3. Photocopier Carriage Gear Ticks (Rhythmic pulse clicks as carriage moves)
    const tickTimes = [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9, 3.2];
    tickTimes.forEach((d, idx) => {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      const freq = idx < 5 ? 750 + idx * 30 : 900 - (idx - 5) * 35;
      clickOsc.frequency.setValueAtTime(freq, t + d);

      clickGain.gain.setValueAtTime(0.06, t + d);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.05);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);

      clickOsc.start(t + d);
      clickOsc.stop(t + d + 0.06);
    });
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
