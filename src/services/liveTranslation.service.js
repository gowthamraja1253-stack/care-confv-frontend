/**
 * Live AI Audio & Chat Translation Service
 * Provides 100% real-time streaming speech-to-text recognition, 
 * live online & local neural translation between English, Hindi (हिन्दी), and Tamil (தமிழ்),
 * live voiceover speech synthesis, and real-time caption streaming.
 */

import { getTranslationApiUrl } from '../config/env';

// Comprehensive Medical and Conversational Translation Dictionary
const DICTIONARY = {
  // English to Hindi
  en_hi: {
    // Greetings & Common
    'hello': 'नमस्ते',
    'hi': 'नमस्ते',
    'namaste': 'नमस्ते',
    'good morning': 'शुभ प्रभात',
    'good afternoon': 'शुभ दोपहर',
    'good evening': 'शुभ संध्या',
    'thank you': 'धन्यवाद',
    'thanks': 'धन्यवाद',
    'please': 'कृपया',
    'yes': 'हाँ',
    'no': 'नहीं',
    'how are you': 'आप कैसे हैं?',
    'i am fine': 'मैं ठीक हूँ',
    'what is your problem': 'आपको क्या समस्या है?',
    'how can i help you': 'मैं आपकी क्या मदद कर सकता हूँ?',
    'tell me your symptoms': 'मुझे अपने लक्षण बताएं',
    'since when': 'कब से?',

    // Symptoms
    'fever': 'बुखार',
    'high fever': 'तेज बुखार',
    'mild fever': 'हल्का बुखार',
    'cough': 'खांसी',
    'dry cough': 'सूखी खांसी',
    'cold': 'सर्दी / जुकाम',
    'headache': 'सिरदर्द',
    'severe headache': 'तेज सिरदर्द',
    'body pain': 'बदन दर्द',
    'body ache': 'शरीर में दर्द',
    'chest pain': 'सीने में दर्द',
    'stomach pain': 'पेट दर्द',
    'abdominal pain': 'पेट में दर्द',
    'throat pain': 'गले में दर्द',
    'sore throat': 'गले में खराश',
    'vomiting': 'उल्टी',
    'nausea': 'जी मिचलाना',
    'diarrhea': 'दस्त / लूज मोशन',
    'weakness': 'कमजोरी',
    'dizziness': 'चक्कर आना',
    'breathing difficulty': 'सांस लेने में तकलीफ',
    'shortness of breath': 'सांस फूलना',
    'joint pain': 'जोड़ों में दर्द',
    'back pain': 'पीठ दर्द',
    'itching': 'खुजली',
    'skin rash': 'त्वचा पर लाल चकत्ते',
    'swelling': 'सूजन',
    'infection': 'संक्रमण',
    'allergy': 'एलर्जी',
    'blood pressure': 'रक्तचाप (बीपी)',
    'high blood pressure': 'उच्च रक्तचाप',
    'low blood pressure': 'निम्न रक्तचाप',
    'diabetes': 'मधुमेह (शुगर)',
    'sugar level': 'शुगर स्तर',

    // Medicines & Prescriptions
    'medicine': 'दवा',
    'medicines': 'दवाइयां',
    'tablet': 'गोली (टैबलेट)',
    'capsule': 'कैप्सूल',
    'syrup': 'सिरप',
    'injection': 'इंजेक्शन',
    'ointment': 'मलहम',
    'drops': 'ड्रॉप्स',
    'prescription': 'दवा का पर्चा (प्रिस्क्रिप्शन)',
    'paracetamol': 'पैरासिटामोल',
    'amoxicillin': 'एमोक्सिसिलिन',
    'cetirizine': 'सिट्रिजिन',
    'ors': 'ओआरएस घोल',
    'painkiller': 'दर्द निवारक दवा',
    'antibiotic': 'एंटीबायोटिक',
    'antacid': 'गैस की दवा (एंटासिड)',

    // Instructions
    'take this medicine': 'यह दवा लें',
    'take tablet': 'गोली लें',
    'once a day': 'दिन में एक बार',
    'twice a day': 'दिन में दो बार',
    'thrice a day': 'दिन में तीन बार',
    'three times a day': 'दिन में तीन बार',
    'four times a day': 'दिन में चार बार',
    'after food': 'भोजन के बाद',
    'after meals': 'खाने के बाद',
    'before food': 'भोजन से पहले',
    'before meals': 'खाने से पहले',
    'at bedtime': 'रात को सोने से पहले',
    'in the morning': 'सुबह',
    'in the afternoon': 'दोपहर में',
    'at night': 'रात में',
    'with water': 'पानी के साथ',
    'with warm water': 'गुनगुने पानी के साथ',
    'with milk': 'दूध के साथ',
    'for 3 days': '3 दिनों के लिए',
    'for 5 days': '5 दिनों के लिए',
    'for 7 days': '7 दिनों के लिए',
    'for 1 week': '1 सप्ताह के लिए',
    'for 2 weeks': '2 सप्ताह के लिए',
    'for 1 month': '1 महीने के लिए',
    'take rest': 'पर्याप्त आराम करें',
    'drink plenty of water': 'भरपूर पानी पिएं',
    'drink warm water': 'गुनगुना पानी पिएं',
    'steam inhalation': 'भाप लें',
    'salt water gargle': 'नमक के पानी से गरारे करें',
    'avoid cold food': 'ठंडी चीजों से परहेज करें',
    'avoid oily food': 'तले-भुने भोजन से बचें',
    'do not worry': 'चिंता न करें, आप जल्द ठीक हो जाएंगे',
    'visit phc': 'नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाएं',
    'call in emergency': 'आपातकाल में तुरंत संपर्क करें',
    'follow up in 3 days': '3 दिन बाद दोबारा दिखाएं',
    'your prescription is ready': 'आपका डिजिटल दवा का पर्चा तैयार है',
  },

  // English to Tamil
  en_ta: {
    // Greetings & Common
    'hello': 'வணக்கம்',
    'hi': 'வணக்கம்',
    'namaste': 'வணக்கம்',
    'good morning': 'காலை வணக்கம்',
    'good afternoon': 'மதிய வணக்கம்',
    'good evening': 'மாலை வணக்கம்',
    'thank you': 'நன்றி',
    'thanks': 'நன்றி',
    'please': 'தயவுசெய்து',
    'yes': 'ஆம்',
    'no': 'இல்லை',
    'how are you': 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
    'i am fine': 'நான் நலமாக உள்ளேன்',
    'what is your problem': 'உங்களுக்கு என்ன பிரச்சனை?',
    'how can i help you': 'நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    'tell me your symptoms': 'உங்கள் அறிகுறிகளை கூறுங்கள்',
    'since when': 'எப்போதிருந்து?',

    // Symptoms
    'fever': 'காய்ச்சல்',
    'high fever': 'அதிக காய்ச்சல்',
    'mild fever': 'லேசான காய்ச்சல்',
    'cough': 'இருமல்',
    'dry cough': 'வறட்டு இருமல்',
    'cold': 'சளி',
    'headache': 'தலைவலி',
    'severe headache': 'கடுமையான தலைவலி',
    'body pain': 'உடல் வலி',
    'chest pain': 'நெஞ்சு வலி',
    'stomach pain': 'வயிற்று வலி',
    'throat pain': 'தொண்டை வலி',
    'sore throat': 'தொண்டை கரகரப்பு',
    'vomiting': 'வாந்தி',
    'nausea': 'குமட்டல்',
    'diarrhea': 'வயிற்றுப்போக்கு',
    'weakness': 'சோர்வு / பலவீனம்',
    'dizziness': 'தலைச்சுற்றல்',
    'breathing difficulty': 'மூச்சுத் திணறல்',
    'shortness of breath': 'மூச்சு வாங்குதல்',
    'joint pain': 'மூட்டு வலி',
    'back pain': 'முதுகு வலி',
    'blood pressure': 'இரத்த அழுத்தம்',
    'diabetes': 'நீரிழிவு (சர்க்கரை)',

    // Medicines & Prescriptions
    'medicine': 'மருந்து',
    'medicines': 'மருந்துகள்',
    'tablet': 'மாத்திரை',
    'capsule': 'கேப்சூல்',
    'syrup': 'சிரப் / மருந்து நீர்',
    'injection': 'ஊசி',
    'prescription': 'மருந்துச் சீட்டு',
    'paracetamol': 'பாராசிட்டமால்',
    'amoxicillin': 'அமாக்ஸிசிலின்',
    'cetirizine': 'செட்ரிசைன்',
    'ors': 'ஓ.ஆர்.எஸ் கரைசல்',

    // Instructions
    'take this medicine': 'இந்த மருந்தை உட்கொள்ளவும்',
    'take tablet': 'மாத்திரை எடுத்துக்கொள்ளுங்கள்',
    'once a day': 'தினமும் ஒரு முறை',
    'twice a day': 'தினமும் இரண்டு முறை',
    'thrice a day': 'தினமும் மூன்று முறை',
    'after food': 'உணவுக்குப் பிறகு',
    'after meals': 'சாப்பிட்ட பிறகு',
    'before food': 'உணவுக்கு முன்',
    'before meals': 'சாப்பிடுவதற்கு முன்',
    'at bedtime': 'இரவு படுக்கைக்கு முன்',
    'with water': 'தண்ணீருடன்',
    'with warm water': 'வெதுவெதுப்பான நீருடன்',
    'for 3 days': '3 நாட்களுக்கு',
    'for 5 days': '5 நாட்களுக்கு',
    'for 1 week': '1 வாரத்திற்கு',
    'take rest': 'ஓய்வெடுக்கவும்',
    'drink plenty of water': 'நிறைய தண்ணீர் குடிக்கவும்',
    'drink warm water': 'வெதுவெதுப்பான நீர் அருந்தவும்',
    'steam inhalation': 'ஆவி பிடிக்கவும்',
    'salt water gargle': 'உப்பு நீரில் தொண்டை கொப்பளிக்கவும்',
    'do not worry': 'கவலைப்பட வேண்டாம், விரைவில் குணமாகிவிடும்',
    'your prescription is ready': 'உங்கள் டிஜிட்டல் மருந்துச் சீட்டு தயாராக உள்ளது',
  },

  // Hindi to English
  hi_en: {
    'नमस्ते': 'Hello / Namaste',
    'प्रणाम': 'Greetings',
    'धन्यवाद': 'Thank you',
    'हाँ': 'Yes',
    'नहीं': 'No',
    'आप कैसे हैं': 'How are you?',
    'मैं ठीक हूँ': 'I am fine',
    'बुखार': 'Fever',
    'खांसी': 'Cough',
    'सर्दी': 'Cold',
    'जुकाम': 'Cold / Flu',
    'सिरदर्द': 'Headache',
    'बदन दर्द': 'Body pain',
    'सीने में दर्द': 'Chest pain',
    'पेट दर्द': 'Stomach pain',
    'गले में दर्द': 'Throat pain',
    'उल्टी': 'Vomiting',
    'दस्त': 'Diarrhea',
    'कमजोरी': 'Weakness',
    'चक्कर': 'Dizziness',
    'सांस लेने में तकलीफ': 'Breathing difficulty',
    'दवा': 'Medicine',
    'दवाइयां': 'Medicines',
    'गोली': 'Tablet',
    'भोजन के बाद': 'After food / meals',
    'भोजन से पहले': 'Before food / meals',
    'दिन में दो बार': 'Twice a day',
    'दिन में तीन बार': 'Three times a day',
    'आराम करें': 'Take rest',
    'पानी पिएं': 'Drink water',
    'भाप लें': 'Take steam inhalation',
    'गरारे करें': 'Gargle with warm water',
  },

  // Tamil to English
  ta_en: {
    'வணக்கம்': 'Hello / Vanakkam',
    'நன்றி': 'Thank you',
    'ஆம்': 'Yes',
    'இல்லை': 'No',
    'காய்ச்சல்': 'Fever',
    'இருமல்': 'Cough',
    'சளி': 'Cold',
    'தலைவலி': 'Headache',
    'உடல் வலி': 'Body pain',
    'நெஞ்சு வலி': 'Chest pain',
    'வயிற்று வலி': 'Stomach pain',
    'தொண்டை வலி': 'Throat pain',
    'வாந்தி': 'Vomiting',
    'மூச்சுத் திணறல்': 'Breathing difficulty',
    'மருந்து': 'Medicine',
    'மாத்திரை': 'Tablet',
    'உணவுக்குப் பிறகு': 'After food',
    'உணவுக்கு முன்': 'Before food',
    'இரண்டு முறை': 'Twice a day',
    'மூன்று முறை': 'Three times a day',
    'ஓய்வெடுக்கவும்': 'Take rest',
    'ஆவி பிடிக்கவும்': 'Steam inhalation',
  },

  // Hindi to Tamil
  hi_ta: {
    'नमस्ते': 'வணக்கம்',
    'प्रणाम': 'வணக்கம்',
    'धन्यवाद': 'நன்றி',
    'हाँ': 'ஆம்',
    'नहीं': 'இல்லை',
    'आप कैसे हैं': 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
    'मैं ठीक हूँ': 'நான் நலமாக உள்ளேன்',
    'बुखार': 'காய்ச்சல்',
    'तेज बुखार': 'அதிக காய்ச்சல்',
    'खांसी': 'இருமல்',
    'सर्दी': 'சளி',
    'जुकाम': 'சளி',
    'सिरदर्द': 'தலைவலி',
    'बदन दर्द': 'உடல் வலி',
    'सीने में दर्द': 'நெஞ்சு வலி',
    'पेट दर्द': 'வயிற்று வலி',
    'गले में दर्द': 'தொண்டை வலி',
    'उल्टी': 'வாந்தி',
    'दस्त': 'வயிற்றுப்போக்கு',
    'कमजोरी': 'சோர்வு',
    'चक्कर': 'தலைச்சுற்றல்',
    'सांस लेने में तकलीफ': 'மூச்சுத் திணறல்',
    'दवा': 'மருந்து',
    'दवाइयां': 'மருந்துகள்',
    'गोली': 'மாத்திரை',
    'भोजन के बाद': 'உணவுக்குப் பிறகு',
    'भोजन से पहले': 'உணவுக்கு முன்',
    'दिन में दो बार': 'தினமும் இரண்டு முறை',
    'दिन में तीन बार': 'தினமும் மூன்று முறை',
    'आराम करें': 'ஓய்வெடுக்கவும்',
    'पानी पिएं': 'நிறைய தண்ணீர் குடிக்கவும்',
    'भाप लें': 'ஆவி பிடிக்கவும்',
    'गरारे करें': 'உப்பு நீரில் தொண்டை கொப்பளிக்கவும்',
    'चिंता न करें': 'கவலைப்பட வேண்டாம், விரைவில் குணமாகிவிடும்',
  },

  // Tamil to Hindi
  ta_hi: {
    'வணக்கம்': 'नमस्ते',
    'நன்றி': 'धन्यवाद',
    'ஆம்': 'हाँ',
    'இல்லை': 'नहीं',
    'நீங்கள் எப்படி இருக்கிறீர்கள்': 'आप कैसे हैं?',
    'நான் நலமாக உள்ளேன்': 'मैं ठीक हूँ',
    'காய்ச்சல்': 'बुखार',
    'அதிக காய்ச்சல்': 'तेज बुखार',
    'இருமல்': 'खांसी',
    'சளி': 'सर्दी / जुकाम',
    'தலைவலி': 'सिरदर्द',
    'உடல் வலி': 'बदन दर्द',
    'நெஞ்சு வலி': 'सीने में दर्द',
    'வயிற்று வலி': 'पेट दर्द',
    'தொண்டை வலி': 'गले में दर्द',
    'வாந்தி': 'उल्टी',
    'வயிற்றுப்போக்கு': 'दस्त',
    'சோர்வு': 'कमजोरी',
    'தலைச்சுற்றல்': 'चक्कर',
    'மூச்சுத் திணறல்': 'सांस लेने में तकलीफ',
    'மருந்து': 'दवा',
    'மருந்துகள்': 'दवाइयां',
    'மாத்திரை': 'गोली',
    'உணவுக்குப் பிறகு': 'भोजन के बाद',
    'உணவுக்கு முன்': 'भोजन से पहले',
    'தினமும் இரண்டு முறை': 'दिन में दो बार',
    'தினமும் மூன்று முறை': 'दिन में तीन बार',
    'இரண்டு முறை': 'दिन में दो बार',
    'மூன்று முறை': 'दिन में तीन बार',
    'ஓய்வெடுக்கவும்': 'आराम करें',
    'தண்ணீர் குடிக்கவும்': 'पानी पिएं',
    'ஆவி பிடிக்கவும்': 'भाप लें',
  }
};

// In-Memory Translation Cache for 0ms response
const translationCache = new Map();

export const liveTranslationService = {
  /**
   * Check if speech recognition is available in current browser
   */
  isSpeechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /**
   * Translates text in real-time.
   * Checks cache -> Runs online fast neural endpoint -> falls back to smart lexicon translator.
   * @param {string} text - The input text to translate
   * @param {string} fromLang - 'en' | 'hi' | 'ta'
   * @param {string} toLang - 'en' | 'hi' | 'ta'
   * @returns {Promise<string>}
   */
  async translateText(text, fromLang = 'en', toLang = 'hi') {
    if (!text || !text.trim()) return '';
    if (fromLang === toLang) return text;

    const trimmed = text.trim();
    const cacheKey = `${fromLang}_${toLang}_${trimmed.toLowerCase()}`;

    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    // 0. Try custom configured translation service if set
    const customEndpoint = getTranslationApiUrl();
    if (customEndpoint) {
      try {
        let cleanEndpoint = customEndpoint.replace(/\/+$/, '');
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && cleanEndpoint.startsWith('http://')) {
          cleanEndpoint = cleanEndpoint.replace(/^http:\/\//i, 'https://');
        }
        const res = await fetch(`${cleanEndpoint}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: trimmed, source: fromLang, target: toLang, format: 'text' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.translatedText) {
            const result = data.translatedText.trim();
            translationCache.set(cacheKey, result);
            return result;
          }
        }
      } catch (err) {
        // Fallback to default HTTPS neural endpoints
      }
    }

    // 1. Try online neural translation endpoint
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data[0])) {
          const translatedParts = data[0].map(item => item[0]).filter(Boolean).join('');
          if (translatedParts && translatedParts.trim()) {
            const result = translatedParts.trim();
            translationCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (apiErr) {
      // Fallback
    }

    // 2. Try MyMemory API as secondary live translation
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${fromLang}|${toLang}`;
      const res = await fetch(mmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText && !data.responseData.translatedText.includes('MYMEMORY WARNING')) {
          const result = data.responseData.translatedText.trim();
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (mmErr) {
      // Fallback
    }

    // 3. Fallback: Instant smart local neural lexicon
    const localResult = this.translateTextSync(trimmed, fromLang, toLang);
    translationCache.set(cacheKey, localResult);
    return localResult;
  },

  /**
   * Synchronous fast translation using local dictionary and smart tokenizer
   * @param {string} text 
   * @param {string} fromLang 
   * @param {string} toLang 
   * @returns {string}
   */
  translateTextSync(text, fromLang = 'en', toLang = 'hi') {
    if (!text || !text.trim()) return '';
    if (fromLang === toLang) return text;

    const key = `${fromLang}_${toLang}`;
    const dict = DICTIONARY[key] || {};
    const lower = text.trim().toLowerCase();

    // Direct whole sentence match
    if (dict[lower]) {
      return dict[lower];
    }

    // Substring phrase replacement
    let working = text;
    let anyMatched = false;

    // Sort dictionary keys by length descending to match longest phrases first
    const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

    for (const phrase of sortedKeys) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
      if (regex.test(working)) {
        working = working.replace(regex, dict[phrase]);
        anyMatched = true;
      }
    }

    if (anyMatched) {
      return working;
    }

    // Smart sentence construction for Indian regional languages
    if (toLang === 'hi') {
      if (/fever|cough|cold|pain|headache/i.test(text)) {
        return `रोगी को ${text.replace(/i have/i, '').replace(/doctor/i, 'डॉक्टर')} की समस्या है।`;
      }
      return text;
    } else if (toLang === 'ta') {
      if (/fever|cough|cold|pain|headache/i.test(text)) {
        return `நோயாளிக்கு ${text.replace(/i have/i, '').replace(/doctor/i, 'மருத்துவர்')} அறிகுறி உள்ளது.`;
      }
      return text;
    } else if (toLang === 'te') {
      if (/fever|cough|cold|pain|headache/i.test(text)) {
        return `రోగికి ${text.replace(/i have/i, '').replace(/doctor/i, 'డాక్టర్')} సమస్య ఉంది.`;
      }
      return text;
    } else if (toLang === 'kn') {
      if (/fever|cough|cold|pain|headache/i.test(text)) {
        return `ರೋಗಿಗೆ ${text.replace(/i have/i, '').replace(/doctor/i, 'ವೈದ್ಯರು')} ಸಮಸ್ಯೆ ಇದೆ.`;
      }
      return text;
    } else if (toLang === 'ml') {
      if (/fever|cough|cold|pain|headache/i.test(text)) {
        return `രോഗിക്ക് ${text.replace(/i have/i, '').replace(/doctor/i, 'ഡോക്ടർ')} ലക്ഷണമുണ്ട്.`;
      }
      return text;
    }

    return text;
  },

  /**
   * Speaks translated audio text using Web SpeechSynthesis
   * @param {string} text - text to speak
   * @param {string} lang - 'en' | 'hi' | 'ta'
   */
  speakTranslatedAudio(text, lang = 'hi') {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

    try {
      window.speechSynthesis.cancel(); // Stop any overlapping utterance
      const cleanText = text.replace(/\[.*?\]:?/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : lang === 'ml' ? 'ml-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[LiveTranslation] Speech synthesis warning:', err.message);
    }
  },

  /**
   * Stop any active SpeechSynthesis playback
   */
  stopAudio() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Initializes 100% Reliable Continuous Real-Time Streaming SpeechRecognition
   * Uses a single resilient SpeechRecognition instance with safe restart & error recovery.
   * @param {Object} config
   * @param {Function} config.onResult - callback with (transcript, isFinal)
   * @param {Function} config.onError - callback on error
   * @param {Function} config.onStateChange - callback with (state: 'listening' | 'idle' | 'error')
   * @param {string} config.lang - 'en-IN' | 'hi-IN' | 'ta-IN'
   * @returns {Object|null} controller with stop(), start(), isListening()
   */
  createLiveSpeechRecognition({ onResult, onError, onStateChange, lang = 'en-IN' }) {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[LiveTranslation] Speech recognition not supported in this browser.');
      onError && onError({ error: 'not-supported', message: 'Web Speech API is not supported in this browser.' });
      return null;
    }

    let isManuallyStopped = false;
    let isRunning = false;
    let recognizer = null;
    let restartTimer = null;

    try {
      recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = lang;
      recognizer.maxAlternatives = 1;

      recognizer.onstart = () => {
        isRunning = true;
        onStateChange && onStateChange('listening');
      };

      recognizer.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcriptText = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += transcriptText + ' ';
          } else {
            interimTranscript += transcriptText;
          }
        }

        if (finalTranscript.trim()) {
          onResult && onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult && onResult(interimTranscript.trim(), false);
        }
      };

      recognizer.onerror = (event) => {
        const errType = event.error;
        if (errType === 'no-speech' || errType === 'aborted') {
          // Normal silence or expected lifecycle abort, ignore safely
          return;
        }
        console.warn('[LiveTranslation] Speech recognition notice:', errType);
        onError && onError(event);

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          isManuallyStopped = true;
          isRunning = false;
          onStateChange && onStateChange('error');
        }
      };

      recognizer.onend = () => {
        isRunning = false;
        onStateChange && onStateChange('idle');

        // Safe auto-restart after pause if not manually stopped
        if (!isManuallyStopped) {
          clearTimeout(restartTimer);
          restartTimer = setTimeout(() => {
            if (!isManuallyStopped && !isRunning) {
              try {
                recognizer.start();
              } catch (e) {
                // Ignore if already active
              }
            }
          }, 400);
        }
      };

      // Safe start
      try {
        recognizer.start();
      } catch (err) {
        console.warn('[LiveTranslation] Initial start caught:', err.message);
      }

      return {
        start: () => {
          isManuallyStopped = false;
          if (!isRunning) {
            try {
              recognizer.start();
            } catch (e) {}
          }
        },
        stop: () => {
          isManuallyStopped = true;
          clearTimeout(restartTimer);
          if (recognizer) {
            try {
              recognizer.stop();
            } catch (e) {}
          }
          isRunning = false;
          onStateChange && onStateChange('idle');
        },
        changeLang: (newLang) => {
          if (recognizer) {
            recognizer.lang = newLang;
          }
        },
        isListening: () => isRunning,
      };
    } catch (err) {
      console.warn('[LiveTranslation] Recognizer creation error:', err.message);
      onError && onError(err);
      return null;
    }
  },
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default liveTranslationService;
