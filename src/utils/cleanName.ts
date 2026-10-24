/**
 * Clean user name extraction utility
 * Strips conversational prefixes and suffixes in Hindi (Devanagari), Hinglish, and English:
 * - "mera naam rahul hai" -> "Rahul"
 * - "मेरा नाम रमेश शर्मा है।" -> "रमेश शर्मा"
 * - "उनका नाम कमला देवी जी है" -> "कमला देवी"
 * - "मेरे पिताजी का नाम राजेंद्र है" -> "राजेंद्र"
 * - "my name is John" / "his name is John" / "her name is Priya" -> "John" / "Priya"
 */
export function extractCleanName(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // 0. Strip leading/trailing punctuation including Devanagari danda (। and ॥)
  text = text.replace(/^[:=\-.,!?;#।॥\s]+|[:=\-.,!?;#।॥\s]+$/g, '').trim();

  // 1. Strip Romanized Hindi / Hinglish prefixes (case-insensitive)
  text = text.replace(
    /^(mera\s+poora\s+naam|mera\s+pura\s+naam|mera\s+(naam|nam|name)\s+(hai|h|he)?|mera\s+(naam|nam|name)|unka\s+(naam|nam|name)|unki\s+(naam|nam|name)|mere\s+\w+\s+ka\s+(naam|nam|name)|(naam|nam|name)\s+(hai|h|he)|mera\s+hai|mera)\s*[:=\-]?\s*/gi,
    ''
  );

  // Strip trailing Hinglish words repeatedly: "hai", "hain", "h", "he", "hu", "hoon", "ji"
  text = text.replace(/(\s+(hai|hain|h|he|hu|hoon|ji))+$/gi, '');

  // 2. Strip Devanagari Hindi prefixes (both self and relative phrases)
  text = text.replace(
    /^(मेरा\s*पूरा\s*नाम\s*है|मेरा\s*पूरा\s*नाम|मेरा\s*नाम\s*है|मेरा\s*नाम|उनका\s*पूरा\s*नाम|उनका\s*नाम\s*है|उनका\s*नाम|इनका\s*नाम|मेरे\s*पिताजी\s*का\s*नाम|मेरे\s*पिता\s*का\s*नाम|मेरी\s*माताजी\s*का\s*नाम|मेरी\s*माता\s*का\s*नाम|मेरी\s*माँ\s*का\s*नाम|परिजन\s*का\s*नाम|उपयोगकर्ता\s*का\s*नाम|नाम\s*है|मैं\s*हूँ|मैं\s*हु|मेरा|उनका|नाम)\s*[:=\-]?\s*/gi,
    ''
  );

  // Also strip if "का नाम" appears before the actual name (e.g., "दादाजी का नाम मोहन है")
  if (text.includes('का नाम')) {
    const parts = text.split('का नाम');
    const afterKaNaam = parts[parts.length - 1].trim();
    if (afterKaNaam) {
      text = afterKaNaam;
    }
  }

  // Strip trailing Devanagari words repeatedly: "है", "हैं", "हूँ", "हु", "जी", "था"
  text = text.replace(/(\s+(है|हैं|हूँ|हु|जी|था|थी))+$/gi, '');

  // 3. Strip English conversational prefixes (both self and relative)
  text = text.replace(
    /^(my\s+full\s+name\s+is|my\s*name\s*is|my\s*name's|my\s*name|his\s+full\s+name\s+is|his\s+name\s+is|her\s+full\s+name\s+is|her\s+name\s+is|their\s+full\s+name\s+is|their\s+name\s+is|the\s+user's\s+name\s+is|relative's\s+name\s+is|i\s*am|im\s|he\s+is|she\s+is|this\s*is|call\s*me|myself)\s*[:=\-]?\s*/gi,
    ''
  );

  // Strip trailing English filler
  text = text.replace(/(\s+(please|here|sir|madam|ji))+$/gi, '');

  // 4. Final cleanup of leftover punctuation and Devanagari danda
  text = text.replace(/^[:=\-.,!?;#।॥\s]+|[:=\-.,!?;#।॥\s]+$/g, '').trim();

  // 5. If pure Latin characters, format as clean Title Case
  if (/^[a-zA-Z\s]+$/.test(text)) {
    text = text
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return text || rawText.replace(/[।॥.,!?;:]+$/g, '').trim();
}
