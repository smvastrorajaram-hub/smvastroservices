'use strict';

(() => {
  const bridge = window.smvDesktop;
  if (!bridge) return;

  const labels = {
    home: 'முகப்பு',
    astro: 'SMV ASTRO',
    horoscope: 'SMV HOROSCOPE',
    calendar: 'SMV CALENDAR'
  };

  const navButtons = Array.from(document.querySelectorAll('.nav-button[data-module]'));
  const errorBanner = document.getElementById('load-error');
  const connectionStatus = document.getElementById('connection-status');
  const versionLabel = document.getElementById('app-version');

  function setActiveModule(moduleId) {
    navButtons.forEach((button) => {
      const active = button.dataset.module === moduleId;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.title = moduleId === 'home'
      ? 'SMV ASTRO — Windows Edition'
      : (labels[moduleId] || 'SMV ASTRO') + ' — Windows Edition';
  }

  function setConnectionStatus() {
    if (!connectionStatus) return;
    if (navigator.onLine) {
      connectionStatus.textContent = 'இணைய இணைப்பு உள்ளது';
      connectionStatus.previousElementSibling?.classList.remove('is-offline');
    } else {
      connectionStatus.textContent = 'Offline · சேமிக்கப்பட்ட பகுதிகள் மட்டும்';
      connectionStatus.previousElementSibling?.classList.add('is-offline');
    }
  }

  async function navigate(moduleId) {
    if (errorBanner) errorBanner.hidden = true;
    try {
      await bridge.navigate(moduleId);
      setActiveModule(moduleId);
    } catch {
      if (errorBanner) {
        errorBanner.textContent = 'இந்தப் பகுதியைத் திறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.';
        errorBanner.hidden = false;
      }
    }
  }

  document.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const moduleId = button.dataset.module;
      if (moduleId) void navigate(moduleId);
    });
  });

  bridge.onActiveModule(setActiveModule);
  bridge.onLoadError((details) => {
    if (!errorBanner) return;
    errorBanner.textContent = details?.message || 'சேவையை ஏற்ற முடியவில்லை. இணையத்தைச் சரிபார்க்கவும்.';
    errorBanner.hidden = false;
  });

  window.addEventListener('online', setConnectionStatus);
  window.addEventListener('offline', setConnectionStatus);
  setConnectionStatus();

  bridge.getState().then((state) => {
    if (state?.version && versionLabel) versionLabel.textContent = 'v' + state.version;
    if (state?.activeModule) setActiveModule(state.activeModule);
  }).catch(() => {
    if (errorBanner) {
      errorBanner.textContent = 'Desktop application state could not be read.';
      errorBanner.hidden = false;
    }
  });
})();
