import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

export const SMV_DEFAULT_ASTRO_QUIZ_25 = [{"questionTa":"Lagna (லக்னம்) என்றால் என்ன?","questionEn":"What is Lagna?","choicesTa":["சந்திர ராசி மட்டும்","பிறப்பு நேரத்தில் கிழக்கு அடிவானத்தில் உதிக்கும் ராசி","10ஆம் பாவ அதிபதி","நவாம்ச அதிபதி"],"choicesEn":["Moon sign only","Sign rising on the eastern horizon at birth","10th-house lord","Navamsa lord"],"correctIndex":1,"enabled":true,"order":1},{"questionTa":"Jyotisha-வில் பொதுவாக எத்தனை Rasi-கள் பயன்படுத்தப்படுகின்றன?","questionEn":"How many Rasis are used in Jyotisha?","choicesTa":["9","12","18","27"],"choicesEn":["9","12","18","27"],"correctIndex":1,"enabled":true,"order":2},{"questionTa":"27-Nakshatra முறையில் எத்தனை Nakshatra-கள் உள்ளன?","questionEn":"How many Nakshatras are in the standard 27-Nakshatra system?","choicesTa":["12","24","27","30"],"choicesEn":["12","24","27","30"],"correctIndex":2,"enabled":true,"order":3},{"questionTa":"ஒவ்வொரு Nakshatra-க்கும் எத்தனை Pada-கள்?","questionEn":"How many Padas does each Nakshatra have?","choicesTa":["2","3","4","5"],"choicesEn":["2","3","4","5"],"correctIndex":2,"enabled":true,"order":4},{"questionTa":"ஒரு Rasi எத்தனை degrees கொண்டது?","questionEn":"How many degrees are in one Rasi?","choicesTa":["15°","27°","30°","45°"],"choicesEn":["15°","27°","30°","45°"],"correctIndex":2,"enabled":true,"order":5},{"questionTa":"ஒரு Nakshatra-வின் பரப்பு எவ்வளவு?","questionEn":"What is the span of one Nakshatra?","choicesTa":["10°00′","12°00′","13°20′","15°00′"],"choicesEn":["10°00′","12°00′","13°20′","15°00′"],"correctIndex":2,"enabled":true,"order":6},{"questionTa":"ஒரு Nakshatra Pada-வின் பரப்பு எவ்வளவு?","questionEn":"What is the span of one Nakshatra Pada?","choicesTa":["2°30′","3°20′","4°00′","5°00′"],"choicesEn":["2°30′","3°20′","4°00′","5°00′"],"correctIndex":1,"enabled":true,"order":7},{"questionTa":"Navamsa (D9) ஒரு Rasi-யை எத்தனை பகுதிகளாகப் பிரிக்கிறது?","questionEn":"Navamsa (D9) divides a Rasi into how many parts?","choicesTa":["7","8","9","12"],"choicesEn":["7","8","9","12"],"correctIndex":2,"enabled":true,"order":8},{"questionTa":"Dasamsa எந்த divisional chart?","questionEn":"Which divisional chart is Dasamsa?","choicesTa":["D7","D9","D10","D12"],"choicesEn":["D7","D9","D10","D12"],"correctIndex":2,"enabled":true,"order":9},{"questionTa":"திருமணம் மற்றும் partnership-ஐ முதன்மையாக குறிக்கும் Bhava எது?","questionEn":"Which Bhava primarily signifies marriage and partnerships?","choicesTa":["5ஆம்","7ஆம்","9ஆம்","11ஆம்"],"choicesEn":["5th","7th","9th","11th"],"correctIndex":1,"enabled":true,"order":10},{"questionTa":"தொழில்/கர்மத்தை முதன்மையாக குறிக்கும் Bhava எது?","questionEn":"Which Bhava primarily signifies profession and karma?","choicesTa":["2ஆம்","6ஆம்","10ஆம்","12ஆம்"],"choicesEn":["2nd","6th","10th","12th"],"correctIndex":2,"enabled":true,"order":11},{"questionTa":"குழந்தைகளை முதன்மையாக குறிக்கும் Bhava எது?","questionEn":"Which Bhava primarily signifies children?","choicesTa":["3ஆம்","5ஆம்","8ஆம்","10ஆம்"],"choicesEn":["3rd","5th","8th","10th"],"correctIndex":1,"enabled":true,"order":12},{"questionTa":"கடன், நோய், எதிரிகள் ஆகியவற்றுடன் தொடர்புடைய Bhava எது?","questionEn":"Which Bhava is associated with debts, disease and enemies?","choicesTa":["1ஆம்","4ஆம்","6ஆம்","9ஆம்"],"choicesEn":["1st","4th","6th","9th"],"correctIndex":2,"enabled":true,"order":13},{"questionTa":"ஆயுள் மற்றும் திடீர் மாற்றங்களுடன் தொடர்புடைய Bhava எது?","questionEn":"Which Bhava is associated with longevity and sudden transformations?","choicesTa":["2ஆம்","5ஆம்","8ஆம்","11ஆம்"],"choicesEn":["2nd","5th","8th","11th"],"correctIndex":2,"enabled":true,"order":14},{"questionTa":"லாபம் மற்றும் ஆசை நிறைவேற்றத்துடன் தொடர்புடைய Bhava எது?","questionEn":"Which Bhava is associated with gains and fulfilment of desires?","choicesTa":["4ஆம்","8ஆம்","11ஆம்","12ஆம்"],"choicesEn":["4th","8th","11th","12th"],"correctIndex":2,"enabled":true,"order":15},{"questionTa":"செலவு, இழப்பு, வெளிநாட்டு வாழ்வு ஆகியவற்றுடன் தொடர்புடைய Bhava எது?","questionEn":"Which Bhava is associated with expenditure, loss and foreign residence?","choicesTa":["3ஆம்","7ஆம்","10ஆம்","12ஆம்"],"choicesEn":["3rd","7th","10th","12th"],"correctIndex":3,"enabled":true,"order":16},{"questionTa":"அறிவு, குரு, புத்திர காரகத்துவத்துடன் பொதுவாக தொடர்புடைய Graha எது?","questionEn":"Which Graha is commonly associated with wisdom, teachers and children?","choicesTa":["புதன்","குரு","சுக்கிரன்","சனி"],"choicesEn":["Mercury","Jupiter","Venus","Saturn"],"correctIndex":1,"enabled":true,"order":17},{"questionTa":"கலை, சுகம் மற்றும் திருமண காரகத்துவத்துடன் பொதுவாக தொடர்புடைய Graha எது?","questionEn":"Which Graha is commonly associated with arts, comforts and marriage significations?","choicesTa":["செவ்வாய்","சுக்கிரன்","சனி","கேது"],"choicesEn":["Mars","Venus","Saturn","Ketu"],"correctIndex":1,"enabled":true,"order":18},{"questionTa":"ஒழுக்கம், தாமதம், சகிப்புத்தன்மையுடன் பொதுவாக தொடர்புடைய Graha எது?","questionEn":"Which Graha is commonly associated with discipline, delay and endurance?","choicesTa":["சந்திரன்","புதன்","குரு","சனி"],"choicesEn":["Moon","Mercury","Jupiter","Saturn"],"correctIndex":3,"enabled":true,"order":19},{"questionTa":"Vimsottari Dasa-வின் முழு சுழற்சி எத்தனை ஆண்டுகள்?","questionEn":"What is the full cycle of Vimsottari Dasa?","choicesTa":["60","100","108","120"],"choicesEn":["60","100","108","120"],"correctIndex":3,"enabled":true,"order":20},{"questionTa":"Ketu-க்கு பின் Vimsottari Dasa வரிசையில் வரும் Graha எது?","questionEn":"Which Graha follows Ketu in the Vimsottari Dasa sequence?","choicesTa":["சூரியன்","சுக்கிரன்","சந்திரன்","செவ்வாய்"],"choicesEn":["Sun","Venus","Moon","Mars"],"correctIndex":1,"enabled":true,"order":21},{"questionTa":"பிறப்பில் Vimsottari Dasa balance கணக்கிட முதன்மையாக பயன்படுத்தப்படுவது எது?","questionEn":"What is primarily used to determine the Vimsottari Dasa balance at birth?","choicesTa":["சூரிய longitude","சந்திரன் தனது Nakshatra-வில் உள்ள நிலை","Lagna degree மட்டும்","10ஆம் அதிபதி longitude"],"choicesEn":["Sun longitude","Moon position within its Nakshatra","Lagna degree only","10th-lord longitude"],"correctIndex":1,"enabled":true,"order":22},{"questionTa":"Rasi மற்றும் Navamsa இரண்டிலும் ஒரே Rasi-யில் இருக்கும் Graha எவ்வாறு அழைக்கப்படுகிறது?","questionEn":"A Graha occupying the same Rasi in both Rasi and Navamsa is called what?","choicesTa":["அஸ்தங்கதம்","வர்கோத்தமம்","வக்ரம்","நீசம்"],"choicesEn":["Combust","Vargottama","Retrograde","Debilitated"],"correctIndex":1,"enabled":true,"order":23},{"questionTa":"Graha Drishti-யில் Guru-வின் சிறப்பு முழு பார்வைகள் எவை?","questionEn":"In Graha Drishti, which are Jupiter’s special full aspects?","choicesTa":["3 மற்றும் 10","4 மற்றும் 8","5 மற்றும் 9","7 மற்றும் 12"],"choicesEn":["3rd and 10th","4th and 8th","5th and 9th","7th and 12th"],"correctIndex":2,"enabled":true,"order":24},{"questionTa":"Graha Drishti-யில் Shani-யின் சிறப்பு முழு பார்வைகள் எவை?","questionEn":"In Graha Drishti, which are Saturn’s special full aspects?","choicesTa":["3 மற்றும் 10","4 மற்றும் 8","5 மற்றும் 9","2 மற்றும் 12"],"choicesEn":["3rd and 10th","4th and 8th","5th and 9th","2nd and 12th"],"correctIndex":0,"enabled":true,"order":25}];

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'QUIZ_WRITE_FAILED')
  });
}

function safeUid(user) { return String(user?.uid || '').trim(); }

function randomHex(byteCount = 32) {
  const bytes = new Uint8Array(byteCount);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function quizQuestionFromBody(input = {}) {
  const questionTa = String(input.questionTa || '').trim();
  const questionEn = String(input.questionEn || '').trim();
  const choicesTa = Array.isArray(input.choicesTa) ? input.choicesTa.map(value => String(value || '').trim()) : [];
  const choicesEn = Array.isArray(input.choicesEn) ? input.choicesEn.map(value => String(value || '').trim()) : [];
  const correctIndex = Math.round(Number(input.correctIndex));
  if (!questionTa || !questionEn || choicesTa.length !== 4 || choicesEn.length !== 4 ||
      choicesTa.some(value => !value) || choicesEn.some(value => !value) ||
      !Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 3 ||
      choicesTa.some(value => value.length > 250) || choicesEn.some(value => value.length > 250) ||
      questionTa.length > 1000 || questionEn.length > 1000) {
    throw Object.assign(new Error('Each question needs Tamil + English, four Tamil + English choices, and one correct answer.'), {
      code: 'QUIZ_QUESTION_INVALID', httpStatus: 400
    });
  }
  return {
    questionTa, questionEn, choicesTa, choicesEn, correctIndex,
    enabled: input.enabled !== false,
    order: Math.max(1, Math.round(Number(input.order || 999)))
  };
}

function sanitizedDocumentId(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
}

function adminOnlyError() {
  return Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
}

/** Admin-only quiz bank and Astrologer Auto Approval settings. */
export function registerLegacyQuizWriteRoutes({ app, firestore, identityService } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.runQuery !== 'function' || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Quiz write routes require Firestore Admin REST transactions and Firebase identity.');
  }

  async function requireAdmin(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (user.isAdmin !== true && String(user.role || '').toLowerCase() !== 'admin') throw adminOnlyError();
    return user;
  }

  app.post('/admin/astrologer-quiz/questions', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const question = quizQuestionFromBody(req.body || {});
      const requestedId = sanitizedDocumentId(req.body?.id);
      const id = requestedId || globalThis.crypto.randomUUID();
      await firestore.setDocument('smv_astrologer_quiz_questions/' + id, {
        ...question,
        updatedAt: FirestoreFieldValue.serverTimestamp(),
        updatedBy: safeUid(user)
      }, { merge: true });
      return res.set('Cache-Control', 'no-store').json({ success: true, id });
    } catch (error) {
      return sendError(res, error, 'Unable to save qualification question.');
    }
  });

  app.post('/admin/astrologer-quiz/questions/delete', async (req, res) => {
    try {
      await requireAdmin(req);
      const id = sanitizedDocumentId(req.body?.id);
      if (!id) {
        return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Question ID required.' });
      }
      await firestore.deleteDocument('smv_astrologer_quiz_questions/' + id);
      return res.set('Cache-Control', 'no-store').json({ success: true });
    } catch (error) {
      return sendError(res, error, 'Unable to delete qualification question.');
    }
  });

  app.post('/admin/astrologer-quiz/load-defaults', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const firstExisting = await firestore.runQuery({
        collectionPath: 'smv_astrologer_quiz_questions',
        limit: 1
      });
      if (firstExisting.length && req.body?.fillMissing !== true) {
        return res.status(409).set('Cache-Control', 'no-store').json({
          error: 'Question Bank already contains questions. Defaults were not loaded, so your manual questions are protected.'
        });
      }
      const result = await firestore.runTransaction(async tx => {
        const refs = SMV_DEFAULT_ASTRO_QUIZ_25.map((_, index) =>
          'smv_astrologer_quiz_questions/default_' + String(index + 1).padStart(2, '0'));
        const snapshots = await Promise.all(refs.map(path => tx.getDocument(path)));
        if (snapshots.some(snapshot => snapshot.exists) && req.body?.fillMissing !== true && firstExisting.length) {
          throw Object.assign(new Error('Question Bank already contains questions. Defaults were not loaded, so your manual questions are protected.'), {
            code: 'QUIZ_DEFAULTS_ALREADY_PRESENT', httpStatus: 409
          });
        }
        let created = 0;
        for (let index = 0; index < refs.length; index += 1) {
          if (snapshots[index].exists) continue;
          const timestamp = FirestoreFieldValue.serverTimestamp();
          tx.create(refs[index], {
            ...SMV_DEFAULT_ASTRO_QUIZ_25[index],
            isDefault: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: safeUid(user)
          });
          created += 1;
        }
        return { created, total: SMV_DEFAULT_ASTRO_QUIZ_25.length };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error, 'Unable to load default astrology questions.');
    }
  });

  app.post('/admin/astrologer-auto-approval/settings', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const body = req.body || {};
      const enabled = body.enabled === true;
      const formUrl = String(body.formUrl || '').trim();
      const syncWebAppUrl = String(body.syncWebAppUrl || '').trim();
      const passMark = Math.round(Number(body.passMark || 20));

      if (!Number.isFinite(passMark) || passMark < 1 || passMark > 25) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Pass mark must be between 1 and 25.'
        });
      }
      if (syncWebAppUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/i.test(syncWebAppUrl)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Enter a valid deployed Google Apps Script Web App /exec URL.'
        });
      }
      if (enabled && !/^https:\/\/docs\.google\.com\/forms\//i.test(formUrl)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Enter the published Google Form URL before enabling Auto Approval.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const existing = await tx.getDocument('smv_settings/astrologerAutoApproval');
        const previousSecret = String(existing.data?.webhookSecret || '');
        const webhookSecret = body.rotateSecret === true || !previousSecret ? randomHex(32) : previousSecret;
        tx.set('smv_settings/astrologerAutoApproval', {
          enabled,
          formUrl,
          syncWebAppUrl,
          passMark,
          webhookSecret,
          updatedAt: FirestoreFieldValue.serverTimestamp(),
          updatedBy: safeUid(user)
        }, { merge: true });
        return { enabled, formUrl, syncWebAppUrl, passMark, webhookSecret };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error, 'Unable to save Astrologer Auto Approval settings.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/admin/astrologer-quiz/questions',
      '/admin/astrologer-quiz/questions/delete',
      '/admin/astrologer-quiz/load-defaults',
      '/admin/astrologer-auto-approval/settings'
    ])
  });
}
