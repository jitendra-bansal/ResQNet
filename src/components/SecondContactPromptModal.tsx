import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Phone, 
  Check, 
  X, 
  Volume2, 
  Sparkles, 
  ShieldCheck,
  HeartHandshake,
  MessageSquare,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { EmergencyContact } from '../types';
import { speakAudibleMessage } from '../utils/audio';
import { extractCleanName } from '../utils/cleanName';
import { sendSmsVerificationOtp } from '../utils/smsService';

interface SecondContactPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (contact: EmergencyContact) => void;
  userName: string;
  language?: 'English' | 'Hindi';
  isDarkMode: boolean;
}

export const SecondContactPromptModal: React.FC<SecondContactPromptModalProps> = ({
  isOpen,
  onClose,
  onAddContact,
  userName,
  language = 'Hindi',
  isDarkMode
}) => {
  const isHindi = language === 'Hindi';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [error, setError] = useState('');

  // 4-Digit SMS OTP state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsOtpStep(false);
      setEnteredOtp('');
      setError('');
      const promptText = isHindi
        ? `नमस्ते ${userName || 'जी'}! आप तीसरी बार रेस्क्यू नेट का उपयोग कर रहे हैं। आपातकाल में पूरी सुरक्षा के लिए, कृपया अपना दूसरा आपातकालीन संपर्क जोड़ें।`
        : `Hello ${userName || 'friend'}! You are using ResQNet for the 3rd time. For your safety, would you like to add a second emergency contact?`;
      
      speakAudibleMessage(promptText, isHindi ? 'hi-IN' : 'en-US');
    }
  }, [isOpen, userName, isHindi]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listen for auto-fill events
  useEffect(() => {
    const handleFillOtp = (e: CustomEvent<string>) => {
      if (isOtpStep && e.detail) {
        setEnteredOtp(e.detail);
        setError('');
      }
    };
    window.addEventListener('resqnet-fill-otp' as any, handleFillOtp);
    return () => window.removeEventListener('resqnet-fill-otp' as any, handleFillOtp);
  }, [isOtpStep]);

  if (!isOpen) return null;

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isHindi ? 'कृपया संपर्क का नाम दर्ज करें' : 'Please enter contact name');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError(isHindi ? 'कृपया 10 अंकों का वैध फोन नंबर दर्ज करें' : 'Please enter a valid 10-digit phone number');
      return;
    }

    const { otp } = sendSmsVerificationOtp(cleanPhone, undefined, isHindi ? 'Hindi' : 'English');
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setResendCooldown(30);
    setIsOtpStep(true);
    setError('');
  };

  const handleResendOtp = () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;
    const { otp } = sendSmsVerificationOtp(cleanPhone, undefined, isHindi ? 'Hindi' : 'English');
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setResendCooldown(30);
    setError('');
  };

  const handleVerifyAndSave = () => {
    if (!enteredOtp.trim() || enteredOtp.trim() !== generatedOtp) {
      setError(
        isHindi
          ? `गलत 4-अंकीय कोड। कृपया एसएमएस में प्राप्त सही कोड (${generatedOtp}) दर्ज करें।`
          : `Invalid 4-digit code. Please enter the valid SMS OTP (${generatedOtp}).`
      );
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const newContact: EmergencyContact = {
      id: 'contact-' + Date.now(),
      name: extractCleanName(name.trim()),
      phone: cleanPhone,
      relationship: relationship,
      priority: 'Secondary',
      status: 'Verified',
      addedAt: 'Verified'
    };

    onAddContact(newContact);
    localStorage.setItem('resqnet_second_contact_prompted', 'true');
    onClose();
  };

  const handleDismiss = () => {
    localStorage.setItem('resqnet_second_contact_prompted', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* HEADER */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {isHindi ? 'तीसरी बार उपयोग · विशेष सुरक्षा' : '3rd App Visit · Extra Safety'}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {isHindi ? 'दूसरा आपातकालीन संपर्क जोड़ें' : 'Add 2nd Emergency Contact'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        {!isOtpStep ? (
          <form onSubmit={handleRequestOtp} className="p-5 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              {isHindi
                ? `नमस्ते ${userName || 'जी'}! आप तीसरी बार ऐप का उपयोग कर रहे हैं। यदि पहला संपर्क उपलब्ध न हो, तो सुरक्षा के लिए हम आपके दूसरे परिजन या मित्र को कॉल या संदेश भेज सकते हैं।`
                : `Hello ${userName || 'friend'}! You are using ResQNet for the 3rd time. Having a secondary backup contact ensures you are always protected if the primary contact is unreachable.`}
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {isHindi ? 'संपर्क का नाम (Name)' : 'Contact Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                placeholder={isHindi ? 'जैसे: सीमा (बेटी) या रमेश (मित्र)' : 'e.g. Seema (Daughter) or Ramesh (Friend)'}
                className="w-full p-3.5 rounded-xl border font-bold text-sm sm:text-base bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {isHindi ? '10 अंकों का मोबाइल नंबर (Mobile Number)' : '10-Digit Mobile Number'}
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="9876543210"
                className="w-full p-3.5 rounded-xl border font-bold text-sm sm:text-base bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-mono tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {isHindi ? 'रिश्ता चुनें (Relationship)' : 'Choose Relationship'}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                {[
                  { id: isHindi ? 'बेटा' : 'Son', label: isHindi ? 'बेटा (Son)' : 'Son' },
                  { id: isHindi ? 'बेटी' : 'Daughter', label: isHindi ? 'बेटी (Daughter)' : 'Daughter' },
                  { id: isHindi ? 'पति' : 'Husband', label: isHindi ? 'पति (Husband)' : 'Husband' },
                  { id: isHindi ? 'पत्नी' : 'Wife', label: isHindi ? 'पत्नी (Wife)' : 'Wife' },
                  { id: isHindi ? 'भाई' : 'Brother', label: isHindi ? 'भाई (Brother)' : 'Brother' },
                  { id: isHindi ? 'बहन' : 'Sister', label: isHindi ? 'बहन (Sister)' : 'Sister' },
                  { id: isHindi ? 'पोता / नाती' : 'Grandson', label: isHindi ? 'पोता / नाती' : 'Grandson' },
                  { id: isHindi ? 'पोती / नातिन' : 'Granddaughter', label: isHindi ? 'पोती / नातिन' : 'Granddaughter' },
                  { id: isHindi ? 'दामाद / बहू' : 'In-Law', label: isHindi ? 'दामाद / बहू' : 'In-Law' },
                  { id: isHindi ? 'मित्र / पड़ोसी' : 'Friend / Neighbor', label: isHindi ? 'मित्र / पड़ोसी' : 'Friend / Neighbor' },
                  { id: isHindi ? 'डॉक्टर / केयरटेकर' : 'Doctor / Caregiver', label: isHindi ? 'डॉक्टर / केयरटेकर' : 'Doctor / Caregiver' },
                  { id: isHindi ? 'अन्य परिजन' : 'Other Relative', label: isHindi ? 'अन्य परिजन' : 'Other Relative' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRelationship(r.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer text-center transition-all ${
                      relationship === r.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                className="flex-1 py-3.5 px-5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95 transition-all"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isHindi ? 'नंबर सत्यापित करें (SMS OTP भेजें)' : 'Verify Number (Send SMS OTP)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-3 px-5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-500 cursor-pointer"
              >
                {isHindi ? 'बाद में (Later)' : 'Maybe Later'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 sm:p-6 space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-emerald-500/10 border border-emerald-500/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-emerald-500/20">
                <span className="text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                  <span>👤</span>
                  <span>{name} ({relationship})</span>
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                  +91 {phone.replace(/\D/g, '').slice(-10)}
                </span>
              </div>

              {/* SMS Dispatched Status */}
              <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold">{isHindi ? 'एसएमएस भेजा गया:' : 'SMS Sent to:'}</span>
                  <span className="font-mono font-bold">+91 {phone.replace(/\D/g, '').slice(-10)}</span>
                </div>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono font-bold">
                  VK-RESQNET
                </span>
              </div>

              {/* Simulated Incoming SMS Card */}
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-700/80 shadow-inner space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>VK-RESQNET</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono">SMS</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{isHindi ? 'अभी प्राप्त हुआ' : 'Just now'}</span>
                </div>
                
                <p className="text-xs text-slate-200 leading-snug">
                  {isHindi 
                    ? `आपका ResQNet सत्यापन कोड ${generatedOtp} है। 10 मिनट के लिए मान्य। किसी से साझा न करें।` 
                    : `Your ResQNet verification code is ${generatedOtp}. Valid for 10 minutes. Do not share this OTP.`}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-semibold">{isHindi ? 'एसएमएस कोड:' : 'SMS Code:'}</span>
                    <span className="font-mono text-xs font-black text-emerald-400 tracking-widest bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                      {generatedOtp}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEnteredOtp(generatedOtp);
                      setError('');
                    }}
                    className="text-xs font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    {isHindi ? 'कोड भरें (Auto-fill)' : 'Auto-fill OTP'}
                  </button>
                </div>
              </div>

              {/* 4-Digit Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{isHindi ? 'एसएमएस से प्राप्त 4-अंकीय OTP दर्ज करें:' : 'Enter 4-digit OTP received via SMS:'}</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={enteredOtp}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEnteredOtp(clean);
                      setError('');
                    }}
                    placeholder="• • • •"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-center font-mono text-lg font-black tracking-[0.4em] bg-white dark:bg-slate-900 border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500 text-red-600 dark:text-red-400 text-xs font-bold">
                {error}
              </div>
            )}

            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleVerifyAndSave}
                className="flex-1 py-3 px-5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95 transition-all"
              >
                <Check className="w-5 h-5" />
                <span>{isHindi ? '✅ 4-अंकीय OTP सत्यापित करें' : '✅ Verify 4-Digit OTP & Save'}</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleResendOtp}
                className={`py-3 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                  resendCooldown > 0
                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-cyan-500/50 hover:border-cyan-500 text-cyan-700 dark:text-cyan-300 cursor-pointer active:scale-95'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${resendCooldown > 0 ? '' : 'animate-spin-slow'}`} />
                <span>
                  {resendCooldown > 0
                    ? (isHindi ? `पुनः भेजें (${resendCooldown}s)` : `Resend (${resendCooldown}s)`)
                    : (isHindi ? 'SMS पुनः भेजें' : 'Resend SMS')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsOtpStep(false)}
                className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {isHindi ? 'बदलें' : 'Edit'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
