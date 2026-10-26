const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const pendingLoads = new WeakMap();
export function ensureRazorpayCheckout(targetWindow = (typeof window !== 'undefined' ? window : null), { timeoutMs = 90000 } = {}) {
  if (!targetWindow || !targetWindow.document) return Promise.reject(new Error('A payment window is unavailable.'));
  if (typeof targetWindow.Razorpay === 'function') return Promise.resolve(targetWindow);
  const active = pendingLoads.get(targetWindow);
  if (active) return active;
  let script = null, timer = null, settled = false;
  const promise = new Promise((resolve, reject) => {
    const doc = targetWindow.document;
    const finish = error => {
      if (settled) return; settled = true;
      if (timer !== null) clearTimeout(timer);
      if (script) { script.removeEventListener('load', onLoad); script.removeEventListener('error', onError); }
      if (error) {
        if (script) { script.dataset.smvRazorpayCheckoutState = 'failed'; script.remove(); }
        pendingLoads.delete(targetWindow); reject(error); return;
      }
      if (script) script.dataset.smvRazorpayCheckoutState = 'loaded';
      resolve(targetWindow);
    };
    const onLoad = () => typeof targetWindow.Razorpay === 'function' ? finish(null) :
      finish(new Error('Razorpay Checkout loaded without its payment constructor. Please retry.'));
    const onError = () => finish(new Error('Razorpay Checkout could not load. Check your connection and retry.'));
    script = doc.querySelector('script[data-smv-razorpay-checkout-loader]');
    if (script && ['failed','loaded'].includes(String(script.dataset.smvRazorpayCheckoutState || ''))) { script.remove(); script = null; }
    if (!script) {
      const legacy = doc.querySelector('script[src="' + RAZORPAY_CHECKOUT_URL + '"]');
      if (legacy) legacy.remove();
      script = doc.createElement('script'); script.src = RAZORPAY_CHECKOUT_URL; script.async = true;
      script.dataset.smvRazorpayCheckoutLoader = '1'; script.dataset.smvRazorpayCheckoutState = 'loading';
    }
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    timer = setTimeout(() => finish(new Error('Razorpay Checkout did not respond within ' +
      Math.ceil(Math.max(1, Number(timeoutMs) || 90000) / 1000) + ' seconds. Please retry.')),
      Math.max(1, Number(timeoutMs) || 90000));
    if (!script.isConnected) doc.head.appendChild(script);
  });
  pendingLoads.set(targetWindow, promise);
  promise.catch(() => { if (pendingLoads.get(targetWindow) === promise) pendingLoads.delete(targetWindow); });
  return promise;
}
