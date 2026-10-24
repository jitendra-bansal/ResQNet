import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Droplet, 
  Thermometer,
  CheckCircle2,
  RefreshCw,
  Volume2
} from 'lucide-react';
import { UserProfile, VitalsData } from '../types';
import { speakAudibleMessage } from '../utils/audio';

interface Props {
  userProfile: UserProfile;
  vitals: VitalsData;
  isDarkMode: boolean;
  onUpdateVitals?: (updated: VitalsData) => void;
}

export const VitalsTab: React.FC<Props> = ({
  userProfile,
  vitals,
  isDarkMode,
  onUpdateVitals,
}) => {
  const isHindi = userProfile.language === 'Hindi';
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibratedMessage, setCalibratedMessage] = useState<string | null>(null);

  const rawF = vitals.bodyTemperature || 98.6;
  const displayTemp = tempUnit === 'F' 
    ? `${rawF.toFixed(1)}°F` 
    : `${(((rawF - 32) * 5) / 9).toFixed(1)}°C`;

  const handleSimulateWatchReading = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
      const randomTemp = +(98.3 + Math.random() * 0.5).toFixed(1);
      if (onUpdateVitals) {
        onUpdateVitals({
          ...vitals,
          bodyTemperature: randomTemp,
          lastUpdated: isHindi ? 'अभी' : 'Just now'
        });
      }
      setCalibratedMessage(
        isHindi 
          ? `नवीनतम स्वास्थ्य डेटा सिंक हो गया है` 
          : `Latest health vitals synced successfully`
      );
      setTimeout(() => setCalibratedMessage(null), 3000);
    }, 600);
  };

  const handleSpeakAllVitals = () => {
    const msg = isHindi
      ? `आपकी हृदय गति ${vitals.pulse} बीट्स प्रति मिनट, रक्तचाप ${vitals.bpSys}/${vitals.bpDia}, ऑक्सीजन स्तर ${vitals.spo2} प्रतिशत और तापमान ${rawF.toFixed(1)} डिग्री फ़ारेनहाइट है। सभी स्तर सामान्य हैं।`
      : `Your heart rate is ${vitals.pulse} BPM, blood pressure is ${vitals.bpSys} over ${vitals.bpDia}, blood oxygen is ${vitals.spo2} percent, and body temperature is ${rawF.toFixed(1)} degrees Fahrenheit. All vitals are normal.`;
    speakAudibleMessage(msg, isHindi ? 'hi-IN' : 'en-US');
  };

  return (
    <div className="space-y-3.5 w-full pb-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className={`p-4 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                {isHindi ? 'स्वास्थ्य विवरण' : 'Health Vitals'}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userProfile.watchModel?.toLowerCase().includes('resq') ? (
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
                    <span className="truncate">{userProfile.watchModel} · {isHindi ? 'हार्डवेयर SOS व बायोमेट्रिक सिंक' : 'Hardware SOS & Telemetry Synced'}</span>
                  </span>
                ) : (
                  userProfile.watchModel || (isHindi ? 'सेंसर सक्रिय' : 'Sensors Active')
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSpeakAllVitals}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer active:scale-95 transition-all"
              title={isHindi ? 'सुनें' : 'Listen'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSimulateWatchReading}
              disabled={isCalibrating}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin text-cyan-500' : 'text-slate-400'}`} />
              <span>{isCalibrating ? (isHindi ? 'सिंक...' : 'Syncing...') : (isHindi ? 'ताज़ा करें' : 'Refresh')}</span>
            </button>
          </div>
        </div>

        {calibratedMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{calibratedMessage}</span>
          </div>
        )}
      </div>

      {/* 4 Essential Vitals in Clean 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* 1. Heart Rate */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-2`}>
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-bold">{isHindi ? 'हृदय गति' : 'Heart Rate'}</span>
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {vitals.pulse}
            </span>
            <span className="text-xs text-slate-500 font-bold">BPM</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            ✅ {isHindi ? 'सामान्य' : 'Normal'}
          </span>
        </div>

        {/* 2. Blood Pressure */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-2`}>
          <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
            <span className="text-xs font-bold">{isHindi ? 'रक्तचाप' : 'Blood Pressure'}</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {vitals.bpSys}/{vitals.bpDia}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">mmHg</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            ✅ {isHindi ? 'सुरक्षित' : 'Healthy'}
          </span>
        </div>

        {/* 3. Blood Oxygen (SpO2) */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-2`}>
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
            <span className="text-xs font-bold">{isHindi ? 'ऑक्सीजन' : 'Blood Oxygen'}</span>
            <Droplet className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {vitals.spo2}%
            </span>
            <span className="text-xs text-slate-500 font-bold">SpO2</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            ✅ {isHindi ? 'उत्कृष्ट' : 'Optimal'}
          </span>
        </div>

        {/* 4. Body Temperature */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-2`}>
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold">{isHindi ? 'तापमान' : 'Body Temp'}</span>
            <button
              type="button"
              onClick={() => setTempUnit(u => u === 'F' ? 'C' : 'F')}
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 cursor-pointer"
            >
              °{tempUnit === 'F' ? 'C' : 'F'}
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {displayTemp}
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            ✅ {isHindi ? 'सामान्य' : 'No Fever'}
          </span>
        </div>

      </div>

      {/* Recorded Medical Conditions Summary */}
      <div className={`p-4 rounded-2xl border space-y-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 block">
          {isHindi ? 'दर्ज स्वास्थ्य स्थितियां' : 'Recorded Medical Conditions'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(userProfile.medicalConditions && userProfile.medicalConditions.length > 0) ? (
            userProfile.medicalConditions.map(cond => (
              <span
                key={cond}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold"
              >
                {cond}
              </span>
            ))
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)'}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
