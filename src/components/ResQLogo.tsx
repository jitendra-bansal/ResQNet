import React from 'react';

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showGlow?: boolean;
  className?: string;
  withRings?: boolean;
}

export const ResQLogo: React.FC<Props> = ({
  size = 'md',
  showGlow = true,
  className = '',
  withRings = false,
}) => {
  const sizeMap = {
    xs: 'w-8 h-8 rounded-xl',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-24 h-24 rounded-3xl',
    hero: 'w-36 h-36 sm:w-44 sm:h-44 rounded-3xl',
  };

  const containerClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Dynamic Animated Pulse Rings */}
      {withRings && (
        <>
          <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 animate-ping opacity-40 pointer-events-none" />
          <div className="absolute -inset-2 rounded-3xl bg-cyan-400/15 blur-sm animate-pulse pointer-events-none" />
        </>
      )}

      {/* Ambient Cybernetic Bioluminescent Glow */}
      {showGlow && (
        <div 
          className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-cyan-500/30 via-red-500/20 to-teal-400/30 blur-md opacity-80 pointer-events-none group-hover:opacity-100 transition-opacity"
        />
      )}

      {/* Main Logo Container */}
      <div 
        className={`relative ${containerClass} overflow-hidden shadow-2xl ring-2 ring-cyan-500/40 dark:ring-cyan-400/50 bg-slate-950 p-0.5 transition-transform duration-300 group-hover:scale-105`}
        style={{
          boxShadow: showGlow 
            ? '0 0 25px rgba(6, 182, 212, 0.35), 0 10px 25px rgba(0, 0, 0, 0.5)' 
            : '0 4px 14px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Ultra-attractive ResQNet Emblem */}
        <img 
          src="/src/assets/images/resqnet_pro_logo_1791908188634.jpg" 
          alt="ResQNet Ultra-Modern Emblem" 
          className="w-full h-full object-cover rounded-[inherit] transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Gloss / Sheen Highlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-60" />
      </div>
    </div>
  );
};
