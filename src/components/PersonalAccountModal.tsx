import React, { useState } from 'react';
import { 
  X, 
  User, 
  Heart, 
  MapPin, 
  Languages, 
  Sun, 
  Moon, 
  Save, 
  Check, 
  Plus, 
  Watch, 
  HeartHandshake,
  Users,
  Phone,
  RefreshCw
} from 'lucide-react';
import { UserProfile, EmergencyContact, SafetyPermissions } from '../types';
import { getLiveCurrentAddress } from '../utils/geolocation';
import { extractCleanName } from '../utils/cleanName';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  contacts: EmergencyContact[];
  onRemoveContact: (id: string) => void;
  onAddContact: (contact: EmergencyContact) => void;
  permissions: SafetyPermissions;
  onUpdatePermissions: (perms: SafetyPermissions) => void;
  isDarkMode: boolean;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
}

export const PersonalAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  isDarkMode
}) => {
  if (!isOpen) return null;

  const isHindi = userProfile.language === 'Hindi';
  const [profile, setProfile] = useState<UserProfile>({ ...userProfile });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [newCustomCondition, setNewCustomCondition] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);

  const commonConditions = isHindi ? [
    'हाई बीपी (High BP)',
    'शुगर / डायबिटीज (Diabetes)',
    'दिल की बीमारी (Heart Condition)',
    'सांस / दमा (Asthma)',
    'जोड़ों का दर्द (Joint Pain)',
    'कोई बीमारी नहीं (None)'
  ] : [
    'High Blood Pressure',
    'Diabetes / Sugar',
    'Heart Condition',
    'Asthma / Breathing',
    'Joint Pain / Arthritis',
    'None (Healthy)'
  ];

  const handleDetectLiveLocation = async () => {
    setIsDetectingLocation(true);
    setLocationSuccess(null);
    try {
      const result = await getLiveCurrentAddress();
      setProfile(p => ({ ...p, address: result.address }));
      setLocationSuccess(isHindi ? 'वर्तमान जीपीएस स्थान दर्ज हुआ' : 'Live GPS address updated');
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
        return { ...prev, medicalConditions: next.length ? next : [isHindi ? 'कोई बीमारी नहीं' : 'None'] };
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
        medicalConditions: remaining.length ? remaining : [isHindi ? 'कोई बीमारी नहीं' : 'None']
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
    const cleanedProfile: UserProfile = {
      ...profile,
      name: extractCleanName(profile.name),
      age: profile.age.replace(/\D/g, '') || profile.age
    };
    onUpdateProfile(cleanedProfile);
    setProfile(cleanedProfile);
    setSaveSuccessMsg(isHindi ? 'प्रोफ़ाइल सफलतापूर्वक सुरक्षित कर ली गई है!' : 'Profile saved successfully!');
    setTimeout(() => {
      setSaveSuccessMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* MODAL HEADER */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-black">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">
                {isHindi ? 'व्यक्तिगत प्रोफ़ाइल' : 'Personal Profile'}
              </h2>
              <p className="text-xs text-slate-500">
                {isHindi ? 'अपनी आवश्यक सुरक्षा जानकारी प्रबंधित करें' : 'Manage your essential safety details'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TARGET */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {isHindi ? 'ऐप का उपयोग किसके लिए है?' : 'Who is this app for?'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProfile(p => ({ ...p, setupTarget: 'myself' }))}
                className={`p-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                  profile.setupTarget === 'myself'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {isHindi ? '🙋‍♂️ खुद के लिए' : '🙋‍♂️ For Myself'}
              </button>
              <button
                type="button"
                onClick={() => setProfile(p => ({ ...p, setupTarget: 'relative' }))}
                className={`p-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                  profile.setupTarget === 'relative'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {isHindi ? '👵 परिजन के लिए' : '👵 For Loved One'}
              </button>
            </div>
          </div>

          {/* NAME & AGE */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {isHindi ? 'पूरा नाम' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full p-2.5 rounded-xl border text-xs sm:text-sm font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {isHindi ? 'उम्र (वर्ष)' : 'Age'}
              </label>
              <input
                type="number"
                value={profile.age}
                onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                className="w-full p-2.5 rounded-xl border text-xs sm:text-sm font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none font-mono"
              />
            </div>
          </div>

          {/* GENDER */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {isHindi ? 'लिंग' : 'Gender'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Female', 'Male', 'Other'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setProfile(p => ({ ...p, gender: g as any }))}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    profile.gender === g
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isHindi ? (g === 'Female' ? 'महिला' : g === 'Male' ? 'पुरुष' : 'अन्य') : g}
                </button>
              ))}
            </div>
          </div>

          {/* ADDRESS */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-500">
                {isHindi ? 'आवास / स्थान' : 'Residence Location'}
              </label>
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span>{isHindi ? 'जीपीएस से लें' : 'Live GPS'}</span>
              </button>
            </div>
            <input
              type="text"
              value={profile.address}
              onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
              className="w-full p-2.5 rounded-xl border text-xs sm:text-sm font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
            />
            {locationSuccess && (
              <span className="text-[11px] text-emerald-600 block mt-0.5">✓ {locationSuccess}</span>
            )}
          </div>

          {/* SMARTWATCH */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500">
                {isHindi ? 'स्मार्टवॉच मॉडल' : 'Smartwatch Model'}
              </label>
              {(profile.watchModel === 'ResQNet Watch' || profile.watchModel === 'ResQNet वॉच') && (
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  ⭐ Official ResQNet Hardware
                </span>
              )}
            </div>
            <input
              type="text"
              value={profile.watchModel}
              onChange={e => setProfile(p => ({ ...p, watchModel: e.target.value }))}
              placeholder={isHindi ? 'वॉच का नाम' : 'Smartwatch model'}
              className="w-full p-2.5 rounded-xl border text-xs sm:text-sm font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                'ResQNet Watch',
                'Apple Watch',
                'Samsung Galaxy Watch',
                'Garmin',
                'Noise ColorFit',
                'Fitbit'
              ].map(w => {
                const isResQ = w === 'ResQNet Watch';
                const isSelected = profile.watchModel === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setProfile(p => ({ ...p, watchModel: w }))}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
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
          </div>

          {/* MEDICAL PROBLEMS / CONDITIONS */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-500">
              {isHindi ? 'चिकित्सा समस्याएं (केवल आपकी चुनी हुई समस्याएं)' : 'Medical Problems (Only your active conditions)'}
            </label>

            <div className="flex flex-wrap gap-1.5">
              {(profile.medicalConditions || []).map(cond => (
                <div
                  key={cond}
                  className="inline-flex items-center gap-1.5 py-1 pl-2.5 pr-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 font-bold text-xs"
                >
                  <span>{cond}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(cond)}
                    className="w-4 h-4 rounded-full hover:bg-rose-500/30 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick toggle chips */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {commonConditions.map(item => {
                const isChecked = (profile.medicalConditions || []).some(c => c.includes(item) || (item.includes('None') && c.includes('None')));
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleCondition(item)}
                    className={`p-2 rounded-xl text-xs font-bold border text-left flex items-center justify-between cursor-pointer ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {isChecked && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddCustomCondition} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCustomCondition}
                onChange={e => setNewCustomCondition(e.target.value)}
                placeholder={isHindi ? 'अन्य कोई बीमारी जोड़ें...' : 'Add other condition...'}
                className="flex-1 p-2 rounded-xl border text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none"
              />
              <button
                type="submit"
                disabled={!newCustomCondition.trim()}
                className="py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {isHindi ? 'जोड़ें' : 'Add'}
              </button>
            </form>
          </div>

          {/* LANGUAGE */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {isHindi ? 'भाषा (Language)' : 'Language'}
            </span>
            <button
              type="button"
              onClick={() => setProfile(p => ({ ...p, language: p.language === 'Hindi' ? 'English' : 'Hindi' }))}
              className="py-1.5 px-3 rounded-xl border text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 cursor-pointer"
            >
              {profile.language === 'Hindi' ? 'English में बदलें' : 'हिंदी में बदलें'}
            </button>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className={`p-4 border-t flex gap-2.5 shrink-0 ${
          isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isHindi ? 'सुरक्षित करें' : 'Save Profile'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
          >
            {isHindi ? 'रद्द करें' : 'Cancel'}
          </button>
        </div>

      </div>
    </div>
  );
};
