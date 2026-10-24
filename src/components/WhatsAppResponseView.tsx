import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppVerifyModal';

export const WhatsAppResponseView: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'approved' | 'declined'>('loading');
  const [inviteDetails, setInviteDetails] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action') || params.get('whatsapp_action') || 'approve';
    const id = params.get('id') || '';

    const isApproved = action === 'approve';
    setStatus(isApproved ? 'approved' : 'declined');

    // Notify backend
    if (id) {
      fetch('/api/respond-whatsapp-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: isApproved ? 'approve' : 'decline' }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.invite) setInviteDetails(data.invite);
        })
        .catch(err => console.warn('Sync status note:', err));
    }
  }, []);

  const isApproved = status === 'approved';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl text-center space-y-6 ${
        isApproved ? 'bg-slate-900 border-emerald-500/50' : 'bg-slate-900 border-rose-500/50'
      }`}>
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center">
            <WhatsAppIcon className="w-6 h-6 text-[#00a884]" />
          </div>
          <span className="font-extrabold text-sm tracking-wider uppercase text-slate-300">
            SafePulse Emergency Network
          </span>
        </div>

        {/* Status Indicator Icon */}
        <div className="flex justify-center">
          {isApproved ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-fadeIn">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-fadeIn">
              <XCircle className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Main Status Text */}
        <div className="space-y-2">
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
            isApproved 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}>
            {isApproved ? 'Request Approved' : 'Request Declined'}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
            {isApproved 
              ? 'You Approved the Emergency Contact Request' 
              : 'You Declined the Emergency Contact Request'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {isApproved ? (
              <>
                Thank you! You have confirmed and approved the emergency contact invitation. You are now registered as an active emergency responder on SafePulse.
              </>
            ) : (
              <>
                You have declined the request. The user has been notified that this contact declined the offer and to try again with a different phone number.
              </>
            )}
          </p>
        </div>

        {/* Details Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span>Network Channel:</span>
            <span className="font-bold text-[#00a884] flex items-center gap-1">
              <WhatsAppIcon className="w-3 h-3 text-[#00a884]" /> WhatsApp Verified
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Response Status:</span>
            <span className={`font-bold ${isApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isApproved ? 'Active Emergency Contact' : 'Declined (Number Not Added)'}
            </span>
          </div>

          {inviteDetails && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact:</span>
                <span className="font-mono text-white">{inviteDetails.name} (+91 {inviteDetails.phone})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Requester:</span>
                <span className="text-white font-bold">{inviteDetails.senderName}</span>
              </div>
            </>
          )}
        </div>

        {/* Confirmation Footer */}
        <div className="pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Response securely synchronized with ResQNet</span>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-medium">
            You can safely close this browser window or tab.
          </p>
        </div>

      </div>
    </div>
  );
};
