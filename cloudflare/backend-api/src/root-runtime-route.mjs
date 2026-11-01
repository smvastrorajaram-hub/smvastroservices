export function registerRootRuntimeRoute({ app, env = {} } = {}) {
  if (!app || typeof app.get !== 'function') {
    throw new TypeError('Root runtime route requires an HTTP app.');
  }

  app.get('/', (_req, res) => {
    return res.status(200).set('Cache-Control', 'no-store').json({
      ok: true,
      service: 'smvastro-backend-api',
      runtime: 'cloudflare-workers-express-http-bridge',
      environment: String(env.SMV_ENVIRONMENT || 'unknown'),
      surface: 'backend-api',
      health: '/healthz',
      readiness: '/api/backend/readiness',
      message: 'Worker runtime is reachable. Business-route readiness is reported separately.'
    });
  });

  return Object.freeze({ path: '/' });
}
