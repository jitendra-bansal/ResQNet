import React, { useState } from 'react';
import { X, Check, ArrowLeft, Phone, Video, MoreVertical, Send, Shield, AlertTriangle, ExternalLink, CheckCheck } from 'lucide-react';

export const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.24.25-.4.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  recipientPriority: string;
  senderName: string;
  onApprove: () => void;
  onDecline: () => void;
  isDarkMode: boolean;
}

export const WhatsAppVerifyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  recipientPriority,
  senderName,
  onApprove,
  onDecline,
  isDarkMode
}) => {
  const [hasReplied, setHasReplied] = useState<'yes' | 'no' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSimulateApprove = () => {
    setIsProcessing(true);
    setHasReplied('yes');
    setTimeout(() => {
      setIsProcessing(false);
      onApprove();
    }, 1100);
  };

  const handleSimulateDecline = () => {
    setIsProcessing(true);
    setHasReplied('no');
    setTimeout(() => {
      setIsProcessing(false);
      onDecline();
    }, 1100);
  };

  const cleanPhone = recipientPhone.replace(/\D/g, '');
  const waDirectUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `ResQNet Emergency Contact Verification: ${senderName || 'User'} has designated you as an Emergency Contact (${recipientPriority} Responder). Reply YES to approve.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 bg-[#0b141a] text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* WhatsApp App Bar */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#313d45]">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={onClose}
              className="text-[#aebac1] hover:text-white p-1 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow">
              {recipientName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate">{recipientName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {recipientPriority}
                </span>
              </div>
              <span className="text-[11px] text-[#00a884] block font-medium">online · WhatsApp Messenger</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#aebac1]">
            <a 
              href={waDirectUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#313d45] hover:text-white transition-colors"
              title="Open real WhatsApp Web"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#313d45] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#182229] px-4 py-2 text-xs text-[#aebac1] flex items-center justify-between border-b border-[#222e35]">
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="w-4 h-4 text-[#00a884]" />
            <span className="font-semibold text-white">Sending verification via WhatsApp</span>
          </div>
          <span className="text-[11px] text-[#00a884] font-mono">+91 {recipientPhone}</span>
        </div>

        {/* WhatsApp Chat Body */}
        <div 
          className="p-4 space-y-3 overflow-y-auto flex-1 text-xs"
          style={{
            backgroundImage: `radial-gradient(#202c33 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
            backgroundColor: '#0b141a'
          }}
        >
          {/* Security Notice */}
          <div className="mx-auto max-w-[280px] p-2 rounded-lg bg-[#182229] border border-[#222e35] text-[10px] text-center text-[#8696a0] leading-snug">
            🔒 Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
          </div>

          {/* Outgoing Message from ResQNet Bot / User */}
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md space-y-2 border border-[#005c4b]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 pb-1 border-b border-emerald-400/20">
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-300" />
                <span>ResQNet Emergency Safety System</span>
              </div>

              <p className="leading-relaxed text-[11px]">
                👋 Hello <strong>{recipientName}</strong>,
              </p>
              <p className="leading-relaxed text-[11px]">
                <strong>{senderName || 'Your contact'}</strong> has designated you as an Emergency Contact (<strong>{recipientPriority} Responder</strong>) on the ResQNet Life-Safety Network.
              </p>
              <div className="p-2 rounded-lg bg-[#025141] text-[10px] space-y-1 text-emerald-100">
                <span className="font-bold text-white block">🚨 In life-threatening emergencies, you will receive:</span>
                <div>• Real-time GPS location pin with navigation</div>
                <div>• Verified health conditions &amp; blood group</div>
                <div>• 1-Tap 108 Emergency Ambulance Dispatch</div>
              </div>
              <p className="text-[10px] text-emerald-200">
                Please reply <strong>YES</strong> to approve emergency alerts, or click Approve below.
              </p>

              <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-300/80 pt-1">
                <span>{currentTime}</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              </div>
            </div>
          </div>

          {/* Incoming Response from Recipient */}
          {hasReplied === 'yes' && (
            <div className="flex justify-start animate-fadeIn">
              <div className="max-w-[85%] bg-[#202c33] text-white p-3 rounded-2xl rounded-tl-xs shadow-md space-y-1.5 border border-[#313d45]">
                <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>YES, I approve!</span>
                </p>
                <p className="text-[11px] text-slate-200 leading-snug">
                  I agree to act as an emergency contact for {senderName || 'user'} and will respond to urgent SOS beacons.
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-0.5">
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          )}

          {hasReplied === 'no' && (
            <div className="flex justify-start animate-fadeIn">
              <div className="max-w-[85%] bg-[#202c33] text-white p-3 rounded-2xl rounded-tl-xs shadow-md space-y-1.5 border border-red-500/30">
                <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
                  <X className="w-4 h-4 text-red-400" />
                  <span>NO, I decline.</span>
                </p>
                <p className="text-[11px] text-slate-200 leading-snug">
                  I am unable to serve as an emergency responder at this time.
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-0.5">
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive WhatsApp Approval Control Panel */}
        <div className="bg-[#202c33] p-4 border-t border-[#313d45] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#aebac1] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00a884] animate-ping" />
              <span>Waiting for {recipientName}&apos;s WhatsApp approval...</span>
            </span>
            <span className="text-[11px] text-[#8696a0]">Simulate Response:</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isProcessing || hasReplied !== null}
              onClick={handleSimulateApprove}
              className="py-3 px-3 bg-[#00a884] hover:bg-[#02906f] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Approve (Says &quot;YES&quot;)</span>
            </button>

            <button
              type="button"
              disabled={isProcessing || hasReplied !== null}
              onClick={handleSimulateDecline}
              className="py-3 px-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Decline (Says &quot;NO&quot;)</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-[#8696a0]">
            WhatsApp approval will verify this contact and securely add them into your safety circle.
          </p>
        </div>

      </div>
    </div>
  );
};
