import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'QUESTION_WORKFLOW_FAILED')
  });
}
function uidOf(user) { return String(user?.uid || '').trim(); }
function idValid(value) { const id=String(value||'').trim(); return id.length>0&&id.length<=200&&!id.includes('/')?id:''; }
function closedQuestion(question) { return ['answered','question_rejected','admin_rejected'].includes(String(question?.status||'')); }
function roundMoney(value) { return Math.round(Number(value)*100)/100; }
function commissionSplit(amount, percent) {
  const astro = Math.round(amount * percent) / 100;
  const admin = roundMoney(amount - astro);
  return { astro, admin };
}
function notificationPath(event, questionId, userId) {
  return 'smv_notifications/' + event + '_' + questionId + '_' + userId;
}

export function registerLegacyQuestionWorkflowRoutes({ app, firestore, identityService } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Question workflow routes require Firestore Admin transactions and verified identity.');
  }

  async function requireAdmin(req) {
    const actor = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return actor;
  }

  app.post('/admin/approve-question', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const questionId = idValid(req.body?.questionId);
      const astrologerId = idValid(req.body?.astrologerId);
      const percent = Number(req.body?.commissionPercent);
      if (!questionId || !astrologerId) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Question ID and astrologer are required.'
        });
      }
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Commission percentage must be between 0 and 100.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const questionPath = 'smv_questions/' + questionId;
        const astrologerPath = 'smv_astrologers/' + astrologerId;
        const [questionSnapshot, astrologerSnapshot] = await Promise.all([
          tx.getDocument(questionPath),
          tx.getDocument(astrologerPath)
        ]);
        if (!questionSnapshot.exists) throw Object.assign(new Error('Question not found.'), {
          code: 'QUESTION_NOT_FOUND', httpStatus: 404
        });
        if (!astrologerSnapshot.exists) throw Object.assign(new Error('Astrologer not found.'), {
          code: 'ASTROLOGER_NOT_FOUND', httpStatus: 404
        });
        const question = questionSnapshot.data || {};
        const astrologer = astrologerSnapshot.data || {};
        if (String(astrologer.status || '').toLowerCase() !== 'approved') {
          throw Object.assign(new Error('Selected astrologer is not approved.'), {
            code: 'ASTROLOGER_NOT_APPROVED', httpStatus: 409
          });
        }
        if (closedQuestion(question)) {
          throw Object.assign(new Error('This question is already closed.'), {
            code: 'QUESTION_ALREADY_CLOSED', httpStatus: 409
          });
        }
        if (String(question.paymentStatus || '').toLowerCase() !== 'paid') {
          throw Object.assign(new Error('Only a verified paid question can be approved and allocated.'), {
            code: 'QUESTION_PAYMENT_NOT_VERIFIED', httpStatus: 409
          });
        }
        if (question.adminQuestionApprovedAt || question.astrologerId ||
            ['credited','admin_retained'].includes(String(question.commissionStatus || ''))) {
          throw Object.assign(new Error('This question has already been allocated or settled.'), {
            code: 'QUESTION_ALREADY_ALLOCATED', httpStatus: 409
          });
        }
        const amount = Number(question.amount ?? question.paymentAmount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw Object.assign(new Error('This question does not have a valid paid amount.'), {
            code: 'QUESTION_AMOUNT_INVALID', httpStatus: 409
          });
        }
        const split = commissionSplit(amount, percent);
        const timestamp = FirestoreFieldValue.serverTimestamp();
        tx.update(questionPath, {
          status: 'paid',
          allocationStatus: 'assigned_to_astrologer',
          astrologerId,
          astrologerName: String(astrologer.name || 'Astrologer'),
          commissionPercent: percent,
          commissionRate: percent,
          astrologerCommissionAmount: split.astro,
          adminCommissionAmount: split.admin,
          adminQuestionApprovedAt: timestamp,
          adminQuestionApprovedBy: uidOf(actor),
          commissionStatus: 'allocated_pending_answer',
          updatedAt: timestamp
        });
        tx.create(notificationPath('question_assigned', questionId, astrologerId), {
          userId: astrologerId,
          type: 'question_assigned',
          title: 'New Question Assigned',
          message: 'A paid question has been assigned to you by Admin.',
          questionId,
          commissionAmount: split.astro,
          createdAt: timestamp,
          read: false
        });
        tx.create('smv_admin_audit/QUESTION_APPROVED_' + questionId, {
          action: 'QUESTION_APPROVED',
          questionId,
          actorUid: uidOf(actor),
          details: {
            astrologerId,
            commissionPercent: percent,
            astrologerCommissionAmount: split.astro,
            adminCommissionAmount: split.admin
          },
          createdAt: timestamp
        });
        return {
          questionId, astrologerId, commissionPercent: percent,
          astrologerCommissionAmount: split.astro, adminCommissionAmount: split.admin
        };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error, 'Unable to approve and allocate question.');
    }
  });

  app.post('/admin/reallocate-question', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const questionId = idValid(req.body?.questionId);
      const astrologerId = idValid(req.body?.astrologerId);
      const percent = Number(req.body?.commissionPercent);
      if (!questionId || !astrologerId) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Question ID and astrologer are required.'
        });
      }
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Commission percentage must be between 0 and 100.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const questionPath = 'smv_questions/' + questionId;
        const [questionSnapshot, astrologerSnapshot] = await Promise.all([
          tx.getDocument(questionPath),
          tx.getDocument('smv_astrologers/' + astrologerId)
        ]);
        if (!questionSnapshot.exists) throw Object.assign(new Error('Question not found.'), {
          code: 'QUESTION_NOT_FOUND', httpStatus: 404
        });
        if (!astrologerSnapshot.exists) throw Object.assign(new Error('Astrologer not found.'), {
          code: 'ASTROLOGER_NOT_FOUND', httpStatus: 404
        });
        const question = questionSnapshot.data || {};
        const astrologer = astrologerSnapshot.data || {};
        if (String(astrologer.status || '').toLowerCase() !== 'approved') {
          throw Object.assign(new Error('Selected astrologer is not approved.'), {
            code: 'ASTROLOGER_NOT_APPROVED', httpStatus: 409
          });
        }
        if (closedQuestion(question) || !question.adminQuestionApprovedAt || !question.astrologerId) {
          throw Object.assign(new Error('This question has not been allocated or is already closed.'), {
            code: 'QUESTION_NOT_REALLOCATABLE', httpStatus: 409
          });
        }
        if (String(question.paymentStatus || '').toLowerCase() !== 'paid') {
          throw Object.assign(new Error('Only a verified paid question can be reallocated.'), {
            code: 'QUESTION_PAYMENT_NOT_VERIFIED', httpStatus: 409
          });
        }
        if (['credited','admin_retained'].includes(String(question.commissionStatus || '')) ||
            question.commissionCreditedAt || question.astrologerPaymentId) {
          throw Object.assign(new Error('A settled question cannot be reallocated.'), {
            code: 'QUESTION_COMMISSION_ALREADY_SETTLED', httpStatus: 409
          });
        }
        const amount = Number(question.amount ?? question.paymentAmount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw Object.assign(new Error('This question does not have a valid paid amount.'), {
            code: 'QUESTION_AMOUNT_INVALID', httpStatus: 409
          });
        }
        const split = commissionSplit(amount, percent);
        const oldAstrologerId = String(question.astrologerId || '');
        const timestamp = FirestoreFieldValue.serverTimestamp();
        tx.update(questionPath, {
          astrologerId,
          astrologerName: String(astrologer.name || 'Astrologer'),
          commissionPercent: percent,
          commissionRate: percent,
          astrologerCommissionAmount: split.astro,
          adminCommissionAmount: split.admin,
          allocationStatus: 'assigned_to_astrologer',
          commissionStatus: 'allocated_pending_answer',
          astrologerAnswerStatus: 'pending',
          status: 'admin_approved',
          answer: '',
          answerWordCount: 0,
          answerAuthorType: '',
          adminTakeover: false,
          adminRejectionReason: FirestoreFieldValue.delete(),
          adminRejectedAt: FirestoreFieldValue.delete(),
          adminRejectedBy: FirestoreFieldValue.delete(),
          reallocatedAt: timestamp,
          reallocatedBy: uidOf(actor),
          updatedAt: timestamp
        });
        if (oldAstrologerId && oldAstrologerId !== astrologerId) {
          tx.create(notificationPath('question_reallocated', questionId, oldAstrologerId), {
            userId: oldAstrologerId,
            type: 'question_reallocated',
            title: 'Question Re-allocated',
            message: 'Admin has re-allocated this question to another astrologer. It is no longer assigned to you.',
            questionId,
            createdAt: timestamp,
            read: false
          });
        }
        tx.create(notificationPath('question_assigned', questionId, astrologerId), {
          userId: astrologerId,
          type: 'question_assigned',
          title: 'Question Re-allocated',
          message: 'Admin has assigned a paid question to you. Please submit your answer.',
          questionId,
          commissionAmount: split.astro,
          createdAt: timestamp,
          read: false
        });
        tx.create('smv_admin_audit/QUESTION_REALLOCATED_' + questionId, {
          action: 'QUESTION_REALLOCATED',
          questionId,
          actorUid: uidOf(actor),
          details: { oldAstrologerId, astrologerId, commissionPercent: percent },
          createdAt: timestamp
        });
        return {
          questionId, astrologerId, oldAstrologerId, commissionPercent: percent,
          astrologerCommissionAmount: split.astro, adminCommissionAmount: split.admin
        };
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error, 'Unable to re-allocate question.');
    }
  });

  app.post('/admin/edit-question', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const questionId = idValid(req.body?.questionId);
      const text = String(req.body?.question || '').trim();
      if (!questionId || !text) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Question ID and question text are required.'
        });
      }
      if (text.length > 10000) {
        return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Question is too long.' });
      }
      await firestore.runTransaction(async tx => {
        const path = 'smv_questions/' + questionId;
        const snapshot = await tx.getDocument(path);
        if (!snapshot.exists) throw Object.assign(new Error('Question not found.'), {
          code: 'QUESTION_NOT_FOUND', httpStatus: 404
        });
        if (closedQuestion(snapshot.data || {})) {
          throw Object.assign(new Error('This question can no longer be edited.'), {
            code: 'QUESTION_ALREADY_CLOSED', httpStatus: 409
          });
        }
        tx.update(path, {
          question: text,
          adminQuestionEditedAt: FirestoreFieldValue.serverTimestamp(),
          adminQuestionEditedBy: uidOf(actor),
          updatedAt: FirestoreFieldValue.serverTimestamp()
        });
      });
      return res.set('Cache-Control', 'no-store').json({ success: true, questionId });
    } catch (error) {
      return sendError(res, error, 'Unable to edit question.');
    }
  });

  app.post('/admin/takeover-answer', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const questionId = idValid(req.body?.questionId);
      const answer = String(req.body?.answer || '').trim();
      if (!questionId || !answer) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Question ID and Admin answer are required.'
        });
      }
      if (answer.length > 30000) {
        return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Admin answer is too long.' });
      }
      const result = await firestore.runTransaction(async tx => {
        const path = 'smv_questions/' + questionId;
        const snapshot = await tx.getDocument(path);
        if (!snapshot.exists) throw Object.assign(new Error('Question not found.'), {
          code: 'QUESTION_NOT_FOUND', httpStatus: 404
        });
        const question = snapshot.data || {};
        if (!question.customerId) {
          throw Object.assign(new Error('Customer information is missing.'), {
            code: 'QUESTION_CUSTOMER_MISSING', httpStatus: 409
          });
        }
        if (closedQuestion(question)) {
          throw Object.assign(new Error('This question is already closed.'), {
            code: 'QUESTION_ALREADY_CLOSED', httpStatus: 409
          });
        }
        const wordCount = answer.split(/\s+/).filter(Boolean).length;
        const minWords = Math.max(1, Number(question.answerMinWords || 1));
        if (!Number.isFinite(minWords) || wordCount < minWords) {
          throw Object.assign(new Error('Admin answer must contain at least ' + minWords + ' words.'), {
            code: 'ANSWER_MINIMUM_WORDS', httpStatus: 400
          });
        }
        const timestamp = FirestoreFieldValue.serverTimestamp();
        tx.update(path, {
          question: String(question.question || ''),
          answer,
          answerWordCount: wordCount,
          answerAuthorType: 'admin',
          adminAnswered: true,
          adminAnswerBy: uidOf(actor),
          adminAnswerAt: timestamp,
          status: 'answered',
          astrologerAnswerStatus: 'not_required',
          commissionStatus: 'admin_retained',
          astrologerCommissionAmount: 0,
          commissionAmount: 0,
          commissionCreditedAt: FirestoreFieldValue.delete(),
          astrologerPaymentId: FirestoreFieldValue.delete(),
          adminTakeover: true,
          answeredAt: timestamp,
          updatedAt: timestamp
        });
        tx.create('smv_notifications/admin_answer_' + questionId, {
          userId: String(question.customerId),
          type: 'answer_approved',
          title: 'Your astrology answer is ready',
          message: 'SMV ASTRO Admin answered your question directly.',
          questionId,
          createdAt: timestamp,
          read: false
        });
        tx.create('smv_admin_audit/ADMIN_TAKEOVER_' + questionId, {
          action: 'ADMIN_TAKEOVER_ANSWER',
          questionId,
          actorUid: uidOf(actor),
          details: { wordCount },
          createdAt: timestamp
        });
        return { questionId, wordCount };
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true, ...result, answerAuthorType: 'admin', adminRetained: true
      });
    } catch (error) {
      return sendError(res, error, 'Unable to save Admin answer.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/admin/approve-question',
      '/admin/reallocate-question',
      '/admin/edit-question',
      '/admin/takeover-answer'
    ])
  });
}
