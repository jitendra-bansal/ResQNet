import React from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  ShieldAlert, 
  PhoneCall, 
  Sparkles, 
  Activity,
  Radio
} from 'lucide-react';
import { AppNotification } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  isDarkMode: boolean;
  language?: 'English' | 'Hindi';
}

const NOTIFICATION_HI_MAP: Record<string, { title: string; message: string; timestamp: string }> = {
  'n-1': {
    title: 'आपातकालीन प्रतिक्रिया प्रणाली सक्रिय',
    message: '108 मेडिकल और 112 राष्ट्रीय आपातकालीन सेवाएं लाइव जीपीएस के साथ जुड़ी हुई हैं।',
    timestamp: '10 मिनट पहले'
  },
  'n-2': {
    title: 'आवाज़ सुरक्षा जांच चालू है',
    message: 'आवाज़ आधारित स्वास्थ्य सहायता और आपातकालीन सुरक्षा टाइमर सक्रिय है।',
    timestamp: '1 घंटे पहले'
  },
  'n-3': {
    title: 'सुरक्षा संपर्क सूची समन्वयित',
    message: 'आपका आपातकालीन परिवार संपर्क नेटवर्क सत्यापित और सक्रिय है।',
    timestamp: 'कल, शाम 4:15'
  },
  'n-4': {
    title: 'स्मार्ट सुरक्षा मोड सामान्य',
    message: 'मोशन सेंसर और स्वास्थ्य निगरानी सामान्य रूप से कार्य कर रहे हैं।',
    timestamp: 'कल, सुबह 8:00'
  }
};

export const NotificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  isDarkMode,
  language = 'English',
}) => {
  if (!isOpen) return null;

  const isHindi = language === 'Hindi';
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4 text-cyan-500" />;
      case 'update':
        return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'sms':
        return <PhoneCall className="w-4 h-4 text-purple-500" />;
      case 'system':
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className={`max-w-md w-full rounded-3xl border p-4 sm:p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 relative shrink-0">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">
                {isHindi ? 'सूचनाएं और अपडेट' : 'Notifications & Alerts'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isHindi ? 'सुरक्षा और स्वास्थ्य अपडेट' : 'Safety & wellness updates'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between text-xs px-0.5">
          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>
              {unreadCount > 0 
                ? (isHindi ? `${unreadCount} नई सूचनाएं` : `${unreadCount} unread notifications`) 
                : (isHindi ? 'सभी सूचनाएं पढ़ी जा चुकी हैं' : 'All caught up')}
            </span>
          </span>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isHindi ? 'सभी को पढ़ा हुआ चिह्नित करें' : 'Mark all as read'}</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {notifications.map(n => {
            const hiData = NOTIFICATION_HI_MAP[n.id];
            const displayTitle = isHindi && hiData ? hiData.title : n.title;
            const displayMsg = isHindi && hiData ? hiData.message : n.message;
            const displayTime = isHindi && hiData ? hiData.timestamp : n.timestamp;

            return (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  !n.read
                    ? isDarkMode
                      ? 'bg-cyan-950/20 border-cyan-500/30'
                      : 'bg-cyan-50/70 border-cyan-200'
                    : isDarkMode
                    ? 'bg-slate-950/50 border-slate-800/80 opacity-80'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold truncate">{displayTitle}</h4>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{displayTime}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {displayMsg}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isHindi ? 'बंद करें' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
