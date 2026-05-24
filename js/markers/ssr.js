// SSR marker page. Codominant + multiallelic microsatellite (CA)ₙ. Each
// allele has a different (CA) repeat count → different amplicon size. The
// strand renderer scales each strand's display width to its actual length,
// so students see the size difference visually before looking at the gel.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
import { renderStrand, chromosomeLabel } from "../components/strand.js";

// Colors per allele key. Multiallelic, so cycle through 3 distinct palettes.
const ALLELE_COLOR_CLASS = { "12": "A", "16": "A", "20": "a" };

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/ssr_gene_n.json").then(r => r.json()),
    fetch("data/quizzes/ssr.json").then(r => r.json())
  ]);

  const maxLen = Math.max(...Object.values(dataset.alleles).map(a => a.size));

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="ssr.title"></h2>
        <p class="subtitle" data-i18n="ssr.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="ssr.principle.p1"></p>
        <p data-i18n="ssr.principle.p2"></p>
        <p data-i18n="ssr.principle.p3"></p>
        <p data-i18n="ssr.principle.p4"></p>
        ${renderSsrComparison()}
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="ssr.sim.help"></p>
        <div id="allele-cards" class="allele-cards-grid" style="margin-top:14px"></div>
        <div id="gel-mount" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="ssr.dataset.title"></strong></p>
        <p data-i18n="ssr.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  function renderSsrStrand(alleleKey, chromosomeNum) {
    const lang = getLang();
    const allele = dataset.alleles[alleleKey];
    const len = allele.size;
    const widthPercent = (len / maxLen) * 100;
    const motif = dataset.motif;          // "CA"
    const motifLen = motif.length;        // 2
    const primerLen = dataset.primerLen;  // 20
    const flankLen = dataset.flankLen;    // 30

    // Layout positions
    // 0 .. primerLen          → F primer
    // primerLen .. flankLen+primerLen → flanking
    // (flank+primer) .. (flank+primer + n*motifLen) → repeat region
    // ...flanking... → R primer at end
    const fpEnd = primerLen;
    const repeatStart = primerLen + flankLen;
    const repeatEnd = repeatStart + allele.count * motifLen;
    const rpStart = len - primerLen;

    const features = [
      {
        start: 0, end: fpEnd,
        label: "F →",
        bg: "rgba(59,130,246,0.28)", border: "#3b82f6", color: "#1e3a8a"
      },
      {
        start: rpStart, end: len,
        label: "← R",
        bg: "rgba(168,85,247,0.28)", border: "#a855f7", color: "#581c87"
      },
      {
        start: repeatStart, end: repeatEnd,
        label: `(${motif})${subscript(allele.count)}`,
        bg: "rgba(245,158,11,0.35)", border: "#f59e0b", color: "#78350f"
      }
    ];

    const resultText = `${lang === "th" ? "ผลิตได้: " : "Produces: "}<strong>${len} bp</strong> ` +
      `<span style="color:var(--muted)">((${motif})${subscript(allele.count)} = ${allele.count * motifLen} bp ${lang === "th" ? "+ flanking 60 bp + primers 40 bp" : "+ 60 bp flanking + 40 bp primers"})</span>`;

    const alleleClass = ALLELE_COLOR_CLASS[alleleKey] || "A";
    const tagLabel = `Allele (CA)${subscript(allele.count)} <small style="opacity:0.75">(${chromosomeLabel(chromosomeNum)})</small>`;

    return renderStrand({
      length: len,
      alleleClass,
      tagLabel,
      features,
      cuts: [],
      resultText,
      widthPercent
    });
  }

  function render2() {
    const lang = getLang();
    root.querySelector("#allele-cards").innerHTML = dataset.individuals
      .map(ind => {
        const strands = ind.alleles
          .map((a, i) => renderSsrStrand(a, i + 1))
          .join("");
        return `
          <div class="allele-card">
            <h4>
              <span>${ind.label[lang]} <small style="color:var(--muted)">[${ind.genotype}]</small></span>
            </h4>
            <p class="allele-desc">${ind.description[lang]}</p>
            ${strands}
          </div>
        `;
      })
      .join("");

    const lanes = dataset.individuals.map(ind => ({
      label: ind.id,
      fragments: ind.alleles.map(a => dataset.alleles[a].size)
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 200,
      minBp: 80,
      ladder: [200, 160, 140, 132, 124, 120, 100, 80]
    });
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// "12" → "₁₂" (Unicode subscripts). Falls back to plain digits if unknown.
function subscript(n) {
  const subs = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
  return String(n).split("").map(d => subs[d] || d).join("");
}

// Compact 2-allele comparison figure for the principle section.
// Width-proportional bars (2 px per bp) make the size difference visually
// obvious before students drop into the simulation cards below.
function renderSsrComparison() {
  const PX_PER_BP = 2;
  const PRIMER_BP = 20;
  const FLANK_BP  = 30;
  const MOTIF_BP  = 2;          // "CA" = 2 bp per copy

  const rows = [
    { count: 12, color: "#fde047" },
    { count: 20, color: "#f59e0b" }
  ];

  const rowsHtml = rows.map(r => {
    const repeatBp = r.count * MOTIF_BP;
    const totalBp  = 2 * PRIMER_BP + 2 * FLANK_BP + repeatBp;
    return `
      <div class="ssr-cmp-row">
        <span class="ssr-cmp-label">(CA)${subscript(r.count)}</span>
        <div class="ssr-cmp-bars">
          <span class="ssr-cmp-bar primer" style="width:${PRIMER_BP * PX_PER_BP}px">F</span>
          <span class="ssr-cmp-bar flank"  style="width:${FLANK_BP * PX_PER_BP}px"></span>
          <span class="ssr-cmp-bar repeat" style="width:${repeatBp * PX_PER_BP}px; background:${r.color}">
            (CA)${subscript(r.count)}
          </span>
          <span class="ssr-cmp-bar flank"  style="width:${FLANK_BP * PX_PER_BP}px"></span>
          <span class="ssr-cmp-bar primer" style="width:${PRIMER_BP * PX_PER_BP}px">R</span>
        </div>
        <span class="ssr-cmp-size">${totalBp} bp</span>
      </div>
    `;
  }).join("");

  return `
    <figure class="ssr-comparison">
      <figcaption class="ssr-cmp-title">${t("ssr.cmp.title")}</figcaption>
      <div class="ssr-cmp-rows">${rowsHtml}</div>
      <div class="ssr-cmp-legend">
        <span><span class="ssr-cmp-swatch primer"></span> F / R ${t("ssr.cmp.label.primer")}</span>
        <span><span class="ssr-cmp-swatch flank"></span> ${t("ssr.cmp.label.flank")}</span>
        <span><span class="ssr-cmp-swatch repeat"></span> ${t("ssr.cmp.label.repeat")}</span>
      </div>
      <p class="ssr-cmp-note">${t("ssr.cmp.note")}</p>
    </figure>
  `;
}
