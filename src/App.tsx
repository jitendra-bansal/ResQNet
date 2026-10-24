import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, 
  Heart, 
  Users, 
  Settings
} from 'lucide-react';
import { 
  UserProfile, 
  EmergencyContact, 
  SafetyPermissions, 
  AppNotification, 
  VitalsData, 
  ActivityEvent 
} from './types';
import { 
  INITIAL_PROFILE, 
  INITIAL_CONTACTS, 
  INITIAL_PERMISSIONS, 
  INITIAL_VITALS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_ACTIVITIES 
} from './mockData';

import { Header } from './components/Header';
import { VoiceChatOnboarding } from './components/VoiceChatOnboarding';
import { SecondContactPromptModal } from './components/SecondContactPromptModal';
import { HomeTab } from './components/HomeTab';
import { VitalsTab } from './components/VitalsTab';
import { ContactsTab } from './components/ContactsTab';
import { SettingsTab } from './components/SettingsTab';
import { PersonalAccountModal } from './components/PersonalAccountModal';
import { NotificationModal } from './components/NotificationModal';
import { EmergencySosModal } from './components/EmergencySosModal';
import { DangerDetectionModal } from './components/DangerDetectionModal';
import { AutonomousEscalationSentinel } from './components/AutonomousEscalationSentinel';
import { WhatsAppResponseView } from './components/WhatsAppResponseView';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { SeniorVoiceFab } from './components/SeniorVoiceFab';
import { Esp8266SetupModal } from './components/Esp8266SetupModal';
import { SmsNotificationToast } from './components/SmsNotificationToast';
import { speakAudibleMessage } from './utils/audio';
import { localizeProfileData, localizeContactsList } from './utils/i18n';

export default function App() {
  // Theme state: dark / light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('resqnet_theme') !== 'light';
  });

  // Show the initial Voice & Chat Onboarding Chatbot first (always starts from language page on reload)
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);

  // Core App States
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('resqnet_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });

  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem('resqnet_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  useEffect(() => {
    const syncContacts = () => {
      try {
        const saved = localStorage.getItem('resqnet_contacts');
        if (saved) setContacts(JSON.parse(saved));
      } catch {
        // ignore
      }
    };
    window.addEventListener('resqnet-contacts-updated', syncContacts);
    return () => window.removeEventListener('resqnet-contacts-updated', syncContacts);
  }, []);

  const [permissions, setPermissions] = useState<SafetyPermissions>(() => {
    const saved = localStorage.getItem('resqnet_permissions');
    return saved ? JSON.parse(saved) : INITIAL_PERMISSIONS;
  });

  const [vitals, setVitals] = useState<VitalsData>(INITIAL_VITALS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [activities, setActivities] = useState<ActivityEvent[]>(() => {
    const saved = localStorage.getItem('resqnet_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  // Navigation: Home, Vitals, Contacts, Settings
  const [activeTab, setActiveTab] = useState<'home' | 'vitals' | 'contacts' | 'settings'>('home');

  // Smart Safety Mode Toggle
  const [smartSafetyMode, setSmartSafetyMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voicePromptActive, setVoicePromptActive] = useState(false);

  // Modals
  const [personalAccountModalOpen, setPersonalAccountModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [emergencySosModalOpen, setEmergencySosModalOpen] = useState(false);
  const [sosTriggerSource, setSosTriggerSource] = useState<string | null>(null);
  const [sosInitialMode, setSosInitialMode] = useState<'countdown' | 'instant'>('instant');
  const [sosActionType, setSosActionType] = useState<'call' | 'sms'>('call');
  const [esp8266ModalOpen, setEsp8266ModalOpen] = useState(false);
  const [espTriggerCount, setEspTriggerCount] = useState(0);
  const [lastEspEventTime, setLastEspEventTime] = useState<string | null>(null);
  const [lastEspDeviceId, setLastEspDeviceId] = useState('ESP8266-Panic-Btn');
  const [espDefaultMode, setEspDefaultMode] = useState<'countdown' | 'instant'>(() => {
    return (localStorage.getItem('resqnet_esp_mode') as 'countdown' | 'instant') || 'instant';
  });
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [dangerDetectionType, setDangerDetectionType] = useState('Sudden Fall Impact & Cardiac Spike Detected');
  const [autonomousEscalationActive, setAutonomousEscalationActive] = useState(false);
  const [autonomousEscalationDanger, setAutonomousEscalationDanger] = useState('');
  const [voiceAssistantModalOpen, setVoiceAssistantModalOpen] = useState(false);
  const [seniorZoomActive, setSeniorZoomActive] = useState<boolean>(() => {
    return localStorage.getItem('resqnet_senior_zoom') === 'true';
  });

  // Live Phone Clock for realistic status bar
  const [phoneTime, setPhoneTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setPhoneTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleTriggerDangerDetection = (type = 'Sudden Fall Impact & Cardiac Spike Detected') => {
    setDangerDetectionType(type);
    setDangerModalOpen(true);
  };

  const handleTriggerAutonomousEscalation = (dangerDetails: string) => {
    setDangerModalOpen(false);
    setAutonomousEscalationDanger(dangerDetails);
    setAutonomousEscalationActive(true);
  };

  // Immediately apply dark class
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('resqnet_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('resqnet_theme', 'light');
    }
  };

  useEffect(() => {
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  // Persist State to Local Storage
  useEffect(() => {
    localStorage.setItem('resqnet_profile', JSON.stringify(userProfile));
    localStorage.setItem('resqnet_contacts', JSON.stringify(contacts));
    localStorage.setItem('resqnet_permissions', JSON.stringify(permissions));
    localStorage.setItem('resqnet_activities', JSON.stringify(activities));
  }, [userProfile, contacts, permissions, activities]);

  // Log Activity Helper
  const handleLogActivity = useCallback((
    category: ActivityEvent['category'],
    title: string,
    details: string,
    severity: 'nominal' | 'alert' | 'logged'
  ) => {
    const newAct: ActivityEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: 'Just now',
      category,
      title,
      details,
      severity,
    };
    setActivities(prev => [newAct, ...prev]);
  }, []);

  const handleUpdateContactsFromModal = useCallback((updatedContacts: EmergencyContact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('resqnet_contacts', JSON.stringify(updatedContacts));
  }, []);

  // Onboarding completion
  const handleOnboardingComplete = (
    profile: UserProfile,
    newContacts: EmergencyContact[],
    newPerms: SafetyPermissions
  ) => {
    const localizedProfile = localizeProfileData(profile, profile.language);
    const localizedContacts = localizeContactsList(newContacts, profile.language);
    setUserProfile(localizedProfile);
    setContacts(localizedContacts);
    setPermissions(newPerms);
    setHasOnboarded(true);
    localStorage.setItem('resqnet_voice_setup_done_v6', 'true');
    localStorage.setItem('resqnet_voice_chat_onboarded_v3', 'true');
    localStorage.setItem('resqnet_onboarded', 'true');
    localStorage.setItem('resqnet_profile', JSON.stringify(localizedProfile));
    localStorage.setItem('resqnet_contacts', JSON.stringify(localizedContacts));
    localStorage.setItem('resqnet_permissions', JSON.stringify(newPerms));
    localStorage.setItem('resqnet_app_usage_count', '1');
    sessionStorage.setItem('resqnet_session_counted', 'true');
    handleLogActivity('Check-in', 'Voice Setup Completed', 'Conversational senior onboarding completed.', 'nominal');
  };

  // App usage count for 3rd visit prompt
  const [showSecondContactModal, setShowSecondContactModal] = useState<boolean>(false);

  useEffect(() => {
    if (hasOnboarded) {
      const sessionKey = 'resqnet_session_counted';
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        const currentCount = parseInt(localStorage.getItem('resqnet_app_usage_count') || '1', 10);
        const nextCount = currentCount + 1;
        localStorage.setItem('resqnet_app_usage_count', nextCount.toString());

        const alreadyPrompted = localStorage.getItem('resqnet_second_contact_prompted') === 'true';
        if (nextCount >= 3 && !alreadyPrompted) {
          setShowSecondContactModal(true);
        }
      } else {
        const currentCount = parseInt(localStorage.getItem('resqnet_app_usage_count') || '1', 10);
        const alreadyPrompted = localStorage.getItem('resqnet_second_contact_prompted') === 'true';
        if (currentCount >= 3 && !alreadyPrompted) {
          setShowSecondContactModal(true);
        }
      }
    }
  }, [hasOnboarded]);

  // Unified Whole-App Language Switcher
  const handleSetLanguage = (nextLang: 'English' | 'Hindi') => {
    setUserProfile(prev => {
      const updated = localizeProfileData(prev, nextLang);
      localStorage.setItem('resqnet_profile', JSON.stringify(updated));
      return updated;
    });
    setContacts(prev => {
      const updated = localizeContactsList(prev, nextLang);
      localStorage.setItem('resqnet_contacts', JSON.stringify(updated));
      return updated;
    });
    const msg = nextLang === 'Hindi' 
      ? 'भाषा हिंदी में बदल दी गई है।' 
      : 'Language changed to English.';
    speakAudibleMessage(msg, nextLang === 'Hindi' ? 'hi-IN' : 'en-US');
  };

  const handleToggleLanguage = () => {
    const nextLang = userProfile.language === 'Hindi' ? 'English' : 'Hindi';
    handleSetLanguage(nextLang);
  };

  const handleUpdateProfileWithLanguageSync = (updated: UserProfile) => {
    const syncedProfile = localizeProfileData(updated, updated.language);
    setUserProfile(syncedProfile);
    localStorage.setItem('resqnet_profile', JSON.stringify(syncedProfile));
    setContacts(prev => {
      const syncedContacts = localizeContactsList(prev, updated.language);
      localStorage.setItem('resqnet_contacts', JSON.stringify(syncedContacts));
      return syncedContacts;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Real-Time ESP8266 Physical SOS Button Listener (Direct IoT Relay SSE + Local SSE + Polling)
  useEffect(() => {
    let lastHandledId = sessionStorage.getItem('resqnet_last_esp_event_id') || '';
    let isMounted = true;

    const triggerFromEspEvent = (ev: any, totalCount?: number, isLiveStream = false) => {
      if (!ev || !ev.id) return;
      if (typeof totalCount === 'number') {
        setEspTriggerCount(totalCount);
      } else {
        setEspTriggerCount(prev => prev + 1);
      }
      setLastEspEventTime(ev.formattedTime || new Date().toLocaleTimeString());
      if (ev.deviceId) {
        setLastEspDeviceId(ev.deviceId);
      }

      if (ev.id === lastHandledId) return;
      // Only check staleness for polled server state, never for live SSE stream messages
      if (!isLiveStream && ev.timestamp && Math.abs(Date.now() - ev.timestamp) > 30000) {
        lastHandledId = ev.id;
        sessionStorage.setItem('resqnet_last_esp_event_id', ev.id);
        return;
      }

      lastHandledId = ev.id;
      sessionStorage.setItem('resqnet_last_esp_event_id', ev.id);

      setEsp8266ModalOpen(false);

      const actionToUse: 'call' | 'sms' = ev.action === 'sms' ? 'sms' : 'call';
      const modeToUse: 'countdown' | 'instant' = 'instant';

      const pressLabel = actionToUse === 'sms' ? 'Single Press -> SMS' : 'Long Press -> Phone Call';
      setSosTriggerSource(
        `ESP8266 ${pressLabel} (${ev.deviceId || 'ESP8266'} · ${ev.pin || 'D2'})`
      );
      setSosActionType(actionToUse);
      setSosInitialMode(modeToUse);
      setEmergencySosModalOpen(true);

      handleLogActivity(
        'Sensor Monitor',
        `ESP8266 ${pressLabel} (${ev.deviceId || 'NodeMCU'})`,
        `Physical button ${pressLabel} detected on ${ev.pin || 'D2'}.`,
        'alert'
      );
    };

    // 1. Direct Public IoT Relay SSE (Bypasses AI Studio 302 cookie redirects completely!)
    let relayEs: EventSource | null = null;
    try {
      relayEs = new EventSource('https://ntfy.sh/resqnet_sos_027672a8/sse');
      relayEs.onmessage = msg => {
        if (!isMounted) return;
        try {
          const item = JSON.parse(msg.data);
          if ((item.event === 'message' || !item.event) && item.id) {
            let parsedMsg: any = {};
            try {
              parsedMsg = JSON.parse(item.message || '{}');
            } catch {
              const rawStr = String(item.message || '').toLowerCase();
              parsedMsg = {
                raw: item.message,
                action: rawStr.includes('sms') || rawStr.includes('single') ? 'sms' : 'call',
              };
            }
            const nowTs = Date.now();
            const act = parsedMsg.action === 'sms' ? 'sms' : 'call';
            triggerFromEspEvent(
              {
                id: item.id,
                deviceId: parsedMsg.deviceId || 'ESP8266-NodeMCU',
                mode: 'instant',
                action: act,
                pin: parsedMsg.pin || 'D2 (GPIO4)',
                timestamp: nowTs,
                formattedTime: new Date(nowTs).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              },
              undefined,
              true
            );
            // Also notify local backend
            fetch('/api/esp8266/sos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: parsedMsg.deviceId || 'ESP8266-NodeMCU',
                mode: 'instant',
                action: act,
                pin: parsedMsg.pin || 'D2 (GPIO4)',
              }),
            }).catch(() => {});
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      // ignore
    }

    // 2. Local Backend SSE Stream
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/esp8266/stream');
      es.onmessage = msg => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(msg.data);
          if (data.type === 'CONNECTED') {
            if (typeof data.triggerCount === 'number') setEspTriggerCount(data.triggerCount);
            if (data.latestEvent) {
              if (Date.now() - (data.latestEvent.timestamp || 0) <= 5000) {
                triggerFromEspEvent(data.latestEvent, data.triggerCount);
              } else {
                lastHandledId = data.latestEvent.id;
                sessionStorage.setItem('resqnet_last_esp_event_id', data.latestEvent.id);
                setLastEspEventTime(data.latestEvent.formattedTime);
                if (data.latestEvent.deviceId) setLastEspDeviceId(data.latestEvent.deviceId);
              }
            }
          } else if (data.type === 'ESP8266_SOS_TRIGGERED' && data.event) {
            triggerFromEspEvent(data.event, data.triggerCount);
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      // fallback to polling
    }

    // 3. Fallback polling every 1.5s to local backend
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const res = await fetch('/api/esp8266/status');
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.triggerCount === 'number') {
          setEspTriggerCount(data.triggerCount);
        }
        if (data.latestEvent) {
          triggerFromEspEvent(data.latestEvent, data.triggerCount);
        }
      } catch {
        // ignore network error
      }
    }, 1500);

    // 4. Browser-side JSON poll fallback every 4s (in case mobile hotspot buffers SSE)
    const relayPollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const res = await fetch('https://ntfy.sh/resqnet_sos_027672a8/json?poll=1&since=10s');
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if ((item.event === 'message' || !item.event) && item.id) {
              let parsedMsg: any = {};
              try {
                parsedMsg = JSON.parse(item.message || '{}');
              } catch {
                const rawStr = String(item.message || '').toLowerCase();
                parsedMsg = {
                  raw: item.message,
                  action: rawStr.includes('sms') || rawStr.includes('single') ? 'sms' : 'call',
                };
              }
              const nowTs = Date.now();
              triggerFromEspEvent(
                {
                  id: item.id,
                  deviceId: parsedMsg.deviceId || 'ESP8266-NodeMCU',
                  mode: 'instant',
                  action: parsedMsg.action === 'sms' ? 'sms' : 'call',
                  pin: parsedMsg.pin || 'D2 (GPIO4)',
                  timestamp: nowTs,
                  formattedTime: new Date(nowTs).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }),
                },
                undefined,
                true
              );
            }
          } catch {
            // ignore line error
          }
        }
      } catch {
        // ignore network error
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (relayEs) relayEs.close();
      if (es) es.close();
      clearInterval(pollInterval);
      clearInterval(relayPollInterval);
    };
  }, [espDefaultMode, userProfile.language]);

  const isWhatsAppApprovalRoute = 
    typeof window !== 'undefined' && (
      window.location.pathname.includes('whatsapp-approve') || 
      window.location.pathname.includes('approve-contact') ||
      window.location.search.includes('action=approve') ||
      window.location.search.includes('action=decline') ||
      window.location.search.includes('whatsapp_action')
    );

  if (isWhatsAppApprovalRoute) {
    return <WhatsAppResponseView />;
  }

  // 1. If not onboarded yet, show Senior Voice & Chat Setup (Language first, then Permissions in Chat)
  if (!hasOnboarded) {
    return (
      <>
        <VoiceChatOnboarding 
          existingProfile={userProfile}
          onComplete={(profile, newContacts, newPerms) => {
            handleOnboardingComplete(profile, newContacts, newPerms);
          }}
          isDarkMode={isDarkMode}
        />
        <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHasOnboarded(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer border border-slate-600"
          >
            <span>🏠 Home Screen</span>
          </button>
          <button
            type="button"
            onClick={() => setEsp8266ModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer border border-cyan-400/40"
          >
            <span>⚡ ESP8266 SOS</span>
          </button>
        </div>
        <EmergencySosModal
          isOpen={emergencySosModalOpen}
          onClose={() => {
            setEmergencySosModalOpen(false);
            setSosTriggerSource(null);
            setSosInitialMode('countdown');
            setSosActionType('call');
          }}
          userProfile={userProfile}
          contacts={contacts}
          onUpdateContacts={updatedContacts => {
            setContacts(updatedContacts);
            localStorage.setItem('resqnet_contacts', JSON.stringify(updatedContacts));
          }}
          onLogActivity={handleLogActivity}
          triggerSource={sosTriggerSource}
          initialMode={sosInitialMode}
          actionType={sosActionType}
          triggerKey={espTriggerCount}
        />
        <Esp8266SetupModal
          isOpen={esp8266ModalOpen}
          onClose={() => setEsp8266ModalOpen(false)}
          isDarkMode={isDarkMode}
          language={userProfile.language}
          triggerCount={espTriggerCount}
          lastEventTime={lastEspEventTime}
          lastDeviceId={lastEspDeviceId}
          espDefaultMode={espDefaultMode}
          onChangeDefaultMode={m => {
            setEspDefaultMode(m);
            localStorage.setItem('resqnet_esp_mode', m);
          }}
        />
      </>
    );
  }

  const isHindi = userProfile.language === 'Hindi';

  // Mobile Bottom Navigation tabs
  const navTabs = [
    { id: 'home', label: isHindi ? 'होम' : 'Home', icon: Home, color: 'text-emerald-500' },
    { id: 'vitals', label: isHindi ? 'स्वास्थ्य' : 'Health', icon: Heart, color: 'text-rose-500' },
    { id: 'contacts', label: isHindi ? 'परिवार' : 'Family', icon: Users, color: 'text-purple-500' },
    { id: 'settings', label: isHindi ? 'सेटिंग्स' : 'Settings', icon: Settings, color: 'text-cyan-500' },
  ] as const;

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 sm:bg-slate-900 text-slate-100' : 'bg-slate-100 sm:bg-slate-200 text-slate-900'
    } p-0 sm:p-4`}>
      
      {/* MOBILE PHONE CHASSIS CONTAINER */}
      <div className={`w-full max-w-md min-h-screen sm:min-h-[860px] sm:max-h-[94vh] sm:rounded-[44px] shadow-2xl flex flex-col overflow-hidden border-0 sm:border-[8px] sm:border-slate-800 relative ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        
        {/* MOBILE TOP STATUS BAR */}
        <div className={`w-full px-5 py-2 flex items-center justify-between text-xs font-bold select-none border-b shrink-0 z-40 ${
          isDarkMode ? 'bg-slate-950 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="font-mono text-[11px] font-black tracking-tight">
            {phoneTime}
          </div>
          
          {/* Dynamic Island / Speaker notch */}
          <div className="w-20 h-3.5 bg-black rounded-full mx-auto shadow-inner flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-900 ring-1 ring-slate-800" />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="font-extrabold text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">5G</span>
            <span>📶</span>
            <span>98% 🔋</span>
          </div>
        </div>

        {/* TOP MOBILE APP HEADER */}
        <Header
          userProfile={userProfile}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setNotificationsModalOpen(true)}
          smartSafetyMode={smartSafetyMode}
          onToggleSmartSafety={() => {
            setSmartSafetyMode(!smartSafetyMode);
            handleLogActivity('Sensor Monitor', `Smart Safety: ${!smartSafetyMode ? 'Activated' : 'Paused'}`, 'Monitoring mode toggle altered.', 'logged');
          }}
          onTriggerSos={() => setEmergencySosModalOpen(true)}
          onTriggerDangerDetection={() => handleTriggerDangerDetection()}
          onTriggerVoiceCheck={() => {
            setVoiceAssistantModalOpen(true);
          }}
          voicePromptActive={voiceAssistantModalOpen || voicePromptActive}
          onClickLogo={() => setActiveTab('home')}
          onToggleLanguage={handleToggleLanguage}
        />

        {/* SCROLLABLE MOBILE CONTENT VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-3.5 pb-28">
          
          {activeTab === 'home' && (
            <HomeTab
              userProfile={userProfile}
              vitals={vitals}
              contacts={contacts}
              onNavigateToContacts={() => setActiveTab('contacts')}
              onNavigateToVitals={() => setActiveTab('vitals')}
              onTriggerSosDirect={() => {
                setSosTriggerSource(null);
                setSosInitialMode('countdown');
                setEmergencySosModalOpen(true);
              }}
              onTriggerDangerDetection={handleTriggerDangerDetection}
              isDarkMode={isDarkMode}
              onLogActivity={handleLogActivity}
              voicePromptActive={voicePromptActive}
              onCloseVoicePrompt={() => setVoicePromptActive(false)}
              onOpenVoicePrompt={() => setVoiceAssistantModalOpen(true)}
              onOpenEsp8266Setup={() => setEsp8266ModalOpen(true)}
              onOpenSetupChatbot={() => {
                localStorage.removeItem('resqnet_voice_setup_done_v6');
                setHasOnboarded(false);
              }}
              espTriggerCount={espTriggerCount}
              lastEspEventTime={lastEspEventTime}
            />
          )}

          {activeTab === 'vitals' && (
            <VitalsTab
              userProfile={userProfile}
              vitals={vitals}
              onUpdateVitals={setVitals}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsTab
              contacts={contacts}
              onAddContact={newContact => setContacts(prev => [...prev, newContact])}
              onRemoveContact={id => setContacts(prev => prev.filter(c => c.id !== id))}
              isDarkMode={isDarkMode}
              onLogActivity={handleLogActivity}
              language={userProfile.language}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfileWithLanguageSync}
              permissions={permissions}
              onUpdatePermissions={setPermissions}
              isDarkMode={isDarkMode}
              onToggleTheme={handleToggleTheme}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={setNotificationsEnabled}
              onNavigateToContacts={() => setActiveTab('contacts')}
              onToggleLanguage={handleToggleLanguage}
              onOpenEsp8266Setup={() => setEsp8266ModalOpen(true)}
              onRestartOnboarding={() => setHasOnboarded(false)}
            />
          )}

        </main>

        {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
        <div className={`absolute bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl flex items-center justify-around h-18 px-1 transition-colors ${
          isDarkMode 
            ? 'bg-slate-950/95 border-slate-800 text-slate-400' 
            : 'bg-white/95 border-slate-200 text-slate-600 shadow-2xl'
        }`}>
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
                  isActive ? 'scale-105 font-black text-slate-900 dark:text-white' : 'hover:opacity-80'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? `${tab.color} bg-black/5 dark:bg-white/10 shadow-sm` : 'text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-bold mt-0.5 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* FLOATING SENIOR VOICE ASSISTANT FAB (CONTAINED INSIDE PHONE BOX) */}
        <SeniorVoiceFab
          onClick={() => setVoiceAssistantModalOpen(true)}
          language={userProfile.language}
          isDarkMode={isDarkMode}
          isActive={voiceAssistantModalOpen}
        />

        {/* BOTTOM HOME PILL INDICATOR */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="w-28 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
        </div>

      </div>

      {/* PERSONAL ACCOUNT MODAL */}
      <PersonalAccountModal
        isOpen={personalAccountModalOpen}
        onClose={() => setPersonalAccountModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfileWithLanguageSync}
        contacts={contacts}
        onRemoveContact={id => setContacts(prev => prev.filter(c => c.id !== id))}
        onAddContact={newContact => setContacts(prev => [...prev, newContact])}
        permissions={permissions}
        onUpdatePermissions={setPermissions}
        isDarkMode={isDarkMode}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={setNotificationsEnabled}
      />

      {/* NOTIFICATIONS DRAWER / MODAL */}
      <NotificationModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        isDarkMode={isDarkMode}
        language={userProfile.language}
      />

      {/* EMERGENCY SOS COUNTDOWN & DISPATCH MODAL */}
      <EmergencySosModal
        isOpen={emergencySosModalOpen}
        onClose={() => {
          setEmergencySosModalOpen(false);
          setSosTriggerSource(null);
          setSosInitialMode('countdown');
          setSosActionType('call');
        }}
        userProfile={userProfile}
        contacts={contacts}
        onUpdateContacts={handleUpdateContactsFromModal}
        onLogActivity={handleLogActivity}
        triggerSource={sosTriggerSource}
        initialMode={sosInitialMode}
        actionType={sosActionType}
        triggerKey={espTriggerCount}
      />

      {/* ESP8266 HARDWARE SOS BUTTON SETUP & LIVE WEBHOOK MODAL */}
      <Esp8266SetupModal
        isOpen={esp8266ModalOpen}
        onClose={() => setEsp8266ModalOpen(false)}
        isDarkMode={isDarkMode}
        language={userProfile.language}
        triggerCount={espTriggerCount}
        lastEventTime={lastEspEventTime}
        lastDeviceId={lastEspDeviceId}
        espDefaultMode={espDefaultMode}
        onChangeDefaultMode={m => {
          setEspDefaultMode(m);
          localStorage.setItem('resqnet_esp_mode', m);
        }}
      />

      {/* AUTONOMOUS DANGER DETECTION PROTOCOL */}
      <DangerDetectionModal
        isOpen={dangerModalOpen}
        onClose={() => setDangerModalOpen(false)}
        userProfile={userProfile}
        contacts={contacts}
        vitals={vitals}
        onTriggerAmbulance={() => {
          setDangerModalOpen(false);
          setEmergencySosModalOpen(true);
        }}
        onTriggerAutonomousEscalation={handleTriggerAutonomousEscalation}
        onLogActivity={handleLogActivity}
        isDarkMode={isDarkMode}
        initialDangerType={dangerDetectionType}
      />

      {/* AUTONOMOUS ESCALATION SENTINEL */}
      <AutonomousEscalationSentinel
        isActive={autonomousEscalationActive}
        onDeactivate={() => setAutonomousEscalationActive(false)}
        userProfile={userProfile}
        contacts={contacts}
        vitals={vitals}
        dangerDetails={autonomousEscalationDanger}
        onTriggerAmbulance={() => {
          setAutonomousEscalationActive(false);
          setEmergencySosModalOpen(true);
        }}
        onLogActivity={handleLogActivity}
        isDarkMode={isDarkMode}
      />

      {/* FULL APP VOICE-BASED NLP ASSISTANT MODAL */}
      <VoiceAssistantModal
        isOpen={voiceAssistantModalOpen}
        onClose={() => setVoiceAssistantModalOpen(false)}
        userProfile={userProfile}
        onUpdateLanguage={handleSetLanguage}
        currentTab={activeTab}
        onNavigateTab={tabId => {
          if (tabId === 'settings') {
            setActiveTab('settings');
          } else {
            setActiveTab(tabId as any);
          }
        }}
        vitals={vitals}
        onTriggerSos={() => setEmergencySosModalOpen(true)}
        onCancelSos={() => setEmergencySosModalOpen(false)}
        onLogActivity={handleLogActivity}
        primaryContactName={contacts.find(c => c.priority === 'Primary')?.name || contacts[0]?.name}
        isDarkMode={isDarkMode}
        isSeniorZoomActive={seniorZoomActive}
        onToggleSeniorZoom={() => {
          setSeniorZoomActive(prev => {
            const next = !prev;
            localStorage.setItem('resqnet_senior_zoom', next ? 'true' : 'false');
            return next;
          });
        }}
      />

      {/* 3RD APP VISIT SECOND EMERGENCY CONTACT PROMPT */}
      <SecondContactPromptModal
        isOpen={showSecondContactModal}
        onClose={() => setShowSecondContactModal(false)}
        onAddContact={(newContact) => {
          const updatedContacts = [...contacts, newContact];
          setContacts(updatedContacts);
          localStorage.setItem('resqnet_contacts', JSON.stringify(updatedContacts));
          handleLogActivity('Check-in', 'Secondary Contact Added', `User added ${newContact.name} on 3rd visit prompt.`, 'nominal');
        }}
        userName={userProfile.name}
        language={userProfile.language}
        isDarkMode={isDarkMode}
      />

      {/* REAL-TIME CARRIER SMS PUSH NOTIFICATION TOAST */}
      <SmsNotificationToast isHindi={userProfile.language === 'Hindi'} />

    </div>
  );
}
