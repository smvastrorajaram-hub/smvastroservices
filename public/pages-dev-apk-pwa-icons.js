(() => {
  'use strict';

  if (window.location.hostname !== 'smvastroservices.pages.dev') return;

  const entries = [
    {
      selector: '#smvPermanentAndroidAppSection .smv-android-apk-icon-wrap img',
      src: '/assets/pwa-astro-512.png',
      alt: 'SMV ASTRO PWA application icon'
    },
    {
      selector: '#smvHoroscopeAndroidApkSection .smv-android-apk-icon-wrap img',
      src: '/horoscope/assets/pwa-horoscope-512.png',
      alt: 'SMV HOROSCOPE PWA application icon'
    },
    {
      selector: '#smvCalendarAndroidApkSection .smv-android-apk-icon-wrap img',
      src: '/horoscope/assets/pwa-calendar-512.png',
      alt: 'SMV CALENDAR PWA application icon'
    }
  ];

  for (const entry of entries) {
    const image = document.querySelector(entry.selector);
    if (!image) continue;
    image.setAttribute('src', entry.src);
    image.setAttribute('alt', entry.alt);
    image.removeAttribute('srcset');
    image.dataset.smvPagesDevPwaIcon = '1';
  }
})();
