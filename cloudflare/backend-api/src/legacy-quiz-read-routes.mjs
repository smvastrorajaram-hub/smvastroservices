function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'QUIZ_READ_FAILED')
  });
}

function safeMillis(value) {
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
  if (value && typeof value.toDate === 'function') return value.toDate().getTime() || 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (value && typeof value === 'object' && value.seconds != null) {
    return Number(value.seconds) * 1000 + Number(value.nanoseconds || 0) / 1e6;
  }
  const parsed = typeof value === 'number' ? value : Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestActivity(item = {}) {
  return Math.max(
    safeMillis(item.paymentRecordedAt), safeMillis(item.paidAt), safeMillis(item.paymentUpdatedAt),
    safeMillis(item.commissionCreditedAt), safeMillis(item.customerViewedAt), safeMillis(item.answerApprovedAt),
    safeMillis(item.answerSubmittedAt), safeMillis(item.adminQuestionApprovedAt), safeMillis(item.questionApprovedAt),
    safeMillis(item.requestedAt), safeMillis(item.date), safeMillis(item.updatedAt), safeMillis(item.createdAt), safeMillis(item.submittedAt)
  );
}

function timingSafeTextEqual(expected, actual) {
  const left = new TextEncoder().encode(String(expected || ''));
  const right = new TextEncoder().encode(String(actual || ''));
  if (!left.length || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

/** Authenticated and secret-gated read routes for Astrologer qualification. */
export function registerLegacyQuizReadRoutes({ app, firestore, identityService } = {}) {
  if (!app || typeof app.get !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' || typeof firestore.runQuery !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Quiz read routes require Firestore Admin REST and Firebase identity services.');
  }

  async function requireAdmin(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (user.isAdmin !== true && String(user.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return user;
  }

  app.get('/google-form/astrologer-quiz-config', async (req, res) => {
    try {
      const settings = await firestore.getDocument('smv_settings/astrologerAutoApproval');
      const data = settings.exists ? settings.data || {} : {};
      const expected = String(data.webhookSecret || '');
      const supplied = String(req.get('x-smv-quiz-secret') || req.query?.secret || '');
      if (!timingSafeTextEqual(expected, supplied)) {
        return res.status(401).set('Cache-Control', 'no-store').json({ error: 'Invalid quiz secret.' });
      }
      const documents = await firestore.runQuery({
        collectionPath: 'smv_astrologer_quiz_questions',
        filters: [{ field: 'enabled', op: '==', value: true }],
        limit: 250
      });
      const questions = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .sort((left, right) => Number(left.order || 999) - Number(right.order || 999));
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        passMark: Math.max(1, Math.min(25, Number(data.passMark || 20))),
        questions
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load Google Form quiz configuration.');
    }
  });

  app.get('/astrologer/qualification-config', async (req, res) => {
    try {
      const user = await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid = String(user.uid || '').trim();
      const userSnapshot = await firestore.getDocument('smv_users/' + uid);
      const profile = userSnapshot.data || {};
      if (String(profile.role || '').toLowerCase() !== 'astrologer') {
        return res.status(403).set('Cache-Control', 'no-store').json({ error: 'Astrologer account required.' });
      }
      const [settingsSnapshot, astroSnapshot] = await Promise.all([
        firestore.getDocument('smv_settings/astrologerAutoApproval'),
        firestore.getDocument('smv_astrologers/' + uid)
      ]);
      const settings = settingsSnapshot.data || {};
      const astro = astroSnapshot.data || {};
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        enabled: settings.enabled === true,
        formUrl: String(settings.formUrl || ''),
        syncWebAppUrl: String(settings.syncWebAppUrl || ''),
        passMark: Math.max(1, Math.min(25, Number(settings.passMark || 20))),
        status: String(astro.status || profile.status || 'pending'),
        quizStatus: String(astro.quizStatus || 'not_attempted'),
        quizScore: astro.quizScore ?? null,
        quizMaxScore: astro.quizMaxScore ?? null,
        quizSubmittedAt: astro.quizSubmittedAt || null
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load Astrologer qualification configuration.');
    }
  });

  app.get('/admin/astrologer-quiz/questions', async (req, res) => {
    try {
      await requireAdmin(req);
      const documents = await firestore.runQuery({
        collectionPath: 'smv_astrologer_quiz_questions',
        orderBy: [{ field: 'order', direction: 'asc' }],
        limit: 500
      });
      const questions = documents.map(document => ({ id: document.id, ...(document.data || {}) }));
      return res.set('Cache-Control', 'no-store').json({ success: true, questions });
    } catch (error) {
      return sendError(res, error, 'Unable to load qualification questions.');
    }
  });

  app.get('/admin/questions-data', async (req, res) => {
    try {
      await requireAdmin(req);
      const [questions, astrologers, commission, workflow] = await Promise.all([
        firestore.runQuery({ collectionPath: 'smv_questions', limit: 1000 }),
        firestore.runQuery({
          collectionPath: 'smv_astrologers',
          filters: [{ field: 'status', op: '==', value: 'approved' }],
          limit: 1000
        }),
        firestore.getDocument('smv_settings/commission'),
        firestore.getDocument('smv_settings/workflow')
      ]);
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        questions: questions.map(document => ({ id: document.id, ...(document.data || {}) }))
          .sort((left, right) => newestActivity(right) - newestActivity(left)),
        astrologers: astrologers.map(document => ({ id: document.id, ...(document.data || {}) }))
          .sort((left, right) => newestActivity(right) - newestActivity(left)),
        settings: {
          commission: commission.exists ? commission.data : null,
          workflow: workflow.exists ? workflow.data : { allowWithoutAdminApproval: false }
        }
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load Admin question data.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/google-form/astrologer-quiz-config',
      '/astrologer/qualification-config',
      '/admin/astrologer-quiz/questions',
      '/admin/questions-data'
    ])
  });
}
