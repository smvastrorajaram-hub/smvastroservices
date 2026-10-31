import { createGoogleServiceAccountTokenProvider } from './google-service-account-token.mjs';

const FIRESTORE_ROOT = 'https://firestore.googleapis.com/v1';
const OMIT = Symbol('omit');

function firestoreError(code, status = 502, details = {}) {
  return Object.assign(new Error(code), { code, httpStatus: status, ...details });
}

function projectIdValid(value) {
  return /^[a-z0-9][a-z0-9-]{4,29}$/.test(String(value || ''));
}

function pathSegments(value, { document = false } = {}) {
  const path = String(value || '').replace(/^\/+|\/+$/g, '');
  const segments = path ? path.split('/') : [];
  if (!segments.length || segments.some(part => !part || part === '.' || part === '..' || part.length > 1500)) {
    throw firestoreError('FIRESTORE_PATH_INVALID', 400);
  }
  if (document && segments.length % 2 !== 0) throw firestoreError('FIRESTORE_DOCUMENT_PATH_INVALID', 400);
  if (!document && segments.length % 2 !== 1) throw firestoreError('FIRESTORE_COLLECTION_PATH_INVALID', 400);
  return segments;
}

function encodePath(path) {
  return pathSegments(path).map(segment => encodeURIComponent(segment)).join('/');
}

function documentResource(projectId, path) {
  const segments = pathSegments(path, { document: true });
  return 'projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents/' +
    segments.map(segment => encodeURIComponent(segment)).join('/');
}

function fieldPath(segments) {
  return segments.map(segment => {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return segment;
    return '`' + String(segment).replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
  }).join('.');
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date ||
      value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function operationOf(value) {
  return value && typeof value === 'object' && typeof value.__smvFirestoreFieldOperation === 'string'
    ? value.__smvFirestoreFieldOperation : '';
}

export const FirestoreFieldValue = Object.freeze({
  serverTimestamp: () => Object.freeze({ __smvFirestoreFieldOperation: 'serverTimestamp' }),
  delete: () => Object.freeze({ __smvFirestoreFieldOperation: 'delete' }),
  increment: amount => {
    const value = Number(amount);
    if (!Number.isFinite(value)) throw new TypeError('Firestore increment requires a finite number.');
    return Object.freeze({ __smvFirestoreFieldOperation: 'increment', value });
  },
  arrayUnion: (...values) => Object.freeze({ __smvFirestoreFieldOperation: 'arrayUnion', values }),
  arrayRemove: (...values) => Object.freeze({ __smvFirestoreFieldOperation: 'arrayRemove', values })
});

function base64(bytes) {
  const value = new Uint8Array(bytes);
  let binary = '';
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, Math.min(value.length, offset + 0x8000)));
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(String(value || ''));
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) result[i] = binary.charCodeAt(i);
  return result;
}

export function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Firestore values must contain finite numbers.');
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'bigint') return { integerValue: String(value) };
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Firestore timestamp is invalid.');
    return { timestampValue: value.toISOString() };
  }
  if (value instanceof ArrayBuffer) return { bytesValue: base64(value) };
  if (ArrayBuffer.isView(value)) return { bytesValue: base64(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (isPlainObject(value)) {
    if (operationOf(value)) throw new TypeError('Firestore field operations must be attached to a document field.');
    const fields = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue;
      fields[key] = encodeFirestoreValue(child);
    }
    return { mapValue: { fields } };
  }
  if (value && Number.isFinite(Number(value.seconds ?? value._seconds)) &&
      Number.isFinite(Number(value.nanoseconds ?? value._nanoseconds ?? 0))) {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    return { timestampValue: new Date(seconds * 1000 + nanos / 1_000_000).toISOString() };
  }
  throw new TypeError('Unsupported Firestore value type.');
}

export function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue === true;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) {
    const number = Number(value.integerValue);
    return Number.isSafeInteger(number) ? number : String(value.integerValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return String(value.stringValue);
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return new Date(value.timestampValue);
  if (Object.prototype.hasOwnProperty.call(value, 'bytesValue')) return fromBase64(value.bytesValue);
  if (Object.prototype.hasOwnProperty.call(value, 'referenceValue')) return String(value.referenceValue);
  if (Object.prototype.hasOwnProperty.call(value, 'geoPointValue')) {
    const point = value.geoPointValue || {};
    return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
  }
  if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
    return Array.isArray(value.arrayValue?.values) ? value.arrayValue.values.map(decodeFirestoreValue) : [];
  }
  if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, child]) => [key, decodeFirestoreValue(child)]));
  }
  return null;
}

export function decodeFirestoreDocument(document) {
  if (!document || typeof document.name !== 'string') throw firestoreError('FIRESTORE_RESPONSE_INVALID');
  const fields = document.fields || {};
  const data = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
  const segments = document.name.split('/');
  return Object.freeze({
    exists: true,
    id: segments[segments.length - 1] || '',
    name: document.name,
    path: segments.slice(segments.indexOf('documents') + 1).join('/'),
    createTime: document.createTime ? new Date(document.createTime) : null,
    updateTime: document.updateTime ? new Date(document.updateTime) : null,
    data
  });
}

function buildWrite(projectId, path, data, { mode = 'set', merge = false } = {}) {
  const name = documentResource(projectId, path);
  if (mode === 'delete') return { delete: name };
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('Firestore document data must be an object.');
  const fields = {};
  const masks = new Set();
  const transforms = [];

  function collect(value, segments) {
    const op = operationOf(value);
    if (op) {
      const target = fieldPath(segments);
      if (op === 'delete') {
        masks.add(target);
        return OMIT;
      }
      if (op === 'serverTimestamp') {
        transforms.push({ fieldPath: target, setToServerValue: 'REQUEST_TIME' });
        return OMIT;
      }
      if (op === 'increment') {
        transforms.push({ fieldPath: target, increment: encodeFirestoreValue(value.value) });
        return OMIT;
      }
      if (op === 'arrayUnion' || op === 'arrayRemove') {
        const encoded = { values: (value.values || []).map(encodeFirestoreValue) };
        transforms.push({ fieldPath: target, [op === 'arrayUnion' ? 'appendMissingElements' : 'removeAllFromArray']: encoded });
        return OMIT;
      }
      throw new TypeError('Unknown Firestore field operation.');
    }
    if (value === undefined) return OMIT;
    if (isPlainObject(value)) {
      const nested = {};
      for (const [key, child] of Object.entries(value)) {
        const result = collect(child, [...segments, key]);
        if (result !== OMIT) nested[key] = result;
      }
      if (!Object.keys(nested).length) return OMIT;
      for (const [key, child] of Object.entries(value)) {
        if (child !== undefined) {
          const path = fieldPath([...segments, key]);
          if (!operationOf(child) && isPlainObject(child)) continue;
          masks.add(path);
        }
      }
      if (merge || mode === 'update') {
        function leaves(node, prefix) {
          const keys = Object.keys(node || {});
          if (!keys.length) { masks.add(fieldPath(prefix)); return; }
          for (const key of keys) {
            const child = node[key];
            if (isPlainObject(child) && !operationOf(child)) leaves(child, [...prefix, key]);
            else masks.add(fieldPath([...prefix, key]));
          }
        }
        leaves(value, segments);
      }
      return { mapValue: { fields: Object.fromEntries(Object.entries(nested).map(([key, child]) => [key, child && child.mapValue ? child : encodeFirestoreValue(child)])) } };
    }
    return encodeFirestoreValue(value);
  }

  for (const [key, value] of Object.entries(data)) {
    const encoded = collect(value, [key]);
    if (encoded !== OMIT) fields[key] = encoded;
    if ((merge || mode === 'update') && encoded !== OMIT) {
      if (isPlainObject(value)) {
        // Nested maps use leaf field paths so a partial update preserves siblings.
        (function leaves(node, prefix) {
          const keys = Object.keys(node || {});
          if (!keys.length) { masks.add(fieldPath(prefix)); return; }
          for (const childKey of keys) {
            const child = node[childKey];
            if (operationOf(child)) {
              if (operationOf(child) === 'delete') masks.add(fieldPath([...prefix, childKey]));
              continue;
            }
            if (isPlainObject(child)) leaves(child, [...prefix, childKey]);
            else if (child !== undefined) masks.add(fieldPath([...prefix, childKey]));
          }
        })(value, [key]);
      } else masks.add(fieldPath([key]));
    }
  }
  if (mode === 'update' && !Object.keys(fields).length && !transforms.length && !masks.size) {
    throw new TypeError('Firestore update has no fields.');
  }
  const write = { update: { name, fields } };
  if ((merge || mode === 'update') && masks.size) write.updateMask = { fieldPaths: [...masks] };
  if (transforms.length) write.updateTransforms = transforms;
  if (mode === 'create') write.currentDocument = { exists: false };
  if (mode === 'update') write.currentDocument = { exists: true };
  return write;
}

function firestoreFilter(filter) {
  const operators = {
    '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL',
    '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', in: 'IN',
    'array-contains': 'ARRAY_CONTAINS', 'array-contains-any': 'ARRAY_CONTAINS_ANY'
  };
  const operator = operators[String(filter?.op || '').toLowerCase()];
  if (!operator) throw new TypeError('Unsupported Firestore query operator.');
  const value = filter.value;
  const encoded = operator === 'IN' || operator === 'ARRAY_CONTAINS_ANY'
    ? { arrayValue: { values: (Array.isArray(value) ? value : []).map(encodeFirestoreValue) } }
    : encodeFirestoreValue(value);
  return { fieldFilter: { field: { fieldPath: fieldPath(String(filter.field).split('.')) }, op: operator, value: encoded } };
}

export function buildFirestoreStructuredQuery({ collectionPath, filters = [], orderBy = [], limit, startAt } = {}) {
  const segments = pathSegments(collectionPath);
  const collectionId = segments[segments.length - 1];
  const structuredQuery = { from: [{ collectionId }] };
  if (filters.length === 1) structuredQuery.where = firestoreFilter(filters[0]);
  else if (filters.length > 1) structuredQuery.where = {
    compositeFilter: { op: 'AND', filters: filters.map(firestoreFilter) }
  };
  if (orderBy.length) structuredQuery.orderBy = orderBy.map(item => ({
    field: { fieldPath: fieldPath(String(item.field).split('.')) },
    direction: String(item.direction || 'asc').toLowerCase() === 'desc' ? 'DESCENDING' : 'ASCENDING'
  }));
  if (limit != null) {
    const value = Number(limit);
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000) throw new TypeError('Firestore query limit is invalid.');
    structuredQuery.limit = value;
  }
  if (startAt) {
    const values = Array.isArray(startAt) ? startAt : [startAt];
    structuredQuery.startAt = { values: values.map(encodeFirestoreValue), before: false };
  }
  return {
    structuredQuery,
    parentPath: segments.length > 1 ? segments.slice(0, -1).join('/') : ''
  };
}

function mapFirestoreStatus(responseStatus, payload) {
  const upstreamStatus = String(payload?.error?.status || '');
  const code = upstreamStatus === 'ABORTED' ? 'FIRESTORE_ABORTED' :
    responseStatus === 401 ? 'FIRESTORE_UNAUTHENTICATED' :
    responseStatus === 403 ? 'FIRESTORE_PERMISSION_DENIED' :
    responseStatus === 404 ? 'FIRESTORE_NOT_FOUND' :
    responseStatus >= 500 ? 'FIRESTORE_UPSTREAM_UNAVAILABLE' : 'FIRESTORE_REQUEST_REJECTED';
  return firestoreError(code, responseStatus >= 500 ? 503 : responseStatus === 404 ? 404 : responseStatus === 403 ? 403 : responseStatus === 401 ? 401 : 502, {
    upstreamStatus, upstreamCode: Number(payload?.error?.code || responseStatus)
  });
}

export function createFirestoreAdminRestClient({
  projectId,
  allowedProjectIds = [projectId],
  credentials,
  tokenProvider,
  fetchImpl = globalThis.fetch
} = {}) {
  const project = String(projectId || '').trim();
  const allowlist = new Set((Array.isArray(allowedProjectIds) ? allowedProjectIds : [allowedProjectIds]).map(value => String(value || '').trim()).filter(Boolean));
  if (!projectIdValid(project) || !allowlist.has(project)) throw new TypeError('Firestore project ID is not in the explicit allowlist.');
  if (credentials?.project_id && String(credentials.project_id) !== project) throw new TypeError('Firestore service-account project does not match the selected project.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.');
  const oauth = tokenProvider || createGoogleServiceAccountTokenProvider({
    credentials,
    scope: 'https://www.googleapis.com/auth/datastore',
    fetchImpl
  });
  const documentsRoot = FIRESTORE_ROOT + '/projects/' + encodeURIComponent(project) + '/databases/(default)/documents';

  async function call(url, { method = 'GET', body, transaction } = {}) {
    const token = await oauth.getAccessToken();
    const target = new URL(url);
    if (transaction) target.searchParams.set('transaction', transaction);
    let response;
    try {
      response = await fetchImpl(target.toString(), {
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw firestoreError('FIRESTORE_UPSTREAM_UNAVAILABLE', 503);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw mapFirestoreStatus(response.status, payload);
    }
    if (response.status === 204) return {};
    return response.json().catch(() => ({}));
  }

  async function getDocument(path, { transaction } = {}) {
    const name = documentResource(project, path);
    try {
      const document = await call(FIRESTORE_ROOT + '/' + name, { transaction });
      return decodeFirestoreDocument(document);
    } catch (error) {
      if (error.code === 'FIRESTORE_NOT_FOUND') return Object.freeze({ exists: false, id: path.split('/').pop(), path, data: null, name });
      throw error;
    }
  }

  async function listDocuments(collectionPath, { pageSize = 100, pageToken = '', orderBy = '', transaction } = {}) {
    const segments = pathSegments(collectionPath);
    const size = Math.max(1, Math.min(1000, Math.floor(Number(pageSize) || 100)));
    const url = new URL(documentsRoot + '/' + encodePath(collectionPath));
    url.searchParams.set('pageSize', String(size));
    if (pageToken) url.searchParams.set('pageToken', String(pageToken));
    if (orderBy) url.searchParams.set('orderBy', String(orderBy));
    if (transaction) url.searchParams.set('transaction', transaction);
    const result = await call(url.toString());
    return {
      documents: (result.documents || []).map(decodeFirestoreDocument),
      nextPageToken: result.nextPageToken || ''
    };
  }

  async function runQuery(options = {}, { transaction } = {}) {
    const built = buildFirestoreStructuredQuery(options);
    const parent = built.parentPath ? documentsRoot + '/' + encodePath(built.parentPath) : documentsRoot;
    const result = await call(parent + ':runQuery', {
      method: 'POST',
      body: { structuredQuery: built.structuredQuery, ...(transaction ? { transaction } : {}) }
    });
    const rows = Array.isArray(result) ? result : [];
    return rows.filter(item => item?.document).map(item => decodeFirestoreDocument(item.document));
  }

  async function batchGet(paths, { transaction } = {}) {
    const unique = [...new Set((paths || []).map(path => String(path || '').trim()).filter(Boolean))];
    if (!unique.length || unique.length > 100) throw new TypeError('Firestore batchGet requires 1 to 100 document paths.');
    const documents = unique.map(path => documentResource(project, path));
    const response = await call(documentsRoot + ':batchGet', {
      method: 'POST', body: { documents, ...(transaction ? { transaction } : {}) }
    });
    const rows = Array.isArray(response) ? response : [];
    const byName = new Map();
    for (const row of rows) {
      if (row?.found) byName.set(row.found.name, decodeFirestoreDocument(row.found));
      else if (row?.missing) byName.set(row.missing, Object.freeze({
        exists: false, id: row.missing.split('/').pop(), name: row.missing,
        path: row.missing.split('/documents/')[1] || '', data: null
      }));
    }
    return unique.map(path => byName.get(documentResource(project, path)) || Object.freeze({ exists: false, id: path.split('/').pop(), path, data: null }));
  }

  async function commit(writes, { transaction } = {}) {
    if (!Array.isArray(writes) || writes.length > 500) throw new TypeError('Firestore commit supports 1 to 500 writes.');
    const payload = { writes, ...(transaction ? { transaction } : {}) };
    return call(documentsRoot + ':commit', { method: 'POST', body: payload });
  }

  async function beginTransaction() {
    const result = await call(documentsRoot + ':beginTransaction', {
      method: 'POST', body: { options: { readWrite: {} } }
    });
    if (!result.transaction) throw firestoreError('FIRESTORE_TRANSACTION_INVALID');
    return result.transaction;
  }

  async function rollbackTransaction(transaction) {
    if (!transaction) return;
    try {
      await call(documentsRoot + ':rollback', { method: 'POST', body: { transaction } });
    } catch {}
  }

  async function runTransaction(callback, { maxAttempts = 5 } = {}) {
    if (typeof callback !== 'function') throw new TypeError('Firestore transaction callback is required.');
    const attempts = Math.max(1, Math.min(5, Math.floor(Number(maxAttempts) || 5)));
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const transaction = await beginTransaction();
      const writes = [];
      const tx = Object.freeze({
        getDocument: path => getDocument(path, { transaction }),
        batchGet: paths => batchGet(paths, { transaction }),
        query: options => runQuery(options, { transaction }),
        set: (path, data, options = {}) => writes.push(buildWrite(project, path, data, { mode: 'set', merge: options.merge === true })),
        create: (path, data) => writes.push(buildWrite(project, path, data, { mode: 'create' })),
        update: (path, data) => writes.push(buildWrite(project, path, data, { mode: 'update' })),
        delete: path => writes.push(buildWrite(project, path, null, { mode: 'delete' })),
        writeCount: () => writes.length
      });
      try {
        const result = await callback(tx);
        if (writes.length) await commit(writes, { transaction });
        else await rollbackTransaction(transaction);
        return result;
      } catch (error) {
        await rollbackTransaction(transaction);
        lastError = error;
        if (error?.code !== 'FIRESTORE_ABORTED' || attempt === attempts) throw error;
      }
    }
    throw lastError || firestoreError('FIRESTORE_TRANSACTION_FAILED');
  }

  function createWriteBatch() {
    const writes = [];
    let committed = false;
    function assertOpen() {
      if (committed) throw new Error('Firestore write batch is already committed.');
    }
    return Object.freeze({
      set(path, data, options = {}) { assertOpen(); writes.push(buildWrite(project, path, data, { mode: 'set', merge: options.merge === true })); return this; },
      create(path, data) { assertOpen(); writes.push(buildWrite(project, path, data, { mode: 'create' })); return this; },
      update(path, data) { assertOpen(); writes.push(buildWrite(project, path, data, { mode: 'update' })); return this; },
      delete(path) { assertOpen(); writes.push(buildWrite(project, path, null, { mode: 'delete' })); return this; },
      async commit() { assertOpen(); committed = true; return writes.length ? commit(writes) : { writeResults: [] }; },
      size: () => writes.length
    });
  }

  async function setDocument(path, data, options = {}) {
    const write = buildWrite(project, path, data, { mode: 'set', merge: options.merge === true });
    return commit([write]);
  }

  async function updateDocument(path, data) {
    return commit([buildWrite(project, path, data, { mode: 'update' })]);
  }

  async function deleteDocument(path) {
    return commit([buildWrite(project, path, null, { mode: 'delete' })]);
  }

  async function addDocument(collectionPath, data, { documentId } = {}) {
    const collection = pathSegments(collectionPath);
    const id = String(documentId || globalThis.crypto.randomUUID()).trim();
    if (!/^[A-Za-z0-9_-]{1,1500}$/.test(id)) throw new TypeError('Firestore document ID is invalid.');
    const path = [...collection, id].join('/');
    await commit([buildWrite(project, path, data, { mode: 'create' })]);
    return { id, path };
  }

  return Object.freeze({
    projectId: project, getDocument, listDocuments, batchGet, runQuery,
    commit, beginTransaction, rollbackTransaction, runTransaction,
    createWriteBatch, setDocument, updateDocument, deleteDocument, addDocument
  });
}

export { documentResource, fieldPath, buildWrite };
