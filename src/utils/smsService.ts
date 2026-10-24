import { playSmsNotificationChime } from './audio';

export interface DispatchedSms {
  id: string;
  sender: string; // e.g. "VK-RESQNET"
  toPhone: string; // formatted e.g. "+91 98765 43210"
  rawPhone: string; // 10 digits
  otpCode: string;
  messageEn: string;
  messageHi: string;
  timestamp: string;
  validForMinutes: number;
}

export function formatIndianPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return raw;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Dispatches a simulated real SMS containing a 4-digit OTP to the recipient's phone number
 */
export function sendSmsVerificationOtp(
  rawPhoneNumber: string, 
  customCode?: string,
  preferredLang: 'English' | 'Hindi' = 'English'
): { otp: string; sms: DispatchedSms } {
  const cleanPhone = rawPhoneNumber.replace(/\D/g, '').slice(-10);
  const formatted = formatIndianPhoneNumber(cleanPhone);
  const otpCode = customCode || Math.floor(1000 + Math.random() * 9000).toString();

  const sms: DispatchedSms = {
    id: 'sms-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    sender: 'VK-RESQNET',
    toPhone: formatted,
    rawPhone: cleanPhone,
    otpCode,
    messageEn: `Your ResQNet verification code is ${otpCode}. Valid for 10 minutes. Never share your OTP with anyone. - ResQNet Emergency Network`,
    messageHi: `आपका ResQNet सत्यापन कोड ${otpCode} है। 10 मिनट के लिए मान्य। अपना OTP किसी से साझा न करें। - ResQNet इमरजेंसी`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    validForMinutes: 10
  };

  // Play realistic SMS chime
  try {
    playSmsNotificationChime();
  } catch {
    // ignore
  }

  // Save to recent SMS history in localStorage
  try {
    const existingRaw = localStorage.getItem('resqnet_sent_sms');
    const existing: DispatchedSms[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(sms);
    localStorage.setItem('resqnet_sent_sms', JSON.stringify(existing.slice(0, 10)));
  } catch {
    // ignore
  }

  // Broadcast window event for toast & banner listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resqnet-sms-received', { detail: sms }));
  }

  return { otp: otpCode, sms };
}

/**
 * Retrieve the most recent SMS sent to any or a specific phone number
 */
export function getLatestDispatchedSms(rawPhone?: string): DispatchedSms | null {
  try {
    const existingRaw = localStorage.getItem('resqnet_sent_sms');
    if (!existingRaw) return null;
    const existing: DispatchedSms[] = JSON.parse(existingRaw);
    if (!rawPhone) return existing[0] || null;
    const clean = rawPhone.replace(/\D/g, '').slice(-10);
    return existing.find(s => s.rawPhone === clean) || null;
  } catch {
    return null;
  }
}
