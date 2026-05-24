// Shared placeholder for markers whose interactive page is not built yet.
// Each marker module can simply re-export `stub` until it gets its own page.

import { t, applyTranslations } from "../i18n.js";

export function stub(name, principleKeyPrefix) {
  return function render(root) {
    root.innerHTML = `
      <article class="marker-page">
        <header>
          <h2>${name}</h2>
          <p class="subtitle" data-i18n="stub.coming_soon"></p>
        </header>
        <section class="section">
          <h3 data-i18n="section.principle"></h3>
          <p data-i18n="${principleKeyPrefix}.short"></p>
        </section>
        <div class="callout" data-i18n="stub.coming_soon"></div>
      </article>
    `;
    applyTranslations(root);
  };
}
