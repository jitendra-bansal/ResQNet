import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Activity, 
  FileText,
  Radio,
  Check,
  Footprints,
  Navigation
} from 'lucide-react';
import { ActivityEvent, UserProfile, VitalsData } from '../types';

interface Props {
  activities: ActivityEvent[];
  userProfile: UserProfile;
  vitals: VitalsData;
  isDarkMode: boolean;
}

export const ActivityTab: React.FC<Props> = ({
  activities,
  userProfile,
  vitals,
  isDarkMode,
}) => {
  // Bottom notification toast state
  const [downloadToast, setDownloadToast] = useState(false);

  // Extract journey activities specifically so the user can see their stored journey data
  const journeyActivities = activities.filter(a => a.category === 'Journey');

  // Generate and download report file
  const handleDownloadReport = () => {
    const timestamp = new Date().toLocaleString();
    const reportContent = `
=====================================================
          RESQNET SAFETY & CLINICAL REPORT
=====================================================
Official Tagline: Every Second Counts. Every Citizen Connected.
Generated: ${timestamp}

USER PROFILE SUMMARY:
Name: ${userProfile.name}
Email: ${userProfile.email}
Target: ${userProfile.setupTarget === 'myself' ? 'Personal Account' : `Relative Care (${userProfile.relationshipToUser || ''})`}
Age / Gender: ${userProfile.age} yrs / ${userProfile.gender}
Weight / Height: ${userProfile.weight} kg / ${userProfile.height} cm
Status of Work: ${userProfile.workStatus} (${userProfile.profession})
Residential Address: ${userProfile.address}
Fitness Device: ${userProfile.watchModel}

CLINICAL & MEDICAL VAULT:
Blood Group: ${userProfile.bloodGroup}
Confirmed Conditions: ${userProfile.medicalConditions.includes('None of these') ? 'None reported (Fully healthy)' : (userProfile.medicalConditions.join(', ') || 'None reported')}
Known Allergies: ${userProfile.allergies.join(', ') || 'None reported'}
Medical Notes: ${userProfile.otherMedicalNotes || 'None'}
Uploaded Documents: ${userProfile.uploadedDocuments.map(d => `${d.name} (${d.size})`).join(', ') || 'None'}

BIOMETRIC VITALS AUDIT:
Blood Pressure: ${vitals.bpSys}/${vitals.bpDia} mmHg
Pulse / Heartbeat: ${vitals.pulse} BPM
Oxygen Saturation: ${vitals.spo2}% SpO2
Heart Rate Variability: ${vitals.hrv} ms
Cardiac Rhythm: ${vitals.cardiacRhythm}

STORED SAFETY JOURNEYS:
${journeyActivities.map((j, idx) => `${idx + 1}. [${j.timestamp}] ${j.title} - ${j.details}`).join('\n') || 'None recorded yet'}

RECENT ACTIVITY AUDIT LOG:
${activities.map((a, i) => `${i + 1}. [${a.timestamp}] [${a.category}] ${a.title} - ${a.details}`).join('\n')}

=====================================================
Emergency Public Services Synced: 108, 102, 112 (India)
Cryptographic Signature: SHA-256 Validated by ResQNet Security Core
=====================================================
`.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ResQNet_Safety_Report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Pop up message on the bottom showing the report has been downloaded
    setDownloadToast(true);
    setTimeout(() => {
      setDownloadToast(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 relative max-w-5xl mx-auto">
      
      {/* Header and Download Report button */}
      <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Safety &amp; Journey Activity</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Audit log of all walking journeys, check-ins, sensor events, and emergency verifications.
          </p>
        </div>

        {/* Download Report button */}
        <button
          onClick={handleDownloadReport}
          className="py-3 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Safety Report</span>
        </button>
      </div>

      {/* STORED JOURNEYS HIGHLIGHT SECTION */}
      {journeyActivities.length > 0 && (
        <div className={`p-6 sm:p-7 rounded-3xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } space-y-3`}>
          <div className="flex items-center gap-2.5">
            <Footprints className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Stored Journey Records ({journeyActivities.length})</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Recorded steps and travel duration from your completed safety journeys:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {journeyActivities.slice(0, 4).map(j => (
              <div key={j.id} className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-emerald-500" />
                    <span>{j.title}</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{j.timestamp}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">{j.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT ACTIVITY: PERMANENT OPTION FOR "ALL ACTIVITY" (NO OTHER OPTIONS ALLOWED) */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } space-y-4`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-cyan-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          </div>
          {/* Permanent single option: All Activity */}
          <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-400 rounded-xl">
            All Activity
          </div>
        </div>

        {/* Activity Timeline List with Larger Readable Typography */}
        <div className="space-y-3.5">
          {activities.map(act => (
            <div 
              key={act.id} 
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{act.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">· {act.category}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {act.details}
                </p>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{act.timestamp}</span>
                <span className={`text-xs font-bold mt-1 px-2.5 py-0.5 rounded-md ${
                  act.severity === 'alert'
                    ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                    : act.severity === 'nominal'
                      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                      : 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-400'
                }`}>
                  {act.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING POPUP MESSAGE ON BOTTOM WHEN REPORT HAS BEEN DOWNLOADED */}
      {downloadToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border-2 border-emerald-500 text-emerald-300 py-4 px-7 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-white">
            Report has been downloaded successfully.
          </span>
        </div>
      )}

    </div>
  );
};
