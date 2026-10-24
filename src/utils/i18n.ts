import { UserProfile, EmergencyContact } from '../types';

// Memory cache for lossless round-trip transliteration of any user-entered names
const hiToEnCache = new Map<string, string>();
const enToHiCache = new Map<string, string>();

// Dictionary of common Indian names & surnames (Hindi <-> English)
const COMMON_NAMES_HI_EN: Array<[string, string]> = [
  ['राहुल', 'Rahul'],
  ['रिद्धिमा', 'Riddhima'],
  ['बंसल', 'Bansal'],
  ['राजेश', 'Rajesh'],
  ['रमेश', 'Ramesh'],
  ['सुरेश', 'Suresh'],
  ['महेश', 'Mahesh'],
  ['दिनेश', 'Dinesh'],
  ['मुकेश', 'Mukesh'],
  ['नरेश', 'Naresh'],
  ['राकेश', 'Rakesh'],
  ['अमित', 'Amit'],
  ['सुमित', 'Sumit'],
  ['रोहित', 'Rohit'],
  ['मोहित', 'Mohit'],
  ['अंकित', 'Ankit'],
  ['विराट', 'Virat'],
  ['सचिन', 'Sachin'],
  ['नितिन', 'Nitin'],
  ['विपिन', 'Vipin'],
  ['जतिन', 'Jatin'],
  ['गौरव', 'Gaurav'],
  ['सौरव', 'Saurav'],
  ['वैभव', 'Vaibhav'],
  ['राघव', 'Raghav'],
  ['माधव', 'Madhav'],
  ['केशव', 'Keshav'],
  ['प्रणव', 'Pranav'],
  ['आरव', 'Aarav'],
  ['विहान', 'Vihaan'],
  ['आदित्य', 'Aditya'],
  ['आर्यन', 'Aryan'],
  ['अर्जुन', 'Arjun'],
  ['करण', 'Karan'],
  ['वरुण', 'Varun'],
  ['तरुण', 'Tarun'],
  ['अरुण', 'Arun'],
  ['किरण', 'Kiran'],
  ['सुमन', 'Suman'],
  ['अमन', 'Aman'],
  ['नमन', 'Naman'],
  ['रमन', 'Raman'],
  ['पवन', 'Pawan'],
  ['गगन', 'Gagan'],
  ['मदन', 'Madan'],
  ['रतन', 'Ratan'],
  ['चेतन', 'Chetan'],
  ['रोहन', 'Rohan'],
  ['सोहन', 'Sohan'],
  ['मोहन', 'Mohan'],
  ['गोपाल', 'Gopal'],
  ['विशाल', 'Vishal'],
  ['कुणाल', 'Kunal'],
  ['दीपक', 'Deepak'],
  ['आलोक', 'Alok'],
  ['अशोक', 'Ashok'],
  ['विनोद', 'Vinod'],
  ['मनोज', 'Manoj'],
  ['प्रमोद', 'Pramod'],
  ['आनंद', 'Anand'],
  ['विकास', 'Vikas'],
  ['संजय', 'Sanjay'],
  ['विजय', 'Vijay'],
  ['अजय', 'Ajay'],
  ['अनिल', 'Anil'],
  ['सुनील', 'Sunil'],
  ['निखिल', 'Nikhil'],
  ['अखिल', 'Akhil'],
  ['साहिल', 'Sahil'],
  ['कपिल', 'Kapil'],
  ['हर्ष', 'Harsh'],
  ['हर्षित', 'Harshit'],
  ['यश', 'Yash'],
  ['पीयूष', 'Piyush'],
  ['आयुष', 'Ayush'],
  ['प्रशांत', 'Prashant'],
  ['निशांत', 'Nishant'],
  ['सुशांत', 'Sushant'],
  ['सिद्धार्थ', 'Siddharth'],
  ['कार्तिक', 'Kartik'],
  ['हार्दिक', 'Hardik'],
  ['अभिषेक', 'Abhishek'],
  ['विवेक', 'Vivek'],
  ['मयंक', 'Mayank'],
  ['शशांक', 'Shashank'],
  ['प्रियंका', 'Priyanka'],
  ['प्रिया', 'Priya'],
  ['रिया', 'Riya'],
  ['सिया', 'Siya'],
  ['दिया', 'Diya'],
  ['सुनीता', 'Sunita'],
  ['अनीता', 'Anita'],
  ['वनीता', 'Vanita'],
  ['कविता', 'Kavita'],
  ['सविता', 'Savita'],
  ['ममता', 'Mamta'],
  ['लता', 'Lata'],
  ['गीता', 'Geeta'],
  ['सीता', 'Sita'],
  ['नीता', 'Neeta'],
  ['रीता', 'Rita'],
  ['मीना', 'Meena'],
  ['रीना', 'Reena'],
  ['टीना', 'Tina'],
  ['सीमा', 'Seema'],
  ['रेखा', 'Rekha'],
  ['सुषमा', 'Sushma'],
  ['कमला', 'Kamla'],
  ['विमला', 'Vimla'],
  ['सरला', 'Sarla'],
  ['आशा', 'Asha'],
  ['उषा', 'Usha'],
  ['निशा', 'Nisha'],
  ['दिशा', 'Disha'],
  ['पूजा', 'Pooja'],
  ['आरती', 'Aarti'],
  ['स्वाति', 'Swati'],
  ['ज्योति', 'Jyoti'],
  ['कीर्ति', 'Kirti'],
  ['प्रीति', 'Preeti'],
  ['स्मृति', 'Smriti'],
  ['श्रुति', 'Shruti'],
  ['अंजलि', 'Anjali'],
  ['दीपा', 'Deepa'],
  ['दिव्या', 'Divya'],
  ['विद्या', 'Vidya'],
  ['संध्या', 'Sandhya'],
  ['शोभा', 'Shobha'],
  ['प्रभा', 'Prabha'],
  ['सुधा', 'Sudha'],
  ['राधा', 'Radha'],
  ['मेघा', 'Megha'],
  ['नेहा', 'Neha'],
  ['स्नेहा', 'Sneha'],
  ['निधि', 'Nidhi'],
  ['सिद्धि', 'Siddhi'],
  ['ऋद्धि', 'Riddhi'],
  ['साक्षी', 'Sakshi'],
  ['मीनाक्षी', 'Meenakshi'],
  ['सोनाक्षी', 'Sonakshi'],
  ['खुशी', 'Khushi'],
  ['मुस्कान', 'Muskan'],
  ['सिमरन', 'Simran'],
  ['तनु', 'Tanu'],
  ['अनु', 'Anu'],
  ['शालिनी', 'Shalini'],
  ['रोहिणी', 'Rohini'],
  ['नंदिनी', 'Nandini'],
  ['पूनम', 'Poonam'],
  ['सोनम', 'Sonam'],
  ['नीलम', 'Neelam'],
  ['शबनम', 'Shabnam'],
  ['कल्पना', 'Kalpana'],
  ['अर्चना', 'Archana'],
  ['वंदना', 'Vandana'],
  ['साधना', 'Sadhna'],
  ['भावना', 'Bhavna'],
  ['रचना', 'Rachna'],
  // Common Surnames & Titles
  ['शर्मा', 'Sharma'],
  ['वर्मा', 'Verma'],
  ['गुप्ता', 'Gupta'],
  ['कुमार', 'Kumar'],
  ['कुमारी', 'Kumari'],
  ['सिंह', 'Singh'],
  ['पटेल', 'Patel'],
  ['अग्रवाल', 'Agarwal'],
  ['कपूर', 'Kapoor'],
  ['मेहरा', 'Mehra'],
  ['जोशी', 'Joshi'],
  ['यादव', 'Yadav'],
  ['चौधरी', 'Chaudhary'],
  ['मिश्रा', 'Mishra'],
  ['तिवारी', 'Tiwari'],
  ['पांडे', 'Pandey'],
  ['दुबे', 'Dubey'],
  ['सक्सेना', 'Saxena'],
  ['जैन', 'Jain'],
  ['गर्ग', 'Garg'],
  ['मित्तल', 'Mittal'],
  ['गोयल', 'Goyal'],
  ['अरोड़ा', 'Arora'],
  ['खन्ना', 'Khanna'],
  ['मल्होत्रा', 'Malhotra'],
  ['भाटिया', 'Bhatia'],
  ['चोपड़ा', 'Chopra'],
  ['कौर', 'Kaur'],
  ['देवी', 'Devi'],
  ['लाल', 'Lal'],
  ['प्रसाद', 'Prasad'],
  ['नाथ', 'Nath'],
  ['राव', 'Rao'],
  ['रेड्डी', 'Reddy'],
  ['नायर', 'Nair'],
  ['मेनन', 'Menon'],
  ['अय्यर', 'Iyer'],
  ['मुखर्जी', 'Mukherjee'],
  ['बनर्जी', 'Banerjee'],
  ['चटर्जी', 'Chatterjee'],
  ['दास', 'Das'],
  ['बोस', 'Bose'],
  ['सेन', 'Sen'],
  ['दत्ता', 'Dutta'],
  ['राजपूत', 'Rajput'],
  ['ठाकुर', 'Thakur'],
  ['चौहान', 'Chauhan'],
  ['राठौर', 'Rathore'],
  ['शेखावत', 'Shekhawat'],
  ['पवार', 'Pawar'],
  ['शिंदे', 'Shinde'],
  ['देशमुख', 'Deshmukh'],
  ['कुलकर्णी', 'Kulkarni'],
  ['पाटिल', 'Patil'],
  ['खान', 'Khan'],
  ['अली', 'Ali'],
  ['अहमद', 'Ahmad'],
  ['मित्र', 'Friend'],
  ['नागरिक', 'Citizen'],
  ['परिवार', 'Family'],
  ['सदस्य', 'Member'],
];

for (const [hi, en] of COMMON_NAMES_HI_EN) {
  hiToEnCache.set(hi, en);
  enToHiCache.set(en.toLowerCase(), hi);
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const HI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'ळ': 'l',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};

const HI_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ऑ': 'o', 'ऍ': 'e',
};

const HI_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ॉ': 'o', 'ॅ': 'e',
};

function transliterateWordHiToEn(word: string): string {
  const cached = hiToEnCache.get(word);
  if (cached) return cached;

  // Normalize precomposed nukta chars
  const chars = Array.from(
    word
      .replace(/क़/g, 'क\u093C')
      .replace(/ख़/g, 'ख\u093C')
      .replace(/ग़/g, 'ग\u093C')
      .replace(/ज़/g, 'ज\u093C')
      .replace(/ड़/g, 'ड\u093C')
      .replace(/ढ़/g, 'ढ\u093C')
      .replace(/फ़/g, 'फ\u093C')
  );

  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (HI_VOWELS[ch]) {
      out += HI_VOWELS[ch];
      continue;
    }

    if (HI_CONSONANTS[ch]) {
      let base = HI_CONSONANTS[ch];
      let offset = 1;
      if (next === '\u093C') {
        // Nukta adjustment
        if (ch === 'क') base = 'q';
        else if (ch === 'ज') base = 'z';
        else if (ch === 'ड') base = 'r';
        else if (ch === 'ढ') base = 'rh';
        else if (ch === 'फ') base = 'f';
        offset = 2;
      }

      const afterConsonant = chars[i + offset];
      if (afterConsonant === '्') {
        // Virama suppresses inherent vowel
        out += base;
        i += offset; // skip virama
      } else if (afterConsonant && HI_MATRAS[afterConsonant]) {
        out += base + HI_MATRAS[afterConsonant];
        i += offset; // skip matra
      } else {
        // Inherent 'a' vowel unless at end of word (schwa deletion)
        const isWordEnd = i + offset >= chars.length;
        const prevWasVirama = i > 0 && chars[i - 1] === '्';
        if (!isWordEnd || prevWasVirama || chars.length === 1) {
          out += base + 'a';
        } else {
          out += base;
        }
        i += offset - 1;
      }
      continue;
    }

    if (HI_MATRAS[ch]) {
      out += HI_MATRAS[ch];
      continue;
    }

    if (ch === 'ं' || ch === 'ँ') {
      const nextCons = chars[i + 1];
      if (nextCons === 'प' || nextCons === 'फ' || nextCons === 'ब' || nextCons === 'भ' || nextCons === 'म') {
        out += 'm';
      } else {
        out += 'n';
      }
      continue;
    }

    if (ch === 'ः') {
      out += 'h';
      continue;
    }

    if (ch !== '्' && ch !== '\u093C') {
      out += ch;
    }
  }

  const formatted = out ? out.charAt(0).toUpperCase() + out.slice(1).toLowerCase() : word;
  hiToEnCache.set(word, formatted);
  enToHiCache.set(formatted.toLowerCase(), word);
  return formatted;
}

const EN_CONSONANT_TOKENS: Array<[string, string]> = [
  ['ksh', 'क्ष'],
  ['shr', 'श्र'],
  ['chh', 'छ'],
  ['gy', 'ज्ञ'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['k', 'क'],
  ['c', 'क'],
  ['q', 'क'],
  ['g', 'ग'],
  ['j', 'ज'],
  ['z', 'ज़'],
  ['t', 'ट'],
  ['d', 'ड'],
  ['n', 'न'],
  ['p', 'प'],
  ['f', 'फ़'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
  ['x', 'क्स'],
];

const EN_VOWEL_TOKENS: Array<[string, string, string]> = [
  // [token, independentVowel, matra]
  ['aa', 'आ', 'ा'],
  ['ee', 'ई', 'ी'],
  ['oo', 'ऊ', 'ू'],
  ['ai', 'ऐ', 'ै'],
  ['au', 'औ', 'ौ'],
  ['ou', 'औ', 'ौ'],
  ['ei', 'ए', 'े'],
  ['a', 'अ', ''],
  ['i', 'इ', 'ि'],
  ['u', 'उ', 'ु'],
  ['e', 'ए', 'े'],
  ['o', 'ओ', 'ो'],
];

function transliterateWordEnToHi(word: string): string {
  const lower = word.toLowerCase();
  const cached = enToHiCache.get(lower);
  if (cached) return cached;

  let i = 0;
  let out = '';
  let prevWasConsonant = false;

  while (i < lower.length) {
    const rest = lower.slice(i);

    // Check vowel tokens first
    let matchedVowel: [string, string, string] | null = null;
    for (const v of EN_VOWEL_TOKENS) {
      if (rest.startsWith(v[0])) {
        matchedVowel = v;
        break;
      }
    }

    if (matchedVowel) {
      const [tok, indep, matra] = matchedVowel;
      if (!prevWasConsonant) {
        out += indep;
      } else {
        // If single 'a' at the end of a word (e.g., Priya, Sunita, Sharma), use 'ा' matra
        if (tok === 'a' && i + tok.length === lower.length) {
          out += 'ा';
        } else if (tok === 'i' && i + tok.length === lower.length) {
          out += 'ी';
        } else {
          out += matra;
        }
      }
      prevWasConsonant = false;
      i += tok.length;
      continue;
    }

    // Check consonant tokens
    let matchedCons: [string, string] | null = null;
    for (const c of EN_CONSONANT_TOKENS) {
      if (rest.startsWith(c[0])) {
        matchedCons = c;
        break;
      }
    }

    if (matchedCons) {
      const [tok, hiCons] = matchedCons;
      // Contextual dental t/d in common positions
      let mappedCons = hiCons;
      if (tok === 't' && (rest.startsWith('ta') || rest.startsWith('ti') || rest.startsWith('tu') || rest.startsWith('tr') || i + 1 === lower.length)) {
        mappedCons = 'त';
      } else if (tok === 'd' && (rest.startsWith('da') || rest.startsWith('di') || rest.startsWith('du') || rest.startsWith('dr') || rest.startsWith('de') || rest.startsWith('div'))) {
        mappedCons = 'द';
      }

      if (prevWasConsonant) {
        out += '्';
      }
      out += mappedCons;
      prevWasConsonant = true;
      i += tok.length;
      continue;
    }

    // Any other char
    out += lower[i];
    prevWasConsonant = false;
    i++;
  }

  const titleCaseEn = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  if (out) {
    enToHiCache.set(lower, out);
    hiToEnCache.set(out, titleCaseEn);
  }
  return out || word;
}

/**
 * Bidirectional Hindi (Devanagari) <-> English (Roman) name converter.
 * Ensures that when the user changes language from Hindi to English or vice-versa,
 * both the user's name and emergency contact names convert to the target language.
 */
export function transliterateName(name: string, targetLang: 'English' | 'Hindi'): string {
  if (!name || !name.trim()) return name;
  const trimmed = name.replace(/[।॥.,!?;:]+/g, ' ').trim();

  const words = trimmed.split(/\s+/);
  const converted = words
    .map(w => {
      const cleanWord = w.replace(/^[,.\-!?;:।॥()'"\s]+|[,.\-!?;:।॥()'"\s]+$/g, '');
      if (!cleanWord) return '';
      // Skip trailing honorifics if accidentally left in name
      if (cleanWord === 'जी' || cleanWord.toLowerCase() === 'ji' || cleanWord === 'है') {
        return '';
      }

      const hasDevanagari = DEVANAGARI_REGEX.test(cleanWord);
      const hasLatin = /[a-zA-Z]/.test(cleanWord);

      if (targetLang === 'English') {
        if (hasDevanagari) {
          return transliterateWordHiToEn(cleanWord);
        }
        return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
      } else {
        // targetLang === 'Hindi'
        if (hasLatin && !hasDevanagari) {
          return transliterateWordEnToHi(cleanWord);
        }
        return cleanWord;
      }
    })
    .filter(Boolean);

  return converted.join(' ');
}

const CONDITION_MAP_EN_TO_HI: Record<string, string> = {
  'High Blood Pressure': 'हाई बीपी',
  'High BP': 'हाई बीपी',
  'Diabetes / Sugar': 'शुगर / डायबिटीज',
  'Diabetes': 'शुगर / डायबिटीज',
  'Heart Condition': 'दिल की बीमारी',
  'Heart Issue': 'दिल की बीमारी',
  'Asthma / Breathing': 'सांस / दमा',
  'Asthma': 'सांस / दमा',
  'Joint Pain / Arthritis': 'जोड़ों का दर्द',
  'Joint Pain': 'जोड़ों का दर्द',
  'None (Healthy)': 'कोई बीमारी नहीं',
  'None': 'कोई बीमारी नहीं',
};

const CONDITION_MAP_HI_TO_EN: Record<string, string> = {
  'हाई बीपी': 'High Blood Pressure',
  'शुगर / डायबिटीज': 'Diabetes / Sugar',
  'दिल की बीमारी': 'Heart Condition',
  'सांस / दमा': 'Asthma / Breathing',
  'जोड़ों का दर्द': 'Joint Pain / Arthritis',
  'कोई बीमारी नहीं': 'None (Healthy)',
};

const WATCH_MAP_EN_TO_HI: Record<string, string> = {
  'ResQNet Watch': 'ResQNet वॉच',
  'No Smartwatch': 'कोई स्मार्टवॉच नहीं',
  'None': 'कोई स्मार्टवॉच नहीं',
};

const WATCH_MAP_HI_TO_EN: Record<string, string> = {
  'ResQNet वॉच': 'ResQNet Watch',
  'कोई स्मार्टवॉच नहीं': 'No Smartwatch',
};

const CITY_MAP_EN_TO_HI: Record<string, string> = {
  'New Delhi': 'नई दिल्ली',
  'New Delhi (Live GPS)': 'नई दिल्ली (लाइव जीपीएस)',
  'Mumbai': 'मुंबई',
  'Lucknow': 'लखनऊ',
  'Bengaluru': 'बेंगलुरु',
  'Jaipur': 'जयपुर',
  'Kolkata': 'कोलकाता',
  'Chennai': 'चेन्नई',
  'Hyderabad': 'हैदराबाद',
  'Pune': 'पुणे',
  'Ahmedabad': 'अहमदाबाद',
};

const CITY_MAP_HI_TO_EN: Record<string, string> = {
  'नई दिल्ली': 'New Delhi',
  'नई दिल्ली (लाइव जीपीएस)': 'New Delhi (Live GPS)',
  'मुंबई': 'Mumbai',
  'लखनऊ': 'Lucknow',
  'बेंगलुरु': 'Bengaluru',
  'जयपुर': 'Jaipur',
  'कोलकाता': 'Kolkata',
  'चेन्नई': 'Chennai',
  'हैदराबाद': 'Hyderabad',
  'पुणे': 'Pune',
  'अहमदाबाद': 'Ahmedabad',
};

const RELATION_MAP_EN_TO_HI: Record<string, string> = {
  'Son': 'बेटा',
  'Daughter': 'बेटी',
  'Husband': 'पति',
  'Wife': 'पत्नी',
  'Brother': 'भाई',
  'Sister': 'बहन',
  'Father': 'पिता',
  'Mother': 'माता',
  'Friend / Neighbor': 'मित्र / पड़ोसी',
  'Friend': 'मित्र / पड़ोसी',
  'Neighbor': 'मित्र / पड़ोसी',
  'Doctor': 'डॉक्टर',
  'Other Relative': 'अन्य परिजन',
  'Relative': 'अन्य परिजन',
  'Family': 'परिवार',
};

const RELATION_MAP_HI_TO_EN: Record<string, string> = {
  'बेटा': 'Son',
  'बेटी': 'Daughter',
  'पति': 'Husband',
  'पत्नी': 'Wife',
  'भाई': 'Brother',
  'बहन': 'Sister',
  'पिता': 'Father',
  'माता': 'Mother',
  'मित्र / पड़ोसी': 'Friend / Neighbor',
  'मित्र': 'Friend / Neighbor',
  'पड़ोसी': 'Friend / Neighbor',
  'डॉक्टर': 'Doctor',
  'अन्य परिजन': 'Other Relative',
  'परिजन': 'Other Relative',
  'परिवार': 'Family',
};

export function translateCondition(cond: string, targetLang: 'English' | 'Hindi'): string {
  const trimmed = cond.trim();
  if (targetLang === 'Hindi') {
    return CONDITION_MAP_EN_TO_HI[trimmed] || trimmed;
  } else {
    return CONDITION_MAP_HI_TO_EN[trimmed] || trimmed;
  }
}

export function translateRelationship(rel: string, targetLang: 'English' | 'Hindi'): string {
  const trimmed = rel.trim();
  if (targetLang === 'Hindi') {
    return RELATION_MAP_EN_TO_HI[trimmed] || trimmed;
  } else {
    return RELATION_MAP_HI_TO_EN[trimmed] || trimmed;
  }
}

export function translateAddress(addr: string, targetLang: 'English' | 'Hindi'): string {
  if (!addr) return addr;
  const trimmed = addr.trim();
  if (targetLang === 'Hindi') {
    if (CITY_MAP_EN_TO_HI[trimmed]) return CITY_MAP_EN_TO_HI[trimmed];
    let updated = trimmed;
    for (const [en, hi] of Object.entries(CITY_MAP_EN_TO_HI)) {
      if (updated === en) return hi;
    }
    updated = updated.replace(/\(Live GPS\)/gi, '(लाइव जीपीएस)');
    // If pure English text, transliterate city/place name to Hindi
    if (!DEVANAGARI_REGEX.test(updated) && /[a-zA-Z]/.test(updated)) {
      return transliterateName(updated, 'Hindi');
    }
    return updated;
  } else {
    if (CITY_MAP_HI_TO_EN[trimmed]) return CITY_MAP_HI_TO_EN[trimmed];
    let updated = trimmed;
    for (const [hi, en] of Object.entries(CITY_MAP_HI_TO_EN)) {
      if (updated === hi) return en;
    }
    updated = updated.replace(/\(लाइव जीपीएस\)/g, '(Live GPS)');
    if (DEVANAGARI_REGEX.test(updated)) {
      return transliterateName(updated, 'English');
    }
    return updated;
  }
}

export function translateWatchModel(watch: string, targetLang: 'English' | 'Hindi'): string {
  if (!watch) return watch;
  const trimmed = watch.trim();
  if (targetLang === 'Hindi') {
    return WATCH_MAP_EN_TO_HI[trimmed] || trimmed;
  } else {
    return WATCH_MAP_HI_TO_EN[trimmed] || trimmed;
  }
}

export function translateGenderDisplay(gender: string, targetLang: 'English' | 'Hindi'): string {
  const g = (gender || '').toLowerCase();
  if (targetLang === 'Hindi') {
    if (g === 'male' || g === 'पुरुष') return 'पुरुष';
    if (g === 'female' || g === 'महिला') return 'महिला';
    return 'अन्य';
  } else {
    if (g === 'male' || g === 'पुरुष') return 'Male';
    if (g === 'female' || g === 'महिला') return 'Female';
    return 'Other';
  }
}

export function translatePriorityLabel(priority: string | undefined, targetLang: 'English' | 'Hindi'): string {
  const p = priority || 'Secondary';
  if (targetLang === 'Hindi') {
    if (p === 'Primary') return 'मुख्य (प्राइमरी)';
    if (p === 'Secondary') return 'द्वितीयक (सेकेंडरी)';
    if (p === 'Tertiary') return 'तृतीयक';
    if (p === 'Quaternary') return 'चतुर्थक';
    return p;
  }
  return p;
}

/**
 * Translates all stored profile fields (including user's Name, Address, Conditions, Watch)
 * when switching between Hindi and English.
 */
export function localizeProfileData(profile: UserProfile, targetLang: 'English' | 'Hindi'): UserProfile {
  const normalizedGender: 'Male' | 'Female' | 'Other' =
    profile.gender === 'Male' || (profile.gender as string) === 'पुरुष'
      ? 'Male'
      : profile.gender === 'Female' || (profile.gender as string) === 'महिला'
      ? 'Female'
      : 'Other';

  const normalizedBloodGroup =
    profile.bloodGroup === 'Select Blood Group' || profile.bloodGroup === 'रक्त समूह चुनें'
      ? targetLang === 'Hindi'
        ? 'रक्त समूह चुनें'
        : 'Select Blood Group'
      : profile.bloodGroup;

  return {
    ...profile,
    language: targetLang,
    name: transliterateName(profile.name, targetLang),
    gender: normalizedGender,
    bloodGroup: normalizedBloodGroup,
    watchModel: translateWatchModel(profile.watchModel, targetLang),
    address: translateAddress(profile.address, targetLang),
    medicalConditions: (profile.medicalConditions || []).map(c => translateCondition(c, targetLang)),
  };
}

/**
 * Translates all emergency contacts (both Contact Name and Relationship)
 * when switching between Hindi and English.
 */
export function localizeContactsList(contacts: EmergencyContact[], targetLang: 'English' | 'Hindi'): EmergencyContact[] {
  return contacts.map(c => ({
    ...c,
    name: transliterateName(c.name, targetLang),
    relationship: translateRelationship(c.relationship, targetLang),
  }));
}
