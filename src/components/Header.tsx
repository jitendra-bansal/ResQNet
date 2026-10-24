import React, { useMemo } from 'react';
import { 
  Sun, 
  Moon, 
  Bell, 
  AlertTriangle,
  Languages,
  Mic
} from 'lucide-react';
import { UserProfile } from '../types';
import { ResQLogo } from './ResQLogo';
import { transliterateName } from '../utils/i18n';

interface Props {
  userProfile: UserProfile;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  smartSafetyMode?: boolean;
  onToggleSmartSafety?: () => void;
  onTriggerSos: () => void;
  onTriggerVoiceCheck?: () => void;
  onTriggerDangerDetection?: () => void;
  voicePromptActive?: boolean;
  onClickLogo?: () => void;
  onToggleLanguage?: () => void;
}

export const Header: React.FC<Props> = ({
  userProfile,
  isDarkMode,
  onToggleTheme,
  unreadNotificationsCount,
  onOpenNotifications,
  onTriggerSos,
  onTriggerVoiceCheck,
  voicePromptActive,
  onClickLogo,
  onToggleLanguage,
}) => {
  const isHindi = userProfile.language === 'Hindi';

  // Determine time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (isHindi) {
      if (hour < 12) return 'शुभ प्रभात';
      if (hour < 17) return 'शुभ दोपहर';
      return 'शुभ संध्या';
    } else {
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    }
  }, [isHindi]);

  const localizedUserName = transliterateName(userProfile.name, isHindi ? 'Hindi' : 'English');
  const firstName = localizedUserName ? localizedUserName.split(' ')[0] : (isHindi ? 'नागरिक' : 'Friend');

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 select-none ${
      isDarkMode 
        ? 'bg-slate-950/95 border-slate-800 text-slate-100' 
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="w-full px-3 h-14 sm:h-15 flex items-center justify-between gap-1.5 overflow-hidden">
        
        {/* Brand Zone */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <button
            onClick={onClickLogo}
            className="group focus:outline-none transition-transform active:scale-95 cursor-pointer shrink-0"
            title="ResQNet Home"
          >
            <ResQLogo size="sm" showGlow={true} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1 leading-tight">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                ResQNet
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                · {firstName}
              </span>
            </div>
            <p className="text-[9.5px] font-semibold text-cyan-600 dark:text-cyan-400 leading-tight mt-0.5">
              {isHindi ? 'हर सेकंड कीमती है। हर नागरिक जुड़ा है।' : 'Every Second Counts. Every Citizen Connected.'}
            </p>
          </div>
        </div>

        {/* Right Controls Zone (Strictly Contained Inside Mobile Box) */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Language Toggle Button */}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className={`h-8 px-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                isDarkMode
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
                  : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
              title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
            >
              <Languages className="w-3.5 h-3.5 text-amber-500" />
              <span>{isHindi ? 'English' : 'हिंदी'}</span>
            </button>
          )}

          {/* Voice Assistant / Microphone Button */}
          {onTriggerVoiceCheck && (
            <button
              type="button"
              onClick={onTriggerVoiceCheck}
              className={`h-8 px-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                voicePromptActive
                  ? 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-400/40 animate-pulse'
                  : isDarkMode
                  ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
              }`}
              title={isHindi ? 'माइक चालू करें' : 'Start Microphone'}
              aria-label="Start Microphone"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden xs:inline">{isHindi ? 'माइक' : 'Mic'}</span>
            </button>
          )}

          {/* Theme Toggle (Light / Dark mode) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-8 h-8 rounded-xl border text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95 ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className={`relative w-8 h-8 rounded-xl border text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95 ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isHindi ? 'सूचनाएं' : 'Notifications'}
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-slate-950">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Emergency SOS button */}
          <button
            type="button"
            onClick={onTriggerSos}
            className="h-8 px-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title={isHindi ? 'आपातकालीन SOS' : 'Emergency SOS'}
          >
            <AlertTriangle className="w-3 h-3 animate-bounce" />
            <span className="tracking-wide text-[11px]">SOS</span>
          </button>

        </div>

      </div>
    </header>
  );
};
