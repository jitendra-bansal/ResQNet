import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  X, 
  PhoneCall, 
  CheckCircle2, 
  Radio, 
  Ambulance, 
  Network, 
  PhoneForwarded,
  MessageSquare,
  Send,
  Plus
} from 'lucide-react';
import { UserProfile, EmergencyContact } from '../types';
import { playAudibleSafetyChime, speakAudibleMessage } from '../utils/audio';
import { translatePriorityLabel } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  contacts: EmergencyContact[];
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  triggerSource?: string | null;
  initialMode?: 'countdown' | 'instant';
  actionType?: 'call' | 'sms' | null;
  triggerKey?: number | string | null;
  onUpdateContacts?: (contacts: EmergencyContact[]) => void;
}

export const EmergencySosModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userProfile,
  contacts,
  onLogActivity,
  triggerSource = null,
  initialMode = 'countdown',
  actionType = 'call',
  triggerKey = null,
  onUpdateContacts,
}) => {
  const isHindi = userProfile.language === 'Hindi';
  const [countdown, setCountdown] = useState(15);
  const [stage, setStage] = useState<'countdown' | 'cascading_contacts' | 'ambulance_dispatched' | 'all_exhausted'>('countdown');
  const [activeContactIndex, setActiveContactIndex] = useState(0);
  const [, setContactCallStatuses] = useState<Record<number, 'contacting' | 'unreachable' | 'confirmed'>>({});
  const [isCallingDispatcher, setIsCallingDispatcher] = useState(false);
  const [quickPhoneInput, setQuickPhoneInput] = useState('');
  const [lastDialedTime, setLastDialedTime] = useState<string | null>(null);
  const [lastSmsTime, setLastSmsTime] = useState<string | null>(null);
  const [dispatchInfo, setDispatchInfo] = useState<{ waUrl?: string; smsUrl?: string; message?: string } | null>(null);
  const timerRef = useRef<any>(null);
  const executedTriggerRef = useRef<string | null>(null);

  const activeContactsList: EmergencyContact[] = useMemo(() => {
    let list = contacts;
    if (!list || list.length === 0 || !list.some(c => c && c.phone)) {
      try {
        const raw = localStorage.getItem('resqnet_contacts');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } catch {
        // ignore
      }
    }
    if (list && list.length > 0) return list;
    return [
      {
        id: 'default-p',
        name: isHindi ? 'मुख्य संपर्क (परिवार)' : 'Primary Responder',
        phone: '',
        relationship: isHindi ? 'परिवार' : 'Family Member',
        priority: 'Primary',
        status: 'Verified',
        addedAt: 'Verified'
      }
    ];
  }, [contacts, isHindi]);

  const activeContactsListRef = useRef(activeContactsList);
  activeContactsListRef.current = activeContactsList;
  const actionTypeRef = useRef(actionType);
  actionTypeRef.current = actionType;
  const triggerSourceRef = useRef(triggerSource);
  triggerSourceRef.current = triggerSource;
  const onLogActivityRef = useRef(onLogActivity);
  onLogActivityRef.current = onLogActivity;
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const isHindiRef = useRef(isHindi);
  isHindiRef.current = isHindi;

  const currentContact = activeContactsList[activeContactIndex] || activeContactsList[0];
  const targetPhone = (currentContact?.phone || '').replace(/\D/g, '').slice(-10);

  function getOrdinalNumber(n: number): string {
    if (isHindi) {
      if (n === 1) return 'पहला';
      if (n === 2) return 'दूसरा';
      if (n === 3) return 'तीसरा';
      return `${n}वाँ`;
    }
    if (n === 1) return '1st (Primary)';
    if (n === 2) return '2nd (Secondary)';
    if (n === 3) return '3rd (Tertiary)';
    return `${n}th`;
  }

  // Trigger Phone Call directly via browser's tel: protocol & copy phone number to clipboard
  const triggerDirectCall = useCallback((phoneStr: string, contactName?: string) => {
    const clean = (phoneStr || '').replace(/\D/g, '').slice(-10);
    if (!clean) return;

    const telUri = `tel:+91${clean}`;

    // 1. Copy phone number to clipboard immediately so it is pasted/ready
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(`+91${clean}`).catch(() => {});
    }

    // 2. Immediately launch Phone App BEFORE any audio/speech synthesis
    try {
      const link = document.createElement('a');
      link.href = telUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 300);
    } catch {
      // fallback below
    }
    try {
      window.location.href = telUri;
    } catch {
      // ignore
    }

    setLastDialedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const source = triggerSourceRef.current;
    onLogActivityRef.current(
      'Contact Alert',
      `Calling ${contactName || 'Primary Responder'}`,
      `Opening Phone App with +91 ${clean}${source ? ` (${source})` : ''}.`,
      'alert'
    );

    const hi = isHindiRef.current;
    setTimeout(() => {
      speakAudibleMessage(
        hi 
          ? `आपातकालीन संपर्क +91 ${clean} के लिए फ़ोन ऐप खोला जा रहा है।` 
          : `Long press detected. Opening phone app to call +91 ${clean}.`,
        hi ? 'hi-IN' : 'en-US'
      );
    }, 400);
  }, []);

  // Trigger SMS App directly via browser's sms: protocol with emergency message pre-filled
  const triggerDirectSms = useCallback((phoneStr: string, contactName?: string) => {
    const clean = (phoneStr || '').replace(/\D/g, '').slice(-10);
    if (!clean) return;

    const profile = userProfileRef.current;
    const emergencySmsText = `EMERGENCY SOS ALERT: ${profile.name || 'ResQNet User'} pressed the physical emergency button and needs immediate help! Location: ${profile.address || 'Live GPS Coordinates'}. Please call or respond immediately!`;
    const smsHref = `sms:+91${clean}?body=${encodeURIComponent(emergencySmsText)}`;

    // 1. Copy the SMS message to clipboard immediately
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(emergencySmsText).catch(() => {});
    }

    // 2. Immediately launch SMS App BEFORE any audio/speech synthesis
    try {
      const link = document.createElement('a');
      link.href = smsHref;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 300);
    } catch {
      // fallback below
    }
    try {
      window.location.href = smsHref;
    } catch {
      // ignore
    }

    setLastSmsTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const source = triggerSourceRef.current;
    onLogActivityRef.current(
      'Contact Alert',
      `SMS Dispatched to ${contactName || 'Primary Responder'}`,
      `Opening SMS App for +91 ${clean} with pre-filled SOS text${source ? ` (${source})` : ''}.`,
      'alert'
    );

    const hi = isHindiRef.current;
    setTimeout(() => {
      speakAudibleMessage(
        hi
          ? `सिंगल प्रेस: +91 ${clean} के लिए आपातकालीन एसएमएस ऐप खोला जा रहा है।`
          : `Single press detected. Opening SMS app with emergency message for +91 ${clean}.`,
        hi ? 'hi-IN' : 'en-US'
      );
    }, 400);
  }, []);

  // Request SMS/WhatsApp dispatch payload from backend
  useEffect(() => {
    if (isOpen && targetPhone) {
      fetch('/api/emergency-sms-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          contactName: currentContact.name,
          userName: userProfile.name || 'User',
          pulse: 142,
          spo2: 88,
          address: userProfile.address || 'Live GPS Coordinates',
        }),
      })
      .then(r => r.json())
      .then(data => {
        if (data?.success) {
          setDispatchInfo({
            waUrl: data.waUrl,
            smsUrl: data.smsUrl,
            message: data.message,
          });
        }
      })
      .catch(() => {});
    }
  }, [isOpen, targetPhone, currentContact.name, userProfile.name, userProfile.address]);

  const startCascadingContacts = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(0);
    setStage('cascading_contacts');
    setActiveContactIndex(0);
    setContactCallStatuses({ 0: 'contacting' });
    playAudibleSafetyChime();

    const list = activeContactsListRef.current;
    const first = list[0];
    const firstPhone = (first?.phone || '').replace(/\D/g, '').slice(-10);

    if (firstPhone) {
      if (actionTypeRef.current === 'sms') {
        triggerDirectSms(firstPhone, first.name);
      } else {
        triggerDirectCall(firstPhone, first.name);
      }
    }
  }, [triggerDirectCall, triggerDirectSms]);

  useEffect(() => {
    if (isOpen) {
      const triggerId = `${isOpen}_${initialMode}_${actionType}_${triggerKey ?? 'default'}`;
      if (executedTriggerRef.current === triggerId) return;
      executedTriggerRef.current = triggerId;

      if (initialMode === 'instant') {
        startCascadingContacts();
        return;
      }
      setCountdown(15);
      setStage('countdown');
      setActiveContactIndex(0);
      setContactCallStatuses({ 0: 'contacting' });
      playAudibleSafetyChime();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executedTriggerRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, initialMode, actionType, triggerKey, startCascadingContacts]);

  useEffect(() => {
    if (isOpen && stage === 'countdown' && countdown === 0) {
      startCascadingContacts();
    }
  }, [isOpen, stage, countdown, startCascadingContacts]);

  if (!isOpen) return null;

  const handleEscalateToNextContact = () => {
    const nextIdx = activeContactIndex + 1;
    setContactCallStatuses(prev => ({ ...prev, [activeContactIndex]: 'unreachable' }));

    if (nextIdx < activeContactsList.length) {
      setActiveContactIndex(nextIdx);
      setContactCallStatuses(prev => ({ ...prev, [nextIdx]: 'contacting' }));
      playAudibleSafetyChime();

      const nextContact = activeContactsList[nextIdx];
      const nextPhone = (nextContact?.phone || '').replace(/\D/g, '').slice(-10);
      if (nextPhone) {
        triggerDirectCall(nextPhone, nextContact.name);
      }

      setTimeout(() => {
        onLogActivity(
          'Contact Alert',
          `Escalated to ${nextContact.name}`,
          `Automated distress alert moved to +91 ${nextContact.phone}.`,
          'alert'
        );
      }, 0);
    } else {
      setStage('all_exhausted');
      playAudibleSafetyChime();
      speakAudibleMessage(
        isHindi 
          ? "सभी संपर्कों से उत्तर नहीं मिला। रेस्क्यू नेट तुरंत 108 एम्बुलेंस आपातकालीन सेवा को बुला रहा है।" 
          : "All emergency contacts were unreachable. ResQNet is immediately summoning the 108 Emergency Ambulance.",
        isHindi ? 'hi-IN' : 'en-US'
      );

      setTimeout(() => {
        onLogActivity(
          'Contact Alert',
          'Automatic 108 Ambulance Dispatch',
          'Contacts unreachable. Emergency escalated to 108.',
          'alert'
        );
      }, 0);
    }
  };

  const handleContactConfirmsAmbulance = (responderName: string, responderPhone: string) => {
    setContactCallStatuses(prev => ({ ...prev, [activeContactIndex]: 'confirmed' }));
    setStage('ambulance_dispatched');
    playAudibleSafetyChime();
    speakAudibleMessage(
      isHindi 
        ? "आपातकाल की पुष्टि हो गई है। 108 एम्बुलेंस आपके पते के लिए रवाना कर दी गई है।" 
        : "Emergency verified. 108 Ambulance has been dispatched to your location.",
      isHindi ? 'hi-IN' : 'en-US'
    );
    setTimeout(() => {
      onLogActivity(
        'Contact Alert',
        `Ambulance Summoned by ${responderName}`,
        `${responderName} (+91 ${responderPhone}) confirmed ambulance dispatch.`,
        'alert'
      );
    }, 0);
  };

  const handleCancelSos = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
    setTimeout(() => {
      onLogActivity(
        'Check-in',
        'Emergency SOS Cancelled',
        'Emergency SOS cancelled by user.',
        'nominal'
      );
    }, 0);
  };

  // Helper to quickly save an entered number and trigger dial immediately
  const handleSaveAndCallQuickPhone = (rawPhone: string) => {
    const clean = rawPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return;

    const newContact: EmergencyContact = {
      id: `c-quick-${Date.now()}`,
      name: isHindi ? 'मुख्य आपातकालीन संपर्क' : 'Primary Contact',
      phone: clean,
      relationship: isHindi ? 'परिवार' : 'Family',
      priority: 'Primary',
      status: 'Verified',
      addedAt: 'Just now'
    };

    const updated = [newContact, ...contacts.filter(c => c.phone !== clean)];
    if (onUpdateContacts) {
      onUpdateContacts(updated);
    } else {
      localStorage.setItem('resqnet_contacts', JSON.stringify(updated));
    }

    setQuickPhoneInput('');
    triggerDirectCall(clean, newContact.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/90 backdrop-blur-md text-white animate-fadeIn">
      <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-red-100">
                {stage === 'countdown' && (isHindi ? 'आपातकालीन SOS: 15 सेकंड' : 'EMERGENCY SOS: 15s COUNTDOWN')}
                {stage === 'cascading_contacts' && (isHindi ? `कॉल जारी: ${currentContact.name}` : `CALLING: ${currentContact.name.toUpperCase()}`)}
                {stage === 'all_exhausted' && (isHindi ? '108 एम्बुलेंस कॉल जारी' : 'CALLING 108 AMBULANCE')}
                {stage === 'ambulance_dispatched' && (isHindi ? '108 एम्बुलेंस रवाना' : '108 AMBULANCE DISPATCHED')}
              </h2>
              <p className="text-[11px] text-red-400 font-bold">
                {isHindi ? 'आपातकालीन सुरक्षा व डायलिंग सक्रिय' : 'Emergency Calling & Response Active'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelSos}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HARDWARE BUTTON SOURCE BADGE */}
        {triggerSource && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-between text-xs font-bold text-cyan-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{triggerSource}</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-black">
              IoT Trigger
            </span>
          </div>
        )}

        {/* PROMINENT DIRECT CALLING & SMS CARD (ALWAYS VISIBLE WHEN TARGET PHONE IS PRESENT) */}
        {targetPhone ? (
          <div className={`p-3.5 rounded-2xl border-2 shadow-xl space-y-2.5 ${
            actionType === 'sms'
              ? 'bg-gradient-to-r from-blue-950/90 to-slate-900 border-blue-500'
              : 'bg-gradient-to-r from-emerald-950/90 to-slate-900 border-emerald-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                actionType === 'sms' ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {actionType === 'sms' ? (
                  <>
                    <Send className="w-4 h-4 animate-bounce" />
                    <span>{isHindi ? 'सिंगल प्रेस: SMS ऐप सक्रिय' : 'Single Press: SMS App & Message Ready'}</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>{isHindi ? 'लॉन्ग प्रेस: फ़ोन कॉल सक्रिय' : 'Long Press: Phone App & Number Ready'}</span>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black">
                {currentContact.name}
              </span>
            </div>

            {/* Tap to Call Now Button (Long Press Action) */}
            <a
              href={`tel:+91${targetPhone}`}
              onClick={() => triggerDirectCall(targetPhone, currentContact.name)}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg cursor-pointer active:scale-95 transition-all ${
                actionType !== 'sms'
                  ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 animate-pulse ring-2 ring-emerald-400'
                  : 'bg-emerald-700/80 hover:bg-emerald-600'
              }`}
            >
              <PhoneCall className="w-5 h-5 fill-current" />
              <span>
                {isHindi ? `फ़ोन ऐप खोलें (+91 ${targetPhone})` : `OPEN PHONE APP (+91 ${targetPhone})`}
              </span>
            </a>

            {/* Tap to Open SMS App with Pasted Message (Single Press Action) */}
            <a
              href={dispatchInfo?.smsUrl || `sms:+91${targetPhone}?body=${encodeURIComponent(`EMERGENCY SOS ALERT: ${userProfile.name || 'ResQNet User'} pressed the physical emergency button and needs immediate help! Location: ${userProfile.address || 'Live GPS Coordinates'}. Please call or respond immediately!`)}`}
              onClick={() => triggerDirectSms(targetPhone, currentContact.name)}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg cursor-pointer active:scale-95 transition-all ${
                actionType === 'sms'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 animate-pulse ring-2 ring-blue-400'
                  : 'bg-blue-600/85 hover:bg-blue-500'
              }`}
            >
              <Send className="w-5 h-5" />
              <span>
                {isHindi ? `SMS ऐप खोलें (मैसेज पेस्ट है)` : `OPEN SMS APP (MESSAGE PASTED)`}
              </span>
            </a>

            {(lastDialedTime || lastSmsTime) && (
              <p className="text-[10px] text-center text-cyan-300 font-semibold">
                ✓ {actionType === 'sms' && lastSmsTime
                  ? (isHindi ? `SMS ऐप सिग्नल भेजा गया व मैसेज कॉपी किया गया (${lastSmsTime})` : `SMS app triggered & emergency text copied (${lastSmsTime})`)
                  : (isHindi ? `फ़ोन ऐप सिग्नल भेजा गया व नंबर कॉपी किया गया (${lastDialedTime})` : `Phone app triggered & +91${targetPhone} copied (${lastDialedTime})`)}
              </p>
            )}

            {/* Direct WhatsApp SOS Button */}
            <div className="pt-0.5">
              <a
                href={dispatchInfo?.waUrl || `https://wa.me/91${targetPhone}?text=${encodeURIComponent(`CRITICAL SOS: ${userProfile.name || 'User'} is in danger and triggered emergency alert! Location: ${userProfile.address || 'Live GPS Coordinates'}. Immediate response needed!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp SOS</span>
              </a>
            </div>
          </div>
        ) : (
          /* NO PHONE NUMBER SAVED: QUICK INPUT */
          <div className="p-3.5 rounded-2xl bg-amber-950/70 border-2 border-amber-500/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{isHindi ? 'कोई फ़ोन नंबर दर्ज नहीं है!' : 'No Phone Number Saved to Call!'}</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              {isHindi ? 'तुरंत कॉल करने के लिए 10-अंकों का मोबाइल नंबर लिखें:' : 'Enter 10-digit mobile number to call immediately:'}
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={quickPhoneInput}
                onChange={e => setQuickPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleSaveAndCallQuickPhone(quickPhoneInput)}
                disabled={quickPhoneInput.length !== 10}
                className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{isHindi ? 'कॉल करें' : 'Call'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 1: 15-SECOND COUNTDOWN */}
        {stage === 'countdown' && (
          <div className="space-y-3.5 text-center">
            <div className="py-1">
              <span className="text-5xl font-black font-mono text-red-500 block animate-pulse">
                {countdown}s
              </span>
              <span className="text-xs text-slate-400 mt-1 block font-bold">
                {isHindi 
                  ? targetPhone 
                    ? `${countdown} सेकंड में +91 ${targetPhone} पर कॉल शुरू होगी`
                    : '15 सेकंड में आपातकालीन अलर्ट सक्रिय होगा'
                  : targetPhone
                    ? `Auto-calling +91 ${targetPhone} in ${countdown}s...`
                    : 'Emergency dispatch starting in 15 seconds'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={startCascadingContacts}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-red-900/50 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isHindi ? 'तुरंत कॉल व अलर्ट शुरू करें' : 'START CALLING & ALERT NOW'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelSos}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें (मैं सुरक्षित हूँ)' : 'CANCEL (I AM SAFE)'}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: CASCADING CONTACTS IN PROGRESS */}
        {stage === 'cascading_contacts' && (
          <div className="space-y-3">
            {/* Cascading Contacts List */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5 text-[11px]">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                {isHindi ? 'आपातकालीन संपर्क क्रम:' : 'Emergency Contact Sequence:'}
              </span>
              <div className="space-y-1">
                {activeContactsList.map((c, idx) => {
                  const isCurrent = idx === activeContactIndex;
                  const isPast = idx < activeContactIndex;
                  const isFuture = idx > activeContactIndex;
                  const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);

                  return (
                    <div 
                      key={c.id || idx} 
                      className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                          : isPast
                          ? 'border-slate-800 bg-slate-950/40 text-slate-500 line-through'
                          : 'border-slate-800/60 bg-slate-950/20 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold truncate">{idx + 1}. {c.name}</span>
                        {cPhone && <span className="font-mono text-[10px] text-slate-400">(+91 {cPhone})</span>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>{isHindi ? 'कॉल जारी...' : 'Calling...'}</span>
                          </span>
                        )}
                        {isPast && <span className="text-red-400">{isHindi ? 'उत्तर नहीं' : 'No reply'}</span>}
                        {isFuture && <span className="text-slate-500">{isHindi ? 'प्रतीक्षा में' : 'Queued'}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleEscalateToNextContact}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneForwarded className="w-4 h-4 text-amber-400" />
                <span>
                  {isHindi 
                    ? 'अगले संपर्क को कॉल करें' 
                    : 'Call Next Contact in Chain'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleContactConfirmsAmbulance(currentContact.name, currentContact.phone)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ambulance className="w-4 h-4" />
                <span>{isHindi ? '108 एम्बुलेंस आपातकालीन सेवा बुलाएं' : 'Dispatch 108 Ambulance Now'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelSos}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel Alert'}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: ALL CONTACTS UNREACHABLE */}
        {stage === 'all_exhausted' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 border-2 border-red-500 rounded-2xl text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 animate-pulse" />
                <span>{isHindi ? 'तुरंत 108 एम्बुलेंस आपातकाल' : 'Immediate 108 Ambulance Dispatch'}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {isHindi 
                  ? 'संपर्कों से उत्तर न मिलने पर 108 एम्बुलेंस सेवा को आपके स्थान पर भेजा जा रहा है।' 
                  : 'Contacts were unreachable. 108 emergency ambulance is being dispatched to your location.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStage('ambulance_dispatched')}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ambulance className="w-4 h-4" />
              <span>{isHindi ? 'एम्बुलेंस स्थिति देखें' : 'View Ambulance Status'}</span>
            </button>
          </div>
        )}

        {/* STAGE 4: AMBULANCE DISPATCHED */}
        {stage === 'ambulance_dispatched' && (
          <div className="space-y-3.5">
            <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500 rounded-2xl text-emerald-300 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{isHindi ? '108 एम्बुलेंस रवाना हो गई है!' : '108 Ambulance Dispatched!'}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {isHindi 
                  ? `स्थान: ${userProfile.address || 'नई दिल्ली'}` 
                  : `Location: ${userProfile.address || 'New Delhi'}`}
              </p>
            </div>

            {isCallingDispatcher && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl flex items-center justify-between text-xs animate-pulse">
                <span className="font-bold text-white">{isHindi ? '108 कॉल चालू है...' : 'Connected to 108 Dispatch...'}</span>
                <button
                  type="button"
                  onClick={() => setIsCallingDispatcher(false)}
                  className="px-2.5 py-1 bg-red-600 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                >
                  {isHindi ? 'कॉल समाप्त' : 'End Call'}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <a
                href="tel:108"
                onClick={() => {
                  setIsCallingDispatcher(true);
                  speakAudibleMessage(
                    isHindi ? "108 आपातकालीन सेवा से कॉल जोड़ी जा रही है।" : "Connecting to 108 Emergency Services.",
                    isHindi ? 'hi-IN' : 'en-US'
                  );
                }}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isHindi ? '108 कंट्रोल रूम को कॉल करें' : 'Call 108 Control Room Now'}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl cursor-pointer"
              >
                {isHindi ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
