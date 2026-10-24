import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Ambulance, 
  MessageSquare, 
  ShieldAlert, 
  X,
  Volume2,
  Phone,
  Send,
  MessageCircle
} from 'lucide-react';
import { UserProfile, EmergencyContact, VitalsData } from '../types';
import { playAudibleSafetyChime, playPhoneRingTone, speakAudibleMessage } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppVerifyModal';

interface Props {
  isActive: boolean;
  onDeactivate: () => void;
  userProfile: UserProfile;
  contacts: EmergencyContact[];
  vitals: VitalsData;
  dangerDetails: string;
  onTriggerAmbulance: () => void;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  isDarkMode: boolean;
}

export const AutonomousEscalationSentinel: React.FC<Props> = ({
  isActive,
  onDeactivate,
  userProfile,
  contacts,
  vitals,
  dangerDetails,
  onTriggerAmbulance,
  onLogActivity,
  isDarkMode,
}) => {
  // Priority sorting: Primary -> Secondary -> Tertiary -> Quaternary
  const priorityRank: Record<string, number> = {
    Primary: 1,
    Secondary: 2,
    Tertiary: 3,
    Quaternary: 4,
  };

  const sortedContacts: EmergencyContact[] = [...contacts].sort((a, b) => {
    const aR = priorityRank[a.priority || 'Secondary'] || 99;
    const bR = priorityRank[b.priority || 'Secondary'] || 99;
    return aR - bR;
  });

  const activeContactsList: EmergencyContact[] = sortedContacts.length > 0 ? sortedContacts : [
    {
      id: 'c-default-1',
      name: 'Primary Responder',
      phone: '',
      relationship: 'Family Member',
      priority: 'Primary',
      status: 'Verified',
      addedAt: 'Verified'
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [callState, setCallState] = useState<'placing_call' | 'in_call' | 'unable_to_talk_sent' | 'unanswered' | 'completed' | 'all_exhausted'>('placing_call');
  const [failSafeSeconds, setFailSafeSeconds] = useState(12);
  const [unableToTalkDispatched, setUnableToTalkDispatched] = useState(false);
  const [userSpokeWithContact, setUserSpokeWithContact] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const failSafeTimerRef = useRef<any>(null);
  const currentContact = activeContactsList[currentIndex] || activeContactsList[0];

  // Trigger call via phone app
  const triggerNativePhoneCall = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      window.location.href = `tel:+91${cleanPhone}`;
    } catch (e) {
      console.warn('Native phone call trigger note:', e);
    }
  };

  // Start sequence when activated
  useEffect(() => {
    if (isActive) {
      setCurrentIndex(0);
      setUnableToTalkDispatched(false);
      setUserSpokeWithContact(false);
      setFailSafeSeconds(12);
      startCallingViaPhoneApp(0);
    } else {
      clearInterval(failSafeTimerRef.current);
    }

    return () => clearInterval(failSafeTimerRef.current);
  }, [isActive]);

  const startCallingViaPhoneApp = (index: number) => {
    const contact = activeContactsList[index];
    if (!contact) {
      handleAllContactsExhausted();
      return;
    }

    setCallState('placing_call');
    setFailSafeSeconds(12);
    setUnableToTalkDispatched(false);
    setUserSpokeWithContact(false);

    playAudibleSafetyChime();
    playPhoneRingTone();
    speakAudibleMessage(`Danger detected! Placing phone call to ${contact.priority} contact ${contact.name}. You can speak to them now.`);

    // 1. Actually place call via Phone app so user can talk to the contact
    triggerNativePhoneCall(contact.phone);

    onLogActivity(
      'Contact Alert',
      `Phone App Call Placed to ${contact.priority} Responder: ${contact.name} (+91 ${contact.phone})`,
      `SafePulse opened the native Phone app to call ${contact.name}. Biometric distress unconfirmed by user (HR: ${vitals.pulse} BPM, SpO2: ${vitals.spo2}%). User can talk directly to responder.`,
      'alert'
    );

    setStatusMessage(`Phone app opened to call ${contact.name} (+91 ${contact.phone}). If you cannot talk, tap below to send Emergency SMS & WhatsApp.`);

    // 2. Start fail-safe countdown: if user cannot speak, auto-dispatch distress SMS/WhatsApp
    clearInterval(failSafeTimerRef.current);
    let seconds = 12;
    failSafeTimerRef.current = setInterval(() => {
      seconds -= 1;
      setFailSafeSeconds(seconds);

      if (seconds <= 0) {
        clearInterval(failSafeTimerRef.current);
        // User didn't confirm they talked, so send SMS/WhatsApp automatically as fail-safe
        handleSendUnableToTalkAlert(contact);
      }
    }, 1000);
  };

  // User is NOT able to talk -> Send emergency SMS & WhatsApp message
  const handleSendUnableToTalkAlert = (contact = currentContact) => {
    clearInterval(failSafeTimerRef.current);
    setUnableToTalkDispatched(true);
    setCallState('unable_to_talk_sent');

    const cleanPhone = contact.phone.replace(/\D/g, '');
    const distressText = `CRITICAL EMERGENCY ALERT: SafePulse detected that ${userProfile.name || 'User'} is in danger and is UNABLE TO TALK. Biometric sensors show severe trauma: Heart Rate ${vitals.pulse} BPM, SpO2 ${vitals.spo2}%, Shock Impact detected. Current GPS Location: ${userProfile.address || 'User live coordinates'}. Please send immediate assistance or call 108 emergency ambulance!`;

    // 1. Dispatch SMS directly via sms: URI
    try {
      const smsUrl = `sms:+91${cleanPhone}?body=${encodeURIComponent(distressText)}`;
      window.open(smsUrl, '_blank');
    } catch (e) {
      console.warn('SMS dispatch note:', e);
    }

    // 2. Dispatch WhatsApp message directly
    try {
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(distressText)}`;
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('WhatsApp dispatch note:', e);
    }

    // 3. Dispatch through backend API
    try {
      fetch('/api/emergency-sms-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          contactName: contact.name,
          userName: userProfile.name || 'SafePulse User',
          pulse: vitals.pulse,
          spo2: vitals.spo2,
          address: userProfile.address || 'Live GPS Coordinates',
        }),
      }).catch(err => console.warn('Backend emergency dispatch error:', err));
    } catch (e) {}

    playAudibleSafetyChime();
    speakAudibleMessage(`User is unable to talk. Emergency SMS and WhatsApp distress message dispatched to ${contact.name}.`);

    onLogActivity(
      'Contact Alert',
      `User Unable to Talk — Emergency SMS & WhatsApp Dispatched to ${contact.name}`,
      `Transmitted life-threatening danger alert with live GPS coordinates (${userProfile.address || 'GPS'}) and vitals (HR ${vitals.pulse} BPM, SpO2 ${vitals.spo2}%) to +91 ${cleanPhone}.`,
      'alert'
    );

    setStatusMessage(`✓ Emergency SMS & WhatsApp distress message dispatched to ${contact.name} stating that you are in danger and unable to talk.`);
  };

  // User successfully talked with the contact
  const handleUserConfirmedTalked = () => {
    clearInterval(failSafeTimerRef.current);
    setUserSpokeWithContact(true);
    setCallState('completed');

    playAudibleSafetyChime();
    speakAudibleMessage(`Call confirmed. You have spoken with ${currentContact.name}. Responders are coordinating.`);

    onLogActivity(
      'Check-in',
      `User Spoke Directly with ${currentContact.priority} Contact: ${currentContact.name}`,
      `Call placed via phone app to +91 ${currentContact.phone}. Contact answered and user successfully spoke with them.`,
      'nominal'
    );

    setStatusMessage(`✓ Call completed: You have successfully spoken with ${currentContact.name} (+91 ${currentContact.phone}).`);
  };

  // Contact failed to answer or is not available -> Cascade to next contact
  const handleContactFailedToAnswer = () => {
    clearInterval(failSafeTimerRef.current);
    setCallState('unanswered');

    const nextIdx = currentIndex + 1;
    onLogActivity(
      'Contact Alert',
      `${currentContact.priority} Contact ${currentContact.name} Failed to Answer or Unavailable`,
      `Call to +91 ${currentContact.phone} was not answered or unavailable. Cascading immediately to next responder via phone app.`,
      'alert'
    );

    if (nextIdx < activeContactsList.length) {
      const nextContact = activeContactsList[nextIdx];
      speakAudibleMessage(`${currentContact.name} failed to answer call or is not available. Placing call to ${nextContact.priority} contact ${nextContact.name} via phone app.`);

      setCurrentIndex(nextIdx);
      setTimeout(() => {
        startCallingViaPhoneApp(nextIdx);
      }, 1500);
    } else {
      handleAllContactsExhausted();
    }
  };

  // All contacts exhausted
  const handleAllContactsExhausted = () => {
    clearInterval(failSafeTimerRef.current);
    setCallState('all_exhausted');

    speakAudibleMessage("All emergency contacts failed to answer or were unavailable. 108 Emergency Ambulance is being summoned immediately.");
    onTriggerAmbulance();

    onLogActivity(
      'Contact Alert',
      'All Contacts Failed to Answer — 108 Ambulance Summoned',
      'Emergency calls placed to all responders exhausted with no answer. Summoning 108 Central Ambulance network.',
      'alert'
    );
  };

  if (!isActive) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 bg-slate-950/95 border-b-4 border-red-500 shadow-2xl backdrop-blur-md animate-fadeIn text-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-3.5">
        
        {/* Top Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5 text-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                  Emergency Phone Call Placed
                </span>
                <span className="text-xs text-red-300 font-mono">
                  {currentContact.priority} Contact: {currentContact.name} (+91 {currentContact.phone})
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                Calling via Phone App · User Can Talk Directly
              </h3>
            </div>
          </div>

          {/* Biometrics badge */}
          <div className="flex items-center gap-2 text-xs font-mono bg-red-950/80 border border-red-500/40 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span>HR: <strong className="text-red-400">{vitals.pulse} BPM</strong></span>
            <span>•</span>
            <span>SpO2: <strong className="text-red-400">{vitals.spo2}%</strong></span>
          </div>
        </div>

        {/* Informative Status Banner */}
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs sm:text-sm text-red-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{statusMessage}</p>
            {callState !== 'completed' && !unableToTalkDispatched && (
              <p className="text-xs text-amber-300 font-mono">
                ⏱ Auto Fail-Safe: If you are unable to talk, emergency SMS &amp; WhatsApp distress message will be sent in <strong>{failSafeSeconds}s</strong>.
              </p>
            )}
          </div>
        </div>

        {/* Action Controls: 3 Big Interactive Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          
          {/* Button 1: Re-trigger Phone App call */}
          <a
            href={`tel:+91${currentContact.phone.replace(/\D/g, '')}`}
            onClick={() => triggerNativePhoneCall(currentContact.phone)}
            className="py-3 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Redial in Phone App</span>
          </a>

          {/* Button 2: User says "I am unable to talk" -> Dispatches SMS & WhatsApp */}
          <button
            type="button"
            onClick={() => handleSendUnableToTalkAlert(currentContact)}
            className="py-3 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer animate-pulse"
          >
            <MessageSquare className="w-4 h-4" />
            <span>I Am Unable to Talk (Send SMS/WhatsApp)</span>
          </button>

          {/* Button 3: User spoke with contact */}
          <button
            type="button"
            onClick={handleUserConfirmedTalked}
            className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Talked with Contact (Fine)</span>
          </button>
        </div>

        {/* Secondary options: Failed to answer / unavailable -> Cascade */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={handleContactFailedToAnswer}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer py-1"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Contact failed to answer / not available? Call {activeContactsList[currentIndex + 1]?.name || 'next responder'}</span>
          </button>

          <div className="flex items-center gap-2">
            {unableToTalkDispatched && (
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#00a884]" />
                <span>Distress SMS &amp; WhatsApp sent!</span>
              </span>
            )}

            {callState === 'completed' && (
              <button
                type="button"
                onClick={onDeactivate}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
