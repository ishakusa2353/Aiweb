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
 * TradePilot Information-Based Sweet Voice System:
 * 1. Announces: মার্কেট: ---। সময়: ---। মার্কেট এনালাইসিস করছি...
 * 2. Pauses 2.2 seconds & plays futuristic market analysis sound
 * 3. Announces: নিশ্চিন্তে BUY/SELL ট্রেড নিতে পারেন!
 * 4. Finishes and immediately dispatches trade!
 */
export function speakScanTelemetry(
  market: string,
  durationStr: string,
  direction: 'BUY' | 'SELL' | 'UP' | 'DOWN',
  onComplete?: () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onComplete) onComplete();
    return () => {};
  }

  let completed = false;
  let pauseTimer: any = null;
  let ttsKeepAlive: any = null;

  const cleanupKeepAlive = () => {
    if (ttsKeepAlive) {
      clearInterval(ttsKeepAlive);
      ttsKeepAlive = null;
    }
  };

  const finish = () => {
    if (!completed) {
      completed = true;
      cleanupKeepAlive();
      if (pauseTimer) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      if (typeof window !== 'undefined') {
        (window as any).__ACTIVE_TTS__ = null;
      }
      if (onComplete) onComplete();
    }
  };

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const cleanMarket = market
      .replace(/[\/\-_]/g, ' ')
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let cleanDur = durationStr;
    if (/^\d+\s*S$/i.test(durationStr)) {
      cleanDur = durationStr.replace(/S/i, '').trim() + ' সেকেন্ড';
    } else if (/^\d+\s*M$/i.test(durationStr)) {
      cleanDur = durationStr.replace(/M/i, '').trim() + ' মিনিট';
    }

    const tradeAction = (direction === 'BUY' || direction === 'UP') ? 'BUY' : 'SELL';

    // Get latest voices
    let voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      try {
        voices = window.speechSynthesis.getVoices();
      } catch (e) {}
    }

    // NEVER use robotic default Bengali voice (avoid Desktop, default, eSpeak, harsh speech)
    // Manually select a sweet, enchanting, melodic female voice (মেয়ের মায়াবী কন্ঠ)
    const isRobotic = (name: string) => /desktop|espeak|offline|robotic/i.test(name);

    // 1. High-grade neural / natural female Bengali voice
    const bnFemaleVoice = voices.find(v =>
      v.lang.startsWith('bn') &&
      !isRobotic(v.name) &&
      (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Wavenet') || (v.name.includes('Google') && !v.name.includes('Desktop')))
    );

    // 2. High-grade sweet melodic female natural voices (Jenny, Sonia, Aria, Samantha, Google UK English Female, Victoria)
    const sweetFemaleVoice = voices.find(v =>
      !isRobotic(v.name) &&
      (v.name.includes('Google UK English Female') ||
       v.name.includes('Jenny') ||
       v.name.includes('Sonia') ||
       v.name.includes('Aria') ||
       v.name.includes('Samantha') ||
       v.name.includes('Victoria') ||
       v.name.includes('Karen') ||
       v.name.includes('Tessa') ||
       (v.name.includes('Female') && v.name.includes('Natural')))
    ) || voices.find(v => !isRobotic(v.name) && v.name.includes('Female'))
      || voices.find(v => !isRobotic(v.name) && v.name.includes('Natural'))
      || voices[0];

    const chosenVoice = bnFemaleVoice || sweetFemaleVoice;
    const hasRealBengali = !!bnFemaleVoice;

    // Phase 1: Market Announcement & Analysis Start
    const textPart1 = hasRealBengali
      ? `মার্কেট এনালাইসিস করছি`
      : `Market analysis korchi`;
    const utt1 = new SpeechSynthesisUtterance(textPart1);

    if (chosenVoice) {
      utt1.voice = chosenVoice;
      utt1.lang = hasRealBengali ? (chosenVoice.lang || 'bn-BD') : (chosenVoice.lang || 'en-US');
    } else {
      utt1.lang = 'en-US';
    }
    utt1.rate = 1.05;
    utt1.pitch = 1.25;
    utt1.volume = 1.0;

    // Phase 2: Decision Announcement
    const textPart2 = hasRealBengali
      ? `নিশ্চিন্তে ${tradeAction} ট্রেড নিতে পারেন!`
      : `Nischinte ${tradeAction} trade nite paren!`;
    const utt2 = new SpeechSynthesisUtterance(textPart2);
    if (chosenVoice) {
      utt2.voice = chosenVoice;
      utt2.lang = hasRealBengali ? (chosenVoice.lang || 'bn-BD') : (chosenVoice.lang || 'en-US');
    } else {
      utt2.lang = 'en-US';
    }
    utt2.rate = 1.05;
    utt2.pitch = 1.25;
    utt2.volume = 1.0;

    utt1.onend = () => {
      // 2.2-Second Analysis Wait + Analysis Sound Effect
      playMarketAnalysisPulseSound();
      pauseTimer = setTimeout(() => {
        if (completed) return;
        (window as any).__ACTIVE_TTS__ = utt2;
        window.speechSynthesis.speak(utt2);
      }, 2200);
    };

    utt1.onerror = () => {
      // Fallback if Bengali failed on device: retry with phonetic sweet voice
      playMarketAnalysisPulseSound();
      pauseTimer = setTimeout(() => {
        if (completed) return;
        const fallbackUtt2 = new SpeechSynthesisUtterance(`Nischinte ${tradeAction} trade nite paren!`);
        if (sweetFemaleVoice) fallbackUtt2.voice = sweetFemaleVoice;
        fallbackUtt2.lang = (sweetFemaleVoice && sweetFemaleVoice.lang) || 'en-US';
        fallbackUtt2.pitch = 1.25;
        fallbackUtt2.rate = 1.05;
        fallbackUtt2.onend = finish;
        fallbackUtt2.onerror = finish;
        (window as any).__ACTIVE_TTS__ = fallbackUtt2;
        window.speechSynthesis.speak(fallbackUtt2);
      }, 2200);
    };

    utt2.onend = () => {
      finish();
    };

    utt2.onerror = () => {
      finish();
    };

    // Keepalive to prevent Chrome from pausing TTS
    ttsKeepAlive = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking && !completed) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else if (completed) {
          cleanupKeepAlive();
        }
      }
    }, 2000);

    // Prevent Chromium garbage collection
    (window as any).__ACTIVE_TTS__ = utt1;
    window.speechSynthesis.speak(utt1);

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Generous safety timer
    const maxSafetyTimer = setTimeout(() => {
      finish();
    }, 18000);

    return () => {
      clearTimeout(maxSafetyTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
      cleanupKeepAlive();
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      (window as any).__ACTIVE_TTS__ = null;
    };
  } catch (e) {
    console.warn('Speech synthesis error', e);
    finish();
    return () => {};
  }
}

export function stopSpeechSynthesis(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}
