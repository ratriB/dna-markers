// RAPD marker page. Single random ~10-nt primer; multiple binding sites in
// a 3000 bp region; some sites variable between chromosomes. A *dominant*
// marker — Ind-1 (homozygous-present) and Ind-3 (heterozygous) produce the
// same gel pattern, demonstrating why RAPD cannot resolve zygosity.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
import { renderStrand, chromosomeLabel } from "../components/strand.js";

const SITE_WIDTH = 24;   // bp drawn for each primer-binding site

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/rapd_simulated.json").then(r => r.json()),
    fetch("data/quizzes/rapd.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="rapd.title"></h2>
        <p class="subtitle" data-i18n="rapd.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="rapd.principle.p1"></p>
        <p data-i18n="rapd.principle.p2"></p>
        <p data-i18n="rapd.principle.p3"></p>
        <p data-i18n="rapd.principle.p4"></p>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="rapd.sim.help"></p>

        <div class="rapd-primer-banner">
          <span class="rapd-primer-label">${lang() === "th" ? "Primer:" : "Primer:"}</span>
          <code class="rapd-primer-seq">${dataset.primerName} · 5'-${dataset.primerSeq}-3'</code>
        </div>

        <div id="allele-cards" class="allele-cards-grid" style="margin-top:14px"></div>

        <p class="callout-warning" style="margin-top:14px" data-i18n="rapd.dominance.callout"></p>

        <div id="gel-mount" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="rapd.dataset.title"></strong></p>
        <p data-i18n="rapd.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  // For each chromosome's allele description, compute which amplifiable pairs
  // actually amplify (both sites must be present).
  function bandsForAllele(alleleState) {
    return dataset.amplifiablePairs.filter(pair =>
      pair.sites.every(siteId => {
        const site = dataset.sites.find(s => s.id === siteId);
        if (!site.variable) return true;                 // invariant → always present
        return alleleState[siteId] === "+";              // variable → check state
      })
    );
  }

  function renderRapdStrand(alleleState, chromosomeNum) {
    const lang = getLang();
    const L = dataset.regionLength;

    // Each primer-binding site becomes a directional arrow:
    //  F sites → arrow above the backbone pointing RIGHT
    //  R sites → arrow below the backbone pointing LEFT
    // Two arrows converging within ~3 kb = an amplicon.
    const arrows = dataset.sites.map(site => {
      const present = !site.variable || alleleState[site.id] === "+";
      return {
        position: site.pos,
        direction: site.orient === "F" ? "right" : "left",
        side:      site.orient === "F" ? "above" : "below",
        present,
        label: present ? site.id : `✗ ${site.id}`,
        color: site.orient === "F" ? "#3b82f6" : "#a855f7",
        title: present ? t("rapd.site.label") : t("rapd.site.lost")
      };
    });

    // Bands amplified from THIS chromosome
    const bands = bandsForAllele(alleleState);
    const bandsText = bands.length === 0
      ? (lang === "th" ? "ไม่ amplify เลย" : "no amplification")
      : bands.map(b => `${b.size} bp`).join(" + ");

    // Pick a chromosome color based on whether any variable site is "missing"
    const hasMissing = dataset.sites.some(s => s.variable && alleleState[s.id] === "-");
    const alleleClass = hasMissing ? "a" : "A";

    const tagLabel = `${lang === "th" ? "homologous chromosome" : "homologous chromosome"} ${chromosomeNum} ` +
      `<small style="opacity:0.75">(${stateSummary(alleleState, dataset, lang)})</small>`;

    const resultText = `${lang === "th" ? "ขยายได้: " : "Amplifies: "}<strong>${bandsText}</strong>`;

    return renderStrand({
      length: L,
      alleleClass,
      tagLabel,
      features: [],
      arrows,
      cuts: [],
      resultText
    });
  }

  function render2() {
    const lang = getLang();

    root.querySelector("#allele-cards").innerHTML = dataset.individuals
      .map(ind => {
        const strands = ind.alleles
          .map((alleleState, i) => renderRapdStrand(alleleState, i + 1))
          .join("");

        // Compute combined band pattern (union)
        const combined = new Set();
        ind.alleles.forEach(alleleState =>
          bandsForAllele(alleleState).forEach(b => combined.add(b.size))
        );
        const combinedSizes = [...combined].sort((a, b) => b - a);
        const combinedText = combinedSizes.length === 0
          ? (lang === "th" ? "ไม่เห็น band ใดบน gel" : "no bands on gel")
          : combinedSizes.map(s => `${s} bp`).join(" + ");

        return `
          <div class="allele-card">
            <h4>
              <span>${ind.label[lang]} <small style="color:var(--muted)">[${ind.genotype}]</small></span>
            </h4>
            <p class="allele-desc">${ind.description[lang]}</p>
            ${strands}
            <div class="rapd-combined">
              <strong>${lang === "th" ? "รวมบน gel:" : "Combined on gel:"}</strong> ${combinedText}
            </div>
          </div>
        `;
      })
      .join("");

    const lanes = dataset.individuals.map(ind => {
      const combined = new Set();
      ind.alleles.forEach(alleleState =>
        bandsForAllele(alleleState).forEach(b => combined.add(b.size))
      );
      return { label: ind.id, fragments: [...combined] };
    });
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 1500,
      minBp: 100,
      ladder: [1500, 1000, 900, 700, 600, 500, 300, 100]
    });
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// Short text summary of which variable sites are present on a chromosome,
// e.g. "S2:+ S3:+".
function stateSummary(alleleState, dataset, lang) {
  return dataset.sites
    .filter(s => s.variable)
    .map(s => `${s.id}:${alleleState[s.id]}`)
    .join(" · ");
}

// Inline language helper for the static primer banner above the cards.
// Uses getLang() lazily so the banner is correct at first render even though
// the HTML template runs before render2().
function lang() { return getLang(); }
