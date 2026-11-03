import { createGoogleServiceAccountTokenProvider, FIREBASE_MESSAGING_SCOPE } from './google-service-account-token.mjs';

function cleanString(value, max = 4096) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeData(data) {
  if (data == null) return undefined;
  if (typeof data !== 'object' || Array.isArray(data)) throw new TypeError('FCM data must be a string map.');
  const entries = Object.entries(data);
  if (entries.length > 50) throw new TypeError('FCM data contains too many fields.');
  const result = {};
  for (const [key, value] of entries) {
    const name = cleanString(key, 128);
    if (!name || /^(from|message_type|google\.|gcm\.)/i.test(name)) throw new TypeError('FCM data key is invalid.');
    if (typeof value !== 'string') throw new TypeError('FCM data values must be strings.');
    result[name] = cleanString(value, 4096);
  }
  return result;
}

export function createFirebaseMessagingHttpV1Client({
  projectId,
  credentials,
  tokenProvider,
  fetchImpl = globalThis.fetch
} = {}) {
  const project = String(projectId || credentials?.project_id || credentials?.projectId || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{4,62}$/.test(project)) throw new TypeError('A valid Firebase project ID is required.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.');
  const oauth = tokenProvider || createGoogleServiceAccountTokenProvider({
    credentials,
    scope: FIREBASE_MESSAGING_SCOPE,
    fetchImpl
  });

  async function send(message) {
    const token = cleanString(message?.token, 8192);
    const topic = cleanString(message?.topic, 900);
    const condition = cleanString(message?.condition, 1000);
    if ([token, topic, condition].filter(Boolean).length !== 1) {
      throw new TypeError('Exactly one FCM target (token, topic or condition) is required.');
    }
    const outbound = { message: {} };
    if (token) outbound.message.token = token;
    if (topic) outbound.message.topic = topic;
    if (condition) outbound.message.condition = condition;
    const notification = message?.notification;
    if (notification != null) {
      if (!notification || typeof notification !== 'object' || Array.isArray(notification)) throw new TypeError('FCM notification must be an object.');
      outbound.message.notification = {
        ...(notification.title == null ? {} : { title: cleanString(notification.title, 256) }),
        ...(notification.body == null ? {} : { body: cleanString(notification.body, 2048) }),
        ...(notification.image == null ? {} : { image: cleanString(notification.image, 2048) })
      };
    }
    const data = normalizeData(message?.data);
    if (data && Object.keys(data).length) outbound.message.data = data;
    if (message?.android != null) outbound.message.android = message.android;
    if (message?.webpush != null) outbound.message.webpush = message.webpush;
    if (message?.apns != null) outbound.message.apns = message.apns;
    const accessToken = await oauth.getAccessToken();
    let response;
    try {
      response = await fetchImpl(
        'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(project) + '/messages:send',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
          signal: AbortSignal.timeout(10000)
        }
      );
    } catch {
      throw Object.assign(new Error('Firebase Cloud Messaging is temporarily unavailable.'), { code: 'FCM_UPSTREAM_UNAVAILABLE', httpStatus: 503 });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = String(result?.error?.details?.[0]?.errorCode || result?.error?.status || '').trim();
      const error = Object.assign(new Error('Firebase Cloud Messaging rejected the message.'), {
        code: detail === 'UNREGISTERED' ? 'FCM_TOKEN_UNREGISTERED' : 'FCM_SEND_REJECTED',
        httpStatus: response.status >= 500 ? 503 : 502,
        upstreamStatus: response.status
      });
      throw error;
    }
    return Object.freeze({ success: true, name: String(result.name || '') });
  }

  return Object.freeze({ send, projectId: project });
}
