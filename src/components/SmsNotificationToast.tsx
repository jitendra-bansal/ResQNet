import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, X, ShieldAlert, ArrowDownToLine } from 'lucide-react';
import { DispatchedSms } from '../utils/smsService';

interface Props {
  isHindi?: boolean;
  onAutoFillCode?: (code: string) => void;
}

export const SmsNotificationToast: React.FC<Props> = ({
  isHindi = false,
  onAutoFillCode,
}) => {
  const [activeSms, setActiveSms] = useState<DispatchedSms | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const handleSmsEvent = (e: CustomEvent<DispatchedSms>) => {
      setActiveSms(e.detail);
      setIsCopied(false);
      setProgress(100);
    };

    window.addEventListener('resqnet-sms-received' as any, handleSmsEvent);
    return () => {
      window.removeEventListener('resqnet-sms-received' as any, handleSmsEvent);
    };
  }, []);

  // Countdown timer for auto-dismiss
  useEffect(() => {
    if (!activeSms) return;
    const duration = 14000; // 14 seconds
    const intervalTime = 100;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          clearInterval(timer);
          setActiveSms(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeSms]);

  if (!activeSms) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(activeSms.otpCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleUseCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAutoFillCode) {
      onAutoFillCode(activeSms.otpCode);
    }
    // Also dispatch a window event so any input on the page can catch it
    window.dispatchEvent(new CustomEvent('resqnet-fill-otp', { detail: activeSms.otpCode }));
    setActiveSms(null);
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-md animate-slideDown pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-xl p-3.5 space-y-2.5">
        {/* Top Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />

        {/* SMS Header */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold leading-tight">
                <span className="text-white tracking-wide">{activeSms.sender}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono font-semibold">
                  SMS
                </span>
                <span className="text-[10px] text-slate-400">• {isHindi ? 'अभी' : 'now'}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono truncate">
                {isHindi ? 'प्राप्तकर्ता:' : 'To:'} {activeSms.toPhone}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSms(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss SMS"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SMS Body */}
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 space-y-1.5">
          <p className="leading-relaxed">
            {isHindi ? activeSms.messageHi : activeSms.messageEn}
          </p>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
              <span>{isHindi ? '4-अंकीय OTP:' : '4-Digit OTP:'}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-white font-mono text-sm font-black tracking-widest shadow-sm">
                {activeSms.otpCode}
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              ⏱ {isHindi ? '10 मिनट वैध' : 'Valid 10m'}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleUseCode}
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>{isHindi ? `OTP डालें (${activeSms.otpCode})` : `Auto-fill OTP (${activeSms.otpCode})`}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{isHindi ? 'कॉपी हुआ!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>{isHindi ? 'कॉपी' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
