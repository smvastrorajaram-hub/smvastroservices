/* SMV ASTRO site language switch.
   This file belongs only to smvastroservices.in. It deliberately uses a
   separate preference key from the SMV HOROSCOPE and SMV CALENDAR apps. */
(function () {
  "use strict";

  const STORAGE_KEY = "smv-astro-site-language-v1";
  const EN_TO_TA = Object.freeze({
    "SMV ASTRO SERVICES | Astrology Services & Online Horoscope": "SMV ASTRO சேவைகள் | ஜோதிட சேவைகள் மற்றும் இணைய ஜாதகம்",
    "Sri Madurai Veerayah Astro Services": "ஸ்ரீ மதுரை வீரய்யா ஜோதிட சேவைகள்",
    "SMV ASTRO Home": "SMV ASTRO முகப்பு",
    "Website language": "இணையதள மொழி",
    "Switch to Tamil": "தமிழுக்கு மாற்று",
    "Switch to English": "ஆங்கிலத்திற்கு மாற்று",
    "Home": "முகப்பு",
    "Blog": "வலைப்பதிவு",
    "Calendar": "நாட்காட்டி",
    "Dashboard": "கட்டுப்பாட்டுப் பலகை",
    "Admin": "நிர்வாகம்",
    "Login": "உள்நுழை",
    "Register": "பதிவு செய்க",
    "Traditional Wisdom.": "மரபு ஞானம்.",
    "Personal Guidance.": "தனிப்பட்ட வழிகாட்டல்.",
    "Rooted in Tradition.": "மரபில் வேரூன்றிய.",
    "Guidance for Life.": "வாழ்க்கைக்கான வழிகாட்டல்.",
    "Discover the meaning within your birth chart through traditional Vedic astrology. Explore detailed horoscope insights and connect with approved astrologers for guidance on career, marriage, relationships and personal growth.": "பாரம்பரிய வேத ஜோதிடத்தின் மூலம் உங்கள் ஜாதகத்தின் அர்த்தத்தை அறியுங்கள். தொழில், திருமணம், உறவுகள் மற்றும் தனிப்பட்ட முன்னேற்றம் குறித்து வழிகாட்ட, அங்கீகரிக்கப்பட்ட ஜோதிடர்களை அணுகுங்கள்.",
    "Bring your questions, explore your possibilities and approach life’s important decisions with a thoughtful perspective grounded in tradition.": "உங்கள் கேள்விகளை முன்வைத்து, சாத்தியங்களை ஆராய்ந்து, மரபு சார்ந்த சிந்தனையுடன் வாழ்க்கையின் முக்கிய முடிவுகளை அணுகுங்கள்.",
    "At Sri Madurai Veerayah Astro Services, we bring the rich tradition of Vedic astrology into a clear and accessible online experience. Explore your birth chart, understand planetary influences and discover perspectives on the patterns and possibilities that shape your journey.": "ஸ்ரீ மதுரை வீரய்யா ஜோதிட சேவைகள் மூலம் வேத ஜோதிட மரபை எளிமையாக இணையத்தில் அறியலாம். உங்கள் ஜாதகத்தை ஆராய்ந்து, கிரகங்களின் தாக்கங்களைப் புரிந்துகொண்டு, வாழ்க்கைப் பாதையின் சாத்தியங்களைப் பற்றிய பார்வைகளைப் பெறுங்கள்.",
    "Whether your questions concern career, relationships, marriage, family or personal growth, connect with approved astrologers for individual guidance. Our detailed horoscope tools and personal consultations help you reflect on important choices with greater awareness and a deeper connection to traditional wisdom.": "தொழில், உறவுகள், திருமணம், குடும்பம் அல்லது தனிப்பட்ட முன்னேற்றம் பற்றிய கேள்விகளுக்கு அங்கீகரிக்கப்பட்ட ஜோதிடர்களிடம் தனிப்பட்ட வழிகாட்டலைப் பெறுங்கள். எங்கள் ஜாதகக் கருவிகளும் ஆலோசனைச் சேவைகளும் முக்கிய முடிவுகளை தெளிவாகச் சிந்திக்க உதவும்.",
    "Ask a Question": "கேள்வி கேளுங்கள்",
    "Create Horoscope": "ஜாதகம் உருவாக்கு",
    "Approved Astrologers": "அங்கீகரிக்கப்பட்ட ஜோதிடர்கள்",
    "Private & Secure": "தனியுரிமை மற்றும் பாதுகாப்பு",
    "Traditional Vedic Guidance": "பாரம்பரிய வேத ஜோதிட வழிகாட்டல்",
    "Get personalized answers from approved astrologers.": "அங்கீகரிக்கப்பட்ட ஜோதிடர்களிடமிருந்து தனிப்பட்ட பதில்களைப் பெறுங்கள்.",
    "Accurate Vedic calculations with detailed analysis.": "விரிவான ஆய்வுடன் துல்லியமான வேத ஜோதிடக் கணக்கீடுகள்.",
    "Consult an Astrologer": "ஜோதிடரை அணுகுங்கள்",
    "Connect with approved and experienced astrologers.": "அங்கீகரிக்கப்பட்ட அனுபவமுள்ள ஜோதிடர்களை அணுகுங்கள்.",
    "Read Our Blog": "எங்கள் வலைப்பதிவைப் படியுங்கள்",
    "Insights, remedies and astrology knowledge.": "ஜோதிடக் கருத்துகள், பரிகாரங்கள் மற்றும் அறிவைப் பெறுங்கள்.",
    "Install SMV ASTRO App": "SMV ASTRO செயலியை நிறுவுங்கள்",
    "Install SMV ASTRO on your phone and use it like an app from your Home Screen.": "SMV ASTRO-வை உங்கள் கைப்பேசியில் நிறுவி முகப்புத் திரையிலிருந்து செயலியைப் போலப் பயன்படுத்துங்கள்.",
    "INSTALL APP": "செயலியை நிறுவு",
    "PRIVATE ASTROLOGY CONSULTATION": "தனிப்பட்ட ஜோதிட ஆலோசனை",
    "Have a Question About Your Life?": "உங்கள் வாழ்க்கை குறித்து கேள்வி உள்ளதா?",
    "Ask a personal astrology question and receive thoughtful guidance based on your birth details. Your question is handled privately by our astrology service.": "உங்கள் பிறப்பு விவரங்களின் அடிப்படையில் தனிப்பட்ட ஜோதிடக் கேள்வியைக் கேட்டு வழிகாட்டலைப் பெறுங்கள். உங்கள் கேள்வி ரகசியமாகக் கையாளப்படும்.",
    "Login is required before you submit your question.": "கேள்வியைச் சமர்ப்பிக்க முன் உள்நுழைய வேண்டும்.",
    "ASK NOW": "இப்போதே கேளுங்கள்",
    "Consultation topics": "ஆலோசனைத் தலைப்புகள்",
    "Career": "தொழில்",
    "Marriage": "திருமணம்",
    "Health": "உடல்நலம்",
    "Finance": "நிதி",
    "Property": "சொத்து",
    "Education": "கல்வி",
    "Spirituality": "ஆன்மிகம்",
    "Marriage Matching": "திருமணப் பொருத்தம்",
    "Reviewed profiles": "சரிபார்க்கப்பட்ட சுயவிவரங்கள்",
    "Private Consultations": "தனிப்பட்ட ஆலோசனைகள்",
    "Question-focused workflow": "கேள்வி அடிப்படையிலான சேவை",
    "Vedic Horoscope": "வேத ஜாதகம்",
    "Detailed calculations": "விரிவான கணக்கீடுகள்",
    "Secure Payments": "பாதுகாப்பான கட்டணங்கள்",
    "Integrated payment flow": "ஒருங்கிணைந்த கட்டண முறை",
    "SMV ASTRO CONTENT": "SMV ASTRO உள்ளடக்கம்",
    "Astrology Insights & Media": "ஜோதிடத் தகவல்கள் மற்றும் ஊடகம்",
    "Blogs": "வலைப்பதிவுகள்",
    "Media": "ஊடகம்",
    "Blogs load when this section is opened.": "இந்தப் பகுதியைத் திறக்கும்போது வலைப்பதிவுகள் ஏற்றப்படும்.",
    "Media loads when this section is opened.": "இந்தப் பகுதியைத் திறக்கும்போது ஊடகங்கள் ஏற்றப்படும்.",
    "ABOUT SMV ASTRO": "SMV ASTRO பற்றி",
    "SMV ASTRO brings traditional Vedic astrology into an accessible online experience. Explore your horoscope using your birth details, learn through our astrology articles and connect with approved astrologers for personal consultations.": "பாரம்பரிய வேத ஜோதிடத்தை எளிதில் பயன்படுத்தக்கூடிய இணைய அனுபவமாக SMV ASTRO வழங்குகிறது. உங்கள் பிறப்பு விவரங்களைக் கொண்டு ஜாதகத்தை ஆராய்ந்து, கட்டுரைகள் மூலம் கற்றுக்கொண்டு, அங்கீகரிக்கப்பட்ட ஜோதிடர்களிடம் தனிப்பட்ட ஆலோசனையைப் பெறுங்கள்.",
    "Our service combines respect for tradition with clear, thoughtful guidance on the questions that matter to you.": "மரபுக்கு மதிப்பளித்தபடி, உங்களுக்கு முக்கியமான கேள்விகளில் தெளிவான வழிகாட்டலை எங்கள் சேவை வழங்குகிறது.",
    "Non-AI calculation & prediction method:": "AI அல்லாத கணக்கீடு மற்றும் பலன் கணிப்பு முறை:",
    "not AI-generated and not AI-calculated": "AI மூலம் உருவாக்கப்பட்டவையோ கணக்கிடப்பட்டவையோ அல்ல",
    "FREQUENTLY ASKED QUESTIONS": "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    "FAQ": "கேள்வி பதில்கள்",
    "How do I ask an astrology question?": "ஜோதிடக் கேள்வியை எப்படிக் கேட்பது?",
    "Login as a customer, choose Ask Your Questions, enter the birth details and question, then complete the secure payment flow.": "வாடிக்கையாளராக உள்நுழைந்து, கேள்வி கேட்கும் பகுதியைத் தேர்ந்தெடுத்து, பிறப்பு விவரங்களையும் கேள்வியையும் உள்ளிட்டு பாதுகாப்பான கட்டணத்தை நிறைவு செய்யுங்கள்.",
    "Are astrologers verified?": "ஜோதிடர்கள் சரிபார்க்கப்படுகிறார்களா?",
    "All astrologers are carefully reviewed and verified by SMV ASTRO before being approved for consultation services.": "ஆலோசனைக்கு அனுமதிப்பதற்கு முன் அனைத்து ஜோதிடர்களின் விவரங்களையும் SMV ASTRO சரிபார்க்கிறது.",
    "How can I contact SMV ASTRO?": "SMV ASTRO-வை எப்படித் தொடர்புகொள்வது?",
    "Use the Contact Us form to send your query directly.": "உங்கள் கேள்வியை நேரடியாக அனுப்ப Contact Us படிவத்தைப் பயன்படுத்துங்கள்.",
    "Do I need an account?": "கணக்கு தேவையா?",
    "An account is required for secure customer consultation features. You can create one from Customer Registration or the Login button.": "பாதுகாப்பான வாடிக்கையாளர் ஆலோசனைச் சேவைகளுக்கு கணக்கு தேவை. பதிவு அல்லது உள்நுழை பொத்தான் மூலம் கணக்கை உருவாக்கலாம்.",
    "When will I receive my astrology answer?": "ஜோதிடப் பதில் எப்போது கிடைக்கும்?",
    "Is there a refund or cancellation policy?": "பணம் திரும்பப்பெறுதல் அல்லது ரத்துசெய்தல் கொள்கை உள்ளதா?",
    "Are astrology answers guaranteed?": "ஜோதிடப் பலன்கள் உறுதியானவையா?",
    "How do offers and promotion codes work?": "சலுகைகள் மற்றும் விளம்பரக் குறியீடுகள் எவ்வாறு செயல்படுகின்றன?",
    "How does the ₹1 New Customer Welcome Offer work?": "₹1 புதிய வாடிக்கையாளர் வரவேற்புச் சலுகை எவ்வாறு செயல்படுகிறது?",
    "Are festival and seasonal offers available?": "திருவிழா மற்றும் பருவகாலச் சலுகைகள் கிடைக்குமா?",
    "How does astrologer qualification and auto approval work?": "ஜோதிடர் தகுதி மற்றும் தானியங்கி ஒப்புதல் எவ்வாறு செயல்படுகின்றன?",
    "Does SMV ASTRO use AI to calculate or generate astrology results?": "ஜோதிட முடிவுகளைக் கணக்கிட அல்லது உருவாக்க SMV ASTRO AI-ஐப் பயன்படுத்துகிறதா?",
    "What does SMV CALENDAR provide?": "SMV CALENDAR என்ன வழங்குகிறது?",
    "Can I use SMV CALENDAR in Tamil and English?": "SMV CALENDAR-ஐ தமிழ் மற்றும் ஆங்கிலத்தில் பயன்படுத்தலாமா?",
    "How does place search work in Horoscope and SMV CALENDAR?": "ஜாதகம் மற்றும் SMV CALENDAR-ல் இடத் தேடல் எவ்வாறு செயல்படுகிறது?",
    "What can I see before full Horoscope or Marriage Matching access is available?": "முழு ஜாதகம் அல்லது திருமணப் பொருத்த அணுகல் கிடைக்கும் முன் என்ன பார்க்கலாம்?",
    "Can full Horoscope or Marriage Matching require payment?": "முழு ஜாதகம் அல்லது திருமணப் பொருத்தத்திற்கு கட்டணம் தேவைப்படுமா?",
    "How are saved Horoscope and Marriage Matching reports handled?": "சேமித்த ஜாதகம் மற்றும் திருமணப் பொருத்த அறிக்கைகள் எவ்வாறு கையாளப்படுகின்றன?",
    "Does SMV ASTRO support offline use?": "SMV ASTRO-வை இணையமின்றிப் பயன்படுத்த முடியுமா?",
    "Are automated predictions the same as a personal astrologer consultation?": "தானியங்கி பலன்களும் ஜோதிடரின் தனிப்பட்ட ஆலோசனையும் ஒன்றா?",
    "What does “non-AI calculation and prediction” mean on SMV ASTRO?": "SMV ASTRO-வில் “AI அல்லாத கணக்கீடு மற்றும் பலன் கணிப்பு” என்பதன் பொருள் என்ன?",
    "Are my birth details or horoscope data sent to ChatGPT, OpenAI, Gemini or another generative-AI service?": "எனது பிறப்பு விவரங்கள் அல்லது ஜாதகத் தகவல்கள் ChatGPT, OpenAI, Gemini அல்லது வேறு உருவாக்கும் AI சேவைக்கு அனுப்பப்படுகிறதா?",
    "What affects the accuracy of an automated horoscope result?": "தானியங்கி ஜாதக முடிவின் துல்லியத்தை எவை பாதிக்கின்றன?",
    "Does changing Tamil / English create a new prediction?": "தமிழ் / ஆங்கிலம் மாற்றுவது புதிய பலனை உருவாக்குமா?",
    "Which parts still need an internet connection?": "எந்த அம்சங்களுக்கு இன்னும் இணைய இணைப்பு தேவை?",
    "Are Saved Reports the same as consultation records?": "சேமித்த அறிக்கைகளும் ஆலோசனைப் பதிவுகளும் ஒன்றா?",
    "Can I rely on an automated prediction for medical, legal or financial decisions?": "மருத்துவ, சட்ட அல்லது நிதி முடிவுகளுக்கு தானியங்கி பலன்களை நம்பலாமா?",
    "Choose Your Account Type": "உங்கள் கணக்கு வகையைத் தேர்ந்தெடுக்கவும்",
    "BEGIN YOUR JOURNEY WITH SMV ASTRO": "SMV ASTRO உடன் உங்கள் பயணத்தைத் தொடங்குங்கள்",
    "Register according to your purpose. Customer and Astrologer accounts are kept separate, with each journey designed for its own needs.": "உங்கள் தேவைக்கேற்ப பதிவு செய்யுங்கள். வாடிக்கையாளர் மற்றும் ஜோதிடர் கணக்குகள் தனித்தனியாகப் பராமரிக்கப்படும்.",
    "FOR SEEKERS OF GUIDANCE": "வழிகாட்டலை நாடுவோருக்கு",
    "Customer Registration": "வாடிக்கையாளர் பதிவு",
    "Create your private customer account to access the secure consultation area and choose an approved astrologer.": "பாதுகாப்பான ஆலோசனைப் பகுதியைப் பயன்படுத்தவும் அங்கீகரிக்கப்பட்ட ஜோதிடரைத் தேர்ந்தெடுக்கவும் தனிப்பட்ட வாடிக்கையாளர் கணக்கை உருவாக்குங்கள்.",
    "Register as Customer": "வாடிக்கையாளராகப் பதிவு செய்க",
    "FOR ASTROLOGY PROFESSIONALS": "ஜோதிடத் துறை நிபுணர்களுக்கு",
    "Astrologer Registration": "ஜோதிடர் பதிவு",
    "Apply to become an SMV ASTRO astrologer. Your professional profile will be reviewed before it becomes public.": "SMV ASTRO ஜோதிடராக இணைவதற்கு விண்ணப்பியுங்கள். உங்கள் தொழில்முறை சுயவிவரம் வெளியிடுவதற்கு முன் பரிசீலிக்கப்படும்.",
    "Register as Astrologer": "ஜோதிடராகப் பதிவு செய்க",
    "Private Consultation": "தனிப்பட்ட ஆலோசனை",
    "Choose an approved astrologer for a private consultation. The Chat Price shown below is set by Admin.": "தனிப்பட்ட ஆலோசனைக்கு அங்கீகரிக்கப்பட்ட ஜோதிடரைத் தேர்ந்தெடுக்கவும். கீழே காட்டப்படும் அரட்டை விலையை நிர்வாகம் நிர்ணயிக்கிறது.",
    "Loading approved astrologers...": "அங்கீகரிக்கப்பட்ட ஜோதிடர்கள் ஏற்றப்படுகின்றனர்...",
    "Private Consultation Question": "தனிப்பட்ட ஆலோசனைக் கேள்வி",
    "Your Name": "உங்கள் பெயர்",
    "Birth Date": "பிறந்த தேதி",
    "Birth Time": "பிறந்த நேரம்",
    "Birth Place": "பிறந்த இடம்",
    "Gender": "பாலினம்",
    "Select": "தேர்ந்தெடுக்கவும்",
    "Male": "ஆண்",
    "Female": "பெண்",
    "Other": "மற்றவை",
    "Your Question": "உங்கள் கேள்வி",
    "Promotion code (optional)": "விளம்பரக் குறியீடு (விருப்பம்)",
    "APPLY": "பயன்படுத்து",
    "PAY & SUBMIT": "செலுத்தி சமர்ப்பிக்கவும்",
    "← BACK": "← திரும்பு",
    "← Back": "← திரும்பு",
    "← Back to Home": "← முகப்புக்குத் திரும்பு",
    "Contact Us": "எங்களைத் தொடர்புகொள்ள",
    "Have a question? Send us your details and query. Our admin team will contact you soon.": "கேள்வி உள்ளதா? உங்கள் விவரங்களையும் கேள்வியையும் அனுப்புங்கள். எங்கள் குழு விரைவில் தொடர்புகொள்ளும்.",
    "Name": "பெயர்",
    "Email": "மின்னஞ்சல்",
    "Place / City": "இடம் / நகரம்",
    "Mobile Number": "கைபேசி எண்",
    "Query": "கேள்வி",
    "SEND QUERY": "கேள்வியை அனுப்பு",
    "SENDING...": "அனுப்பப்படுகிறது...",
    "Quick Links": "விரைவு இணைப்புகள்",
    "Our Services": "எங்கள் சேவைகள்",
    "Support": "உதவி",
    "Horoscope": "ஜாதகம்",
    "About Us": "எங்களைப் பற்றி",
    "Privacy Policy": "தனியுரிமைக் கொள்கை",
    "Terms & Conditions": "விதிமுறைகள் மற்றும் நிபந்தனைகள்",
    "Help & Support": "உதவி மற்றும் ஆதரவு",
    "Birth Chart Analysis": "ஜாதகக் கட்ட ஆய்வு",
    "Career Guidance": "தொழில் வழிகாட்டல்",
    "Health & Wellness": "உடல்நலம் மற்றும் நல்வாழ்வு",
    "Remedies & Solutions": "பரிகாரங்கள் மற்றும் தீர்வுகள்",
    "Personal Consultation": "தனிப்பட்ட ஆலோசனை",
    "GUIDING YOUR COSMIC JOURNEY": "உங்கள் பிரபஞ்சப் பயணத்திற்கு வழிகாட்டுகிறோம்",
    "Astrology for a Better Tomorrow": "சிறந்த நாளைக்கான ஜோதிடம்",
    "Let the Stars Guide You Towards": "நட்சத்திரங்கள் உங்களை வழிநடத்தட்டும்",
    "a Brighter Tomorrow": "ஒளிமயமான நாளை நோக்கி",
    "All Rights Reserved.": "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
    "TRADITIONAL WISDOM　|　MODERN GUIDANCE": "பாரம்பரிய ஞானம்　|　நவீன வழிகாட்டல்",
    "CUSTOMER DASHBOARD": "வாடிக்கையாளர் கட்டுப்பாட்டுப் பலகை",
    "ADMIN DASHBOARD": "நிர்வாகக் கட்டுப்பாட்டுப் பலகை",
    "SMV ASTRO administration and approval center": "SMV ASTRO நிர்வாகம் மற்றும் ஒப்புதல் மையம்",
    "Astrologer Applications": "ஜோதிடர் விண்ணப்பங்கள்",
    "Public Question Approval": "பொது கேள்வி ஒப்புதல்",
    "Private Consultation — Question Approval": "தனிப்பட்ட ஆலோசனை — கேள்வி ஒப்புதல்",
    "Private Consultation — Answers Awaiting Approval": "தனிப்பட்ட ஆலோசனை — ஒப்புதலுக்குக் காத்திருக்கும் பதில்கள்",
    "Recent Questions": "சமீபத்திய கேள்விகள்",
    "Customer Reviews": "வாடிக்கையாளர் மதிப்புரைகள்",
    "Admin Notifications": "நிர்வாக அறிவிப்புகள்",
    "Question Price": "கேள்விக் கட்டணம்",
    "SAVE PRICE": "கட்டணத்தைச் சேமி",
    "Loading questions...": "கேள்விகள் ஏற்றப்படுகின்றன...",
    "Loading reviews...": "மதிப்புரைகள் ஏற்றப்படுகின்றன...",
    "No public reviews yet. Be the first verified customer to share your experience.": "பொது மதிப்புரைகள் இன்னும் இல்லை. உங்கள் அனுபவத்தைப் பகிரும் முதல் சரிபார்க்கப்பட்ட வாடிக்கையாளராக இருங்கள்.",
    "No approved reviews for this astrologer yet.": "இந்த ஜோதிடருக்கு இன்னும் அங்கீகரிக்கப்பட்ட மதிப்புரைகள் இல்லை.",
    "Verified Reviews": "சரிபார்க்கப்பட்ட மதிப்புரைகள்",
    "Verified customer": "சரிபார்க்கப்பட்ட வாடிக்கையாளர்",
    "Professional astrologer": "தொழில்முறை ஜோதிடர்",
    "Experienced": "அனுபவமுள்ளவர்",
    "years experience": "ஆண்டுகள் அனுபவம்",
    "CLOSE": "மூடு",
    "TRY AGAIN": "மீண்டும் முயற்சி செய்க",
    "No appointment requests.": "சந்திப்பு கோரிக்கைகள் இல்லை.",
    "Loading appointment requests...": "சந்திப்பு கோரிக்கைகள் ஏற்றப்படுகின்றன...",
    "Loading content...": "உள்ளடக்கம் ஏற்றப்படுகிறது...",
    "Loading Admin notifications...": "நிர்வாக அறிவிப்புகள் ஏற்றப்படுகின்றன...",
    "Loading private consultations...": "தனிப்பட்ட ஆலோசனைகள் ஏற்றப்படுகின்றன...",
    "Loading private answers...": "தனிப்பட்ட பதில்கள் ஏற்றப்படுகின்றன...",
    "Loading applications...": "விண்ணப்பங்கள் ஏற்றப்படுகின்றன...",
    "Back to Home": "முகப்புக்குத் திரும்பு",
    "Astrology Services": "ஜோதிடச் சேவைகள்",
    "Full Name": "முழுப் பெயர்",
    "Password": "கடவுச்சொல்",
    "Mobile Number": "கைபேசி எண்",
    "Profile Photo": "சுயவிவரப் படம்",
    "Payment Method": "கட்டண முறை",
    "Bank Name": "வங்கியின் பெயர்",
    "Account Holder Name": "கணக்குதாரர் பெயர்",
    "Bank Account Number": "வங்கிக் கணக்கு எண்",
    "IFSC Code": "IFSC குறியீடு",
    "UPI ID (optional)": "UPI ID (விருப்பம்)",
    "SUBMIT REGISTRATION": "பதிவைச் சமர்ப்பிக்கவும்",
    "Ask Your Question": "உங்கள் கேள்வியைக் கேளுங்கள்",
    "Loading current question price...": "தற்போதைய கேள்விக் கட்டணம் ஏற்றப்படுகிறது...",
    "Birth Details": "பிறப்பு விவரங்கள்",
    "Enter the birth details of the person for whom you are asking the question.": "யாருக்காகக் கேள்வி கேட்கிறீர்களோ, அவருடைய பிறப்பு விவரங்களை உள்ளிடுங்கள்.",
    "Date of Birth": "பிறந்த தேதி",
    "Time of Birth": "பிறந்த நேரம்",
    "Place of Birth": "பிறந்த இடம்",
    "Gender (Optional)": "பாலினம் (விருப்பம்)",
    "Prefer not to say": "தெரிவிக்க விரும்பவில்லை",
    "Write your astrology question here...": "உங்கள் ஜோதிடக் கேள்வியை இங்கே எழுதுங்கள்...",
    "Proceed to Secure Payment": "பாதுகாப்பான கட்டணத்திற்குச் செல்லுங்கள்",
    "Your query has been submitted successfully. Our team will contact you soon.": "உங்கள் கேள்வி வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது. எங்கள் குழு விரைவில் தொடர்புகொள்ளும்.",
    "REQUEST APPOINTMENT": "சந்திப்பைக் கோருங்கள்",
    "Astrologer Profile Management": "ஜோதிடர் சுயவிவர மேலாண்மை",
    "Profile": "சுயவிவரம்",
    "Save": "சேமி",
    "Cancel": "ரத்துசெய்",
    "Submit": "சமர்ப்பி",
    "Search": "தேடு",
    "Loading...": "ஏற்றப்படுகிறது...",
    "Please wait...": "காத்திருக்கவும்...",
    "No data available.": "தரவு இல்லை.",
    "Price unavailable": "கட்டண விவரம் கிடைக்கவில்லை",
    "Unable to load this astrologer profile right now.": "இந்த நேரத்தில் ஜோதிடர் சுயவிவரத்தை ஏற்ற முடியவில்லை."
  });

  const TA_TO_EN = new Map();
  Object.keys(EN_TO_TA).forEach(function (english) {
    const tamil = EN_TO_TA[english];
    if (!TA_TO_EN.has(tamil)) TA_TO_EN.set(tamil, english);
  });

  let currentLanguage = "en";
  let observer = null;
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function getSavedLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "ta" ? "ta" : "en";
    } catch (_) {
      return "en";
    }
  }

  function preserveWhitespace(original, replacement) {
    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    return leading + replacement + trailing;
  }

  function replaceFromEnglish(original, language) {
    if (typeof original !== "string") return original;
    const key = original.trim();
    if (!key) return original;
    const replacement = language === "ta" ? EN_TO_TA[key] : key;
    return typeof replacement === "string" ? preserveWhitespace(original, replacement) : original;
  }

  function captureEnglishText(node) {
    if (originalText.has(node)) return originalText.get(node);
    const raw = node.nodeValue || "";
    const key = raw.trim();
    let base = raw;
    if (currentLanguage === "ta" && TA_TO_EN.has(key)) {
      base = preserveWhitespace(raw, TA_TO_EN.get(key));
    }
    originalText.set(node, base);
    return base;
  }

  function captureEnglishAttribute(element, name) {
    let values = originalAttributes.get(element);
    if (!values) {
      values = new Map();
      originalAttributes.set(element, values);
    }
    if (values.has(name)) return values.get(name);
    const raw = element.getAttribute(name) || "";
    const key = raw.trim();
    let base = raw;
    if (currentLanguage === "ta" && TA_TO_EN.has(key)) {
      base = preserveWhitespace(raw, TA_TO_EN.get(key));
    }
    values.set(name, base);
    return base;
  }

  function blockedTextNode(node) {
    const parent = node && node.parentElement;
    return !parent || !!parent.closest("script,style,noscript,textarea,pre,code,[contenteditable='true']");
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3 || blockedTextNode(node)) return;
    const base = captureEnglishText(node);
    const next = replaceFromEnglish(base, currentLanguage);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!element || element.nodeType !== 1) return;
    ["placeholder", "title", "aria-label", "aria-description", "alt"].forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      const base = captureEnglishAttribute(element, name);
      const next = replaceFromEnglish(base, currentLanguage);
      if (next !== element.getAttribute(name)) element.setAttribute(name, next);
    });
    if (element instanceof HTMLInputElement && /^(button|submit|reset)$/i.test(element.type)) {
      if (element.hasAttribute("value")) {
        const base = captureEnglishAttribute(element, "value");
        const next = replaceFromEnglish(base, currentLanguage);
        if (next !== element.getAttribute("value")) element.setAttribute("value", next);
      }
    }
  }

  function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root !== document.body) return;
    if (root.nodeType === 1) {
      if (root.matches("script,style,noscript,textarea,pre,code,[contenteditable='true']")) return;
      translateAttributes(root);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.querySelectorAll) {
      root.querySelectorAll("[placeholder],[title],[aria-label],[aria-description],[alt],input[type='button'],input[type='submit'],input[type='reset']").forEach(translateAttributes);
    }
  }

  function refreshLanguageButtons() {
    document.querySelectorAll("[data-smv-site-language]").forEach(function (button) {
      const selected = button.dataset.smvSiteLanguage === currentLanguage;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function applyLanguage(language, options) {
    const nextLanguage = language === "ta" ? "ta" : "en";
    const config = options || {};
    currentLanguage = nextLanguage;
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.smvAstroLanguage = nextLanguage;
    if (config.persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, nextLanguage); } catch (_) {}
    }
    if (document.body) translateSubtree(document.body);
    document.title = nextLanguage === "ta"
      ? EN_TO_TA["SMV ASTRO SERVICES | Astrology Services & Online Horoscope"]
      : "SMV ASTRO SERVICES | Astrology Services & Online Horoscope";
    refreshLanguageButtons();
    window.dispatchEvent(new CustomEvent("smv-astro-language-change", { detail: { language: nextLanguage } }));
  }

  function start() {
    if (!document.body) return;
    document.querySelectorAll("[data-smv-site-language]").forEach(function (button) {
      if (button.dataset.smvSiteLanguageBound === "1") return;
      button.dataset.smvSiteLanguageBound = "1";
      button.addEventListener("click", function () {
        applyLanguage(button.dataset.smvSiteLanguage);
      });
    });
    applyLanguage(getSavedLanguage(), { persist: false });
    if ("MutationObserver" in window) {
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "characterData") {
            translateTextNode(mutation.target);
          } else if (mutation.type === "attributes") {
            translateAttributes(mutation.target);
          } else {
            mutation.addedNodes.forEach(translateSubtree);
          }
        });
      });
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label", "aria-description", "alt", "value"]
      });
    }
  }

  window.__smvApplyAstroLanguage = applyLanguage;
  window.__smvGetAstroLanguage = function () { return currentLanguage; };
  window.__smvRefreshAstroLanguage = function () {
    if (document.body) translateSubtree(document.body);
    refreshLanguageButtons();
  };
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) applyLanguage(event.newValue === "ta" ? "ta" : "en", { persist: false });
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();