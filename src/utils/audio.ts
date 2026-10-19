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
 * সময়: ---
 * মার্কেট বিশ্লেষণ করছি...
 * নিশ্চিন্তে BUY/SELL ট্রেড করতে পারেন!
 *
 * মিষ্টি, মায়াবী ও পরিমার্জিত কন্ঠ (Sweet & natural melodic voice, slightly faster pace)
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
  const finish = () => {
    if (!completed) {
      completed = true;
      if (typeof window !== 'undefined') {
        (window as any).__ACTIVE_TTS__ = null;
      }
      if (onComplete) onComplete();
    }
  };

  try {
    // Unstick Chromium TTS if paused
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

    // 🇧🇩 বাংলা মিষ্টি, মায়াবী ও পরিমার্জিত কন্ঠ (একটু স্পিডি, স্পষ্ট ও মিষ্টি সুরেলা)
    const speechText = `মার্কেট: ${cleanMarket}। সময়: ${cleanDur}। মার্কেট বিশ্লেষণ করছি... নিশ্চিন্তে ${tradeAction} ট্রেড করতে পারেন!`;
    const utterance = new SpeechSynthesisUtterance(speechText);

    // 1. First priority: Bengali voices (Bangla / Bangladesh / India)
    const bnVoice = voices.find(v =>
      v.lang.startsWith('bn') && (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('বাংলা') || v.name.includes('Bangla') || v.name.includes('Neural'))
    ) || voices.find(v => v.lang.startsWith('bn'));

    // 2. High-quality sweet natural melodic female voice fallback
    const sweetVoice = voices.find(v =>
      (v.name.includes('Google UK English Female') || v.name.includes('Natural') || v.name.includes('Jenny') || v.name.includes('Sonia') || v.name.includes('Aria') || v.name.includes('Samantha') || v.name.includes('Victoria')) &&
      !v.name.includes('Desktop')
    ) || voices.find(v => (v.name.includes('Female') || v.name.includes('Natural')))
      || voices[0];

    const chosenVoice = bnVoice || sweetVoice;
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang && chosenVoice.lang.startsWith('bn') ? chosenVoice.lang : 'bn-BD';
    } else {
      utterance.lang = 'bn-BD';
    }

    utterance.rate = 1.12; // একটু স্পিডে ও পরিমার্জিত
    utterance.pitch = 1.16; // মিষ্টি, কোমল ও মায়াবী পিচ
    utterance.volume = 1.0;

    let ttsKeepAlive: any = null;
    const cleanupKeepAlive = () => {
      if (ttsKeepAlive) {
        clearInterval(ttsKeepAlive);
        ttsKeepAlive = null;
      }
    };

    utterance.onend = () => {
      cleanupKeepAlive();
      finish();
    };
    utterance.onerror = () => {
      cleanupKeepAlive();
      finish();
    };

    // Prevent Chromium garbage collection bug by anchoring to window
    (window as any).__ACTIVE_TTS__ = utterance;

    // Speak
    window.speechSynthesis.speak(utterance);

    // Chrome TTS Keepalive: prevents Chrome from pausing TTS midway
    ttsKeepAlive = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking && !completed) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          cleanupKeepAlive();
        }
      }
    }, 2000);

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Safety timeout (16s) to ensure the scan never hangs indefinitely if user device audio is completely blocked
    const maxSafetyTimer = setTimeout(() => {
      cleanupKeepAlive();
      finish();
    }, 16000);

    return () => {
      clearTimeout(maxSafetyTimer);
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
