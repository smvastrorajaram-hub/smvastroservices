import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'LEGACY_MUTATION_FAILED')
  });
}

function safeUid(user) {
  return String(user?.uid || '').trim();
}

function availabilityStatus(profile, activeSessionCount) {
  if (activeSessionCount > 0) return 'busy';
  return profile.liveCallEnabled === true || profile.liveChatEnabled === true ? 'online' : 'offline';
}

/** Transactional Cloudflare implementations of low-risk legacy profile/review mutations. */
export function registerLegacyBusinessRoutes({ app, firestore, identityService } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.updateDocument !== 'function' ||
      typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Legacy business routes require Firestore Admin transactions and Firebase identity.');
  }

  async function authenticate(req) {
    return identityService.authenticateAuthorization(req.get('Authorization'));
  }

  async function requireAdmin(req) {
    const user = await authenticate(req);
    if (user.isAdmin !== true && String(user.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return user;
  }

  app.post('/astrologer/availability', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user);
      const inputStatus = String(req.body?.availabilityStatus || '').trim().toLowerCase();
      const liveCallEnabled = req.body?.liveCallEnabled === true;
      const liveChatEnabled = req.body?.liveChatEnabled === true;
      if (!['online', 'busy', 'offline'].includes(inputStatus)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Choose Online, Busy, or Offline.'
        });
      }
      if (typeof req.body?.liveCallEnabled !== 'boolean' ||
          typeof req.body?.liveChatEnabled !== 'boolean') {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Choose whether Live Call or Live Chat is enabled.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const [userSnapshot, astroSnapshot, pricingSnapshot] = await Promise.all([
          tx.getDocument('smv_users/' + uid),
          tx.getDocument('smv_astrologers/' + uid),
          tx.getDocument('smv_settings/liveSessionPricing')
        ]);
        const profile = userSnapshot.data || {};
        const astro = astroSnapshot.data || {};
        if (!astroSnapshot.exists || (astro.uid && String(astro.uid) !== uid)) {
          throw Object.assign(new Error('This account does not own an Astrologer profile.'), {
            code: 'ASTROLOGER_PROFILE_NOT_OWNED', httpStatus: 403
          });
        }
        if (!['approved', 'active'].includes(String(astro.status || '').toLowerCase())) {
          throw Object.assign(new Error('Only an approved Astrologer can change availability.'), {
            code: 'ASTROLOGER_APPROVAL_REQUIRED', httpStatus: 409
          });
        }
        if (profile.role && String(profile.role).toLowerCase() !== 'astrologer') {
          throw Object.assign(new Error('Astrologer account required.'), {
            code: 'AUTH_ROLE_REQUIRED', httpStatus: 403
          });
        }
        const parsedCount = Number(astro.activeSessionCount);
        const activeCount = Number.isSafeInteger(parsedCount) && parsedCount >= 0 ? parsedCount : 0;
        const storedPricing = pricingSnapshot.data || {};
        const rawMax = Number(storedPricing.maxConcurrentSessions);
        const maxConcurrentSessions = Number.isSafeInteger(rawMax) && rawMax >= 1 && rawMax <= 3
          ? rawMax : 1;
        const finalStatus = availabilityStatus({ liveCallEnabled, liveChatEnabled }, activeCount);
        tx.set('smv_astrologers/' + uid, {
          liveCallEnabled,
          liveChatEnabled,
          availabilityStatus: finalStatus,
          availabilityUpdatedAt: FirestoreFieldValue.serverTimestamp(),
          availabilityUpdatedBy: uid,
          liveSessionBusyManaged: activeCount > 0
        }, { merge: true });
        return {
          availabilityStatus: finalStatus,
          liveCallEnabled,
          liveChatEnabled,
          activeSessionCount: activeCount,
          maxConcurrentSessions
        };
      });

      return res.set('Cache-Control', 'no-store').json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error, 'Unable to update Astrologer availability.');
    }
  });

  app.post('/customer/submit-review', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user);
      const questionId = String(req.body?.questionId || '').trim();
      const astrologerId = String(req.body?.astrologerId || '').trim();
      const rating = Number(req.body?.rating);
      const review = String(req.body?.review || '').trim();

      if (!questionId || !astrologerId || questionId.length > 200 ||
          astrologerId.length > 200 || questionId.includes('/') || astrologerId.includes('/')) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Consultation information is missing.'
        });
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Please select a rating from 1 to 5.'
        });
      }
      if (!review || review.length > 4000) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Please write a review of up to 4000 characters.'
        });
      }

      const reviewId = questionId + '_' + uid;
      const outcome = await firestore.runTransaction(async tx => {
        const questionPath = 'smv_questions/' + questionId;
        const reviewPath = 'smv_reviews/' + reviewId;
        const [questionSnapshot, existingReview] = await Promise.all([
          tx.getDocument(questionPath),
          tx.getDocument(reviewPath)
        ]);
        if (!questionSnapshot.exists) {
          throw Object.assign(new Error('Consultation not found.'), { code: 'CONSULTATION_NOT_FOUND', httpStatus: 404 });
        }
        const question = questionSnapshot.data || {};
        if (String(question.customerId || '') !== uid) {
          throw Object.assign(new Error('You are not allowed to review this consultation.'), {
            code: 'REVIEW_CUSTOMER_MISMATCH', httpStatus: 403
          });
        }
        if (String(question.status || '') !== 'answered') {
          throw Object.assign(new Error('You can review only after the answer has been approved.'), {
            code: 'REVIEW_ANSWER_NOT_FINAL', httpStatus: 409
          });
        }
        if (String(question.astrologerId || '') !== astrologerId) {
          throw Object.assign(new Error('Astrologer information does not match.'), {
            code: 'REVIEW_ASTROLOGER_MISMATCH', httpStatus: 409
          });
        }
        if (existingReview.exists) {
          tx.set(questionPath, {
            reviewed: true,
            reviewSubmittedAt: question.reviewSubmittedAt || FirestoreFieldValue.serverTimestamp()
          }, { merge: true });
          return { alreadySubmitted: true, reviewId };
        }
        tx.create(reviewPath, {
          questionId,
          customerId: uid,
          customerName: String(question.customerName || question.birthName || 'Customer'),
          astrologerId,
          astrologerName: String(question.astrologerName || 'Astrologer'),
          rating,
          review,
          verified: true,
          approved: false,
          status: 'pending',
          createdAt: FirestoreFieldValue.serverTimestamp()
        });
        tx.set(questionPath, {
          reviewed: true,
          reviewSubmittedAt: FirestoreFieldValue.serverTimestamp()
        }, { merge: true });
        return { alreadySubmitted: false, reviewId };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, ...outcome });
    } catch (error) {
      return sendError(res, error, 'Unable to submit review.');
    }
  });

  app.post('/admin/appointment-status', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const id = String(req.body?.id || '').trim();
      const status = String(req.body?.status || '').trim();
      if (!id || id.length > 200 || id.includes('/') ||
          !['new', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Invalid appointment update.'
        });
      }
      await firestore.updateDocument('smv_appointments/' + id, {
        status,
        updatedAt: FirestoreFieldValue.serverTimestamp(),
        updatedBy: safeUid(actor)
      });
      return res.set('Cache-Control', 'no-store').json({ ok: true });
    } catch (error) {
      return sendError(res, error, 'Unable to update appointment.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/astrologer/availability',
      '/customer/submit-review',
      '/admin/appointment-status'
    ])
  });
}
