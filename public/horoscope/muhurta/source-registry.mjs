export const MUHURTA_SOURCES = Object.freeze({
  TML_VIDHANAMALAI_1900: Object.freeze({
    id:'TML_VIDHANAMALAI_1900', tradition:'tamil', role:'primary',
    title:'Vidhānamālai (விதானமாலை)', author:'Nārāyaṇasvāmi (catalogue attribution)',
    edition:'Ripon Press, Madras, 1900 print; catalogue records an 1881 first edition',
    language:'Tamil', catalogueUrl:'https://tamildigitallibrary.in/',
    textUrl:'https://jyotisha.vedicreader.com/',
    chapters:Object.freeze({
      panchangam:'2', gunagunam:'3', marriage:'11', childRites:'16', echchavinai:'25'
    }),
    notes:'Primary Tamil verse transcript. Exact printed-page and verse collation is still needed before all rules become decision-grade.'
  }),
  TML_KALAPRAKASHIKA_2014: Object.freeze({
    id:'TML_KALAPRAKASHIKA_2014',tradition:'tamil',role:'corroborating-primary-candidate',
    title:'Kālaprakāśikā (காலபிரகாசிகை)',author:'Traditional attribution; edition metadata from Sarasvati Mahal catalogue',
    edition:'Sarasvati Mahal Library, 2014, 7th edition, bilingual, 248 pages',
    language:'Tamil/English',catalogueUrl:'https://tamildigitallibrary.in/',
    accessibleTextUrl:'https://www.astrojyoti.com/wp-content/uploads/2019/09/Kalaprakasika_text.pdf',
    accessibleTextEdition:'N. P. Subramania Iyer English translation/reprint; 1917 first publication stated in scanned text; not collated against 2014 Tamil pages',
    notes:'Do not promote English translation-only details into an authoritative Tamil rule until matched to the Tamil edition.'
  }),
  TML_TTD_SUBHAKRUTHU_2022_23: Object.freeze({
    id:'TML_TTD_SUBHAKRUTHU_2022_23',tradition:'tamil',role:'published-panchanga-cross-check',
    title:'TTD Subhakṛtu Tamil Panchangam 2022–2023',
    edition:'Tirumala Tirupati Devasthanams, 2022–2023; Lahiri / Thirukanitha context',
    language:'Tamil',url:'https://www.tirumala.org/',
    notes:'Contemporary published Panchang, not a timeless annual rulebook. Use to compare practice and terminology only.'
  }),
  TML_KALAVIDHANAM: Object.freeze({
    id:'TML_KALAVIDHANAM',tradition:'tamil',role:'pending-primary',
    title:'Kālavidhānam (காலவிதானம்)',edition:'Specific independently inspectable edition not obtained in this audit',
    notes:'Mentioned in KAHE syllabus bibliography and in later Panchang practice. No rule is executable until exact edition and pages are checked.'
  }),
  PAN_MUHURTA_CINTAMANI_MUM: Object.freeze({
    id:'PAN_MUHURTA_CINTAMANI_MUM',tradition:'panIndian',role:'primary-text-witness',
    title:'Muhūrta Cintāmaṇi (मुहूर्तचिन्तामणिः)',author:'Rāma Daivajña',
    edition:'Maharishi University of Management Vedic Literature Collection Sanskrit text PDF; edition provenance and verse numbering need print-edition collation',
    language:'Sanskrit',url:'https://vedicreserve.miu.edu/jyotish/muhurta_cintamani.pdf',
    chapters:Object.freeze({general:'1',nakshatra:'2',samskara:'5',vivaha:'6',yatra:'11',vastu:'12',grihapravesha:'13'}),
    notes:'Original Sanskrit text witness. Page OCR may have errors; no automatic Unicode OCR should be taken as the only authority.'
  }),
  PAN_MUHURTA_CINTAMANI_1945: Object.freeze({
    id:'PAN_MUHURTA_CINTAMANI_1945',tradition:'panIndian',role:'printed-edition-check',
    title:'Muhūrta Cintāmaṇi',author:'Rāma Daivajña',
    edition:'Narayanram Acharya, Nirnaya Sagar Press, 1945; Sanskrit/Hindi, 484 pages',
    language:'Sanskrit/Hindi',url:'https://jainqq.org/booktext/002342/457',
    notes:'Scanned printed marriage-chapter page located. The electronic MUM text is not yet completely collated to this edition.'
  }),
  PAN_MUHURTA_MARTANDA: Object.freeze({
    id:'PAN_MUHURTA_MARTANDA',tradition:'panIndian',role:'corroborating-classical-pending',
    title:'Muhūrta Mārtaṇḍa (मुहूर्तमार्तण्ड)',author:'Nārāyaṇa Daivajña',
    edition:'DLI scan record dated 1819; Kashi Sanskrit Series 146 catalogue edition (2005)',
    language:'Sanskrit',scanUrl:'https://commons.wikimedia.org/wiki/File:Shri_Muhurta_Martanda_(IA_in.ernet.dli.2015.312516).pdf',
    notes:'Chapters include Saṃskāra, Vivāha, Gṛha/building and Yātrā. Category-level corroboration found; individual rules remain pending exact verse/page comparison.'
  }),
  PAN_NIRNAYA_SINDHU: Object.freeze({
    id:'PAN_NIRNAYA_SINDHU',tradition:'panIndian',role:'supporting-dharma-nibandha-pending',
    title:'Nirṇaya Sindhu (निर्णयसिन्धु)',author:'Kamalākara Bhaṭṭa',
    edition:'1901 Nirnaya Sagara Press scan tradition; work compiled in 17th century',
    language:'Sanskrit',url:'https://indike.org/pramana/in.niti.dharma.nibandha.nirnaya.nirnayasindhu',
    notes:'Ritual-calendar and tithi observance cross-reference. Not interchangeable with a dedicated electional-muhurta manual.'
  }),
  PAN_DHARMASINDHU: Object.freeze({
    id:'PAN_DHARMASINDHU',tradition:'panIndian',role:'supporting-dharma-nibandha-pending',
    title:'Dharmasindhu',edition:'1888 Nirnaya Sagara Press edition cited in scanned research',
    language:'Sanskrit',notes:'Ritual observance cross-reference only; no engine rule is enabled by name alone.'
  })
});

export const MUHURTA_RULE_TYPES = Object.freeze(['REQUIRED','PREFERRED','PROHIBITED','CONDITIONAL']);

export function getMuhurtaSource(sourceId){
  return MUHURTA_SOURCES[sourceId] || null;
}
