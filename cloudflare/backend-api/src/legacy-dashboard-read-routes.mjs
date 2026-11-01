function millis(value) {
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
  if (value && typeof value.toDate === 'function') return value.toDate().getTime() || 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (value && typeof value === 'object') {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (Number.isFinite(seconds)) return seconds * 1000 + Math.floor((Number.isFinite(nanos) ? nanos : 0) / 1e6);
  }
  if (value == null || value === '') return 0;
  const result = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(result) ? result : 0;
}

function newestActivity(item = {}) {
  return Math.max(
    millis(item.paymentRecordedAt), millis(item.paidAt), millis(item.paymentUpdatedAt),
    millis(item.commissionCreditedAt), millis(item.customerViewedAt), millis(item.answerApprovedAt),
    millis(item.answerSubmittedAt), millis(item.adminQuestionApprovedAt), millis(item.questionApprovedAt),
    millis(item.requestedAt), millis(item.date), millis(item.updatedAt), millis(item.createdAt), millis(item.submittedAt)
  );
}

function scheduledBookingStatus(appointment, nowMs) {
  const status = String(appointment?.bookingStatus || 'requested').toLowerCase();
  if (!['requested', 'accepted'].includes(status) || appointment?.liveSessionId) return status;
  const date = String(appointment?.preferredDate || '');
  const time = String(appointment?.preferredTime || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return status;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const parsed = new Date(utc);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return status;
  const deadline = utc - 330 * 60 * 1000 + 2 * 60_000;
  return nowMs >= deadline ? 'missed_by_astrologer' : status;
}

function safeUid(user) {
  return String(user?.uid || '').trim();
}

function sendError(res, error, message) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? message : String(error?.message || message),
    code: String(error?.code || 'DASHBOARD_READ_FAILED')
  });
}

/** UID-scoped Customer/Astrologer and Admin dashboard read contracts. */
export function registerLegacyDashboardReadRoutes({ app, firestore, identityService, now = Date.now } = {}) {
  if (!app || typeof app.get !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' || typeof firestore.runQuery !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Dashboard read routes require Firestore Admin REST and Firebase identity services.');
  }

  async function authenticate(req) {
    return identityService.authenticateAuthorization(req.get('Authorization'));
  }
  async function requireRole(req, expectedRole) {
    const user = await authenticate(req);
    if (String(user.role || '').toLowerCase() !== expectedRole) {
      throw Object.assign(new Error(expectedRole[0].toUpperCase() + expectedRole.slice(1) + ' access required.'), {
        code: 'AUTH_ROLE_REQUIRED', httpStatus: 403
      });
    }
    return user;
  }
  async function requireAdmin(req) {
    const user = await authenticate(req);
    if (user.isAdmin !== true && String(user.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return user;
  }

  app.get('/astrologer/appointments', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user);
      const [userSnapshot, astroSnapshot] = await Promise.all([
        firestore.getDocument('smv_users/' + uid),
        firestore.getDocument('smv_astrologers/' + uid)
      ]);
      const profileRole = String(userSnapshot.data?.role || '').toLowerCase();
      const astroRole = String(astroSnapshot.data?.role || '').toLowerCase();
      if (profileRole !== 'astrologer' && astroRole !== 'astrologer') {
        return res.status(403).set('Cache-Control', 'no-store').json({ success: false, error: 'Astrologer access required.' });
      }
      const documents = await firestore.runQuery({
        collectionPath: 'smv_appointments',
        filters: [{ field: 'astrologerUid', op: '==', value: uid }],
        limit: 100
      });
      const appointments = documents.map(document => {
        const a = document.data || {};
        const bookingStatus = scheduledBookingStatus(a, now());
        const missed = bookingStatus === 'missed_by_astrologer';
        return {
          id: document.id,
          bookingId: String(a.bookingId || document.id),
          type: String(a.type || ''),
          bookingKind: String(a.bookingKind || ''),
          name: String(a.name || ''),
          preferredDate: String(a.preferredDate || ''),
          preferredTime: String(a.preferredTime || ''),
          question: String(a.question || ''),
          notes: String(a.notes || ''),
          birthDetails: a.birthDetails || null,
          status: missed ? 'missed' : String(a.status || 'new'),
          bookingStatus,
          missedReason: missed ? 'astrologer_not_connected_within_grace' : String(a.missedReason || ''),
          scheduledMinutes: Number(a.scheduledMinutes || 5),
          liveSessionId: String(a.liveSessionId || ''),
          createdAt: a.createdAt || null
        };
      }).sort((left, right) => millis(right.createdAt) - millis(left.createdAt));
      return res.set('Cache-Control', 'no-store').json({ success: true, appointments });
    } catch (error) {
      return sendError(res, error, 'Unable to load your scheduled Call/Chat bookings.');
    }
  });

  app.get('/customer/appointments', async (req, res) => {
    try {
      const user = await requireRole(req, 'customer');
      const uid = safeUid(user);
      const documents = await firestore.runQuery({
        collectionPath: 'smv_appointments',
        filters: [{ field: 'customerUid', op: '==', value: uid }],
        limit: 100
      });
      const appointments = documents.map(document => {
        const a = document.data || {};
        const bookingStatus = scheduledBookingStatus(a, now());
        const missed = bookingStatus === 'missed_by_astrologer';
        return {
          id: document.id,
          bookingId: String(a.bookingId || document.id),
          type: String(a.type || ''),
          bookingKind: String(a.bookingKind || ''),
          astrologerId: String(a.astrologerId || a.astrologerUid || ''),
          astrologerName: String(a.astrologerName || 'Astrologer'),
          preferredDate: String(a.preferredDate || ''),
          preferredTime: String(a.preferredTime || ''),
          scheduledMinutes: Number(a.scheduledMinutes || 5),
          bookingStatus,
          status: missed ? 'missed' : String(a.status || 'new'),
          missedReason: missed ? 'astrologer_not_connected_within_grace' : String(a.missedReason || ''),
          notes: String(a.notes || ''),
          liveSessionId: String(a.liveSessionId || ''),
          liveBookingId: String(a.liveBookingId || ''),
          createdAt: a.createdAt || null
        };
      }).filter(item => ['scheduled_call_request', 'scheduled_chat_request'].includes(item.bookingKind))
        .sort((left, right) => millis(right.createdAt) - millis(left.createdAt));
      return res.set('Cache-Control', 'no-store').json({ success: true, appointments });
    } catch (error) {
      return sendError(res, error, 'Unable to load your scheduled Call/Chat bookings.');
    }
  });

  app.get('/customer/reviews', async (req, res) => {
    try {
      const user = await requireRole(req, 'customer');
      const documents = await firestore.runQuery({
        collectionPath: 'smv_reviews',
        filters: [{ field: 'customerId', op: '==', value: safeUid(user) }],
        limit: 200
      });
      const reviews = documents.map(document => ({
        id: document.id,
        questionId: String(document.data?.questionId || '')
      })).filter(item => item.questionId);
      return res.set('Cache-Control', 'no-store').json({ success: true, reviews });
    } catch (error) {
      return sendError(res, error, 'Unable to load customer review status.');
    }
  });

  app.get('/public/astrologers/:astrologerId/reviews', async (req, res) => {
    const astrologerId = String(req.params?.astrologerId || '').trim();
    if (!astrologerId || astrologerId.length > 160 || /[\/\u0000-\u001f]/.test(astrologerId)) {
      return res.status(400).set('Cache-Control', 'no-store').json({ success: false, error: 'Astrologer ID is required.' });
    }
    try {
      const documents = await firestore.runQuery({
        collectionPath: 'smv_reviews',
        filters: [{ field: 'astrologerId', op: '==', value: astrologerId }],
        limit: 100
      });
      const reviews = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .filter(review => review.approved === true || String(review.status || '').toLowerCase() === 'approved');
      return res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
        .json({ success: true, astrologerId, reviews });
    } catch (error) {
      return sendError(res, error, 'Unable to load astrologer reviews.');
    }
  });

  app.get('/astrologer/open-questions', async (req, res) => {
    try {
      const user = await requireRole(req, 'astrologer');
      const uid = safeUid(user);
      const [astroSnapshot, workflowSnapshot] = await Promise.all([
        firestore.getDocument('smv_astrologers/' + uid),
        firestore.getDocument('smv_settings/workflow')
      ]);
      const astro = astroSnapshot.data || {};
      if (!astroSnapshot.exists || String(astro.status || '').toLowerCase() !== 'approved') {
        return res.status(403).set('Cache-Control', 'no-store').json({ error: 'Your astrologer profile is not approved.' });
      }
      if (workflowSnapshot.data?.allowWithoutAdminApproval !== true) {
        return res.set('Cache-Control', 'no-store').json({
          success: true, allowWithoutAdminApproval: false, questions: []
        });
      }
      const [documents, commissionSnapshot] = await Promise.all([
        firestore.runQuery({
          collectionPath: 'smv_questions',
          filters: [{ field: 'status', op: '==', value: 'available_to_astrologers' }],
          limit: 1000
        }),
        firestore.getDocument('smv_settings/commission').catch(() => ({ exists: false, data: null }))
      ]);
      const rawRate = Number(commissionSnapshot.data?.astroPercent ?? 20);
      const commissionPercent = Number.isFinite(rawRate) ? rawRate : 20;
      const questions = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .filter(question => question.paymentStatus === 'paid' && !question.astrologerId &&
          String(question.status || '') === 'available_to_astrologers' &&
          String(question.allocationStatus || '') === 'available_to_astrologers')
        .sort((left, right) => newestActivity(right) - newestActivity(left))
        .slice(0, 100)
        .map(question => ({
          ...question,
          commissionPercent,
          astrologerCommissionAmount: Math.round(Number(question.amount || 0) * commissionPercent) / 100
        }));
      return res.set('Cache-Control', 'no-store').json({
        success: true, allowWithoutAdminApproval: true, questions
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load open questions.');
    }
  });

  app.get('/admin/appointments', async (req, res) => {
    try {
      await requireAdmin(req);
      const documents = await firestore.runQuery({
        collectionPath: 'smv_appointments',
        limit: 200
      });
      const appointments = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .sort((left, right) => millis(right.createdAt) - millis(left.createdAt))
        .slice(0, 50);
      return res.set('Cache-Control', 'no-store').json({ appointments });
    } catch (error) {
      return sendError(res, error, 'Unable to load appointments.');
    }
  });

  app.get('/admin/reviews-data', async (req, res) => {
    try {
      await requireAdmin(req);
      const documents = await firestore.runQuery({
        collectionPath: 'smv_reviews',
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 50
      });
      const reviews = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .sort((left, right) => newestActivity(right) - newestActivity(left)).slice(0, 50);
      return res.set('Cache-Control', 'no-store').json({ success: true, reviews });
    } catch (error) {
      return sendError(res, error, 'Unable to load Admin reviews.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/astrologer/appointments',
      '/customer/appointments',
      '/customer/reviews',
      '/public/astrologers/:astrologerId/reviews',
      '/astrologer/open-questions',
      '/admin/appointments',
      '/admin/reviews-data'
    ])
  });
}
