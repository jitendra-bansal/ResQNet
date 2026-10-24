import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  MapPin, 
  Watch, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ArrowRight,
  RefreshCw,
  Languages,
  Phone,
  UserCheck,
  KeyRound,
  AlertCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { UserProfile, EmergencyContact, SafetyPermissions } from '../types';
import { INITIAL_PROFILE, INITIAL_PERMISSIONS } from '../mockData';
import { sendSmsVerificationOtp, DispatchedSms } from '../utils/smsService';
import { 
  speakAudibleMessage, 
  stopAudibleSpeech, 
  playListeningReadyTone, 
  getAudioContext,
  unlockAudioEngine,
  requestMicrophoneAccess,
  startVoiceWaveformAnalyzer
} from '../utils/audio';
import { getLiveCurrentAddress } from '../utils/geolocation';
import { extractCleanName } from '../utils/cleanName';
import { 
  localizeProfileData, 
  transliterateName, 
  translateRelationship,
  translateCondition
} from '../utils/i18n';
import { ResQLogo } from './ResQLogo';

interface VoiceChatOnboardingProps {
  onComplete: (profile: UserProfile, contacts: EmergencyContact[], permissions: SafetyPermissions) => void;
  isDarkMode: boolean;
  existingProfile?: UserProfile;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  textEn: string;
  textHi: string;
  timestamp: string;
  isError?: boolean;
}

type StepType = 
  | 'language'
  | 'permissions'
  | 'target_selection'
  | 'greeting_name'
  | 'age'
  | 'gender'
  | 'location'
  | 'watch'
  | 'conditions'
  | 'contact_name_relation'
  | 'contact_phone'
  | 'verify_contact_phone'
  | 'complete';

// Selectable Age Ranges from 21-30 up to 100+
const AGE_RANGES: Array<{ label: string; min: number; max: number }> = [
  { label: '21-30', min: 21, max: 30 },
  { label: '31-40', min: 31, max: 40 },
  { label: '41-50', min: 41, max: 50 },
  { label: '51-60', min: 51, max: 60 },
  { label: '61-70', min: 61, max: 70 },
  { label: '71-80', min: 71, max: 80 },
  { label: '81-90', min: 81, max: 90 },
  { label: '91-100', min: 91, max: 100 },
  { label: '100+', min: 100, max: 150 },
];

function getRangeForExactAge(age: number): string {
  if (age >= 100) return '100+';
  const found = AGE_RANGES.find(r => age >= r.min && age <= r.max);
  return found ? found.label : '21-30';
}

// Spoken Hindi/English number words helper for exact Age recognition (including < 21 and 21 to 100+)
const SPOKEN_NUMBERS: Record<string, string> = {
  'पांच': '5', 'पाँच': '5', 'five': '5',
  'दस': '10', 'ten': '10',
  'ग्यारह': '11', 'eleven': '11',
  'बारह': '12', 'twelve': '12',
  'तेरह': '13', 'thirteen': '13',
  'चौदह': '14', 'fourteen': '14',
  'पंद्रह': '15', 'fifteen': '15',
  'सोलह': '16', 'sixteen': '16',
  'सत्रह': '17', 'seventeen': '17',
  'अठारह': '18', 'eighteen': '18',
  'उन्नीस': '19', 'nineteen': '19',
  'बीस': '20', 'twenty': '20',
  'इक्कीस': '21', 'twenty one': '21', 'twenty-one': '21',
  'बाईस': '22', 'twenty two': '22', 'twenty-two': '22',
  'तेईस': '23', 'twenty three': '23', 'twenty-three': '23',
  'चौबीस': '24', 'twenty four': '24', 'twenty-four': '24',
  'पच्चीस': '25', 'twenty five': '25', 'twenty-five': '25',
  'छब्बीस': '26', 'twenty six': '26', 'twenty-six': '26',
  'सत्ताईस': '27', 'twenty seven': '27', 'twenty-seven': '27',
  'अट्ठाईस': '28', 'twenty eight': '28', 'twenty-eight': '28',
  'उनतीस': '29', 'twenty nine': '29', 'twenty-nine': '29',
  'तीस': '30', 'thirty': '30',
  'इकतीस': '31', 'thirty one': '31', 'thirty-one': '31',
  'बत्तीस': '32', 'thirty two': '32', 'thirty-two': '32',
  'तैंतीस': '33', 'thirty three': '33', 'thirty-three': '33',
  'चौंतीस': '34', 'thirty four': '34', 'thirty-four': '34',
  'पैंतीस': '35', 'thirty five': '35', 'thirty-five': '35',
  'छत्तीस': '36', 'thirty six': '36', 'thirty-six': '36',
  'सैंतीस': '37', 'thirty seven': '37', 'thirty-seven': '37',
  'अड़तीस': '38', 'thirty eight': '38', 'thirty-eight': '38',
  'उनतालीस': '39', 'thirty nine': '39', 'thirty-nine': '39',
  'चालीस': '40', 'forty': '40',
  'इकतालीस': '41', 'forty one': '41', 'forty-one': '41',
  'बयालीस': '42', 'forty two': '42', 'forty-two': '42',
  'तैंतालीस': '43', 'forty three': '43', 'forty-three': '43',
  'चवालीस': '44', 'forty four': '44', 'forty-four': '44',
  'पैंतालीस': '45', 'forty five': '45', 'forty-five': '45',
  'छियालीस': '46', 'forty six': '46', 'forty-six': '46',
  'सैंतालीस': '47', 'forty seven': '47', 'forty-seven': '47',
  'अड़तालीस': '48', 'forty eight': '48', 'forty-eight': '48',
  'उनचास': '49', 'forty nine': '49', 'forty-nine': '49',
  'चाचा': '50', 'पचास': '50', 'fifty': '50',
  'इक्यावन': '51', 'fifty one': '51', 'fifty-one': '51',
  'बावन': '52', 'fifty two': '52', 'fifty-two': '52',
  'तिरेपन': '53', 'fifty three': '53', 'fifty-three': '53',
  'चौवन': '54', 'fifty four': '54', 'fifty-four': '54',
  'पचपन': '55', 'fifty five': '55', 'fifty-five': '55',
  'छप्पन': '56', 'fifty six': '56', 'fifty-six': '56',
  'सत्तावन': '57', 'fifty seven': '57', 'fifty-seven': '57',
  'अट्ठावन': '58', 'fifty eight': '58', 'fifty-eight': '58',
  'उनसठ': '59', 'fifty nine': '59', 'fifty-nine': '59',
  'साठ': '60', 'sixty': '60',
  'इकसठ': '61', 'sixty one': '61', 'sixty-one': '61',
  'बासठ': '62', 'sixty two': '62', 'sixty-two': '62',
  'तिरेसठ': '63', 'sixty three': '63', 'sixty-three': '63',
  'चौंसठ': '64', 'sixty four': '64', 'sixty-four': '64',
  'पैंसठ': '65', 'sixty five': '65', 'sixty-five': '65',
  'छियासठ': '66', 'sixty six': '66', 'sixty-six': '66',
  'सड़सठ': '67', 'sixty seven': '67', 'sixty-seven': '67',
  'अड़सठ': '68', 'sixty eight': '68', 'sixty-eight': '68',
  'उनहत्तर': '69', 'sixty nine': '69', 'sixty-nine': '69',
  'सत्तर': '70', 'seventy': '70',
  'इकहत्तर': '71', 'seventy one': '71', 'seventy-one': '71',
  'बहत्तर': '72', 'seventy two': '72', 'seventy-two': '72',
  'तिहत्तर': '73', 'seventy three': '73', 'seventy-three': '73',
  'चौहत्तर': '74', 'seventy four': '74', 'seventy-four': '74',
  'पचहत्तर': '75', '75': '75', 'seventy five': '75', 'seventy-five': '75',
  'छिहत्तर': '76', 'seventy six': '76', 'seventy-six': '76',
  'सतहत्तर': '77', 'seventy seven': '77', 'seventy-seven': '77',
  'अठहत्तर': '78', 'seventy eight': '78', 'seventy-eight': '78',
  'उनासी': '79', 'seventy nine': '79', 'seventy-nine': '79',
  'अस्सी': '80', 'eighty': '80',
  'इक्यासी': '81', 'eighty one': '81', 'eighty-one': '81',
  'बयासी': '82', 'eighty two': '82', 'eighty-two': '82',
  'तिरासी': '83', 'eighty three': '83', 'eighty-three': '83',
  'चौरासी': '84', 'eighty four': '84', 'eighty-four': '84',
  'पचासी': '85', 'eighty five': '85', 'eighty-five': '85',
  'छियासी': '86', 'eighty six': '86', 'eighty-six': '86',
  'सतासी': '87', 'eighty seven': '87', 'eighty-seven': '87',
  'अठासी': '88', 'eighty eight': '88', 'eighty-eight': '88',
  'नवासी': '89', 'eighty nine': '89', 'eighty-nine': '89',
  'नब्बे': '90', 'ninety': '90',
  'इक्यानवे': '91', 'ninety one': '91', 'ninety-one': '91',
  'बानवे': '92', 'ninety two': '92', 'ninety-two': '92',
  'तिरानवे': '93', 'ninety three': '93', 'ninety-three': '93',
  'चौरानवे': '94', 'ninety four': '94', 'ninety-four': '94',
  'पचानवे': '95', 'ninety five': '95', 'ninety-five': '95',
  'छियानवे': '96', 'ninety six': '96', 'ninety-six': '96',
  'सत्तानवे': '97', 'ninety seven': '97', 'ninety-seven': '97',
  'अट्ठानवे': '98', 'ninety eight': '98', 'ninety-eight': '98',
  'निन्यानवे': '99', 'ninety nine': '99', 'ninety-nine': '99',
  'सौ': '100', 'एक सौ': '100', 'one hundred': '100', 'hundred': '100',
  'एक सौ एक': '101', 'one hundred one': '101',
  'एक सौ दो': '102', 'one hundred two': '102',
  'एक सौ पांच': '105', 'one hundred five': '105',
};

// Map of spoken digit words (Hindi & English) to single digits 0-9
const SPOKEN_DIGIT_WORDS: Record<string, string> = {
  'zero': '0', 'oh': '0', 'shunya': '0', 'shoonya': '0', 'शून्य': '0', 'जीरो': '0', 'ज़ीरो': '0', 'सीफर': '0',
  'one': '1', 'ek': '1', 'एक': '1', 'वन': '1',
  'two': '2', 'do': '2', 'दो': '2', 'टू': '2',
  'three': '3', 'teen': '3', 'तीन': '3', 'थ्री': '3',
  'four': '4', 'char': '4', 'chaar': '4', 'चार': '4', 'फोर': '4',
  'five': '5', 'panch': '5', 'paanch': '5', 'पांच': '5', 'पाँच': '5', 'फाइव': '5',
  'six': '6', 'chhah': '6', 'chhe': '6', 'che': '6', 'छह': '6', 'छः': '6', 'छे': '6', 'सिक्स': '6',
  'seven': '7', 'saat': '7', 'sat': '7', 'सात': '7', 'सेवन': '7',
  'eight': '8', 'aath': '8', 'ath': '8', 'आठ': '8', 'एट': '8',
  'nine': '9', 'nau': '9', 'no': '9', 'नौ': '9', 'नाइन': '9',
};

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/**
 * Converts spoken or typed text (including Hindi/English number words, Devanagari digits,
 * "double 9", "triple 8", and ASCII digits) into a string of digits (0-9).
 */
function extractSpokenDigits(raw: string): string {
  if (!raw) return '';
  let normalized = raw.replace(/[०-९]/g, d => DEVANAGARI_DIGITS[d] || d);

  const tokens = normalized
    .toLowerCase()
    .replace(/[,.\-+/():;।॥]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let result = '';
  let repeatNext = 1;

  for (const token of tokens) {
    if (token === 'double' || token === 'डबल' || token === 'दुगना') {
      repeatNext = 2;
      continue;
    }
    if (token === 'triple' || token === 'ट्रिपल' || token === 'तिगुना') {
      repeatNext = 3;
      continue;
    }

    if (/^\d+$/.test(token)) {
      if (repeatNext > 1 && token.length === 1) {
        result += token.repeat(repeatNext);
      } else {
        result += token;
      }
      repeatNext = 1;
      continue;
    }

    if (SPOKEN_DIGIT_WORDS[token] !== undefined) {
      const d = SPOKEN_DIGIT_WORDS[token];
      result += d.repeat(repeatNext);
      repeatNext = 1;
      continue;
    }

    const embedded = token.replace(/\D/g, '');
    if (embedded) {
      result += embedded;
      repeatNext = 1;
    }
  }

  return result;
}

/**
 * Extracts emergency contact's clean name and relationship from spoken/typed input
 * e.g. "राहुल मेरा बेटा है" -> { name: "राहुल", relation: "बेटा" }
 * e.g. "Rahul Son" -> { name: "Rahul", relation: "Son" }
 */
function parseContactNameAndRelation(
  rawInput: string,
  currentRelation: string,
  isHindi: boolean
): { name: string; relation: string } {
  let text = rawInput.trim();
  let detectedRelEn = '';
  let detectedRelHi = '';

  const relationPatterns: Array<{ regex: RegExp; en: string; hi: string }> = [
    { regex: /(?:^|\s)(son|beta|बेटा|पुत्र|लड़का)(?=\s|$|[।,.])/gi, en: 'Son', hi: 'बेटा' },
    { regex: /(?:^|\s)(daughter|beti|बेटी|पुत्री|लड़की)(?=\s|$|[।,.])/gi, en: 'Daughter', hi: 'बेटी' },
    { regex: /(?:^|\s)(husband|pati|पति)(?=\s|$|[।,.])/gi, en: 'Husband', hi: 'पति' },
    { regex: /(?:^|\s)(wife|patni|biwi|पत्नी|बीवी)(?=\s|$|[।,.])/gi, en: 'Wife', hi: 'पत्नी' },
    { regex: /(?:^|\s)(brother|bhai|bhaiya|भाई|भैया)(?=\s|$|[।,.])/gi, en: 'Brother', hi: 'भाई' },
    { regex: /(?:^|\s)(sister|behen|bahan|didi|बहन|दीदी)(?=\s|$|[।,.])/gi, en: 'Sister', hi: 'बहन' },
    { regex: /(?:^|\s)(father|papa|pita|pitaji|dad|पिता|पापा|पिताजी|बाबूजी)(?=\s|$|[।,.])/gi, en: 'Father', hi: 'पिता' },
    { regex: /(?:^|\s)(mother|maa|mummy|mata|mataji|mom|माता|माँ|मम्मी|माताजी)(?=\s|$|[।,.])/gi, en: 'Mother', hi: 'माता' },
    { regex: /(?:^|\s)(doctor|dr|डॉक्टर|डाक्टर)(?=\s|$|[।,.])/gi, en: 'Doctor', hi: 'डॉक्टर' },
    { regex: /(?:^|\s)(friend|neighbor|neighbour|dost|mitra|padosi|मित्र|दोस्त|पड़ोसी)(?=\s|$|[।,.])/gi, en: 'Friend / Neighbor', hi: 'मित्र / पड़ोसी' },
    { regex: /(?:^|\s)(relative|rishtedar|parijan|परिजन|रिश्तेदार|अन्य परिजन)(?=\s|$|[।,.])/gi, en: 'Other Relative', hi: 'अन्य परिजन' },
  ];

  for (const item of relationPatterns) {
    if (item.regex.test(text)) {
      detectedRelEn = item.en;
      detectedRelHi = item.hi;
      text = text.replace(item.regex, ' ');
      break;
    }
  }

  text = text
    .replace(/\b(relation|relationship|is|my|i|am|and|his|her|their|name|mera|meri|mere|main|mai|ka|ki|ke|hai|hain|hoon|hu|woh|wo|with|user)\b/gi, ' ')
    .replace(/(रिश्ता|संबंध|मेरा|मेरी|मेरे|मैं|उनका|उनकी|उनके|का|की|के|है|हैं|हूँ|हु|वह|वो|और|नाम|से)/g, ' ')
    .replace(/[,.\-+/():;।॥]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanName = extractCleanName(text);
  const finalRelation = detectedRelEn
    ? (isHindi ? detectedRelHi : detectedRelEn)
    : translateRelationship(currentRelation || (isHindi ? 'बेटा' : 'Son'), isHindi ? 'Hindi' : 'English');

  return {
    name: cleanName,
    relation: finalRelation,
  };
}

export const VoiceChatOnboarding: React.FC<VoiceChatOnboardingProps> = ({
  onComplete,
  isDarkMode,
  existingProfile,
}) => {
  const [currentStep, setCurrentStep] = useState<StepType>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi'>(() => {
    return existingProfile?.language === 'English' ? 'English' : 'Hindi';
  });
  const isHindi = selectedLanguage === 'Hindi';

  // Keep refs to latest step, language, target, profile, permissions, and contact so async callbacks always read fresh values
  const stepRef = useRef<StepType>(currentStep);
  const langRef = useRef<'English' | 'Hindi'>(selectedLanguage);
  const targetRef = useRef<'myself' | 'relative'>('myself');

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    langRef.current = selectedLanguage;
  }, [selectedLanguage]);

  // Profile data of the person whose app is being set up (the User)
  const [profileData, setProfileData] = useState<UserProfile>(() => ({
    ...(existingProfile || INITIAL_PROFILE),
    name: existingProfile?.name || '',
    age: existingProfile?.age || '',
    address: existingProfile?.address || '',
    language: existingProfile?.language || 'Hindi',
    setupTarget: existingProfile?.setupTarget || 'myself'
  }));
  const profileDataRef = useRef<UserProfile>(profileData);
  useEffect(() => {
    profileDataRef.current = profileData;
  }, [profileData]);

  // Safety permissions asked via chat conversation after selecting language
  const [chatPermissions, setChatPermissions] = useState<SafetyPermissions>({
    ...INITIAL_PERMISSIONS,
    microphoneCamera: true,
    liveLocation: true,
    motionSensors: true,
    neighboursPermission: true,
  });
  const chatPermissionsRef = useRef<SafetyPermissions>(chatPermissions);
  useEffect(() => {
    chatPermissionsRef.current = chatPermissions;
  }, [chatPermissions]);

  // Validation error states for Permissions, Age (< 21), and Contact Number (!== 10 digits)
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const selectedAgeRangeRef = useRef<string | null>(null);
  useEffect(() => {
    selectedAgeRangeRef.current = selectedAgeRange;
  }, [selectedAgeRange]);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Emergency contact being collected (NO pre-filled phone number!)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('बेटा');
  const [contactVerified, setContactVerified] = useState(false);

  // Contact Phone OTP Verification state (4-digit SMS OTP)
  const [verificationOtp, setVerificationOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [dispatchedSms, setDispatchedSms] = useState<DispatchedSms | null>(null);

  const contactNameRef = useRef<string>('');
  const contactRelationRef = useRef<string>('बेटा');
  const phoneDigitsRef = useRef<string>('');
  const verificationOtpRef = useRef<string>('');
  const manualMicStopRef = useRef<boolean>(false);

  useEffect(() => {
    contactNameRef.current = contactName;
  }, [contactName]);
  useEffect(() => {
    contactRelationRef.current = contactRelation;
  }, [contactRelation]);
  useEffect(() => {
    verificationOtpRef.current = verificationOtp;
  }, [verificationOtp]);

  // Resend SMS countdown cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Listen for auto-fill events from top SMS notification toast
  useEffect(() => {
    const handleFillOtp = (e: CustomEvent<string>) => {
      if (stepRef.current === 'verify_contact_phone' && e.detail) {
        setEnteredOtp(e.detail);
        setOtpError(null);
      }
    };
    window.addEventListener('resqnet-fill-otp' as any, handleFillOtp);
    return () => window.removeEventListener('resqnet-fill-otp' as any, handleFillOtp);
  }, []);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([22, 35, 48, 30, 60, 42, 28, 50, 24]);

  // Selected multi conditions
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  // Speech recognition ref & fallback media recorder
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const stopWaveformRef = useRef<(() => void) | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const handleVoiceAnswerRef = useRef<(spokenText: string) => void>(() => {});
  const handlePhoneDigitsCompleteRef = useRef<(tenDigits: string) => void>(() => {});

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, currentStep, isSpeaking, isListening, liveTranscript, contactPhone, verificationOtp, permissionError, ageError, phoneError]);

  // Start/stop live voice waveform analyzer whenever microphone is actively listening
  useEffect(() => {
    if (isListening) {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
      }
      stopWaveformRef.current = startVoiceWaveformAnalyzer((bars) => {
        setWaveformLevels(bars);
      });
    } else {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
        stopWaveformRef.current = null;
      }
    }
    return () => {
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
        stopWaveformRef.current = null;
      }
    };
  }, [isListening]);

  // Clean up speech & recognition on unmount
  useEffect(() => {
    return () => {
      manualMicStopRef.current = true;
      stopAudibleSpeech();
      if (stopWaveformRef.current) {
        stopWaveformRef.current();
        stopWaveformRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const stopListening = (isManual = false) => {
    if (isManual) {
      manualMicStopRef.current = true;
    }
    if (stopWaveformRef.current) {
      stopWaveformRef.current();
      stopWaveformRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  // Fallback recorder if Web Speech API is blocked or unsupported
  const startFallbackAudioRecording = async (existingStream?: MediaStream | null) => {
    if (typeof window === 'undefined') return;
    try {
      let stream = existingStream || null;
      if (!stream) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsListening(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream?.getTracks().forEach(t => t.stop());
        setIsListening(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 300) return;

        setLiveTranscript(langRef.current === 'Hindi' ? 'आपकी आवाज़ समझी जा रही है...' : 'Transcribing your voice...');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string)?.split(',')[1];
          if (!base64data) return;
          try {
            const resp = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64data,
                mimeType: 'audio/webm',
                language: langRef.current
              })
            });
            const data = await resp.json();
            if (data.transcript && data.transcript.trim()) {
              const cleanTrans = data.transcript.trim();
              setLiveTranscript(cleanTrans);
              setInputText(cleanTrans);
              handleVoiceAnswerRef.current(cleanTrans);
            } else {
              setLiveTranscript('');
            }
          } catch (err) {
            setLiveTranscript('');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      playListeningReadyTone();

      // Listen for speech in a 4.5-second chunk or until stopped
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4500);
    } catch (err) {
      setIsListening(false);
    }
  };

  // Start listening for user's voice answer immediately when microphone is activated.
  // In 'contact_phone' step, the microphone stays ON continuously until all 10 digits are spoken.
  const startAutoListening = async (langOverride?: 'English' | 'Hindi', isRestartForPhone = false) => {
    if (typeof window === 'undefined') return;

    if (!isRestartForPhone) {
      manualMicStopRef.current = false;
    }

    // Immediately stop any prior speech and abort running recognition to free hardware
    stopAudibleSpeech();
    setIsSpeaking(false);
    stopListening(false);

    // Provide immediate visual and acoustic feedback that microphone is listening
    setIsListening(true);
    if (!isRestartForPhone) {
      setLiveTranscript('');
      playListeningReadyTone();
    }

    const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      startFallbackAudioRecording();
      return;
    }

    try {
      const activeLang = langOverride || langRef.current;
      const isPhoneStep = stepRef.current === 'contact_phone';
      const recognition = new SpeechRec();
      recognition.lang = activeLang === 'Hindi' ? 'hi-IN' : 'en-US';
      recognition.continuous = isPhoneStep;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        if (!isRestartForPhone) {
          setLiveTranscript('');
        }
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            interimTrans += event.results[i][0].transcript + ' ';
          }
        }

        // Special handling for 10-digit mobile number step:
        // Do NOT turn off audio until 10 digits have been spoken by the user!
        if (stepRef.current === 'contact_phone') {
          if (finalTrans.trim()) {
            const newlySpokenDigits = extractSpokenDigits(finalTrans);
            if (newlySpokenDigits) {
              const updatedDigits = (phoneDigitsRef.current + newlySpokenDigits).slice(0, 10);
              phoneDigitsRef.current = updatedDigits;
              setContactPhone(updatedDigits);
              setInputText(updatedDigits);
              if (updatedDigits.length === 10) {
                setPhoneError(null);
              }
            }
          }

          const interimDigits = extractSpokenDigits(interimTrans);
          const previewDigits = (phoneDigitsRef.current + interimDigits).slice(0, 10);
          setLiveTranscript(
            previewDigits
              ? `${previewDigits} (${previewDigits.length}/10 ${langRef.current === 'Hindi' ? 'अंक' : 'digits'})`
              : (interimTrans.trim() || '')
          );

          // Only turn off audio once all 10 digits have been accumulated!
          if (phoneDigitsRef.current.length >= 10) {
            const completeTen = phoneDigitsRef.current.slice(0, 10);
            manualMicStopRef.current = true;
            stopListening(true);
            setLiveTranscript('');
            handlePhoneDigitsCompleteRef.current(completeTen);
          }
          return;
        }

        // Standard single-turn steps: show real-time spoken text preview & mirror into input box
        const currentText = (finalTrans || interimTrans).trim();
        setLiveTranscript(currentText);
        if (currentText && stepRef.current !== 'permissions' && stepRef.current !== 'target_selection') {
          if (stepRef.current === 'verify_contact_phone') {
            const spokenOtpDigits = extractSpokenDigits(currentText).slice(0, 4);
            if (spokenOtpDigits) {
              setEnteredOtp(spokenOtpDigits);
              setOtpError(null);
            }
          } else {
            setInputText(currentText);
          }
        }

        if (finalTrans.trim()) {
          stopListening(false);
          setLiveTranscript('');
          handleVoiceAnswerRef.current(finalTrans.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (stepRef.current === 'contact_phone' && phoneDigitsRef.current.length < 10 && !manualMicStopRef.current) {
          return;
        }
        if (event && (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture')) {
          startFallbackAudioRecording();
          return;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // Keep microphone ON in 'contact_phone' until 10 digits are spoken!
        if (stepRef.current === 'contact_phone' && phoneDigitsRef.current.length < 10 && !manualMicStopRef.current) {
          setTimeout(() => {
            if (stepRef.current === 'contact_phone' && phoneDigitsRef.current.length < 10 && !manualMicStopRef.current) {
              startAutoListening(langRef.current, true);
            }
          }, 120);
          return;
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startErr: any) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryErr) {
            startFallbackAudioRecording();
          }
        }, 80);
      }
    } catch (e) {
      startFallbackAudioRecording();
    }
  };

  // Append a bilingual bot message, speak it aloud via audio, and automatically start listening when speech ends
  const addBotMessageAndListen = (
    textEn: string,
    textHi: string,
    langOverride?: 'English' | 'Hindi',
    autoListenAfter = true,
    isError = false
  ) => {
    stopListening(false);
    const activeLang = langOverride || langRef.current;
    const textToSpeak = activeLang === 'Hindi' ? textHi : textEn;

    const newMsg: ChatMessage = {
      id: 'bot-' + Date.now() + '-' + Math.random(),
      sender: 'bot',
      textEn,
      textHi,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isError
    };

    setMessages(prev => [...prev, newMsg]);
    setIsSpeaking(true);

    speakAudibleMessage(
      textToSpeak,
      activeLang === 'Hindi' ? 'hi-IN' : 'en-US',
      () => {
        setIsSpeaking(false);
        if (autoListenAfter && stepRef.current !== 'language' && stepRef.current !== 'permissions') {
          startAutoListening(activeLang, stepRef.current === 'contact_phone');
        }
      }
    );
  };

  // Append a bilingual user message
  const addUserMessage = (textEn: string, textHi?: string) => {
    const newMsg: ChatMessage = {
      id: 'user-' + Date.now() + '-' + Math.random(),
      sender: 'user',
      textEn,
      textHi: textHi || textEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
  };

  // Switch language at any point during chat (or after all info is filled)
  // and transliterate both User's Name and Emergency Contact's Name between Hindi and English!
  const handleSwitchLanguage = (nextLang: 'English' | 'Hindi') => {
    getAudioContext();
    setSelectedLanguage(nextLang);
    langRef.current = nextLang;

    setProfileData(prev => {
      const updated = localizeProfileData(prev, nextLang);
      profileDataRef.current = updated;
      return updated;
    });

    setContactName(prev => {
      const updatedName = transliterateName(prev, nextLang);
      contactNameRef.current = updatedName;
      return updatedName;
    });

    setContactRelation(prev => {
      const updatedRel = translateRelationship(prev || (nextLang === 'Hindi' ? 'बेटा' : 'Son'), nextLang);
      contactRelationRef.current = updatedRel;
      return updatedRel;
    });

    setSelectedConditions(prev => prev.map(c => translateCondition(c, nextLang)));

    // Localize any active error banners when language switches
    if (permissionError) {
      setPermissionError(
        nextLang === 'Hindi'
          ? 'त्रुटि: यदि कोई भी सुरक्षा अनुमति अस्वीकार (बंद) की जाती है, तो ऐप शुरू नहीं होगा। कृपया सभी अनुमतियाँ चालू करें।'
          : 'Error: If any safety permission is declined, the app will not start. Please allow all permissions to continue.'
      );
    }
    if (ageError) {
      setAgeError(
        nextLang === 'Hindi'
          ? 'त्रुटि: आयु 21 वर्ष से कम नहीं हो सकती। 21 वर्ष या उससे अधिक आयु होने पर ही ऐप आगे बढ़ेगा।'
          : 'Error: Age cannot be below 21 years. The app will not continue unless age is 21 or above.'
      );
    }
    if (phoneError) {
      const count = phoneDigitsRef.current.length;
      setPhoneError(
        nextLang === 'Hindi'
          ? `त्रुटि: संपर्क नंबर पूरे 10 अंकों का होना चाहिए (अभी ${count} अंक हैं)। 10 अंकों के बिना ऐप आगे नहीं बढ़ेगा।`
          : `Error: Contact number must be 10 digits (currently ${count} digits). The app will not continue without a 10-digit number.`
      );
    }

    // Re-speak the latest bot question in the newly selected language and listen
    const lastBot = [...messages].reverse().find(m => m.sender === 'bot');
    if (lastBot) {
      const textToSpeak = nextLang === 'Hindi' ? lastBot.textHi : lastBot.textEn;
      setIsSpeaking(true);
      speakAudibleMessage(
        textToSpeak,
        nextLang === 'Hindi' ? 'hi-IN' : 'en-US',
        () => {
          setIsSpeaking(false);
          if (stepRef.current !== 'language' && stepRef.current !== 'permissions') {
            startAutoListening(nextLang, stepRef.current === 'contact_phone');
          }
        }
      );
    }
  };

  // Step 1: Language Selection -> Unlock Audio & Start Audio Chat Conversation with Permissions Question
  const handleSelectLanguage = (lang: 'English' | 'Hindi') => {
    getAudioContext();
    setSelectedLanguage(lang);
    langRef.current = lang;
    setProfileData(prev => {
      const updated = localizeProfileData(prev, lang);
      profileDataRef.current = updated;
      return updated;
    });
    const initRel = lang === 'Hindi' ? 'बेटा' : 'Son';
    setContactRelation(initRel);
    contactRelationRef.current = initRel;
    setPermissionError(null);
    setCurrentStep('permissions');
    stepRef.current = 'permissions';

    addBotMessageAndListen(
      'Welcome to ResQNet! To begin our audio conversation and protect you in emergencies, do you allow Microphone, Live Location, Motion Sensor, and Emergency SMS permissions? Note: All permissions are mandatory — if any permission is declined, the app will not start.',
      'नमस्ते! रेस्क्यू नेट में आपका स्वागत है। ऑडियो बातचीत और आपकी सुरक्षा के लिए, क्या आप माइक्रोफ़ोन, लाइव लोकेशन, मोशन सेंसर और आपातकालीन एसएमएस की अनुमति देते हैं? ध्यान दें: सभी अनुमतियाँ अनिवार्य हैं — यदि कोई भी अनुमति अस्वीकार की जाती है तो ऐप शुरू नहीं होगा।',
      lang,
      false
    );
  };

  // Toggle an individual permission in Step 1
  const handleToggleSinglePermission = (key: keyof SafetyPermissions) => {
    getAudioContext();
    setChatPermissions(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      chatPermissionsRef.current = updated;
      const anyDeclined =
        !updated.microphoneCamera ||
        !updated.liveLocation ||
        !updated.motionSensors ||
        !updated.neighboursPermission;

      if (anyDeclined) {
        const hi = langRef.current === 'Hindi';
        setPermissionError(
          hi
            ? 'त्रुटि: आपने एक सुरक्षा अनुमति अस्वीकार (बंद) कर दी है। यदि कोई भी अनुमति अस्वीकार की जाती है, तो ऐप शुरू नहीं होगा। कृपया सभी अनुमतियाँ चालू रखें।'
            : 'Error: You have declined a required safety permission. If any permission is declined, the app will not start. Please enable all permissions.'
        );
      } else {
        setPermissionError(null);
      }
      return updated;
    });
  };

  // Explicitly declining permissions
  const handleDeclinePermissionsInChat = () => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const declinedPerms: SafetyPermissions = {
      microphoneCamera: false,
      liveLocation: false,
      motionSensors: false,
      neighboursPermission: false,
      watchSync: false,
      cookiesDataStorage: false,
    };
    setChatPermissions(declinedPerms);
    chatPermissionsRef.current = declinedPerms;

    const errEn = 'Error: Safety permissions were declined. If any permission is declined, the app will not start. Please allow all permissions to start ResQNet.';
    const errHi = 'त्रुटि: सुरक्षा अनुमतियाँ अस्वीकार कर दी गई हैं। यदि कोई भी अनुमति अस्वीकार की जाती है, तो ऐप शुरू नहीं होगा। ऐप शुरू करने के लिए कृपया सभी अनुमतियाँ स्वीकार करें।';

    setPermissionError(hi ? errHi : errEn);
    addUserMessage('Decline permissions', 'अनुमतियाँ अस्वीकार');
    addBotMessageAndListen(errEn, errHi, langRef.current, false, true);
  };

  // Step 2: Confirm permissions -> Validate that NO permission is declined before starting!
  const handleConfirmPermissionsInChat = () => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const currentPerms = chatPermissionsRef.current;

    const declinedEn: string[] = [];
    const declinedHi: string[] = [];

    if (!currentPerms.microphoneCamera) {
      declinedEn.push('Microphone & Voice');
      declinedHi.push('माइक्रोफ़ोन');
    }
    if (!currentPerms.liveLocation) {
      declinedEn.push('Live GPS Location');
      declinedHi.push('लाइव जीपीएस लोकेशन');
    }
    if (!currentPerms.motionSensors) {
      declinedEn.push('Fall & Motion Sensors');
      declinedHi.push('मोशन सेंसर');
    }
    if (!currentPerms.neighboursPermission) {
      declinedEn.push('Emergency SMS Alerts');
      declinedHi.push('आपातकालीन एसएमएस');
    }

    // If ANY permission is declined, DO NOT START / CONTINUE! Show error and speak it aloud.
    if (declinedEn.length > 0) {
      const errEn = `Error: Cannot start the app because ${declinedEn.join(', ')} permission is declined. All safety permissions must be allowed to start ResQNet.`;
      const errHi = `त्रुटि: ऐप शुरू नहीं हो सकता क्योंकि ${declinedHi.join(', ')} की अनुमति अस्वीकार (बंद) है। रेस्क्यू नेट शुरू करने के लिए सभी सुरक्षा अनुमतियाँ चालू होना अनिवार्य है।`;
      setPermissionError(hi ? errHi : errEn);
      addBotMessageAndListen(errEn, errHi, langRef.current, false, true);
      return;
    }

    setPermissionError(null);

    // Explicitly request browser hardware microphone access upon user confirming permissions
    requestMicrophoneAccess().then(({ stream }) => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    });

    addUserMessage(
      'Yes, allow all safety permissions',
      'हाँ, सभी सुरक्षा अनुमतियाँ स्वीकार हैं'
    );

    setCurrentStep('target_selection');
    stepRef.current = 'target_selection';

    addBotMessageAndListen(
      'Thank you! All permissions are active. Who are you setting up this app for? Say: For Myself, or For a Relative.',
      'धन्यवाद! सभी सुरक्षा अनुमतियाँ चालू हो गई हैं। आप यह ऐप किसके लिए सेटअप कर रहे हैं? बोलिए: मेरे लिए, या माता-पिता के लिए।'
    );
  };

  // Enable all permissions helper when user had declined one or more
  const handleEnableAllPermissions = () => {
    getAudioContext();
    const allAllowed: SafetyPermissions = {
      microphoneCamera: true,
      liveLocation: true,
      motionSensors: true,
      neighboursPermission: true,
      watchSync: true,
      cookiesDataStorage: true,
    };
    setChatPermissions(allAllowed);
    chatPermissionsRef.current = allAllowed;
    setPermissionError(null);
  };

  // Step 3: Target Selection
  // - If 'myself': Ask the user's own Name first, and emergency contact at the end.
  // - If 'relative': First ask the person's relation with the user (the relative) and their contact info + verification,
  //   and then ask the information of the person whose app is being set up (the user/relative)!
  const handleSelectTarget = (target: 'myself' | 'relative') => {
    getAudioContext();
    targetRef.current = target;
    setProfileData(prev => {
      const updated = { ...prev, setupTarget: target };
      profileDataRef.current = updated;
      return updated;
    });
    addUserMessage(
      target === 'myself' ? 'For Myself' : 'For a Parent / Relative',
      target === 'myself' ? 'मेरे खुद के लिए' : 'माता-पिता या परिजन के लिए'
    );

    if (target === 'myself') {
      setCurrentStep('greeting_name');
      stepRef.current = 'greeting_name';
      addBotMessageAndListen(
        'Great! What is your full name? Please speak your name.',
        'बहुत अच्छा! आपका पूरा नाम क्या है? कृपया अपना नाम बोलें।'
      );
    } else {
      // Relative setup: First ask the person setting up the app for their relation with the user and their name/contact info
      setCurrentStep('contact_name_relation');
      stepRef.current = 'contact_name_relation';
      addBotMessageAndListen(
        'Since you are setting up this app for a relative, first please tell us your name and your relation with the user (for example, say "Rahul Son" or enter your name and select relation below).',
        'चूंकि आप यह ऐप अपने परिजन के लिए सेटअप कर रहे हैं, सबसे पहले कृपया अपना नाम और उपयोगकर्ता (परिजन) से अपना रिश्ता बताएं (जैसे बोलें "राहुल बेटा" या नीचे अपना नाम और रिश्ता चुनें)।'
      );
    }
  };

  // Parse spoken text into medical conditions
  const extractMedicalConditionsFromSpeech = (rawSpeech: string): string[] => {
    const lower = rawSpeech.toLowerCase();
    const matched: string[] = [];
    const hi = langRef.current === 'Hindi';

    if (
      lower.includes('कोई नहीं') ||
      lower.includes('नहीं है') ||
      lower.includes('कोई बीमारी नहीं') ||
      lower.includes('स्वस्थ') ||
      lower.includes('no ') ||
      lower.includes('none') ||
      lower.includes('nothing') ||
      lower.includes('healthy') ||
      lower.includes('fit') ||
      lower === 'नहीं' ||
      lower === 'no'
    ) {
      return [hi ? 'कोई बीमारी नहीं' : 'None (Healthy)'];
    }

    if (lower.includes('बीपी') || lower.includes('bp') || lower.includes('blood pressure') || lower.includes('रक्तचाप')) {
      matched.push(hi ? 'हाई बीपी' : 'High Blood Pressure');
    }
    if (lower.includes('शुगर') || lower.includes('sugar') || lower.includes('diabetes') || lower.includes('डायबिटीज') || lower.includes('मधुमेह')) {
      matched.push(hi ? 'शुगर / डायबिटीज' : 'Diabetes / Sugar');
    }
    if (lower.includes('दिल') || lower.includes('heart') || lower.includes('हार्ट')) {
      matched.push(hi ? 'दिल की बीमारी' : 'Heart Condition');
    }
    if (lower.includes('दमा') || lower.includes('asthma') || lower.includes('सांस') || lower.includes('अस्थमा')) {
      matched.push(hi ? 'सांस / दमा' : 'Asthma / Breathing');
    }
    if (lower.includes('जोड़') || lower.includes('joint') || lower.includes('दर्द') || lower.includes('arthritis') || lower.includes('गठिया')) {
      matched.push(hi ? 'जोड़ों का दर्द' : 'Joint Pain / Arthritis');
    }

    return matched.length > 0 ? matched : [rawSpeech];
  };

  // Handle GPS location click or voice request
  const handleUseGpsLocation = async () => {
    getAudioContext();
    setLocationLoading(true);
    try {
      const loc = await getLiveCurrentAddress();
      const addr = loc.address || (langRef.current === 'Hindi' ? 'नई दिल्ली (लाइव जीपीएस)' : 'New Delhi (Live GPS)');
      setLocationLoading(false);
      handleInputSubmit(addr);
    } catch {
      setLocationLoading(false);
      handleInputSubmit(langRef.current === 'Hindi' ? 'नई दिल्ली (लाइव जीपीएस)' : 'New Delhi (Live GPS)');
    }
  };

  // Transition to Complete screen once both User Profile and Verified Emergency Contact are ready
  const transitionToCompleteStep = () => {
    setCurrentStep('complete');
    stepRef.current = 'complete';

    const userNameEn = transliterateName(profileDataRef.current.name || 'Friend', 'English');
    const userNameHi = transliterateName(profileDataRef.current.name || 'मित्र', 'Hindi');
    const cNameEn = transliterateName(contactNameRef.current, 'English');
    const cNameHi = transliterateName(contactNameRef.current, 'Hindi');
    const relEn = translateRelationship(contactRelationRef.current, 'English');
    const relHi = translateRelationship(contactRelationRef.current, 'Hindi');
    const digits = phoneDigitsRef.current;

    addBotMessageAndListen(
      `Setup complete! Profile for ${userNameEn} (Age: ${profileDataRef.current.age}) and verified emergency contact ${cNameEn} (${relEn} · +91 ${digits}) are saved. Say Start or tap below to open ResQNet.`,
      `सेटअप पूरा हुआ! ${userNameHi} जी (आयु: ${profileDataRef.current.age} वर्ष) की प्रोफ़ाइल और सत्यापित आपातकालीन संपर्क ${cNameHi} (${relHi} · +91 ${digits}) सुरक्षित हो गए हैं। ऐप खोलने के लिए शुरू करें बोलें या नीचे बटन दबाएं।`
    );
  };

  // Step A of Contact: Save Contact Name & Relation with the User, then ask for 10-digit Mobile Number
  const handleSaveContactNameAndRelation = (rawNameInput?: string, overrideRel?: string) => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const isRelSetup = targetRef.current === 'relative';
    const inputToParse = (rawNameInput !== undefined ? rawNameInput : contactName).trim();
    const parsed = parseContactNameAndRelation(inputToParse, overrideRel || contactRelation, hi);

    const finalName = parsed.name || contactName.trim();
    if (!finalName) {
      addBotMessageAndListen(
        isRelSetup
          ? 'Please speak or type your name and your relation with the user first.'
          : 'Please speak or type your emergency contact\'s name and relation first.',
        isRelSetup
          ? 'कृपया पहले अपना नाम और उपयोगकर्ता से अपना रिश्ता बोलें या टाइप करें।'
          : 'कृपया पहले अपने आपातकालीन संपर्क का नाम और रिश्ता बोलें या टाइप करें।',
        langRef.current,
        true,
        true
      );
      return;
    }

    const localizedName = transliterateName(finalName, langRef.current);
    const nameEn = transliterateName(finalName, 'English');
    const nameHi = transliterateName(finalName, 'Hindi');

    const finalRel = parsed.relation || (hi ? 'बेटा' : 'Son');
    const relEn = translateRelationship(finalRel, 'English');
    const relHi = translateRelationship(finalRel, 'Hindi');

    setContactName(localizedName);
    contactNameRef.current = localizedName;
    setContactRelation(hi ? relHi : relEn);
    contactRelationRef.current = hi ? relHi : relEn;

    // Reset phone digits so user provides all 10 digits fresh
    setContactPhone('');
    phoneDigitsRef.current = '';
    setContactVerified(false);
    setInputText('');
    setPhoneError(null);

    addUserMessage(
      `${nameEn} (${relEn})`,
      `${nameHi} (${relHi})`
    );

    setCurrentStep('contact_phone');
    stepRef.current = 'contact_phone';

    if (isRelSetup) {
      addBotMessageAndListen(
        `Thank you, ${nameEn} (${relEn}). Now please speak or type your 10-digit mobile number for emergency alerts. The microphone will stay on until all 10 digits are spoken.`,
        `धन्यवाद ${nameHi} (${relHi})। अब कृपया आपातकालीन अलर्ट के लिए अपना 10 अंकों का मोबाइल नंबर बोलें या टाइप करें। पूरे 10 अंक बोले जाने तक माइक चालू रहेगा।`
      );
    } else {
      addBotMessageAndListen(
        `Got it, ${nameEn} (${relEn}). Now please speak or type ${nameEn}'s 10-digit mobile number. The microphone will stay on until all 10 digits are spoken.`,
        `ठीक है, ${nameHi} (${relHi})। अब कृपया ${nameHi} का 10 अंकों का मोबाइल नंबर बोलें या टाइप करें। पूरे 10 अंक बोले जाने तक माइक चालू रहेगा।`
      );
    }
  };

  // Step B of Contact: Validate that Contact Number is strictly 10 digits; if not 10 digits, block & show error!
  const handleProceedToPhoneVerification = (overridePhone?: string) => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const rawCandidate = overridePhone !== undefined ? overridePhone : (contactPhone || phoneDigitsRef.current);
    const cleanDigits = extractSpokenDigits(rawCandidate).replace(/\D/g, '');

    // If contact number is NOT 10 digits, do NOT continue — show error!
    if (cleanDigits.length !== 10) {
      const keptDigits = cleanDigits.slice(0, 10);
      setContactPhone(keptDigits);
      phoneDigitsRef.current = keptDigits;

      const errEn = cleanDigits.length === 0
        ? 'Error: Contact number is not 10 digits (0 digits entered). The app will not continue without a valid 10-digit contact number.'
        : `Error: Contact number must be exactly 10 digits (only ${cleanDigits.length} digits provided: ${cleanDigits}). The app will not continue until a 10-digit contact number is entered.`;
      const errHi = cleanDigits.length === 0
        ? 'त्रुटि: संपर्क नंबर 10 अंकों का नहीं है (0 अंक दर्ज)। 10 अंकों के मान्य मोबाइल नंबर के बिना ऐप आगे नहीं बढ़ेगा।'
        : `त्रुटि: संपर्क नंबर पूरे 10 अंकों का होना चाहिए (अभी ${cleanDigits.length} अंक दिए गए हैं: ${cleanDigits})। जब तक 10 अंकों का नंबर दर्ज नहीं किया जाता, ऐप आगे नहीं बढ़ेगा।`;

      setPhoneError(hi ? errHi : errEn);
      addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
      return;
    }

    // All 10 digits have been provided by the user! Stop continuous digit listening and trigger OTP Verification.
    manualMicStopRef.current = true;
    stopListening(true);
    setPhoneError(null);
    setContactPhone(cleanDigits);
    phoneDigitsRef.current = cleanDigits;
    setInputText('');

    // Immediately save to localStorage so SOS button / ESP8266 can call this number right away
    try {
      const immediateContact: EmergencyContact = {
        id: 'contact-primary',
        name: contactNameRef.current?.trim() || (hi ? 'परिवार संपर्क' : 'Family Contact'),
        phone: cleanDigits,
        relationship: contactRelationRef.current || (hi ? 'परिवार' : 'Family'),
        priority: 'Primary',
        status: 'Verified',
        addedAt: 'Verified',
      };
      localStorage.setItem('resqnet_contacts', JSON.stringify([immediateContact]));
      window.dispatchEvent(new Event('resqnet-contacts-updated'));
    } catch {
      // ignore storage error
    }

    addUserMessage(
      `+91 ${cleanDigits}`,
      `+91 ${cleanDigits}`
    );

    // Dispatch 4-digit verification code via SMS to the provided phone number
    const { otp: generatedCode, sms: dispatched } = sendSmsVerificationOtp(cleanDigits, undefined, hi ? 'Hindi' : 'English');
    setVerificationOtp(generatedCode);
    verificationOtpRef.current = generatedCode;
    setDispatchedSms(dispatched);
    setEnteredOtp(''); // Require user to input or speak the 4-digit OTP from SMS (no auto-fill!)
    setOtpError(null);
    setResendCooldown(30);

    setCurrentStep('verify_contact_phone');
    stepRef.current = 'verify_contact_phone';

    addBotMessageAndListen(
      `A 4-digit verification code has been sent via SMS to +91 ${cleanDigits}. Please enter or speak the 4-digit code to verify.`,
      `मोबाइल नंबर +91 ${cleanDigits} पर एसएमएस द्वारा 4-अंकीय सत्यापन कोड भेजा गया है। कृपया एसएमएस में आया 4-अंकीय कोड दर्ज करें या बोलकर बताएं।`
    );
  };

  // Resend 4-digit SMS OTP to the emergency contact's phone number
  const handleResendOtp = () => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const digits = contactPhone || phoneDigitsRef.current;
    if (!digits || digits.length !== 10) return;

    const { otp: newCode, sms: dispatched } = sendSmsVerificationOtp(digits, undefined, hi ? 'Hindi' : 'English');
    setVerificationOtp(newCode);
    verificationOtpRef.current = newCode;
    setDispatchedSms(dispatched);
    setEnteredOtp('');
    setOtpError(null);
    setResendCooldown(30);

    addBotMessageAndListen(
      `A new 4-digit verification code has been sent via SMS to +91 ${digits}. Please enter or speak the 4-digit code.`,
      `मोबाइल नंबर +91 ${digits} पर एक नया 4-अंकीय सत्यापन कोड एसएमएस द्वारा भेजा गया है। कृपया कोड दर्ज करें या बोलकर बताएं।`
    );
  };

  // Step C of Contact: Confirm Contact Number Verification using 4-digit SMS OTP
  const handleConfirmPhoneVerification = (spokenOrTyped?: string) => {
    getAudioContext();
    const hi = langRef.current === 'Hindi';
    const expectedOtp = verificationOtpRef.current;
    const digits = contactPhone || phoneDigitsRef.current;

    if (spokenOrTyped !== undefined && spokenOrTyped.trim()) {
      const low = spokenOrTyped.toLowerCase().trim();
      const spokenDigits = extractSpokenDigits(spokenOrTyped);

      // Check if user wants to resend the SMS OTP via voice
      const isResendIntent = 
        low.includes('resend') ||
        low.includes('send again') ||
        low.includes('again') ||
        low.includes('दोबारा') ||
        low.includes('फिर से') ||
        low.includes('नया कोड');

      if (isResendIntent) {
        handleResendOtp();
        return;
      }

      // Check if user wants to change/edit phone number via voice
      const isChangeIntent =
        low.includes('change') ||
        low.includes('edit') ||
        low.includes('wrong') ||
        low.includes('बदल') ||
        low.includes('गलत');

      if (isChangeIntent) {
        handleEditPhoneNumber();
        return;
      }

      const isConfirmWord =
        low.includes('verify') ||
        low.includes('yes') ||
        low.includes('ok') ||
        low.includes('confirm') ||
        low.includes('correct') ||
        low.includes('हाँ') ||
        low.includes('हां') ||
        low.includes('सही') ||
        low.includes('सत्यापित') ||
        low.includes('ठीक');

      if (spokenDigits) {
        if (spokenDigits === expectedOtp || spokenDigits.includes(expectedOtp)) {
          // Exact match of the 4-digit SMS OTP! Proceed to verify
          setEnteredOtp(expectedOtp);
        } else {
          const errEn = `Error: The code spoken (${spokenDigits}) does not match the 4-digit SMS OTP (${expectedOtp}) sent to +91 ${digits}. Please check your SMS.`;
          const errHi = `त्रुटि: बोला गया कोड (${spokenDigits}) +91 ${digits} पर भेजे गए 4-अंकीय एसएमएस कोड (${expectedOtp}) से मेल नहीं खाता। कृपया एसएमएस देखें।`;
          setOtpError(hi ? errHi : errEn);
          addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
          return;
        }
      } else if (isConfirmWord) {
        if (enteredOtp.trim() !== expectedOtp) {
          const errEn = `Please enter the 4-digit verification code sent via SMS to +91 ${digits} (e.g. ${expectedOtp}).`;
          const errHi = `कृपया +91 ${digits} पर एसएमएस द्वारा भेजा गया 4-अंकीय कोड दर्ज करें (जैसे ${expectedOtp})।`;
          setOtpError(hi ? errHi : errEn);
          addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
          return;
        }
      } else {
        const errEn = `Please speak or enter the 4-digit code sent via SMS to +91 ${digits}.`;
        const errHi = `कृपया +91 ${digits} पर एसएमएस से भेजा गया 4-अंकीय कोड बोलें या दर्ज करें।`;
        setOtpError(hi ? errHi : errEn);
        addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
        return;
      }
    } else {
      if (enteredOtp.trim() !== expectedOtp) {
        setOtpError(
          hi
            ? `त्रुटि: कृपया सही 4-अंकीय एसएमएस सत्यापन कोड दर्ज करें (एसएमएस भेजा गया +91 ${digits} पर)।`
            : `Error: Please enter the valid 4-digit SMS verification code sent to +91 ${digits}.`
        );
        return;
      }
    }

    setOtpError(null);
    setContactVerified(true);
    setInputText('');

    addUserMessage(
      `✓ Verified +91 ${digits} (SMS OTP: ${expectedOtp})`,
      `✓ +91 ${digits} सत्यापित (एसएमएस OTP: ${expectedOtp})`
    );

    if (targetRef.current === 'relative') {
      // Now ask the information of the person whose app is being set up (the User / Relative)!
      setCurrentStep('greeting_name');
      stepRef.current = 'greeting_name';
      addBotMessageAndListen(
        `Contact number +91 ${digits} is verified! Now please provide the information of the person whose app is being set up. What is their full name?`,
        `मोबाइल नंबर +91 ${digits} सत्यापित हो गया है! अब कृपया उस व्यक्ति (उपयोगकर्ता) की जानकारी बताएं जिनके लिए यह ऐप सेटअप किया जा रहा है। उनका पूरा नाम क्या है?`
      );
    } else {
      // In 'myself' flow, user info was already collected before contact info -> complete!
      transitionToCompleteStep();
    }
  };

  // Allow re-entering phone number if user wants to change it during verification
  const handleEditPhoneNumber = () => {
    getAudioContext();
    setContactPhone('');
    phoneDigitsRef.current = '';
    setInputText('');
    setPhoneError(null);
    setOtpError(null);
    setCurrentStep('contact_phone');
    stepRef.current = 'contact_phone';

    addBotMessageAndListen(
      'Please speak or type the 10-digit mobile number again. The microphone will stay on until all 10 digits are spoken.',
      'कृपया 10 अंकों का मोबाइल नंबर फिर से बोलें या टाइप करें। पूरे 10 अंक बोले जाने तक माइक चालू रहेगा।'
    );
  };

  // Final Enter App — enforces all 3 mandatory rules before starting the app
  const handleEnterApp = () => {
    const activeLang = langRef.current;
    const hi = activeLang === 'Hindi';
    const currentProfile = profileDataRef.current;
    const currentPerms = chatPermissionsRef.current;

    // 1. Check that NO permission is declined
    if (
      !currentPerms.microphoneCamera ||
      !currentPerms.liveLocation ||
      !currentPerms.motionSensors ||
      !currentPerms.neighboursPermission
    ) {
      setCurrentStep('permissions');
      stepRef.current = 'permissions';
      const errEn = 'Error: All permissions are required. If any permission is declined, the app will not start.';
      const errHi = 'त्रुटि: सभी सुरक्षा अनुमतियाँ अनिवार्य हैं। यदि कोई भी अनुमति अस्वीकार की जाती है तो ऐप शुरू नहीं होगा।';
      setPermissionError(hi ? errHi : errEn);
      addBotMessageAndListen(errEn, errHi, activeLang, false, true);
      return;
    }

    // 2. Check that Age is >= 21
    const numericAge = parseInt(currentProfile.age.replace(/\D/g, ''), 10);
    if (isNaN(numericAge) || numericAge < 21) {
      setCurrentStep('age');
      stepRef.current = 'age';
      const errEn = 'Error: User age must be 21 years or above. The app cannot continue if age is below 21.';
      const errHi = 'त्रुटि: उपयोगकर्ता की आयु 21 वर्ष या उससे अधिक होनी चाहिए। 21 वर्ष से कम आयु होने पर ऐप आगे नहीं बढ़ेगा।';
      setAgeError(hi ? errHi : errEn);
      addBotMessageAndListen(errEn, errHi, activeLang, true, true);
      return;
    }

    // 3. Check that Contact Number is strictly 10 digits
    const cleanPhone = (contactPhone || phoneDigitsRef.current).replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setCurrentStep('contact_phone');
      stepRef.current = 'contact_phone';
      const errEn = 'Error: Emergency contact number must be 10 digits. The app cannot continue without a 10-digit number.';
      const errHi = 'त्रुटि: आपातकालीन संपर्क नंबर 10 अंकों का होना चाहिए। 10 अंकों के नंबर के बिना ऐप आगे नहीं बढ़ेगा।';
      setPhoneError(hi ? errHi : errEn);
      addBotMessageAndListen(errEn, errHi, activeLang, true, true);
      return;
    }

    manualMicStopRef.current = true;
    stopAudibleSpeech();
    stopListening(true);

    const rawProfile: UserProfile = {
      ...currentProfile,
      language: activeLang,
      name: transliterateName(extractCleanName(currentProfile.name), activeLang),
      age: String(numericAge),
      address: currentProfile.address || (hi ? 'नई दिल्ली' : 'New Delhi'),
      watchModel: currentProfile.watchModel || 'ResQNet Watch',
      medicalConditions: currentProfile.medicalConditions.length
        ? currentProfile.medicalConditions
        : [hi ? 'कोई बीमारी नहीं' : 'None (Healthy)']
    };

    const finalProfile = localizeProfileData(rawProfile, activeLang);

    const finalContacts: EmergencyContact[] = [
      {
        id: 'contact-primary',
        name: transliterateName(extractCleanName(contactNameRef.current.trim()), activeLang),
        phone: cleanPhone,
        relationship: translateRelationship(contactRelationRef.current || (hi ? 'बेटा' : 'Son'), activeLang),
        priority: 'Primary',
        status: 'Verified',
        addedAt: 'Verified'
      }
    ];

    onComplete(finalProfile, finalContacts, currentPerms);
  };

  // Advance through questions step by step (via voice or tap/text)
  const handleInputSubmit = (submittedValue?: string) => {
    getAudioContext();
    const step = stepRef.current;
    const hi = langRef.current === 'Hindi';
    const isRelSetup = targetRef.current === 'relative';
    const value = (submittedValue !== undefined ? submittedValue : inputText).trim();

    if (
      !value &&
      step !== 'conditions' &&
      step !== 'contact_name_relation' &&
      step !== 'contact_phone' &&
      step !== 'verify_contact_phone' &&
      step !== 'permissions' &&
      step !== 'language'
    ) {
      return;
    }
    if (step !== 'contact_phone') {
      setInputText('');
    }

    if (step === 'language') {
      const low = value.toLowerCase();
      if (low.includes('hind') || low.includes('हिंदी') || low.includes('हिन्दी') || low.includes('हिन्द')) {
        handleSelectLanguage('Hindi');
      } else {
        handleSelectLanguage('English');
      }
      return;
    }

    if (step === 'permissions') {
      const low = value.toLowerCase();
      if (
        low === 'no' ||
        low.includes('decline') ||
        low.includes('deny') ||
        low.includes('नहीं') ||
        low.includes('मना') ||
        low.includes('अस्वीकार')
      ) {
        handleDeclinePermissionsInChat();
      } else {
        handleConfirmPermissionsInChat();
      }
      return;
    }

    if (step === 'target_selection') {
      const low = value.toLowerCase();
      if (
        low.includes('माता') ||
        low.includes('पिता') ||
        low.includes('परिजन') ||
        low.includes('परिवार') ||
        low.includes('relative') ||
        low.includes('parent') ||
        low.includes('mother') ||
        low.includes('father')
      ) {
        handleSelectTarget('relative');
      } else {
        handleSelectTarget('myself');
      }
      return;
    }

    if (step === 'greeting_name') {
      const rawClean = extractCleanName(value) || value;
      const localizedName = transliterateName(rawClean, langRef.current);
      const nameEn = transliterateName(rawClean, 'English');
      const nameHi = transliterateName(rawClean, 'Hindi');

      setProfileData(prev => {
        const updated = { ...prev, name: localizedName };
        profileDataRef.current = updated;
        return updated;
      });
      addUserMessage(nameEn, nameHi);

      setAgeError(null);
      setSelectedAgeRange(null);
      selectedAgeRangeRef.current = null;
      setCurrentStep('age');
      stepRef.current = 'age';

      if (isRelSetup) {
        addBotMessageAndListen(
          `Got it! Select ${nameEn}'s age range below (from 21-30 up to 100+), and please speak or type their exact age in years.`,
          `ठीक है! नीचे ${nameHi} जी का आयु वर्ग चुनें (21-30 से 100+ तक), और कृपया उनकी सटीक उम्र बोलें या टाइप करें।`
        );
      } else {
        addBotMessageAndListen(
          `Nice to meet you, ${nameEn}! You can select your age range below (21-30 up to 100+) and speak or type your exact age in years.`,
          `बहुत अच्छा, ${nameHi} जी! नीचे अपना आयु वर्ग चुनें (21-30 से 100+ तक) और अपनी सटीक उम्र बोलें या टाइप करें।`
        );
      }

    } else if (step === 'age') {
      const normalizedVal = value.replace(/[०-९]/g, d => DEVANAGARI_DIGITS[d] || d).trim();

      // Check if user clicked or spoke an age range like "21-30", "31-40", ..., "100+"
      const matchedRange = AGE_RANGES.find(
        r =>
          normalizedVal === r.label ||
          normalizedVal.replace(/\s+/g, '') === r.label ||
          normalizedVal.toLowerCase() === `${r.min} to ${r.max}` ||
          normalizedVal === `${r.min} से ${r.max}`
      );
      if (matchedRange) {
        setSelectedAgeRange(matchedRange.label);
        selectedAgeRangeRef.current = matchedRange.label;
        setAgeError(null);
        const promptEn =
          matchedRange.label === '100+'
            ? 'Age range 100+ years selected. Now please speak or type your exact age (e.g., 101).'
            : `Age range ${matchedRange.label} years selected. Now please speak or type your exact age between ${matchedRange.min} and ${matchedRange.max}.`;
        const promptHi =
          matchedRange.label === '100+'
            ? 'आयु वर्ग 100+ वर्ष चुना गया। अब कृपया अपनी सटीक आयु बोलें या टाइप करें (जैसे 101)।'
            : `आयु वर्ग ${matchedRange.label} वर्ष चुना गया। अब कृपया ${matchedRange.min} से ${matchedRange.max} के बीच अपनी सटीक आयु बोलें या टाइप करें।`;
        addBotMessageAndListen(promptEn, promptHi, langRef.current, false, false);
        return;
      }

      let cleanAge = '';
      const numMatch = normalizedVal.match(/\d+/);
      if (numMatch) {
        cleanAge = numMatch[0];
      } else {
        const lowerVal = normalizedVal.toLowerCase();
        // Match multi-word spoken numbers first
        const sortedSpokenEntries = Object.entries(SPOKEN_NUMBERS).sort((a, b) => b[0].length - a[0].length);
        for (const [word, digits] of sortedSpokenEntries) {
          if (lowerVal.includes(word.trim())) {
            cleanAge = digits;
            break;
          }
        }
        if (!cleanAge) {
          const extracted = extractSpokenDigits(normalizedVal);
          if (extracted) cleanAge = extracted;
        }
      }

      const numericAge = parseInt(cleanAge, 10);

      // Validate that age is a valid number
      if (!cleanAge || isNaN(numericAge) || numericAge <= 0) {
        addUserMessage(value, value);
        const errEn = 'Error: Please speak or type your exact numeric age (must be 21 years or above).';
        const errHi = 'त्रुटि: कृपया अपनी सटीक आयु संख्या में बोलें या टाइप करें (आयु 21 वर्ष या उससे अधिक होनी चाहिए)।';
        setAgeError(hi ? errHi : errEn);
        addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
        return;
      }

      // Enforce: If age is below 21, the app will NOT continue and will show an error!
      if (numericAge < 21) {
        addUserMessage(`${numericAge} years`, `${numericAge} वर्ष`);
        const errEn = `Error: Age is below 21 (${numericAge} years). The app will not continue if the age is below 21. Please enter an exact age of 21 years or above.`;
        const errHi = `त्रुटि: आयु 21 वर्ष से कम है (${numericAge} वर्ष)। यदि आयु 21 वर्ष से कम है तो ऐप आगे नहीं बढ़ेगा। कृपया 21 वर्ष या उससे अधिक सटीक आयु दर्ज करें।`;
        setAgeError(hi ? errHi : errEn);
        addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
        return;
      }

      // If user selected a specific age range, check if the exact age falls within that range
      const activeRangeLabel = selectedAgeRangeRef.current;
      if (activeRangeLabel) {
        const rangeObj = AGE_RANGES.find(r => r.label === activeRangeLabel);
        if (rangeObj && (numericAge < rangeObj.min || numericAge > rangeObj.max)) {
          const suggestedRange = getRangeForExactAge(numericAge);
          const errEn =
            rangeObj.label === '100+'
              ? `Please enter an exact age of 100 or above for the 100+ range, or select range ${suggestedRange} for age ${numericAge}.`
              : `Your entered age (${numericAge}) is outside the selected range ${rangeObj.label}. Please enter an exact age between ${rangeObj.min} and ${rangeObj.max}, or tap range ${suggestedRange}.`;
          const errHi =
            rangeObj.label === '100+'
              ? `100+ आयु वर्ग के लिए 100 या उससे अधिक आयु दर्ज करें, या ${numericAge} वर्ष के लिए ${suggestedRange} वर्ग चुनें।`
              : `दर्ज की गई आयु (${numericAge}) चुने गए आयु वर्ग ${rangeObj.label} के बाहर है। कृपया ${rangeObj.min} से ${rangeObj.max} के बीच सटीक आयु दर्ज करें, या ${suggestedRange} वर्ग चुनें।`;
          setAgeError(hi ? errHi : errEn);
          addBotMessageAndListen(errEn, errHi, langRef.current, true, true);
          return;
        }
      }

      // Valid exact age (>= 21) -> automatically highlight matching range, clear error, and proceed!
      const finalRangeLabel = activeRangeLabel || getRangeForExactAge(numericAge);
      setSelectedAgeRange(finalRangeLabel);
      selectedAgeRangeRef.current = finalRangeLabel;
      setAgeError(null);
      const validAgeStr = String(numericAge);

      addUserMessage(
        `${numericAge} years (Range: ${finalRangeLabel})`,
        `${numericAge} वर्ष (आयु वर्ग: ${finalRangeLabel})`
      );

      setProfileData(prev => {
        const updated = { ...prev, age: validAgeStr };
        profileDataRef.current = updated;
        return updated;
      });

      setCurrentStep('gender');
      stepRef.current = 'gender';

      const uNameEn = transliterateName(profileDataRef.current.name, 'English');
      const uNameHi = transliterateName(profileDataRef.current.name, 'Hindi');

      if (isRelSetup) {
        addBotMessageAndListen(
          `What is ${uNameEn}'s gender? Say Male, Female, or Other.`,
          `${uNameHi} जी का लिंग क्या है? बोलिए: पुरुष, महिला, या अन्य।`
        );
      } else {
        addBotMessageAndListen(
          'What is your gender? Say Male, Female, or Other.',
          'आपका लिंग क्या है? बोलिए: पुरुष, महिला, या अन्य।'
        );
      }

    } else if (step === 'gender') {
      let g: 'Male' | 'Female' | 'Other' = 'Female';
      const low = value.toLowerCase();
      if (low.includes('male') || low.includes('पुरुष') || low.includes('aadmi') || low.includes('man') || low.includes('लड़का')) g = 'Male';
      else if (low.includes('female') || low.includes('महिला') || low.includes('aurat') || low.includes('woman') || low.includes('स्त्री')) g = 'Female';
      else g = 'Other';

      setProfileData(prev => {
        const updated = { ...prev, gender: g };
        profileDataRef.current = updated;
        return updated;
      });
      const gHi = g === 'Male' ? 'पुरुष' : g === 'Female' ? 'महिला' : 'अन्य';
      addUserMessage(g, gHi);

      setCurrentStep('location');
      stepRef.current = 'location';

      const uNameEn = transliterateName(profileDataRef.current.name, 'English');
      const uNameHi = transliterateName(profileDataRef.current.name, 'Hindi');

      if (isRelSetup) {
        addBotMessageAndListen(
          `Where does ${uNameEn} live? Speak their city name, or say Live GPS.`,
          `${uNameHi} जी कहाँ रहते हैं? उनके शहर का नाम बोलें या लाइव जीपीएस बोलें।`
        );
      } else {
        addBotMessageAndListen(
          'Where do you live? Speak your city name, or say Live GPS.',
          'आप कहाँ रहते हैं? अपने शहर का नाम बोलें या लाइव जीपीएस बोलें।'
        );
      }

    } else if (step === 'location') {
      const low = value.toLowerCase();
      if (low.includes('gps') || low.includes('जीपीएस') || low.includes('लाइव लोकेशन') || low.includes('वर्तमान स्थान')) {
        handleUseGpsLocation();
        return;
      }

      const locEn = transliterateName(value, 'English');
      const locHi = transliterateName(value, 'Hindi');
      setProfileData(prev => {
        const updated = { ...prev, address: hi ? locHi : locEn };
        profileDataRef.current = updated;
        return updated;
      });
      addUserMessage(locEn, locHi);

      setCurrentStep('watch');
      stepRef.current = 'watch';

      const uNameEn = transliterateName(profileDataRef.current.name, 'English');
      const uNameHi = transliterateName(profileDataRef.current.name, 'Hindi');

      if (isRelSetup) {
        addBotMessageAndListen(
          `Which smartwatch does ${uNameEn} use? For example: ResQNet Watch, Apple Watch, Galaxy Watch, Garmin, boAt.`,
          `क्या ${uNameHi} जी कोई स्मार्टवॉच पहनते हैं? वॉच का नाम बोलें जैसे ResQNet Watch, Apple Watch.`
        );
      } else {
        addBotMessageAndListen(
          'Which smartwatch or fitness band do you use? For example: ResQNet Watch, Apple Watch, Samsung Galaxy Watch, Garmin.',
          'आप कौन सी स्मार्टवॉच या फिटनेस बैंड इस्तेमाल करते हैं? वॉच का नाम बोलें जैसे ResQNet Watch, Apple Watch.'
        );
      }

    } else if (step === 'watch') {
      const valLower = value.toLowerCase().trim();
      let watchEn = value;
      let watchHi = value;

      if (valLower.includes('resq') || valLower.includes('rescue')) {
        watchEn = 'ResQNet Watch';
        watchHi = 'ResQNet वॉच';
      } else if (valLower.includes('apple') || valLower.includes('iwatch')) {
        watchEn = 'Apple Watch';
        watchHi = 'Apple Watch';
      } else if (valLower.includes('samsung') || valLower.includes('galaxy')) {
        watchEn = 'Samsung Galaxy Watch';
        watchHi = 'Samsung Galaxy Watch';
      } else if (valLower.includes('garmin')) {
        watchEn = 'Garmin';
        watchHi = 'Garmin';
      } else if (valLower.includes('fitbit')) {
        watchEn = 'Fitbit';
        watchHi = 'Fitbit';
      } else if (valLower.includes('noise') || valLower.includes('boat')) {
        watchEn = 'Noise / boAt';
        watchHi = 'Noise / boAt';
      } else if (!watchEn || watchEn.trim() === '') {
        watchEn = 'ResQNet Watch';
        watchHi = 'ResQNet वॉच';
      }

      setProfileData(prev => {
        const updated = { ...prev, watchModel: hi ? watchHi : watchEn };
        profileDataRef.current = updated;
        return updated;
      });
      addUserMessage(watchEn, watchHi);

      setCurrentStep('conditions');
      stepRef.current = 'conditions';

      const uNameEn = transliterateName(profileDataRef.current.name, 'English');
      const uNameHi = transliterateName(profileDataRef.current.name, 'Hindi');

      if (isRelSetup) {
        addBotMessageAndListen(
          `Does ${uNameEn} have any medical conditions like High BP or Diabetes? Speak their condition, or say None.`,
          `क्या ${uNameHi} जी को हाई बीपी, शुगर या कोई अन्य स्वास्थ्य समस्या है? उनकी समस्या बोलकर बताएं, या बोलिए कोई बीमारी नहीं।`
        );
      } else {
        addBotMessageAndListen(
          'Do you have any medical conditions like High BP or Diabetes? Speak your condition, or say None.',
          'क्या आपको हाई बीपी, शुगर या कोई अन्य स्वास्थ्य समस्या है? अपनी समस्या बोलकर बताएं, या बोलिए कोई बीमारी नहीं।'
        );
      }

    } else if (step === 'conditions') {
      let finalConds = selectedConditions;
      if (value) {
        finalConds = extractMedicalConditionsFromSpeech(value);
        setSelectedConditions(finalConds);
      } else if (finalConds.length === 0) {
        finalConds = [hi ? 'कोई बीमारी नहीं' : 'None (Healthy)'];
      }
      
      const condsEn = finalConds.map(c => translateCondition(c, 'English'));
      const condsHi = finalConds.map(c => translateCondition(c, 'Hindi'));

      setProfileData(prev => {
        const updated = { ...prev, medicalConditions: hi ? condsHi : condsEn };
        profileDataRef.current = updated;
        return updated;
      });
      addUserMessage(condsEn.join(', '), condsHi.join(', '));

      if (isRelSetup) {
        // In 'relative' flow, contact was already collected & verified at the start!
        transitionToCompleteStep();
      } else {
        // In 'myself' flow, now ask for Emergency Contact's Name & Relation
        setCurrentStep('contact_name_relation');
        stepRef.current = 'contact_name_relation';
        addBotMessageAndListen(
          'In an emergency, who should we call first? First, please speak or enter your emergency contact\'s name and relation (for example, say "Rahul Son").',
          'आपातकाल में हम सबसे पहले किसे कॉल करें? सबसे पहले, कृपया अपने आपातकालीन संपर्क का नाम और रिश्ता बोलें या दर्ज करें (जैसे बोलें "राहुल बेटा")।'
        );
      }

    } else if (step === 'contact_name_relation') {
      handleSaveContactNameAndRelation(value || contactName, contactRelation);

    } else if (step === 'contact_phone') {
      if (value) {
        const extracted = extractSpokenDigits(value);
        handleProceedToPhoneVerification(extracted || value);
      } else {
        handleProceedToPhoneVerification(contactPhone);
      }

    } else if (step === 'verify_contact_phone') {
      handleConfirmPhoneVerification(value);

    } else if (step === 'complete') {
      handleEnterApp();
    }
  };

  // Wire voice answer refs so SpeechRecognition.onresult always calls the latest handlers
  useEffect(() => {
    handleVoiceAnswerRef.current = (spokenText: string) => {
      handleInputSubmit(spokenText);
    };
    handlePhoneDigitsCompleteRef.current = (tenDigits: string) => {
      handleProceedToPhoneVerification(tenDigits);
    };
  });

  // Handle medical conditions multi-select
  const toggleCondition = (cond: string) => {
    getAudioContext();
    if (cond.includes('कोई बीमारी नहीं') || cond.includes('None')) {
      setSelectedConditions([isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)']);
      return;
    }
    setSelectedConditions(prev => {
      const filtered = prev.filter(c => !c.includes('कोई बीमारी नहीं') && !c.includes('None'));
      if (filtered.includes(cond)) {
        return filtered.filter(c => c !== cond);
      } else {
        return [...filtered, cond];
      }
    });
  };

  // Manual toggle for microphone - requests browser mic permission & enables mic immediately to speak the answer
  const toggleSpeechRecognition = async () => {
    unlockAudioEngine();
    getAudioContext();
    if (isListening) {
      stopListening(true);
    } else {
      stopAudibleSpeech();
      setIsSpeaking(false);
      manualMicStopRef.current = false;
      // Ensure hardware microphone permission is granted on click
      const { stream } = await requestMicrophoneAccess();
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      startAutoListening();
    }
  };

  const relationshipOptions = isHindi ? [
    'बेटा',
    'बेटी',
    'पति',
    'पत्नी',
    'भाई',
    'बहन',
    'पिता',
    'माता',
    'मित्र / पड़ोसी',
    'डॉक्टर',
    'अन्य परिजन'
  ] : [
    'Son',
    'Daughter',
    'Husband',
    'Wife',
    'Brother',
    'Sister',
    'Father',
    'Mother',
    'Friend / Neighbor',
    'Doctor',
    'Other Relative'
  ];

  const currentDigitCount = contactPhone.replace(/\D/g, '').length;
  const isRelativeFlow = profileData.setupTarget === 'relative';
  const displayUserName = transliterateName(profileData.name, isHindi ? 'Hindi' : 'English');
  const displayContactName = transliterateName(contactName, isHindi ? 'Hindi' : 'English');
  const displayContactRelation = translateRelationship(contactRelation, isHindi ? 'Hindi' : 'English');
  const anyPermissionDeclined =
    !chatPermissions.microphoneCamera ||
    !chatPermissions.liveLocation ||
    !chatPermissions.motionSensors ||
    !chatPermissions.neighboursPermission;

  return (
    <div className={`min-h-screen flex items-center justify-center p-0 sm:p-4 transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 sm:bg-slate-900 text-white' : 'bg-slate-100 sm:bg-slate-200 text-slate-900'
    }`}>
      
      {/* MOBILE CONTAINER */}
      <div className={`w-full max-w-[430px] h-screen sm:h-[880px] sm:max-h-[93vh] flex flex-col justify-between overflow-hidden sm:rounded-[42px] sm:border-[6px] shadow-2xl transition-all ${
        isDarkMode 
          ? 'bg-slate-950 sm:border-slate-800 shadow-black/80' 
          : 'bg-white sm:border-slate-300 shadow-slate-400/40'
      }`}>
        
        {/* ============================================================
            STEP 0: STARTING LANGUAGE SELECTION SCREEN
           ============================================================ */}
        {currentStep === 'language' ? (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto animate-fadeIn">
            
            {/* Brand Header */}
            <div className="text-center space-y-2.5 pt-4">
              <div className="flex justify-center">
                <ResQLogo size="xl" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                ResQ<span className="text-cyan-500">Net</span>
              </h1>
              <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 leading-snug px-2">
                Every Second Counts. Every Citizen Connected.
                <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  हर सेकंड कीमती है। हर नागरिक जुड़ा है।
                </span>
              </p>
            </div>

            {/* Language Selection Cards */}
            <div className="space-y-4 my-auto py-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-black">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>ऑडियो वार्तालाप · Audio Conversation</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white pt-1">
                  अपनी भाषा चुनें / Select Language
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  भाषा चुनते ही ऐप आपसे आवाज़ में बात करेगा
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('Hindi')}
                  className="p-4 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent hover:from-emerald-500/25 transition-all flex items-center justify-between cursor-pointer active:scale-98 shadow-md group"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow">
                      HI
                    </div>
                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white block">
                        हिंदी (Hindi)
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                        हिंदी में बोलकर सेटअप करें
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLanguage('English')}
                  className="p-4 rounded-2xl border-2 border-cyan-500 bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent hover:from-cyan-500/25 transition-all flex items-center justify-between cursor-pointer active:scale-98 shadow-md group"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow">
                      EN
                    </div>
                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white block">
                        English
                      </span>
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 block">
                        Set up via English voice chat
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center pb-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                108 Ambulance · 112 Emergency · Senior Safety
              </p>
            </div>
          </div>
        ) : (
          /* ============================================================
             AUDIO CHAT CONVERSATION SCREEN
             ============================================================ */
          <>
            {/* TOP HEADER */}
            <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <ResQLogo size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-tight">
                      ResQ<span className="text-cyan-500">Net</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      {isHindi ? 'ऑडियो चैट' : 'AUDIO CHAT'}
                    </span>
                  </div>
                  <p className="text-[9.5px] font-semibold text-cyan-600 dark:text-cyan-400 leading-tight">
                    {isHindi ? 'हर सेकंड कीमती है। हर नागरिक जुड़ा है।' : 'Every Second Counts. Every Citizen Connected.'}
                  </p>
                </div>
              </div>

              {/* Language Switcher Pill */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0">
                <Languages className="w-3.5 h-3.5 text-cyan-500 ml-1" />
                <button
                  type="button"
                  onClick={() => handleSwitchLanguage('Hindi')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    isHindi
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLanguage('English')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    !isHindi
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* LIVE AUDIO STATUS BANNER (SPEAKING OR LISTENING WITH WAVEFORM) */}
            <div 
              onClick={() => {
                if (!isListening) toggleSpeechRecognition();
              }}
              title={isListening ? (isHindi ? 'माइक सक्रिय है' : 'Microphone is active') : (isHindi ? 'बोलने के लिए माइक दबाएं' : 'Tap to start microphone & speak')}
              className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-bold shrink-0 transition-colors ${
                !isListening ? 'cursor-pointer hover:bg-cyan-500/10' : ''
              } ${
                isSpeaking
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                  : isListening
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : isDarkMode
                  ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-4 h-4 text-cyan-500 animate-bounce shrink-0" />
                    <span className="truncate">
                      {isHindi ? '🔊 ऐप बोल रहा है... ध्यान से सुनें' : '🔊 App is speaking... Please listen'}
                    </span>
                  </>
                ) : isListening ? (
                  <>
                    <div className="flex items-end gap-0.5 h-4 shrink-0" aria-hidden="true">
                      {waveformLevels.slice(0, 5).map((lvl, idx) => (
                        <span
                          key={idx}
                          className="w-1 rounded-full bg-emerald-500 transition-all duration-75"
                          style={{ height: `${Math.max(25, lvl)}%` }}
                        />
                      ))}
                    </div>
                    <span className="truncate font-black">
                      {liveTranscript
                        ? `"${liveTranscript}"`
                        : currentStep === 'contact_phone'
                        ? (isHindi
                            ? `🎙️ 10 अंक बोलें (${currentDigitCount}/10 अंक मिले)...`
                            : `🎙️ Speak 10 digits (${currentDigitCount}/10 captured)...`)
                        : (isHindi ? '🎙️ माइक चालू है — अब अपना जवाब बोलें...' : '🎙️ Mic is ON — Speak your answer now...')}
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-500 animate-pulse shrink-0" />
                    <span className="truncate font-extrabold text-cyan-700 dark:text-cyan-300">
                      {isHindi ? '🎙️ बोलने के लिए यहाँ या माइक दबाएं' : '🎙️ Tap here or Mic to speak your answer'}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSpeechRecognition();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-sm ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-cyan-600 text-white hover:bg-cyan-700'
                }`}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isListening ? (isHindi ? 'रोकें' : 'Stop') : (isHindi ? 'बोलें' : 'Speak')}</span>
              </button>
            </div>

            {/* CHAT MESSAGES BODY */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-3.5 space-y-3"
            >
              {messages.map((msg) => {
                const displayText = isHindi ? msg.textHi : msg.textEn;
                return (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
                  >
                    <div className={`max-w-[88%] rounded-2xl p-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                        : msg.isError
                          ? 'bg-red-500/15 border-2 border-red-500/50 text-red-700 dark:text-red-300 rounded-bl-none'
                          : isDarkMode
                            ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                            : 'bg-slate-100 border border-slate-200 text-slate-900 rounded-bl-none'
                    }`}>
                      {msg.sender === 'bot' && (
                        <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-black/10 dark:border-white/10">
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            msg.isError ? 'text-red-600 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'
                          }`}>
                            {msg.isError ? <AlertCircle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            <span>{msg.isError ? (isHindi ? 'चेतावनी / त्रुटि' : 'Validation Error') : 'ResQNet Audio'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSpeaking(true);
                              speakAudibleMessage(
                                displayText,
                                isHindi ? 'hi-IN' : 'en-US',
                                () => {
                                  setIsSpeaking(false);
                                  if (stepRef.current !== 'permissions') {
                                    startAutoListening();
                                  }
                                }
                              );
                            }}
                            className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title={isHindi ? 'फिर से सुनें' : 'Replay Audio'}
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isHindi ? 'सुनें' : 'Play'}</span>
                          </button>
                        </div>
                      )}

                      <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">
                        {displayText}
                      </p>
                      <span className="text-[9px] opacity-60 block mt-1 text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* INTERACTIVE CONTROLS ZONE */}
            <div className={`p-3 border-t shrink-0 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            } space-y-2`}>

              {/* STEP 1 IN CHAT: PERMISSIONS (ALL MANDATORY — IF ANY DECLINED, APP WILL NOT START) */}
              {currentStep === 'permissions' && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        key: 'microphoneCamera' as const,
                        label: isHindi ? '🎙️ माइक्रोफ़ोन और आवाज़ पहचान' : '🎙️ Microphone & Voice Access',
                      },
                      {
                        key: 'liveLocation' as const,
                        label: isHindi ? '📍 लाइव जीपीएस लोकेशन' : '📍 Live GPS Location',
                      },
                      {
                        key: 'motionSensors' as const,
                        label: isHindi ? '🏃 गिरने व मोशन का सेंसर' : '🏃 Fall & Motion Sensors',
                      },
                      {
                        key: 'neighboursPermission' as const,
                        label: isHindi ? '💬 आपातकालीन एसएमएस अलर्ट' : '💬 Emergency SMS Alerts',
                      },
                    ].map(perm => {
                      const active = chatPermissions[perm.key];
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => handleToggleSinglePermission(perm.key)}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                              : 'border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300'
                          }`}
                        >
                          <span>{perm.label}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            {active ? (isHindi ? 'चालू (Allowed)' : 'Allowed') : (isHindi ? 'अस्वीकार (Declined)' : 'Declined')}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* PERMISSION DECLINED ERROR BANNER */}
                  {permissionError && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border-2 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold space-y-1.5 animate-fadeIn">
                      <div className="flex items-start gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <span>{permissionError}</span>
                      </div>
                      {anyPermissionDeclined && (
                        <button
                          type="button"
                          onClick={handleEnableAllPermissions}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                        >
                          {isHindi ? '✓ सभी सुरक्षा अनुमतियाँ चालू करें' : '✓ Enable All Safety Permissions'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmPermissionsInChat}
                      className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{isHindi ? 'अनुमतियाँ स्वीकार करें और शुरू करें' : 'Allow Permissions & Start'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclinePermissionsInChat}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 cursor-pointer active:scale-95 transition-all"
                    >
                      {isHindi ? 'अस्वीकार' : 'Decline'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 IN CHAT: TARGET SELECTION (MYSELF VS RELATIVE) */}
              {currentStep === 'target_selection' && (
                <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => handleSelectTarget('myself')}
                    className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="text-xl block mb-1">🙋‍♂️</span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 block">
                      {isHindi ? 'मेरे खुद के लिए' : 'For Myself'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      {isHindi ? '"मेरे लिए" बोलें' : 'Say "For Myself"'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTarget('relative')}
                    className="p-3 rounded-xl border-2 border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 text-left transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="text-xl block mb-1">👵</span>
                    <span className="text-xs font-black text-purple-700 dark:text-purple-300 block">
                      {isHindi ? 'माता-पिता / परिजन' : 'For a Relative'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      {isHindi ? '"माता-पिता" बोलें' : 'Say "Relative"'}
                    </span>
                  </button>
                </div>
              )}

              {/* STEP: AGE (SELECT RANGE 21-30 TO 100+ AND SPEAK OR TYPE EXACT AGE) */}
              {currentStep === 'age' && (
                <div className="space-y-2.5 animate-fadeIn">
                  {ageError && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border-2 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-1.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <span>{ageError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                      {isHindi ? '1. अपना आयु वर्ग (Range) चुनें:' : '1. Select Age Range:'}
                    </span>
                    {selectedAgeRange && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                        {isHindi ? `चुना गया: ${selectedAgeRange} वर्ष` : `Selected: ${selectedAgeRange} yrs`}
                      </span>
                    )}
                  </div>

                  {/* Age Ranges Grid: 21-30, 31-40, 41-50, 51-60, 61-70, 71-80, 81-90, 91-100, 100+ */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {AGE_RANGES.map(range => {
                      const isSelected = selectedAgeRange === range.label;
                      return (
                        <button
                          key={range.label}
                          type="button"
                          onClick={() => handleInputSubmit(range.label)}
                          className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                              : 'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <span>{range.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Exact Age Guidance Banner */}
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-2 text-[11px] font-bold text-cyan-800 dark:text-cyan-200">
                    <span>
                      {selectedAgeRange
                        ? (isHindi
                            ? `🎙️ अब ${selectedAgeRange} वर्ग में अपनी सटीक आयु नीचे बोलें या टाइप करें`
                            : `🎙️ Now speak or type your exact age (${selectedAgeRange} yrs) below`)
                        : (isHindi
                            ? '🎙️ आयु वर्ग चुनें और अपनी सटीक आयु माइक से बोलें या नीचे लिखें'
                            : '🎙️ Select a range above & speak or type your exact age below')}
                    </span>
                  </div>
                </div>
              )}

              {/* STEP: GENDER */}
              {currentStep === 'gender' && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputSubmit('Male')}
                    className="py-2.5 px-2 rounded-xl font-black text-xs border border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer text-center"
                  >
                    👨 {isHindi ? 'पुरुष' : 'Male'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputSubmit('Female')}
                    className="py-2.5 px-2 rounded-xl font-black text-xs border border-pink-500 bg-pink-500/10 hover:bg-pink-500 hover:text-white transition-all cursor-pointer text-center"
                  >
                    👩 {isHindi ? 'महिला' : 'Female'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputSubmit('Other')}
                    className="py-2.5 px-2 rounded-xl font-black text-xs border border-purple-500 bg-purple-500/10 hover:bg-purple-500 hover:text-white transition-all cursor-pointer text-center"
                  >
                    ⚪ {isHindi ? 'अन्य' : 'Other'}
                  </button>
                </div>
              )}

              {/* STEP: LOCATION */}
              {currentStep === 'location' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleUseGpsLocation}
                    disabled={locationLoading}
                    className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                  >
                    {locationLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{isHindi ? '📍 वर्तमान जीपीएस स्थान लें' : '📍 Use Live GPS Location'}</span>
                  </button>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {(isHindi ? ['नई दिल्ली', 'मुंबई', 'लखनऊ', 'जयपुर', 'कोलकाता'] : ['New Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Kolkata']).map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleInputSubmit(city)}
                        className="py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP: WATCH */}
              {currentStep === 'watch' && (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'ResQNet Watch', desc: isHindi ? '⭐ ऑफिशियल SOS वॉच' : '⭐ Official SOS Watch' },
                    { label: 'Apple Watch', desc: isHindi ? 'स्मार्टवॉच' : 'Smartwatch' },
                    { label: 'Samsung Galaxy Watch', desc: isHindi ? 'स्मार्टवॉच' : 'Smartwatch' },
                    { label: 'Garmin', desc: isHindi ? 'जीपीएस फिटनेस वॉच' : 'GPS & Fitness Watch' },
                    { label: 'Fitbit', desc: isHindi ? 'हेल्थ ट्रैकर' : 'Health Tracker' },
                    { label: 'Noise / boAt', desc: isHindi ? 'स्मार्ट बैंड' : 'Smart Band' },
                  ].map(w => (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => handleInputSubmit(w.label)}
                      className="p-2 rounded-xl font-bold text-xs border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Watch className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{w.label}</span>
                      </div>
                      <span className="text-[10px] opacity-75 block">{w.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: MEDICAL CONDITIONS */}
              {currentStep === 'conditions' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: isHindi ? 'हाई बीपी' : 'High Blood Pressure', label: isHindi ? '🩺 हाई बीपी' : '🩺 High BP' },
                      { id: isHindi ? 'शुगर / डायबिटीज' : 'Diabetes / Sugar', label: isHindi ? '🩸 शुगर / डायबिटीज' : '🩸 Diabetes' },
                      { id: isHindi ? 'दिल की बीमारी' : 'Heart Condition', label: isHindi ? '❤️ दिल की बीमारी' : '❤️ Heart Issue' },
                      { id: isHindi ? 'सांस / दमा' : 'Asthma / Breathing', label: isHindi ? '🫁 सांस / दमा' : '🫁 Asthma' },
                      { id: isHindi ? 'जोड़ों का दर्द' : 'Joint Pain / Arthritis', label: isHindi ? '🦴 जोड़ों का दर्द' : '🦴 Joint Pain' },
                      { id: isHindi ? 'कोई बीमारी नहीं' : 'None (Healthy)', label: isHindi ? '✅ कोई बीमारी नहीं' : '✅ None (Healthy)' },
                    ].map(item => {
                      const isChecked = selectedConditions.some(c => c === item.id || (item.id.includes('कोई') && c.includes('कोई')) || (item.id.includes('None') && c.includes('None')));
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleCondition(item.id)}
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer text-left flex items-center justify-between ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInputSubmit()}
                    className="w-full py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                  >
                    <span>{isHindi ? 'आगे बढ़ें' : 'Save & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP A: EMERGENCY CONTACT NAME & RELATION WITH USER */}
              {currentStep === 'contact_name_relation' && (
                <div className="space-y-2 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      {isRelativeFlow
                        ? (isHindi ? '1. आपका नाम (आपातकालीन संपर्क)' : '1. Your Name (Emergency Contact)')
                        : (isHindi ? '1. आपातकालीन संपर्क का नाम (बोलें या लिखें)' : '1. Emergency Contact Name (Speak or Type)')}
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => {
                        setContactName(e.target.value);
                        contactNameRef.current = e.target.value;
                      }}
                      placeholder={
                        isRelativeFlow
                          ? (isHindi ? 'अपना नाम बोलें या लिखें...' : 'Speak or type your name...')
                          : (isHindi ? 'संपर्क का नाम लिखें या बोलें...' : 'Speak or type contact name...')
                      }
                      className="w-full p-2 rounded-xl border text-xs font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {isRelativeFlow
                        ? (isHindi ? '2. उपयोगकर्ता (परिजन) से आपका रिश्ता चुनें' : '2. Your Relation with the User (Relative)')
                        : (isHindi ? '2. रिश्ता चुनें' : '2. Select Relationship')}
                    </label>
                    <div className="grid grid-cols-3 gap-1 max-h-20 overflow-y-auto p-1 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      {relationshipOptions.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setContactRelation(r);
                            contactRelationRef.current = r;
                          }}
                          className={`p-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate ${
                            contactRelation === r
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveContactNameAndRelation(contactName, contactRelation)}
                    disabled={!contactName.trim()}
                    className="w-full py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isHindi ? 'नाम और रिश्ता सहेजें — अब नंबर बताएं' : 'Save Name & Relation — Next: Mobile Number'}</span>
                  </button>
                </div>
              )}

              {/* STEP B: EMERGENCY CONTACT 10-DIGIT MOBILE NUMBER */}
              {currentStep === 'contact_phone' && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold">
                    <span className="text-emerald-700 dark:text-emerald-300 truncate">
                      👤 {displayContactName} ({displayContactRelation})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      currentDigitCount === 10
                        ? 'bg-emerald-600 text-white'
                        : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                    }`}>
                      {currentDigitCount}/10 {isHindi ? 'अंक' : 'Digits'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      {isHindi
                        ? '10 अंकों का मोबाइल नंबर बोलें या टाइप करें (10 अंक पूरे होने तक माइक चालू रहेगा)'
                        : 'Speak or type 10-digit mobile number (Mic stays on until 10 digits are spoken)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={contactPhone}
                        onChange={e => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setContactPhone(digitsOnly);
                          phoneDigitsRef.current = digitsOnly;
                          setInputText(digitsOnly);
                          if (digitsOnly.length === 10) {
                            setPhoneError(null);
                          }
                        }}
                        placeholder={isHindi ? '10 अंक बोलें या यहाँ टाइप करें...' : 'Speak or type 10 digits here...'}
                        className={`w-full pl-8 pr-16 py-2 rounded-xl border text-sm font-black tracking-widest bg-white dark:bg-slate-800 outline-none font-mono ${
                          phoneError
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-emerald-500/60 dark:border-emerald-500/50'
                        }`}
                      />
                      {contactPhone.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setContactPhone('');
                            phoneDigitsRef.current = '';
                            setInputText('');
                            setPhoneError(null);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          {isHindi ? 'साफ़ करें' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>

                  {phoneError && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border-2 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-1.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <span>{phoneError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleProceedToPhoneVerification(contactPhone)}
                    className="w-full py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {currentDigitCount === 10
                        ? (isHindi ? 'आगे बढ़ें: नंबर सत्यापित करें' : 'Continue to Verify Number')
                        : (isHindi ? `नंबर सत्यापित करें (${currentDigitCount}/10 अंक)` : `Verify Contact Number (${currentDigitCount}/10 digits)`)}
                    </span>
                  </button>
                </div>
              )}

              {/* STEP C: CONTACT NUMBER VERIFICATION (4-DIGIT SMS OTP & CONFIRMATION) */}
              {currentStep === 'verify_contact_phone' && (
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-emerald-500/10 border border-emerald-500/30 space-y-2.5 shadow-sm">
                    {/* Target Contact Info Header */}
                    <div className="flex items-center justify-between text-xs font-bold pb-1.5 border-b border-emerald-500/20">
                      <span className="text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                        <span>👤</span>
                        <span>{displayContactName} ({displayContactRelation})</span>
                      </span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                        +91 {contactPhone}
                      </span>
                    </div>

                    {/* Real-time SMS Dispatch Status */}
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="font-semibold">{isHindi ? 'एसएमएस भेजा गया:' : 'SMS Dispatched:'}</span>
                        <span className="font-mono font-bold">+91 {contactPhone}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono font-bold">
                        VK-RESQNET
                      </span>
                    </div>

                    {/* Simulated Incoming SMS Card */}
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700/80 shadow-inner space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-slate-300">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>VK-RESQNET</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono">SMS</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{isHindi ? 'अभी प्राप्त हुआ' : 'Just now'}</span>
                      </div>
                      
                      <p className="text-[11px] text-slate-200 leading-snug font-sans">
                        {isHindi 
                          ? `आपका ResQNet सत्यापन कोड ${verificationOtp} है। 10 मिनट के लिए मान्य। किसी से साझा न करें।` 
                          : `Your ResQNet verification code is ${verificationOtp}. Valid for 10 minutes. Do not share this OTP.`}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">{isHindi ? 'एसएमएस कोड:' : 'SMS Code:'}</span>
                          <span className="font-mono text-xs font-black text-emerald-400 tracking-widest bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                            {verificationOtp}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEnteredOtp(verificationOtp);
                            setOtpError(null);
                          }}
                          className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          {isHindi ? 'कोड भरें (Auto-fill)' : 'Auto-fill OTP'}
                        </button>
                      </div>
                    </div>

                    {/* 4-Digit Input Field */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{isHindi ? 'एसएमएस से प्राप्त 4-अंकीय OTP दर्ज करें:' : 'Enter 4-digit OTP received via SMS:'}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{isHindi ? 'या बोलकर बताएं' : 'or speak aloud'}</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={enteredOtp}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setEnteredOtp(clean);
                            setOtpError(null);
                          }}
                          placeholder="• • • •"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border text-center font-mono text-base font-black tracking-[0.4em] bg-white dark:bg-slate-900 border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {otpError && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-red-700 dark:text-red-300 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmPhoneVerification()}
                      className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{isHindi ? '✅ 4-अंकीय OTP सत्यापित करें' : '✅ Verify 4-Digit OTP'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={handleResendOtp}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                        resendCooldown > 0
                          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border-cyan-500/50 hover:border-cyan-500 text-cyan-700 dark:text-cyan-300 cursor-pointer active:scale-95'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'animate-spin-slow'}`} />
                      <span>
                        {resendCooldown > 0
                          ? (isHindi ? `पुनः भेजें (${resendCooldown}s)` : `Resend (${resendCooldown}s)`)
                          : (isHindi ? 'SMS पुनः भेजें' : 'Resend SMS')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEditPhoneNumber}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer active:scale-95"
                    >
                      {isHindi ? '✏️ बदलें' : '✏️ Change'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: COMPLETE */}
              {currentStep === 'complete' && (
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-1">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                      {isHindi ? 'सुरक्षा सेटअप पूरा हुआ!' : 'Safety Setup Complete!'}
                    </h3>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isHindi ? 'उपयोगकर्ता का नाम:' : 'User Name:'}{' '}
                      <span className="font-black text-emerald-700 dark:text-emerald-300">{displayUserName}</span>
                      {' · '}
                      <span>{profileData.age} {isHindi ? 'वर्ष' : 'yrs'}</span>
                    </p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {isHindi ? 'सत्यापित संपर्क:' : 'Verified Contact:'}{' '}
                      <span className="font-black">{displayContactName} ({displayContactRelation})</span> · +91 {contactPhone}{' '}
                      {contactVerified && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnterApp}
                    className="w-full py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
                  >
                    <span>{isHindi ? '🚀 मुख्य ऐप खोलें' : '🚀 Enter ResQNet App'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* GENERAL VOICE AND INPUT BAR WITH LIVE WAVEFORM & REAL-TIME SPOKEN TEXT PREVIEW */}
              {currentStep !== 'complete' && (
                <div className="space-y-2 pt-1">
                  {/* LIVE VOICE WAVEFORM & REAL-TIME SPOKEN TEXT PREVIEW CARD */}
                  {isListening && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-between gap-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* 9-Bar Live Audio Waveform */}
                        <div className="flex items-end gap-0.5 h-6 px-1.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 shrink-0">
                          {waveformLevels.map((lvl, idx) => (
                            <span
                              key={idx}
                              className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                              style={{ height: `${Math.max(20, lvl)}%` }}
                            />
                          ))}
                        </div>

                        {/* Real-Time Spoken Text Preview */}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                            {isHindi ? 'लाइव आवाज़ पहचान (माइक चालू)' : 'Live Voice Preview (Mic ON)'}
                          </span>
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {liveTranscript
                              ? `"${liveTranscript}"`
                              : (isHindi ? 'बोलिए... आपकी आवाज़ सुनी जा रही है' : 'Speak now... Listening to your voice')}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => stopListening(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-black shrink-0 cursor-pointer"
                      >
                        {isHindi ? 'बंद करें' : 'Done'}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`h-11 px-3.5 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm ${
                        isListening
                          ? 'bg-red-500 text-white border-red-400 animate-pulse'
                          : 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white border-cyan-400 hover:from-cyan-500 hover:to-emerald-500'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>
                        {isListening ? (isHindi ? 'सुन रहा हूँ...' : 'Listening...') : (isHindi ? 'माइक से बोलें' : 'Tap Mic')}
                      </span>
                    </button>

                  <div className="relative flex-1">
                    <input
                      type={currentStep === 'contact_phone' ? 'tel' : 'text'}
                      maxLength={currentStep === 'contact_phone' ? 10 : undefined}
                      value={inputText}
                      onChange={e => {
                        const val = currentStep === 'contact_phone'
                          ? e.target.value.replace(/\D/g, '').slice(0, 10)
                          : e.target.value;
                        setInputText(val);
                        if (currentStep === 'age') {
                          setAgeError(null);
                        }
                        if (currentStep === 'contact_phone') {
                          setContactPhone(val);
                          phoneDigitsRef.current = val;
                          if (val.length === 10) {
                            setPhoneError(null);
                          }
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleInputSubmit();
                      }}
                      placeholder={
                        currentStep === 'contact_phone'
                          ? (isHindi ? '10 अंकों का मोबाइल नंबर बोलें या टाइप करें...' : 'Speak or type 10-digit mobile number...')
                          : currentStep === 'age'
                          ? (selectedAgeRange
                              ? (isHindi ? `अपनी सटीक आयु बोलें या टाइप करें (${selectedAgeRange} वर्ष)...` : `Speak or type exact age (${selectedAgeRange} yrs)...`)
                              : (isHindi ? 'अपनी सटीक आयु बोलें या टाइप करें (जैसे 65)...' : 'Speak or type your exact age (e.g. 65)...'))
                          : currentStep === 'verify_contact_phone'
                          ? (isHindi ? 'OTP कोड बोलें या "सत्यापित करें" लिखें...' : 'Speak OTP or type "Verify"...')
                          : currentStep === 'contact_name_relation'
                          ? (isHindi ? 'संपर्क का नाम और रिश्ता बोलें या लिखें...' : 'Speak or type contact name & relation...')
                          : (isHindi ? 'यहाँ बोलें या टाइप करें...' : 'Speak or type answer...')
                      }
                      className="w-full h-10 pl-3 pr-9 rounded-xl border font-bold text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputSubmit()}
                      disabled={!inputText.trim() && currentStep !== 'contact_name_relation' && currentStep !== 'contact_phone' && currentStep !== 'verify_contact_phone'}
                      className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
};
