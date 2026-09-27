# SMV HOROSCOPE — Offline தமிழ் / English

## பயன்படுத்துவது
ZIP-ஐ extract செய்து SMV-HOROSCOPE folder-ஐ HTTPS hosting அல்லது localhost server மூலம் திறக்கவும். index.html-ஐ file:// மூலம் double-click செய்வது offline engine/PWA-க்கு ஏற்ற முறை அல்ல.

முதலில் இணைய இணைப்புடன் பக்கத்தைத் திறந்து “Ready for offline use” (தமிழில் அதற்குரிய செய்தி) வரும் வரை காத்திருக்கவும். பின்னர் இணையம் இல்லாமலும் பயன்படுத்தலாம். Header-ல் தமிழ் / English தேர்வு உள்ளது. Install button தேர்ந்தெடுத்த மொழியில் வழிகாட்டும். Browser/OS வழங்கும் native installation dialog மொழி சாதன அமைப்பைப் பொறுத்தது.

## உள்ளடக்கம்
புதிய Horoscope style; பிரார்த்தனை முதல் முடிவுகள் வரை இரு மொழிகள்; ஒன்பது advanced analysis பகுதிகள்; தனித்தனி புதிய desktop/mobile மதுரை வீரன் hero படங்கள்; header/footer background; PWA icons; உள்ளூர் offline calculation engine மற்றும் data.

இந்திய இடங்களுக்கான offline search உள்ளது. பிற நாடுகளுக்கு இடப்பெயர், latitude, longitude மற்றும் பிறந்த நாளுக்கான சரியான UTC offset (DST இருந்தால் அதையும் சேர்த்து) வழங்கவும். ஆதரிக்கப்படும் input வருடங்கள்: 1800–2399. பயனர் பெயர்கள், இடப்பெயர்கள் மற்றும் அவற்றிலிருந்து பெறப்பட்ட initials உள்ளீட்டின்படியே இருக்கும்.

## இறுதி மறு சோதனை
20 வெவ்வேறு பிறந்த தேதி, நேரம், இடங்கள் × 2 மொழிகள் = 40/40 offline சோதனைகள் PASS. ஒவ்வொன்றிலும் 9 advanced பகுதிகள் பரிசோதிக்கப்பட்டன. Application மொழிக் கலப்பு 0; browser errors 0. Expanded dasa, offline reload, உள்ளூர் place search, localized install instructions, subdirectory scope, mobile/desktop width சோதனைகள் PASS. Native OS app installation நேரடியாக சோதிக்கப்படவில்லை.

இது குறிப்பிட்ட 20 உள்ளீடுகளுக்கான சோதனை; எல்லா பிறந்த தேதிகளுக்குமான கணிதத் துல்லியத்தை நிரூபிப்பதாகக் கருத வேண்டாம். மூலத்தில் இருந்த சுருக்கமான மந்திரங்கள் அப்படியே உள்ளன.

AUDIT folder-ல் சோதனைப் பதிவுகள் உள்ளன. அவற்றில் online smoke-test விவரங்களும் முந்தைய ஒருங்கிணைந்த பதிப்பின் பதிவாக இருக்கலாம்; இந்த ZIP offline பதிப்பு மட்டுமே. Tested program files மாற்றமின்றி சேர்க்கப்பட்டுள்ளன. மூல engine-ன் license notices இணைக்கப்பட்டுள்ளன.
