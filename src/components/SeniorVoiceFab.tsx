import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface SeniorVoiceFabProps {
  onClick: () => void;
  language: 'English' | 'Hindi';
  isDarkMode: boolean;
  isActive?: boolean;
}

export const SeniorVoiceFab: React.FC<SeniorVoiceFabProps> = ({
  onClick,
  language,
  isDarkMode,
  isActive = false,
}) => {
  const isHindi = language === 'Hindi';

  return (
    <div className="absolute bottom-20 right-3.5 z-40 flex items-center gap-2 group pointer-events-auto select-none">
      {/* Speech prompt label for seniors */}
      <div 
        onClick={onClick}
        className={`hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-lg text-[11px] font-black cursor-pointer transition-all transform group-hover:scale-105 ${
          isDarkMode
            ? 'bg-slate-900/95 border-cyan-500/40 text-cyan-300 shadow-cyan-950/40 backdrop-blur-md'
            : 'bg-white/95 border-slate-200 text-cyan-800 shadow-md backdrop-blur-md'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
        <span>{isHindi ? 'बोलकर चलाएं' : 'Voice Mode'}</span>
      </div>

      {/* Touch-Friendly Floating Voice FAB inside the phone box */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Activate Senior Voice Assistant"
        className={`relative w-13 h-13 rounded-full flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
          isActive
            ? 'bg-gradient-to-tr from-cyan-600 to-teal-400 text-white ring-4 ring-cyan-400/50 animate-pulse'
            : 'bg-gradient-to-tr from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-600/30 ring-2 ring-white/20'
        }`}
      >
        {/* Pulsing beacon ring */}
        <span className="absolute -inset-1 rounded-full bg-cyan-400/30 animate-ping opacity-75" />
        <Mic className="w-5 h-5 relative z-10" />
        <span className="text-[9px] font-black uppercase tracking-wider relative z-10 leading-none mt-0.5">
          {isHindi ? 'आवाज' : 'Voice'}
        </span>
      </button>
    </div>
  );
};
