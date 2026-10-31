import {
  WALLET_OFFER_THEMES,
  offerDateMilliseconds,
  parseRupeesToPaise,
  walletRechargeError
} from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

function reply(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'WALLET_OFFER_ERROR')
  });
}

function textValue(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function dateValue(value, fieldName) {
  if (value == null || String(value).trim() === '') return null;
  const milliseconds = offerDateMilliseconds(value);
  if (milliseconds === null) {
    throw walletRechargeError('WALLET_OFFER_DATE_INVALID', fieldName + ' must be a valid date and time (India time).', 400);
  }
  return milliseconds;
}

function publicOfferView(offer) {
  return {
    id: String(offer.id || ''),
    name: String(offer.name || ''),
    bannerTheme: WALLET_OFFER_THEMES.includes(offer.bannerTheme) ? offer.bannerTheme : 'auto',
    minimumRechargeAmountPaise: Number(offer.minimumRechargeAmountPaise || 0),
    bonusMinutes: Number(offer.bonusMinutes || 0),
    perCustomerLimit: Number(offer.perCustomerLimit ?? 1),
    startAt: offer.startAt || null,
    endAt: offer.endAt || null,
    priority: Number(offer.priority || 0)
  };
}

/** Admin Offer API kept compatible with the existing SMV ASTRO dashboard routes. */
export function registerWalletOfferRoutes({
  app,
  identityService,
  walletAdapter,
  isReady = async () => false
} = {}) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !walletAdapter || typeof walletAdapter.listWalletOffers !== 'function' ||
      typeof walletAdapter.saveWalletOffer !== 'function' ||
      typeof walletAdapter.deleteWalletOffer !== 'function') {
    throw new TypeError('Wallet Offer routes require shared identity and D1 Wallet Offer methods.');
  }

  async function requireAdmin(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (user.isAdmin !== true && user.role !== 'admin') {
      throw walletRechargeError('ADMIN_REQUIRED', 'Admin access denied.', 403);
    }
    return user;
  }

  app.get('/wallet/recharge-offers', async (_req, res) => {
    try {
      if (!(await isReady())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          success: false, error: 'Wallet Offer storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
        });
      }
      const offers = await walletAdapter.listWalletOffers({ activeOnly: true });
      return res.set('Cache-Control', 'no-store').json({
        success: true, offers: (offers || []).map(publicOfferView)
      });
    } catch (error) {
      return reply(res, error, 'Unable to load active Wallet offers.');
    }
  });

  app.get('/admin/offers', async (req, res) => {
    try {
      if (!(await isReady())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          success: false, error: 'Wallet Offer storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
        });
      }
      await requireAdmin(req);
      const offers = await walletAdapter.listWalletOffers({ activeOnly: false });
      return res.set('Cache-Control', 'no-store').json({ success: true, offers: offers || [] });
    } catch (error) {
      return reply(res, error, 'Unable to load Wallet recharge offers.');
    }
  });

  app.post('/admin/offers/save', async (req, res) => {
    try {
      if (!(await isReady())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          success: false, error: 'Wallet Offer storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
        });
      }
      const user = await requireAdmin(req);
      const body = req.body || {};
      const id = textValue(body.id, 100);
      if (id && !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw walletRechargeError('WALLET_OFFER_ID_INVALID', 'Invalid Offer ID.', 400);
      }
      const name = textValue(body.name, 120);
      const bannerTheme = String(body.bannerTheme || 'auto');
      const minimumRechargeAmountPaise = parseRupeesToPaise(body.minimumRechargeAmount ?? '0', { allowZero: true });
      const bonusMinutes = Number(body.bonusMinutes);
      const perCustomerLimit = Number(body.perCustomerLimit ?? 1);
      const totalUsageLimit = Number(body.totalUsageLimit ?? 0);
      const priority = Number(body.priority ?? 0);
      const startAtMs = dateValue(body.startAt, 'Start Date');
      const endAtMs = dateValue(body.endAt, 'End Date');

      if (!name) throw walletRechargeError('WALLET_OFFER_NAME_REQUIRED', 'Offer Name is required.', 400);
      if (!WALLET_OFFER_THEMES.includes(bannerTheme) || bannerTheme === 'welcome') {
        throw walletRechargeError('WALLET_OFFER_THEME_INVALID', 'Choose an available festival Offer theme.', 400);
      }
      if (minimumRechargeAmountPaise === null || minimumRechargeAmountPaise < 0) {
        throw walletRechargeError('WALLET_OFFER_MINIMUM_INVALID', 'Minimum recharge must be ₹0 or a positive amount with up to two decimal places.', 400);
      }
      if (!Number.isSafeInteger(bonusMinutes) || bonusMinutes < 1 || bonusMinutes > 1440) {
        throw walletRechargeError('WALLET_OFFER_BONUS_INVALID', 'Free minutes must be a whole number from 1 to 1,440.', 400);
      }
      if (!Number.isSafeInteger(perCustomerLimit) || perCustomerLimit < 0 || perCustomerLimit > 10000) {
        throw walletRechargeError('WALLET_OFFER_CUSTOMER_LIMIT_INVALID', 'Per-customer limit must be 0 (unlimited) or a whole number up to 10,000.', 400);
      }
      if (!Number.isSafeInteger(totalUsageLimit) || totalUsageLimit < 0 || totalUsageLimit > 1000000) {
        throw walletRechargeError('WALLET_OFFER_TOTAL_LIMIT_INVALID', 'Total usage limit must be 0 (unlimited) or a whole number up to 1,000,000.', 400);
      }
      if (!Number.isSafeInteger(priority) || priority < -1000 || priority > 1000) {
        throw walletRechargeError('WALLET_OFFER_PRIORITY_INVALID', 'Offer priority must be a whole number from -1,000 to 1,000.', 400);
      }
      if (startAtMs !== null && endAtMs !== null && startAtMs >= endAtMs) {
        throw walletRechargeError('WALLET_OFFER_DATE_RANGE_INVALID', 'End Date must be later than Start Date.', 400);
      }

      const offer = await walletAdapter.saveWalletOffer({
        id: id || undefined,
        name,
        bannerTheme,
        enabled: body.enabled === true,
        minimumRechargeAmountPaise,
        bonusMinutes,
        perCustomerLimit,
        totalUsageLimit,
        priority,
        startAtMs,
        endAtMs,
        updatedBy: user.uid
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true, id: offer.id, offer
      });
    } catch (error) {
      return reply(res, error, 'Unable to save Wallet Offer.');
    }
  });

  app.post('/admin/offers/delete', async (req, res) => {
    try {
      if (!(await isReady())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          success: false, error: 'Wallet Offer storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
        });
      }
      await requireAdmin(req);
      const id = textValue(req.body?.id, 100);
      if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw walletRechargeError('WALLET_OFFER_ID_INVALID', 'Invalid Offer ID.', 400);
      }
      const result = await walletAdapter.deleteWalletOffer(id);
      return res.set('Cache-Control', 'no-store').json(result);
    } catch (error) {
      return reply(res, error, 'Unable to delete Wallet Offer.');
    }
  });

  return Object.freeze({ paths: Object.freeze([
    '/wallet/recharge-offers', '/admin/offers', '/admin/offers/save', '/admin/offers/delete'
  ]) });
}
