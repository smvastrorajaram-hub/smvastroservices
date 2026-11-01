/**
 * Read-only Firestore Admin connectivity proof for the Staging Worker.
 *
 * A GET of a reserved, non-existent sentinel document verifies that the
 * service-account token can reach the Firestore data plane without reading
 * customer/admin records or writing data. Firestore 404 is represented by
 * the Admin REST adapter as { exists: false }, and still proves connectivity.
 */
export function createFirebaseConnectivityProbe({
  firestore,
  documentPath = 'smv_runtime/readiness',
  ttlMs = 30000,
  now = () => Date.now()
} = {}) {
  if (!firestore || typeof firestore.getDocument !== 'function') {
    return async () => false;
  }

  const path = String(documentPath || '').trim();
  const ttl = Math.max(0, Number(ttlMs) || 0);
  if (!path || path.split('/').length % 2 !== 0) {
    throw new TypeError('Firebase readiness probe requires a Firestore document path.');
  }

  let cacheUntil = 0;
  let connected = false;
  let inFlight = null;

  return async function isFirebaseConnected() {
    const current = Number(now());
    if (cacheUntil > current) return connected;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let result = false;
      try {
        const snapshot = await firestore.getDocument(path);
        result = Boolean(snapshot && typeof snapshot.exists === 'boolean');
      } catch {
        result = false;
      }
      connected = result;
      cacheUntil = Number(now()) + ttl;
      return connected;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}
