/* SMV ASTRO — conservative offline/static prediction baseline.
 * Source-guided house-lord placement modifiers. These APPEND contextual nuance
 * to the native D1 reading; they do not replace it or promise events.
 * The live online rule set is admin-published in smv_content/prediction_rules_v1.
 * An empty/unpublished Firestore document falls back to this reviewed snapshot.
 * This starter pack is not a complete five-book rule implementation.
 */
window.SMVPUBLISHED_PREDICTION_RULES = [
  {
    "id": "h1_lord_dusthana_context_v1",
    "title": "Source-guided · House 1 lord in 6/8/12",
    "channel": "natal",
    "house": 1,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.1.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "தன்மை, உடல் நலம் சார்ந்த பழக்கங்கள், தொடக்க முயற்சிகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of identity, vitality-related habits and new beginnings occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h1_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 1 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 1,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.1.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "தன்மை, உடல் நலம் சார்ந்த பழக்கங்கள், தொடக்க முயற்சிகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of identity, vitality-related habits and new beginnings occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h2_lord_dusthana_context_v1",
    "title": "Source-guided · House 2 lord in 6/8/12",
    "channel": "natal",
    "house": 2,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.2.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "குடும்பம், பேச்சு, சேமிப்பு மற்றும் தனிப்பட்ட மதிப்புகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of family, speech, savings and personal values occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h2_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 2 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 2,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.2.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "குடும்பம், பேச்சு, சேமிப்பு மற்றும் தனிப்பட்ட மதிப்புகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of family, speech, savings and personal values occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h3_lord_dusthana_context_v1",
    "title": "Source-guided · House 3 lord in 6/8/12",
    "channel": "natal",
    "house": 3,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.3.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "முயற்சி, திறன்கள், தொடர்பாடல் மற்றும் உடன்பிறப்புகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of effort, skills, communication and siblings occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h3_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 3 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 3,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.3.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "முயற்சி, திறன்கள், தொடர்பாடல் மற்றும் உடன்பிறப்புகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of effort, skills, communication and siblings occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h4_lord_dusthana_context_v1",
    "title": "Source-guided · House 4 lord in 6/8/12",
    "channel": "natal",
    "house": 4,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.4.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வீடு, கல்வி, மனநிம்மதி மற்றும் சொத்து தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of home, education, emotional comfort and property occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h4_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 4 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 4,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.4.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வீடு, கல்வி, மனநிம்மதி மற்றும் சொத்து தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of home, education, emotional comfort and property occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h5_lord_dusthana_context_v1",
    "title": "Source-guided · House 5 lord in 6/8/12",
    "channel": "natal",
    "house": 5,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.5.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "கல்வி, படைப்பாற்றல், அறிவு மற்றும் குழந்தைகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of education, creativity, intelligence and children occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h5_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 5 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 5,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.5.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "கல்வி, படைப்பாற்றல், அறிவு மற்றும் குழந்தைகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of education, creativity, intelligence and children occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h6_lord_dusthana_context_v1",
    "title": "Source-guided · House 6 lord in 6/8/12",
    "channel": "natal",
    "house": 6,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.6.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வேலைச் சூழல், போட்டி, கடன் மற்றும் பொறுப்புகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of work routines, competition, debts and obligations occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h6_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 6 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 6,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.6.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வேலைச் சூழல், போட்டி, கடன் மற்றும் பொறுப்புகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of work routines, competition, debts and obligations occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h7_lord_dusthana_context_v1",
    "title": "Source-guided · House 7 lord in 6/8/12",
    "channel": "natal",
    "house": 7,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.7.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "திருமணம், நெருங்கிய உறவுகள் மற்றும் கூட்டாண்மை தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of marriage, close relationships and partnerships occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h7_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 7 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 7,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.7.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "திருமணம், நெருங்கிய உறவுகள் மற்றும் கூட்டாண்மை தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of marriage, close relationships and partnerships occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h8_lord_dusthana_context_v1",
    "title": "Source-guided · House 8 lord in 6/8/12",
    "channel": "natal",
    "house": 8,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.8.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "மாற்றங்கள், பகிரப்பட்ட வளங்கள் மற்றும் நீண்டகாலத் திட்டமிடல் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of transitions, shared resources and long-term planning occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h8_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 8 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 8,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.8.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "மாற்றங்கள், பகிரப்பட்ட வளங்கள் மற்றும் நீண்டகாலத் திட்டமிடல் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of transitions, shared resources and long-term planning occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h9_lord_dusthana_context_v1",
    "title": "Source-guided · House 9 lord in 6/8/12",
    "channel": "natal",
    "house": 9,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.9.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "உயர்கல்வி, நம்பிக்கைகள், வழிகாட்டிகள் மற்றும் பயணங்கள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of higher learning, beliefs, mentors and journeys occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h9_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 9 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 9,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.9.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "உயர்கல்வி, நம்பிக்கைகள், வழிகாட்டிகள் மற்றும் பயணங்கள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of higher learning, beliefs, mentors and journeys occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h10_lord_dusthana_context_v1",
    "title": "Source-guided · House 10 lord in 6/8/12",
    "channel": "natal",
    "house": 10,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.10.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "தொழில், பொறுப்புகள், அங்கீகாரம் மற்றும் பொது நிலை தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of career, responsibility, recognition and public standing occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h10_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 10 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 10,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.10.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "தொழில், பொறுப்புகள், அங்கீகாரம் மற்றும் பொது நிலை தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of career, responsibility, recognition and public standing occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h11_lord_dusthana_context_v1",
    "title": "Source-guided · House 11 lord in 6/8/12",
    "channel": "natal",
    "house": 11,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.11.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வருமானம், ஆதாயங்கள், நட்பு வட்டம் மற்றும் இலக்குகள் தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of income, gains, networks and ambitions occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h11_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 11 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 11,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.11.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "வருமானம், ஆதாயங்கள், நட்பு வட்டம் மற்றும் இலக்குகள் தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of income, gains, networks and ambitions occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h12_lord_dusthana_context_v1",
    "title": "Source-guided · House 12 lord in 6/8/12",
    "channel": "natal",
    "house": 12,
    "priority": 20,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.12.lordHouse",
        "op": "in",
        "value": [
          6,
          8,
          12
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "செலவுகள், ஓய்வு, தனிமை மற்றும் உள்முனைவு தொடர்பான பாவாதிபதி 6, 8 அல்லது 12-ஆம் பாவத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. பாரம்பரிய வாசிப்பில் இது அந்தத் துறையில் கூடுதல் முயற்சி, பொறுப்பு அல்லது மாற்றங்களைச் சுட்டும் ஒரு காரணி மட்டுமே; மறுப்பு அல்லது தவிர்க்க முடியாத துன்பம் என்று பொருள் கொள்ளக்கூடாது. அதிபதியின் ராசி பலம், பார்வைகள், இணைவு, வர்க்க ஆதாரம் மற்றும் நடப்பு தசையுடன் சேர்த்தே முடிவு செய்ய வேண்டும்.",
      "en": "The calculated lord of expenses, rest, solitude and inner development occupies the 6th, 8th or 12th house. In a traditional reading this is one factor for extra effort, obligations or change in this area—not a denial or an inevitable adverse event. Weigh the lord's sign dignity, aspects, conjunctions, divisional support and operating Dasa before reaching a conclusion."
    },
    "intent": "house_lord_placement_context"
  },
  {
    "id": "h12_lord_kendra_trikona_context_v1",
    "title": "Source-guided · House 12 lord in Kendra/Trikona",
    "channel": "natal",
    "house": 12,
    "priority": 10,
    "enabled": true,
    "sourceSection": "I",
    "conditions": [
      {
        "field": "house.12.lordHouse",
        "op": "in",
        "value": [
          1,
          4,
          5,
          7,
          9,
          10
        ]
      }
    ],
    "effect": {
      "mode": "append",
      "ta": "செலவுகள், ஓய்வு, தனிமை மற்றும் உள்முனைவு தொடர்பான பாவாதிபதி கேந்திரம் அல்லது திரிகோணத்தில் இருப்பதாகக் கணக்கிடப்பட்டுள்ளது. இது அந்தத் துறைக்கான வாய்ப்புகளை நேரடியாகச் செயல்படுத்த உதவும் ஆதரவுக் காரணியாகப் படிக்கலாம்; பலன் உறுதி என்று பொருளல்ல. அதிபதியின் ராசி நிலை, சுப/பாபப் பார்வைகள், எதிர்ச் சான்றுகள் மற்றும் தசை காலத்தையும் இணைத்துப் பார்க்க வேண்டும்.",
      "en": "The calculated lord of expenses, rest, solitude and inner development occupies a Kendra or Trikona. This may provide a more direct channel for the matters of this house, but it is not a guaranteed outcome. Consider the lord's dignity, benefic and malefic aspects, counter-evidence and the running Dasa together."
    },
    "intent": "house_lord_placement_context"
  }
];
