/* SMV ASTRO V348 — saved report native Print/Save as PDF filename.
 * This module reads only the ALREADY-rendered cover identity. No account,
 * IndexedDB, calculation, Saved Report, or PDF generation changes.
 * Browser print dialogs use the document title as the suggested PDF filename
 * on supported browsers (the user can still change the name in the dialog).
 */
(() => {
  'use strict';
  const grid = document.getElementById('smvCoverBirthGrid');
  const printButton = document.getElementById('printNow');
  if (!grid) return;

  const safe = (value) => String(value ?? '')
    .normalize('NFC')
    .replace(/[\\/<>:"|?*\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 85);

  const personName = (card) => safe((card?.querySelector('h2')?.textContent || '')
    .replace(/^(?:Bride|Groom|பெண்|ஆண்)\s*[·•:–—-]\s*/iu, ''));

  function updateTitle() {
    const persons = [...grid.querySelectorAll(':scope > .smv-cover-person')];
    if (persons.length === 2 && !grid.classList.contains('is-single')) {
      // Cover/report data is BRIDE then GROOM. Filename is MALE then FEMALE.
      const female = personName(persons[0]) || 'Female';
      const male = personName(persons[1]) || 'Male';
      document.title = `SMVMM-${male}-${female}`;
    } else if (persons.length === 1) {
      const name = personName(persons[0]) || 'Horoscope';
      document.title = `SMVHS - ${name}`;
    }
  }

  // The existing report-print.js loads Saved Reports asynchronously.
  const observer = new MutationObserver(updateTitle);
  observer.observe(grid, {childList: true, subtree: true, characterData: true});
  updateTitle();
  // Set synchronously before the browser's native print dialog opens.
  printButton?.addEventListener('click', updateTitle, {capture: true});
  window.addEventListener('beforeprint', updateTitle);
})();
