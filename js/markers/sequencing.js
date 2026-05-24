// Sequencing-based markers (NGS / Sanger / GBS / amplicon-seq) — STUB page.
// Content to be filled in later. For now, shows a friendly "coming soon"
// placeholder so the route exists and the sidebar / home-card link work.

import { onLanguageChange, applyTranslations } from "../i18n.js";

export async function render(root) {
  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="sequencing.title"></h2>
        <p class="subtitle" data-i18n="sequencing.subtitle"></p>
      </header>

      <section class="section coming-soon-section">
        <div class="coming-soon-icon" aria-hidden="true">⏳</div>
        <h3 data-i18n="sequencing.cs.heading"></h3>
        <p data-i18n="sequencing.cs.body1"></p>
        <p data-i18n="sequencing.cs.body2"></p>
        <ul class="coming-soon-list">
          <li data-i18n="sequencing.cs.topic1"></li>
          <li data-i18n="sequencing.cs.topic2"></li>
          <li data-i18n="sequencing.cs.topic3"></li>
          <li data-i18n="sequencing.cs.topic4"></li>
        </ul>
        <p class="coming-soon-cta" data-i18n="sequencing.cs.cta"></p>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => applyTranslations(root));
  return () => unsub();
}
