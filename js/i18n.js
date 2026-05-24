// Bilingual i18n loader. Stores user choice in localStorage.

let dict = {};
let currentLang = "th";
const listeners = new Set();

export async function initI18n() {
  const saved = localStorage.getItem("dna.lang") || "th";
  await setLanguage(saved, { silent: true });
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });
}

export async function setLanguage(lang, { silent = false } = {}) {
  if (!["th", "en"].includes(lang)) lang = "th";
  // Propagate any query string (e.g. ?v=timestamp) to bust the HTTP cache
  // for the locale JSON the same way the page reload busts the module cache.
  const res = await fetch(`locales/${lang}.json${location.search}`);
  dict = await res.json();
  currentLang = lang;
  localStorage.setItem("dna.lang", lang);
  document.documentElement.lang = lang;

  // Update toggle button state
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
  });

  applyTranslations(document);
  if (!silent) listeners.forEach(cb => cb(lang));
}

export function t(key, fallback) {
  return dict[key] ?? fallback ?? key;
}

export function getLang() {
  return currentLang;
}

export function onLanguageChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (key in dict) {
      // Use innerHTML so <em>...</em> in translations renders correctly.
      el.innerHTML = dict[key];
    }
  });
  // data-i18n-attr="placeholder:key,title:key"
  root.querySelectorAll("[data-i18n-attr]").forEach(el => {
    const pairs = el.dataset.i18nAttr.split(",");
    pairs.forEach(pair => {
      const [attr, key] = pair.split(":").map(s => s.trim());
      if (key in dict) el.setAttribute(attr, dict[key]);
    });
  });
}
