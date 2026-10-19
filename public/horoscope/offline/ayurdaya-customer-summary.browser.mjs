/**
 * Customer-facing Ayurdaya result labels only.
 *
 * This module deliberately does not calculate or classify longevity. The
 * source-specific engine must provide a completed, certified classification
 * and explicitly allow customer display before any label can be rendered.
 * Keep calculation traces, graha rows, Harana details and rule explanations
 * available only to internal calculation/audit code.
 */
const LABELS = Object.freeze({
  balarishta: Object.freeze({ ta: 'பாலாரிஷ்டம்', en: 'Balarishta' }),
  alpayu: Object.freeze({ ta: 'அல்பாயுள்', en: 'Alpayu' }),
  madhyayu: Object.freeze({ ta: 'மத்தியாயுள்', en: 'Madhya ayu' }),
  poornayu: Object.freeze({ ta: 'பூர்ணாயுள்', en: 'Poorna ayu' })
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

/**
 * Render no more than one fixed category label, and only when the upstream
 * source-specific classification explicitly passes both release gates.
 * Unknown, incomplete, uncertified or non-customer-approved outcomes fail
 * closed to an empty string rather than guessing a longevity category.
 */
export function ayurdayaCustomerSummaryHtml({ classification, language = 'ta' } = {}) {
  if (!classification || typeof classification !== 'object') return '';
  if (classification.certified !== true ||
      classification.customerDisplayAllowed !== true) return '';

  const key = String(classification.category || '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(LABELS, key)) return '';

  const locale = language === 'ta' ? 'ta' : 'en';
  const label = LABELS[key][locale];
  const heading = locale === 'ta' ? 'ஆயுர்த்தாய முடிவு' : 'Ayurdaya result';

  return '<section class="smv-ayurdaya-customer-summary" data-smv-ayurdaya-customer-summary="1">' +
    '<h3>' + escapeHtml(heading) + '</h3>' +
    '<p class="smv-ayurdaya-category-result">' + escapeHtml(label) + '</p>' +
    '</section>';
}
