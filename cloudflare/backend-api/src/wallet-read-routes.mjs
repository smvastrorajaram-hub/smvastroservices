import { safePaise, safeMinutes, walletError } from '../../../shared/backend-platform/wallet-domain.mjs';

export function isWalletReadRouteGateOpen(env = {}) {
  return String(env.WALLET_READ_ROUTES_ENABLED || '').toLowerCase() === 'true' &&
    String(env.SMV_WALLET_DOMAIN_BACKFILL_COMPLETE || '').toLowerCase() === 'true' &&
    String(env.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE || '').toLowerCase() === 'true';
}

function rupees(value) {
  return Math.round(safePaise(value)) / 100;
}

function iso(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(
    typeof value === 'number' ? value : typeof value?.toMillis === 'function' ? value.toMillis() : value
  );
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function replyError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'WALLET_ERROR')
  });
}

function transactionView(row = {}) {
  const amountPaise = safePaise(row.amountPaise);
  const balanceAfterPaise = safePaise(row.balanceAfterPaise);
  const reservedBalanceAfterPaise = safePaise(row.reservedBalanceAfterPaise);
  const bonusMinutes = safeMinutes(row.bonusMinutes ?? row.bonusMinutesCredited);
  return {
    id: String(row.id || ''),
    type: String(row.type || ''),
    direction: String(row.direction || ''),
    status: String(row.status || ''),
    amountPaise,
    amount: rupees(amountPaise),
    balanceAfterPaise,
    balanceAfter: rupees(balanceAfterPaise),
    reservedBalanceAfterPaise,
    bonusMinutes,
    bonusMinutesCredited: safeMinutes(row.bonusMinutesCredited ?? bonusMinutes),
    bonusMinutesBalanceAfter: safeMinutes(row.bonusMinutesBalanceAfter),
    note: String(row.note || ''),
    referenceType: String(row.referenceType || ''),
    referenceId: String(row.referenceId || ''),
    createdAt: iso(row.createdAt)
  };
}

/**
 * Read-only Wallet HTTP handlers. No recharge, ledger mutation or Live settlement
 * is registered here. The same handlers accept either Firestore or D1 Wallet adapters.
 */
export function registerWalletReadRoutes({ app, identityService, walletAdapter, adminWalletUid = '', isReady = async () => true } = {}) {
  if (!app || typeof app.get !== 'function' || !identityService ||
      typeof identityService.authenticateAuthorization !== 'function' || !walletAdapter ||
      typeof walletAdapter.ensureWallet !== 'function' || typeof walletAdapter.listTransactions !== 'function') {
    throw new TypeError('Wallet read routes require an HTTP app, identity service and Wallet repository.');
  }

  async function authenticatedRole(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (!['customer', 'astrologer', 'admin'].includes(user.role)) {
      throw walletError('WALLET_ROLE_REQUIRED', 'Customer, Astrologer, or Admin login is required for Wallet.', 403);
    }
    return user;
  }

  function walletOwner(user) {
    return {
      ownerUid: user.role === 'admin' ? String(adminWalletUid || user.uid) : user.uid,
      ownerRole: user.role
    };
  }

  app.get('/wallet', async (req, res) => {
    try {
      if (!(await isReady())) return res.status(503).set('Cache-Control', 'no-store').json({ success: false, error: 'Wallet storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY' });
      const user = await authenticatedRole(req);
      const owner = walletOwner(user);
      const wallet = await walletAdapter.ensureWallet(owner.ownerUid, owner.ownerRole);
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        wallet: {
          ownerRole: owner.ownerRole,
          currency: 'INR',
          availableBalancePaise: wallet.availableBalancePaise,
          availableBalance: rupees(wallet.availableBalancePaise),
          reservedBalancePaise: wallet.reservedBalancePaise,
          reservedBalance: rupees(wallet.reservedBalancePaise),
          bonusMinutesBalance: wallet.bonusMinutesBalance,
          reservedBonusMinutes: wallet.reservedBonusMinutes,
          totalBalancePaise: safePaise(wallet.availableBalancePaise) + safePaise(wallet.reservedBalancePaise),
          totalBalance: rupees(safePaise(wallet.availableBalancePaise) + safePaise(wallet.reservedBalancePaise)),
          updatedAt: iso(wallet.updatedAt)
        }
      });
    } catch (error) {
      return replyError(res, error, 'Unable to load Wallet.');
    }
  });

  app.get('/wallet/transactions', async (req, res) => {
    try {
      if (!(await isReady())) return res.status(503).set('Cache-Control', 'no-store').json({ success: false, error: 'Wallet storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY' });
      const user = await authenticatedRole(req);
      const owner = walletOwner(user);
      const rawLimit = Number(req.query?.limit || 30);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 30;
      const [wallet, transactions] = await Promise.all([
        walletAdapter.ensureWallet(owner.ownerUid, owner.ownerRole),
        walletAdapter.listTransactions(owner.ownerUid, limit)
      ]);
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        wallet: {
          availableBalancePaise: wallet.availableBalancePaise,
          availableBalance: rupees(wallet.availableBalancePaise),
          reservedBalancePaise: wallet.reservedBalancePaise,
          reservedBalance: rupees(wallet.reservedBalancePaise),
          bonusMinutesBalance: wallet.bonusMinutesBalance,
          reservedBonusMinutes: wallet.reservedBonusMinutes
        },
        transactions: (transactions || []).map(transactionView)
      });
    } catch (error) {
      return replyError(res, error, 'Unable to load Wallet transactions.');
    }
  });

  return Object.freeze({ paths: Object.freeze(['/wallet', '/wallet/transactions']) });
}
