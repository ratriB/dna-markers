// App shell: hash-based router + i18n bootstrap.

import { initI18n, t, applyTranslations, onLanguageChange } from "./i18n.js";

// Order mirrors the sidebar (by generation). Markers listed in COMING_SOON
// route to a stub page; their home-page cards get a small "เร็วๆ นี้" badge.
const MARKERS = [
  "rflp",
  "rapd", "aflp",
  "caps", "dcaps", "tetra-arms", "scar", "ssr",
  "hrm", "kasp", "massarray",
  "sequencing"
];
const COMING_SOON = new Set(["sequencing"]);

let activeCleanup = null;

async function loadRoute(route) {
  const content = document.getElementById("content");
  if (typeof activeCleanup === "function") {
    try { activeCleanup(); } catch (_) {}
    activeCleanup = null;
  }

  // Highlight active nav item
  document.querySelectorAll("#marker-nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });

  if (route === "home" || !route) {
    renderHome(content);
    content.focus();
    return;
  }

  if (!MARKERS.includes(route)) {
    content.innerHTML = `<div class="section"><p>Unknown route: ${escapeHtml(route)}</p></div>`;
    return;
  }

  try {
    // Propagate any URL query (e.g. ?v=timestamp) so dynamic module imports
    // bust their browser cache the same way the page reload does.
    const mod = await import(`./markers/${route}.js${location.search}`);
    activeCleanup = await mod.render(content);
    content.focus();
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="section">
      <h3>Error loading marker</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(err.message)}</pre>
    </div>`;
  }
}

function renderHome(mount) {
  const cards = MARKERS.map(m => {
    const cs = COMING_SOON.has(m);
    return `
      <a class="marker-card${cs ? " marker-card-cs" : ""}" href="#${m}" data-route="${m}">
        ${cs ? `<span class="card-cs-badge" data-i18n="home.comingSoon"></span>` : ""}
        <h3>${m.toUpperCase()}</h3>
        <p data-i18n="marker.${m}.short"></p>
      </a>
    `;
  }).join("");

  // Compact 3×2 classification matrix — same groups taught in depth in
  // foundation.html#marker-types. Acts as an "at-a-glance" index so students
  // can see how all marker pages relate to the inheritance × technology
  // taxonomy. Sequencing-based is its own technology row (3rd category)
  // because it reads bases directly, neither hybridization nor PCR-detection.
  const matrix = {
    hybrid: { dom: [],               codom: ["rflp"] },
    pcr:    { dom: ["rapd", "aflp"], codom: ["caps", "dcaps", "tetra-arms", "scar", "ssr", "hrm", "kasp", "massarray"] },
    seq:    { dom: [],               codom: ["sequencing"] }
  };
  const cellChips = (list) => list.length === 0
    ? `<span class="mt-cell-empty">—</span>`
    : list.map(m => {
        const cs = COMING_SOON.has(m);
        return `<a class="mt-pill${cs ? " mt-pill-cs" : ""}" href="#${m}">${m.toUpperCase()}${cs ? " ⏳" : ""}</a>`;
      }).join("");

  mount.innerHTML = `
    <div class="home-hero">
      <h2 data-i18n="home.hero.title"></h2>
      <p data-i18n="home.hero.subtitle"></p>
    </div>
    <h3 data-i18n="home.pick" style="margin: 20px 0 12px"></h3>
    <div class="marker-grid">${cards}</div>

    <section class="home-classify">
      <div class="home-classify-head">
        <h3 data-i18n="home.classify.title"></h3>
        <a class="home-classify-cta" href="foundation.html#marker-types" data-i18n="home.classify.cta"></a>
      </div>
      <p class="home-classify-intro" data-i18n="home.classify.intro"></p>
      <div class="mt-matrix-wrap">
        <table class="mt-matrix">
          <thead>
            <tr>
              <th></th>
              <th class="mt-col-dom" data-i18n="home.classify.col.dom"></th>
              <th class="mt-col-codom" data-i18n="home.classify.col.codom"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th class="mt-row-hybrid" data-i18n="home.classify.row.hybrid"></th>
              <td>${cellChips(matrix.hybrid.dom)}</td>
              <td>${cellChips(matrix.hybrid.codom)}</td>
            </tr>
            <tr>
              <th class="mt-row-pcr" data-i18n="home.classify.row.pcr"></th>
              <td>${cellChips(matrix.pcr.dom)}</td>
              <td>${cellChips(matrix.pcr.codom)}</td>
            </tr>
            <tr>
              <th class="mt-row-seq" data-i18n="home.classify.row.seq"></th>
              <td>${cellChips(matrix.seq.dom)}</td>
              <td>${cellChips(matrix.seq.codom)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
  applyTranslations(mount);
}

function route() {
  const hash = location.hash.replace(/^#/, "");
  loadRoute(hash || "home");
}

window.addEventListener("hashchange", route);

(async function init() {
  await initI18n();
  // Re-apply translations to static chrome whenever language changes
  onLanguageChange(() => {
    applyTranslations(document);
    // Re-load current route so dynamic content (with bilingual fields) refreshes
    route();
  });
  route();
})();

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
