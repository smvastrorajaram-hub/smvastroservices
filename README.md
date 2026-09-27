# SMV HOROSCOPE — Online

## ONLINE
ONLINE கோப்புறையில் `npm ci`, பின்னர் `npm start`. `http://localhost:8158` திறக்கவும். Node 20 அல்லது அதற்கு மேல் தேவை. இந்தப் பதிப்பிற்கு Node கணிப்பு server இயங்க வேண்டும்; public/index.html மட்டும் போதாது. முன்பிருந்த கணிப்பு source மற்றும் dependency கோப்புகள் இணைக்கப்பட்டுள்ளன.

## மாற்றங்கள்
- தமிழ் / English மொழித் தேர்வு; ஒரே புதிய horoscope layout.
- ஒன்பது Advanced Analysis பகுதிகளும் முழுமையாக உருவான பிறகே result வெளியிடப்படும்.
- நட்சத்திர மொழிபெயர்ப்பு பட்டியலின் duplicate காரணமான பெயர் மாற்றம் / undefined திருத்தம்.
- தமிழ் அவஸ்தை விளக்கங்கள் 108, கோச்சார விளக்கங்கள் 84 மற்றும் பிற தலைப்புகள், மந்திர உரைகள் மொழியாக்கம்.
- புதிய தனித்தனி desktop/mobile மதுரை வீரன் படங்கள்; மையப்படுத்தப்பட்ட header, header/footer பின்னணி.
- PWA manifest, icon, service worker.
- புதிய MutationObserver சேர்க்கப்படவில்லை. Firebase தேவையில்லை.
