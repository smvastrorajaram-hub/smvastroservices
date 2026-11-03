import express from 'express';
import { httpServerHandler } from 'cloudflare:node';

const app = express();
app.disable('x-powered-by');
app.get('/healthz', (_req, res) => {
  return res.set('Cache-Control', 'no-store').json({
    ok: true,
    probe: 'express-http-server-runtime',
    runtime: 'cloudflare-node-http-server'
  });
});
app.use((_req, res) => res.status(404).json({ ok: false, code: 'NOT_FOUND' }));

app.listen(3001);
export default httpServerHandler({ port: 3001 });
