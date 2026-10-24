import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Heart, 
  Phone, 
  Volume2, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  Thermometer,
  Activity,
  PhoneCall,
  ArrowRight,
  Cpu,
  Mic,
  MicOff
} from 'lucide-react';
import { UserProfile, EmergencyContact, VitalsData } from '../types';
import { 
  speakAudibleMessage, 
  stopAudibleSpeech,
  playAudibleSafetyChime, 
  playListeningReadyTone,
  unlockAudioEngine,
  requestMicrophoneAccess,
  startVoiceWaveformAnalyzer
} from '../utils/audio';
import { parseVoiceNlpCommand } from '../utils/voiceNlp';
import { transliterateName, translateRelationship, translateAddress } from '../utils/i18n';

interface Props {
  userProfile: UserProfile;
  vitals: VitalsData;
  contacts: EmergencyContact[];
  onNavigateToContacts: () => void;
  onNavigateToVitals: () => void;
  onNavigateToJourney?: () => void;
  onTriggerSosDirect: () => void;
  onTriggerDangerDetection?: (type?: string) => void;
  isDarkMode: boolean;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  voicePromptActive: boolean;
  onCloseVoicePrompt: () => void;
  onOpenVoicePrompt: () => void;
  onOpenEsp8266Setup?: () => void;
  onOpenSetupChatbot?: () => void;
  espTriggerCount?: number;
  lastEspEventTime?: string | null;
}

export const HomeTab: React.FC<Props> = ({
  userProfile,
  vitals,
  contacts,
  onNavigateToContacts,
  onNavigateToVitals,
  onTriggerSosDirect,
  isDarkMode,
  onLogActivity,
  onOpenVoicePrompt,
  onOpenEsp8266Setup,
  onOpenSetupChatbot,
  espTriggerCount = 0,
  lastEspEventTime = null,
}) => {
  const isHindi = userProfile.language === 'Hindi';
  const activeLang = isHindi ? 'Hindi' : 'English';
  const localizedFullName = transliterateName(userProfile.name, activeLang);
  const firstName = localizedFullName ? localizedFullName.split(' ')[0] : (isHindi ? 'मित्र' : 'Friend');

  // Time-aware greeting in pure selected language
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (isHindi) {
      if (hour < 12) return 'शुभ प्रभात';
      if (hour < 17) return 'शुभ दोपहर';
      return 'शुभ संध्या';
    } else {
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    }
  }, [isHindi]);

  // Daily Check-in state
  const [checkInStatus, setCheckInStatus] = useState<'Safe' | 'NeedHelp' | null>(() => {
    const saved = localStorage.getItem('resqnet_daily_checkin');
    return (saved as any) || 'Safe';
  });
  const [checkInNotice, setCheckInNotice] = useState(false);

  // Primary Contact localized to active language
  const rawPrimary = contacts.find(c => c.priority === 'Primary') || contacts[0] || {
    id: 'c-default',
    name: isHindi ? 'परिवार संपर्क' : 'Family Contact',
    phone: '',
    relationship: isHindi ? 'बेटा' : 'Son',
    priority: 'Primary',
    status: 'Verified',
    addedAt: 'Just now'
  };
  const primaryContact = {
    ...rawPrimary,
    name: transliterateName(rawPrimary.name, activeLang),
    relationship: translateRelationship(rawPrimary.relationship, activeLang),
  };

  // On-demand Home Voice Assistant state (only starts listening when microphone button is clicked)
  const [isHomeMicListening, setIsHomeMicListening] = useState(false);
  const [homeLiveTranscript, setHomeLiveTranscript] = useState('');
  const [homeVoiceReply, setHomeVoiceReply] = useState<string | null>(null);
  const [homeWaveform, setHomeWaveform] = useState<number[]>([20, 38, 54, 30, 62, 42, 26, 48, 22]);
  const homeRecognitionRef = useRef<any>(null);
  const homeRecorderRef = useRef<MediaRecorder | null>(null);
  const homeWaveformStopRef = useRef<(() => void) | null>(null);
  const homeAudioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isHomeMicListening) {
      if (homeWaveformStopRef.current) homeWaveformStopRef.current();
      homeWaveformStopRef.current = startVoiceWaveformAnalyzer((bars) => {
        setHomeWaveform(bars);
      });
    } else {
      if (homeWaveformStopRef.current) {
        homeWaveformStopRef.current();
        homeWaveformStopRef.current = null;
      }
    }
    return () => {
      if (homeWaveformStopRef.current) {
        homeWaveformStopRef.current();
        homeWaveformStopRef.current = null;
      }
    };
  }, [isHomeMicListening]);

  useEffect(() => {
    return () => {
      stopHomeMicListening();
    };
  }, []);

  const stopHomeMicListening = () => {
    if (homeWaveformStopRef.current) {
      homeWaveformStopRef.current();
      homeWaveformStopRef.current = null;
    }
    if (homeRecognitionRef.current) {
      try {
        homeRecognitionRef.current.onend = null;
        homeRecognitionRef.current.onerror = null;
        homeRecognitionRef.current.abort();
      } catch (e) {}
      homeRecognitionRef.current = null;
    }
    if (homeRecorderRef.current && homeRecorderRef.current.state === 'recording') {
      try {
        homeRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsHomeMicListening(false);
  };

  const handleHomeVoiceCommand = (spokenText: string) => {
    const clean = spokenText.trim();
    if (!clean) return;
    setHomeLiveTranscript(clean);
    const nlp = parseVoiceNlpCommand(
      clean,
      userProfile.language,
      'home',
      vitals,
      userProfile,
      primaryContact.name
    );
    setHomeVoiceReply(nlp.spokenReply);
    speakAudibleMessage(nlp.spokenReply, isHindi ? 'hi-IN' : 'en-US');
    if (nlp.intent === 'TRIGGER_SOS') {
      onTriggerSosDirect();
    } else if (nlp.intent === 'NAVIGATE_TAB' && nlp.actionPayload?.tab === 'vitals') {
      onNavigateToVitals();
    } else if (nlp.intent === 'NAVIGATE_TAB' && nlp.actionPayload?.tab === 'contacts') {
      onNavigateToContacts();
    }
  };

  const startHomeFallbackRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      homeAudioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) homeAudioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsHomeMicListening(false);
        const blob = new Blob(homeAudioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 300) return;
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
              handleHomeVoiceCommand(data.transcript.trim());
            }
          } catch (err) {}
        };
        reader.readAsDataURL(blob);
      };
      homeRecorderRef.current = recorder;
      recorder.start();
      setIsHomeMicListening(true);
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 4500);
    } catch (e) {
      setIsHomeMicListening(false);
    }
  };

  const handleToggleHomeMic = async () => {
    unlockAudioEngine();
    if (isHomeMicListening) {
      stopHomeMicListening();
      return;
    }

    stopAudibleSpeech();
    setHomeLiveTranscript('');
    setHomeVoiceReply(null);
    setIsHomeMicListening(true);
    playListeningReadyTone();

    const { stream } = await requestMicrophoneAccess();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      startHomeFallbackRecorder();
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = isHindi ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsHomeMicListening(true);
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
        setHomeLiveTranscript(current);
        if (finalTrans.trim()) {
          stopHomeMicListening();
          handleHomeVoiceCommand(finalTrans.trim());
        }
      };
      recognition.onerror = (err: any) => {
        if (err && (err.error === 'not-allowed' || err.error === 'service-not-allowed' || err.error === 'audio-capture')) {
          startHomeFallbackRecorder();
          return;
        }
        setIsHomeMicListening(false);
      };
      recognition.onend = () => setIsHomeMicListening(false);
      homeRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      startHomeFallbackRecorder();
    }
  };

  // Speak Current Status Aloud
  const handleSpeakStatus = () => {
    const speech = isHindi
      ? `नमस्ते ${firstName} जी! आप सुरक्षित हैं। आपकी हृदय गति ${vitals.pulse || 72} बीट्स, रक्तचाप ${vitals.bpSys || 118}/${vitals.bpDia || 76} और तापमान ${(vitals.bodyTemperature || 98.6).toFixed(1)} डिग्री सामान्य है। आपातकाल में बड़ा लाल बटन दबाएं।`
      : `Hello ${firstName}! You are safe and protected. Heart rate is ${vitals.pulse || 72} BPM, blood pressure is ${vitals.bpSys || 118}/${vitals.bpDia || 76}, and body temperature is ${(vitals.bodyTemperature || 98.6).toFixed(1)} degrees Fahrenheit. Press the red button for emergency help.`;
    speakAudibleMessage(speech, isHindi ? 'hi-IN' : 'en-US');
  };

  // Handle Safe Check-in
  const handleCheckInSafe = () => {
    setCheckInStatus('Safe');
    localStorage.setItem('resqnet_daily_checkin', 'Safe');
    playAudibleSafetyChime();

    const text = isHindi
      ? `बहुत अच्छा ${firstName} जी! आपकी सुरक्षा दर्ज कर ली गई है।`
      : `Great to know, ${firstName}! Your safe status has been recorded.`;
    speakAudibleMessage(text, isHindi ? 'hi-IN' : 'en-US');

    onLogActivity('Check-in', 'Senior Confirmed Safe', 'Daily wellness check-in completed.', 'nominal');
    setCheckInNotice(true);
    setTimeout(() => setCheckInNotice(false), 3500);
  };

  // Handle Need Help Check-in
  const handleCheckInNeedHelp = () => {
    setCheckInStatus('NeedHelp');
    const text = isHindi
      ? `कृपया आवाज सहायक से बात करें या नीचे दिए गए संपर्क को कॉल करें।`
      : `Please speak with the voice assistant or call your emergency contact below.`;
    speakAudibleMessage(text, isHindi ? 'hi-IN' : 'en-US');

    onLogActivity('Check-in', 'Senior Indicated Distress', 'User selected Need Help option on home screen.', 'alert');
    onOpenVoicePrompt();
  };

  // Speak specific vitals
  const speakVitalsCard = (type: 'hr' | 'bp' | 'temp') => {
    if (type === 'hr') {
      const msg = isHindi
        ? `आपकी हृदय गति ${vitals.pulse || 72} बीट्स प्रति मिनट है, जो सामान्य है।`
        : `Your heart rate is ${vitals.pulse || 72} beats per minute, which is normal.`;
      speakAudibleMessage(msg, isHindi ? 'hi-IN' : 'en-US');
    } else if (type === 'bp') {
      const msg = isHindi
        ? `आपका रक्तचाप ${vitals.bpSys || 118}/${vitals.bpDia || 76} है, जो सुरक्षित सीमा में है।`
        : `Your blood pressure is ${vitals.bpSys || 118} over ${vitals.bpDia || 76} mmHg, within safe range.`;
      speakAudibleMessage(msg, isHindi ? 'hi-IN' : 'en-US');
    } else {
      const temp = (vitals.bodyTemperature || 98.6).toFixed(1);
      const msg = isHindi
        ? `आपका शारीरिक तापमान ${temp} डिग्री फ़ारेनहाइट है, जो सामान्य है।`
        : `Your body temperature is ${temp} degrees Fahrenheit, which is normal.`;
      speakAudibleMessage(msg, isHindi ? 'hi-IN' : 'en-US');
    }
  };

  return (
    <div className="space-y-3.5 w-full pb-6">
      
      {/* 1. GREETING & PROTECTED STATUS BANNER */}
      <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
        isDarkMode 
          ? 'bg-slate-900 border-emerald-500/30' 
          : 'bg-white border-emerald-200'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{isHindi ? '24/7 सुरक्षा सक्रिय' : '24/7 Protection Active'}</span>
            </div>
            
            <h1 className="text-xl font-black text-slate-900 dark:text-white truncate">
              {greeting}, {localizedFullName || firstName}!
            </h1>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              📍 {translateAddress(userProfile.address, activeLang) || (isHindi ? 'नई दिल्ली' : 'New Delhi')}
            </p>
          </div>

          {/* Voice status read aloud button */}
          <button
            type="button"
            onClick={handleSpeakStatus}
            className="py-2.5 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isHindi ? 'सुनें' : 'Listen'}</span>
          </button>
        </div>

        {checkInNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isHindi ? 'आपकी सुरक्षा पुष्टि दर्ज कर ली गई है।' : 'Daily check-in confirmed safe.'}</span>
          </div>
        )}

        {onOpenSetupChatbot && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {isHindi ? 'नाम, उम्र व आपातकालीन नंबर चैटबॉट से बदलें:' : 'Update name, age & emergency phone via Chatbot:'}
            </span>
            <button
              type="button"
              onClick={onOpenSetupChatbot}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
            >
              {isHindi ? '💬 सेटअप चैटबॉट खोलें' : '💬 Setup Chatbot'}
            </button>
          </div>
        )}
      </div>

      {/* 2. GIANT EMERGENCY SOS BUTTON & VOICE MIC QUICK BUTTON */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onTriggerSosDirect}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 border-2 border-red-400/50 flex items-center justify-between gap-3 cursor-pointer transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-2xl animate-pulse">🚨</span>
            </div>
            <div className="min-w-0">
              <span className="text-lg font-black tracking-tight block">
                {isHindi ? 'आपातकालीन SOS' : 'EMERGENCY SOS'}
              </span>
              <span className="text-[11px] font-semibold opacity-90 block truncate">
                {isHindi ? 'मदद के लिए दबाएं · परिवार और 108 को अलर्ट' : 'Tap for urgent help · Alerts family & 108'}
              </span>
            </div>
          </div>

          <span className="py-2 px-3 rounded-xl bg-white text-red-700 font-black text-xs uppercase shadow shrink-0">
            {isHindi ? 'मदद' : 'SOS'}
          </span>
        </button>

        {/* HOME VOICE ASSISTANCE CARD (CLICK TO START LISTENING WITH LIVE WAVEFORM & REAL-TIME TEXT PREVIEW) */}
        <div
          className={`w-full p-3.5 rounded-2xl border-2 transition-all shadow-md space-y-2.5 ${
            isHomeMicListening
              ? 'bg-emerald-950/90 border-emerald-500 text-white'
              : isDarkMode
              ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-teal-950/80 border-cyan-500/50 text-cyan-100'
              : 'bg-gradient-to-r from-cyan-50 via-white to-teal-50 border-cyan-400 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleToggleHomeMic}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all ${
                  isHomeMicListening
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {isHomeMicListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black truncate">
                    {isHomeMicListening
                      ? (isHindi ? '🎙️ माइक चालू है — अभी बोलें' : '🎙️ Microphone ON — Speak Now')
                      : (isHindi ? '🎙️ वॉइस असिस्टेंट (माइक दबाएं)' : '🎙️ Voice Assistant (Tap Mic)')}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      isHomeMicListening
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                    }`}
                  >
                    {isHomeMicListening ? (isHindi ? 'सुन रहा है' : 'LISTENING') : (isHindi ? 'बोलें' : 'CLICK TO SPEAK')}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold block truncate ${
                  isHomeMicListening ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {isHomeMicListening
                    ? (isHindi ? 'अपनी स्थिति, बीपी, धड़कन या मदद के लिए बोलें' : 'Speak to check vitals, status, or ask for help')
                    : (isHindi ? 'माइक बटन दबाने पर ही आपकी आवाज़ सुनी जाएगी' : 'Starts listening immediately when microphone is clicked')}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleHomeMic}
                className={`py-2 px-3 rounded-xl font-black text-[11px] shadow-sm cursor-pointer active:scale-95 transition-all ${
                  isHomeMicListening
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {isHomeMicListening ? (isHindi ? 'रोकें' : 'Stop') : (isHindi ? '🎙️ बोलें' : '🎙️ Speak')}
              </button>

              {onOpenVoicePrompt && (
                <button
                  type="button"
                  onClick={() => {
                    stopHomeMicListening();
                    onOpenVoicePrompt();
                  }}
                  className="py-2 px-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] font-black cursor-pointer"
                  title={isHindi ? 'पूरा वॉइस असिस्टेंट खोलें' : 'Open Full Voice Assistant'}
                >
                  {isHindi ? 'चैट' : 'Modal'}
                </button>
              )}
            </div>
          </div>

          {/* LIVE VOICE WAVEFORM & REAL-TIME SPOKEN TEXT PREVIEW ON HOME PAGE */}
          {isHomeMicListening && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-3 animate-fadeIn">
              <div className="flex items-end gap-0.5 h-6 px-1.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/30 shrink-0">
                {homeWaveform.map((lvl, idx) => (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                    style={{ height: `${Math.max(20, lvl)}%` }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                  {isHindi ? 'लाइव आवाज़ और शब्द प्रीव्यू' : 'Live Voice Waveform & Spoken Text Preview'}
                </span>
                <p className="text-xs font-black text-white truncate">
                  {homeLiveTranscript
                    ? `"${homeLiveTranscript}"`
                    : (isHindi ? 'सुन रहा हूँ... कृपया अब बोलें' : 'Listening to your voice... Speak now')}
                </p>
              </div>
            </div>
          )}

          {/* SPOKEN COMMAND RESULT PREVIEW ON HOME PAGE */}
          {!isHomeMicListening && (homeLiveTranscript || homeVoiceReply) && (
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-1 animate-fadeIn">
              {homeLiveTranscript && (
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  <span className="opacity-70">{isHindi ? 'आपने कहा: ' : 'You said: '}</span>
                  <span className="font-black">&ldquo;{homeLiveTranscript}&rdquo;</span>
                </p>
              )}
              {homeVoiceReply && (
                <p className="font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{homeVoiceReply}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2B. ESP8266 PHYSICAL SOS BUTTON LINK & ARDUINO SETUP */}
      {onOpenEsp8266Setup && (
        <button
          type="button"
          onClick={onOpenEsp8266Setup}
          className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] text-left ${
            isDarkMode
              ? 'bg-slate-900/95 border-cyan-500/40 hover:border-cyan-400 text-slate-100'
              : 'bg-cyan-50/80 border-cyan-300 hover:border-cyan-500 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black truncate">
                  {isHindi ? 'ESP8266 हार्डवेयर SOS बटन' : 'ESP8266 Hardware SOS Button'}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[9px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {isHindi ? 'सक्रिय' : 'READY'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                {lastEspEventTime
                  ? isHindi
                    ? `अंतिम बटन ट्रिगर: ${lastEspEventTime} (${espTriggerCount} बार)`
                    : `Last triggered at ${lastEspEventTime} (${espTriggerCount}x)`
                  : isHindi
                  ? 'फिजिकल बटन जोड़ने व Arduino कोड के लिए टैप करें'
                  : 'Tap for ESP8266 Arduino code, webhook URL & live test'}
              </span>
            </div>
          </div>

          <span className="py-1.5 px-2.5 rounded-xl bg-cyan-600 text-white font-black text-[10px] shrink-0">
            {isHindi ? 'कोड / सेटअप' : 'Setup / Code'}
          </span>
        </button>
      )}

      {/* 3. ONE-TAP EMERGENCY HELPLINES (108 Ambulance & 112 Police - Equal Height & Alignment) */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:108"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md flex items-center justify-between gap-2 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">🚑</span>
            <div className="min-w-0">
              <span className="text-lg font-black block leading-tight">108</span>
              <span className="text-xs font-bold opacity-90 block truncate">
                {isHindi ? 'एम्बुलेंस' : 'Ambulance'}
              </span>
            </div>
          </div>
          <PhoneCall className="w-4 h-4 shrink-0 opacity-85" />
        </a>

        <a
          href="tel:112"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md flex items-center justify-between gap-2 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">👮</span>
            <div className="min-w-0">
              <span className="text-lg font-black block leading-tight">112</span>
              <span className="text-xs font-bold opacity-90 block truncate">
                {isHindi ? 'पुलिस / मदद' : 'Police / Help'}
              </span>
            </div>
          </div>
          <PhoneCall className="w-4 h-4 shrink-0 opacity-85" />
        </a>
      </div>

      {/* 4. DAILY WELLNESS CHECK-IN (Aligned 2-Column Grid) */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            {isHindi ? 'आज का स्वास्थ्य चेक-इन' : 'Daily Wellness Check-in'}
          </h2>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {checkInStatus === 'Safe' ? (isHindi ? '✅ सुरक्षित' : '✅ Confirmed Safe') : (isHindi ? '⚠️ सहायता' : '⚠️ Needs Help')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* I AM SAFE BUTTON */}
          <button
            type="button"
            onClick={handleCheckInSafe}
            className={`p-3 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 text-left ${
              checkInStatus === 'Safe'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isDarkMode
                  ? 'bg-slate-950 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-black block truncate">
                {isHindi ? 'मैं ठीक हूँ' : 'I am Safe'}
              </span>
              <span className="text-[10px] font-semibold opacity-85 block truncate">
                {isHindi ? 'तबीयत सामान्य है' : 'Feeling fine'}
              </span>
            </div>
          </button>

          {/* NEED HELP BUTTON */}
          <button
            type="button"
            onClick={handleCheckInNeedHelp}
            className={`p-3 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 text-left ${
              checkInStatus === 'NeedHelp'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : isDarkMode
                  ? 'bg-slate-950 border-amber-500/40 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-black block truncate">
                {isHindi ? 'मदद चाहिए' : 'Need Help'}
              </span>
              <span className="text-[10px] font-semibold opacity-85 block truncate">
                {isHindi ? 'सहायता बुलाएं' : 'Get assistance'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 5. PRIMARY FAMILY CONTACT CARD */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              {isHindi ? 'मुख्य आपातकालीन संपर्क' : 'Primary Family Contact'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onNavigateToContacts}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isHindi ? 'सभी देखें' : 'View All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              {primaryContact.name.charAt(0) || 'P'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {primaryContact.name}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {primaryContact.relationship} · <span className="font-mono">{primaryContact.phone}</span>
              </p>
            </div>
          </div>

          <a
            href={`tel:${primaryContact.phone}`}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{isHindi ? 'कॉल करें' : 'Call'}</span>
          </a>
        </div>
      </div>

      {/* 6. TODAY'S HEALTH VITALS SUMMARY (Aligned 3-Column Compact Cards) */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              {isHindi ? 'स्वास्थ्य सारांश' : 'Health Vitals'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onNavigateToVitals}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isHindi ? 'विस्तार से' : 'Details'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* HEART RATE */}
          <button
            type="button"
            onClick={() => speakVitalsCard('hr')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-rose-950/20 border-rose-500/30' 
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <Volume2 className="w-3 h-3 opacity-70" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono">
              {vitals.pulse || 72} <span className="text-[10px] font-sans font-bold text-slate-500">BPM</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate">
              {isHindi ? 'हृदय गति' : 'Heart Rate'}
            </span>
          </button>

          {/* BLOOD PRESSURE */}
          <button
            type="button"
            onClick={() => speakVitalsCard('bp')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-cyan-950/20 border-cyan-500/30' 
                : 'bg-cyan-50/70 border-cyan-200'
            }`}
          >
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 mb-1">
              <Activity className="w-3.5 h-3.5" />
              <Volume2 className="w-3 h-3 opacity-70" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono">
              {vitals.bpSys && vitals.bpDia ? `${vitals.bpSys}/${vitals.bpDia}` : '118/76'}
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate">
              {isHindi ? 'रक्तचाप' : 'Blood Pressure'}
            </span>
          </button>

          {/* TEMPERATURE */}
          <button
            type="button"
            onClick={() => speakVitalsCard('temp')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-amber-950/20 border-amber-500/30' 
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <Thermometer className="w-3.5 h-3.5" />
              <Volume2 className="w-3 h-3 opacity-70" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono">
              {(vitals.bodyTemperature || 98.6).toFixed(1)}°F
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate">
              {isHindi ? 'तापमान' : 'Body Temp'}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
};
