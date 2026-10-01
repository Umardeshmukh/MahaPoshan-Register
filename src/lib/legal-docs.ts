import { LegalDocType } from '../types';

export const CURRENT_TERMS_VERSION = 'v1.0';
export const CURRENT_PRIVACY_VERSION = 'v1.0';
export const CURRENT_REFUND_VERSION = 'v1.0';
export const LEGAL_LAST_UPDATED = '21 सप्टेंबर 2026';

export interface LegalDocumentContent {
  id: LegalDocType;
  titleEn: string;
  titleMr: string;
  version: string;
  lastUpdated: string;
  summary: string;
  sections: {
    headingEn: string;
    headingMr: string;
    contentEn: string;
    contentMr: string;
  }[];
}

export const LEGAL_DOCS: Record<LegalDocType, LegalDocumentContent> = {
  terms: {
    id: 'terms',
    titleEn: 'Terms & Conditions',
    titleMr: 'नियम व अटी',
    version: CURRENT_TERMS_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    summary:
      'या प्रणालीचा वापर करताना शाळा, शिक्षक आणि महापोषण रजिस्टर यांच्यातील कायदेशीर नियम आणि सेवा अटी.',
    sections: [
      {
        headingEn: '1. Acceptance of Terms & Service Scope',
        headingMr: '१. अटींची स्वीकृती व सेवा व्याप्ती',
        contentEn:
          'By registering, signing up, or utilizing the MahaPoshan Register portal ("Service"), the school headmaster, teacher, or authorized representative ("User") agrees to be legally bound by these Terms and Conditions. The Service provides digital record-keeping, nutritional calculation, and monthly stock registers in compliance with Maharashtra Government PM POSHAN norms.',
        contentMr:
          'महापोषण रजिस्टर प्रणालीमध्ये नोंदणी करून अथवा वापर करून मुख्याध्यापक, शिक्षक किंवा अधिकृत प्रतिनिधी या नियम व अटींशी कायदेशीररित्या बांधील राहण्यास मान्यता देतात. ही प्रणाली महाराष्ट्र शासन शालेय पोषण आहार (PM POSHAN) नियमांनुसार दैनिक हिशोब, पोषण मूल्य गणना व मासिक ताळेबंद तयार करण्याची सुविधा पुरवते.',
      },
      {
        headingEn: '2. User Account, Verification & UDISE Integrity',
        headingMr: '२. खाते, पडताळणी व UDISE क्रमांकाची सत्यता',
        contentEn:
          'Users must provide an authentic 11-digit school UDISE code, accurate school name, and verifiable contact details. One school is entitled to access under verified credentials. MahaPoshan reserves the right to suspend or revoke access if fraudulent UDISE or impersonated accounts are detected.',
        contentMr:
          'वापरकर्त्याने शाळेचा खरा ११ अंकी UDISE क्रमांक, शाळेचे अधिकृत नाव व योग्य संपर्क माहिती देणे बंधनकारक आहे. खोटी माहिती, बनावट UDISE किंवा अनधिकृत व्यक्ती आढळल्यास ॲडमिनला खाते तात्काळ निलंबित किंवा रद्द करण्याचा पूर्ण अधिकार आहे.',
      },
      {
        headingEn: '3. Subscription, Validity & Renewal',
        headingMr: '३. सदस्यत्व, वैधता व नूतनीकरण',
        contentEn:
          'Access to MahaPoshan Register is granted under subscription periods approved by the administration. Active subscription permits unlimited daily calculation, report printing, and cloud synchronization. Upon expiration, access is restricted until renewed.',
        contentMr:
          'प्रणालीचा वापर प्रशासनाने मंजूर केलेल्या सदस्यत्व कालावधीनुसार वैध राहतो. वैध सदस्यत्व काळात अमर्याद दैनिक नोंदी, प्रिंट व क्लाउड बॅकअप सुविधा उपलब्ध राहील. मुदत संपल्यानंतर नूतनीकरण करेपर्यंत प्रवेश मर्यादित केला जाईल.',
      },
      {
        headingEn: '4. Data Accuracy & Government Compliance',
        headingMr: '४. माहितीची अचूकता व शासकीय नियमांचे पालन',
        contentEn:
          'The daily beneficiary counts, stock receipts, and expenditure figures input into the software are the sole operational responsibility of the respective school management. The software operates as an assistive digital calculator adhering to Maharashtra MDM government resolutions.',
        contentMr:
          'नोंदवहीत भरलेली दररोजची पटसंख्या, धान्यादी आवक आणि खर्च याविषयीची अंतिम जबाबदारी संबंधित शाळा व्यवस्थापनाची राहील. हे सॉफ्टवेअर शासन निर्णयानुसार हिशोब अचूक मांडण्यासाठी सहाय्यक साधन म्हणून काम करते.',
      },
      {
        headingEn: '5. Intellectual Property & Acceptable Use',
        headingMr: '५. बौद्धिक संपदा व योग्य वापर',
        contentEn:
          'All software code, formulas, formats, and design elements are the intellectual property of MahaPoshan Register. Reverse engineering, redistribution, scraping, or unauthorized resale is strictly prohibited under the Information Technology Act, 2000.',
        contentMr:
          'या सॉफ्टवेअरची रचना, सूत्रे व डिझाइन हे महापोषण रजिस्टरची बौद्धिक संपदा आहे. सॉफ्टवेअरची अनधिकृत कॉपी, पुनर्विक्री किंवा फेरबदल करणे माहिती तंत्रज्ञान कायदा, २००० नुसार दंडनीय अपराध आहे.',
      },
      {
        headingEn: '6. Governing Law & Jurisdiction',
        headingMr: '६. कायदेशीर अधिकारक्षेत्र',
        contentEn:
          'These terms are governed by the laws of the Republic of India. Any legal disputes arising out of the use of this service shall fall under the exclusive jurisdiction of the competent courts in Maharashtra, India.',
        contentMr:
          'हे नियम भारतीय कायद्यानुसार संचलित होतात. या प्रणालीसंबंधी कोणताही वाद उद्भवल्यास त्याचे कायदेशीर अधिकारक्षेत्र महाराष्ट्र राज्यातील सक्षम न्यायालयाच्या अखत्यारीत राहील.',
      },
    ],
  },
  privacy: {
    id: 'privacy',
    titleEn: 'Privacy Policy',
    titleMr: 'गोपनीयता धोरण',
    version: CURRENT_PRIVACY_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    summary:
      'शाळेची माहिती, विद्यार्थ्यांचे आकडे आणि वैयक्तिक संपर्क डेटा सुरक्षित कसा ठेवला जातो याविषयीचे धोरण.',
    sections: [
      {
        headingEn: '1. Information We Collect',
        headingMr: '१. आम्ही कोणती माहिती संकलित करतो?',
        contentEn:
          'We collect: (a) School Information (School Name, 11-digit UDISE, Center/Cluster, Taluka, District); (b) Educator Contact Details (Teacher/HM Name, Email, Phone number); (c) Operational MDM Records (Daily attendance count, ingredient consumption, opening and closing stock); (d) Legal Agreement Audit Logs (User ID, acceptance timestamp, terms version); and (e) Referral metadata (Referral codes and payout UPI details).',
        contentMr:
          'आम्ही पुढील माहिती संकलित करतो: (अ) शाळेची माहिती (नाव, UDISE, केंद्र, तालुका, जिल्हा); (ब) संपर्क तपशील (मुख्याध्यापक/शिक्षकांचे नाव, ईमेल, फोन नंबर); (क) शालेय पोषण आहार नोंदी (दैनिक पट, शिल्लक साठा व खर्च); (ड) कायदेशीर संमती तपशील (युझर आयडी, संमतीची वेळ, व्हर्जन); व (इ) रेफरल तपशील (रेफरल कोड व बक्षीस वितरणासाठी UPI माहिती).',
      },
      {
        headingEn: '2. How Your Data is Used',
        headingMr: '२. माहितीचा वापर कसा केला जातो?',
        contentEn:
          'Collected data is strictly used to: generate official Maharashtra PM POSHAN registers (शाळा स्तरवार दैनिक खर्च नोंदवही), sync offline records securely to your cloud vault via encrypted Supabase storage, process user authentication via Clerk, and administer referral rewards.',
        contentMr:
          'गोळा केलेली माहिती फक्त शासकीय विहित नमुन्यात दैनिक नोंदवही तयार करण्यासाठी, Supabase सुरक्षित क्लाउडवर स्थानिक डेटा सिंक करण्यासाठी, Clerk द्वारे लॉगिन सुरक्षित ठेवण्यासाठी आणि रेफरल बक्षीस वितरणासाठी वापरली जाते.',
      },
      {
        headingEn: '3. Data Security & Storage Architecture',
        headingMr: '३. डेटा सुरक्षा आणि साठवणूक रचना',
        contentEn:
          'MahaPoshan Register uses bank-grade SSL/TLS 256-bit encryption in transit and encrypted data storage at rest. User data is never sold, traded, or shared with unauthorized commercial advertisers. Local storage ensures offline continuity on the educator’s device.',
        contentMr:
          'महापोषण रजिस्टर सर्व डेटा ट्रान्समिशनसाठी SSL/TLS २५६-बिट एन्क्रिप्शन वापरते. शिक्षकांचा अथवा शाळेचा कोणताही डेटा जाहिरातदारांना विकला किंवा शेअर केला जात नाही. ऑफलाइन सुविधेसाठी डेटा सुरक्षित स्थानिक साठवणुकीतही उपलब्ध राहतो.',
      },
      {
        headingEn: '4. Third-Party Verified Services',
        headingMr: '४. तृतीय-पक्ष अधिकृत सेवा',
        contentEn:
          'We partner with enterprise-grade infrastructure providers: Clerk (Identity & Two-Factor Authentication), Supabase (PostgreSQL Cloud Backup), and Resend (Automated Transactional Email Alerts). These partners maintain strict global privacy and security compliance.',
        contentMr:
          'आम्ही सुरक्षिततेसाठी विश्वासू सेवा वापरतो: Clerk (लॉगिन व सुरक्षा), Supabase (क्लाउड बॅकअप) आणि Resend (ईमेल सूचना). हे सर्व प्रदाते आंतरराष्ट्रीय डेटा सुरक्षेचे काटेकोर पालन करतात.',
      },
      {
        headingEn: '5. User Rights, Export & Deletion',
        headingMr: '५. वापरकर्त्यांचे अधिकार व डेटा निष्कासन',
        contentEn:
          'Educators can export their complete register at any time in Excel (.xlsx) and PDF formats. You may request account deletion or data correction by emailing support@mahaposhan.in.',
        contentMr:
          'मुख्याध्यापक आणि शिक्षक त्यांच्या नोंदी कधीही Excel आणि PDF स्वरूपात डाऊनलोड करू शकतात. खाते हटवण्यासाठी किंवा दुरुस्तीसाठी support@mahaposhan.in वर संपर्क साधता येईल.',
      },
    ],
  },
  refund: {
    id: 'refund',
    titleEn: 'Refund & Cancellation Policy',
    titleMr: 'परतावा व रद्द करणे धोरण',
    version: CURRENT_REFUND_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    summary:
      'महापोषण रजिस्टर डिजिटल सेवांसाठी परतावा (Refund) आणि सदस्यत्व रद्द करण्याबाबतचे नियम.',
    sections: [
      {
        headingEn: '1. Nature of Digital Cloud Service',
        headingMr: '१. डिजिटल सॉफ्टवेअर सेवेचे स्वरूप',
        contentEn:
          'MahaPoshan Register is a digital SaaS (Software-as-a-Service) platform providing instant cloud access, automated register generation, and official government-compliant report printing upon activation.',
        contentMr:
          'महापोषण रजिस्टर हे एक डिजिटल क्लाउड सॉफ्टवेअर आहे. खाते सक्रिय होताच तात्काळ संपूर्ण नोंदवही प्रणाली, रिपोर्ट जनरेशन आणि प्रिंट सुविधा वापरता येते.',
      },
      {
        headingEn: '2. 7-Day Money-Back Satisfaction Guarantee',
        headingMr: '२. ७ दिवसांची मनी-बॅक समाधान हमी',
        contentEn:
          'If you face persistent technical failure that prevents generating your monthly register, or if you are not satisfied within 7 days of initial paid activation, you are entitled to request a 100% refund without hidden penalties.',
        contentMr:
          'सशुल्क सदस्यत्व सुरू झाल्यापासून ७ दिवसांच्या आत सॉफ्टवेअरमध्ये काही तांत्रिक अडचण आल्यास किंवा समाधान न झाल्यास १००% परतावा (Full Refund) मागण्याचा अधिकार आहे.',
      },
      {
        headingEn: '3. Refund Request Procedure & Timeline',
        headingMr: '३. परतावा मागणी प्रक्रिया व कालावधी',
        contentEn:
          'To request a cancellation and refund, send an email to support@mahaposhan.in with your School Name, UDISE Number, and payment transaction reference. Approved refunds are credited back to the original payment source (UPI / Bank Account) within 5 to 7 business days.',
        contentMr:
          'परताव्यासाठी शाळेचे नाव, UDISE क्रमांक आणि पेमेंट संदर्भ support@mahaposhan.in वर पाठवावा. पडताळणीनंतर ५ ते ७ कामकाजाच्या दिवसांत मूळ UPI किंवा बँक खात्यात रक्कम जमा केली जाते.',
      },
      {
        headingEn: '4. Subscription Cancellation',
        headingMr: '४. सदस्यत्व रद्द करणे',
        contentEn:
          'Users may discontinue service at any time. Once cancelled, access will remain active until the end of the current billing cycle, after which no further charges will apply.',
        contentMr:
          'वापरकर्ते कधीही आपली सेवा बंद करू शकतात. रद्द केल्यानंतर चालू मुदत संपेपर्यंत सेवा सुरू राहील, त्यानंतर पुढील कोणतेही शुल्क आकारले जाणार नाही.',
      },
    ],
  },
  contact: {
    id: 'contact',
    titleEn: 'Contact / Legal Information',
    titleMr: 'संपर्क व कायदेशीर माहिती',
    version: 'v1.0',
    lastUpdated: LEGAL_LAST_UPDATED,
    summary:
      'महापोषण रजिस्टरचे अधिकृत संपर्क पत्ते, तक्रार निवारण अधिकारी व कायदेशीर माहिती.',
    sections: [
      {
        headingEn: '1. Operating Entity & Commercial Identity',
        headingMr: '१. व्यावसायिक संस्था व ओळख',
        contentEn:
          'MahaPoshan Register is developed and maintained by MahaPoshan Software Solutions, dedicated to digitalizing Maharashtra primary school nutritional administration under PM POSHAN.',
        contentMr:
          'महापोषण रजिस्टर ही प्रणाली महाराष्ट्र प्राथमिक शाळांच्या शालेय पोषण आहार कारभाराचे डिजिटलायझेशन करण्यासाठी समर्पित आहे.',
      },
      {
        headingEn: '2. Customer Support & Operational Enquiries',
        headingMr: '२. ग्राहक सेवा व तांत्रिक मदत',
        contentEn:
          '• Official Support & Administrator Email: poshanregister@gmail.com\n• Helpline WhatsApp / Phone: +91 98220 00000 / +91 94230 00000\n• Working Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST',
        contentMr:
          '• अधिकृत सपोर्ट व ॲडमिन ईमेल: poshanregister@gmail.com\n• व्हॉट्सॲप / फोन हेल्पलाइन: +91 98220 00000 / +91 94230 00000\n• वेळ: सोमवार ते शनिवार, सकाळी ९ ते संध्याकाळी ६',
      },
      {
        headingEn: '3. Grievance Officer & Legal Notice Address',
        headingMr: '३. तक्रार निवारण अधिकारी व कायदेशीर पत्ता',
        contentEn:
          'In accordance with Information Technology Act 2000 and rules made thereunder, the Grievance Officer for the website is:\n• Name: Designated Compliance Officer\n• Address: Maharashtra, India\n• Email: poshanregister@gmail.com',
        contentMr:
          'माहिती तंत्रज्ञान कायदा २००० च्या नियमांनुसार तक्रार निवारण अधिकारी:\n• नाव: अनुपालन अधिकारी\n• पत्ता: महाराष्ट्र, भारत\n• ईमेल: poshanregister@gmail.com',
      },
    ],
  },
};
