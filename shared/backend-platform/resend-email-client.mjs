function recipientsOf(value) {
  const values = Array.isArray(value) ? value : [value];
  const recipients = [...new Set(values.map(item => String(item || '').trim()).filter(Boolean))];
  if (!recipients.length || recipients.length > 50 ||
      recipients.some(address => address.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) {
    throw new TypeError('Email recipients are invalid.');
  }
  return recipients;
}

function safeHeader(value, max) {
  const input = String(value || '').trim();
  if (!input || input.length > max || /[\r\n]/.test(input)) throw new TypeError('Email header value is invalid.');
  return input;
}

/** Fetch-based Resend client. Delivery de-duplication belongs in the transactional outbox. */
export function createResendEmailClient({
  apiKey,
  from,
  fetchImpl = globalThis.fetch,
  apiUrl = 'https://api.resend.com/emails'
} = {}) {
  const key = String(apiKey || '').trim();
  const sender = safeHeader(from, 320);
  if (!key || typeof fetchImpl !== 'function' || apiUrl !== 'https://api.resend.com/emails') {
    throw new TypeError('Resend API key, sender and official HTTPS endpoint are required.');
  }

  async function send({ to, cc, bcc, subject, text, html, replyTo } = {}) {
    const payload = {
      from: sender,
      to: recipientsOf(to),
      subject: safeHeader(subject, 998),
      ...(text == null ? {} : { text: String(text).slice(0, 100000) }),
      ...(html == null ? {} : { html: String(html).slice(0, 100000) }),
      ...(cc == null ? {} : { cc: recipientsOf(cc) }),
      ...(bcc == null ? {} : { bcc: recipientsOf(bcc) }),
      ...(replyTo == null ? {} : { reply_to: recipientsOf(replyTo) })
    };
    if (payload.text == null && payload.html == null) throw new TypeError('Email text or HTML body is required.');
    let response;
    try {
      response = await fetchImpl(apiUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw Object.assign(new Error('Email provider is temporarily unavailable.'), { code: 'EMAIL_UPSTREAM_UNAVAILABLE', httpStatus: 503 });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !String(result?.id || '').trim()) {
      throw Object.assign(new Error('Email provider rejected the message.'), {
        code: 'EMAIL_SEND_REJECTED',
        httpStatus: response.status >= 500 ? 503 : 502,
        upstreamStatus: response.status
      });
    }
    return Object.freeze({ success: true, id: String(result.id) });
  }

  return Object.freeze({ send });
}
