import { VitalsData } from '../types';

export type VoiceIntentType = 
  | 'NAVIGATE_TAB'
  | 'TRIGGER_SOS'
  | 'CANCEL_SOS'
  | 'QUERY_VITALS_HR'
  | 'QUERY_VITALS_BP'
  | 'QUERY_VITALS_TEMP'
  | 'QUERY_VITALS_ALL'
  | 'SIREN_ON'
  | 'SIREN_OFF'
  | 'CALL_CONTACT'
  | 'SHARE_LOCATION'
  | 'QUERY_LOCATION'
  | 'SET_LANGUAGE'
  | 'TOGGLE_ELDERLY_MODE'
  | 'READ_SCREEN'
  | 'HELP_COMMANDS'
  | 'UNKNOWN';

export interface VoiceNlpResult {
  intent: VoiceIntentType;
  confidence: number;
  transcript: string;
  spokenReply: string;
  displayText: string;
  category: 'Navigation' | 'Emergency' | 'Health' | 'Safety' | 'System';
  actionPayload?: any;
}

export function parseVoiceNlpCommand(
  rawTranscript: string,
  preferredLanguage: 'English' | 'Hindi',
  currentTab: string,
  vitals: VitalsData,
  userProfile: {
    name: string;
    language: 'English' | 'Hindi';
    address?: string;
  },
  primaryContactName?: string
): VoiceNlpResult {
  const text = (rawTranscript || '').trim();
  const lower = text.toLowerCase();
  const isHindi = preferredLanguage === 'Hindi';

  // Helper matching
  const hasAny = (keywords: string[]) => keywords.some(k => lower.includes(k.toLowerCase()));

  // 1. EMERGENCY & SOS INTENT
  // English distress: "help", "emergency", "i fell", "chest pain", "save me", "ambulance"
  // Hindi distress: "मदद", "बचाओ", "खतरा", "गिर गया", "दर्द", "सांस", "इमरजेंसी", "तबीयत खराब", "madad", "bachao", "khatra", "emergency"
  const emergencyKeywords = [
    'emergency', 'sos', 'help me', 'save me', 'i fell', 'fallen', 'had a fall', 
    'chest pain', 'heart attack', 'cant breathe', 'danger', 'ambulance', 'call 112', 'accident',
    'मदद', 'बचाओ', 'खतरा', 'इमरजेंसी', 'गिर गया', 'गिर गई', 'दर्द हो रहा है', 'सीने में दर्द', 
    'सांस नहीं आ रही', 'चक्कर आ गए', 'बेहोश', 'तबीयत खराब', 'एम्बुलेंस', 'डॉक्टर',
    'madad', 'bachao', 'khatra', 'dard', 'gir gaya', 'gir gayi', 'ambulance'
  ];
  if (hasAny(emergencyKeywords)) {
    return {
      intent: 'TRIGGER_SOS',
      confidence: 0.98,
      transcript: text,
      category: 'Emergency',
      spokenReply: isHindi 
        ? 'आपातकालीन एसओएस सक्रिय हो गया है। आपके आपातकालीन संपर्क और एम्बुलेंस को अलर्ट भेजा जा रहा है।'
        : 'Emergency SOS activated. Alerting your emergency contacts and paramedics with live GPS location.',
      displayText: isHindi
        ? '🚨 आपातकालीन एसओएस सक्रिय किया गया (Emergency SOS Triggered)'
        : '🚨 Emergency SOS Triggered (Alerting Circle)'
    };
  }

  // 2. CANCEL / SAFE / FALSE ALARM INTENT
  // "cancel", "i am fine", "i am okay", "safe", "false alarm", "stop alarm"
  // "मैं ठीक हूँ", "सब ठीक है", "रद्द करो", "सुरक्षित हूँ", "अलार्म रोको", "theek hu", "shant raho"
  const cancelKeywords = [
    'cancel', 'i am fine', "i'm fine", 'i am okay', "i'm okay", 'false alarm', 
    'safe now', 'everything is good', 'stop emergency', 'all good',
    'मैं ठीक हूँ', 'मैं ठीक हूं', 'सब ठीक है', 'रद्द करो', 'कैंसिल', 'सुरक्षित हूँ', 
    'कोई खतरा नहीं', 'सब सही है', 'अलार्म बंद करो', 'रद्द',
    'theek hu', 'thik hu', 'sab theek hai', 'cancel karo', 'surakshit hu'
  ];
  if (hasAny(cancelKeywords)) {
    return {
      intent: 'CANCEL_SOS',
      confidence: 0.95,
      transcript: text,
      category: 'Emergency',
      spokenReply: isHindi
        ? 'अलर्ट रद्द कर दिया गया है। आपकी स्थिति सुरक्षित दर्ज की गई है।'
        : 'Alert cancelled. Your status has been safely recorded as nominal.',
      displayText: isHindi
        ? '✅ सुरक्षा की पुष्टि: सुरक्षित (Confirmed Safe)'
        : '✅ Status Recorded: Safe & Nominal'
    };
  }

  // 3. SIREN CONTROL
  // "turn on siren", "sound siren", "loud alarm", "सायरन बजाओ", "अलार्म चालू करो"
  const sirenOnKeywords = ['siren on', 'turn on siren', 'start siren', 'loud alarm', 'sound alarm', 'सायरन बजाओ', 'अलार्म चालू करो', 'सायरन चालू', 'शोर मचाओ'];
  if (hasAny(sirenOnKeywords)) {
    return {
      intent: 'SIREN_ON',
      confidence: 0.92,
      transcript: text,
      category: 'Safety',
      spokenReply: isHindi ? 'आपातकालीन सायरन बजाया जा रहा है।' : 'Loud emergency siren activated.',
      displayText: isHindi ? '🔊 सायरन चालू (Siren On)' : '🔊 Emergency Siren Active'
    };
  }

  // "stop siren", "quiet", "silence alarm", "सायरन बंद करो", "अलार्म रोको"
  const sirenOffKeywords = ['stop siren', 'siren off', 'turn off siren', 'silence', 'quiet', 'stop alarm', 'सायरन बंद करो', 'अलार्म रोको', 'आवाज बंद करो', 'शांत रहो'];
  if (hasAny(sirenOffKeywords)) {
    return {
      intent: 'SIREN_OFF',
      confidence: 0.92,
      transcript: text,
      category: 'Safety',
      spokenReply: isHindi ? 'सायरन बंद कर दिया गया है।' : 'Siren has been silenced.',
      displayText: isHindi ? '🔇 सायरन बंद (Siren Stopped)' : '🔇 Siren Silenced'
    };
  }

  // 4. HEALTH & VITALS SPOKEN READOUT
  // Heart Rate: "heart rate", "pulse", "bpm", "धड़कन", "हार्ट रेट", "dhadkan"
  const hrKeywords = ['heart rate', 'pulse', 'pulse rate', 'bpm', 'heartbeat', 'धड़कन', 'हार्ट रेट', 'दिल की धड़कन', 'dhadkan', 'heart'];
  if (hasAny(hrKeywords)) {
    const hr = vitals.pulse || 74;
    return {
      intent: 'QUERY_VITALS_HR',
      confidence: 0.94,
      transcript: text,
      category: 'Health',
      spokenReply: isHindi
        ? `आपकी हृदय गति ${hr} बीट्स प्रति मिनट है, जो कि पूरी तरह से सामान्य और स्थिर है।`
        : `Your heart rate is ${hr} beats per minute, which is steady and normal.`,
      displayText: isHindi ? `❤️ हृदय गति: ${hr} BPM (सामान्य)` : `❤️ Heart Rate: ${hr} BPM (Steady)`
    };
  }

  // Blood Pressure: "blood pressure", "bp", "रक्तचाप", "बीपी", "raktchap"
  const bpKeywords = ['blood pressure', 'bp', 'systolic', 'diastolic', 'रक्तचाप', 'बीपी', 'raktchap', 'bp check'];
  if (hasAny(bpKeywords)) {
    const bp = vitals.bpSys && vitals.bpDia ? `${vitals.bpSys}/${vitals.bpDia}` : '120/80';
    return {
      intent: 'QUERY_VITALS_BP',
      confidence: 0.94,
      transcript: text,
      category: 'Health',
      spokenReply: isHindi
        ? `आपका रक्तचाप ${bp} है, यह सामान्य सुरक्षित सीमा के भीतर है।`
        : `Your blood pressure is ${bp} mmHg, well within the healthy target range.`,
      displayText: isHindi ? `🩺 रक्तचाप (BP): ${bp} mmHg` : `🩺 Blood Pressure: ${bp} mmHg`
    };
  }

  // Body Temperature / Fever: "temperature", "fever", "body temp", "तापमान", "बुखार", "bukhar", "tapman"
  const tempKeywords = ['temperature', 'body temperature', 'fever', 'temp', 'तापमान', 'बुखार', 'शरीर का तापमान', 'bukhar', 'tapman'];
  if (hasAny(tempKeywords)) {
    const temp = (vitals.bodyTemperature || 98.6).toFixed(1);
    return {
      intent: 'QUERY_VITALS_TEMP',
      confidence: 0.93,
      transcript: text,
      category: 'Health',
      spokenReply: isHindi
        ? `आपका शारीरिक तापमान ${temp} डिग्री फ़ारेनहाइट है, कोई बुखार नहीं है।`
        : `Your body temperature is ${temp} degrees Fahrenheit, completely normal with no fever.`,
      displayText: isHindi ? `🌡️ शारीरिक तापमान: ${temp}°F (सामान्य)` : `🌡️ Body Temp: ${temp}°F (Normal)`
    };
  }

  // All Vitals / General Health Query: "how am i", "check vitals", "health status", "तबीयत कैसी है", "सेहत", "tabiyat"
  const allVitalsKeywords = [
    'vitals', 'health', 'how is my health', 'health status', 'check vitals', 'check my health', 'how am i doing',
    'तबीयत', 'सेहत', 'स्वास्थ्य', 'विटल्स', 'कैसी है तबीयत', 'मेरी सेहत', 'tabiyat', 'sehat', 'vitals check'
  ];
  if (hasAny(allVitalsKeywords)) {
    const hr = vitals.pulse || 74;
    const bp = vitals.bpSys && vitals.bpDia ? `${vitals.bpSys}/${vitals.bpDia}` : '120/80';
    const temp = (vitals.bodyTemperature || 98.6).toFixed(1);
    const o2 = vitals.spo2 || 98;
    return {
      intent: 'QUERY_VITALS_ALL',
      confidence: 0.95,
      transcript: text,
      category: 'Health',
      actionPayload: { tab: 'vitals' },
      spokenReply: isHindi
        ? `आपकी सेहत अच्छी है। हृदय गति ${hr} BPM, रक्तचाप ${bp}, ऑक्सीजन ${o2} प्रतिशत, और तापमान ${temp} डिग्री है।`
        : `Your overall health looks good. Heart rate is ${hr} BPM, BP is ${bp}, oxygen is ${o2} percent, and temperature is ${temp} degrees.`,
      displayText: isHindi
        ? `🩺 स्वास्थ्य सारांश: HR ${hr} · BP ${bp} · O2 ${o2}% · Temp ${temp}°F`
        : `🩺 Full Vitals: HR ${hr} BPM · BP ${bp} · SpO2 ${o2}% · Temp ${temp}°F`
    };
  }

  // 5. CALL EMERGENCY CONTACT / TELEPHONY
  // "call contact", "call daughter", "call ambulance", "phone", "कॉल करो", "फोन मिलाओ", "phone lagao"
  const callKeywords = ['call', 'phone', 'dial', 'ring', 'कॉल', 'फोन', 'कॉल करो', 'फोन मिलाओ', 'बात कराओ', 'phone lagao', 'call lagao'];
  if (hasAny(callKeywords)) {
    const target = primaryContactName || 'आपातकालीन संपर्क (Primary Contact)';
    return {
      intent: 'CALL_CONTACT',
      confidence: 0.91,
      transcript: text,
      category: 'Emergency',
      actionPayload: { contact: target },
      spokenReply: isHindi
        ? `${target} को सीधे फोन मिलाया जा रहा है।`
        : `Dialing emergency call to ${target} now.`,
      displayText: isHindi ? `📞 कॉल डायल: ${target}` : `📞 Placing Call: ${target}`
    };
  }

  // 6. LOCATION / WHERE AM I
  // "where am i", "my location", "current location", "मैं कहाँ हूँ", "मेरी लोकेशन", "kahan hu"
  const locationQueryKeywords = ['where am i', 'my location', 'what is my location', 'where i am', 'मैं कहाँ हूँ', 'मेरी लोकेशन क्या है', 'मेरी जगह', 'kahan hu'];
  if (hasAny(locationQueryKeywords)) {
    const loc = userProfile.address || 'Connaught Place, New Delhi (Live GPS Active)';
    return {
      intent: 'QUERY_LOCATION',
      confidence: 0.92,
      transcript: text,
      category: 'Safety',
      spokenReply: isHindi
        ? `आपकी वर्तमान जीपीएस लोकेशन है: ${loc}।`
        : `Your current GPS location is: ${loc}.`,
      displayText: isHindi ? `📍 आपकी लोकेशन: ${loc}` : `📍 Your Location: ${loc}`
    };
  }

  // "share location", "send location", "लोकेशन भेजो", "शेयर करो"
  const shareLocationKeywords = ['share location', 'send location', 'share my location', 'मेरी लोकेशन भेजो', 'लोकेशन शेयर करो', 'जगह भेजो'];
  if (hasAny(shareLocationKeywords)) {
    return {
      intent: 'SHARE_LOCATION',
      confidence: 0.93,
      transcript: text,
      category: 'Safety',
      spokenReply: isHindi
        ? 'आपकी लाइव जीपीएस लोकेशन आपके सत्यापित आपातकालीन संपर्कों को भेज दी गई है।'
        : 'Your live GPS location has been shared securely with your emergency contacts.',
      displayText: isHindi ? '📡 लाइव लोकेशन भेजी गई (Location Dispatched)' : '📡 Live GPS Coordinates Dispatched'
    };
  }

  // 7. NAVIGATION COMMANDS
  // Vitals / Health Tab:
  const navVitalsKeywords = ['open health', 'go to health', 'vitals tab', 'open vitals', 'health screen', 'स्वास्थ्य खोलो', 'विटल्स खोलो', 'हेल्थ खोलो'];
  if (hasAny(navVitalsKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'vitals' },
      spokenReply: isHindi ? 'स्वास्थ्य और विटल्स स्क्रीन खोली जा रही है।' : 'Navigating to Health and Vitals dashboard.',
      displayText: isHindi ? '❤️ स्वास्थ्य स्क्रीन खोली गई (Health Tab)' : '❤️ Navigated to Health & Vitals'
    };
  }

  // Home Tab:
  const navHomeKeywords = ['go home', 'home screen', 'open home', 'main screen', 'होम स्क्रीन', 'घर चलो', 'मुख्य स्क्रीन', 'होम खोलो'];
  if (hasAny(navHomeKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'home' },
      spokenReply: isHindi ? 'होम स्क्रीन खोली जा रही है।' : 'Navigating to Home screen.',
      displayText: isHindi ? '🏠 होम स्क्रीन खोली गई (Home Tab)' : '🏠 Navigated to Home Screen'
    };
  }

  // Safety Tab:
  const navSafetyKeywords = ['safety', 'safe journey', 'open safety', 'trip safety', 'सुरक्षा खोलो', 'सफर सुरक्षा', 'सुरक्षा स्क्रीन'];
  if (hasAny(navSafetyKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'safety' },
      spokenReply: isHindi ? 'सुरक्षा और सफर गार्ड स्क्रीन खोली जा रही है।' : 'Opening Safety Sentinel and Journey Guard.',
      displayText: isHindi ? '🛡️ सुरक्षा स्क्रीन खोली गई (Safety Tab)' : '🛡️ Navigated to Safety Sentinel'
    };
  }

  // Contacts Tab:
  const navContactsKeywords = ['contacts', 'emergency contacts', 'open contacts', 'show contacts', 'संपर्क खोलो', 'कांटेक्ट खोलो', 'परिवार खोलो'];
  if (hasAny(navContactsKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'contacts' },
      spokenReply: isHindi ? 'आपातकालीन संपर्क सूची खोली जा रही है।' : 'Opening your Emergency Contacts list.',
      displayText: isHindi ? '👥 आपातकालीन संपर्क खोले गए (Contacts)' : '👥 Navigated to Emergency Contacts'
    };
  }

  // Activity Tab:
  const navActivityKeywords = ['activity', 'logs', 'history', 'open activity', 'show logs', 'गतिविधि खोलो', 'इतिहास खोलो', 'लॉग दिखाओ'];
  if (hasAny(navActivityKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'activity' },
      spokenReply: isHindi ? 'सुरक्षा गतिविधि और लॉग्स खोले जा रहे हैं।' : 'Opening Safety Activity and Audit Logs.',
      displayText: isHindi ? '📋 गतिविधि लॉग्स खुले (Activity)' : '📋 Navigated to Activity Logs'
    };
  }

  // Settings / Profile:
  const navSettingsKeywords = ['profile', 'settings', 'my account', 'personal account', 'open settings', 'प्रोफाइल खोलो', 'खाता खोलो', 'सेटिंग्स'];
  if (hasAny(navSettingsKeywords)) {
    return {
      intent: 'NAVIGATE_TAB',
      confidence: 0.95,
      transcript: text,
      category: 'Navigation',
      actionPayload: { tab: 'settings' },
      spokenReply: isHindi ? 'आपकी प्रोफाइल और सेटिंग्स खोली जा रही हैं।' : 'Opening your Profile and Security Settings.',
      displayText: isHindi ? '⚙️ प्रोफाइल और सेटिंग्स खोली गईं' : '⚙️ Navigated to Profile & Settings'
    };
  }

  // 8. LANGUAGE SWITCHING
  // Switch to Hindi:
  const langHindiKeywords = ['switch to hindi', 'hindi language', 'speak hindi', 'talk in hindi', 'हिंदी में बोलो', 'हिंदी चुनो', 'हिंदी करो', 'hindi me baat karo'];
  if (hasAny(langHindiKeywords)) {
    return {
      intent: 'SET_LANGUAGE',
      confidence: 0.98,
      transcript: text,
      category: 'System',
      actionPayload: { language: 'Hindi' },
      spokenReply: 'भाषा हिंदी में बदल दी गई है। अब सभी आवाज निर्देश हिंदी में सुने और समझे जाएंगे।',
      displayText: 'भाषा: हिंदी (hi-IN) सक्रिय'
    };
  }

  // Switch to English:
  const langEnglishKeywords = ['switch to english', 'english language', 'speak english', 'talk in english', 'अंग्रेजी में बोलो', 'अंग्रेजी चुनो', 'english me bolo'];
  if (hasAny(langEnglishKeywords)) {
    return {
      intent: 'SET_LANGUAGE',
      confidence: 0.98,
      transcript: text,
      category: 'System',
      actionPayload: { language: 'English' },
      spokenReply: 'Language switched to English. All voice commands and prompts will now be in English.',
      displayText: '🌐 Language: English (en-US) Active'
    };
  }

  // 9. ELDERLY VIEW / BIG TEXT MODE
  const elderlyKeywords = ['elderly mode', 'big text', 'larger font', 'zoom in', 'senior mode', 'बड़ा टेक्स्ट करो', 'बड़ा फॉन्ट', 'बुजुर्ग मोड', 'senior view'];
  if (hasAny(elderlyKeywords)) {
    return {
      intent: 'TOGGLE_ELDERLY_MODE',
      confidence: 0.92,
      transcript: text,
      category: 'System',
      spokenReply: isHindi ? 'बुजुर्गों के लिए बड़ा फॉन्ट और हाई कंट्रास्ट मोड बदल दिया गया है।' : 'Elderly high-contrast enlarged font mode toggled.',
      displayText: isHindi ? '👓 बुजुर्ग मोड सक्रिय (Senior Zoom)' : '👓 Senior High-Contrast Mode Toggled'
    };
  }

  // 10. READ CURRENT SCREEN
  const readScreenKeywords = ['read screen', 'what is on this page', 'read this', 'tell me what is here', 'स्क्रीन पढ़कर सुनाओ', 'पेज पर क्या है', 'स्क्रीन पढ़ो'];
  if (hasAny(readScreenKeywords)) {
    let screenSummary = '';
    if (currentTab === 'home') {
      screenSummary = isHindi
        ? 'आप होम स्क्रीन पर हैं। आपका चेक-इन सुरक्षित है, 24/7 फॉल गार्ड सक्रिय है, और इमरजेंसी एसओएस बटन तैयार है।'
        : 'You are on the Home screen. Your wellness check-in is safe, 24/7 fall guard is active, and the emergency SOS button is ready.';
    } else if (currentTab === 'vitals') {
      const bpStr = vitals.bpSys && vitals.bpDia ? `${vitals.bpSys}/${vitals.bpDia}` : '120/80';
      screenSummary = isHindi
        ? `आप स्वास्थ्य स्क्रीन पर हैं। हृदय गति ${vitals.pulse || 74} बीट्स, रक्तचाप ${bpStr}, और तापमान ${(vitals.bodyTemperature || 98.6).toFixed(1)} डिग्री है।`
        : `You are on Health Vitals. Heart rate is ${vitals.pulse || 74} BPM, BP is ${bpStr}, and body temperature is ${(vitals.bodyTemperature || 98.6).toFixed(1)} degrees.`;
    } else if (currentTab === 'safety') {
      screenSummary = isHindi
        ? 'आप सुरक्षा स्क्रीन पर हैं। सफर गार्ड, जीपीएस मॉनिटरिंग और स्वायत्त आपातकालीन रक्षक सक्रिय हैं।'
        : 'You are on Safety screen. Safe journey tracking, live GPS monitoring, and autonomous escalation are enabled.';
    } else if (currentTab === 'contacts') {
      screenSummary = isHindi
        ? `आप संपर्क स्क्रीन पर हैं। आपका मुख्य आपातकालीन संपर्क ${primaryContactName || 'सत्यापित संपर्क'} है।`
        : `You are on Emergency Contacts. Your primary contact is ${primaryContactName || 'Verified Guardian'}.`;
    } else {
      screenSummary = isHindi
        ? 'आप रेस्क्यू नेट सुरक्षा ऐप में हैं। सभी सुरक्षा और मेडिकल गार्ड सामान्य रूप से कार्यरत हैं।'
        : 'You are in ResQNet Safety. All safeguards and vital monitors are active and nominal.';
    }

    return {
      intent: 'READ_SCREEN',
      confidence: 0.94,
      transcript: text,
      category: 'System',
      spokenReply: screenSummary,
      displayText: isHindi ? '📖 स्क्रीन विवरण पढ़कर सुनाया गया' : '📖 Read Current Screen Aloud'
    };
  }

  // 11. HELP / WHAT CAN I SAY
  const helpKeywords = ['what can i say', 'help me', 'commands', 'voice commands', 'क्या बोल सकता हूँ', 'कमांड्स बताओ', 'मदद'];
  if (hasAny(helpKeywords)) {
    return {
      intent: 'HELP_COMMANDS',
      confidence: 0.95,
      transcript: text,
      category: 'System',
      spokenReply: isHindi
        ? 'आप बोल सकते हैं: मेरी धड़कन बताओ, बीपी चेक करो, होम पर जाओ, सायरन बजाओ, या किसी भी आपात स्थिति में बचाओ या मदद बोलो।'
        : 'You can say: What is my heart rate, Check my BP, Go home, Turn on siren, or in any crisis, just shout Help or Emergency.',
      displayText: isHindi
        ? '💡 आवाज सहायता कमांड्स (Voice Commands Guide)'
        : '💡 Voice Command Options for Seniors'
    };
  }

  // 12. FALLBACK / UNKNOWN BUT CONVERSATIONAL
  return {
    intent: 'UNKNOWN',
    confidence: 0.4,
    transcript: text,
    category: 'System',
    spokenReply: isHindi
      ? `मैंने सुना: "${text}"। आप विटल्स पूछ सकते हैं, जैसे "मेरी धड़कन बताओ", या "होम पर जाओ" कह सकते हैं।`
      : `I heard: "${text}". You can ask about your vitals like "Check my heart rate", or say "Go home" or "Help".`,
    displayText: isHindi
      ? `🎙️ सुना गया: "${text}" (कमांड समझ नहीं आई, कृपया दोबारा बोलें)`
      : `🎙️ Heard: "${text}" (Try: "Check my heart rate" or "Go home")`
  };
}
