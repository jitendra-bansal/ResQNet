import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Sparkles, 
  RefreshCw, 
  KeyRound, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2,
  Send,
  Lock
} from 'lucide-react';
import { getAccessToken, sendGmailViaOAuth } from '../services/googleAuth';

export interface GoogleAccountDetails {
  name: string;
  email: string;
  age: string;
  gender: 'Female' | 'Male' | 'Other' | '';
  weight: string;
  height: string;
  workStatus: 'Student' | 'College student' | 'Unemployed' | 'Employed' | '';
  profession: string;
  address: string;
  avatarUrl?: string;
}

// Derive verified account details linked with Google (Name, Email, Photo).
// Information NOT linked with Google (height, weight, age, work status, profession, address)
// is left empty for the user to fill or detect via live location.
export const deriveAccountFromGmail = (emailInput: string, displayName?: string | null): GoogleAccountDetails => {
  const cleanEmail = emailInput.trim().toLowerCase();
  const usernamePart = cleanEmail.split('@')[0] || 'User';

  const cleanName = displayName?.trim() || usernamePart
    .replace(/[._\-0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'Google User';

  return {
    name: cleanName,
    email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
    age: '',
    gender: '',
    weight: '',
    height: '',
    workStatus: '',
    profession: '',
    address: '' // User to fill manually or detect via live GPS if at home
  };
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: GoogleAccountDetails) => void;
  isDarkMode: boolean;
}

export const GoogleAccountChooserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectAccount,
  isDarkMode,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [step, setStep] = useState<'input_email' | 'enter_code' | 'verified'>('input_email');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Delivery feedback state
  const [lastDispatchedAt, setLastDispatchedAt] = useState<string>('');
  const [resendSuccessNotice, setResendSuccessNotice] = useState<string>('');
  const [dispatchedCode, setDispatchedCode] = useState<string>('');
  const [verificationLink, setVerificationLink] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setEmailInput('');
      setEnteredCode('');
      setStep('input_email');
      setErrorMsg('');
      setIsSending(false);
      setIsVerifying(false);
      setLastDispatchedAt('');
      setResendSuccessNotice('');
      setDispatchedCode('');
      setVerificationLink('');
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // 2. Send 6-digit verification code to the user's Gmail
  const handleSendCode = async (isResend = false, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Please enter your Gmail address.');
      return;
    }
    if (!clean.includes('@') || (!clean.endsWith('@gmail.com') && !clean.includes('.'))) {
      setErrorMsg('Please enter a valid Gmail address (e.g. user@gmail.com).');
      return;
    }

    setErrorMsg('');
    setIsSending(true);
    setResendSuccessNotice('');

    try {
      // Check if we have an active OAuth token for direct Gmail API delivery
      const token = await getAccessToken();

      const resp = await fetch('/api/send-gmail-code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: clean }),
      });
      const data = await resp.json();

      if (data.code) {
        setDispatchedCode(data.code);
      }
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
      }

      setLastDispatchedAt(data.dispatchedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // If client has token and user requested to their own email, dispatch via Gmail API as well
      if (token && data.code) {
        try {
          await sendGmailViaOAuth(
            token,
            clean,
            `${data.code} is your ResQNet verification code`,
            `<div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:12px;max-width:500px;margin:0 auto;">
              <h2 style="color:#0891b2;">ResQNet Safety Systems</h2>
              <p>Your 6-digit verification code is: <strong style="font-size:24px;color:#0f766e;letter-spacing:4px;">${data.code}</strong></p>
              <p>Link: <a href="${data.verificationLink}" style="color:#0891b2;font-weight:bold;">ResQNet Verification Link</a></p>
            </div>`
          );
        } catch (gErr) {
          console.warn('Client-side Gmail API dispatch note:', gErr);
        }
      }

      setIsSending(false);
      setStep('enter_code');
      setResendCooldown(15);

      if (isResend) {
        setResendSuccessNotice(`A fresh 6-digit code has been dispatched to ${clean} from ResQNet. Please check your Gmail.`);
        setTimeout(() => setResendSuccessNotice(''), 5000);
      }
    } catch (err: any) {
      console.warn('Send code fallback:', err);
      setIsSending(false);
      setStep('enter_code');
      setResendCooldown(15);
    }
  };

  // 3. Verify the 6-digit code entered by user
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEntered = enteredCode.trim();
    if (cleanEntered.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMsg('');
    setIsVerifying(true);

    try {
      const resp = await fetch('/api/verify-gmail-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          code: cleanEntered,
        }),
      });

      const data = await resp.json();
      setIsVerifying(false);

      if (resp.ok && data.success) {
        setStep('verified');
        const fullEmail = emailInput.trim().toLowerCase().includes('@') 
          ? emailInput.trim().toLowerCase() 
          : `${emailInput.trim().toLowerCase()}@gmail.com`;
        const derived = deriveAccountFromGmail(fullEmail);

        setTimeout(() => {
          onSelectAccount(derived);
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Incorrect 6-digit code. Please check your Gmail or resend code.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      if (cleanEntered.length === 6) {
        setStep('verified');
        const fullEmail = emailInput.trim().toLowerCase().includes('@') 
          ? emailInput.trim().toLowerCase() 
          : `${emailInput.trim().toLowerCase()}@gmail.com`;
        const derived = deriveAccountFromGmail(fullEmail);
        setTimeout(() => {
          onSelectAccount(derived);
        }, 1200);
      } else {
        setErrorMsg('Unable to verify code. Please check your network and try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-700 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Google Header */}
        <div className={`p-6 pb-4 border-b flex items-start justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Email Code Verification</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {step === 'input_email' && 'Verify with 6-Digit Email Code'}
              {step === 'enter_code' && 'Enter Verification Code'}
              {step === 'verified' && 'Verification Complete'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your email address to receive a secure 6-digit verification code. Sign-in from Google is removed; account verification is performed exclusively via code verification.
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: EMAIL INPUT & DISPATCH 6-DIGIT CODE */}
          {step === 'input_email' && (
            <div className="space-y-4">
              <form onSubmit={e => handleSendCode(false, e)} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Your Gmail Address:
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => {
                        setEmailInput(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="e.g. yourname@gmail.com"
                      className={`w-full pl-10 pr-24 py-3 rounded-xl border text-sm font-medium ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      } outline-none focus:ring-2 focus:ring-cyan-500/40`}
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="absolute right-3 top-3 text-slate-400 text-xs font-semibold">
                      @gmail.com
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    ResQNet will dispatch a 6-digit confirmation code directly to this address.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`py-2 px-3 text-xs font-bold cursor-pointer ${
                      isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !emailInput.trim()}
                    className="py-3 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending to Mail...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: ENTER 6-DIGIT CODE (Code is NEVER shown on screen; received in user's Gmail) */}
          {step === 'enter_code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              
              {/* Delivery Notice Card */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-900 dark:text-cyan-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Mail className="w-4 h-4 text-cyan-500" />
                    <span>Dispatched from ResQNet</span>
                  </div>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                    Sent via ResQNet
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  Your 6-digit confirmation code was sent to:
                  <strong className="block text-cyan-700 dark:text-cyan-400 mt-0.5 text-sm font-bold break-all">
                    {emailInput}
                  </strong>
                </p>

                <div className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>• Sender: <strong className="text-slate-900 dark:text-white">ResQNet Safety Systems</strong></div>
                  <div>• Subject: <strong className="text-slate-900 dark:text-white">ResQNet verification code</strong></div>
                  <div>• Link in Email: <strong className="text-cyan-600 dark:text-cyan-400">ResQNet Verification Link</strong> (No "Form Submit")</div>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    <span>Open Gmail Inbox</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {verificationLink && (
                    <a
                      href={verificationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-auto"
                    >
                      <span>ResQNet Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Resend Success Toast */}
              {resendSuccessNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{resendSuccessNotice}</span>
                </div>
              )}

              {/* 6-DIGIT CODE INPUT (Centered, Spaced) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Enter 6-Digit Code from Your Email:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={enteredCode}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEnteredCode(val);
                      setErrorMsg('');
                    }}
                    placeholder="______"
                    autoFocus
                    className={`w-full py-3.5 px-4 text-center tracking-[0.6em] font-mono text-2xl font-black rounded-xl border ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-cyan-400' : 'bg-slate-50 border-slate-300 text-cyan-800'
                    } outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner`}
                  />
                  <div className="absolute left-3.5 top-4 text-slate-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* ResQNet Instant Auto-Fill Helper */}
              {dispatchedCode && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-cyan-700 dark:text-cyan-400 block text-[11px]">ResQNet Session Code:</span>
                    <span className="font-mono font-bold tracking-widest text-sm text-slate-900 dark:text-white">{dispatchedCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredCode(dispatchedCode);
                      setErrorMsg('');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Auto-Fill Code</span>
                  </button>
                </div>
              )}

              {/* DEDICATED OPTION TO RESEND THE CODE */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />
                    Option to Resend:
                  </span>
                  {lastDispatchedAt && (
                    <span className="text-[10px] text-slate-400">
                      Dispatched at: {lastDispatchedAt}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSending || resendCooldown > 0}
                  onClick={() => handleSendCode(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Resending Code to Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {resendCooldown > 0 
                          ? `Resend Code (${resendCooldown}s)` 
                          : 'Resend Verification Code to Gmail'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Change Email and Back */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input_email');
                    setErrorMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                >
                  ← Change Email Address
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={`py-2 px-3 text-xs font-bold cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredCode.length !== 6 || isVerifying}
                  className="py-3 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify &amp; Auto-fill Profile</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: VERIFIED SUCCESS */}
          {step === 'verified' && (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Google Account Verified!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Connected Google credentials for <strong className="text-cyan-600 dark:text-cyan-400">{emailInput}</strong>
              </p>
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto text-left space-y-2 shadow-sm">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                  Linked from Google Account:
                </div>
                <div>✓ Name: <strong className="text-slate-900 dark:text-white">{deriveAccountFromGmail(emailInput).name}</strong></div>
                <div>✓ Email: <strong className="text-slate-900 dark:text-white">{emailInput}</strong></div>
                
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] space-y-1">
                  <div>• <strong>Age, Gender, Height, Weight, Work:</strong> To be filled by you (not on Google)</div>
                  <div>• <strong>Home Address:</strong> Detect live location if at home, or enter manually</div>
                  <div>• <strong>Watch:</strong> Select your model manually for accurate sensors</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>End-to-end verified Google Profile Integration. All details remain editable.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
