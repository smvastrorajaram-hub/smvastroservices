import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import { walletRechargeError } from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

const QUESTION_COLLECTION = 'smv_questions';
const CONSULTATION_COLLECTION = 'smv_private_consultations';
const ORDER_COLLECTION = 'razorpay_orders';
const PAYMENT_COLLECTION = 'smv_payments';
const NOTIFICATION_COLLECTION = 'smv_notifications';
const MONEY_CURRENCY = 'INR';

function httpError(code, message, httpStatus = 409) {
  return Object.assign(new Error(message), { code, httpStatus });
}

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'RAZORPAY_PAYMENT_ERROR')
  });
}

function safeId(value, max = 128) {
  const id = String(value || '').trim();
  return id && id.length <= max && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
}

function rupeesToPaise(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100))) return null;
  const paise = Math.round(amount * 100);
  return Math.abs(amount * 100 - paise) < 0.000001 ? paise : null;
}

function paiseToRupees(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount / 100 : 0;
}

function rawBytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return null;
}

function constantStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function bankReferences(refund, old = {}) {
  const acquirer = refund?.acquirer_data || {};
  return {
    refundRrn: acquirer.rrn || refund?.rrn || old.refundRrn || null,
    refundArn: acquirer.arn || old.refundArn || null,
    refundUtr: acquirer.utr || old.refundUtr || null,
    refundBankReference: acquirer.bank_reference_number || acquirer.reference_number || old.refundBankReference || null
  };
}

function privateCommission(price, settings = {}) {
  const amount = Math.round(Number(price || 0) * 100) / 100;
  const astrologerRate = Math.max(0, Math.min(100, Number(settings.astrologerRate ?? 20)));
  const astrologerAmount = Math.round(amount * astrologerRate) / 100;
  return {
    privateAstrologerCommissionRate: astrologerRate,
    privateAdminCommissionRate: Math.round((100 - astrologerRate) * 100) / 100,
    astrologerAmount,
    adminAmount: Math.round((amount - astrologerAmount) * 100) / 100
  };
}

async function digestHex(value, cryptoImpl) {
  const bytes = new TextEncoder().encode(String(value));
  const result = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, '0')).join('');
}

function docData(snapshot) {
  return snapshot?.exists === true && snapshot.data && typeof snapshot.data === 'object' ? snapshot.data : {};
}

function firestoreTimestamp() {
  return FirestoreFieldValue.serverTimestamp();
}

function safePaise(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

async function readWorkflow(firestore, documentId, fallback = {}) {
  try {
    const snapshot = await firestore.getDocument('smv_settings/' + documentId);
    return snapshot.exists ? { ...fallback, ...(snapshot.data || {}) } : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Legacy Razorpay contracts, isolated from Wallet cutover.
 *
 * The incoming webhook is a single multi-domain endpoint. It uses the same
 * atomic D1 inbox/lease repository as Wallet recharges, but performs Question
 * and Private Consultation state transitions against the legacy Firestore
 * collections. No event is acknowledged until its durable business updates
 * have completed.
 */
export function registerLegacyRazorpayRoutes({
  app,
  identityService,
  firestore,
  walletAdapter,
  razorpay,
  razorpayKeyId,
  razorpayKeySecretPresent = false,
  razorpayWebhookSecret,
  razorpayMode = 'test',
  enablePrivateConsultation = false,
  allowNewQuestions = true,
  cryptoImpl = globalThis.crypto,
  now = Date.now
} = {}) {
  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.setDocument !== 'function' || typeof firestore.runTransaction !== 'function' ||
      !walletAdapter || typeof walletAdapter.recordWebhookEvent !== 'function' ||
      typeof walletAdapter.completeWebhookEvent !== 'function' ||
      typeof walletAdapter.releaseWebhookEvent !== 'function' ||
      !razorpay || typeof razorpay.createOrder !== 'function' ||
      typeof razorpay.fetchPayment !== 'function' ||
      typeof razorpay.verifyPaymentSignature !== 'function' ||
      typeof razorpay.verifyWebhookSignature !== 'function' ||
      typeof razorpay.fetchOrderPayments !== 'function' ||
      typeof razorpay.refundPayment !== 'function' ||
      typeof razorpay.fetchPaymentRefunds !== 'function' ||
      typeof razorpay.fetchRefund !== 'function' ||
      !cryptoImpl?.subtle?.digest) {
    throw new TypeError('Legacy Razorpay routes require authenticated Firestore, D1 webhook inbox and Razorpay adapters.');
  }

  const keyId = String(razorpayKeyId || '').trim();
  const webhookSecret = String(razorpayWebhookSecret || '');
  const mode = String(razorpayMode || '').trim().toLowerCase();
  const correctModeKey = mode === 'test' ? keyId.startsWith('rzp_test_') :
    mode === 'live' ? keyId.startsWith('rzp_live_') : false;
  if (!correctModeKey || !webhookSecret || !razorpayKeySecretPresent) {
    throw new TypeError('Legacy Razorpay routes require a complete key pair, webhook secret and matching key mode.');
  }

  async function authenticate(req, roles = ['customer', 'admin']) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (!roles.includes(String(user.role || '').toLowerCase())) {
      throw httpError('AUTH_ROLE_REQUIRED', 'This account does not have permission for this payment operation.', 403);
    }
    return user;
  }

  async function requireAdmin(req) {
    return authenticate(req, ['admin']);
  }

  async function paymentDetails(paymentId, orderId, expectedAmountPaise, { capture = true } = {}) {
    let payment = await razorpay.fetchPayment(paymentId);
    const matches = () => String(payment?.id || '') === paymentId &&
      String(payment?.order_id || '') === orderId &&
      safePaise(payment?.amount) === expectedAmountPaise &&
      String(payment?.currency || '').toUpperCase() === MONEY_CURRENCY;
    if (!matches()) throw httpError('RAZORPAY_PAYMENT_MISMATCH', 'Razorpay payment does not match the saved order, amount and INR currency.', 409);
    if (constantStatus(payment.status) === 'authorized' && capture) {
      try {
        payment = await razorpay.capturePayment(paymentId, expectedAmountPaise, MONEY_CURRENCY);
      } catch {
        // A timeout can happen after Razorpay accepted capture. Re-fetch the
        // provider state rather than blindly issuing a new capture request.
      }
      if (constantStatus(payment?.status) !== 'captured') payment = await razorpay.fetchPayment(paymentId);
      if (!matches()) throw httpError('RAZORPAY_PAYMENT_MISMATCH', 'Razorpay payment changed while capture was being reconciled.', 409);
    }
    if (constantStatus(payment.status) !== 'captured') {
      throw httpError('RAZORPAY_CAPTURE_PENDING', 'Razorpay has not confirmed a captured payment yet.', 409);
    }
    return payment;
  }

  async function paymentRecordId(entityType, entityId, paymentId, cryptoValue = cryptoImpl) {
    return 'smvcp_' + (await digestHex(entityType + ':' + entityId + ':' + paymentId, cryptoValue)).slice(0, 40);
  }

  async function recordQuestionPayment({ questionId, orderId, paymentId, signature = '', source }) {
    const workflowSnap = await readWorkflow(firestore, 'workflow', { allowWithoutAdminApproval: false });
    const allowWithoutAdminApproval = workflowSnap.allowWithoutAdminApproval === true;
    const paymentDocId = await paymentRecordId('question', questionId, paymentId);
    const paymentPath = PAYMENT_COLLECTION + '/' + paymentDocId;
    const questionPath = QUESTION_COLLECTION + '/' + questionId;
    const recordedAt = new Date(Number(now())).toISOString();

    const result = await firestore.runTransaction(async tx => {
      const question = await tx.getDocument(questionPath);
      if (!question.exists) throw httpError('QUESTION_NOT_FOUND', 'Question not found.', 404);
      const data = question.data || {};
      if (String(data.razorpayOrderId || '') !== orderId) throw httpError('RAZORPAY_ORDER_MISMATCH', 'Payment order does not match this question.', 409);
      if (data.paymentStatus === 'paid') {
        if (String(data.razorpayPaymentId || '') !== paymentId) {
          throw httpError('QUESTION_ALREADY_PAID', 'This question is already paid with a different Razorpay payment.', 409);
        }
        return {
          already: true, customerId: data.customerId, customerPaymentId: data.customerPaymentId || paymentDocId,
          paymentRecordedAt: data.paymentRecordedAt || null, amount: Number(data.amount || 0),
          question: String(data.question || ''), customerEmail: String(data.customerEmail || ''),
          status: String(data.status || 'paid')
        };
      }
      const amount = Number(data.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) throw httpError('QUESTION_AMOUNT_INVALID', 'Saved question amount is invalid.', 409);
      const nextStatus = allowWithoutAdminApproval ? 'available_to_astrologers' : 'pending_admin_approval';
      tx.create(paymentPath, {
        paymentId: paymentDocId, type: 'customer_payment', customerId: data.customerId || null,
        astrologerId: null, questionId, bookingId: data.bookingId || null,
        razorpayOrderId: orderId, razorpayPaymentId: paymentId, amount,
        status: 'paid', paymentStatus: 'paid', source,
        createdAt: firestoreTimestamp(), paymentRecordedAt: recordedAt, updatedAt: firestoreTimestamp()
      });
      tx.update(questionPath, {
        status: nextStatus, updatedAt: firestoreTimestamp(), paymentStatus: 'paid',
        allocationStatus: allowWithoutAdminApproval ? 'available_to_astrologers' : 'awaiting_admin',
        adminApprovalBypassed: allowWithoutAdminApproval,
        openedToAstrologersAt: allowWithoutAdminApproval ? firestoreTimestamp() : FirestoreFieldValue.delete(),
        razorpayPaymentId: paymentId, razorpaySignature: signature || '',
        paidAt: data.paidAt || firestoreTimestamp(), paymentUpdatedAt: firestoreTimestamp(),
        paymentConfirmedBy: source, customerPaymentId: paymentDocId, paymentRecordedAt: recordedAt,
        astrologerPaymentId: FirestoreFieldValue.delete(),
        commissionStatus: allowWithoutAdminApproval ? 'open_for_claim' : 'awaiting_admin_allocation'
      });
      return {
        already: false, customerId: data.customerId, customerPaymentId: paymentDocId,
        paymentRecordedAt: recordedAt, amount, question: String(data.question || ''),
        customerEmail: String(data.customerEmail || ''), status: nextStatus
      };
    });

    if (!result.already && result.customerId) {
      const notificationId = 'payment_' + paymentDocId;
      await firestore.setDocument(NOTIFICATION_COLLECTION + '/' + notificationId, {
        userId: result.customerId, type: 'payment', title: 'Payment successful',
        message: allowWithoutAdminApproval
          ? 'Your payment was verified. Your question is now open to approved astrologers.'
          : 'Your payment was verified. Your question is now waiting for Admin approval.',
        paymentId: result.customerPaymentId, razorpayPaymentId: paymentId,
        questionId, createdAt: firestoreTimestamp(), read: false
      }, { merge: true }).catch(() => {});
    }
    return result;
  }

  async function recordPrivateConsultationPayment({ consultationId, orderId, paymentId, signature = '', source }) {
    const workflow = await readWorkflow(firestore, 'privateConsultationWorkflow', {
      allowWithoutAdminApproval: false, minimumAnswerWords: 20
    });
    const autoAllow = workflow.allowWithoutAdminApproval === true;
    const finalStatus = autoAllow ? 'approved_for_astrologer' : 'pending_admin_approval';
    const paymentDocId = await paymentRecordId('private_consultation', consultationId, paymentId);
    const paymentPath = PAYMENT_COLLECTION + '/' + paymentDocId;
    const consultationPath = CONSULTATION_COLLECTION + '/' + consultationId;
    const recordedAt = new Date(Number(now())).toISOString();

    const result = await firestore.runTransaction(async tx => {
      const consultation = await tx.getDocument(consultationPath);
      if (!consultation.exists) throw httpError('PRIVATE_CONSULTATION_NOT_FOUND', 'Private consultation not found.', 404);
      const data = consultation.data || {};
      if (String(data.razorpayOrderId || '') !== orderId) throw httpError('RAZORPAY_ORDER_MISMATCH', 'Payment order does not match this private consultation.', 409);
      if (data.paymentStatus === 'paid') {
        if (String(data.razorpayPaymentId || '') !== paymentId) {
          throw httpError('CONSULTATION_ALREADY_PAID', 'This consultation is already paid with a different Razorpay payment.', 409);
        }
        return {
          already: true, paymentId: data.customerPaymentId || paymentDocId,
          customerPaymentId: data.customerPaymentId || paymentDocId,
          paymentRecordedAt: data.paymentRecordedAt || null,
          status: String(data.status || finalStatus), amount: Number(data.chatPrice || data.amount || 0),
          customerId: data.customerId || null
        };
      }
      const amount = Number(data.chatPrice || data.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) throw httpError('CONSULTATION_AMOUNT_INVALID', 'Saved private consultation amount is invalid.', 409);
      tx.create(paymentPath, {
        paymentId: paymentDocId, type: 'customer_payment',
        customerId: data.customerId || null, astrologerId: data.astrologerId || null,
        consultationId, razorpayOrderId: orderId, razorpayPaymentId: paymentId,
        amount, status: 'paid', paymentStatus: 'paid', source,
        paymentRecordedAt: recordedAt, createdAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
      });
      tx.update(consultationPath, {
        paymentStatus: 'paid', status: finalStatus, allocationStatus: 'selected_astrologer',
        questionApprovalBypassed: autoAllow, customerPaymentId: paymentDocId,
        razorpayPaymentId: paymentId, razorpaySignature: signature || '',
        paidAt: firestoreTimestamp(), paymentRecordedAt: recordedAt, updatedAt: firestoreTimestamp()
      });
      return {
        already: false, paymentId: paymentDocId, customerPaymentId: paymentDocId,
        paymentRecordedAt: recordedAt, status: finalStatus, amount,
        customerId: data.customerId || null
      };
    });

    if (!result.already && result.customerId) {
      await firestore.setDocument(NOTIFICATION_COLLECTION + '/private_payment_' + paymentDocId, {
        userId: result.customerId, type: 'private_consultation_payment',
        title: 'Private consultation payment successful',
        message: finalStatus === 'approved_for_astrologer'
          ? 'Your private consultation is now visible to the selected astrologer.'
          : 'Your private consultation is waiting for Admin approval.',
        consultationId, paymentId: paymentDocId,
        createdAt: firestoreTimestamp(), read: false
      }, { merge: true }).catch(() => {});
    }
    return result;
  }

  async function safeCreateQuestionOrder(req, res) {
    const user = await authenticate(req, ['customer']);
    const suppliedId = String(req.body?.questionId || '').trim();
    let questionId = suppliedId;
    let question;
    if (!questionId) {
      if (!allowNewQuestions) return res.status(410).json({ error: 'New Question payments are disabled in this environment.' });
      const birth = req.body?.birthDetails || {};
      const customerName = String(req.body?.customerName || birth.name || '').trim();
      const questionText = String(req.body?.question || '').trim();
      if (!customerName || !questionText || !birth.birthDate || !birth.birthTime || !String(birth.birthPlace || '').trim()) {
        return res.status(400).json({ error: 'Complete customer birth details and question are required.' });
      }
      const setting = await firestore.getDocument('smv_settings/question');
      const amount = Number(setting.data?.price || 5);
      if (!Number.isFinite(amount) || amount < 1) return res.status(409).json({ error: 'Question price is not configured correctly by Admin.' });
      questionId = 'smvqt' + cryptoImpl.randomUUID().replace(/-/g, '').slice(0, 20);
      question = {
        customerId: user.uid, customerEmail: user.email || null, questionId,
        customerName, birthName: customerName, question: questionText,
        amount, originalAmount: amount, status: 'awaiting_payment',
        paymentStatus: 'pending', allocationStatus: 'awaiting_admin',
        birthDetails: {
          name: customerName, birthDate: String(birth.birthDate), birthTime: String(birth.birthTime),
          birthPlace: String(birth.birthPlace).trim(), birthGender: String(birth.birthGender || ''),
          timezone: 'Asia/Kolkata', utcOffsetMinutes: 330
        },
        birthDate: String(birth.birthDate), birthTime: String(birth.birthTime),
        birthPlace: String(birth.birthPlace).trim(), birthGender: String(birth.birthGender || ''),
        birthTimezone: 'Asia/Kolkata', birthUtcOffsetMinutes: 330,
        createdAt: firestoreTimestamp()
      };
      await firestore.setDocument(QUESTION_COLLECTION + '/' + questionId, question);
    } else {
      if (!safeId(questionId)) return res.status(400).json({ error: 'A valid questionId is required.' });
      const snapshot = await firestore.getDocument(QUESTION_COLLECTION + '/' + questionId);
      if (!snapshot.exists) return res.status(404).json({ error: 'Saved question not found. Please start a new Ask Now question.' });
      question = snapshot.data || {};
      if (String(question.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this question.' });
      if (!question.birthTimezone || question.birthUtcOffsetMinutes == null || !question.birthDetails?.timezone) {
        question = {
          ...question,
          birthTimezone: question.birthTimezone || 'Asia/Kolkata',
          birthUtcOffsetMinutes: Number(question.birthUtcOffsetMinutes ?? 330),
          birthDetails: {
            ...(question.birthDetails || {}),
            timezone: question.birthDetails?.timezone || 'Asia/Kolkata',
            utcOffsetMinutes: Number(question.birthDetails?.utcOffsetMinutes ?? 330)
          }
        };
        await firestore.setDocument(QUESTION_COLLECTION + '/' + questionId, question, { merge: true });
      }
    }

    if (String(question.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this question.' });
    if (question.paymentStatus === 'paid' && question.razorpayOrderId) {
      const existing = await razorpay.fetchOrder(question.razorpayOrderId);
      return res.status(200).set('Cache-Control', 'no-store').json({
        success: true, alreadyPaid: true, questionId, orderId: existing.id,
        keyId, amount: safePaise(existing.amount), currency: MONEY_CURRENCY
      });
    }
    if (!['awaiting_payment', 'payment_failed'].includes(String(question.status || ''))) {
      return res.status(409).json({ error: 'This question is not available for payment.' });
    }
    const amountPaise = rupeesToPaise(question.amount);
    if (amountPaise === null || amountPaise < 100) return res.status(409).json({ error: 'The saved question amount is invalid.' });
    const receipt = ('SMVQ_' + questionId.slice(-24)).slice(0, 40);

    if (question.razorpayOrderId && ['order_created', 'verification_failed', 'failed'].includes(String(question.paymentStatus || ''))) {
      const existing = await razorpay.fetchOrder(question.razorpayOrderId).catch(() => null);
      if (existing) {
        if (constantStatus(existing.status) === 'paid') return res.status(409).json({ error: 'This payment has already been completed. Please refresh your dashboard.' });
        if (Number(existing.amount) === amountPaise && String(existing.currency) === MONEY_CURRENCY) {
          return res.json({ success: true, questionId, orderId: existing.id, keyId, amount: amountPaise, currency: MONEY_CURRENCY, reused: true });
        }
        return res.status(409).json({ error: 'Previous Razorpay order amount does not match the saved question. No new order was created.' });
      }
    }
    const recovered = typeof razorpay.findOrderByReceipt === 'function'
      ? await razorpay.findOrderByReceipt(receipt, { amountPaise, currency: MONEY_CURRENCY }) : null;
    const order = recovered || await razorpay.createOrder({
      amountPaise, currency: MONEY_CURRENCY, receipt,
      notes: { questionId, customerId: user.uid, astrologerId: String(question.astrologerId || '') }
    });
    const answerSettings = await firestore.getDocument('smv_settings/answer').catch(() => null);
    const minimumWords = Math.max(1, Math.min(10000, Math.floor(Number(answerSettings?.data?.minimumWords || 150))));
    await firestore.setDocument(QUESTION_COLLECTION + '/' + questionId, {
      paymentMode: mode, razorpayOrderId: order.id, paymentCurrency: MONEY_CURRENCY,
      paymentStatus: 'order_created', answerMinWords: minimumWords,
      paymentUpdatedAt: firestoreTimestamp()
    }, { merge: true });
    await firestore.setDocument(ORDER_COLLECTION + '/' + order.id, {
      razorpayOrderId: order.id, questionId, amount: order.amount, currency: order.currency,
      firebaseUid: user.uid, customerEmail: user.email || null,
      astrologerId: String(question.astrologerId || ''),
      serviceName: req.body?.serviceName || 'Public Astrology Question',
      status: 'created', createdAt: firestoreTimestamp()
    }, { merge: true });
    return res.set('Cache-Control', 'no-store').json({
      success: true, questionId, orderId: order.id, keyId,
      amount: order.amount, currency: order.currency,
      originalAmount: Number(question.originalAmount || question.amount || 0)
    });
  }

  async function verifyQuestionPayment(req, res) {
    const user = await authenticate(req, ['customer']);
    const questionId = safeId(req.body?.questionId);
    const orderId = safeId(req.body?.razorpay_order_id);
    const paymentId = safeId(req.body?.razorpay_payment_id);
    const signature = String(req.body?.razorpay_signature || '').trim();
    if (!questionId || !orderId || !paymentId || !signature) return res.status(400).json({ error: 'Payment verification data is incomplete.' });
    const snapshot = await firestore.getDocument(QUESTION_COLLECTION + '/' + questionId);
    if (!snapshot.exists) return res.status(404).json({ error: 'Question not found.' });
    const question = snapshot.data || {};
    if (String(question.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this question.' });
    if (String(question.razorpayOrderId || '') !== orderId) return res.status(409).json({ error: 'Payment order mismatch.' });
    if (!await razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) return res.status(401).json({ error: 'Invalid payment signature. Check that the Razorpay Key ID and Key Secret belong to the same mode.' });
    const amountPaise = rupeesToPaise(question.amount);
    if (amountPaise === null) return res.status(409).json({ error: 'Saved question amount is invalid.' });
    await paymentDetails(paymentId, orderId, amountPaise);
    const result = await recordQuestionPayment({
      questionId, orderId, paymentId, signature, source: 'cloudflare_checkout_verification'
    });
    await firestore.setDocument(ORDER_COLLECTION + '/' + orderId, {
      razorpayPaymentId: paymentId, status: 'verified', questionId, verifiedAt: firestoreTimestamp()
    }, { merge: true });
    return res.set('Cache-Control', 'no-store').json({
      verified: true, questionId, alreadyProcessed: result.already,
      customerPaymentId: result.customerPaymentId || null,
      paymentId: result.customerPaymentId || null, razorpayPaymentId: paymentId,
      paymentRecordedAt: result.paymentRecordedAt || new Date(Number(now())).toISOString(),
      question: result.question || question.question || '', amount: Number(result.amount ?? question.amount ?? 0),
      status: result.status || question.status || 'paid',
      message: 'Payment verified and consultation updated successfully.'
    });
  }

  async function privateCreateOrder(req, res) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation payment route is disabled in this environment.' });
    const user = await authenticate(req, ['customer']);
    const roleSnapshot = await firestore.getDocument('smv_users/' + user.uid);
    const role = String(roleSnapshot.data?.role || 'customer').toLowerCase();
    if (role !== 'customer') return res.status(403).json({ error: 'Customer Login Required — Please login with a Customer account to start a private consultation.' });
    const method = String(req.body?.paymentMethod || 'razorpay').trim().toLowerCase();
    if (method !== 'razorpay') return res.status(410).json({ error: 'Wallet checkout is handled by the current Wallet booking flow; this legacy endpoint only accepts Razorpay in Staging.' });
    if (String(req.body?.promoCode || '').trim()) return res.status(400).json({ error: 'Promo codes are not enabled in this legacy Staging payment route.' });
    const astrologerId = safeId(req.body?.astrologerId);
    const birth = req.body?.birthDetails || {};
    const customerName = String(req.body?.customerName || birth.name || '').trim();
    const question = String(req.body?.question || '').trim();
    if (!astrologerId || !customerName || !question || !birth.birthDate || !birth.birthTime || !String(birth.birthPlace || '').trim()) {
      return res.status(400).json({ error: 'Complete astrologer, birth details and question are required.' });
    }
    const astrologerSnapshot = await firestore.getDocument('smv_astrologers/' + astrologerId);
    if (!astrologerSnapshot.exists) return res.status(404).json({ error: 'Selected astrologer was not found.' });
    const astrologer = astrologerSnapshot.data || {};
    if (!['approved', 'active'].includes(constantStatus(astrologer.status))) return res.status(409).json({ error: 'Selected astrologer is not currently approved.' });
    const chatPrice = Number(astrologer.pricePerQuestion || 0);
    const amountPaise = rupeesToPaise(chatPrice);
    if (amountPaise === null || amountPaise < 100) return res.status(409).json({ error: 'This astrologer Chat Price is not available.' });
    const commissionSettings = await readWorkflow(firestore, 'privateConsultationCommission', { astrologerRate: 20 });
    const commission = privateCommission(chatPrice, commissionSettings);
    const consultationId = 'smvpc' + cryptoImpl.randomUUID().replace(/-/g, '').slice(0, 20);
    const receipt = ('SMVPC_' + consultationId.slice(-20)).slice(0, 40);
    const order = await razorpay.createOrder({
      amountPaise, currency: MONEY_CURRENCY, receipt,
      notes: { consultationId, customerId: user.uid, astrologerId }
    });
    const record = {
      consultationId, customerId: user.uid, customerEmail: user.email || null,
      customerName, question, astrologerId, astrologerName: String(astrologer.name || 'Astrologer'),
      chatPrice, originalChatPrice: chatPrice, ...commission,
      amount: chatPrice, status: 'awaiting_payment', paymentStatus: 'order_created',
      allocationStatus: 'selected_astrologer',
      birthDetails: {
        name: customerName, birthDate: String(birth.birthDate), birthTime: String(birth.birthTime),
        birthPlace: String(birth.birthPlace).trim(), birthGender: String(birth.birthGender || ''),
        timezone: 'Asia/Kolkata', utcOffsetMinutes: 330
      },
      razorpayOrderId: order.id, paymentCurrency: MONEY_CURRENCY,
      createdAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
    };
    await firestore.setDocument(CONSULTATION_COLLECTION + '/' + consultationId, record);
    await firestore.setDocument(ORDER_COLLECTION + '/' + order.id, {
      razorpayOrderId: order.id, consultationId, amount: order.amount, currency: order.currency,
      firebaseUid: user.uid, customerEmail: user.email || null, astrologerId,
      serviceName: 'Private Astrology Consultation', status: 'created', createdAt: firestoreTimestamp()
    }, { merge: true });
    return res.set('Cache-Control', 'no-store').json({
      success: true, consultationId, orderId: order.id, keyId,
      amount: order.amount, currency: order.currency, originalAmount: chatPrice,
      offerId: null, offerName: null, promoCode: '', discountAmount: 0, offerBannerText: ''
    });
  }

  async function privateRetryPayment(req, res) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation payment route is disabled in this environment.' });
    const user = await authenticate(req, ['customer']);
    const id = safeId(req.body?.consultationId);
    if (!id) return res.status(400).json({ error: 'Private consultation ID is required.' });
    const snapshot = await firestore.getDocument(CONSULTATION_COLLECTION + '/' + id);
    if (!snapshot.exists) return res.status(404).json({ error: 'Private consultation not found.' });
    const consultation = snapshot.data || {};
    if (String(consultation.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this private consultation.' });
    if (consultation.paymentStatus === 'paid') return res.status(409).json({ error: 'This consultation is already paid.' });
    if (consultation.refundId || consultation.status === 'question_rejected') return res.status(409).json({ error: 'Rejected/refunded consultations cannot be repaid.' });
    const amountPaise = rupeesToPaise(consultation.chatPrice || consultation.amount);
    if (amountPaise === null || amountPaise < 100) return res.status(409).json({ error: 'Saved Chat Price is invalid.' });
    const order = await razorpay.createOrder({
      amountPaise, currency: consultation.paymentCurrency || MONEY_CURRENCY,
      receipt: ('SMVPC_R_' + id.slice(0, 18) + '_' + String(Number(now())).slice(-8)).slice(0, 40),
      notes: { consultationId: id, customerId: user.uid, astrologerId: String(consultation.astrologerId || ''), retry: 'true' }
    });
    await firestore.setDocument(CONSULTATION_COLLECTION + '/' + id, {
      razorpayOrderId: order.id, paymentStatus: 'order_created', status: 'awaiting_payment',
      paymentRetryCount: FirestoreFieldValue.increment(1), lastPaymentAttemptAt: firestoreTimestamp(),
      updatedAt: firestoreTimestamp()
    }, { merge: true });
    await firestore.setDocument(ORDER_COLLECTION + '/' + order.id, {
      razorpayOrderId: order.id, consultationId: id, amount: order.amount, currency: order.currency,
      firebaseUid: user.uid, customerEmail: user.email || null, astrologerId: String(consultation.astrologerId || ''),
      serviceName: 'Private Astrology Consultation', status: 'created', createdAt: firestoreTimestamp()
    }, { merge: true });
    return res.json({ success: true, consultationId: id, orderId: order.id, keyId, amount: order.amount, currency: order.currency, chatPrice: paiseToRupees(order.amount) });
  }

  async function privateCancelPayment(req, res) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation payment route is disabled in this environment.' });
    const user = await authenticate(req, ['customer']);
    const id = safeId(req.body?.consultationId);
    if (!id) return res.status(400).json({ error: 'Private consultation ID is required.' });
    const path = CONSULTATION_COLLECTION + '/' + id;
    const snapshot = await firestore.getDocument(path);
    if (!snapshot.exists) return res.status(404).json({ error: 'Private consultation not found.' });
    if (String(snapshot.data?.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this private consultation.' });
    if (snapshot.data?.paymentStatus === 'paid') return res.status(409).json({ error: 'Payment is already completed.' });
    await firestore.setDocument(path, {
      paymentStatus: 'cancelled', status: 'awaiting_payment',
      paymentCancelledAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
    }, { merge: true });
    return res.json({ success: true });
  }

  async function recoverPrivatePayment(req, res) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation payment route is disabled in this environment.' });
    const user = await authenticate(req, ['customer']);
    const id = safeId(req.body?.consultationId);
    if (!id) return res.status(400).json({ error: 'Private consultation ID is required.' });
    const path = CONSULTATION_COLLECTION + '/' + id;
    const snapshot = await firestore.getDocument(path);
    if (!snapshot.exists) return res.status(404).json({ error: 'Private consultation not found.' });
    const consultation = snapshot.data || {};
    if (String(consultation.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this private consultation.' });
    if (consultation.paymentStatus === 'paid') {
      return res.json({
        success: true, recovered: true, alreadyPaid: true, consultationId: id,
        paymentId: consultation.customerPaymentId || consultation.razorpayPaymentId || null,
        customerPaymentId: consultation.customerPaymentId || null,
        razorpayPaymentId: consultation.razorpayPaymentId || null,
        paymentRecordedAt: consultation.paymentRecordedAt || null
      });
    }
    const orderId = safeId(consultation.razorpayOrderId);
    if (!orderId) return res.status(409).json({ error: 'No Razorpay order is available to recover.' });
    const expectedPaise = rupeesToPaise(consultation.chatPrice || consultation.amount);
    const page = await razorpay.fetchOrderPayments(orderId, { count: 100, skip: 0 });
    const captured = page.items.find(item =>
      constantStatus(item.status) === 'captured' && Number(item.amount) === expectedPaise &&
      String(item.order_id || '') === orderId && String(item.currency || '').toUpperCase() === MONEY_CURRENCY
    );
    if (!captured) return res.json({ success: true, recovered: false });
    await recordPrivateConsultationPayment({
      consultationId: id, orderId, paymentId: captured.id, source: 'private_payment_recovery'
    });
    const fresh = await firestore.getDocument(path);
    const saved = fresh.data || {};
    return res.json({
      success: true, recovered: true, consultationId: id,
      paymentId: saved.customerPaymentId || null, customerPaymentId: saved.customerPaymentId || null,
      razorpayPaymentId: captured.id, paymentRecordedAt: saved.paymentRecordedAt || null
    });
  }

  async function verifyPrivatePayment(req, res) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation payment route is disabled in this environment.' });
    const user = await authenticate(req, ['customer']);
    const consultationId = safeId(req.body?.consultationId);
    const orderId = safeId(req.body?.razorpay_order_id);
    const paymentId = safeId(req.body?.razorpay_payment_id);
    const signature = String(req.body?.razorpay_signature || '').trim();
    if (!consultationId || !orderId || !paymentId || !signature) return res.status(400).json({ error: 'Payment verification data is incomplete.' });
    const snapshot = await firestore.getDocument(CONSULTATION_COLLECTION + '/' + consultationId);
    if (!snapshot.exists) return res.status(404).json({ error: 'Private consultation not found.' });
    const consultation = snapshot.data || {};
    if (String(consultation.customerId || '') !== user.uid) return res.status(403).json({ error: 'You do not own this private consultation.' });
    if (String(consultation.razorpayOrderId || '') !== orderId) return res.status(409).json({ error: 'Payment order mismatch.' });
    if (!await razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) return res.status(400).json({ error: 'Payment signature verification failed.' });
    const expectedPaise = rupeesToPaise(consultation.chatPrice || consultation.amount);
    if (expectedPaise === null) return res.status(409).json({ error: 'Saved Chat Price is invalid.' });
    await paymentDetails(paymentId, orderId, expectedPaise);
    const result = await recordPrivateConsultationPayment({
      consultationId, orderId, paymentId, signature, source: 'private_checkout_verification'
    });
    const fresh = await firestore.getDocument(CONSULTATION_COLLECTION + '/' + consultationId);
    const saved = fresh.data || consultation;
    return res.set('Cache-Control', 'no-store').json({
      success: true, verified: true, consultationId,
      paymentId: result.paymentId, customerPaymentId: result.customerPaymentId,
      razorpayPaymentId: paymentId, paymentRecordedAt: result.paymentRecordedAt,
      status: result.status, paymentStatus: 'paid',
      question: String(saved.question || ''), amount: Number(result.amount || 0)
    });
  }

  async function claimWebhook(event, req, raw) {
    const providerEventId = String(req.get('X-Razorpay-Event-Id') || '').trim();
    const safeEventId = /^[A-Za-z0-9:_-]{1,230}$/.test(providerEventId) ? providerEventId : '';
    const paymentId = String(event?.payload?.payment?.entity?.id || event?.payload?.refund?.entity?.payment_id || '').trim();
    const orderId = String(event?.payload?.order?.entity?.id || event?.payload?.payment?.entity?.order_id || '').trim();
    const eventType = String(event?.event || 'unknown').slice(0, 100);
    const eventIdentity = safeEventId || (eventType + '_' + (paymentId || orderId || await digestHex(new TextDecoder().decode(raw), cryptoImpl)).replace(/[^A-Za-z0-9:_-]/g, '_'));
    const eventKey = safeEventId ? 'razorpay_' + safeEventId : eventIdentity.slice(0, 240);
    const claim = await walletAdapter.recordWebhookEvent({
      eventKey, eventType, paymentId: paymentId || null, orderId: orderId || null,
      payload: { eventType, paymentId: paymentId || null, orderId: orderId || null }
    });
    return { ...claim, eventKey, eventType, paymentId, orderId };
  }

  async function completeWebhookClaim(claim) {
    const result = await walletAdapter.completeWebhookEvent(claim.eventKey, claim.claimToken);
    if (Number(result?.changed || 0) !== 1) throw httpError('RAZORPAY_WEBHOOK_CLAIM_LOST', 'Webhook processing lease ownership was lost.', 503);
  }

  async function reconcileRefundEvent(event) {
    const refund = event?.payload?.refund?.entity || {};
    const paymentId = String(refund.payment_id || event?.payload?.payment?.entity?.id || '').trim();
    if (!paymentId) return;
    const questionRows = await firestore.runQuery({
      collectionPath: QUESTION_COLLECTION,
      filters: [{ field: 'razorpayPaymentId', op: 'EQUAL', value: paymentId }],
      limit: 3
    });
    const privateRows = enablePrivateConsultation ? await firestore.runQuery({
      collectionPath: CONSULTATION_COLLECTION,
      filters: [{ field: 'razorpayPaymentId', op: 'EQUAL', value: paymentId }],
      limit: 3
    }) : [];
    const status = constantStatus(refund.status || String(event.event || '').replace('refund.', ''));
    const refundId = safeId(refund.id);
    const amount = safePaise(refund.amount);
    const refs = bankReferences(refund);
    for (const row of questionRows) {
      const id = String(row.id || row.data?.questionId || '');
      if (!safeId(id)) continue;
      const path = QUESTION_COLLECTION + '/' + id;
      const fresh = await firestore.getDocument(path);
      const old = fresh.data || {};
      const patch = {
        ...(refundId ? { refundId } : {}),
        refundPaymentId: paymentId,
        ...(amount !== null ? { refundAmount: paiseToRupees(amount) } : {}),
        ...bankReferences(refund, old),
        refundStatus: status || 'pending',
        refundSyncedAt: firestoreTimestamp(),
        updatedAt: firestoreTimestamp()
      };
      if (status === 'processed' || status === 'completed') patch.refundProcessedAt = old.refundProcessedAt || firestoreTimestamp();
      if (status === 'failed') patch.refundFailedAt = old.refundFailedAt || firestoreTimestamp();
      await firestore.setDocument(path, patch, { merge: true });
    }
    for (const row of privateRows) {
      const id = String(row.id || row.data?.consultationId || '');
      if (!safeId(id)) continue;
      const path = CONSULTATION_COLLECTION + '/' + id;
      const fresh = await firestore.getDocument(path);
      const old = fresh.data || {};
      const patch = {
        ...(refundId ? { refundId } : {}),
        refundPaymentId: paymentId,
        ...(amount !== null ? { refundAmount: paiseToRupees(amount) } : {}),
        ...bankReferences(refund, old),
        refundStatus: status || 'pending',
        refundSyncedAt: firestoreTimestamp(),
        updatedAt: firestoreTimestamp()
      };
      if (status === 'processed' || status === 'completed') patch.refundProcessedAt = old.refundProcessedAt || firestoreTimestamp();
      if (status === 'failed') patch.refundFailedAt = old.refundFailedAt || firestoreTimestamp();
      await firestore.setDocument(path, patch, { merge: true });
    }
  }

  async function reconcilePaymentEvent(claim, event) {
    const paymentEntity = event?.payload?.payment?.entity || null;
    const orderEntity = event?.payload?.order?.entity || null;
    const paymentId = String(paymentEntity?.id || '').trim();
    const orderId = String(orderEntity?.id || paymentEntity?.order_id || claim.orderId || '').trim();
    if (!orderId) return;
    const eventType = claim.eventType;
    let orderSnapshot = await firestore.getDocument(ORDER_COLLECTION + '/' + orderId);
    const orderRecord = orderSnapshot.data || {};
    const walletRecharge = await walletAdapter.getRechargeByOrderId(orderId).catch(() => null);
    if (!orderSnapshot.exists && !walletRecharge) return;

    const nextStatus = ['payment.captured', 'order.paid'].includes(eventType) ? 'paid' :
      eventType === 'payment.failed' ? 'failed' : null;

    if (walletRecharge) {
      if (nextStatus === 'failed') {
        if (walletRecharge.status !== 'paid') {
          await walletAdapter.markRechargePaymentFailed({ orderId, paymentId, reason: 'razorpay_payment_failed' });
        }
        return;
      }
      if (['payment.authorized', 'payment.captured', 'order.paid'].includes(eventType)) {
        let providerPaymentId = paymentId;
        if (!providerPaymentId) {
          const page = await razorpay.fetchOrderPayments(orderId, { count: 100, skip: 0 });
          const captured = page.items.find(item => constantStatus(item.status) === 'captured' && String(item.order_id || '') === orderId);
          providerPaymentId = String(captured?.id || '');
        }
        if (!providerPaymentId) throw httpError('RAZORPAY_PAYMENT_NOT_FOUND', 'No payment was found for this Wallet recharge order.', 503);
        const providerPayment = await paymentDetails(providerPaymentId, orderId, Number(walletRecharge.amountPaise));
        await walletAdapter.finalizeRecharge({
          ownerUid: walletRecharge.customerUid, rechargeId: walletRecharge.rechargeId,
          orderId, paymentId: providerPaymentId, amountPaise: Number(providerPayment.amount),
          currency: String(providerPayment.currency), source: 'razorpay_unified_webhook'
        });
      }
      return;
    }

    if (nextStatus === 'failed') {
      if (orderRecord.questionId) {
        const questionPath = QUESTION_COLLECTION + '/' + orderRecord.questionId;
        const question = await firestore.getDocument(questionPath);
        if (question.exists && question.data?.paymentStatus !== 'paid') {
          await firestore.setDocument(questionPath, {
            status: 'payment_failed', paymentStatus: 'failed',
            paymentUpdatedAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
          }, { merge: true });
        }
      }
      if (orderRecord.consultationId && enablePrivateConsultation) {
        const consultationPath = CONSULTATION_COLLECTION + '/' + orderRecord.consultationId;
        const consultation = await firestore.getDocument(consultationPath);
        if (consultation.exists && consultation.data?.paymentStatus !== 'paid') {
          await firestore.setDocument(consultationPath, {
            status: 'payment_failed', paymentStatus: 'failed',
            paymentUpdatedAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
          }, { merge: true });
        }
      }
      await firestore.setDocument(ORDER_COLLECTION + '/' + orderId, {
        status: 'failed', razorpayPaymentId: paymentId || null,
        lastWebhookEvent: eventType, updatedAt: firestoreTimestamp()
      }, { merge: true });
      return;
    }

    if (!['payment.authorized', 'payment.captured', 'order.paid'].includes(eventType)) return;
    let providerPaymentId = paymentId;
    if (!providerPaymentId) {
      const page = await razorpay.fetchOrderPayments(orderId, { count: 100, skip: 0 });
      const candidates = page.items.filter(item => constantStatus(item.status) === 'captured' && String(item.order_id || '') === orderId);
      providerPaymentId = String(candidates[0]?.id || '');
    }
    if (!providerPaymentId) throw httpError('RAZORPAY_PAYMENT_NOT_FOUND', 'No payment was found for this Razorpay order.', 503);

    if (orderRecord.questionId) {
      const qSnapshot = await firestore.getDocument(QUESTION_COLLECTION + '/' + orderRecord.questionId);
      if (!qSnapshot.exists) throw httpError('QUESTION_NOT_FOUND', 'Question order points to a missing question document.', 503);
      const expectedPaise = rupeesToPaise(qSnapshot.data?.amount);
      if (expectedPaise === null) throw httpError('QUESTION_AMOUNT_INVALID', 'Saved question amount is invalid.', 409);
      await paymentDetails(providerPaymentId, orderId, expectedPaise);
      await recordQuestionPayment({
        questionId: orderRecord.questionId, orderId, paymentId: providerPaymentId,
        source: 'razorpay_webhook'
      });
    }
    if (orderRecord.consultationId && enablePrivateConsultation) {
      const cSnapshot = await firestore.getDocument(CONSULTATION_COLLECTION + '/' + orderRecord.consultationId);
      if (!cSnapshot.exists) throw httpError('PRIVATE_CONSULTATION_NOT_FOUND', 'Consultation order points to a missing consultation document.', 503);
      const expectedPaise = rupeesToPaise(cSnapshot.data?.chatPrice || cSnapshot.data?.amount);
      if (expectedPaise === null) throw httpError('CONSULTATION_AMOUNT_INVALID', 'Saved consultation amount is invalid.', 409);
      await paymentDetails(providerPaymentId, orderId, expectedPaise);
      await recordPrivateConsultationPayment({
        consultationId: orderRecord.consultationId, orderId, paymentId: providerPaymentId,
        source: 'private_razorpay_webhook'
      });
    }
    await firestore.setDocument(ORDER_COLLECTION + '/' + orderId, {
      status: 'paid', razorpayPaymentId: providerPaymentId,
      lastWebhookEvent: eventType, updatedAt: firestoreTimestamp()
    }, { merge: true });
  }

  async function receiveUnifiedWebhook(req, res) {
    let claim = null;
    try {
      if (!webhookSecret) return res.status(503).send('Invalid webhook configuration');
      const body = rawBytes(req.body);
      const signature = String(req.get('X-Razorpay-Signature') || '').trim();
      if (!body || !signature) return res.status(400).send('Invalid webhook payload');
      if (!await razorpay.verifyWebhookSignature({ rawBody: body, signature, webhookSecret })) {
        return res.status(401).send('Invalid signature');
      }
      let event;
      try { event = JSON.parse(new TextDecoder().decode(body)); }
      catch { return res.status(400).send('Invalid webhook JSON'); }
      const eventType = String(event?.event || '');
      if (!/^[a-z][a-z0-9._-]{1,90}$/.test(eventType)) return res.status(400).send('Invalid webhook event type');
      claim = await claimWebhook(event, req, body);
      if (claim.alreadyProcessed) return res.status(200).send('OK');
      if (claim.inProgress) return res.status(503).set({ 'Retry-After': '5', 'Cache-Control': 'no-store' }).json({
        success: false, error: 'This Razorpay webhook event is already being processed.',
        code: 'RAZORPAY_WEBHOOK_IN_PROGRESS'
      });
      if (!claim.claimToken) throw httpError('RAZORPAY_WEBHOOK_CLAIM_UNAVAILABLE', 'Unable to claim the Razorpay webhook event safely.', 503);

      if (eventType.startsWith('refund.')) await reconcileRefundEvent(event);
      else await reconcilePaymentEvent(claim, event);

      await completeWebhookClaim(claim);
      return res.status(200).send('OK');
    } catch (error) {
      if (claim?.claimToken) {
        await walletAdapter.releaseWebhookEvent(
          claim.eventKey, claim.claimToken, String(error?.code || error?.message || 'webhook_processing_failed')
        ).catch(() => {});
      }
      console.error('[Razorpay Unified Webhook] processing failed:', error?.code || error?.message || error);
      return res.status(500).send('Webhook processing failed');
    }
  }

  async function syncRefund(entity, id, user, { customer = false } = {}) {
    const path = (entity === 'question' ? QUESTION_COLLECTION : CONSULTATION_COLLECTION) + '/' + id;
    const snapshot = await firestore.getDocument(path);
    if (!snapshot.exists) throw httpError(entity === 'question' ? 'QUESTION_NOT_FOUND' : 'PRIVATE_CONSULTATION_NOT_FOUND', 'Payment record not found.', 404);
    const record = snapshot.data || {};
    if (customer && String(record.customerId || '') !== user.uid) throw httpError('REFUND_ACCESS_DENIED', 'Access denied.', 403);
    if (!record.refundId) throw httpError('REFUND_NOT_FOUND', 'No refund ID exists. Admin can use Retry Refund to reconcile or create a refund.');
    const refund = await razorpay.fetchRefund(record.refundId);
    if (String(refund.payment_id || '') !== String(record.razorpayPaymentId || '')) {
      throw httpError('REFUND_PAYMENT_MISMATCH', 'Razorpay refund does not belong to the stored payment.', 409);
    }
    const refs = bankReferences(refund, record);
    const status = constantStatus(refund.status || 'pending');
    const patch = {
      refundStatus: status, refundAmount: paiseToRupees(Number(refund.amount || 0)),
      ...refs, refundSyncedAt: firestoreTimestamp(), updatedAt: firestoreTimestamp()
    };
    if (['processed', 'completed'].includes(status)) patch.refundProcessedAt = record.refundProcessedAt || firestoreTimestamp();
    if (status === 'failed') patch.refundFailedAt = record.refundFailedAt || firestoreTimestamp();
    await firestore.setDocument(path, patch, { merge: true });
    return { success: true, [entity === 'question' ? 'questionId' : 'consultationId']: id, refundId: refund.id, refundStatus: status, ...refs };
  }

  async function createRefund(entity, id, reason, user, { retry = false } = {}) {
    const collection = entity === 'question' ? QUESTION_COLLECTION : CONSULTATION_COLLECTION;
    const path = collection + '/' + id;
    let record;
    await firestore.runTransaction(async tx => {
      const snapshot = await tx.getDocument(path);
      if (!snapshot.exists) throw httpError('PAYMENT_RECORD_NOT_FOUND', 'Payment record not found.', 404);
      record = snapshot.data || {};
      if (entity === 'question') {
        if (retry && !['question_rejected', 'admin_rejected'].includes(String(record.status || ''))) {
          throw httpError('QUESTION_NOT_REJECTED', 'Only a rejected question can be retried.', 409);
        }
        if (!retry && !reason) throw httpError('REFUND_REASON_REQUIRED', 'Enter a rejection reason.', 400);
      } else if (!retry && !reason) {
        throw httpError('REFUND_REASON_REQUIRED', 'Enter a rejection reason.', 400);
      }
      if (record.refundId) return;
      if (Number(record.refundBusyUntil || 0) > Number(now())) throw httpError('REFUND_IN_PROGRESS', 'A refund request is already running. Wait and refresh its status.', 409);
      if (record.paymentStatus !== 'paid' || !/^pay_[A-Za-z0-9]+$/.test(String(record.razorpayPaymentId || ''))) {
        throw httpError('RAZORPAY_PAYMENT_ID_MISSING', 'A verified Razorpay payment ID is required. The internal customer payment reference cannot be refunded.', 409);
      }
      const amountPaise = rupeesToPaise(record.amount || record.chatPrice || record.paymentAmount);
      if (amountPaise === null || amountPaise < 100) throw httpError('REFUND_AMOUNT_INVALID', 'Saved INR refund amount is invalid.', 409);
      tx.update(path, {
        ...(entity === 'question' ? {
          status: 'question_rejected', allocationStatus: 'rejected_by_admin',
          adminQuestionRejectedAt: record.adminQuestionRejectedAt || firestoreTimestamp(),
          adminQuestionRejectedBy: user.uid,
          refundPreviousStatus: record.refundPreviousStatus || record.status,
          refundReason: reason || record.refundReason || 'Question rejected by Admin',
          refundRequestedAt: record.refundRequestedAt || firestoreTimestamp(),
          refundEligible: true,
          refundCommissionReviewRequired: record.commissionStatus === 'credited' || record.refundCommissionReviewRequired === true,
          ...(record.commissionStatus === 'credited' ? {} : { commissionStatus: 'refund_pending' })
        } : {
          status: 'question_rejected', allocationStatus: 'rejected_by_admin',
          adminQuestionRejectedAt: record.adminQuestionRejectedAt || firestoreTimestamp(),
          adminQuestionRejectedBy: user.uid,
          refundReason: reason || record.refundReason || 'Question rejected by Admin',
          commissionStatus: 'refund_pending'
        }),
        refundLastAttemptAt: firestoreTimestamp(), refundBusyUntil: Number(now()) + 90_000,
        refundStatus: record.refundStatus || 'pending', refundAmount: paiseToRupees(amountPaise),
        updatedAt: firestoreTimestamp()
      });
    });

    const freshSnapshot = await firestore.getDocument(path);
    record = freshSnapshot.data || record || {};
    if (record.refundId) return syncRefund(entity, id, user);
    try {
      const paymentId = String(record.razorpayPaymentId || '');
      const payment = await razorpay.fetchPayment(paymentId);
      if (record.razorpayOrderId && String(payment.order_id || '') !== String(record.razorpayOrderId)) {
        throw httpError('REFUND_ORDER_MISMATCH', 'Payment and saved order IDs do not match.', 409);
      }
      const amountPaise = rupeesToPaise(record.amount || record.chatPrice || record.paymentAmount);
      if (amountPaise === null || Number(payment.amount) < amountPaise ||
          String(payment.currency || '').toUpperCase() !== MONEY_CURRENCY) {
        throw httpError('REFUND_AMOUNT_MISMATCH', 'Saved refund amount does not match the INR payment.', 409);
      }

      const refunds = [];
      for (let skip = 0; skip <= 9900; skip += 100) {
        const page = await razorpay.fetchPaymentRefunds(paymentId, { count: 100, skip });
        refunds.push(...page.items);
        if (page.items.length < 100) break;
        if (skip === 9900) throw httpError('REFUND_HISTORY_LIMIT', 'Refund history requires manual review.', 409);
      }
      const existing = refunds.find(item => Number(item.amount) === amountPaise && constantStatus(item.status) !== 'failed');
      let refund;
      if (existing) {
        refund = existing;
      } else {
        if (constantStatus(payment.status) !== 'captured') throw httpError('PAYMENT_NOT_CAPTURED', 'Only a captured payment can be refunded.', 409);
        if (Number(payment.amount_refunded || 0) > 0 || refunds.some(item => constantStatus(item.status) !== 'failed')) {
          throw httpError('PARTIAL_REFUND_EXISTS', 'This payment already has another or partial refund. Review it before requesting a new refund.', 409);
        }
        const digest = (await digestHex(entity + ':' + id + ':' + paymentId + ':' + amountPaise, cryptoImpl)).slice(0, 32);
        refund = await razorpay.refundPayment(paymentId, {
          amountPaise,
          receipt: (entity === 'question' ? 'SMVQRF_' : 'SMVPCF_') + digest.slice(0, 24),
          notes: entity === 'question' ? { questionId: id } : { consultationId: id },
          idempotencyKey: (entity === 'question' ? 'smv-question-' : 'smv-private-') + digest
        });
      }

      const fullRefund = refund?.payment_id ? refund : await razorpay.fetchRefund(refund.id);
      if (String(fullRefund.payment_id || paymentId) !== paymentId) throw httpError('REFUND_PAYMENT_MISMATCH', 'Razorpay refund does not belong to this payment.', 409);
      const status = constantStatus(fullRefund.status || 'pending');
      const refs = bankReferences(fullRefund, record);
      const patch = {
        refundId: fullRefund.id, refundPaymentId: paymentId,
        refundAmount: paiseToRupees(Number(fullRefund.amount || amountPaise)),
        refundStatus: status, ...refs, refundBusyUntil: 0,
        refundCreatedAt: record.refundCreatedAt || firestoreTimestamp(),
        refundSyncedAt: firestoreTimestamp(), updatedAt: firestoreTimestamp(),
        ...(entity === 'question' ? { status: 'question_rejected', allocationStatus: 'rejected_by_admin' } : {})
      };
      if (['processed', 'completed'].includes(status)) patch.refundProcessedAt = record.refundProcessedAt || firestoreTimestamp();
      if (status === 'failed') patch.refundFailedAt = record.refundFailedAt || firestoreTimestamp();
      await firestore.setDocument(path, patch, { merge: true });
      const notificationId = 'refund_' + id + '_' + status;
      if (record.customerId) await firestore.setDocument(NOTIFICATION_COLLECTION + '/' + notificationId, {
        userId: record.customerId, type: 'refund_update', title: 'Refund update',
        message: (entity === 'question' ? 'Question ' : 'Private consultation ') + id + ': refund ' + status + '.',
        questionId: entity === 'question' ? id : null,
        consultationId: entity === 'private_consultation' ? id : null,
        refundId: fullRefund.id, refundStatus: status,
        ...refs, createdAt: firestoreTimestamp(), read: false
      }, { merge: true }).catch(() => {});
      return {
        success: true, [entity === 'question' ? 'questionId' : 'consultationId']: id,
        refundId: fullRefund.id, refundStatus: status, refundAmount: paiseToRupees(Number(fullRefund.amount || amountPaise)), ...refs
      };
    } catch (error) {
      const uncertain = ['RAZORPAY_UPSTREAM_UNAVAILABLE', 'AbortError', 'TimeoutError'].includes(String(error?.code || error?.name || ''));
      const description = String(error?.message || 'Refund failed.').slice(0, 500);
      await firestore.setDocument(path, {
        refundStatus: uncertain ? 'pending' : 'failed',
        refundError: uncertain
          ? 'Razorpay response was not received. Retry Refund will reconcile existing refunds before creating another request.'
          : description,
        refundErrorCode: String(error?.code || 'REFUND_REVIEW_REQUIRED'),
        refundLastAttemptAt: firestoreTimestamp(), refundBusyUntil: 0,
        updatedAt: firestoreTimestamp()
      }, { merge: true }).catch(() => {});
      throw error;
    }
  }

  async function createAndSyncPrivateRefund(req, res, retryOnly = false) {
    if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation refund route is disabled in this environment.' });
    const user = await requireAdmin(req);
    const id = safeId(req.body?.consultationId);
    if (!id) return res.status(400).json({ error: 'Consultation ID is required.' });
    const snapshot = await firestore.getDocument(CONSULTATION_COLLECTION + '/' + id);
    if (!snapshot.exists) return res.status(404).json({ error: 'Private consultation not found.' });
    if (retryOnly && snapshot.data?.refundId) return res.status(409).json({ error: 'Refund ID already exists. Use Sync Razorpay Refund.' });
    const result = await createRefund('private_consultation', id, String(req.body?.reason || snapshot.data?.refundReason || 'Question rejected by Admin').trim(), user, { retry: retryOnly });
    return res.status(result.success ? 200 : 502).json(result);
  }

  async function webhookMiddlewareRoute(req, res) {
    return receiveUnifiedWebhook(req, res);
  }

  app.post('/razorpay/webhook', webhookMiddlewareRoute);
  app.post('/create-order', async (req, res) => {
    try { return await safeCreateQuestionOrder(req, res); }
    catch (error) { return sendError(res, error, 'Unable to create Razorpay order.'); }
  });
  app.post('/verify-payment', async (req, res) => {
    try { return await verifyQuestionPayment(req, res); }
    catch (error) { return sendError(res, error, 'Payment verification failed.'); }
  });
  app.post('/admin/reject-question', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const id = safeId(req.body?.questionId);
      const reason = String(req.body?.reason || '').trim();
      if (!id) return res.status(400).json({ error: 'A valid Question ID is required.' });
      const result = await createRefund('question', id, reason, user, { retry: false });
      return res.status(result.success ? 200 : 502).json(result);
    } catch (error) { return sendError(res, error, 'Refund request failed.'); }
  });
  app.post('/admin/retry-refund', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const id = safeId(req.body?.questionId);
      if (!id) return res.status(400).json({ error: 'A valid Question ID is required.' });
      const result = await createRefund('question', id, '', user, { retry: true });
      return res.status(result.success ? 200 : 502).json(result);
    } catch (error) { return sendError(res, error, 'Refund retry failed.'); }
  });
  app.post('/customer/sync-refund', async (req, res) => {
    try {
      const user = await authenticate(req, ['customer']);
      const id = safeId(req.body?.questionId);
      if (!id) return res.status(400).json({ error: 'A valid Question ID is required.' });
      return res.json(await syncRefund('question', id, user, { customer: true }));
    } catch (error) { return sendError(res, error, 'Unable to sync refund.'); }
  });
  app.post('/admin/sync-refund', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const id = safeId(req.body?.questionId);
      if (!id) return res.status(400).json({ error: 'A valid Question ID is required.' });
      return res.json(await syncRefund('question', id, user));
    } catch (error) { return sendError(res, error, 'Unable to sync refund.'); }
  });
  app.post('/private-consultation/create-order', async (req, res) => {
    try { return await privateCreateOrder(req, res); }
    catch (error) { return sendError(res, error, 'Unable to create private consultation payment.'); }
  });
  app.post('/private-consultation/retry-payment', async (req, res) => {
    try { return await privateRetryPayment(req, res); }
    catch (error) { return sendError(res, error, 'Unable to retry private consultation payment.'); }
  });
  app.post('/private-consultation/cancel-payment', async (req, res) => {
    try { return await privateCancelPayment(req, res); }
    catch (error) { return sendError(res, error, 'Unable to cancel private consultation payment.'); }
  });
  app.post('/private-consultation/recover-payment', async (req, res) => {
    try { return await recoverPrivatePayment(req, res); }
    catch (error) { return sendError(res, error, 'Unable to recover private consultation payment.'); }
  });
  app.post('/private-consultation/verify-payment', async (req, res) => {
    try { return await verifyPrivatePayment(req, res); }
    catch (error) { return sendError(res, error, 'Unable to verify private consultation payment.'); }
  });
  app.post('/admin/private-consultation/reject-question', async (req, res) => {
    try { return await createAndSyncPrivateRefund(req, res, false); }
    catch (error) { return sendError(res, error, 'Private consultation refund failed.'); }
  });
  app.post('/admin/private-consultation/retry-refund', async (req, res) => {
    try { return await createAndSyncPrivateRefund(req, res, true); }
    catch (error) { return sendError(res, error, 'Private consultation refund retry failed.'); }
  });
  app.post('/admin/private-consultation/sync-refund', async (req, res) => {
    try {
      if (!enablePrivateConsultation) return res.status(410).json({ error: 'The legacy Private Consultation refund route is disabled in this environment.' });
      const user = await requireAdmin(req);
      const id = safeId(req.body?.consultationId);
      if (!id) return res.status(400).json({ error: 'Consultation ID is required.' });
      return res.json(await syncRefund('private_consultation', id, user));
    } catch (error) { return sendError(res, error, 'Unable to sync private consultation refund.'); }
  });
  app.get('/admin/refund-trace/:questionId', async (req, res) => {
    try {
      const user = await requireAdmin(req);
      const id = safeId(req.params?.questionId);
      if (!id) return res.status(400).json({ error: 'Question ID is required.' });
      const snapshot = await firestore.getDocument(QUESTION_COLLECTION + '/' + id);
      if (!snapshot.exists) return res.status(404).json({ error: 'Question not found.' });
      const data = snapshot.data || {};
      const paymentId = String(data.razorpayPaymentId || '');
      const result = {
        questionId: id, questionStatus: String(data.status || ''),
        paymentStatus: String(data.paymentStatus || ''),
        customerPaymentId: String(data.customerPaymentId || ''),
        razorpayPaymentId: paymentId || null, refundStatus: String(data.refundStatus || ''),
        refundId: String(data.refundId || ''), refundAmount: Number(data.refundAmount || data.amount || 0),
        storedRefundError: data.refundError || null, storedRefundErrorCode: data.refundErrorCode || null
      };
      if (paymentId) {
        const payment = await razorpay.fetchPayment(paymentId);
        result.paymentLookup = {
          id: payment.id, status: payment.status, amount: paiseToRupees(Number(payment.amount)),
          currency: payment.currency, orderId: payment.order_id
        };
      } else result.paymentLookup = 'not_available';
      if (data.refundId) {
        const refund = await razorpay.fetchRefund(data.refundId);
        result.refundLookup = { id: refund.id, status: refund.status, amount: paiseToRupees(Number(refund.amount)), ...bankReferences(refund, data) };
      }
      return res.json(result);
    } catch (error) { return sendError(res, error, 'Unable to load refund trace.'); }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/razorpay/webhook', '/create-order', '/verify-payment',
      '/admin/reject-question', '/admin/retry-refund', '/customer/sync-refund', '/admin/sync-refund',
      '/admin/refund-trace/:questionId',
      '/private-consultation/create-order', '/private-consultation/retry-payment',
      '/private-consultation/cancel-payment', '/private-consultation/recover-payment',
      '/private-consultation/verify-payment', '/admin/private-consultation/reject-question',
      '/admin/private-consultation/retry-refund', '/admin/private-consultation/sync-refund'
    ])
  });
}
