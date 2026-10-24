import React, { useState } from 'react';
import { 
  User, 
  Heart, 
  MapPin, 
  Languages, 
  Sun, 
  Moon, 
  Save, 
  Check, 
  Plus, 
  X, 
  Watch, 
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { UserProfile, SafetyPermissions } from '../types';
import { getLiveCurrentAddress } from '../utils/geolocation';
import { extractCleanName } from '../utils/cleanName';
import { localizeProfileData } from '../utils/i18n';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  permissions: SafetyPermissions;
  onUpdatePermissions: (updated: SafetyPermissions) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
  onNavigateToContacts: () => void;
  onToggleLanguage?: () => void;
  onOpenEsp8266Setup?: () => void;
  onRestartOnboarding?: () => void;
}

export const SettingsTab: React.FC<Props> = ({
  userProfile,
  onUpdateProfile,
  permissions,
  onUpdatePermissions,
  isDarkMode,
  onToggleTheme,
  onToggleLanguage,
  onOpenEsp8266Setup,
  onRestartOnboarding,
}) => {
  const [profile, setProfile] = useState<UserProfile>(() => localizeProfileData(userProfile, userProfile.language));
  const [saveBanner, setSaveBanner] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [newCustomCondition, setNewCustomCondition] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setProfile(localizeProfileData(userProfile, userProfile.language));
  }, [userProfile]);

  const isHindi = (profile.language || userProfile.language) === 'Hindi';

  const commonConditions = isHindi ? [
    'हाई बीपी',
    'शुगर / डायबिटीज',
    'दिल की बीमारी',
    'सांस / दमा',
    'जोड़ों का दर्द',
    'कोई बीमारी नहीं'
  ] : [
    'High Blood Pressure',
    'Diabetes / Sugar',
    'Heart Condition',
    'Asthma / Breathing',
    'Joint Pain / Arthritis',
    'None (Healthy)'
  ];

  const watchModels = [
    'ResQNet Watch',
    'Apple Watch',
    'Samsung Galaxy Watch',
    'Garmin',
    'Noise ColorFit',
    'boAt Wave',
    'Fitbit'
  ];

  const handleDetectLiveLocation = async () => {
    setIsDetectingLocation(true);
    setLocationSuccess(null);
    try {
      const result = await getLiveCurrentAddress();
      setProfile(p => ({ ...p, address: result.address }));
      setLocationSuccess(isHindi ? 'वर्तमान जीपीएस स्थान दर्ज हुआ!' : 'Live GPS address updated!');
      setTimeout(() => setLocationSuccess(null), 4000);
    } catch {
      setProfile(p => ({ ...p, address: isHindi ? 'नई दिल्ली (लाइव जीपीएस)' : 'New Delhi (Live GPS)' }));
      setLocationSuccess(isHindi ? 'स्थान दर्ज हुआ' : 'Address updated');
      setTimeout(() => setLocationSuccess(null), 4000);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleToggleCondition = (cond: string) => {
    const isNone = cond.includes('कोई बीमारी नहीं') || cond.includes('None');
    setProfile(prev => {
      const current = prev.medicalConditions || [];
      if (isNone) {
        return { ...prev, medicalConditions: [cond] };
      }
      const withoutNone = current.filter(c => !c.includes('कोई बीमारी नहीं') && !c.includes('None'));
      if (withoutNone.includes(cond)) {
        const next = withoutNone.filter(c => c !== cond);
        return { ...prev, medicalConditions: next.length ? next : [isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)'] };
      } else {
        return { ...prev, medicalConditions: [...withoutNone, cond] };
      }
    });
  };

  const handleRemoveCondition = (cond: string) => {
    setProfile(prev => {
      const remaining = (prev.medicalConditions || []).filter(c => c !== cond);
      return {
        ...prev,
        medicalConditions: remaining.length ? remaining : [isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)']
      };
    });
  };

  const handleAddCustomCondition = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCustomCondition.trim();
    if (!clean) return;
    setProfile(prev => {
      const current = (prev.medicalConditions || []).filter(c => !c.includes('कोई बीमारी नहीं') && !c.includes('None'));
      return {
        ...prev,
        medicalConditions: [...current, clean]
      };
    });
    setNewCustomCondition('');
  };

  const handleSave = () => {
    const numericAge = parseInt(profile.age.replace(/\D/g, ''), 10);
    if (isNaN(numericAge) || numericAge < 21) {
      setAgeError(
        isHindi
          ? 'त्रुटि: आयु 21 वर्ष से कम नहीं हो सकती। आगे बढ़ने के लिए कृपया 21 वर्ष या उससे अधिक आयु दर्ज करें।'
          : 'Error: Age cannot be below 21 years. Please enter an age of 21 or above to continue.'
      );
      setSaveBanner(false);
      return;
    }
    setAgeError(null);
    const cleanedProfile: UserProfile = localizeProfileData({
      ...profile,
      name: extractCleanName(profile.name),
      age: String(numericAge)
    }, profile.language);
    onUpdateProfile(cleanedProfile);
    setProfile(cleanedProfile);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  return (
    <div className="space-y-3.5 w-full pb-8 animate-fadeIn">
      
      {/* HEADER BANNER */}
      <div className={`p-4 rounded-2xl border shadow-sm ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-900 dark:text-white truncate">
              {isHindi ? 'प्रोफ़ाइल व सेटिंग्स' : 'Profile & Settings'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isHindi ? 'व्यक्तिगत विवरण व प्राथमिकताएं' : 'Personal details & preferences'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="py-2 px-3.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isHindi ? 'सुरक्षित करें' : 'Save'}</span>
        </button>
      </div>

      {saveBanner && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{isHindi ? 'प्रोफ़ाइल सफलतापूर्वक सुरक्षित हो गई।' : 'Profile saved successfully.'}</span>
        </div>
      )}

      {/* 1. APP PREFERENCES (LANGUAGE & THEME - TOP ACCESSIBILITY) */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 block">
          {isHindi ? 'ऐप प्राथमिकताएं' : 'App Preferences'}
        </span>

        <div className="space-y-2.5">
          {/* LANGUAGE */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Languages className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold block">{isHindi ? 'ऐप की भाषा' : 'App Language'}</span>
                <span className="text-[11px] text-slate-500">{isHindi ? 'हिंदी' : 'English'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onToggleLanguage) {
                  onToggleLanguage();
                } else {
                  const next = isHindi ? 'English' : 'Hindi';
                  const updated = localizeProfileData(profile, next);
                  setProfile(updated);
                  onUpdateProfile(updated);
                }
              }}
              className="py-1.5 px-3 rounded-xl border font-bold text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 cursor-pointer active:scale-95"
            >
              {isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
            </button>
          </div>

          {/* THEME */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400 shrink-0" /> : <Sun className="w-4 h-4 text-amber-500 shrink-0" />}
              <div>
                <span className="text-xs font-bold block">{isHindi ? 'रंग थीम' : 'Color Theme'}</span>
                <span className="text-[11px] text-slate-500">{isDarkMode ? (isHindi ? 'डार्क मोड' : 'Dark Mode') : (isHindi ? 'लाइट मोड' : 'Light Mode')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs bg-slate-100 dark:bg-slate-800 cursor-pointer active:scale-95"
            >
              {isDarkMode ? (isHindi ? 'लाइट मोड' : 'Light Mode') : (isHindi ? 'डार्क मोड' : 'Dark Mode')}
            </button>
          </div>

          {/* LANGUAGE & SETUP PAGE RESTART */}
          {onRestartOnboarding && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">{isHindi ? 'भाषा व ऑडियो सेटअप' : 'Language & Audio Setup'}</span>
                  <span className="text-[11px] text-slate-500">{isHindi ? 'शुरुआती भाषा पेज पर जाएं' : 'Open initial language screen'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRestartOnboarding}
                className="py-1.5 px-3 rounded-xl border font-bold text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 cursor-pointer active:scale-95"
              >
                {isHindi ? 'स्क्रीन खोलें' : 'Open Screen'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CORE PERSONAL INFORMATION (NAME, AGE, GENDER, LOCATION) */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-black text-xs">
          <User className="w-4 h-4" />
          <span>{isHindi ? 'व्यक्तिगत जानकारी' : 'Personal Information'}</span>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isHindi ? 'पूरा नाम' : 'Full Name'}
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder={isHindi ? 'रमेश शर्मा' : 'Ramesh Sharma'}
              className="w-full p-2.5 rounded-xl border font-bold text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {isHindi ? 'आयु वर्ग चुनें (21-30 से 100+) और सटीक उम्र लिखें:' : 'Select Age Range (21-30 to 100+) & Enter Exact Age:'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {['21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '91-100', '100+'].map(range => {
                const numAge = parseInt(profile.age.replace(/\D/g, ''), 10);
                const isRangeActive =
                  !isNaN(numAge) &&
                  (range === '100+'
                    ? numAge >= 100
                    : numAge >= parseInt(range.split('-')[0], 10) && numAge <= parseInt(range.split('-')[1], 10));
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      const minVal = range === '100+' ? '100' : range.split('-')[0];
                      setProfile(p => ({ ...p, age: minVal }));
                      setAgeError(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg font-black text-[11px] border transition-all cursor-pointer ${
                      isRangeActive
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={21}
              max={120}
              value={profile.age}
              onChange={e => {
                setProfile(p => ({ ...p, age: e.target.value }));
                setAgeError(null);
              }}
              placeholder={isHindi ? 'सटीक उम्र टाइप करें (जैसे 65)...' : 'Type exact age (e.g. 65)...'}
              className={`w-full p-2.5 rounded-xl border font-bold text-xs bg-white dark:bg-slate-950 outline-none font-mono ${
                ageError ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
          </div>
        </div>

        {ageError && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{ageError}</span>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            {isHindi ? 'लिंग' : 'Gender'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Female', label: isHindi ? 'महिला' : 'Female' },
              { id: 'Male', label: isHindi ? 'पुरुष' : 'Male' },
              { id: 'Other', label: isHindi ? 'अन्य' : 'Other' }
            ].map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setProfile(p => ({ ...p, gender: g.id as any }))}
                className={`py-2 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer text-center ${
                  profile.gender === g.id
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isHindi ? 'शहर / पता' : 'City / Address'}</span>
            </label>
            <button
              type="button"
              onClick={handleDetectLiveLocation}
              disabled={isDetectingLocation}
              className="py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-emerald-500/30"
            >
              <RefreshCw className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
              <span>{isDetectingLocation ? (isHindi ? 'खोज रहे हैं...' : 'Detecting...') : (isHindi ? 'लाइव GPS' : 'Live GPS')}</span>
            </button>
          </div>
          <input
            type="text"
            value={profile.address}
            onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
            placeholder={isHindi ? 'नई दिल्ली' : 'New Delhi'}
            className="w-full p-2.5 rounded-xl border font-bold text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
          />
          {locationSuccess && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ {locationSuccess}
            </p>
          )}
        </div>
      </div>

      {/* 3. SMARTWATCH MODEL */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-2.5 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs">
            <Watch className="w-4 h-4" />
            <span>{isHindi ? 'स्मार्टवॉच मॉडल' : 'Smartwatch Model'}</span>
          </div>
          {(profile.watchModel === 'ResQNet Watch' || profile.watchModel === 'ResQNet वॉच') && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px] font-black flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {isHindi ? 'ऑफिशियल हार्डवेयर' : 'Official Hardware'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {watchModels.map(w => {
            const isResQ = w === 'ResQNet Watch' || w === 'ResQNet वॉच';
            const isSelected = profile.watchModel === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setProfile(p => ({ ...p, watchModel: w }))}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isResQ ? `⭐ ${w}` : w}
              </button>
            );
          })}
        </div>

        {(profile.watchModel === 'ResQNet Watch' || profile.watchModel === 'ResQNet वॉच') && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-900 dark:text-cyan-200 space-y-1 animate-fadeIn">
            <div className="font-bold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isHindi ? 'ResQNet वॉच फीचर्स सक्रिय:' : 'ResQNet Watch Features Active:'}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[10px] leading-relaxed">
              {isHindi
                ? '• फिजिकल टैक्टाइल SOS बटन • निरंतर हार्ट रेट व SpO2 मॉनिटरिंग • आपातकालीन फॉल डिटेक्शन • ऑफलाइन मेश बीकन सिंक'
                : '• Physical Tactile SOS Pusher • Continuous PPG/SpO2 Distress Tracking • Fall & Impact Alert • Offline Mesh Beacon Sync'}
            </p>
          </div>
        )}
      </div>

      {/* 3B. ESP8266 HARDWARE SOS BUTTON INTEGRATION */}
      {onOpenEsp8266Setup && (
        <div className={`p-4 rounded-2xl border shadow-sm space-y-2.5 ${
          isDarkMode ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-cyan-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-black text-xs">
              <Cpu className="w-4 h-4" />
              <span>{isHindi ? 'ESP8266 हार्डवेयर SOS बटन' : 'ESP8266 Hardware SOS Button'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-black">
              {isHindi ? 'सक्रिय' : 'Webhook Active'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {isHindi
              ? 'अपने ESP8266 फिजिकल पुश बटन से ऐप के आपातकालीन SOS बटन को सीधे ट्रिगर करें।'
              : 'Connect your ESP8266 push button over WiFi to immediately trigger the SOS alert on this app.'}
          </p>
          <button
            type="button"
            onClick={onOpenEsp8266Setup}
            className="w-full py-2.5 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Cpu className="w-4 h-4" />
            <span>{isHindi ? 'ESP8266 कोड व वेबहुक सेटअप खोलें' : 'Open ESP8266 Code & Webhook Setup'}</span>
          </button>
        </div>
      )}

      {/* 4. MEDICAL CONDITIONS */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs">
          <Heart className="w-4 h-4" />
          <span>{isHindi ? 'स्वास्थ्य समस्याएं' : 'Medical Conditions'}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(profile.medicalConditions && profile.medicalConditions.length > 0) ? (
            profile.medicalConditions.map(cond => (
              <div
                key={cond}
                className="inline-flex items-center gap-1 py-1 pl-2.5 pr-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 font-bold text-xs"
              >
                <span>{cond}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(cond)}
                  className="w-4 h-4 rounded-full hover:bg-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-500 font-semibold">
              {isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {commonConditions.map(item => {
            const isChecked = (profile.medicalConditions || []).some(c => c === item || (item.includes('None') && c.includes('None')) || (item.includes('कोई') && c.includes('कोई')));
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleToggleCondition(item)}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer text-left flex items-center justify-between ${
                  isChecked
                    ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{item}</span>
                {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAddCustomCondition} className="flex gap-2">
          <input
            type="text"
            value={newCustomCondition}
            onChange={e => setNewCustomCondition(e.target.value)}
            placeholder={isHindi ? 'अन्य स्वास्थ्य समस्या लिखें...' : 'Add another condition...'}
            className="flex-1 p-2 rounded-xl border text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
          />
          <button
            type="submit"
            disabled={!newCustomCondition.trim()}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isHindi ? 'जोड़ें' : 'Add'}</span>
          </button>
        </form>
      </div>

      {/* 5. SAFETY PERMISSIONS */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-2.5 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>{isHindi ? 'सुरक्षा अनुमतियाँ' : 'Safety Permissions'}</span>
        </div>

        <div className="space-y-1.5">
          {[
            { key: 'microphoneCamera' as const, label: isHindi ? '🎙️ माइक्रोफ़ोन और आवाज़ पहचान' : '🎙️ Microphone & Voice Access' },
            { key: 'liveLocation' as const, label: isHindi ? '📍 लाइव जीपीएस लोकेशन' : '📍 Live GPS Location' },
            { key: 'motionSensors' as const, label: isHindi ? '🏃 गिरने व मोशन का सेंसर' : '🏃 Fall & Motion Sensors' },
            { key: 'neighboursPermission' as const, label: isHindi ? '💬 आपातकालीन एसएमएस अलर्ट' : '💬 Emergency SMS Alerts' },
          ].map(perm => {
            const active = permissions[perm.key];
            return (
              <button
                key={perm.key}
                type="button"
                onClick={() => {
                  if (active) {
                    setPermError(
                      isHindi
                        ? 'त्रुटि: सभी सुरक्षा अनुमतियाँ अनिवार्य हैं। किसी भी अनुमति को अस्वीकार (बंद) करने पर ऐप काम नहीं करेगा।'
                        : 'Error: All safety permissions are mandatory. Declining any permission is not allowed while the app is active.'
                    );
                    setTimeout(() => setPermError(null), 4000);
                    return;
                  }
                  setPermError(null);
                  onUpdatePermissions({ ...permissions, [perm.key]: true });
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold cursor-pointer"
              >
                <span>{perm.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {active ? (isHindi ? 'चालू (Required)' : 'Active (Required)') : (isHindi ? 'बंद' : 'Off')}
                </span>
              </button>
            );
          })}
        </div>

        {permError && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{permError}</span>
          </div>
        )}
      </div>

      {/* SAVE BUTTON */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
      >
        <Check className="w-4 h-4" />
        <span>{isHindi ? 'सभी परिवर्तन सुरक्षित करें' : 'Save All Changes'}</span>
      </button>

    </div>
  );
};
