function cleanKey(value) {
  const key = String(value || '').trim().replace(/^\/+/, '');
  if (!key || key.length > 1024 || key.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new TypeError('R2 object key is invalid.');
  }
  return key;
}

function safeMetadata(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('R2 custom metadata must be an object.');
  const entries = Object.entries(value);
  if (entries.length > 64) throw new TypeError('R2 custom metadata contains too many fields.');
  const output = {};
  for (const [key, raw] of entries) {
    const name = String(key).trim().slice(0, 128);
    if (!name || !['string', 'number', 'boolean'].includes(typeof raw)) throw new TypeError('R2 custom metadata field is invalid.');
    output[name] = String(raw).slice(0, 1024);
  }
  return output;
}

/** Injected Cloudflare R2 bucket adapter; does not assume public routing or a custom domain. */
export function createR2ObjectStore({ bucket, maxObjectBytes = 100 * 1024 * 1024 } = {}) {
  if (!bucket || typeof bucket.put !== 'function' || typeof bucket.get !== 'function' ||
      typeof bucket.head !== 'function' || typeof bucket.delete !== 'function') {
    throw new TypeError('A Cloudflare R2 bucket binding is required.');
  }
  const limit = Number(maxObjectBytes);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('R2 object size limit is invalid.');

  async function put(keyInput, value, options = {}) {
    const key = cleanKey(keyInput);
    if (!(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value) && typeof value !== 'string' &&
        !(value && typeof value.getReader === 'function')) {
      throw new TypeError('R2 object body must be a string, byte buffer, typed array or stream.');
    }
    const size = typeof value === 'string' ? new TextEncoder().encode(value).byteLength :
      value instanceof ArrayBuffer ? value.byteLength :
      ArrayBuffer.isView(value) ? value.byteLength : Number(options.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > limit) throw Object.assign(new Error('R2 object exceeds the configured size limit.'), { code: 'R2_OBJECT_TOO_LARGE', httpStatus: 413 });
    const httpMetadata = {};
    if (options.contentType) httpMetadata.contentType = String(options.contentType).slice(0, 256);
    if (options.cacheControl) httpMetadata.cacheControl = String(options.cacheControl).slice(0, 512);
    const object = await bucket.put(key, value, {
      httpMetadata,
      customMetadata: safeMetadata(options.customMetadata),
      onlyIf: options.onlyIf
    });
    return Object.freeze({ key, size, etag: object?.etag || null, version: object?.version || null });
  }

  async function get(keyInput) {
    const key = cleanKey(keyInput);
    const object = await bucket.get(key);
    if (!object) return null;
    return Object.freeze({
      key,
      size: Number(object.size || 0),
      etag: object.etag || null,
      version: object.version || null,
      uploaded: object.uploaded || null,
      httpMetadata: object.httpMetadata || {},
      customMetadata: object.customMetadata || {},
      body: object.body
    });
  }

  async function head(keyInput) {
    const key = cleanKey(keyInput);
    const object = await bucket.head(key);
    if (!object) return null;
    return Object.freeze({
      key, size: Number(object.size || 0), etag: object.etag || null,
      httpMetadata: object.httpMetadata || {}, customMetadata: object.customMetadata || {}
    });
  }

  async function remove(keyInput) {
    const key = cleanKey(keyInput);
    await bucket.delete(key);
    return { success: true, key };
  }

  return Object.freeze({ put, get, head, delete: remove });
}
