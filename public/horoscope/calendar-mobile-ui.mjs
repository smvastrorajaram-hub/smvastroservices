const page = document.querySelector("body.calendar-only");
if (page) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

function boot() {
  const shell = document.querySelector(".calendar-page-shell");
  const root = document.getElementById("smvDailyCalendar");
  if (!shell || !root || document.getElementById("smvCalendarMobileNav")) return;

  const isTamil = () => /^ta(?:-|$)/i.test(document.documentElement.lang || "");
  const text = (en, ta) => isTamil() ? ta : en;
  const make = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };

  const topbar = document.querySelector(".calendar-topbar");
  if (topbar && !topbar.querySelector(".smv-calendar-brand")) {
    const brand = make("div", "smv-calendar-brand");
    const name = make("strong", "", "SMV CALENDAR");
    const tagline = make("span", "smv-calendar-brand-tagline");
    brand.append(name, tagline);
    topbar.prepend(brand);
  }

  const hero = make("section", "smv-calendar-hero");
  hero.id = "smvCalendarHero";
  hero.setAttribute("aria-label", "SMV CALENDAR devotional daily guide");
  const artwork = make("img", "smv-calendar-hero-image");
  const embeddedCalendarPath = /\/horoscope\/calendar(?:\/|$)/.test(location.pathname);
  artwork.src = new URL(
    embeddedCalendarPath ? "../assets/smv-ganesha-approved.webp" : "assets/smv-ganesha-approved.webp",
    location.href
  ).href;
  artwork.alt = text("Devotional Ganesha artwork", "விநாயகர் ஆன்மிகப் படம்");
  artwork.width = 1200;
  artwork.height = 520;
  artwork.loading = "eager";
  artwork.decoding = "async";

  const shade = make("div", "smv-calendar-hero-shade");
  const copy = make("div", "smv-calendar-hero-copy");
  const eyebrow = make("span", "smv-calendar-hero-eyebrow");
  const heading = make("h1", "smv-calendar-hero-title");
  const description = make("p", "smv-calendar-hero-description");
  const action = make("a", "smv-calendar-hero-action");
  action.href = "#smvCalendarDateStrip";
  copy.append(eyebrow, heading, description, action);
  shade.append(copy);
  hero.append(artwork, shade);
  shell.prepend(hero);

  const dateStrip = make("section", "smv-calendar-date-strip");
  dateStrip.id = "smvCalendarDateStrip";
  dateStrip.setAttribute("aria-label", "Selected calendar date");
  const dateCopy = make("div", "smv-calendar-date-copy");
  const dateLabel = make("span", "smv-calendar-date-label");
  const dateValue = make("strong", "smv-calendar-date-value");
  const dateMeta = make("span", "smv-calendar-date-meta");
  dateCopy.append(dateLabel, dateValue, dateMeta);
  const datePill = make("span", "smv-calendar-date-pill");
  dateStrip.append(dateCopy, datePill);

  const summary = make("section", "smv-calendar-quick-summary");
  summary.id = "smvCalendarQuickSummary";
  summary.hidden = true;
  const summaryHeader = make("div", "smv-calendar-summary-heading");
  const summaryTitle = make("h2", "", "");
  const summaryNote = make("p", "", "");
  summaryHeader.append(summaryTitle, summaryNote);
  const summaryGrid = make("div", "smv-calendar-summary-grid");
  summaryGrid.setAttribute("aria-live", "polite");
  summary.append(summaryHeader, summaryGrid);

  const dailyTarget = document.getElementById("calDaily");
  if (dailyTarget) {
    dailyTarget.before(dateStrip, summary);
  } else {
    root.append(dateStrip, summary);
  }

  function renderText() {
    taglineText();
    eyebrow.textContent = text("DAILY PANCHANGAM · HORA · RASI PALAN", "தினசரி பஞ்சாங்கம் · ஹோரை · ராசி பலன்");
    heading.textContent = text("A clearer start to your day", "உங்கள் நாளுக்கான தெளிவான வழிகாட்டல்");
    description.textContent = text("Panchangam, auspicious timings and Rasi Palan in one place.", "பஞ்சாங்கம், நல்ல நேரங்கள் மற்றும் ராசி பலன்கள் ஒரே இடத்தில்.");
    action.textContent = text("View today’s Panchangam", "இன்றைய பஞ்சாங்கத்தைப் பார்க்க");
    dateLabel.textContent = text("TODAY AT A GLANCE", "இன்றைய நாள்காட்டி");
    dateMeta.textContent = text("Panchangam and daily timings", "பஞ்சாங்கம் மற்றும் தினசரி நேரங்கள்");
    datePill.textContent = text("DAILY", "இன்று");
    summaryTitle.textContent = text("Today’s Panchangam", "இன்றைய பஞ்சாங்கம்");
    summaryNote.textContent = text("Calculated for your selected location", "நீங்கள் தேர்ந்தெடுத்த இடத்திற்கான கணிப்பு");
    renderDate();
    renderSummary();
    renderNavLabels();
  }

  function taglineText() {
    const tagline = topbar && topbar.querySelector(".smv-calendar-brand-tagline");
    if (tagline) tagline.textContent = text("Panchangam · Hora · Rasi Palan", "பஞ்சாங்கம் · ஹோரை · ராசி பலன்");
  }

  function renderDate() {
    const input = document.getElementById("calDate");
    const value = input && input.value;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      dateValue.textContent = text("Loading today’s date…", "இன்றைய தேதி ஏற்றப்படுகிறது…");
      return;
    }
    const d = new Date(value + "T12:00:00");
    const locale = isTamil() ? "ta-IN" : "en-IN";
    dateValue.textContent = new Intl.DateTimeFormat(locale, {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(d);
  }

  const summaryRows = [
    { id: "tithi", pattern: /(^|\b)tithi\b|திதி/i },
    { id: "nakshatra", pattern: /nakshatra|நட்சத்திரம்/i },
    { id: "sunrise", pattern: /sunrise|சூரிய உதயம்/i },
    { id: "sunset", pattern: /sunset|சூரிய அஸ்தமனம்/i },
    { id: "rahu", pattern: /rahu\s*kalam|ராகு காலம்/i },
    { id: "yama", pattern: /yamagandam|எமகண்டம்/i },
    { id: "gulikai", pattern: /gulikai|குளிகை/i }
  ];

  function renderSummary() {
    const table = document.querySelector("#calDaily .panchang-data-table");
    if (!table) {
      summary.hidden = true;
      return;
    }
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const cards = [];
    for (const item of summaryRows) {
      const row = rows.find(candidate => item.pattern.test(candidate.cells && candidate.cells[0] ? candidate.cells[0].textContent.trim() : ""));
      if (!row || !row.cells || row.cells.length < 2) continue;
      const label = row.cells[0].textContent.trim().replace(/\s+/g, " ");
      const value = row.cells[1].textContent.trim().replace(/\s+/g, " ");
      if (!label || !value) continue;
      const card = make("article", "smv-calendar-summary-card smv-calendar-summary-" + item.id);
      const name = make("span", "smv-calendar-summary-label", label);
      const result = make("strong", "smv-calendar-summary-value", value);
      card.append(name, result);
      cards.push(card);
    }
    summaryGrid.replaceChildren(...cards);
    summary.hidden = cards.length === 0;
    renderDate();
  }

  const navItems = [
    { id: "home", target: "smvCalendarHero", en: "Home", ta: "முகப்பு", icon: "⌂" },
    { id: "panchang", target: "smvCalendarDateStrip", en: "Panchangam", ta: "பஞ்சாங்கம்", icon: "▦" },
    { id: "rasi", target: "calRasiPalan", en: "Rasi Palan", ta: "ராசி பலன்", icon: "♈" },
    { id: "calendar", target: "calMonth", en: "Calendar", ta: "நாட்காட்டி", icon: "▣" },
    { id: "more", target: "calEvents", en: "More", ta: "மேலும்", icon: "⋯" }
  ];
  const nav = make("nav", "smv-calendar-mobile-nav");
  nav.id = "smvCalendarMobileNav";
  nav.setAttribute("aria-label", "Calendar navigation");
  const navButtons = new Map();
  for (const item of navItems) {
    const button = make("button", "smv-calendar-nav-item");
    button.type = "button";
    button.dataset.calNav = item.id;
    button.setAttribute("aria-label", item.en);
    const icon = make("span", "smv-calendar-nav-icon", item.icon);
    icon.setAttribute("aria-hidden", "true");
    const label = make("small", "smv-calendar-nav-label");
    button.append(icon, label);
    button.addEventListener("click", () => {
      const target = document.getElementById(item.target) || (item.id === "rasi" ? document.getElementById("calReadings") : null);
      if (target) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      setActive(item.id);
    });
    nav.append(button);
    navButtons.set(item.id, button);
  }
  document.body.append(nav);

  function renderNavLabels() {
    for (const item of navItems) {
      const button = navButtons.get(item.id);
      if (!button) continue;
      const label = button.querySelector(".smv-calendar-nav-label");
      if (label) label.textContent = text(item.en, item.ta);
      button.setAttribute("aria-label", text(item.en, item.ta));
    }
  }

  function setActive(id) {
    for (const item of navItems) {
      const button = navButtons.get(item.id);
      if (!button) continue;
      const active = item.id === id;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }

  function placeForecast() {
    const forecast = document.getElementById("calRasiPalan");
    const month = document.getElementById("calMonth");
    if (forecast && month && forecast.parentElement !== root) {
      month.before(forecast);
    }
  }

  renderText();
  setActive("home");

  const input = document.getElementById("calDate");
  if (input) input.addEventListener("change", renderDate);
  let languageSyncPending = false;
  const syncCalendarLanguage = () => {
    if (languageSyncPending) return;
    languageSyncPending = true;
    requestAnimationFrame(() => {
      languageSyncPending = false;
      renderText();
      renderSummary();
    });
  };
  window.addEventListener("smv-language", syncCalendarLanguage);
  // The language button updates document.lang before dispatch completes.
  // Refresh explicitly from the same controls so the UI never depends on the
  // event's dispatch timing.
  document.getElementById("calTamil")?.addEventListener("click", syncCalendarLanguage);
  document.getElementById("calEnglish")?.addEventListener("click", syncCalendarLanguage);
  const languageObserver = new MutationObserver(syncCalendarLanguage);
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  const daily = document.getElementById("calDaily");
  if (daily && "MutationObserver" in window) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        renderSummary();
      });
    });
    observer.observe(daily, { childList: true, subtree: true, characterData: true });
  }

  if ("MutationObserver" in window) {
    const observer = new MutationObserver(() => {
      placeForecast();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  placeForecast();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      const id = visible[0].target.id;
      const current = navItems.find(item => item.target === id);
      if (current) setActive(current.id);
    }, { rootMargin: "-12% 0px -68% 0px", threshold: [0.01, 0.25, 0.5] });
    const observeTargets = () => {
      for (const item of navItems) {
        const target = document.getElementById(item.target);
        if (target) observer.observe(target);
      }
    };
    observeTargets();
    if ("MutationObserver" in window) {
      new MutationObserver(observeTargets).observe(document.body, { childList: true, subtree: true });
    }
  }
}
