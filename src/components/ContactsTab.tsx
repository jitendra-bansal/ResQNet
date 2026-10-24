import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Phone,
  Trash2, 
  Plus, 
  Check, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { EmergencyContact } from '../types';
import { extractCleanName } from '../utils/cleanName';
import { translatePriorityLabel, transliterateName, translateRelationship } from '../utils/i18n';
import { sendSmsVerificationOtp, DispatchedSms } from '../utils/smsService';

interface Props {
  contacts: EmergencyContact[];
  onAddContact: (contact: EmergencyContact) => void;
  onRemoveContact: (id: string) => void;
  isDarkMode: boolean;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  language?: 'English' | 'Hindi';
}

export const ContactsTab: React.FC<Props> = ({
  contacts,
  onAddContact,
  onRemoveContact,
  isDarkMode,
  onLogActivity,
  language = 'English',
}) => {
  const isHindi = language === 'Hindi';
  const activeLang: 'English' | 'Hindi' = isHindi ? 'Hindi' : 'English';

  // Add Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState(isHindi ? 'बेटा' : 'Son');
  const [priority, setPriority] = useState<'Primary' | 'Secondary' | 'Tertiary' | 'Quaternary'>('Primary');
  const [isAddingMode, setIsAddingMode] = useState(false);

  // Contact Phone Verification State (4-digit SMS OTP)
  const [verificationPending, setVerificationPending] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [dispatchedSms, setDispatchedSms] = useState<DispatchedSms | null>(null);

  const [declinedNotice, setDeclinedNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setRelationship(prev => translateRelationship(prev || (isHindi ? 'बेटा' : 'Son'), activeLang));
  }, [isHindi, activeLang]);

  // Resend SMS countdown cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listen for auto-fill events from top SMS notification toast
  useEffect(() => {
    const handleFillOtp = (e: CustomEvent<string>) => {
      if (verificationPending && e.detail) {
        setEnteredOtp(e.detail);
        setDeclinedNotice(null);
      }
    };
    window.addEventListener('resqnet-fill-otp' as any, handleFillOtp);
    return () => window.removeEventListener('resqnet-fill-otp' as any, handleFillOtp);
  }, [verificationPending]);

  const handleRequestVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setDeclinedNotice(null);
    setSuccessNotice(null);

    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setDeclinedNotice(
        isHindi 
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' 
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (contacts.some(c => c.phone === clean)) {
      setDeclinedNotice(
        isHindi
          ? 'यह नंबर पहले से ही संपर्क सूची में मौजूद है।'
          : 'This phone number is already in your contacts.'
      );
      return;
    }

    // Dispatch 4-digit verification code via SMS to the provided phone number
    const { otp, sms } = sendSmsVerificationOtp(clean, undefined, activeLang);
    setGeneratedOtp(otp);
    setDispatchedSms(sms);
    setEnteredOtp(''); // Clear input so user types or uses the SMS code
    setResendCooldown(30);
    setVerificationPending(true);
  };

  const handleResendOtp = () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return;
    const { otp, sms } = sendSmsVerificationOtp(clean, undefined, activeLang);
    setGeneratedOtp(otp);
    setDispatchedSms(sms);
    setEnteredOtp('');
    setResendCooldown(30);
    setDeclinedNotice(null);
  };

  const handleConfirmVerifyAndAdd = () => {
    setDeclinedNotice(null);
    if (!enteredOtp.trim() || enteredOtp.trim() !== generatedOtp) {
      setDeclinedNotice(
        isHindi
          ? `गलत सत्यापन कोड। कृपया +91 ${phone.replace(/\D/g, '').slice(-10)} पर एसएमएस में प्राप्त 4-अंकीय कोड (${generatedOtp}) दर्ज करें।`
          : `Invalid verification code. Please enter the matching 4-digit SMS OTP (${generatedOtp}) sent to your number.`
      );
      return;
    }

    const clean = phone.replace(/\D/g, '').slice(-10);
    const rawName = extractCleanName(name.trim()) || (isHindi ? 'परिवार सदस्य' : 'Family Member');
    const contactName = transliterateName(rawName, activeLang);
    const contactRel = translateRelationship(relationship, activeLang);
    const contactPriority = priority;

    const newContact: EmergencyContact = {
      id: 'contact-' + Date.now(),
      name: contactName,
      phone: clean,
      relationship: contactRel,
      priority: contactPriority,
      status: 'Verified',
      addedAt: 'Verified'
    };

    onAddContact(newContact);

    setTimeout(() => {
      onLogActivity(
        'Contact Alert',
        `Emergency Contact Verified & Added: ${contactName}`,
        `Verified +91 ${clean} as ${contactPriority} responder.`,
        'nominal'
      );
    }, 0);

    setSuccessNotice(
      isHindi
        ? `✓ ${contactName} (+91 ${clean}) सत्यापित होकर सूची में जुड़ गया!`
        : `✓ ${contactName} (+91 ${clean}) verified and added to emergency contacts!`
    );

    setName('');
    setPhone('');
    setPriority('Secondary');
    setVerificationPending(false);
    setGeneratedOtp('');
    setEnteredOtp('');
    setIsAddingMode(false);
  };

  const handleRemove = (contact: EmergencyContact) => {
    if (contacts.length <= 1) {
      setDeclinedNotice(
        isHindi
          ? 'कम से कम 1 आपातकालीन संपर्क हमेशा होना चाहिए।'
          : 'At least 1 emergency contact must remain active.'
      );
      return;
    }
    onRemoveContact(contact.id);
    setTimeout(() => {
      onLogActivity(
        'Contact Alert', 
        'Emergency Responder Removed', 
        `Removed ${contact.name} (+91 ${contact.phone}).`, 
        'logged'
      );
    }, 0);
  };

  const priorityOrder: Record<string, number> = {
    Primary: 1,
    Secondary: 2,
    Tertiary: 3,
    Quaternary: 4,
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    const aOrder = priorityOrder[a.priority || 'Secondary'] || 99;
    const bOrder = priorityOrder[b.priority || 'Secondary'] || 99;
    return aOrder - bOrder;
  });

  const relationshipOptions = isHindi ? [
    'बेटा',
    'बेटी',
    'पति',
    'पत्नी',
    'भाई',
    'बहन',
    'पिता',
    'माता',
    'मित्र / पड़ोसी',
    'डॉक्टर',
    'अन्य परिजन'
  ] : [
    'Son',
    'Daughter',
    'Husband',
    'Wife',
    'Brother',
    'Sister',
    'Father',
    'Mother',
    'Friend / Neighbor',
    'Doctor',
    'Other Relative'
  ];

  return (
    <div className="space-y-3.5 w-full pb-6 animate-fadeIn">
      
      {/* Header and Add Contact button */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
              {isHindi ? 'आपातकालीन संपर्क' : 'Emergency Contacts'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? `${sortedContacts.length} सत्यापित संपर्क` : `${sortedContacts.length} verified contacts`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddingMode(!isAddingMode);
            setVerificationPending(false);
            setDeclinedNotice(null);
            setSuccessNotice(null);
          }}
          className="py-2 px-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddingMode ? (isHindi ? 'रद्द करें' : 'Cancel') : (isHindi ? 'जोड़ें' : 'Add')}</span>
        </button>
      </div>

      {/* Success Notice */}
      {successNotice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Declined / Invalid Phone Notice */}
      {declinedNotice && (
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-bold animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{declinedNotice}</span>
        </div>
      )}

      {/* ADD CONTACT FORM */}
      {isAddingMode && (
        <form onSubmit={handleRequestVerification} className={`p-4 rounded-2xl border space-y-3 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400">
            {isHindi ? 'नया संपर्क जोड़ें और नंबर सत्यापित करें' : 'Add & Verify New Emergency Contact'}
          </h4>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                {isHindi ? 'पूरा नाम' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                disabled={verificationPending}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isHindi ? 'संपर्क का नाम लिखें' : 'Enter contact name'}
                className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                {isHindi ? '10 अंकों का मोबाइल नंबर' : '10-Digit Mobile Number'}
              </label>
              <div className="flex">
                <span className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  disabled={verificationPending}
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={isHindi ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                  className="flex-1 p-2.5 rounded-r-xl border text-xs font-bold font-mono bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                {isHindi ? 'उपयोगकर्ता से रिश्ता' : 'Relation with User'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                {relationshipOptions.map(rel => (
                  <button
                    key={rel}
                    type="button"
                    disabled={verificationPending}
                    onClick={() => setRelationship(rel)}
                    className={`p-1.5 rounded-lg text-[11px] font-bold border truncate transition-all cursor-pointer ${
                      relationship === rel
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                {isHindi ? 'प्राथमिकता' : 'Priority'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Primary', 'Secondary', 'Tertiary'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    disabled={verificationPending}
                    onClick={() => setPriority(p)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate ${
                      priority === p 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {translatePriorityLabel(p, activeLang)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!verificationPending ? (
            <div className="pt-1 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isHindi ? 'नंबर सत्यापित करें (OTP भेजें)' : 'Verify Contact Number (Send OTP)'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-emerald-500/10 border border-emerald-500/30 space-y-3 animate-fadeIn">
              {/* SMS Dispatched Status */}
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold">{isHindi ? 'एसएमएस भेजा गया:' : 'SMS Dispatched to:'}</span>
                  <span className="font-mono font-bold">+91 {phone.replace(/\D/g, '').slice(-10)}</span>
                </div>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono font-bold">
                  VK-RESQNET
                </span>
              </div>

              {/* Simulated Incoming SMS Card */}
              <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700/80 shadow-inner space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>VK-RESQNET</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono">SMS</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{isHindi ? 'अभी प्राप्त हुआ' : 'Just now'}</span>
                </div>
                
                <p className="text-[11px] text-slate-200 leading-snug">
                  {isHindi 
                    ? `आपका ResQNet सत्यापन कोड ${generatedOtp} है। 10 मिनट के लिए मान्य। किसी से साझा न करें।` 
                    : `Your ResQNet verification code is ${generatedOtp}. Valid for 10 minutes. Do not share this OTP.`}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">{isHindi ? 'एसएमएस कोड:' : 'SMS Code:'}</span>
                    <span className="font-mono text-xs font-black text-emerald-400 tracking-widest bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                      {generatedOtp}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEnteredOtp(generatedOtp);
                      setDeclinedNotice(null);
                    }}
                    className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    {isHindi ? 'कोड भरें (Auto-fill)' : 'Auto-fill OTP'}
                  </button>
                </div>
              </div>

              {/* 4-Digit Input Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{isHindi ? 'एसएमएस से प्राप्त 4-अंकीय OTP दर्ज करें:' : 'Enter 4-digit OTP received via SMS:'}</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={enteredOtp}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEnteredOtp(clean);
                      setDeclinedNotice(null);
                    }}
                    placeholder="• • • •"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-center font-mono text-base font-black tracking-[0.4em] bg-white dark:bg-slate-900 border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleConfirmVerifyAndAdd}
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isHindi ? '✅ OTP सत्यापित करें और जोड़ें' : '✅ Verify 4-Digit OTP & Save'}</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                    resendCooldown > 0
                      ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-cyan-500/50 hover:border-cyan-500 text-cyan-700 dark:text-cyan-300 cursor-pointer active:scale-95'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'animate-spin-slow'}`} />
                  <span>
                    {resendCooldown > 0
                      ? (isHindi ? `पुनः भेजें (${resendCooldown}s)` : `Resend (${resendCooldown}s)`)
                      : (isHindi ? 'SMS पुनः भेजें' : 'Resend SMS')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationPending(false)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
                >
                  {isHindi ? 'बदलें' : 'Edit'}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* CONTACTS LIST */}
      <div className={`p-4 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } space-y-2.5`}>
        {sortedContacts.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-500">
            <p className="font-semibold">{isHindi ? 'कोई संपर्क नहीं है।' : 'No emergency contacts added yet.'}</p>
          </div>
        ) : (
          sortedContacts.map(c => {
            const pri = c.priority || 'Secondary';
            const isPrimary = pri === 'Primary';
            const displayName = transliterateName(c.name, activeLang);
            const displayRel = translateRelationship(c.relationship, activeLang);
            return (
              <div 
                key={c.id} 
                className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                  isPrimary 
                    ? isDarkMode ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50/60 border-red-200'
                    : isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    isPrimary 
                      ? 'bg-red-500/20 text-red-500' 
                      : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                  }`}>
                    {displayName.charAt(0) || 'C'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                        {displayName}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isPrimary
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {translatePriorityLabel(c.priority, activeLang)}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        ✓ {isHindi ? 'सत्यापित' : 'Verified'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                      {displayRel} · <span className="font-mono">+91 {c.phone}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 transition-all shadow-sm"
                    title={isHindi ? 'कॉल करें' : 'Call'}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleRemove(c)}
                    className="p-2.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={isHindi ? 'हटाएं' : 'Remove'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
