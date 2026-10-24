import React from 'react';
import { ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { SafetyPermissions } from '../types';

interface Props {
  permissions: SafetyPermissions;
  onGrantAll: () => void;
  onOpenSettings: () => void;
}

export const PermissionBlockedScreen: React.FC<Props> = ({
  permissions,
  onGrantAll,
  onOpenSettings
}) => {
  const missingList = [
    { key: 'microphoneCamera', label: 'Microphone & Camera in Emergency Situations', missing: !permissions.microphoneCamera },
    { key: 'liveLocation', label: 'Live GPS Location for Rapid Emergency Dispatch', missing: !permissions.liveLocation },
    { key: 'neighboursPermission', label: 'Neighbour First-Responder SMS Permission', missing: !permissions.neighboursPermission },
    { key: 'cookiesDataStorage', label: 'Essential Cookie & Data Storage for Offline Safety', missing: !permissions.cookiesDataStorage },
  ].filter(item => item.missing);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-slate-100">
      <div className="max-w-lg w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Safety Protection Paused</h2>
            <p className="text-xs text-red-400 font-medium">Compulsory Safety Permissions Required</p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 space-y-2">
          <p className="font-semibold text-slate-200">
            ResQNet cannot operate without mandatory emergency safeguards.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            In critical situations where every second counts, ResQNet relies on low-power sensory detection, live coordinates, and offline data storage to summon ambulances (108/112) and alert trusted contacts.
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Declined Mandatory Safeguards ({missingList.length}):
          </span>
          <div className="space-y-2">
            {missingList.map(item => (
              <div key={item.key} className="flex items-center gap-3 p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-200">
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onGrantAll}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Grant Mandatory Permissions</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Choices</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
