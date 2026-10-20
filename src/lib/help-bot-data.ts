// Knowledge base & diagnostics engine for MahaPoshan Assistant (100% Offline & Free)

export interface BotAction {
  labelMr: string;
  labelEn: string;
  type: 'navigate_tab' | 'sync_now' | 'open_email' | 'recalculate';
  tabTarget?: 'daily' | 'register' | 'admin' | 'print';
}

export interface BotKnowledgeItem {
  id: string;
  category: 'daily' | 'stock' | 'print' | 'sync' | 'admin' | 'subscription' | 'troubleshoot';
  titleMr: string;
  titleEn: string;
  keywords: string[];
  summaryMr: string;
  summaryEn: string;
  stepsMr: string[];
  stepsEn: string[];
  tipsMr?: string;
  tipsEn?: string;
  actions?: BotAction[];
}

export const BOT_KNOWLEDGE_BASE: BotKnowledgeItem[] = [
  // 1. Daily Entry & Attendance
  {
    id: 'daily-entry-how-to',
    category: 'daily',
    titleMr: 'रोजची हजेरी आणि पोषण आहार नोंद कशी करावी?',
    titleEn: 'How to record Daily Attendance & MDM Meal Entry?',
    keywords: [
      'daily', 'entry', 'attendance', 'हजेरी', 'दैनिक', 'नोंद', 'रोजची',
      'विद्यार्थी', 'संख्या', 'प्राथमिक', 'उच्च प्राथमिक', 'primary', 'upper primary',
      'pat', 'पटसंख्या', 'जेवण'
    ],
    summaryMr: 'दररोजच्या शालेय पोषण आहाराची नोंद तुम्ही "दैनिक नोंद" (Daily Entry) पर्यायावरून काही सेकंदात करू शकता.',
    summaryEn: 'You can record daily PM-POSHAN student attendance and meal consumption in seconds from the "Daily Entry" tab.',
    stepsMr: [
      'मुख्य मेनूतील "दैनिक नोंद" (Daily Entry) या टॅबवर क्लिक करा.',
      'ज्या दिवसाची नोंद करायची आहे ती तारीख निवडा (कॅलेंडर आयकॉनवर क्लिक करा).',
      'इयत्ता १ ते ५ (प्राथमिक) व इयत्ता ६ ते ८ (उच्च प्राथमिक) मधील लाभ घेतलेल्या विद्यार्थ्यांची उपस्थित संख्या टाका.',
      'त्या दिवशी शिजवलेला मेनू (उदा. वरण-भात, उसळ-भात, खिचडी) निवडा. मेनूनुसार तांदूळ व धान्याचे प्रमाण आपोआप मोजले जाते.',
      'शेवटी हिरव्या रंगाच्या "नोंद जतन करा (Save Entry)" या बटनावर क्लिक करा.'
    ],
    stepsEn: [
      'Click on the "Daily Entry" tab in the navigation bar.',
      'Select the date for which you want to record the meal.',
      'Enter the actual beneficiary student count for Primary (Std 1-5) and Upper Primary (Std 6-8).',
      'Select the recipe cooked for the day (e.g., Dal Khichdi, Matki Usal). Food grains and spices will be auto-calculated.',
      'Click the green "Save Entry" button to record the day.'
    ],
    tipsMr: 'टीप: रविवार किंवा शासकीय सुट्टी असल्यास "शाळेला सुट्टी आहे" हा पर्याय निवडून नोंद सुरक्षित करू शकता.',
    tipsEn: 'Tip: If it was a holiday or Sunday, check the "School Holiday" option to mark the day properly.',
    actions: [
      {
        labelMr: 'दैनिक नोंद उघडा',
        labelEn: 'Go to Daily Entry',
        type: 'navigate_tab',
        tabTarget: 'daily'
      }
    ]
  },
  {
    id: 'daily-entry-edit-delete',
    category: 'daily',
    titleMr: 'मागील दिवसाची नोंद दुरुस्त किंवा डिलीट कशी करावी?',
    titleEn: 'How to edit or delete an existing daily entry?',
    keywords: [
      'edit', 'delete', 'change', 'चुकीची नोंद', 'दुरुस्त', 'बदल', 'हटवा',
      'डिलीट', 'तारीख', 'रद्द'
    ],
    summaryMr: 'कधीही जुनी नोंद दुरुस्त करण्यासाठी फक्त ती तारीख निवडून नवीन आकडे टाका किंवा डिलीट बटनाचा वापर करा.',
    summaryEn: 'You can easily modify or delete any past entry by selecting that specific date.',
    stepsMr: [
      '"दैनिक नोंद" टॅबवर जा.',
      'कॅलेंडरमधून ज्या दिवसाची नोंद दुरुस्त करायची आहे ती तारीख निवडा.',
      'तुमची आधी नोंदवलेली माहिती स्क्रीनवर दिसेल.',
      'विद्यार्थी संख्या किंवा मेनू दुरुस्त करून "बदल जतन करा (Update Entry)" वर क्लिक करा.',
      'जर नोंद पूर्णपणे काढून टाकायची असेल, तर खालील लाल रंगाच्या "नोंद हटवा (Delete Entry)" बटनावर क्लिक करा.'
    ],
    stepsEn: [
      'Navigate to the "Daily Entry" tab.',
      'Pick the date of the record you wish to modify.',
      'The saved numbers and details will appear on the screen.',
      'Correct the numbers or menu and click "Update Entry".',
      'To completely remove the record, click the red "Delete Entry" button.'
    ],
    actions: [
      {
        labelMr: 'दैनिक नोंद उघडा',
        labelEn: 'Go to Daily Entry',
        type: 'navigate_tab',
        tabTarget: 'daily'
      }
    ]
  },

  // 2. Stock Inward & Balances
  {
    id: 'stock-inward-how-to',
    category: 'stock',
    titleMr: 'धान्याची आवक (Inward Stock) कशी नोंदवायची?',
    titleEn: 'How to record monthly Inward Stock received from Government/Godown?',
    keywords: [
      'inward', 'stock', 'aavak', 'आवक', 'धान्य', 'तांदूळ', 'डाळ', 'तेल',
      'साठा', 'प्राप्ती', 'गोडावून', 'सप्लाय', 'सूट'
    ],
    summaryMr: 'शासनाकडून किंवा पुरवठादाराकडून शाळेत नवीन तांदूळ, डाळी किंवा जिन्नस आल्यावर त्याची आवक नोंदवणे आवश्यक असते.',
    summaryEn: 'Whenever fresh rice, pulses, or commodities are delivered to your school, enter them as monthly Inward Stock.',
    stepsMr: [
      '"मासिक नोंदवही" (Monthly Register) टॅबवर जा.',
      'वर दिलेल्या महिन्यामधून योग्य महिना निवडा (उदा. ऑगस्ट २०२४).',
      'वर उजव्या कोपऱ्यात असलेल्या "धान्य आवक नोंद (Inward Stock)" या बटनावर क्लिक करा.',
      'शाळेत प्राप्त झालेल्या तांदूळ (प्राथमिक व उच्च प्राथमिक), तूरडाळ, मूगडाळ, तेल, मसाले यांचे किलो किंवा लिटरमध्ये अचूक वजन टाका.',
      '"आवक जतन करा" (Save Inward) बटनावर क्लिक करा. तुमची एकूण शिल्लक आपोआप अद्ययावत होईल.'
    ],
    stepsEn: [
      'Go to the "Monthly Register" tab.',
      'Select the relevant academic month from the dropdown.',
      'Click the "Inward Stock (आवक नोंद)" button on the top right.',
      'Enter the quantities of Rice, Pulses, Oil, and other commodities received in kilograms or liters.',
      'Click "Save Inward". The stock balance for the entire month will be updated automatically.'
    ],
    actions: [
      {
        labelMr: 'मासिक नोंदवहीत जा',
        labelEn: 'Go to Monthly Register',
        type: 'navigate_tab',
        tabTarget: 'register'
      }
    ]
  },
  {
    id: 'stock-negative-mismatch',
    category: 'troubleshoot',
    titleMr: 'तांदूळ किंवा धान्याची शिल्लक उणे (Negative) किंवा चुकीची का दिसते?',
    titleEn: 'Why does rice/grain balance show negative or incorrect?',
    keywords: [
      'negative', 'mismatch', 'stock', 'balance', 'उणे', 'मायनस', 'शिल्लक',
      'तूट', 'चूक', 'हिशोब', 'तांदूळ शिल्लक', 'फरक', 'गोंधळ'
    ],
    summaryMr: 'शिल्लक उणे (Negative) दिसण्याची मुख्य दोन कारणे असतात: आवक (Inward) नोंदवलेली नसणे किंवा आधीच्या महिन्याची शिल्लक न जुळणे.',
    summaryEn: 'A negative stock balance usually happens if newly received inward stock was not recorded, or previous month balance needs recalculation.',
    stepsMr: [
      'पहिली तपासणी: त्या महिन्याची "धान्य आवक (Inward)" नोंदवली आहे का तपासा. आवक शून्य असल्यास खर्चामुळे शिल्लक उणे होते.',
      'दुसरी तपासणी: "मासिक नोंदवही" मध्ये मागील महिन्याची अखेरची शिल्लक चालू महिन्यात आरंभी शिल्लक म्हणून बरोबर आली आहे का पहा.',
      'दुरुस्ती पर्याय: जर सर्व नोंदी बरोबर असूनही फरक दिसत असेल, तर "प्रोफाईल व सेटिंग्ज" मध्ये जाऊन "नोंदींची फेर-तपासणी (Recalculate Registers)" बटनावर क्लिक करा. यामुळे सर्व महिन्यांचा हिशोब पुन्हा नव्याने अचूक मोजला जातो.'
    ],
    stepsEn: [
      'Check 1: Confirm whether you entered "Inward Stock" for that month. Without inward stock, daily consumption drives balance below zero.',
      'Check 2: Verify that last month’s closing balance properly carried forward to this month’s opening balance.',
      'Resolution: If numbers still differ, open "Profile & Settings" and click "Recalculate Registers (नोंदींची फेर-तपासणी)". This recalculates all stock balances from scratch.'
    ],
    actions: [
      {
        labelMr: 'मासिक नोंदवहीत आवक तपासा',
        labelEn: 'Check Register Inward',
        type: 'navigate_tab',
        tabTarget: 'register'
      },
      {
        labelMr: 'सेटिंग्जमध्ये फेर-तपासणी करा',
        labelEn: 'Recalculate in Settings',
        type: 'navigate_tab',
        tabTarget: 'admin'
      }
    ]
  },

  // 3. Official Print & Reports
  {
    id: 'print-official-reports',
    category: 'print',
    titleMr: 'शासकीय मासिक अहवाल (प्रपत्र-२) कसा प्रिंट करावा?',
    titleEn: 'How to print the Official Government Monthly MDM Report (Part-2)?',
    keywords: [
      'print', 'report', 'pdf', 'excel', 'अहवाल', 'प्रिंट', 'प्रपत्र', 'मासिक अहवाल',
      'डाउनलोड', 'download', 'xerox', 'booklet', 'शेरा', 'तक्ता'
    ],
    summaryMr: 'महाराष्ट्र शासनाच्या अधिकृत प्रपत्र-२ (Schedule-II Part-2) प्रमाणे अचूक A4 लँडस्केप प्रिंट किंवा एक्सेल शीट डाउनलोड करा.',
    summaryEn: 'Generate certified A4 landscape prints or Excel sheets compliant with Maharashtra Government Part-2 booklet.',
    stepsMr: [
      'मेनूमधील "शासकीय अहवाल" (Report / Print) टॅबवर क्लिक करा.',
      'वर दिलेल्या यादीतून तुम्हाला हवा असलेला महिना निवडा.',
      'स्क्रीनवर शासनाच्या अधिकृत नोंदवहीच्या ४३ पानांच्या फॉरमॅटनुसार पूर्ण तक्ता तयार झालेला दिसेल.',
      'प्रिंटसाठी: निळ्या रंगाच्या "प्रिंट / PDF सेव्ह करा (Print Register)" बटनावर क्लिक करा.',
      'एक्सेलसाठी: हिरव्या रंगाच्या "Excel (.xlsx) डाउनलोड" बटनावर क्लिक करा.'
    ],
    stepsEn: [
      'Click the "Report (Print)" tab in the top navigation bar.',
      'Choose the month you want to generate the report for.',
      'The complete government schedule with opening balance, inward, daily consumption, and closing balance will load.',
      'For Print/PDF: Click the blue "Print / Save PDF" button.',
      'For Excel: Click the green "Download Excel (.xlsx)" button.'
    ],
    tipsMr: 'प्रिंट टीप: प्रिंटर सेटिंग्जमध्ये Orientation "Landscape" आणि Scale "Default" किंवा "Fit to page" ठेवावे.',
    tipsEn: 'Print Tip: Ensure your print settings are set to "Landscape" and "Background graphics" is enabled.',
    actions: [
      {
        labelMr: 'शासकीय अहवाल उघडा',
        labelEn: 'Open Reports',
        type: 'navigate_tab',
        tabTarget: 'print'
      }
    ]
  },

  // 4. Cloud Sync & Offline
  {
    id: 'sync-offline-troubleshoot',
    category: 'sync',
    titleMr: 'ऑफलाइन काम कसे चालते आणि डेटा क्लाउडवर सिंक कसा होतो?',
    titleEn: 'How does offline mode work and how does data sync to cloud?',
    keywords: [
      'offline', 'sync', 'cloud', 'internet', 'नेट', 'इंटरनेट', 'सिंक', 'ऑफलाइन',
      'डेटा', 'जतन', 'सुरक्षित', 'सर्व्हर', 'supabase'
    ],
    summaryMr: 'महापोषण ॲप हे संपूर्णपणे ऑफलाइन-सक्षम (Offline-Ready) आहे. इंटरनेट नसले तरी तुम्ही सर्व काम करू शकता.',
    summaryEn: 'MahaPoshan Register is fully offline-ready. You can do all your daily work even without an internet connection.',
    stepsMr: [
      'जेव्हा इंटरनेट नसते, तेव्हा तुमचा सर्व डेटा सुरक्षितपणे तुमच्याच मोबाईल किंवा कॉम्प्युटरच्या ब्राऊजर मेमरीमध्ये जतन होतो.',
      'जेव्हा इंटरनेट सुरू होते, तेव्हा ॲप आपोआप सर्व नोंदी सुरक्षित क्लाउडवर सिंक (Sync) करते.',
      'वर उजव्या कोपऱ्यात हिरवा ढग (Cloud) दिसत असेल तर डेटा सुरक्षित सिंक झाला आहे असा त्याचा अर्थ होतो.',
      'जर पिवळा किंवा लाल आयकॉन दिसत असेल, तर इंटरनेट सुरू असल्याची खात्री करा किंवा खालील बटनाने मॅन्युअल सिंक करा.'
    ],
    stepsEn: [
      'When there is no internet, your entries are safely stored in your local device browser storage.',
      'As soon as your device connects to the internet, entries automatically sync to the secure cloud.',
      'A green cloud icon in the top header indicates all data is safely synced to the cloud.',
      'If you see an error or want to force sync, simply click the "Sync to Cloud Now" button.'
    ],
    actions: [
      {
        labelMr: 'आत्ताच डेटा सिंक करा',
        labelEn: 'Sync to Cloud Now',
        type: 'sync_now'
      }
    ]
  },
  {
    id: 'backup-restore-data',
    category: 'sync',
    titleMr: 'शाळेच्या संपूर्ण डेटाचा बॅकअप कसा घ्यावा किंवा रिस्टोअर कसा करावा?',
    titleEn: 'How to download a JSON Backup or restore school data?',
    keywords: [
      'backup', 'restore', 'json', 'बॅकअप', 'रिस्टोअर', 'फाईल', 'डेटा सेव्ह',
      'पेनड्राइव्ह', 'कॉपी'
    ],
    summaryMr: 'भविष्यातील सुरक्षिततेसाठी किंवा दुसर्‍या मोबाईल/कॉम्प्युटरवर डेटा नेण्यासाठी तुम्ही एका क्लिकवर JSON बॅकअप घेऊ शकता.',
    summaryEn: 'Take a complete offline backup file (JSON) to keep your records safe or transfer them to another device.',
    stepsMr: [
      '"प्रोफाईल व सेटिंग्ज" (Profile & Settings) टॅबवर जा.',
      'खाली स्क्रोल करून "डेटा बॅकअप व रिस्टोअर (Data Backup & Restore)" या विभागात या.',
      'बॅकअप घेण्यासाठी: "बॅकअप फाईल डाउनलोड करा (Download Backup)" वर क्लिक करा. तुमच्या डिव्हाइसवर .json फाईल सेव्ह होईल.',
      'रिस्टोअर करण्यासाठी: "बॅकअप फाईल अपलोड करा" वर क्लिक करून आधीची .json फाईल निवडा.'
    ],
    stepsEn: [
      'Go to the "Profile & Settings" tab.',
      'Scroll down to the "Data Backup & Restore" section.',
      'To backup: Click "Download Backup File (.json)". Keep this file safe on your computer or Google Drive.',
      'To restore: Click "Choose File" under Restore, select your backup file, and confirm.'
    ],
    actions: [
      {
        labelMr: 'सेटिंग्ज विभागात जा',
        labelEn: 'Go to Settings',
        type: 'navigate_tab',
        tabTarget: 'admin'
      }
    ]
  },

  // 5. Admin Settings & Password
  {
    id: 'admin-password-reset',
    category: 'admin',
    titleMr: 'ॲडमिन पासवर्ड कसा बदलावा किंवा विसरल्यास काय करावे?',
    titleEn: 'How to change or recover the Admin Password / PIN?',
    keywords: [
      'password', 'pin', 'admin', 'पासवर्ड', 'पिन', 'लॉगिन', 'बदला', 'विसरला',
      'reset', 'default', 'सुरक्षा'
    ],
    summaryMr: 'ॲडमिन सेटिंग्ज सुरक्षित ठेवण्यासाठी पासवर्ड वापरला जातो. डिफॉल्ट पासवर्ड admin123 असतो.',
    summaryEn: 'The admin password protects sensitive school settings and grain rate calculations. Default is admin123.',
    stepsMr: [
      'महापोषण ॲपचा मूळ (Default) ॲडमिन पासवर्ड "admin123" असा आहे.',
      'पासवर्ड बदलण्यासाठी: "प्रोफाईल व सेटिंग्ज" टॅबमध्ये जा.',
      '"प्रणाली पासवर्ड व सुरक्षा (Admin Password)" या कार्डमध्ये जुना पासवर्ड आणि नवीन पासवर्ड प्रविष्ट करा.',
      '"पासवर्ड अपडेट करा" वर क्लिक करा.',
      'जर तुम्ही तुमचा बदललेला पासवर्ड विसरला असाल, तर तुम्ही आम्हाला poshanregister@gmail.com वर शाळेचे नाव व UDISE पाठवून मदत मागू शकता.'
    ],
    stepsEn: [
      'The default administrative password for MahaPoshan is "admin123".',
      'To change it: Go to "Profile & Settings" tab.',
      'Find the "Admin Password & Security" section.',
      'Enter your current password and specify a new secure PIN/password.',
      'Click "Update Password". If forgotten, email us at poshanregister@gmail.com with your UDISE code.'
    ],
    actions: [
      {
        labelMr: 'पासवर्ड सेटिंग्जवर जा',
        labelEn: 'Go to Settings',
        type: 'navigate_tab',
        tabTarget: 'admin'
      },
      {
        labelMr: 'मदत ईमेल पाठवा',
        labelEn: 'Send Support Email',
        type: 'open_email'
      }
    ]
  },
  {
    id: 'school-profile-udise',
    category: 'admin',
    titleMr: 'शाळेचे नाव, UDISE नंबर किंवा मुख्याध्यापक नाव कसे बदलावे?',
    titleEn: 'How to update School Name, UDISE code, or Headmaster name?',
    keywords: [
      'udise', 'school name', 'headmaster', 'शाळा', 'नाव', 'युडायस', 'मुख्याध्यापक',
      'स्वयंपाकी', 'केंद्र', 'तालुका', 'जिल्हा'
    ],
    summaryMr: 'शासकीय अहवालावर शाळेचे अधिकृत नाव आणि UDISE क्रमांक येण्यासाठी प्रोफाइल पूर्ण भरणे आवश्यक आहे.',
    summaryEn: 'Ensure your school name and UDISE code are configured so all official registers and reports print correctly.',
    stepsMr: [
      '"प्रोफाईल व सेटिंग्ज" टॅबवर जा.',
      'पहिल्या कार्डमध्ये शाळेचे नाव, ११ अंकी UDISE क्रमांक, केंद्र/बीट, तालुका व जिल्हा भरा.',
      'तसेच खाली मुख्याध्यापकांचे नाव, पोषण आहार प्रभारी शिक्षक आणि स्वयंपाकी यांचे नाव टाका.',
      '"शाळा माहिती जतन करा (Save Profile)" बटनावर क्लिक करा.'
    ],
    stepsEn: [
      'Navigate to the "Profile & Settings" tab.',
      'In the School Profile card, fill in your School Name, 11-digit UDISE code, Center/Cluster, Taluka, and District.',
      'Provide Headmaster name, In-charge Teacher, and Cook details.',
      'Click "Save Profile". The details will appear on all future printed reports.'
    ],
    actions: [
      {
        labelMr: 'शाळा प्रोफाईल उघडा',
        labelEn: 'Open School Profile',
        type: 'navigate_tab',
        tabTarget: 'admin'
      }
    ]
  },

  // 6. Subscription & Referrals
  {
    id: 'subscription-referral-free',
    category: 'subscription',
    titleMr: 'सबस्क्रिप्शन कसे चालू करावे आणि मोफत महिने कसे मिळवावे?',
    titleEn: 'How does school subscription work and how to earn free months?',
    keywords: [
      'subscription', 'free', 'referral', 'payment', 'पैसे', 'मोफत', 'सबस्क्रिप्शन',
      'रेफरल', 'ऑफर', 'मुदत', 'व्हॅलिडिटी', 'कूपन'
    ],
    summaryMr: 'प्रत्येक नवीन शाळेला मोफत ट्रायल मिळते. तसेच इतर शाळांना रेफर करून तुम्ही अमर्यादित मोफत महिने मिळवू शकता!',
    summaryEn: 'Every new school starts with a free trial. You can also refer neighboring schools to earn extra free months.',
    stepsMr: [
      'नवीन नोंदणी केल्यावर शाळेला मोफत कालावधी (Trial) मिळतो.',
      'मोफत महिने मिळवण्यासाठी: वर दिलेल्या "भेट / गिफ्ट (Gift)" आयकॉनवर क्लिक करा.',
      'तुमची खास रेफरल लिंक तुमच्या शेजारील शाळांच्या शिक्षकांना किंवा व्हॉट्सॲप ग्रुपवर शेअर करा.',
      'जेव्हा इतर शाळा तुमच्या लिंकवरून नोंदणी करतात, तेव्हा तुमच्या शाळेला प्रति शाळा १ महिना मोफत मिळतो!'
    ],
    stepsEn: [
      'All newly registered schools start with an initial free trial period.',
      'To earn extra free months: Click the Gift/Referral icon at the top of the app.',
      'Copy your unique school referral link and share it with neighboring teachers on WhatsApp.',
      'Whenever a referred school joins, your school gets 1 full month of free subscription added automatically!'
    ],
    actions: [
      {
        labelMr: 'सपोर्ट ईमेल संपर्क',
        labelEn: 'Contact Support',
        type: 'open_email'
      }
    ]
  }
];

// Quick suggestion chips shown in the chat window
export interface QuickPrompt {
  id: string;
  labelMr: string;
  labelEn: string;
  query: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'qp-daily',
    labelMr: '📝 रोजची हजेरी कशी भरायची?',
    labelEn: '📝 How to add Daily Entry?',
    query: 'रोजची हजेरी कशी भरायची'
  },
  {
    id: 'qp-inward',
    labelMr: '📦 धान्याची आवक (Inward) कशी नोंदवायची?',
    labelEn: '📦 How to add Inward Stock?',
    query: 'धान्य आवक नोंद'
  },
  {
    id: 'qp-stock-issue',
    labelMr: '⚖️ तांदूळ शिल्लक उणे किंवा चूक दिसतेय?',
    labelEn: '⚖️ Stock balance negative or wrong?',
    query: 'शिल्लक उणे किंवा चूक'
  },
  {
    id: 'qp-print',
    labelMr: '🖨️ शासकीय अहवाल कसा प्रिंट करायचा?',
    labelEn: '🖨️ How to print Government Report?',
    query: 'शासकीय अहवाल प्रिंट'
  },
  {
    id: 'qp-sync',
    labelMr: '🔄 ऑफलाइन आणि डेटा क्लाउड सिंक',
    labelEn: '🔄 Offline mode & cloud sync',
    query: 'डेटा सिंक ऑफलाइन'
  },
  {
    id: 'qp-password',
    labelMr: '🔑 ॲडमिन पासवर्ड विसरलाय किंवा बदलायचाय',
    labelEn: '🔑 Admin password reset or change',
    query: 'admin पासवर्ड विसरला'
  }
];

// Offline fuzzy matching search function
export function searchKnowledgeBase(query: string): {
  item: BotKnowledgeItem | null;
  confidence: number;
  isOffTopic: boolean;
} {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) {
    return { item: null, confidence: 0, isOffTopic: false };
  }

  // Detect explicit off-topic questions (e.g. general knowledge, cricket, politics, cooking outside MDM, coding)
  const offTopicKeywords = [
    'weather', 'cricket', 'ipl', 'narendra modi', 'pm modi', 'politics', 'election',
    'movie', 'song', 'recipe for pizza', 'cake', 'python', 'javascript code', 'write an essay',
    'who is', 'kon aahe', 'news', 'ताज्या बातम्या', 'क्रिकेट', 'चित्रपट', 'गाणी'
  ];

  const isExplicitOffTopic = offTopicKeywords.some(keyword => cleanQuery.includes(keyword));
  if (isExplicitOffTopic) {
    return { item: null, confidence: 0, isOffTopic: true };
  }

  const queryTokens = cleanQuery.split(/[\s,?.!+=/\\-]+/).filter(t => t.length > 1);

  let bestMatch: BotKnowledgeItem | null = null;
  let highestScore = 0;

  for (const item of BOT_KNOWLEDGE_BASE) {
    let score = 0;

    // Check direct keyword match
    for (const kw of item.keywords) {
      const lowerKw = kw.toLowerCase();
      if (cleanQuery.includes(lowerKw)) {
        score += 8;
      }
      for (const token of queryTokens) {
        if (lowerKw.includes(token) || token.includes(lowerKw)) {
          score += 4;
        }
      }
    }

    // Check title match
    const lowerTitleMr = item.titleMr.toLowerCase();
    const lowerTitleEn = item.titleEn.toLowerCase();
    for (const token of queryTokens) {
      if (lowerTitleMr.includes(token)) score += 5;
      if (lowerTitleEn.includes(token)) score += 5;
    }

    // Check summary match
    const lowerSummaryMr = item.summaryMr.toLowerCase();
    const lowerSummaryEn = item.summaryEn.toLowerCase();
    for (const token of queryTokens) {
      if (lowerSummaryMr.includes(token)) score += 2;
      if (lowerSummaryEn.includes(token)) score += 2;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // If match score is very low, it might be an unhandled or off-topic question
  if (highestScore < 4) {
    return { item: null, confidence: highestScore, isOffTopic: false };
  }

  return { item: bestMatch, confidence: highestScore, isOffTopic: false };
}
