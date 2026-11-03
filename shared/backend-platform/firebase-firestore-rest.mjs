'use strict';

const FIRESTORE_API_ROOT = 'https://firestore.googleapis.com/v1';
const MAX_DOCUMENT_PATH_LENGTH = 1500;

function firestoreError(code, status = 502) {
  return Object.assign(new Error(code), { code, httpStatus: status });
}

function encodeDocumentPath(projectId, documentPath) {
  const project = String(projectId || '').trim();
  const path = String(documentPath || '').replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9][a-z0-9-]{4,29}$/.test(project) ||
      !path || path.length > MAX_DOCUMENT_PATH_LENGTH ||
      path.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw firestoreError('FIRESTORE_DOCUMENT_PATH_INVALID', 400);
  }
  return 'projects/' + encodeURIComponent(project) +
    '/databases/(default)/documents/' +
    path.split('/').map(encodeURIComponent).join('/');
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue === true;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) {
    const number = Number(value.integerValue);
    return Number.isSafeInteger(number) ? number : String(value.integerValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return String(value.stringValue);
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return String(value.timestampValue);
  if (Object.prototype.hasOwnProperty.call(value, 'bytesValue')) return String(value.bytesValue);
  if (Object.prototype.hasOwnProperty.call(value, 'referenceValue')) return String(value.referenceValue);
  if (Object.prototype.hasOwnProperty.call(value, 'geoPointValue')) {
    const point = value.geoPointValue || {};
    return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
  }
  if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
    return Array.isArray(value.arrayValue?.values)
      ? value.arrayValue.values.map(decodeFirestoreValue)
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return null;
}

function decodeDocument(document) {
  const fields = document?.fields || {};
  const data = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
  return {
    exists: true,
    id: String(document.name || '').split('/').pop() || '',
    name: String(document.name || ''),
    createTime: document.createTime || null,
    updateTime: document.updateTime || null,
    data
  };
}

/**
 * Firestore REST transport using the caller's verified Firebase ID token.
 *
 * The token is deliberately passed for each operation. This makes Firestore
 * Security Rules enforce the same caller ownership/admin claims in both Node
 * (Render) and Cloudflare Workers, instead of using an Admin credential that
 * bypasses Security Rules.
 */
export function createFirebaseFirestoreRestClient({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('A Fetch-compatible implementation is required.');
  }

  async function getDocument({ projectId, documentPath, idToken }) {
    const token = String(idToken || '').trim();
    if (!token || token.length > 16 * 1024) throw firestoreError('FIRESTORE_AUTH_REQUIRED', 401);
    const resource = encodeDocumentPath(projectId, documentPath);
    const url = FIRESTORE_API_ROOT + '/' + resource;

    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });
    } catch (_) {
      throw firestoreError('FIRESTORE_UPSTREAM_UNAVAILABLE', 503);
    }

    if (response.status === 404) {
      return { exists: false, id: String(documentPath).split('/').pop(), name: url, data: null };
    }
    if (response.status === 401) throw firestoreError('FIRESTORE_UNAUTHENTICATED', 401);
    if (response.status === 403) throw firestoreError('FIRESTORE_PERMISSION_DENIED', 403);
    if (!response.ok) {
      throw firestoreError(
        response.status >= 500 ? 'FIRESTORE_UPSTREAM_UNAVAILABLE' : 'FIRESTORE_REQUEST_REJECTED',
        response.status >= 500 ? 503 : 502
      );
    }

    let document;
    try {
      document = await response.json();
    } catch (_) {
      throw firestoreError('FIRESTORE_RESPONSE_INVALID', 502);
    }
    if (!document || typeof document.name !== 'string' || !document.name) {
      throw firestoreError('FIRESTORE_RESPONSE_INVALID', 502);
    }
    return decodeDocument(document);
  }

  return Object.freeze({ getDocument });
}

export { decodeFirestoreValue, decodeDocument, encodeDocumentPath };
