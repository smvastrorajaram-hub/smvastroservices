function sendError(res, error) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    ok: false,
    connectionVerified: false,
    mode: 'unverified',
    code: String(error?.code || 'RAZORPAY_CONNECTIVITY_CHECK_FAILED'),
    error: status >= 500
      ? 'Razorpay connectivity could not be verified.'
      : String(error?.message || 'Razorpay connectivity could not be verified.')
  });
}

/**
 * Admin-only read-only payment provider check.
 * This sends GET /orders?count=1 and never creates an order/payment/refund.
 */
export function registerRazorpayConnectivityRoute({
  app,
  identityService,
  razorpay,
  mode = 'disabled',
  keyId = '',
  credentialsConfigured = false
} = {}) {
  if (!app || typeof app.get !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !razorpay || typeof razorpay.testConnection !== 'function') {
    throw new TypeError('Razorpay connectivity route requires Admin identity and a read-only provider probe.');
  }

  app.get('/test-razorpay', async (req, res) => {
    try {
      const actor = await identityService.authenticateAuthorization(req.get('Authorization'));
      if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
        return res.status(403).set('Cache-Control', 'no-store').json({
          ok: false, connectionVerified: false, code: 'ADMIN_REQUIRED',
          error: 'Admin access is required.'
        });
      }
      if (credentialsConfigured !== true || !['test', 'live'].includes(String(mode).toLowerCase())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          ok: false, connectionVerified: false, code: 'RAZORPAY_CREDENTIALS_NOT_CONFIGURED',
          error: 'Razorpay credentials for the selected environment are not configured.'
        });
      }

      const result = await razorpay.testConnection();
      return res.set('Cache-Control', 'no-store').json({
        ok: true,
        connectionVerified: true,
        provider: 'razorpay',
        mode,
        keyPrefix: String(keyId).slice(0, 9),
        operation: 'GET /orders?count=1',
        readOnly: true,
        ordersVisible: Number(result.visibleOrders) || 0,
        message: 'Razorpay ' + mode + ' credentials were accepted by the provider.'
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  return Object.freeze({ path: '/test-razorpay' });
}
