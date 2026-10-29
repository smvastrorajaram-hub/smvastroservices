'use strict';

(function attachChatModeration(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else if (root) {
    root.SMVChatModeration = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createChatModeration() {
  const WARNING =
    'Please remove abusive words before sending. / कृपया गाली वाले शब्द हटाएँ। / கெட்ட வார்த்தைகளை நீக்கவும்.';

  // Whole-word matching is intentional: ordinary words containing short letter
  // sequences (for example "assistant" or "class") must not be blocked.
  const BLOCKED_TERMS = Object.freeze([
    // English profanity / direct verbal abuse.
    'fuck', 'fucked', 'fucker', 'fuckers', 'fucking', 'motherfucker',
    'motherfuckers', 'motherfucking', 'shit', 'shitty', 'bullshit',
    'bitch', 'bitches', 'bitching', 'bastard', 'bastards',
    'asshole', 'assholes', 'arsehole', 'arseholes', 'cunt', 'cunts',
    'dick', 'dicks', 'dickhead', 'dickheads', 'cock', 'cocks',
    'pussy', 'pussies', 'whore', 'whores', 'slut', 'sluts',
    'faggot', 'faggots', 'retard', 'retarded', 'idiot', 'idiots',
    'moron', 'morons', 'son of a bitch',

    // Tamil profanity in Tamil script.
    'தேவடியா', 'தேவிடியா', 'தேவிடியாள்', 'தாயோளி', 'தாயோலி',
    'புண்டை', 'புண்டமவன்', 'புண்டமவனே', 'சுன்னி', 'சூத்து',
    'கூதி', 'ஒத்தா', 'ஓத்தா', 'ஒம்மால', 'ஓம்மால', 'வேசி',

    // Common Tanglish spellings.
    'thevidiya', 'thevdiya', 'devadiya', 'devdiya',
    'thayoli', 'thaayoli', 'pundai', 'pundamavan', 'pundamavane',
    'sunni', 'soothu', 'koothi', 'otha', 'oththa', 'ootha',
    'ommala', 'ommaala', 'vesi',

    // Hindi profanity in Devanagari script.
    'मादरचोद', 'मदरचोद', 'बहनचोद', 'भेनचोद', 'भोसड़ीके',
    'भोसड़ी', 'चूतिया', 'चूतिये', 'चूत', 'गांडू', 'गांड',
    'लंड', 'लौड़ा', 'लौड़े', 'रंडी', 'हरामी', 'कमीना', 'कमीने',
    'माँ की चूत', 'मां की चूत', 'बहन के लौड़े',

    // Common Hinglish spellings and commonly used variants.
    'madarchod', 'maderchod', 'madarch0d', 'madarchood',
    'bhenchod', 'behenchod', 'bahanchod', 'bhainchod',
    'bhosdike', 'bhosdi', 'bhosadi', 'bhosadike',
    'chutiya', 'chutiye', 'chutia', 'chutiyapa', 'chodu',
    'gaand', 'gand', 'gandu', 'gaandu', 'lund', 'lauda', 'laude',
    'loda', 'lawda', 'lawde', 'randi', 'randwa', 'harami',
    'kamina', 'kameena', 'maa ki chut', 'ma ki chut',
    'behen ke lode', 'bahan ke lode'
  ]);

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu, '')
      .trim();
  }

  function escapeRegExp(value) {
    return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
  }

  // Allow punctuation or whitespace between letters to catch simple evasions
  // such as "f.u.c.k", "p u n d a i" and "m a d a r c h o d".
  // Script-aware word boundaries keep matches from firing inside normal words.
  const separator = '[\\s\\p{P}\\p{S}\\p{Cf}_]*';
  const patterns = BLOCKED_TERMS.map(term => {
    const compact = normalize(term).replace(/[\s\p{P}\p{S}\p{Cf}_]+/gu, '');
    const body = Array.from(compact).map(escapeRegExp).join(separator);
    return new RegExp('(?<![\\p{L}\\p{M}\\p{N}])' + body + '(?![\\p{L}\\p{M}\\p{N}])', 'iu');
  });

  function inspectMessageText(value) {
    const text = normalize(value);
    if (!text) return { allowed: false, reason: 'empty', message: 'Enter a message before sending.' };
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { allowed: false, reason: 'abusive_language', message: WARNING };
      }
    }
    return { allowed: true, reason: '', message: '' };
  }

  return Object.freeze({ inspectMessageText, WARNING });
});
