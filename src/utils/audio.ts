// Authentic Cyber Radar Scanner Sound Synthesizer using Web Audio API
// Matched to the high-tech video radar sweep: deep sub-harmonic rotation hum, periodic sonar pings, and telemetry chirps

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
 * Tactical Radar Scanner Sound Synthesizer:
 * - Authentic futuristic tactical radar / cyber electronic sonar sweep matching video
 * - Deep resonant sub-harmonic sweep (60Hz -> 85Hz)
 * - Rhythmic high-tech sonar pings (1850Hz -> 820Hz)
 * - Micro telemetry chirps & frequency modulation
 * - Master compression for crystal-clear, loud, non-clipping sci-fi sound
 */
export function playTacticalRadarScannerSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const totalDuration = 3.6;

    // Master Dynamics Compressor / Limiter
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-8, t);
    compressor.knee.setValueAtTime(6, t);
    compressor.ratio.setValueAtTime(4, t);
    compressor.attack.setValueAtTime(0.002, t);
    compressor.release.setValueAtTime(0.1, t);
    compressor.connect(ctx.destination);

    // 1. Deep Sub-Harmonic Radar Rotation Drone (Base foundation)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(58, t);
    subOsc.frequency.exponentialRampToValueAtTime(74, t + 1.8);
    subOsc.frequency.exponentialRampToValueAtTime(52, t + totalDuration);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.32, t + 0.2);
    subGain.gain.setValueAtTime(0.32, t + totalDuration - 0.25);
    subGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    subOsc.connect(subGain);
    subGain.connect(compressor);
    subOsc.start(t);
    subOsc.stop(t + totalDuration);

    // 2. Conical Radar Sweeping Beam (Frequency-modulated cyber sweep)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();

    sweepOsc.type = 'sawtooth';
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(680, t);
    sweepFilter.Q.setValueAtTime(4.5, t);

    // Sweep modulation: frequency ramps up and oscillates like a rotating beam
    sweepOsc.frequency.setValueAtTime(260, t);
    sweepOsc.frequency.linearRampToValueAtTime(420, t + 0.9);
    sweepOsc.frequency.linearRampToValueAtTime(310, t + 1.8);
    sweepOsc.frequency.linearRampToValueAtTime(460, t + 2.7);
    sweepOsc.frequency.linearRampToValueAtTime(280, t + totalDuration);

    sweepFilter.frequency.linearRampToValueAtTime(1100, t + 1.2);
    sweepFilter.frequency.linearRampToValueAtTime(750, t + 2.2);
    sweepFilter.frequency.linearRampToValueAtTime(1200, t + 3.0);

    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.linearRampToValueAtTime(0.26, t + 0.15);
    sweepGain.gain.setValueAtTime(0.26, t + totalDuration - 0.2);
    sweepGain.gain.linearRampToValueAtTime(0.001, t + totalDuration);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(compressor);
    sweepOsc.start(t);
    sweepOsc.stop(t + totalDuration);

    // 3. Periodic High-Tech Sonar Radar Pings (At 0.1s, 0.95s, 1.85s, 2.75s)
    const pingTimes = [0.1, 0.95, 1.85, 2.75];
    pingTimes.forEach((pt, idx) => {
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      const startFreq = 1600 + idx * 120;
      const endFreq = 720 + idx * 60;

      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime(startFreq, t + pt);
      pingOsc.frequency.exponentialRampToValueAtTime(endFreq, t + pt + 0.28);

      pingGain.gain.setValueAtTime(0.001, t + pt);
      pingGain.gain.linearRampToValueAtTime(0.42, t + pt + 0.02);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, t + pt + 0.38);

      pingOsc.connect(pingGain);
      pingGain.connect(compressor);
      pingOsc.start(t + pt);
      pingOsc.stop(t + pt + 0.4);

      // Micro digital telemetry chirp
      const chirpOsc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirpOsc.type = 'triangle';
      chirpOsc.frequency.setValueAtTime(startFreq * 1.5, t + pt + 0.04);
      chirpOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.8, t + pt + 0.12);

      chirpGain.gain.setValueAtTime(0.001, t + pt + 0.04);
      chirpGain.gain.linearRampToValueAtTime(0.18, t + pt + 0.05);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, t + pt + 0.14);

      chirpOsc.connect(chirpGain);
      chirpGain.connect(compressor);
      chirpOsc.start(t + pt + 0.04);
      chirpOsc.stop(t + pt + 0.15);
    });

  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

// Backward-compatible aliases
export const playPhotostatScannerSound = playTacticalRadarScannerSound;
export const playScannerSound = playTacticalRadarScannerSound;

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

// Pre-cache voices and handle async voice loading across all browsers
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const loadVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) cachedVoices = v;
    } catch (e) {}
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * TradePilot Information-Based Sweet Voice System:
 * স্ক্রিপ্ট:
 * মার্কেট: ---
/**
 * Futuristic Market Analysis Sound Synthesizer:
 * Plays during the 2 - 2.5 second pause while AI analyzes market confluence
 */
export function playMarketAnalysisPulseSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 2.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.9);
    filter.frequency.exponentialRampToValueAtTime(600, t + 1.8);

    // Harmonic cyber frequencies
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(580, t + 0.6);
    osc.frequency.linearRampToValueAtTime(440, t + 1.2);
    osc.frequency.linearRampToValueAtTime(880, t + 1.8);
    osc.frequency.linearRampToValueAtTime(520, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.15);
    gain.gain.setValueAtTime(0.25, t + dur - 0.2);
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);

    // High-tech Sonar Chime Pings during the analysis pause
    [0.15, 0.85, 1.55].forEach((offset) => {
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.type = 'triangle';
      pOsc.frequency.setValueAtTime(1250, t + offset);
      pOsc.frequency.exponentialRampToValueAtTime(680, t + offset + 0.22);
      pGain.gain.setValueAtTime(0.18, t + offset);
      pGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.22);
      pOsc.connect(pGain);
      pGain.connect(ctx.destination);
      pOsc.start(t + offset);
      pOsc.stop(t + offset + 0.23);
    });
  } catch (e) {}
}

/**
 * Master Tactical Radar & Scanning Interface Soundscape:
 * 100% Web Audio Synthesizer, Perfectly Matched to the UI from start to finish:
 * - Sub-bass rotating radar resonance
 * - Frequency-swept conical laser sweep
 * - Real-time micro telemetry data packet chirps
 * - Deep harmonic cyber sonar analysis pings
 * - Ascending signal entry lock chime
 * - Zero voice glitches, 100% reliable on every device
 */
export function playScanSoundscape(totalDuration: number = 3.4): () => void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return () => {};
    const t = ctx.currentTime;
    const dur = totalDuration;

    // Master Limiter / Compressor for loud, clean, non-clipping audio
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, t);
    
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, t);
    compressor.knee.setValueAtTime(4, t);
    compressor.ratio.setValueAtTime(4, t);
    compressor.attack.setValueAtTime(0.002, t);
    compressor.release.setValueAtTime(0.1, t);
    
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    const activeNodes: (AudioNode & { stop?: (when?: number) => void })[] = [];

    // 1. Radar Rotary Drone (Continuous sub-bass humming that pulses with the spinning ring)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(54, t);
    subOsc.frequency.exponentialRampToValueAtTime(78, t + dur * 0.4);
    subOsc.frequency.exponentialRampToValueAtTime(48, t + dur);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.35, t + 0.15);
    subGain.gain.setValueAtTime(0.35, t + dur - 0.2);
    subGain.gain.linearRampToValueAtTime(0.001, t + dur);

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);
    subOsc.stop(t + dur);
    activeNodes.push(subOsc);

    // 2. Conical Laser Sweep (Resonant sweeping bandpass filter on warm sawtooth)
    const sweepOsc = ctx.createOscillator();
    const sweepFilter = ctx.createBiquadFilter();
    const sweepGain = ctx.createGain();

    sweepOsc.type = 'sawtooth';
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(580, t);
    sweepFilter.Q.setValueAtTime(5.0, t);

    // Multi-stage radar rotation sweep
    sweepOsc.frequency.setValueAtTime(220, t);
    sweepOsc.frequency.linearRampToValueAtTime(440, t + 0.8);
    sweepOsc.frequency.linearRampToValueAtTime(290, t + 1.6);
    sweepOsc.frequency.linearRampToValueAtTime(520, t + 2.4);
    sweepOsc.frequency.linearRampToValueAtTime(320, t + dur);

    sweepFilter.frequency.linearRampToValueAtTime(1200, t + 0.8);
    sweepFilter.frequency.linearRampToValueAtTime(650, t + 1.6);
    sweepFilter.frequency.linearRampToValueAtTime(1400, t + 2.4);
    sweepFilter.frequency.linearRampToValueAtTime(700, t + dur);

    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.linearRampToValueAtTime(0.24, t + 0.1);
    sweepGain.gain.setValueAtTime(0.24, t + dur - 0.15);
    sweepGain.gain.linearRampToValueAtTime(0.001, t + dur);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(masterGain);
    sweepOsc.start(t);
    sweepOsc.stop(t + dur);
    activeNodes.push(sweepOsc);

    // 3. Telemetry Click Chirps (Micro data packet arrivals for the 4 initial lines)
    const telemetryTimes = [0.05, 0.22, 0.45, 0.70];
    telemetryTimes.forEach((timeOffset, idx) => {
      const freq = 1400 + idx * 150;
      const tOsc = ctx.createOscillator();
      const tGain = ctx.createGain();
      tOsc.type = 'triangle';
      tOsc.frequency.setValueAtTime(freq, t + timeOffset);
      tOsc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + timeOffset + 0.08);

      tGain.gain.setValueAtTime(0.001, t + timeOffset);
      tGain.gain.linearRampToValueAtTime(0.22, t + timeOffset + 0.01);
      tGain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.09);

      tOsc.connect(tGain);
      tGain.connect(masterGain);
      tOsc.start(t + timeOffset);
      tOsc.stop(t + timeOffset + 0.1);
      activeNodes.push(tOsc);
    });

    // 4. Analysing Market Deep Sonar Pings & Resonant Chimes (At 1.0s, 1.45s, 1.9s, 2.35s)
    const analysisTimes = [1.0, 1.45, 1.9, 2.35];
    analysisTimes.forEach((timeOffset, idx) => {
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.type = 'sine';
      const startF = 1850 + idx * 100;
      const endF = 750 + idx * 40;
      pOsc.frequency.setValueAtTime(startF, t + timeOffset);
      pOsc.frequency.exponentialRampToValueAtTime(endF, t + timeOffset + 0.28);

      pGain.gain.setValueAtTime(0.001, t + timeOffset);
      pGain.gain.linearRampToValueAtTime(0.35, t + timeOffset + 0.02);
      pGain.gain.exponentialRampToValueAtTime(0.0001, t + timeOffset + 0.35);

      pOsc.connect(pGain);
      pGain.connect(masterGain);
      pOsc.start(t + timeOffset);
      pOsc.stop(t + timeOffset + 0.38);
      activeNodes.push(pOsc);

      // Micro computational chirp
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'triangle';
      cOsc.frequency.setValueAtTime(startF * 1.4, t + timeOffset + 0.03);
      cOsc.frequency.exponentialRampToValueAtTime(startF * 0.9, t + timeOffset + 0.12);
      cGain.gain.setValueAtTime(0.001, t + timeOffset + 0.03);
      cGain.gain.linearRampToValueAtTime(0.18, t + timeOffset + 0.04);
      cGain.gain.exponentialRampToValueAtTime(0.0001, t + timeOffset + 0.14);

      cOsc.connect(cGain);
      cGain.connect(masterGain);
      cOsc.start(t + timeOffset + 0.03);
      cOsc.stop(t + timeOffset + 0.15);
      activeNodes.push(cOsc);
    });

    // 5. Signal Lock & Entry Confirmation Chimes (At 2.7s - 3.0s)
    [2.7, 2.85, 3.0].forEach((timeOffset, idx) => {
      const lockOsc = ctx.createOscillator();
      const lockGain = ctx.createGain();
      lockOsc.type = 'sine';
      const lockFreq = [880, 1320, 1760][idx];
      lockOsc.frequency.setValueAtTime(lockFreq, t + timeOffset);

      lockGain.gain.setValueAtTime(0.001, t + timeOffset);
      lockGain.gain.linearRampToValueAtTime(0.28, t + timeOffset + 0.02);
      lockGain.gain.exponentialRampToValueAtTime(0.0001, t + timeOffset + 0.28);

      lockOsc.connect(lockGain);
      lockGain.connect(masterGain);
      lockOsc.start(t + timeOffset);
      lockOsc.stop(t + timeOffset + 0.3);
      activeNodes.push(lockOsc);
    });

    return () => {
      try {
        masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        setTimeout(() => {
          activeNodes.forEach(node => {
            try { if (node.stop) node.stop(); } catch(e){}
          });
        }, 60);
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}

/**
 * Backward-compatible wrapper running the 100% synchronized Web Audio soundscape
 * without any TTS voice errors or delays.
 */
export function speakScanTelemetry(
  _market: string,
  _durationStr: string,
  _direction: 'BUY' | 'SELL' | 'UP' | 'DOWN',
  callbacksOrComplete?: {
    onMarketAnnounced?: () => void;
    onAnalysisAnnounced?: () => void;
    onComplete?: () => void;
  } | (() => void)
): () => void {
  const callbacks = typeof callbacksOrComplete === 'function'
    ? { onComplete: callbacksOrComplete }
    : (callbacksOrComplete || {});

  const stopSound = playScanSoundscape(3.3);

  const t1 = setTimeout(() => {
    if (callbacks.onMarketAnnounced) callbacks.onMarketAnnounced();
  }, 950);

  const t2 = setTimeout(() => {
    if (callbacks.onAnalysisAnnounced) callbacks.onAnalysisAnnounced();
  }, 2600);

  const t3 = setTimeout(() => {
    if (callbacks.onComplete) callbacks.onComplete();
  }, 3300);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
    stopSound();
  };
}

export function stopSpeechSynthesis(): void {
  // Voice completely removed as requested
}
