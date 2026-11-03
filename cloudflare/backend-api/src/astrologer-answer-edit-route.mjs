import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'ANSWER_EDIT_FAILED')
  });
}

/** Reopens only an owned, eligible Astrologer answer and writes its audit record atomically. */
export function registerAstrologerAnswerEditRoute({ app, firestore, identityService, randomId = () => globalThis.crypto.randomUUID() } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Answer edit route requires Firestore transaction and verified Firebase identity services.');
  }

  app.post('/astrologer/edit-answer', async (req, res) => {
    try {
      const user = await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid = String(user.uid || '').trim();
      const questionId = String(req.body?.questionId || '').trim();
      if (!questionId || questionId.length > 200 || questionId.includes('/')) {
        return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Question ID is required.' });
      }

      await firestore.runTransaction(async tx => {
        const questionPath = 'smv_questions/' + questionId;
        const [questionSnapshot, workflowSnapshot] = await Promise.all([
          tx.getDocument(questionPath),
          tx.getDocument('smv_settings/workflow')
        ]);
        if (!questionSnapshot.exists) {
          throw Object.assign(new Error('Question not found.'), { code: 'QUESTION_NOT_FOUND', httpStatus: 404 });
        }
        const question = questionSnapshot.data || {};
        if (String(question.astrologerId || '') !== uid) {
          throw Object.assign(new Error('This question is not assigned to you.'), {
            code: 'QUESTION_NOT_ASSIGNED_TO_ASTROLOGER', httpStatus: 403
          });
        }

        const allowWithoutAdminApproval = workflowSnapshot.data?.allowWithoutAdminApproval === true;
        const status = String(question.status || '');
        const bypassEditable = allowWithoutAdminApproval &&
          status === 'answered' &&
          question.adminApprovalBypassed === true &&
          !question.customerAnswerViewedAt &&
          question.commissionStatus !== 'credited';

        if ((status === 'answered' || String(question.astrologerAnswerStatus || '') === 'approved') && !bypassEditable) {
          throw Object.assign(new Error('This answer is final or has already been viewed by the customer.'), {
            code: 'ANSWER_ALREADY_FINAL_OR_VIEWED', httpStatus: 409
          });
        }

        const allowedStatuses = ['processing', 'answer_draft', 'admin_review', 'revision_required'];
        const hasAnswer = String(question.answer || '').trim().length > 0;
        if (!hasAnswer || (!allowedStatuses.includes(status) &&
            question.astrologerEditMode !== true && !bypassEditable)) {
          throw Object.assign(new Error('This answer is not available for editing right now.'), {
            code: 'ANSWER_NOT_EDITABLE', httpStatus: 409
          });
        }

        tx.update(questionPath, {
          allocationStatus: 'claimed_by_astrologer',
          astrologerEditMode: true,
          status: 'admin_approved',
          astrologerAnswerStatus: 'draft',
          editReopenedAt: FirestoreFieldValue.serverTimestamp(),
          editReopenedBy: uid,
          updatedAt: FirestoreFieldValue.serverTimestamp()
        });
        const auditId = String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
        tx.create('smv_admin_audit/' + (auditId || 'answer-edit-' + questionId), {
          action: 'ASTROLOGER_ANSWER_REOPENED_FOR_EDIT',
          questionId,
          actorUid: uid,
          details: { previousStatus: status, nextStatus: 'admin_approved' },
          createdAt: FirestoreFieldValue.serverTimestamp()
        });
      });

      return res.set('Cache-Control', 'no-store').json({
        success: true, questionId, status: 'admin_approved', astrologerEditMode: true
      });
    } catch (error) {
      return sendError(res, error, 'Unable to open answer for editing.');
    }
  });

  return Object.freeze({ path: '/astrologer/edit-answer' });
}
