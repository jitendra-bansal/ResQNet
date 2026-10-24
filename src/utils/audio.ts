/**
 * High-Reliability Web Audio & Speech Synthesis Engine
 * Uses Web Audio API (AudioContext BufferSource + /api/tts stream) + SpeechSynthesis fallback
 * Guarantees audible voice output even during hands-free voice conversation turns
 */

let audioContextInstance: AudioContext | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let activeSpeechId = 0;

// Keep global reference to utterances so Chrome/Safari GC never collects them mid-speech
const activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

export function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!audioContextInstance) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextInstance = new AudioCtx();
      }
    }
    if (audioContextInstance && audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }
    return audioContextInstance;
  } catch (err) {
    console.warn('AudioContext initialization warning:', err);
    return null;
  }
}

export function unlockAudioEngine(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}

// Unlock AudioContext on first user interaction anywhere in the document
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export function playAudibleSafetyChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1 (Warm A4 440Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2 (Pleasant E5 659.25Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch (err) {
    console.warn('AudioContext chime error:', err);
  }
}

/**
 * Subtle ascending tone played when the microphone activates to listen to the user
 */
export function playListeningReadyTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14); // G5
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    // ignore
  }
}

/**
 * Authentic SMS Notification Tone played when a 4-digit OTP is dispatched to the user's phone number
 */
export function playSmsNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First bell tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Second bell tone (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.08);
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch (err) {
    // ignore
  }
}


export function stopAudibleSpeech(): void {
  activeSpeechId++;
  try {
    if (currentBufferSource) {
      currentBufferSource.onended = null;
      currentBufferSource.stop();
      currentBufferSource.disconnect();
      currentBufferSource = null;
    }
  } catch (e) {}

  try {
    if (currentHtmlAudio) {
      currentHtmlAudio.onended = null;
      currentHtmlAudio.onerror = null;
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio = null;
    }
  } catch (e) {}

  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtterances.clear();
  } catch (e) {}
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[·•]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackBrowserSpeech(text: string, lang: string, speechId: number, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd && speechId === activeSpeechId) setTimeout(onEnd, 400);
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterances.add(utterance);

    utterance.volume = 1.0;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();
    if (lang.startsWith('hi')) {
      const hindiVoice = voices.find(v =>
        v.lang.startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('india')
      );
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      const englishVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Bad'));
      if (englishVoice) utterance.voice = englishVoice;
    }

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      activeUtterances.delete(utterance);
      if (onEnd && speechId === activeSpeechId) {
        onEnd();
      }
    };

    utterance.onend = finishOnce;
    utterance.onerror = finishOnce;

    // Safety timeout in case browser speechSynthesis hangs without firing onend
    const estMs = Math.max(2500, Math.min(12000, text.length * 85));
    setTimeout(finishOnce, estMs);

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    if (onEnd && speechId === activeSpeechId) setTimeout(onEnd, 400);
  }
}

/**
 * Speaks a message out loud reliably using Web Audio API + /api/tts stream
 * with automatic fallback to browser SpeechSynthesis, then invokes `onEnd` when finished.
 */
export function speakAudibleMessage(text: string, lang = 'en-US', onEnd?: () => void): void {
  stopAudibleSpeech();
  const mySpeechId = activeSpeechId;

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // Play soft chime first so user gets immediate tactile audio confirmation
  playAudibleSafetyChime();

  const ttsUrl = `/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(cleanText)}`;

  // Fetch audio bytes and play through Web Audio API AudioContext (works even without fresh click gesture!)
  fetch(ttsUrl)
    .then(async res => {
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      return await res.arrayBuffer();
    })
    .then(async arrayBuffer => {
      if (mySpeechId !== activeSpeechId) return;

      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        if (mySpeechId !== activeSpeechId) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        currentBufferSource = source;
        source.onended = () => {
          if (currentBufferSource === source) {
            currentBufferSource = null;
          }
          if (onEnd && mySpeechId === activeSpeechId) {
            onEnd();
          }
        };
        source.start(0);
        return;
      }

      // Secondary HTML5 Audio fallback if AudioContext unavailable
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audio.volume = 1.0;
      currentHtmlAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (currentHtmlAudio === audio) currentHtmlAudio = null;
        if (onEnd && mySpeechId === activeSpeechId) onEnd();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        fallbackBrowserSpeech(cleanText, lang, mySpeechId, onEnd);
      };
      await audio.play();
    })
    .catch(() => {
      if (mySpeechId !== activeSpeechId) return;
      fallbackBrowserSpeech(cleanText, lang, mySpeechId, onEnd);
    });
}

export function playPhoneRingTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(480, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + 1.2);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);
  } catch (e) {
    console.warn('Ring tone error:', e);
  }
}

let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: any = null;

export function startEmergencySiren(): void {
  try {
    stopEmergencySiren();
    const ctx = getAudioContext();
    if (!ctx) return;

    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.35, ctx.currentTime);
    sirenGain.connect(ctx.destination);

    sirenOscillator = ctx.createOscillator();
    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(650, ctx.currentTime);
    sirenOscillator.connect(sirenGain);
    sirenOscillator.start();

    let high = true;
    sirenInterval = setInterval(() => {
      if (!sirenOscillator || !ctx) return;
      try {
        const targetFreq = high ? 1150 : 650;
        sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.35);
        high = !high;
      } catch (err) {
        // ignore
      }
    }, 400);
  } catch (e) {
    console.warn('Siren start error:', e);
  }
}

export function stopEmergencySiren(): void {
  try {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOscillator) {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
      sirenOscillator = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
  } catch (e) {
    console.warn('Siren stop error:', e);
  }
}

/**
 * Requests browser microphone hardware access on user gesture.
 * Returns true if microphone access is granted.
 */
export async function requestMicrophoneAccess(): Promise<{ granted: boolean; stream: MediaStream | null }> {
  if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { granted: false, stream: null };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return { granted: true, stream };
  } catch (err) {
    console.warn('Microphone access request warning:', err);
    return { granted: false, stream: null };
  }
}

/**
 * Starts a real-time 9-bar voice waveform analyzer using Web Audio API AnalyserNode
 * connected to the live microphone MediaStream.
 * Returns a cleanup function to stop the analyzer and release microphone tracks.
 */
export function startVoiceWaveformAnalyzer(
  onLevels: (bars: number[]) => void,
  existingStream?: MediaStream | null
): () => void {
  let isActive = true;
  let activeStream: MediaStream | null = existingStream || null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let intervalId: any = null;
  const barCount = 9;

  const startFallbackPulse = () => {
    let tick = 0;
    intervalId = setInterval(() => {
      if (!isActive) return;
      tick += 0.35;
      const simulated = Array.from({ length: barCount }, (_, i) => {
        const wave = Math.sin(tick + i * 0.7) * 0.5 + 0.5;
        const jitter = Math.random() * 28;
        return Math.max(18, Math.min(96, Math.round(22 + wave * 48 + jitter)));
      });
      onLevels(simulated);
    }, 65);
  };

  const attachStream = (stream: MediaStream) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        startFallbackPulse();
        return;
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      sourceNode = ctx.createMediaStreamSource(stream);
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.65;
      sourceNode.connect(analyserNode);

      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      intervalId = setInterval(() => {
        if (!isActive || !analyserNode) return;
        analyserNode.getByteFrequencyData(dataArray);

        const bars: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.min(dataArray.length - 1, Math.floor((i + 1) * 1.5));
          const rawVal = dataArray[binIndex] || 0;
          // Normalize 0..255 to 16..100% height with gentle organic motion when quiet
          const idlePulse = 16 + Math.round(Math.sin(Date.now() / 160 + i) * 4);
          const voiceHeight = Math.min(100, Math.round((rawVal / 210) * 100));
          bars.push(Math.max(idlePulse, voiceHeight));
        }
        onLevels(bars);
      }, 55);
    } catch (e) {
      startFallbackPulse();
    }
  };

  if (activeStream) {
    attachStream(activeStream);
  } else if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then(stream => {
        if (!isActive) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        activeStream = stream;
        attachStream(stream);
      })
      .catch(() => {
        if (isActive) startFallbackPulse();
      });
  } else {
    startFallbackPulse();
  }

  return () => {
    isActive = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    try {
      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
      }
      if (analyserNode) {
        analyserNode.disconnect();
        analyserNode = null;
      }
    } catch (e) {}
    if (activeStream && !existingStream) {
      try {
        activeStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      activeStream = null;
    }
  };
}

