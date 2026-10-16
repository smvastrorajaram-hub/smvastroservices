/* SMV ASTRO V347 — marriage cover source image and optical alignment only.
 * Never replace Vinayakar on the single-person Horoscope cover.
 */
(() => {
  'use strict';
  const grid = document.getElementById('smvCoverBirthGrid');
  const cover = document.getElementById('smvPrintCover');
  const emblem = cover?.querySelector('.smv-cover-emblem img');
  if (!grid || !cover || !emblem) return;

  const weddingSrc = 'assets/smv-marriage-shiva-parvati-v338.webp';
  const updateCover = () => {
    const isMatching = !grid.classList.contains('is-single') &&
      grid.querySelectorAll(':scope > .smv-cover-person').length === 2;
    if (!isMatching) return;
    cover.classList.add('smv-cover-matching');
    emblem.src = weddingSrc;
    emblem.alt = 'Lord Shiva and Goddess Parvati with divine wedding blessings';
    emblem.width = 760;
    emblem.height = 760;
    // CSS controls -1.8mm print / -5px mobile; no inline transform.
    emblem.style.removeProperty('transform');
    observer.disconnect();
  };
  const observer = new MutationObserver(updateCover);
  observer.observe(grid, {childList:true});
  updateCover();
})();
