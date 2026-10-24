import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Languages,
  AlertTriangle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, VitalsData } from '../types';
import { parseVoiceNlpCommand, VoiceNlpResult } from '../utils/voiceNlp';
import {
  speakAudibleMessage,
  stopAudibleSpeech,
  unlockAudioEngine,
  playListeningReadyTone,
  startEmergencySiren,
  stopEmergencySiren,
  requestMicrophoneAccess,
  startVoiceWaveformAnalyzer
} from '../utils/audio';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateLanguage: (lang: 'English' | 'Hindi') => void;
  currentTab: string;
  onNavigateTab: (tabId: string) => void;
  vitals: VitalsData;
  onTriggerSos: () => void;
  onCancelSos?: () => void;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  primaryContactName?: string;
  isDarkMode: boolean;
  isSeniorZoomActive?: boolean;
  onToggleSeniorZoom?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateLanguage,
  currentTab,
  onNavigateTab,
  vitals,
  onTriggerSos,
  onCancelSos,
  onLogActivity,
  primaryContactName = 'Family Guardian',
  isDarkMode,
  onToggleSeniorZoom
}) => {
  const isHindi = userProfile.language === 'Hindi';
  const [isListening, setIsListening] = useState(false);
  const [isAppSpeaking, setIsAppSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [nlpResult, setNlpResult] = useState<VoiceNlpResult | null>(null);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([20, 36, 52, 32, 64, 44, 28, 50, 22]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const stopWaveformRef = useRef<(() => void) | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Run real-time voice waveform analyzer whenever microphone is actively listening
  useEffect(() => {
    if (isListening && isOpen) {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
      }
      stopWaveformRef.current = startVoiceWaveformAnalyzer((bars) => {
        setWaveformLevels(bars);
      });
    } else {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
        stopWaveformRef.current = null;
      }
    }
    return () => {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
        stopWaveformRef.current = null;
      }
    };
  }, [isListening, isOpen]);

  const speakAndListen = (text: string, langCode: 'hi-IN' | 'en-US', autoListenAfter = true) => {
    stopListening();
    setIsAppSpeaking(true);
    speakAudibleMessage(text, langCode, () => {
      setIsAppSpeaking(false);
      if (autoListenAfter && isOpenRef.current) {
        startListening();
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      unlockAudioEngine();
      // Start microphone immediately when clicked/opened
      startListening();
    } else {
      stopListening();
      stopAudibleSpeech();
      setIsAppSpeaking(false);
      stopEmergencySiren();
      setSirenPlaying(false);
      setNlpResult(null);
      setTranscript('');
    }
    return () => {
      stopListening();
      stopAudibleSpeech();
    };
  }, [isOpen]);

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 400) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string)?.split(',')[1];
          if (!base64data) return;
          try {
            const resp = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64data,
                mimeType: 'audio/webm',
                language: isHindi ? 'Hindi' : 'English'
              })
            });
            const data = await resp.json();
            if (data.transcript && data.transcript.trim()) {
              setTranscript(data.transcript.trim());
              processVoiceInput(data.transcript.trim());
            }
          } catch (err) {}
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4500);
    } catch (err) {
      setIsListening(false);
    }
  };

  const startListening = async () => {
    if (typeof window === 'undefined' || !isOpenRef.current) return;
    stopAudibleSpeech();
    setIsAppSpeaking(false);
    setIsListening(true);
    playListeningReadyTone();

    // Ensure browser microphone permission is unlocked
    const { stream } = await requestMicrophoneAccess();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      startMediaRecorderFallback();
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRec();
      recognition.lang = isHindi ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }
        const current = (finalTrans || interimTrans).trim();
        setTranscript(current);

        if (finalTrans.trim()) {
          processVoiceInput(finalTrans.trim());
        }
      };

      recognition.onerror = (err: any) => {
        if (err && (err.error === 'not-allowed' || err.error === 'service-not-allowed' || err.error === 'audio-capture')) {
          startMediaRecorderFallback();
          return;
        }
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryErr) {
            startMediaRecorderFallback();
          }
        }, 80);
      }
    } catch (e) {
      startMediaRecorderFallback();
    }
  };

  const stopListening = () => {
    if (stopWaveformRef.current) {
      stopWaveformRef.current();
      stopWaveformRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const processVoiceInput = (rawText: string) => {
    if (!rawText.trim()) return;

    const result = parseVoiceNlpCommand(
      rawText,
      userProfile.language,
      currentTab,
      vitals,
      userProfile,
      primaryContactName
    );

    setNlpResult(result);
    const shouldKeepConversing = result.intent !== 'TRIGGER_SOS';
    speakAndListen(result.spokenReply, isHindi ? 'hi-IN' : 'en-US', shouldKeepConversing);
    executeVoiceIntent(result);
  };

  const executeVoiceIntent = (result: VoiceNlpResult) => {
    switch (result.intent) {
      case 'TRIGGER_SOS':
        onTriggerSos();
        onLogActivity('Contact Alert', 'Voice-Activated Emergency SOS', `User voice commanded distress: "${result.transcript}".`, 'alert');
        break;

      case 'CANCEL_SOS':
        if (onCancelSos) onCancelSos();
        stopEmergencySiren();
        setSirenPlaying(false);
        onLogActivity('Check-in', 'Voice SOS Cancelled', `User confirmed safe.`, 'nominal');
        break;

      case 'NAVIGATE_TAB':
        if (result.actionPayload?.tab) {
          onNavigateTab(result.actionPayload.tab);
        }
        break;

      case 'SIREN_ON':
        startEmergencySiren();
        setSirenPlaying(true);
        break;

      case 'SIREN_OFF':
        stopEmergencySiren();
        setSirenPlaying(false);
        break;

      case 'SET_LANGUAGE':
        if (result.actionPayload?.language) {
          onUpdateLanguage(result.actionPayload.language);
        }
        break;

      case 'TOGGLE_ELDERLY_MODE':
        if (onToggleSeniorZoom) onToggleSeniorZoom();
        break;

      default:
        break;
    }
  };

  const seniorSuggestions = isHindi ? [
    { label: '❤️ मेरी धड़कन बताओ', text: 'मेरी धड़कन बताओ' },
    { label: '🩺 मेरा बीपी चेक करो', text: 'मेरा बीपी कितना है' },
    { label: '🌡️ मेरा तापमान बताओ', text: 'मेरा तापमान कितना है' },
    { label: '🚨 मदद करो / बचाओ!', text: 'बचाओ मुझे मदद चाहिए' },
    { label: '🔊 सायरन बजाओ', text: 'सायरन बजाओ' },
    { label: '🔇 सायरन बंद करो', text: 'सायरन बंद करो' },
  ] : [
    { label: "❤️ Check heart rate", text: "What's my heart rate?" },
    { label: '🩺 Check my BP', text: 'What is my blood pressure?' },
    { label: '🌡️ Check temperature', text: 'What is my body temperature?' },
    { label: '🚨 Emergency SOS!', text: 'Emergency help me!' },
    { label: '🔊 Turn on Siren', text: 'Turn on siren' },
    { label: '🔇 Stop Siren', text: 'Stop siren' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[88vh] ${
          isDarkMode 
            ? 'bg-slate-900 border-cyan-500/30 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* TOP BAR */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-sm shrink-0">
              {isAppSpeaking ? (
                <Volume2 className="w-4 h-4 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                {isHindi ? 'आवाज़ बातचीत सहायक' : 'Audio Voice Conversation'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAppSpeaking
                  ? (isHindi ? 'ऐप बोल रहा है...' : 'App is speaking...')
                  : isListening
                    ? (isHindi ? 'आपकी आवाज़ सुन रहा है...' : 'Listening to your voice...')
                    : (isHindi ? 'बोलकर बातचीत करें' : 'Speak to converse with app')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                unlockAudioEngine();
                const nextLang = isHindi ? 'English' : 'Hindi';
                onUpdateLanguage(nextLang);
              }}
              className="py-1.5 px-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{isHindi ? 'English' : 'हिंदी'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MIDDLE CONTENT ZONE */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* MICROPHONE / SPEAKER BUTTON */}
          <div className="flex flex-col items-center justify-center py-3 space-y-2.5 text-center">
            <div className="relative">
              {(isListening || isAppSpeaking) && (
                <div className={`absolute inset-0 rounded-full animate-ping ${
                  isAppSpeaking ? 'bg-emerald-500/25' : 'bg-cyan-500/25'
                }`} />
              )}

              <button
                type="button"
                onClick={() => {
                  unlockAudioEngine();
                  if (isListening) {
                    stopListening();
                  } else {
                    stopAudibleSpeech();
                    setIsAppSpeaking(false);
                    startListening();
                  }
                }}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer active:scale-95 ${
                  isAppSpeaking
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white ring-4 ring-emerald-500/20'
                    : isListening
                      ? 'bg-gradient-to-tr from-cyan-600 to-teal-400 text-white ring-4 ring-cyan-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isAppSpeaking ? (
                  <Volume2 className="w-8 h-8 animate-bounce" />
                ) : isListening ? (
                  <Mic className="w-8 h-8 animate-pulse" />
                ) : (
                  <MicOff className="w-8 h-8" />
                )}
              </button>
            </div>

            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {isAppSpeaking
                ? (isHindi ? '🔊 ऐप बोल रहा है... इसके बाद आपकी बारी' : '🔊 App is speaking... Your turn next')
                : isListening
                  ? (isHindi ? '🎙️ माइक चालू है — कृपया अभी बोलें' : '🎙️ Microphone ON — Please speak now')
                  : (isHindi ? 'बोलने के लिए माइक दबाएं' : 'Tap microphone to speak')}
            </p>

            {/* LIVE 9-BAR VOICE WAVEFORM & REAL-TIME SPOKEN TEXT PREVIEW */}
            {isListening && (
              <div className="w-full p-3 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-center gap-1 h-7">
                  {waveformLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400 transition-all duration-75"
                      style={{ height: `${Math.max(22, lvl)}%` }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    {isHindi ? 'लाइव आवाज़ पहचान (Real-Time Preview)' : 'Real-Time Spoken Text Preview'}
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {transcript
                      ? `"${transcript}"`
                      : (isHindi ? 'सुन रहा हूँ... अपनी बात बोलें' : 'Listening to your voice... Speak now')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SPOKEN TRANSCRIPT & REPLY */}
          {(transcript || nlpResult) && (
            <div className="p-3.5 rounded-2xl border bg-cyan-500/10 border-cyan-500/30 space-y-2">
              {transcript && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                    {isHindi ? 'आपने कहा:' : 'You said:'}
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    &ldquo;{transcript}&rdquo;
                  </p>
                </div>
              )}

              {nlpResult && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {nlpResult.spokenReply}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudioEngine();
                      speakAndListen(nlpResult.spokenReply, isHindi ? 'hi-IN' : 'en-US', true);
                    }}
                    className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    {isHindi ? 'सुनें' : 'Replay'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SIREN ACTIVE ALERT */}
          {sirenPlaying && (
            <div className="p-3 bg-red-600 text-white rounded-2xl flex items-center justify-between shadow-md animate-pulse">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-black">
                  {isHindi ? 'आपातकालीन सायरन चालू है!' : 'Emergency Siren Active!'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopEmergencySiren();
                  setSirenPlaying(false);
                }}
                className="py-1 px-2.5 bg-white text-red-700 rounded-lg text-xs font-black cursor-pointer"
              >
                {isHindi ? 'बंद करें' : 'Stop'}
              </button>
            </div>
          )}

          {/* QUICK COMMAND CHIPS */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isHindi ? 'या यहाँ से चुनें:' : 'Or tap to ask:'}</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {seniorSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    unlockAudioEngine();
                    setTranscript(item.text);
                    processVoiceInput(item.text);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    item.text.includes('बचाओ') || item.text.includes('Emergency')
                      ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                      : isDarkMode
                        ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <Volume2 className="w-3 h-3 opacity-50 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER BAR */}
        <div className={`p-3.5 border-t flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{isHindi ? 'दो-तरफ़ा ऑडियो बातचीत चालू' : 'Two-Way Audio Active'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
          >
            {isHindi ? 'बंद करें' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
