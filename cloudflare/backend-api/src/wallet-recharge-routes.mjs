import { parseRupeesToPaise, paiseToRupees, walletRechargeError } from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

function fail(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'WALLET_RECHARGE_ERROR')
  });
}

function rawBodyBytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return null;
}

function safePaymentView(payment) {
  return {
    id: String(payment?.id || ''),
    orderId: String(payment?.order_id || ''),
    amountPaise: Number(payment?.amount),
    currency: String(payment?.currency || ''),
    status: String(payment?.status || '')
  };
}

/**
 * Customer Wallet recharge routes. Razorpay requests are made only through the
 * injected REST adapter; Wallet credits/bonus minutes are committed by one D1
 * batch whose ledger triggers update balances atomically.
 */
export function registerWalletRechargeRoutes({
  app,
  identityService,
  walletAdapter,
  razorpay,
  razorpayKeyId,
  razorpayWebhookSecret,
  isReady = async () => false,
  cryptoImpl = globalThis.crypto
} = {}) {
  if (!app || typeof app.post !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !walletAdapter || typeof walletAdapter.createRechargeIntent !== 'function' ||
      typeof walletAdapter.finalizeRecharge !== 'function' ||
      !razorpay || typeof razorpay.createOrder !== 'function' ||
      typeof razorpay.verifyPaymentSignature !== 'function' ||
      typeof razorpay.verifyWebhookSignature !== 'function' ||
      typeof razorpay.fetchPayment !== 'function' || typeof razorpay.capturePayment !== 'function') {
    throw new TypeError('Wallet recharge routes require shared identity, D1 Wallet and Razorpay adapters.');
  }

  const keyId = String(razorpayKeyId || '').trim();
  const webhookSecret = String(razorpayWebhookSecret || '');
  if (!keyId || !keyId.startsWith('rzp_test_')) {
    throw new TypeError('Cloudflare Wallet recharge adapter accepts Razorpay Test Mode keys only.');
  }

  async function customer(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (user.role !== 'customer') throw walletRechargeError('WALLET_CUSTOMER_REQUIRED', 'Customer login is required for Wallet recharge.', 403);
    return user;
  }

  app.post('/wallet/recharge/create-order', async (req, res) => {
    try {
      if (!(await isReady())) return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, error: 'Wallet recharge storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
      });
      const user = await customer(req);
      const amountPaise = parseRupeesToPaise(req.body?.amount);
      if (amountPaise === null || amountPaise < 100) {
        return res.status(400).json({ success: false, error: 'Enter a recharge amount of at least ₹1.00.', code: 'WALLET_RECHARGE_AMOUNT_INVALID' });
      }
      const requestedKey = String(req.body?.idempotencyKey || req.get('Idempotency-Key') || '').trim();
      const idempotencyKey = requestedKey || cryptoImpl.randomUUID();
      const intent = await walletAdapter.createRechargeIntent({
        ownerUid: user.uid, ownerRole: 'customer', amountPaise, idempotencyKey
      });
      if (intent.alreadyPaid) {
        return res.set('Cache-Control', 'no-store').json({
          success: true, alreadyPaid: true, rechargeId: intent.rechargeId,
          amount: paiseToRupees(amountPaise), amountPaise
        });
      }
      if (intent.inProgress) {
        return res.status(409).json({
          success: false, error: 'This recharge request is already being processed. Please retry shortly.',
          code: 'WALLET_RECHARGE_IN_PROGRESS', rechargeId: intent.rechargeId
        });
      }
      if (!intent.acquired && !intent.orderId) {
        return res.status(409).json({
          success: false, error: 'This recharge request is already being processed. Please retry shortly.',
          code: 'WALLET_RECHARGE_IN_PROGRESS', rechargeId: intent.rechargeId
        });
      }
      if (!intent.acquired && intent.orderId) {
        return res.set('Cache-Control', 'no-store').json({
          success: true, rechargeId: intent.rechargeId, orderId: intent.orderId,
          keyId, amount: amountPaise, amountPaise, amountRupees: paiseToRupees(amountPaise),
          currency: 'INR', reusedOrder: true
        });
      }

      try {
        const receipt = 'SMV_WR_' + intent.rechargeId.slice(0, 24);
        if (intent.retrying && typeof razorpay.findOrderByReceipt === 'function') {
          const recovered = await razorpay.findOrderByReceipt(receipt, { amountPaise, currency: 'INR' });
          if (recovered) {
            await walletAdapter.attachRechargeOrder({
              ownerUid: user.uid, rechargeId: intent.rechargeId,
              orderId: recovered.id, amountPaise, currency: 'INR', receipt
            });
            return res.set('Cache-Control', 'no-store').json({
              success: true, rechargeId: intent.rechargeId, orderId: recovered.id,
              keyId, amount: amountPaise, amountPaise, amountRupees: paiseToRupees(amountPaise),
              currency: 'INR', recoveredOrder: true
            });
          }
        }
        const order = await razorpay.createOrder({
          amountPaise,
          currency: 'INR',
          receipt,
          notes: { walletRechargeId: intent.rechargeId, customerUid: user.uid }
        });
        await walletAdapter.attachRechargeOrder({
          ownerUid: user.uid, rechargeId: intent.rechargeId,
          orderId: order.id, amountPaise, currency: 'INR', receipt
        });
        return res.set('Cache-Control', 'no-store').json({
          success: true, rechargeId: intent.rechargeId, orderId: order.id,
          keyId, amount: amountPaise, amountPaise, amountRupees: paiseToRupees(amountPaise), currency: 'INR'
        });
      } catch (error) {
        await walletAdapter.markRechargeOrderFailed({
          ownerUid: user.uid, rechargeId: intent.rechargeId,
          reason: String(error?.code || error?.message || 'order_create_failed')
        }).catch(() => {});
        return fail(res, error, 'Unable to create Wallet recharge order.');
      }
    } catch (error) {
      return fail(res, error, 'Unable to create Wallet recharge order.');
    }
  });

  app.post('/wallet/recharge/verify', async (req, res) => {
    try {
      if (!(await isReady())) return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, error: 'Wallet recharge storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
      });
      const user = await customer(req);
      const rechargeId = String(req.body?.rechargeId || '').trim();
      const orderId = String(req.body?.razorpay_order_id || req.body?.orderId || '').trim();
      const paymentId = String(req.body?.razorpay_payment_id || req.body?.paymentId || '').trim();
      const signature = String(req.body?.razorpay_signature || req.body?.signature || '').trim();
      if (!rechargeId || !orderId || !paymentId || !signature) {
        return res.status(400).json({ success: false, error: 'Wallet recharge verification data is incomplete.', code: 'WALLET_RECHARGE_INVALID' });
      }
      const recharge = await walletAdapter.getRechargeForOwner({ ownerUid: user.uid, rechargeId });
      if (recharge.orderId !== orderId) throw walletRechargeError('WALLET_ORDER_MISMATCH', 'Razorpay order does not match this Wallet recharge.', 409);
      if (recharge.status === 'paid') {
        const wallet = await walletAdapter.getWallet(user.uid);
        return res.set('Cache-Control', 'no-store').json({
          success: true, verified: true, alreadyCredited: true, rechargeId,
          amount: paiseToRupees(recharge.amountPaise),
          availableBalance: paiseToRupees(wallet?.availableBalancePaise || 0),
          bonusMinutesCredited: recharge.bonusMinutesCredited,
          bonusMinutesBalance: wallet?.bonusMinutesBalance || 0
        });
      }
      const signatureValid = await razorpay.verifyPaymentSignature({ orderId, paymentId, signature });
      if (!signatureValid) return res.status(400).json({ success: false, error: 'Wallet recharge payment signature verification failed.', code: 'RAZORPAY_SIGNATURE_INVALID' });

      let payment = await razorpay.fetchPayment(paymentId);
      let view = safePaymentView(payment);
      if (view.orderId !== orderId || view.amountPaise !== recharge.amountPaise || view.currency !== 'INR') {
        throw walletRechargeError('WALLET_PAYMENT_MISMATCH', 'Razorpay payment details do not match this Wallet recharge.', 409);
      }
      if (view.status === 'authorized') {
        try {
          payment = await razorpay.capturePayment(paymentId, recharge.amountPaise, 'INR');
        } catch {
          payment = await razorpay.fetchPayment(paymentId);
        }
        view = safePaymentView(payment);
      }
      if (view.status !== 'captured') {
        throw walletRechargeError('WALLET_PAYMENT_CAPTURE_PENDING', 'Payment capture is pending. Reopen Wallet and verify the recharge again.', 409);
      }

      const result = await walletAdapter.finalizeRecharge({
        ownerUid: user.uid, rechargeId, orderId, paymentId,
        amountPaise: view.amountPaise, currency: view.currency, source: 'payment_verification'
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true, verified: true, alreadyCredited: result.alreadyProcessed,
        rechargeId, paymentId, amount: paiseToRupees(result.amountPaise || view.amountPaise),
        availableBalance: paiseToRupees(result.availableBalancePaise),
        bonusMinutesCredited: Number(result.bonusMinutesCredited || 0),
        bonusMinutesBalance: Number(result.bonusMinutesBalance || 0)
      });
    } catch (error) {
      return fail(res, error, 'Unable to verify Wallet recharge.');
    }
  });

  app.post('/wallet/recharge/webhook', async (req, res) => {
    try {
      if (!(await isReady())) return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, error: 'Wallet recharge storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
      });
      if (!webhookSecret) return res.status(503).json({ success: false, error: 'Wallet webhook is not configured.' });
      const rawBody = rawBodyBytes(req.body);
      const signature = String(req.get('X-Razorpay-Signature') || '').trim();
      if (!rawBody || !signature) return res.status(400).json({ success: false, error: 'Webhook signature or raw body is missing.' });
      const valid = await razorpay.verifyWebhookSignature({ rawBody, signature, webhookSecret });
      if (!valid) return res.status(401).json({ success: false, error: 'Invalid Razorpay webhook signature.' });
      let event;
      try { event = JSON.parse(new TextDecoder().decode(rawBody)); }
      catch { return res.status(400).json({ success: false, error: 'Webhook JSON is invalid.' }); }

      const eventType = String(event?.event || 'unknown');
      const paymentEntity = event?.payload?.payment?.entity || null;
      const orderEntity = event?.payload?.order?.entity || null;
      const paymentId = String(paymentEntity?.id || '').trim();
      const orderId = String(orderEntity?.id || paymentEntity?.order_id || '').trim();
      if (!orderId) return res.status(200).send('OK');
      const eventKeyPart = paymentId || orderId;
      // Prefer Razorpay's stable delivery event ID for duplicate detection;
      // retain a deterministic fallback for older webhook deliveries.
      const providerEventId = String(req.get('X-Razorpay-Event-Id') || '').trim();
      const safeProviderEventId = /^[A-Za-z0-9:_-]{1,230}$/.test(providerEventId) ? providerEventId : '';
      const eventKey = safeProviderEventId
        ? ('razorpay_' + safeProviderEventId)
        : (eventType + '_' + eventKeyPart).replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 240);
      const recorded = await walletAdapter.recordWebhookEvent({
        eventKey, eventType, paymentId: paymentId || null, orderId,
        payload: { event: eventType, paymentId, orderId }
      });
      if (recorded.alreadyProcessed) return res.status(200).send('OK');

      const recharge = await walletAdapter.getRechargeByOrderId(orderId);
      if (!recharge) {
        await walletAdapter.completeWebhookEvent(eventKey);
        return res.status(200).send('OK');
      }
      if (eventType === 'payment.failed') {
        // A late failure from another payment attempt must not downgrade a
        // recharge that has already been atomically credited as paid.
        if (recharge.status !== 'paid') {
          await walletAdapter.markRechargePaymentFailed({ orderId, paymentId, reason: 'razorpay_payment_failed' });
        }
        await walletAdapter.completeWebhookEvent(eventKey);
        return res.status(200).send('OK');
      }
      if (!['payment.captured', 'order.paid'].includes(eventType) || !paymentId) {
        await walletAdapter.completeWebhookEvent(eventKey);
        return res.status(200).send('OK');
      }

      const payment = await razorpay.fetchPayment(paymentId);
      const view = safePaymentView(payment);
      if (view.orderId !== orderId || view.amountPaise !== recharge.amountPaise || view.currency !== 'INR' || view.status !== 'captured') {
        throw walletRechargeError('WALLET_PAYMENT_MISMATCH', 'Captured Razorpay payment does not match this Wallet recharge.', 409);
      }
      await walletAdapter.finalizeRecharge({
        ownerUid: recharge.customerUid, rechargeId: recharge.rechargeId,
        orderId, paymentId, amountPaise: view.amountPaise, currency: view.currency,
        source: 'razorpay_webhook'
      });
      await walletAdapter.completeWebhookEvent(eventKey);
      return res.status(200).send('OK');
    } catch (error) {
      console.warn('[Wallet Recharge Webhook] processing failed:', error?.code || error?.message || error);
      return res.status(500).json({ success: false, error: 'Wallet webhook processing failed. Provider retry is required.' });
    }
  });

  return Object.freeze({ paths: Object.freeze([
    '/wallet/recharge/create-order', '/wallet/recharge/verify', '/wallet/recharge/webhook'
  ]) });
}
