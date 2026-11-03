export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/healthz') {
      return new Response(JSON.stringify({ ok: false, code: 'NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      probe: 'native-worker-runtime',
      runtime: 'module-fetch',
      method: request.method
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
