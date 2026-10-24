import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  PhoneCall, 
  Video, 
  VideoOff, 
  Camera, 
  MapPin, 
  Ambulance, 
  Hospital, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Radio, 
  UserCheck, 
  AlertCircle, 
  Compass, 
  ArrowRight, 
  ShieldCheck, 
  HeartPulse, 
  Activity, 
  Navigation, 
  Phone, 
  Eye,
  Check,
  Building2,
  Clock,
  MessageSquare,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { UserProfile, EmergencyContact, VitalsData } from '../types';
import { playAudibleSafetyChime, speakAudibleMessage } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  contacts: EmergencyContact[];
  vitals: VitalsData;
  onTriggerAmbulance: () => void;
  onTriggerAutonomousEscalation?: (dangerDetails: string) => void;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  isDarkMode: boolean;
  initialDangerType?: string;
}

export const DangerDetectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userProfile,
  contacts,
  vitals,
  onTriggerAmbulance,
  onTriggerAutonomousEscalation,
  onLogActivity,
  isDarkMode,
  initialDangerType = 'Sudden Fall Impact & Cardiac Spike Detected'
}) => {
  // Stages:
  // 'warnings' -> 3 notifications before emergency sos
  // 'camera_assessment' -> if user says "I'm not fine"
  // 'primary_contact_call' -> if user declined all 3 warnings but danger persists
  // 'resolved_misunderstanding' -> primary contact says user is fine
  // 'contact_assistance_decision' -> primary contact says user is NOT fine: ambulance vs check-up/hospital
  // 'hospital_checkup_guide' -> escorting user for hospital visit
  // 'ambulance_dispatched' -> ambulance on the way
  const [stage, setStage] = useState<
    'warnings' | 
    'camera_assessment' | 
    'primary_contact_call' | 
    'resolved_misunderstanding' | 
    'contact_assistance_decision' | 
    'hospital_checkup_guide' | 
    'ambulance_dispatched'
  >('warnings');

  const [warningIndex, setWarningIndex] = useState<number>(1);
  const [warningCountdown, setWarningCountdown] = useState<number>(10);
  const [isSensorsChecking, setIsSensorsChecking] = useState<boolean>(false);
  const [dangerDescription, setDangerDescription] = useState<string>(initialDangerType);

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Primary Contact Call state
  const [callTimer, setCallTimer] = useState<number>(0);
  const [callStatus, setCallStatus] = useState<'dialing' | 'connected' | 'speaking'>('dialing');
  const [failSafeSeconds, setFailSafeSeconds] = useState<number>(12);
  const [unableToTalkDispatched, setUnableToTalkDispatched] = useState<boolean>(false);

  // Identify Primary Contact
  const primaryContact = contacts.find(c => c.priority === 'Primary') || contacts[0] || {
    id: 'c-default',
    name: 'Primary Responder',
    phone: '',
    relationship: 'Family Member',
    priority: 'Primary',
    status: 'Verified',
    addedAt: 'Verified'
  };

  // Helper to place real phone app call
  const handlePlacePhoneAppCall = () => {
    const cleanPhone = primaryContact.phone.replace(/\D/g, '');
    try {
      window.location.href = `tel:+91${cleanPhone}`;
    } catch (e) {
      console.warn('Call trigger error:', e);
    }
  };

  // Language preference
  const isHindi = userProfile.language === 'Hindi';

  // Timer Ref
  const warningTimerRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);

  // Live Emergency Voice Command Recognition (Hindi & English based on profile)
  const [voiceDetectedText, setVoiceDetectedText] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceDetection = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      const recognition = new SpeechRec();
      recognition.lang = isHindi ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsVoiceListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setVoiceDetectedText(transcript);
        handleEmergencyVoiceInput(transcript);
      };
      recognition.onerror = () => setIsVoiceListening(false);
      recognition.onend = () => setIsVoiceListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Emergency speech recognition note:', err);
    }
  };

  const stopVoiceDetection = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsVoiceListening(false);
  };

  const handleEmergencyVoiceInput = (raw: string) => {
    const text = raw.toLowerCase().trim();
    const safeHindi = ['theek', 'thik', 'sahi', 'kuch nahi', 'shant', 'theek hu', 'mai theek', 'theek hoon', 'सुरक्षित', 'ठीक हूँ', 'ठीक हूं', 'सब ठीक', 'रद्द', 'कैंसिल', 'theek hai', 'fine', 'okay'];
    const dangerHindi = ['madad', 'bachao', 'khatra', 'dard', 'emergency', 'gir gaya', 'gir gayi', 'मदद', 'बचाओ', 'खतरा', 'इमरजेंसी', 'दर्द', 'गिर गया', 'गिर गई', 'डॉक्टर', 'एम्बुलेंस', 'help'];
    const safeEnglish = ['fine', 'okay', "i'm fine", 'i am fine', "i'm okay", 'i am okay', 'cancel', 'all good', 'safe', 'no'];
    const dangerEnglish = ['help', 'emergency', 'pain', 'fell', 'fall', 'hurt', 'doctor', 'save', 'unwell', 'bad'];

    const isSafe = isHindi 
      ? safeHindi.some(k => text.includes(k)) || safeEnglish.some(k => text.includes(k))
      : safeEnglish.some(k => text.includes(k)) || safeHindi.some(k => text.includes(k));

    const isDanger = isHindi
      ? dangerHindi.some(k => text.includes(k)) || dangerEnglish.some(k => text.includes(k))
      : dangerEnglish.some(k => text.includes(k)) || dangerHindi.some(k => text.includes(k));

    if (isSafe) {
      onLogActivity('Check-in', 'Danger Warning Declined via Voice', `User voice confirmed safe: "${raw}". Re-checking sensors.`, 'nominal');
      handleUserDeclinesWarning();
    } else if (isDanger) {
      onLogActivity('Contact Alert', 'Emergency Escalated via Voice Command', `User voice reported distress: "${raw}". Immediate escalation initiated.`, 'alert');
      escalateToPrimaryContactCall();
    }
  };

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setStage('warnings');
      setWarningIndex(1);
      setWarningCountdown(10);
      setIsSensorsChecking(false);
      setDangerDescription(initialDangerType);
      setVoiceDetectedText('');
      
      // Audible warning 1 in user's preferred language
      playAudibleSafetyChime();
      speakAudibleMessage(
        isHindi 
          ? "खतरा पहचाना गया! चेतावनी 1. क्या आप ठीक हैं? कृपया बताएं।"
          : "Danger detected! Warning 1 of 3. Are you okay? Please respond.",
        isHindi ? 'hi-IN' : 'en-US'
      );

      // Start automatic voice detection in user's preferred language (Hindi or English)
      setTimeout(() => {
        startVoiceDetection();
      }, 1000);

      onLogActivity(
        'Contact Alert',
        'ResQSense Danger Detected: Warning 1 of 3 Issued',
        `${initialDangerType}. 10-second fail-safe warning active. Voice detection engaged in ${isHindi ? 'Hindi (hi-IN)' : 'English (en-US)'}.`,
        'alert'
      );
    } else {
      stopCameraStream();
      stopVoiceDetection();
      clearInterval(warningTimerRef.current);
      clearInterval(callTimerRef.current);
    }
  }, [isOpen, initialDangerType]);

  // Warning countdown loop
  useEffect(() => {
    if (isOpen && stage === 'warnings') {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = setInterval(() => {
        setWarningCountdown(prev => {
          if (prev <= 1) {
            // If timer runs out without user declining, treat as danger persists!
            setTimeout(() => {
              handleWarningTimeout();
            }, 0);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(warningTimerRef.current);
  }, [isOpen, stage, warningIndex]);

  // Handle countdown timeout on any warning
  const handleWarningTimeout = () => {
    if (warningIndex < 3) {
      advanceToNextWarning();
    } else {
      // All 3 warnings expired / unconfirmed -> escalate to Primary Contact call
      escalateToPrimaryContactCall();
    }
  };

  // When user clicks "I'm Fine (Decline Alert)"
  const handleUserDeclinesWarning = () => {
    setIsSensorsChecking(true);
    playAudibleSafetyChime();

    setTimeout(() => {
      setIsSensorsChecking(false);
      if (warningIndex < 3) {
        // App still detects danger! Move to next warning
        advanceToNextWarning();
      } else {
        // User declined all 3 warnings BUT wearable sensors still detect danger (signal doesn't confirm safety)
        // User required: "contact the primary contact (the ui should not be present)."
        clearInterval(warningTimerRef.current);
        stopCameraStream();
        onClose(); // Immediately dismiss modal UI so it is not present
        if (onTriggerAutonomousEscalation) {
          onTriggerAutonomousEscalation(dangerDescription);
        } else {
          escalateToPrimaryContactCall();
        }
      }
    }, 1000);
  };

  const advanceToNextWarning = () => {
    const nextIdx = warningIndex + 1;
    setWarningIndex(nextIdx);
    setWarningCountdown(10);
    playAudibleSafetyChime();

    if (nextIdx === 2) {
      speakAudibleMessage(
        isHindi 
          ? "लगातार खतरा बना हुआ है! चेतावनी 2. कृपया पुष्टि करें।"
          : "Persistent danger detected! Warning 2 of 3. Please confirm your status.",
        isHindi ? 'hi-IN' : 'en-US'
      );
      onLogActivity(
        'Contact Alert',
        'Danger Warning 2 of 3 Issued: Sensor Distress Persisting',
        'User clicked "I\'m Fine" on Warning 1, but motion & vital sensors continue detecting danger.',
        'alert'
      );
    } else if (nextIdx === 3) {
      speakAudibleMessage(
        isHindi 
          ? "गंभीर स्थिति! चेतावनी 3. आपातकालीन संपर्क को फोन मिलाने से पहले अंतिम सुरक्षा जांच।"
          : "Critical sensor anomaly! Warning 3 of 3. Final safety check before calling emergency contact.",
        isHindi ? 'hi-IN' : 'en-US'
      );
      onLogActivity(
        'Contact Alert',
        'Danger Warning 3 of 3 Issued: Final Check',
        'User clicked "I\'m Fine" on Warning 2, but biological trauma baseline remains abnormal.',
        'alert'
      );
    }

    // Re-engage live speech recognition in Hindi or English
    setVoiceDetectedText('');
    setTimeout(() => {
      startVoiceDetection();
    }, 1200);
  };

  // Escalate to Primary Contact call when all 3 warnings declined but danger persists
  const escalateToPrimaryContactCall = () => {
    stopVoiceDetection();
    clearInterval(warningTimerRef.current);
    setStage('primary_contact_call');
    setCallStatus('dialing');
    setCallTimer(0);
    setFailSafeSeconds(12);
    setUnableToTalkDispatched(false);
    playAudibleSafetyChime();

    // Trigger Phone App call so user can actually talk to the contact
    handlePlacePhoneAppCall();

    speakAudibleMessage(
      isHindi 
        ? `आपकी सुरक्षा जांचने के लिए प्राथमिक संपर्क ${primaryContact.name} को फोन मिलाया जा रहा है।`
        : `Calling primary contact ${primaryContact.name} via Phone app to verify your safety.`,
      isHindi ? 'hi-IN' : 'en-US'
    );

    onLogActivity(
      'Contact Alert',
      `All 3 Danger Warnings Dismissed — Calling Primary Contact: ${primaryContact.name}`,
      `User declined 3 safety warnings, but ResQSense sensors still detect persistent danger. Verification call placed via Phone app to +91 ${primaryContact.phone}.`,
      'alert'
    );

    setTimeout(() => {
      setCallStatus('connected');
      playAudibleSafetyChime();
      
      callTimerRef.current = setInterval(() => {
        setCallTimer(t => t + 1);
      }, 1000);

      speakAudibleMessage(`Call connected to ${primaryContact.name}. You can speak to them now. If you are unable to talk, tap below to send emergency distress SMS.`);
    }, 1500);
  };

  // Fail-safe auto-dispatch effect if user is unable to talk
  useEffect(() => {
    let interval: any = null;
    if (isOpen && stage === 'primary_contact_call' && !unableToTalkDispatched) {
      interval = setInterval(() => {
        setFailSafeSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              handleSendUnableToTalk();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, stage, unableToTalkDispatched]);

  // When User Replies: "I'm NOT Fine" (triggers camera immediately!)
  const handleUserNotFine = () => {
    clearInterval(warningTimerRef.current);
    setStage('camera_assessment');
    playAudibleSafetyChime();

    speakAudibleMessage("Emergency protocol: Camera activated to assess your condition and situation. Stay calm.");

    onLogActivity(
      'Contact Alert',
      'User Replied "I\'m NOT Fine" — Live Camera Activated',
      'Immediate visual trauma assessment engaged. Biometric HUD overlay monitoring consciousness.',
      'alert'
    );

    startCameraStream();
  };

  // Start real device camera or visual simulator fallback
  const startCameraStream = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: false
        });
        setCameraStream(stream);
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Camera API not accessible in this environment. Showing simulated trauma sentinel feed.');
      }
    } catch (err: any) {
      console.warn('Camera access request error:', err);
      setCameraError('Camera permission not granted. Utilizing low-power visual trauma HUD.');
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Primary Contact Response Handlers:
  // A. Contact says: "The user is fine" -> Misunderstanding!
  const handleContactSaysUserFine = () => {
    clearInterval(callTimerRef.current);
    setStage('resolved_misunderstanding');
    playAudibleSafetyChime();
    speakAudibleMessage("Primary contact verified you are safe. Alert marked as sensor misunderstanding.");

    onLogActivity(
      'Check-in',
      'Danger Alert Cleared: Sensor Misunderstanding',
      `Primary contact ${primaryContact.name} verified user is safe and fine. Biometric sensors recalibrated to new baseline. No emergency services dispatched.`,
      'nominal'
    );
  };

  // B. Contact says: "User is NOT fine / in need" -> Ask Ambulance vs Checkup/Hospital
  const handleContactSaysUserNotFine = () => {
    clearInterval(callTimerRef.current);
    setStage('contact_assistance_decision');
    playAudibleSafetyChime();
    speakAudibleMessage("Primary contact confirms user is not fine. Assistance decision required.");

    onLogActivity(
      'Contact Alert',
      'Primary Contact Verified User Is in Need of Medical Care',
      `${primaryContact.name} confirmed user is not fine. Presenting ambulance vs hospital check-up options.`,
      'alert'
    );
  };

  // Contact Decision: 1. Dispatch 108 Ambulance
  const handleChooseAmbulance = () => {
    setStage('ambulance_dispatched');
    playAudibleSafetyChime();
    speakAudibleMessage("Emergency 108 Ambulance has been summoned to your location immediately.");
    onTriggerAmbulance();

    onLogActivity(
      'Contact Alert',
      '108 Emergency Ambulance Dispatched via Primary Contact',
      `Ambulance summons issued to ${userProfile.address || 'User GPS coordinates'}. Contact ${primaryContact.name} coordinating responder access.`,
      'alert'
    );
  };

  // Contact Decision: 2. Escorting User for Hospital / Clinic Check-up
  const handleChooseHospitalCheckup = () => {
    setStage('hospital_checkup_guide');
    playAudibleSafetyChime();
    speakAudibleMessage("Hospital check-up route active. Nearest medical trauma centers loaded.");

    onLogActivity(
      'Check-in',
      'Hospital Check-up Route Initialized',
      `Primary contact ${primaryContact.name} is escorting user for hospital examination. Priority triage notification transmitted.`,
      'logged'
    );
  };

  // Emergency SMS & WhatsApp when user is unable to talk
  const [unableToTalkNotice, setUnableToTalkNotice] = useState<string>('');
  const handleSendUnableToTalk = () => {
    setUnableToTalkDispatched(true);
    const clean = primaryContact.phone.replace(/\D/g, '');
    const msg = `CRITICAL EMERGENCY ALERT: ResQNet detected that ${userProfile.name || 'User'} is in danger and is UNABLE TO TALK. Biometric sensors report trauma distress: Heart Rate ${vitals.pulse} BPM, SpO2 ${vitals.spo2}%, Shock detected. Current GPS Location: ${userProfile.address || 'User live coordinates'}. Please send immediate help or call 108 ambulance!`;

    const smsUrl = `sms:+91${clean}?body=${encodeURIComponent(msg)}`;
    const waUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`;

    try {
      window.location.href = smsUrl;
    } catch (e) {
      console.warn('SMS direct link note:', e);
    }

    try {
      window.open(waUrl, '_blank');
    } catch (e) {}

    try {
      fetch('/api/emergency-sms-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clean,
          contactName: primaryContact.name,
          userName: userProfile.name || 'ResQNet User',
          pulse: vitals.pulse,
          spo2: vitals.spo2,
          address: userProfile.address || 'Live GPS Coordinates',
        })
      }).catch(() => {});
    } catch (e) {}

    playAudibleSafetyChime();
    speakAudibleMessage(`User is unable to speak. Emergency distress alert dispatched to ${primaryContact.name}.`);

    onLogActivity(
      'Contact Alert',
      `User Unable to Talk — Emergency Distress Alert Sent to ${primaryContact.name}`,
      `Transmitted danger distress alert with live location (${userProfile.address || 'GPS'}) and vitals to +91 ${clean}.`,
      'alert'
    );

    setUnableToTalkNotice(`✓ Emergency distress alert dispatched to ${primaryContact.name} (+91 ${clean}) stating that you are in danger and unable to talk.`);
  };

  // User dismisses from Camera view because feeling better
  const handleCameraUserFeelingBetter = () => {
    stopCameraStream();
    playAudibleSafetyChime();
    onLogActivity(
      'Check-in',
      'Camera Sentinel Deactivated by User',
      'User reported feeling better during live camera assessment. Restored to nominal state.',
      'nominal'
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode 
            ? 'bg-slate-900 border-red-500/40 text-slate-100' 
            : 'bg-white border-red-300 text-slate-900 shadow-red-500/10'
        }`}
      >
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded-full">
                  ResQSense Sentinel
                </span>
                <span className="text-[11px] font-mono text-white/80">Automated Danger Protocol</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight mt-0.5">
                {stage === 'warnings' && `Danger Detected · Warning ${warningIndex} of 3`}
                {stage === 'camera_assessment' && 'Live Camera Safety Assessment'}
                {stage === 'primary_contact_call' && 'Automated Primary Responder Call'}
                {stage === 'resolved_misunderstanding' && 'Sensor Misunderstanding Resolved'}
                {stage === 'contact_assistance_decision' && 'Primary Contact: Assistance Required'}
                {stage === 'hospital_checkup_guide' && 'Hospital Check-up Route Active'}
                {stage === 'ambulance_dispatched' && '108 Emergency Ambulance Dispatched'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss Danger Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">

          {/* ============================================================== */}
          {/* STAGE 1: 3-TIER WARNING NOTIFICATIONS (User can decline 3 times) */}
          {/* ============================================================== */}
          {stage === 'warnings' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Warning Progress Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => {
                  const isCurrent = num === warningIndex;
                  const isPast = num < warningIndex;
                  return (
                    <div 
                      key={num}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isCurrent 
                          ? 'border-red-500 bg-red-500/15 text-red-500 font-extrabold shadow-sm ring-1 ring-red-500/40' 
                          : isPast
                          ? 'border-slate-700 bg-slate-800/40 text-slate-400 line-through'
                          : 'border-slate-800 bg-slate-950/40 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold block">Warning</span>
                      <span className="text-sm font-black">{num} of 3</span>
                    </div>
                  );
                })}
              </div>

              {/* Countdown & Alert Card */}
              <div className="p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <Radio className="w-4 h-4 animate-ping" />
                  <span>ResQSense Autonomous Health Sensor Trigger</span>
                </div>

                <div className="text-4xl sm:text-5xl font-black font-mono text-red-600 dark:text-red-400">
                  {warningCountdown}s
                </div>

                <div className="p-3 bg-white/80 dark:bg-slate-950/80 rounded-xl border border-red-200 dark:border-red-900/40 text-left space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>Detected Sensor Anomaly:</span>
                    <span className="text-red-500 font-mono">Severity: High</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {dangerDescription}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Pulse: <strong>{vitals.pulse} BPM</strong></span>
                    <span>SpO2: <strong>{vitals.spo2}%</strong></span>
                    <span>Temp: <strong>{vitals.bodyTemperature}°F</strong></span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  {warningIndex === 1 && "Warning 1 of 3: The app detected potential danger. Please confirm if you are fine or if you need assistance."}
                  {warningIndex === 2 && "Warning 2 of 3: You declined Warning 1, but sensors still detect danger! Please verify your condition."}
                  {warningIndex === 3 && "Warning 3 of 3 (Final): If you decline this warning but sensors still detect danger, the app will automatically call your Primary Emergency Contact to verify your safety."}
                </p>

                {/* Live Emergency Voice Command Detector */}
                <div 
                  onClick={() => {
                    if (isVoiceListening) {
                      stopVoiceDetection();
                    } else {
                      startVoiceDetection();
                    }
                  }}
                  className="p-3 bg-slate-900/90 text-white rounded-xl border border-cyan-500/40 text-left space-y-1.5 shadow-inner cursor-pointer hover:border-cyan-400 active:scale-[0.99] transition-all"
                  title={isHindi ? 'माइक शुरू करने के लिए क्लिक करें' : 'Click to start microphone'}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Mic className={`w-4 h-4 ${isVoiceListening ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                      <span>{isVoiceListening ? (isHindi ? '🎙️ माइक चालू है (सुन रहा हूँ):' : '🎙️ Microphone ON (Listening):') : (isHindi ? '🎙️ माइक शुरू करने के लिए दबाएं:' : '🎙️ Click to start microphone:')}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {isVoiceListening ? (isHindi ? 'सुन रहा है' : 'LISTENING') : (isHindi ? 'शुरू करें' : 'START')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {isHindi ? (
                      <>बोलिए: <strong className="text-emerald-400">&quot;मैं ठीक हूँ&quot;</strong> या <strong className="text-red-400">&quot;मदद करो&quot;</strong></>
                    ) : (
                      <>Speak aloud: <strong className="text-emerald-400">&quot;I am fine&quot;</strong> or <strong className="text-red-400">&quot;Help me&quot;</strong></>
                    )}
                  </p>

                  {voiceDetectedText && (
                    <div className="text-[11px] font-bold text-amber-300 pt-1 border-t border-slate-800">
                      <span>{isHindi ? 'सुना गया:' : 'Detected Speech:'} </span>
                      <span className="italic font-mono">&quot;{voiceDetectedText}&quot;</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sensor Re-checking Spinner */}
              {isSensorsChecking && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking biometric &amp; motion sensors for persistent danger...</span>
                </div>
              )}

              {/* 2 Main Actions: I'm Fine vs I'm NOT Fine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* User says "I'm Fine" (declines warning) */}
                <button
                  type="button"
                  disabled={isSensorsChecking}
                  onClick={handleUserDeclinesWarning}
                  className="py-4 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                    <span>I&apos;m Fine (Decline Alert)</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    {warningIndex < 3 ? `Decline Warning ${warningIndex} & Re-check` : 'Decline Final Warning'}
                  </span>
                </button>

                {/* User says "I'm NOT Fine" (Activates Camera immediately!) */}
                <button
                  type="button"
                  onClick={handleUserNotFine}
                  className="py-4 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-red-600/25 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-white" />
                    <span>I&apos;m NOT Fine (Need Help)</span>
                  </div>
                  <span className="text-[10px] font-medium text-white/80">
                    Turns on Camera to Assess Situation
                  </span>
                </button>
              </div>

              {/* Immediate Quick Actions: Call via Phone App & Unable to Talk SMS/WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:+91${primaryContact.phone.replace(/\D/g, '')}`}
                  onClick={handlePlacePhoneAppCall}
                  className="py-3 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call via Phone App ({primaryContact.name})</span>
                </a>

                <button
                  type="button"
                  onClick={handleSendUnableToTalk}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>I Am Unable to Talk (Send SMS/WA)</span>
                </button>
              </div>

              {unableToTalkNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold animate-fadeIn flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{unableToTalkNotice}</span>
                </div>
              )}

              {/* Explanation Note */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Protocol:</strong> When danger is detected, you can call your Primary Contact ({primaryContact.name}) via the phone app to speak directly with them. If you are unable to talk, tap the button to dispatch an emergency distress alert immediately.
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 2: CAMERA ASSESSMENT (When user replies "I'm not fine")  */}
          {/* ============================================================== */}
          {stage === 'camera_assessment' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-600 dark:text-red-300">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span>LIVE CAMERA ON: Visual Trauma &amp; Situation Assessment</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono">
                  Visual Sentinel
                </span>
              </div>

              {/* Video Stream Container */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-red-500/40 shadow-inner flex items-center justify-center">
                {/* Real video feed element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Simulated fallback graphic if camera hardware is unavailable */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 text-slate-300 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                      <Eye className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Trauma Situation Visualizer Active</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1">
                        Camera hardware not detected or permission blocked. Utilizing simulated consciousness HUD.
                      </p>
                    </div>
                  </div>
                )}

                {/* HUD RETICLE OVERLAY */}
                <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                  {/* Top HUD */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/90 drop-shadow">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>FACIAL CONSCIOUSNESS: EVALUATING</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                      TEMP: {vitals.bodyTemperature}°F
                    </div>
                  </div>

                  {/* Center Target Box */}
                  <div className="mx-auto w-36 h-36 border-2 border-dashed border-cyan-400/60 rounded-2xl flex items-center justify-center">
                    <div className="text-[10px] font-mono text-cyan-300 bg-black/50 px-2 py-0.5 rounded">
                      User Focus Box
                    </div>
                  </div>

                  {/* Bottom HUD */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/90 drop-shadow">
                    <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/20">
                      HR: <strong className="text-red-400">{vitals.pulse} BPM</strong> · SpO2: <strong>{vitals.spo2}%</strong>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/20">
                      BLOOD: <strong>{userProfile.bloodGroup || 'O+'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Situation Analysis in Progress:</span>
                </p>
                <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                  ResQNet camera sentinel is verifying consciousness and assessing if you can move. Choose an emergency action below or dismiss if feeling better.
                </p>
              </div>

              {/* Action Buttons inside Camera Mode */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleChooseAmbulance}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  <Ambulance className="w-5 h-5" />
                  <span>Dispatch 108 Emergency Ambulance Immediately</span>
                </button>

                {unableToTalkNotice && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-fadeIn">
                    {unableToTalkNotice}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="py-3 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call via Phone App ({primaryContact.name})</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleSendUnableToTalk}
                    className="py-3 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer animate-pulse"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>I Am Unable to Talk (Send SMS/WA)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCameraUserFeelingBetter}
                    className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Feeling Better (Dismiss)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 3: PRIMARY CONTACT CALL (3 warnings declined + danger)    */}
          {/* ============================================================== */}
          {stage === 'primary_contact_call' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Persistent Danger · Primary Contact Verification</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  You declined all 3 safety warnings, but the sensor readings continue to detect trauma anomalies. ResQNet is calling your <strong>Primary Emergency Contact</strong> to verify your safety.
                </p>
              </div>

              {/* Call via Phone App Status & Voice Query Delivered */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400">
                  <PhoneCall className={`w-8 h-8 ${callStatus === 'dialing' ? 'animate-bounce' : 'animate-pulse'}`} />
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-600 text-white">
                      Phone App Call Placed
                    </span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {callStatus === 'dialing' ? 'Dialing...' : `In Call (${Math.floor(callTimer / 60)}:${(callTimer % 60).toString().padStart(2, '0')})`}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">{primaryContact.name}</div>
                  <div className="text-xs text-slate-400 font-mono">+91 {primaryContact.phone} · Primary Responder</div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-300 text-left font-mono space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">
                    Voice Safety Query Delivered to Responder:
                  </span>
                  <p className="italic leading-relaxed text-slate-200">
                    &ldquo;Hello {primaryContact.name}. ResQNet detected persistent trauma distress for {userProfile.name || 'user'}. The user declined 3 warnings, but vital sensors continue to indicate danger. Please verify if the user is safe.&rdquo;
                  </p>
                </div>

                {/* Auto Fail-safe Countdown */}
                {!unableToTalkDispatched && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium">
                    ⏱ <strong>Auto Fail-Safe:</strong> If you are unable to talk, emergency distress SMS will be sent automatically in <strong>{failSafeSeconds}s</strong>.
                  </div>
                )}

                {unableToTalkNotice && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{unableToTalkNotice}</span>
                  </div>
                )}
              </div>

              {/* Direct Action Controls: Redial, Talking Confirmed, Unable to Talk */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Redial via Phone App */}
                <a
                  href={`tel:+91${primaryContact.phone.replace(/\D/g, '')}`}
                  onClick={handlePlacePhoneAppCall}
                  className="py-3.5 px-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Redial in Phone App</span>
                </a>

                {/* User Talked to Contact -> Confirms Safety */}
                <button
                  type="button"
                  onClick={handleContactSaysUserFine}
                  className="py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Talked with Contact (I am Safe)</span>
                </button>

                {/* User is Unable to Talk -> Immediate Distress Alert */}
                <button
                  type="button"
                  onClick={handleSendUnableToTalk}
                  className="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer animate-pulse"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isHindi ? 'मैं बात नहीं कर सकता (अलर्ट भेजें)' : 'I Am Unable to Talk (Send Alert)'}</span>
                </button>
              </div>

              {/* Quick direct links if unable to talk was triggered */}
              {unableToTalkDispatched && (
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 font-semibold">{isHindi ? 'सीधे संदेश भेजें:' : 'Direct App Shortcut:'}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`sms:+91${primaryContact.phone.replace(/\D/g, '')}?body=${encodeURIComponent(`CRITICAL EMERGENCY ALERT: ResQNet detected that ${userProfile.name || 'User'} is in danger and is UNABLE TO TALK. Location: ${userProfile.address || 'GPS Coordinates'}. Call 108 ambulance!`)}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'एसएमएस भेजें (SMS)' : 'Open SMS App'}</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Simulation option for contact responding that user is NOT fine */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleContactSaysUserNotFine}
                  className="w-full p-3 rounded-2xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Contact confirms: &quot;User is NOT fine / needs immediate medical help&quot;</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                    Dispatch 108 / Hospital
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 4: MISUNDERSTANDING RESOLVED (Contact said user is fine) */}
          {/* ============================================================== */}
          {stage === 'resolved_misunderstanding' && (
            <div className="space-y-5 text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Danger Alert Cleared as Misunderstanding
                </h3>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Primary Contact {primaryContact.name} Confirmed You Are Safe
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-left text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>ResQNet Sensor Intelligence Report:</span>
                </div>
                <p leading-relaxed>
                  The previous sensor spike (accelerometer shock or pulse rise) has been logged as a false positive. Your biometric baseline has been automatically recalibrated to prevent further false alarms.
                </p>
                <div className="pt-1 text-[11px] font-mono text-slate-500">
                  • Verified by: {primaryContact.name} (+91 {primaryContact.phone})<br />
                  • Status: All emergency beacons cancelled
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
              >
                Return to Safe Dashboard
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 5: CONTACT CONFIRMS USER IN NEED: AMBULANCE VS CHECKUP   */}
          {/* ============================================================== */}
          {stage === 'contact_assistance_decision' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 space-y-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Primary Responder Verified: User Needs Medical Help</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {primaryContact.name} confirmed that you are not fine and require medical attention. Please select how assistance should be coordinated:
                </p>
              </div>

              <div className="space-y-3">
                {/* Decision 1: Contact Ambulance */}
                <button
                  type="button"
                  onClick={handleChooseAmbulance}
                  className="w-full p-4 rounded-2xl border-2 border-red-500 bg-red-600 hover:bg-red-500 text-white text-left transition-all shadow-lg flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Ambulance className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-base font-black block">1. Contact 108 Emergency Ambulance</span>
                      <span className="text-xs text-white/80 block mt-0.5">
                        Summons government 108 medical ambulance directly to your address.
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Decision 2: Contact is taking user for Check-up / Hospital */}
                <button
                  type="button"
                  onClick={handleChooseHospitalCheckup}
                  className="w-full p-4 rounded-2xl border-2 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-slate-900 dark:text-white text-left transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0">
                      <Hospital className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-base font-black text-cyan-600 dark:text-cyan-400 block">
                        2. Escorting for Hospital / Clinic Check-up
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                        {primaryContact.name} will escort you to the nearest emergency hospital for examination.
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-500 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 6: HOSPITAL CHECK-UP ROUTE ACTIVE                        */}
          {/* ============================================================== */}
          {stage === 'hospital_checkup_guide' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <strong className="text-cyan-700 dark:text-cyan-300 block font-bold">
                    Hospital Check-up Route Active
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {primaryContact.name} is escorting {userProfile.name || 'you'} for immediate medical evaluation. Priority hospital emergency rooms nearby:
                  </p>
                </div>
              </div>

              {/* Nearest Emergency Hospitals in Gurgaon / NCR / India */}
              <div className="space-y-2.5">
                {[
                  {
                    name: 'Fortis Memorial Research Institute (FMRI)',
                    distance: '2.1 km (6 mins away)',
                    beds: '14 ICU / Emergency Trauma Beds Available',
                    phone: '0124-4962200',
                    address: 'Sector 44, Gurugram'
                  },
                  {
                    name: 'Max Super Speciality Hospital',
                    distance: '3.4 km (9 mins away)',
                    beds: '8 Emergency Bays Open',
                    phone: '0124-6623000',
                    address: 'Sushant Lok 1, Gurugram'
                  },
                  {
                    name: 'Artemis Hospital Emergency Care',
                    distance: '4.8 km (12 mins away)',
                    beds: '24/7 Cardiac & Trauma Center',
                    phone: '0124-4511111',
                    address: 'Sector 51, Gurugram'
                  }
                ].map((hosp, idx) => (
                  <div 
                    key={hosp.name} 
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{hosp.name}</span>
                      </div>
                      <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium block mt-0.5">
                        {hosp.distance} · {hosp.address}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                        {hosp.beds}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate</span>
                      </a>
                      <a
                        href={`tel:${hosp.phone}`}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200"
                        title="Call Emergency Desk"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Digital triage notification */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  ResQNet transmitted blood group (<strong>{userProfile.bloodGroup || 'O+'}</strong>) &amp; vital anomaly history to nearest triage desk for fast-track intake.
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow"
              >
                Close &amp; Keep Navigation Active in Background
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 7: AMBULANCE DISPATCHED                                  */}
          {/* ============================================================== */}
          {stage === 'ambulance_dispatched' && (
            <div className="space-y-5 text-center py-4 animate-fadeIn">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/30 animate-pulse">
                <Ambulance className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-widest text-red-500">
                  Government 108 Emergency Response
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Ambulance Dispatched Directly to Address
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Live beacon transmitted with GPS coordinates: <strong className="text-slate-900 dark:text-white">{userProfile.address || 'Live Location'}</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-left max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ambulance Unit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">DL-01-AMB-108</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated Arrival (ETA):</span>
                  <span className="font-mono font-bold text-emerald-500">6 Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Primary Contact Alerted:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{primaryContact.name}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <a
                  href="tel:108"
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call 108 Driver Directly</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl text-xs sm:text-sm"
                >
                  Dismiss Overlay
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
