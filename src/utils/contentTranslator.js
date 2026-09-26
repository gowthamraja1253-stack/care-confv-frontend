/**
 * Dynamic Content Translation Utility
 * Translates clinical notes, diagnoses, tags, advice, doctor remarks, and common medical terms
 * across English, Hindi, Tamil, Telugu, and Kannada.
 */

const DICTIONARY = {
  hi: {
    // Section Headers
    'Clinical Assessment:': 'क्लिनिकल मूल्यांकन:',
    'Diagnosis:': 'निदान:',
    'Advice:': 'डॉक्टर की सलाह:',
    'Doctor Remarks:': 'डॉक्टर की टिप्पणी:',
    'Doctor Remarks': 'डॉक्टर की टिप्पणी',
    'Prescribed Regimen:': 'निर्धारित दवाएं व खुराक:',
    'Chief Complaints:': 'मुख्य समस्याएं:',
    'Doctor Assessment & Notes:': 'डॉक्टर का मूल्यांकन एवं नोट्स:',

    // Common Diagnoses & Phrases
    'Patient presented with 4-day history of clear rhinorrhea, sneezing paroxysms, and nocturnal dry cough.':
      'मरीज़ 4 दिनों से बहती नाक, लगातार छींकें और रात में सूखी खांसी की समस्या से ग्रसित है।',
    'Allergic Rhinitis with secondary mild pharyngeal irritation.':
      'एलर्जिक राइनाइटिस (एलर्जी के कारण सर्दी) और गले में हल्की जलन।',
    '- Avoid exposure to early morning damp air & crop residue smoke':
      '- सुबह की ठंडी नमी वाली हवा और धुएं के संपर्क से बचें',
    '- Continue warm saline gargles':
      '- गुनगुने नमक के पानी से गरारे जारी रखें',
    '- Prescribed Levocetirizine and Vitamin C supplements.':
      '- लीवोसेटिरिज़िन और विटामिन सी की दवाएं निर्धारित की गईं।',
    'Follow-up via audio call if cough persists beyond 5 days.':
      'यदि 5 दिनों के बाद भी खांसी बनी रहे तो ऑडियो कॉल पर दोबारा परामर्श लें।',

    'Patient diagnosed with mild Stage-1 Essential Hypertension in Jan 2024. Advised low sodium diet and regular blood pressure monitoring. Known seasonal allergen: Paddy dust & pollen.':
      'मरीज़ को जनवरी 2024 में हल्के स्टेज-1 उच्च रक्तचाप (हाइपरटेंशन) का निदान किया गया था। कम नमक वाले आहार और नियमित बीपी जांच की सलाह दी गई है। ज्ञात मौसमी एलर्जी: धान की धूल और परागकण।',
    'Next BP checkup recommended in 3 months. Maintain daily step count > 6000.':
      '3 महीने में अगले बीपी चेकअप की सिफारिश की गई है। प्रतिदिन 6000 से अधिक कदम चलें।',
    'Hypertension & Seasonal Allergy History': 'उच्च रक्तचाप और मौसमी एलर्जी का इतिहास',

    'Rx:\n1. Tab Paracetamol 500mg - 1 tablet three times daily after food x 3 days\n2. Tab Cetirizine 10mg - 1 tablet at bedtime x 3 days\n3. ORS sachet - 1 packet dissolved in 1L clean drinking water throughout the day\n4. Steam inhalation twice daily.':
      'नुस्खा (Rx):\n1. पैरासिटामोल 500mg - 1 गोली दिन में तीन बार भोजन के बाद (3 दिन)\n2. सेटिरिज़िन 10mg - 1 गोली रात को सोते समय (3 दिन)\n3. ओआरएस (ORS) - 1 पैकेट 1 लीटर साफ पानी में घोलकर दिन भर पिएं\n4. दिन में दो बार भाप लें।',
    'e-Prescription: Acute Viral Flu Treatment': 'ई-नुस्खा: तीव्र वायरल फ्लू का उपचार',
    'Pharmacy verified at Rampur Village Sub-Centre.': 'रामपुर गांव उप-केंद्र पर फार्मेसी द्वारा सत्यापित।',

    'Complete Blood Count (CBC) & HbA1c Lab Report': 'संपूर्ण रक्त गणना (CBC) और HbA1c लैब रिपोर्ट',
    'Haemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 6,800 /uL (Normal: 4,000 - 11,000)\nPlatelets: 220,000 /uL (Normal: 150,000 - 450,000)\nFasting Blood Glucose: 98 mg/dL (Normal < 100)\nHbA1c: 5.6% (Normal < 5.7% - Non-Diabetic)':
      'हीमोग्लोबिन: 13.8 g/dL (सामान्य: 13.0 - 17.0)\nश्वेत रक्त कोशिकाएं (WBC): 6,800 /uL (सामान्य: 4,000 - 11,000)\nप्लेटलेट्स: 220,000 /uL (सामान्य: 150,000 - 450,000)\nफास्टिंग ब्लड शुगर: 98 mg/dL (सामान्य < 100)\nHbA1c: 5.6% (सामान्य < 5.7% - गैर-मधुमेह)',
    'All hematological indices within normal clinical ranges.': 'सभी रक्त पैरामीटर सामान्य क्लिनिकल सीमा के भीतर हैं।',

    'Consultation Note: Pediatric & Allergic Rhinitis Review': 'परामर्श नोट: बाल रोग और एलर्जिक राइनाइटिस समीक्षा',

    // Specializations
    'General Physician': 'सामान्य चिकित्सक (General Physician)',
    'Pediatrician': 'बाल रोग विशेषज्ञ (Pediatrician)',
    'Cardiologist': 'हृदय रोग विशेषज्ञ (Cardiologist)',
    'Gynecologist': 'स्त्री रोग विशेषज्ञ (Gynecologist)',
    'Dermatologist': 'त्वचा रोग विशेषज्ञ (Dermatologist)',
    'ENT Specialist': 'कान, नाक और गला विशेषज्ञ (ENT)',
    'Orthopedic': 'हड्डी रोग विशेषज्ञ (Orthopedic)',

    // Prescription & Reminder Instructions
    '1 tablet after dinner': 'रात के भोजन के बाद 1 गोली',
    '1 tablet after breakfast': 'सुबह के नाश्ते के बाद 1 गोली',
    '1 tablet before food': 'भोजन से पहले 1 गोली',
    '1 tablet after lunch': 'दोपहर के भोजन के बाद 1 गोली',
    'Take with warm water': 'गुनगुने पानी के साथ लें',
    '3 days remaining - Refill needed soon': '3 दिन की दवा बची है - जल्द रिफिल कराएं',
    'Today': 'आज',
    'Tomorrow': 'कल',
    'Morning': 'सुबह',
    'Afternoon': 'दोपहर',
    'Evening': 'शाम',

    // Tags
    'Teleconsultation': 'टेली-परामर्श',
    'Pediatrics': 'बाल रोग',
    'Allergy': 'एलर्जी',
    'Allergies': 'एलर्जी',
    'Fever': 'बुखार',
    'Prescription': 'दवा का पर्चा',
    'Chronic Care': 'दीर्घकालिक देखभाल',
    'Cardiology': 'हृदय रोग',
    'Blood Test': 'रक्त परीक्षण',
    'CBC': 'सीबीसी (रक्त जांच)',
    'PHC Diagnostics': 'पीएचसी डायग्नोस्टिक्स',
    'Routine': 'नियमित जांच',
  },

  ta: {
    // Specializations
    'General Physician': 'பொது மருத்துவர் (General Physician)',
    'Pediatrician': 'குழந்தைகள் நல மருத்துவர் (Pediatrician)',
    'Cardiologist': 'இதய நோய் நிபுணர் (Cardiologist)',
    'Gynecologist': 'மகப்பேறு மருத்துவர் (Gynecologist)',
    'Dermatologist': 'தோல் நோய் நிபுணர் (Dermatologist)',
    'ENT Specialist': 'காது, மூக்கு, தொண்டை நிபுணர் (ENT)',
    'Orthopedic': 'எலும்பு முறிவு நிபுணர் (Orthopedic)',

    // Prescription & Reminder Instructions
    '1 tablet after dinner': 'இரவு உணவுக்குப் பின் 1 மாத்திரை',
    '1 tablet after breakfast': 'காலை உணவுக்குப் பின் 1 மாத்திரை',
    '1 tablet before food': 'உணவுக்கு முன் 1 மாத்திரை',
    '1 tablet after lunch': 'மதிய உணவுக்குப் பின் 1 மாத்திரை',
    'Take with warm water': 'வெதுவெதுப்பான நீரில் உட்கொள்ளவும்',
    '3 days remaining - Refill needed soon': '3 நாட்கள் மட்டுமே உள்ளன - விரைவில் மருந்து வாங்கவும்',
    'Today': 'இன்று',
    'Tomorrow': 'நாளை',
    'Morning': 'காலை',
    'Afternoon': 'மதியம்',
    'Evening': 'மாலை',

    // Section Headers
    'Clinical Assessment:': 'மருத்துவ மதிப்பீடு:',
    'Diagnosis:': 'நோய் கண்டறிதல்:',
    'Advice:': 'மருத்துவர் ஆலோசனை:',
    'Doctor Remarks:': 'மருத்துவர் குறிப்புகள்:',
    'Doctor Remarks': 'மருத்துவர் குறிப்புகள்',
    'Prescribed Regimen:': 'பரிந்துரைக்கப்பட்ட மருந்துகள்:',
    'Chief Complaints:': 'முக்கிய அறிகுறிகள்:',
    'Doctor Assessment & Notes:': 'மருத்துவர் மதிப்பீடு மற்றும் குறிப்புகள்:',

    // Common Diagnoses & Phrases
    'Patient presented with 4-day history of clear rhinorrhea, sneezing paroxysms, and nocturnal dry cough.':
      'நோயாளிக்கு 4 நாட்களாக மூக்கு ஒழுகுதல், தொடர் தும்மல் மற்றும் இரவு நேர உலர் இருமல் உள்ளது.',
    'Allergic Rhinitis with secondary mild pharyngeal irritation.':
      'ஒவ்வாமை நாசியழற்சி (Allergic Rhinitis) மற்றும் தொண்டை அரிப்பு.',
    '- Avoid exposure to early morning damp air & crop residue smoke':
      '- அதிகாலை குளிர்ந்த காற்று மற்றும் புகை படுவதை தவிர்க்கவும்',
    '- Continue warm saline gargles':
      '- வெதுவெதுப்பான உப்பு நீரில் வாய் கொப்பளிக்கவும்',
    '- Prescribed Levocetirizine and Vitamin C supplements.':
      '- லெவோசெடிரிசின் மற்றும் வைட்டமின் சி மருந்துகள் பரிந்துரைக்கப்பட்டன.',
    'Follow-up via audio call if cough persists beyond 5 days.':
      '5 நாட்களுக்கு பிறகும் இருமல் தொடர்ந்தால் தொலைபேசி வழி மறுஆலோசனை பெறவும்.',

    'Patient diagnosed with mild Stage-1 Essential Hypertension in Jan 2024. Advised low sodium diet and regular blood pressure monitoring. Known seasonal allergen: Paddy dust & pollen.':
      'ஜனவரி 2024 இல் நோயாளிக்கு லேசான நிலை-1 உயர் இரத்த அழுத்தம் கண்டறியப்பட்டது. குறைந்த உப்பு உணவு மற்றும் வழக்கமான இரத்த அழுத்த கண்காணிப்பு அறிவுறுத்தப்பட்டது.',
    'Next BP checkup recommended in 3 months. Maintain daily step count > 6000.':
      '3 மாதங்களில் அடுத்த பிபி பரிசோதனை பரிந்துரைக்கப்படுகிறது. தினமும் 6000 படிகளுக்கு மேல் நடக்கவும்.',
    'Hypertension & Seasonal Allergy History': 'உயர் இரத்த அழுத்தம் மற்றும் ஒவ்வாமை வரலாறு',

    'Rx:\n1. Tab Paracetamol 500mg - 1 tablet three times daily after food x 3 days\n2. Tab Cetirizine 10mg - 1 tablet at bedtime x 3 days\n3. ORS sachet - 1 packet dissolved in 1L clean drinking water throughout the day\n4. Steam inhalation twice daily.':
      'மருந்துச் சீட்டு (Rx):\n1. பாராசிட்டமால் 500mg - உணவுக்குப் பின் தினமும் 3 வேளை (3 நாட்கள்)\n2. செடிரிசின் 10mg - இரவு படுக்கும் முன் 1 மாத்திரை (3 நாட்கள்)\n3. ORS கரைசல் - 1 பாக்கெட் 1 லிட்டர் நீரில் கலந்து நாள் முழுவதும் குடிக்கவும்\n4. தினமும் இருமுறை ஆவி பிடிக்கவும்.',
    'e-Prescription: Acute Viral Flu Treatment': 'மின்-மருந்துச்சீட்டு: வைரஸ் காய்ச்சல் சிகிச்சை',
    'Pharmacy verified at Rampur Village Sub-Centre.': 'ராம்பூர் கிராம துணை சுகாதார மையத்தில் சரிபார்க்கப்பட்டது.',

    'Complete Blood Count (CBC) & HbA1c Lab Report': 'முழு இரத்த எண்ணிக்கை (CBC) மற்றும் HbA1c ஆய்வு அறிக்கை',
    'Haemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 6,800 /uL (Normal: 4,000 - 11,000)\nPlatelets: 220,000 /uL (Normal: 150,000 - 450,000)\nFasting Blood Glucose: 98 mg/dL (Normal < 100)\nHbA1c: 5.6% (Normal < 5.7% - Non-Diabetic)':
      'ஹீமோகுளோபின்: 13.8 g/dL (இயல்பு: 13.0 - 17.0)\nவெள்ளை இரத்த அணுக்கள் (WBC): 6,800 /uL (இயல்பு: 4,000 - 11,000)\nதட்டணுக்கள்: 220,000 /uL (இயல்பு: 150,000 - 450,000)\nவெறும் வயிற்று சர்க்கரை: 98 mg/dL (இயல்பு < 100)\nHbA1c: 5.6% (இயல்பு < 5.7% - சர்க்கரை நோய் இல்லை)',
    'All hematological indices within normal clinical ranges.': 'அனைத்து இரத்த அளவீடுகளும் இயல்பான வரம்பில் உள்ளன.',

    'Consultation Note: Pediatric & Allergic Rhinitis Review': 'ஆலோசனை குறிப்பு: குழந்தைகள் ஒவ்வாமை நாசியழற்சி மதிப்பாய்வு',

    // Tags
    'Teleconsultation': 'டெலி-கன்சல்டேஷன்',
    'Pediatrics': 'குழந்தைகள் நலம்',
    'Allergy': 'ஒவ்வாமை',
    'Allergies': 'ஒவ்வாமை',
    'Fever': 'காய்ச்சல்',
    'Prescription': 'மருந்துச் சீட்டு',
    'Chronic Care': 'நீண்டகால சிகிச்சை',
    'Cardiology': 'இதயவியல்',
    'Blood Test': 'இரத்தப் பரிசோதனை',
    'CBC': 'இரத்த எண்ணிக்கை (CBC)',
    'PHC Diagnostics': 'ஆரம்ப சுகாதார ஆய்வு',
    'Routine': 'வழக்கமான சோதனை',
  },

  te: {
    // Specializations
    'General Physician': 'సాధారణ వైద్యుడు (General Physician)',
    'Pediatrician': 'పిల్లల వైద్య నిపుణుడు (Pediatrician)',
    'Cardiologist': 'గుండె నిపుణుడు (Cardiologist)',
    'Gynecologist': 'స్త్రీల వైద్య నిపుణురాలు (Gynecologist)',
    'Dermatologist': 'చర్మ వ్యాధి నిపుణుడు (Dermatologist)',
    'ENT Specialist': 'చెవి, ముక్కు, గొంతు నిపుణుడు (ENT)',
    'Orthopedic': 'ఎముకల నిపుణుడు (Orthopedic)',

    // Prescription & Reminder Instructions
    '1 tablet after dinner': 'రాత్రి భోజనం తర్వాత 1 మాత్ర',
    '1 tablet after breakfast': 'ఉదయం అల్పాహారం తర్వాత 1 మాత్ర',
    '1 tablet before food': 'భోజనానికి ముందు 1 మాత్ర',
    '1 tablet after lunch': 'మధ్యాహ్న భోజనం తర్వాత 1 మాత్ర',
    'Take with warm water': 'గోరువెచ్చని నీటితో తీసుకోండి',
    '3 days remaining - Refill needed soon': '3 రోజులు మాత్రమే మిగిలి ఉన్నాయి - వెంటనే రీఫిల్ చేసుకోండి',
    'Today': 'ఈరోజు',
    'Tomorrow': 'రేపు',
    'Morning': 'ఉదయం',
    'Afternoon': 'మధ్యాహ్నం',
    'Evening': 'సాయంత్రం',
    // Section Headers
    'Clinical Assessment:': 'క్లినికల్ అసెస్‌మెంట్:',
    'Diagnosis:': 'వ్యాధి నిర్ధారణ:',
    'Advice:': 'వైద్యుని సలహా:',
    'Doctor Remarks:': 'వైద్యుని వ్యాఖ్యలు:',
    'Doctor Remarks': 'వైద్యుని వ్యాఖ్యలు',
    'Prescribed Regimen:': 'సూచించిన మందులు & మోతాదు:',
    'Chief Complaints:': 'ప్రధాన సమస్యలు:',
    'Doctor Assessment & Notes:': 'వైద్యుని విశ్లేషణ మరియు నోట్స్:',

    // Common Diagnoses & Phrases
    'Patient presented with 4-day history of clear rhinorrhea, sneezing paroxysms, and nocturnal dry cough.':
      'రోగి 4 రోజులుగా ముక్కు కారడం, వరుస తుమ్ములు మరియు రాత్రిపూట పొడి దగ్గుతో బాధపడుతున్నారు.',
    'Allergic Rhinitis with secondary mild pharyngeal irritation.':
      'అలర్జిక్ రైనైటిస్ (అలర్జీ జలుబు) మరియు గొంతులో మంట.',
    '- Avoid exposure to early morning damp air & crop residue smoke':
      '- ఉదయం చల్లని గాలి మరియు పొగకు దూరంగా ఉండండి',
    '- Continue warm saline gargles':
      '- గోరువెచ్చని ఉప్పు నీటితో పుక్కిలించండి',
    '- Prescribed Levocetirizine and Vitamin C supplements.':
      '- లెవోసెటిరిజైన్ మరియు విటమిన్ సి మందులు సూచించబడ్డాయి.',
    'Follow-up via audio call if cough persists beyond 5 days.':
      '5 రోజుల తర్వాత కూడా దగ్గు తగ్గకపోతే ఆడియో కాల్ ద్వారా సంప్రదించండి.',

    'Patient diagnosed with mild Stage-1 Essential Hypertension in Jan 2024. Advised low sodium diet and regular blood pressure monitoring. Known seasonal allergen: Paddy dust & pollen.':
      'జనవరి 2024 లో రోగికి తేలికపాటి స్టేజ్-1 రక్తపోటు నిర్ధారించబడింది. తక్కువ ఉప్పు ఆహారం మరియు రెగ్యులర్ బీపీ చెకప్ సూచించబడింది.',
    'Next BP checkup recommended in 3 months. Maintain daily step count > 6000.':
      '3 నెలల్లో తదుపరి బీపీ తనిఖీ సిఫార్సు చేయబడింది. ప్రతిరోజూ 6000 కంటే ఎక్కువ అడుగులు నడవండి.',
    'Hypertension & Seasonal Allergy History': 'రక్తపోటు మరియు అలర్జీ చరిత్ర',

    'Rx:\n1. Tab Paracetamol 500mg - 1 tablet three times daily after food x 3 days\n2. Tab Cetirizine 10mg - 1 tablet at bedtime x 3 days\n3. ORS sachet - 1 packet dissolved in 1L clean drinking water throughout the day\n4. Steam inhalation twice daily.':
      'ప్రిస్క్రిప్షన్ (Rx):\n1. పారాసిటమాల్ 500mg - భోజనం తర్వాత రోజుకు 3 సార్లు (3 రోజులు)\n2. సెటిరిజైన్ 10mg - రాత్రి పడుకునే ముందు 1 మాత్ర (3 రోజులు)\n3. ORS ప్యాకెట్ - 1 లీటరు నీటిలో కలిపి రోజంతా తాగండి\n4. రోజుకు రెండుసార్లు ఆవిరి పట్టండి.',
    'e-Prescription: Acute Viral Flu Treatment': 'ఈ-ప్రిస్క్రిప్షన్: వైరల్ ఫ్లూ చికిత్స',
    'Pharmacy verified at Rampur Village Sub-Centre.': 'రాంపూర్ గ్రామ ఉప కేంద్రం వద్ద ధృవీకరించబడింది.',

    'Complete Blood Count (CBC) & HbA1c Lab Report': 'కంప్లీట్ బ్లడ్ కౌంట్ (CBC) & HbA1c ల్యాబ్ రిపోర్ట్',
    'Haemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 6,800 /uL (Normal: 4,000 - 11,000)\nPlatelets: 220,000 /uL (Normal: 150,000 - 450,000)\nFasting Blood Glucose: 98 mg/dL (Normal < 100)\nHbA1c: 5.6% (Normal < 5.7% - Non-Diabetic)':
      'హిమోగ్లోబిన్: 13.8 g/dL (సాధారణం: 13.0 - 17.0)\nతెల్ల రక్త కణాలు (WBC): 6,800 /uL (సాధారణం: 4,000 - 11,000)\nప్లేట్‌లెట్స్: 220,000 /uL (సాధారణం: 150,000 - 450,000)\nఫాస్టింగ్ బ్లడ్ షుగర్: 98 mg/dL (సాధారణం < 100)\nHbA1c: 5.6% (సాధారణం < 5.7% - డయాబెటిస్ లేదు)',
    'All hematological indices within normal clinical ranges.': 'అన్ని రక్త పరీక్షల ఫలితాలు సాధారణ పరిమితుల్లో ఉన్నాయి.',

    'Consultation Note: Pediatric & Allergic Rhinitis Review': 'కన్సల్టేషన్ నోట్: పిల్లల అలర్జీ జలుబు సమీక్ష',

    // Tags
    'Teleconsultation': 'టెలికన్సల్టేషన్',
    'Pediatrics': 'పీడియాట్రిక్స్ (పిల్లల వైద్యం)',
    'Allergy': 'అలర్జీ',
    'Allergies': 'అలర్జీలు',
    'Fever': 'జ్వరం',
    'Prescription': 'ప్రిస్క్రిప్షన్',
    'Chronic Care': 'దీర్ఘకాలిక సంరక్షణ',
    'Cardiology': 'కార్డియాలజీ (గుండె)',
    'Blood Test': 'రక్త పరీక్ష',
    'CBC': 'రక్త కణాల లెక్కింపు (CBC)',
    'PHC Diagnostics': 'PHC నిర్ధారణలు',
    'Routine': 'రెగ్యులర్ టెస్ట్',
  },

  kn: {
    // Specializations
    'General Physician': 'ಸಾಮಾನ್ಯ ವೈದ್ಯರು (General Physician)',
    'Pediatrician': 'ಮಕ್ಕಳ ತಜ್ಞರು (Pediatrician)',
    'Cardiologist': 'ಹೃದ್ರೋಗ ತಜ್ಞರು (Cardiologist)',
    'Gynecologist': 'ಸ್ತ್ರೀರೋಗ ತಜ್ಞರು (Gynecologist)',
    'Dermatologist': 'ಚರ್ಮರೋಗ ತಜ್ಞರು (Dermatologist)',
    'ENT Specialist': 'ಕಿವಿ, ಮೂಗು, ಗಂಟಲು ತಜ್ಞರು (ENT)',
    'Orthopedic': 'ಮೂಳೆ ತಜ್ಞರು (Orthopedic)',

    // Prescription & Reminder Instructions
    '1 tablet after dinner': 'ರಾತ್ರಿ ಊಟದ ನಂತರ 1 ಮಾತ್ರೆ',
    '1 tablet after breakfast': 'ಬೆಳಗಿನ ಉಪಹಾರದ ನಂತರ 1 ಮಾತ್ರೆ',
    '1 tablet before food': 'ಊಟಕ್ಕೆ ಮುಂಚೆ 1 ಮಾತ್ರೆ',
    '1 tablet after lunch': 'ಮಧ್ಯಾಹ್ನದ ಊಟದ ನಂತರ 1 ಮಾತ್ರೆ',
    'Take with warm water': 'ಬೆಚ್ಚಗಿನ ನೀರಿನೊಂದಿಗೆ ತೆಗೆದುಕೊಳ್ಳಿ',
    '3 days remaining - Refill needed soon': '3 ದಿನಗಳ ಔಷಧಿ ಬಾಕಿ ಇದೆ - ಶೀಘ್ರದಲ್ಲೇ ಮರುಪೂರಣ ಮಾಡಿಕೊಳ್ಳಿ',
    'Today': 'ಇಂದು',
    'Tomorrow': 'ನಾಳೆ',
    'Morning': 'ಬೆಳಿಗ್ಗೆ',
    'Afternoon': 'ಮಧ್ಯಾಹ್ನ',
    'Evening': 'ಸಂಜೆ',

    // Section Headers
    'Clinical Assessment:': 'ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ:',
    'Diagnosis:': 'ರೋಗನಿರ್ಣಯ:',
    'Advice:': 'ವೈದ್ಯರ ಸಲಹೆ:',
    'Doctor Remarks:': 'ವೈದ್ಯರ ಟಿಪ್ಪಣಿಗಳು:',
    'Doctor Remarks': 'ವೈದ್ಯರ ಟಿಪ್ಪಣಿಗಳು',
    'Prescribed Regimen:': 'ಸೂಚಿಸಲಾದ ಔಷಧಗಳು & ಡೋಸೇಜ್:',
    'Chief Complaints:': 'ಪ್ರಮುಖ ಸಮಸ್ಯೆಗಳು:',
    'Doctor Assessment & Notes:': 'ವೈದ್ಯರ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ಟಿಪ್ಪಣಿಗಳು:',

    // Common Diagnoses & Phrases
    'Patient presented with 4-day history of clear rhinorrhea, sneezing paroxysms, and nocturnal dry cough.':
      'ರೋಗಿಯು 4 ದಿನಗಳಿಂದ ಮೂಗು ಸೋರುವಿಕೆ, ಸತತ ಸೀನು ಮತ್ತು ರಾತ್ರಿಯ ಒಣ ಕೆಮ್ಮಿನಿಂದ ಬಳಲುತ್ತಿದ್ದಾರೆ.',
    'Allergic Rhinitis with secondary mild pharyngeal irritation.':
      'ಅಲರ್ಜಿಕ್ ರೈನಿಟಿಸ್ (ಅಲರ್ಜಿ ನೆಗಡಿ) ಮತ್ತು ಗಂಟಲು ಕಿರಿಕಿರಿ.',
    '- Avoid exposure to early morning damp air & crop residue smoke':
      '- ಮುಂಜಾನೆಯ ತಂಪಾದ ತೇವಾಂಶದ ಗಾಳಿ ಮತ್ತು ಹೊಗೆಯಿಂದ ದೂರವಿರಿ',
    '- Continue warm saline gargles':
      '- ಬೆಚ್ಚಗಿನ ಉಪ್ಪು ನೀರಿನಿಂದ ಬಾಯಿ ಮುಕ್ಕಳಿಸಿ',
    '- Prescribed Levocetirizine and Vitamin C supplements.':
      '- ಲೆವೊಸೆಟಿರಿಜಿನ್ ಮತ್ತು ವಿಟಮಿನ್ ಸಿ ಮಾತ್ರೆಗಳನ್ನು ಸೂಚಿಸಲಾಗಿದೆ.',
    'Follow-up via audio call if cough persists beyond 5 days.':
      '5 ದಿನಗಳ ನಂತರವೂ ಕೆಮ್ಮು ಮುಂದುವರಿದರೆ ಆಡಿಯೋ ಕರೆ ಮೂಲಕ ಸಂಪರ್ಕಿಸಿ.',

    'Patient diagnosed with mild Stage-1 Essential Hypertension in Jan 2024. Advised low sodium diet and regular blood pressure monitoring. Known seasonal allergen: Paddy dust & pollen.':
      'ಜನವರಿ 2024 ರಲ್ಲಿ ರೋಗಿಗೆ ಹಂತ-1 ಅಧಿಕ ರಕ್ತದೊತ್ತಡ ಪತ್ತೆಯಾಗಿದೆ. ಕಡಿಮೆ ಉಪ್ಪಿನ ಆಹಾರ ಮತ್ತು ನಿಯಮಿತ ರಕ್ತದೊತ್ತಡ ತಪಾಸಣೆಗೆ ಸಲಹೆ ನೀಡಲಾಗಿದೆ.',
    'Next BP checkup recommended in 3 months. Maintain daily step count > 6000.':
      '3 ತಿಂಗಳಲ್ಲಿ ಮುಂದಿನ ಬಿಪಿ ತಪಾಸಣೆ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ. ಪ್ರತಿದಿನ 6000 ಕ್ಕೂ ಹೆಚ್ಚು ಹೆಜ್ಜೆ ನಡೆಯಿರಿ.',
    'Hypertension & Seasonal Allergy History': 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ ಮತ್ತು ಅಲರ್ಜಿ ಇತಿಹಾಸ',

    'Rx:\n1. Tab Paracetamol 500mg - 1 tablet three times daily after food x 3 days\n2. Tab Cetirizine 10mg - 1 tablet at bedtime x 3 days\n3. ORS sachet - 1 packet dissolved in 1L clean drinking water throughout the day\n4. Steam inhalation twice daily.':
      'ವೈದ್ಯಕೀಯ ಚೀಟಿ (Rx):\n1. ಪ್ಯಾರಸಿಟಮಾಲ್ 500mg - ಊಟದ ನಂತರ ದಿನಕ್ಕೆ 3 ಬಾರಿ (3 ದಿನ)\n2. ಸೆಟಿರಿಜಿನ್ 10mg - ರಾತ್ರಿ ಮಲಗುವ ಮುನ್ನ 1 ಮಾತ್ರೆ (3 ದಿನ)\n3. ORS ಪುಡಿ - 1 ಲೀಟರ್ ನೀರಿನಲ್ಲಿ ಬೆರೆಸಿ ದಿನವಿಡೀ ಕುಡಿಯಿರಿ\n4. ದಿನಕ್ಕೆ 2 ಬಾರಿ ಹಬೆ ತೆಗೆದುಕೊಳ್ಳಿ.',
    'e-Prescription: Acute Viral Flu Treatment': 'ಇ-ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್: ವೈರಲ್ ಜ್ವರ ಚಿಕಿತ್ಸೆ',
    'Pharmacy verified at Rampur Village Sub-Centre.': 'ರಾಂಪುರ ಗ್ರಾಮ ಉಪಕೇಂದ್ರದಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.',

    'Complete Blood Count (CBC) & HbA1c Lab Report': 'ಸಂಪೂರ್ಣ ರಕ್ತದ ಎಣಿಕೆ (CBC) ಮತ್ತು HbA1c ಲ್ಯಾಬ್ ವರದಿ',
    'Haemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 6,800 /uL (Normal: 4,000 - 11,000)\nPlatelets: 220,000 /uL (Normal: 150,000 - 450,000)\nFasting Blood Glucose: 98 mg/dL (Normal < 100)\nHbA1c: 5.6% (Normal < 5.7% - Non-Diabetic)':
      'ಹಿಮೋಗ್ಲೋಬಿನ್: 13.8 g/dL (ಸಾಮಾನ್ಯ: 13.0 - 17.0)\nಬಿಳಿ ರಕ್ತಕಣಗಳು (WBC): 6,800 /uL (ಸಾಮಾನ್ಯ: 4,000 - 11,000)\nಪ್ಲೇಟ್‌ಲೆಟ್‌ಗಳು: 220,000 /uL (ಸಾಮಾನ್ಯ: 150,000 - 450,000)\nಉಪವಾಸ ರಕ್ತದ ಸಕ್ಕರೆ: 98 mg/dL (ಸಾಮಾನ್ಯ < 100)\nHbA1c: 5.6% (ಸಾಮಾನ್ಯ < 5.7% - ಮಧುಮೇಹವಿಲ್ಲ)',
    'All hematological indices within normal clinical ranges.': 'ಎಲ್ಲಾ ರಕ್ತದ ಸೂಚ್ಯಂಕಗಳು ಸಾಮಾನ್ಯ ವ್ಯಾಪ್ತಿಯಲ್ಲಿವೆ.',

    'Consultation Note: Pediatric & Allergic Rhinitis Review': 'ಸಮಾಲೋಚನಾ ಟಿಪ್ಪಣಿ: ಮಕ್ಕಳ ಅಲರ್ಜಿ ನೆಗಡಿ ಪರಿಶೀಲನೆ',

    // Tags
    'Teleconsultation': 'ಟೆಲಿಸಮಾಲೋಚನೆ',
    'Pediatrics': 'ಮಕ್ಕಳ ಆರೈಕೆ',
    'Allergy': 'ಅಲರ್ಜಿ',
    'Allergies': 'ಅಲರ್ಜಿಗಳು',
    'Fever': 'ಜ್ವರ',
    'Prescription': 'ವೈದ್ಯಕೀಯ ಚೀಟಿ',
    'Chronic Care': 'ದೀರ್ಘಕಾಲೀನ ಆರೈಕೆ',
    'Cardiology': 'ಹೃದ್ರೋಗ ಶಾಸ್ತ್ರ',
    'Blood Test': 'ರಕ್ತ ಪರೀಕ್ಷೆ',
    'CBC': 'ರಕ್ತ ಕಣಗಳ ಎಣಿಕೆ (CBC)',
    'PHC Diagnostics': 'PHC ತಪಾಸಣೆ',
    'Routine': 'ನಿಯಮಿತ ತಪಾಸಣೆ',
  },

  ml: {
    // Specializations
    'General Physician': 'ജനറൽ ഫിസിഷ്യൻ (General Physician)',
    'Pediatrician': 'ശിശുരോഗ വിദഗ്ദ്ധൻ (Pediatrician)',
    'Cardiologist': 'ഹൃദ്രോഗ വിദഗ്ദ്ധൻ (Cardiologist)',
    'Gynecologist': 'സ്ത്രീരോഗ വിദഗ്ദ്ധ (Gynecologist)',
    'Dermatologist': 'ചർമ്മരോഗ വിദഗ്ദ്ധൻ (Dermatologist)',
    'ENT Specialist': 'ഇ.എൻ.ടി വിദഗ്ദ്ധൻ (ENT)',
    'Orthopedic': 'അസ്ഥിരോഗ വിദഗ്ദ്ധൻ (Orthopedic)',

    // Prescription & Reminder Instructions
    '1 tablet after dinner': 'രാത്രി ഭക്ഷണത്തിന് ശേഷം 1 ഗുളിക',
    '1 tablet after breakfast': 'രാവിലെ പ്രഭാതഭക്ഷണത്തിന് ശേഷം 1 ഗുളിക',
    '1 tablet before food': 'ഭക്ഷണത്തിന് മുൻപ് 1 ഗുളിക',
    '1 tablet after lunch': 'ഉച്ചഭക്ഷണത്തിന് ശേഷം 1 ഗുളിക',
    'Take with warm water': 'ചെറുചൂടുവെള്ളത്തിൽ കഴിക്കുക',
    '3 days remaining - Refill needed soon': '3 ദിവസത്തെ മരുന്ന് ബാക്കി - ഉടൻ റീഫിൽ ചെയ്യുക',
    'Today': 'ഇന്ന്',
    'Tomorrow': 'നാളെ',
    'Morning': 'രാവിലെ',
    'Afternoon': 'ഉച്ചയ്ക്ക്',
    'Evening': 'വൈകുന്നേരം',

    // Section Headers
    'Clinical Assessment:': 'ക്ലിനിക്കൽ വിലയിരുത്തൽ:',
    'Diagnosis:': 'രോഗനിർണ്ണയം:',
    'Advice:': 'ഡോക്ടറുടെ ഉപദേശം:',
    'Doctor Remarks:': 'ഡോക്ടറുടെ കുറിപ്പ്:',
    'Doctor Remarks': 'ഡോക്ടറുടെ കുറിപ്പ്',
    'Prescribed Regimen:': 'നിർദ്ദേശിച്ച മരുന്നുകൾ & അളവ്:',
    'Chief Complaints:': 'പ്രധാന ലക്ഷണങ്ങൾ:',
    'Doctor Assessment & Notes:': 'ഡോക്ടറുടെ വിലയിരുത്തലും കുറിപ്പുകളും:',

    // Common Diagnoses & Phrases
    'Patient presented with 4-day history of clear rhinorrhea, sneezing paroxysms, and nocturnal dry cough.':
      'രോഗിക്ക് 4 ദിവസമായി മൂക്കൊലിപ്പ്, തുടർച്ചയായ തുമ്മൽ, രാത്രിയിലെ വരണ്ട ചുമ എന്നിവ അനുഭവപ്പെടുന്നു.',
    'Allergic Rhinitis with secondary mild pharyngeal irritation.':
      'അലർജിക് റൈനൈറ്റിസ് (അലർജി ജലദോഷം) ഒപ്പം തൊണ്ടയിലെ ചെറിയ അസ്വസ്ഥത.',
    '- Avoid exposure to early morning damp air & crop residue smoke':
      '- അതിരാവിലെ തണുത്ത കാറ്റും പുകയും ഏൽക്കുന്നത് ഒഴിവാക്കുക',
    '- Continue warm saline gargles':
      '- ഉപ്പുവെള്ളം കവിൾക്കൊള്ളുന്നത് തുടരുക',
    '- Prescribed Levocetirizine and Vitamin C supplements.':
      '- ലെവോസെറ്റിരിസിൻ, വൈറ്റമിൻ സി സപ്ലിമെന്റുകൾ നിർദ്ദേശിച്ചു.',
    'Follow-up via audio call if cough persists beyond 5 days.':
      '5 ദിവസത്തിന് ശേഷവും ചുമ തുടരുകയാണെങ്കിൽ ഓഡിയോ കോൾ വഴി ബന്ധപ്പെടുക.',

    'Patient diagnosed with mild Stage-1 Essential Hypertension in Jan 2024. Advised low sodium diet and regular blood pressure monitoring. Known seasonal allergen: Paddy dust & pollen.':
      'ജനുവരി 2024-ൽ സ്റ്റേജ്-1 രക്താതിമർദ്ദം കണ്ടെത്തി. ഉപ്പ് കുറഞ്ഞ ഭക്ഷണവും കൃത്യമായ രക്തസമ്മർദ്ദ പരിശോധനയും നിർദ്ദേശിച്ചു. അലർജി: നെല്ലിന്റെ പൊടിയും പൂമ്പൊടിയും.',
    'Next BP checkup recommended in 3 months. Maintain daily step count > 6000.':
      '3 മാസത്തിനുള്ളിൽ അടുത്ത ബിപി പരിശോധന നടത്തുക. ദിവസവും 6000-ൽ കൂടുതൽ ചുവടുകൾ നടക്കുക.',
    'Hypertension & Seasonal Allergy History': 'രക്താതിമർദ്ദവും അലർജി ചരിത്രവും',

    'Rx:\n1. Tab Paracetamol 500mg - 1 tablet three times daily after food x 3 days\n2. Tab Cetirizine 10mg - 1 tablet at bedtime x 3 days\n3. ORS sachet - 1 packet dissolved in 1L clean drinking water throughout the day\n4. Steam inhalation twice daily.':
      'കുറിപ്പടി (Rx):\n1. പാരസെറ്റമോൾ 500mg - ഭക്ഷണത്തിന് ശേഷം ദിവസവും 3 നേരം (3 ദിവസം)\n2. സെറ്റിരിസിൻ 10mg - രാത്രി ഉറങ്ങുന്നതിനു മുൻപ് 1 ഗുളിക (3 ദിവസം)\n3. ORS പാക്കറ്റ് - 1 ലിറ്റർ വെള്ളത്തിൽ കലക്കി ദിവസം മുഴുവൻ കുടിക്കുക\n4. ദിവസത്തിൽ രണ്ടുതവണ ആവി പിടിക്കുക.',
    'e-Prescription: Acute Viral Flu Treatment': 'ഇ-പ്രിസ്ക്രിപ്ഷൻ: വൈറൽ പനി ചികിത്സ',
    'Pharmacy verified at Rampur Village Sub-Centre.': 'റാംപൂർ വില്ലേജ് സബ് സെന്ററിൽ ഫാർമസി സ്ഥിരീകരിച്ചു.',

    'Complete Blood Count (CBC) & HbA1c Lab Report': 'കംപ്ലീറ്റ് ബ്ലഡ് കൗണ്ട് (CBC) & HbA1c ലാബ് റിപ്പോർട്ട്',
    'Haemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 6,800 /uL (Normal: 4,000 - 11,000)\nPlatelets: 220,000 /uL (Normal: 150,000 - 450,000)\nFasting Blood Glucose: 98 mg/dL (Normal < 100)\nHbA1c: 5.6% (Normal < 5.7% - Non-Diabetic)':
      'ഹീമോഗ്ലോബിൻ: 13.8 g/dL (സാധാരണം: 13.0 - 17.0)\nശ്വേതരക്താണുക്കൾ (WBC): 6,800 /uL (സാധാരണം: 4,000 - 11,000)\nപ്ലേറ്റ്‌ലെറ്റ്സ്: 220,000 /uL (സാധാരണം: 150,000 - 450,000)\nഫാസ്റ്റിംഗ് ബ്ലഡ് ഷുഗർ: 98 mg/dL (സാധാരണം < 100)\nHbA1c: 5.6% (സാധാരണം < 5.7% - പ്രമേഹമില്ല)',
    'All hematological indices within normal clinical ranges.': 'എല്ലാ രക്തപരിശോധനാ ഫലങ്ങളും സാധാരണ പരിധിക്കുള്ളിലാണ്.',

    'Consultation Note: Pediatric & Allergic Rhinitis Review': 'കൺസൾട്ടേഷൻ കുറിപ്പ്: കുട്ടികളുടെ അലർജി ജലദോഷ വിലയിരുത്തൽ',

    // Tags
    'Teleconsultation': 'ടെലികൺസൾട്ടേഷൻ',
    'Pediatrics': 'ശിശുരോഗ ചികിത്സ',
    'Allergy': 'അലർജി',
    'Allergies': 'അലർജികൾ',
    'Fever': 'പനി',
    'Prescription': 'പ്രിസ്ക്രിപ്ഷൻ',
    'Chronic Care': 'ദീർഘകാല പരിചരണം',
    'Cardiology': 'കാർഡിയോളജി',
    'Blood Test': 'രക്തപരിശോധന',
    'CBC': 'രക്തപരിശോധന (CBC)',
    'PHC Diagnostics': 'PHC പരിശോധനകൾ',
    'Routine': 'പതിവ് പരിശോധന',
  },
};

/**
 * Translate dynamic text content based on active language
 */
export function translateDynamicContent(text, lang = 'en') {
  if (!text || typeof text !== 'string') return text;
  const langKey = lang.substring(0, 2).toLowerCase();
  if (langKey === 'en') return text;

  const dict = DICTIONARY[langKey];
  if (!dict) return text;

  // Exact match
  if (dict[text]) return dict[text];

  // Multi-line replacement for clinical sections
  let translated = text;
  for (const [enPhrase, localized] of Object.entries(dict)) {
    if (translated.includes(enPhrase)) {
      translated = translated.split(enPhrase).join(localized);
    }
  }

  return translated;
}

/**
 * Translate tag
 */
export function translateTag(tag, lang = 'en') {
  if (!tag) return tag;
  const langKey = lang.substring(0, 2).toLowerCase();
  if (langKey === 'en') return tag;
  const dict = DICTIONARY[langKey];
  return dict?.[tag] || tag;
}

/**
 * Format date localized
 */
export function formatLocalizedDate(isoString, lang = 'en') {
  if (!isoString) return 'Recent';
  try {
    const d = new Date(isoString);
    const langKey = lang.substring(0, 2).toLowerCase();
    const localeMap = {
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      en: 'en-IN',
    };
    return d.toLocaleDateString(localeMap[langKey] || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}
