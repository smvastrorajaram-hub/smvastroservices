/* SMV ASTRO V338 — marriage report COVER ART only.
 * V329 Vinayagar art remains untouched for the Horoscope cover.
 * This tiny watcher reacts to the existing print engine's two-person cover grid;
 * it does not change saved reports, calculations, payments or PDF generation.
 */
(() => {
 'use strict';
 const grid = document.getElementById('smvCoverBirthGrid');
 const emblem = document.querySelector('#smvPrintCover .smv-cover-emblem img');
 if (!grid || !emblem) return;
 const weddingSrc = 'assets/smv-marriage-shiva-parvati-v338.webp';
 const useWeddingOnlyForMatching = () => {
  // Marriage Matching always adds one .smv-cover-person each for bride and groom.
  // Horoscope adds one person and .is-single; never touch its Vinayagar image.
  if (grid.classList.contains('is-single') || grid.querySelectorAll(':scope > .smv-cover-person').length !== 2) return;
  emblem.setAttribute('src', weddingSrc);
  emblem.setAttribute('alt', 'Lord Shiva and Goddess Parvati with divine wedding blessings');
  emblem.setAttribute('width', '760');
  emblem.setAttribute('height', '760');
  // V345: no per-photo offsets. CSS centres both original cover assets.
  // Inline !important shifts defeat the page-centre CSS, so clear old ones.
  emblem.style.removeProperty('transform');
  observer.disconnect();
 };
 const observer = new MutationObserver(useWeddingOnlyForMatching);
 observer.observe(grid, {childList: true});
 useWeddingOnlyForMatching();
})();
