// SCAR marker page. Codominant length polymorphism: allele R carries a
// 50-bp insertion that allele s lacks → amplicons differ in size (480 vs 430
// bp). Per-chromosome strand visualization + combined gel.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
import {
  renderStrand,
  chromosomeLabel
} from "../components/strand.js?v=2";

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/scar_gene_m.json").then(r => r.json()),
    fetch("data/quizzes/scar.json").then(r => r.json())
  ]);

  const maxLen = Math.max(...Object.values(dataset.ampliconLength));

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="scar.title"></h2>
        <p class="subtitle" data-i18n="scar.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="scar.principle.p1"></p>
        <p data-i18n="scar.principle.p2"></p>
        <p data-i18n="scar.principle.p3"></p>
        <p data-i18n="scar.principle.p4"></p>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="scar.sim.help"></p>
        <div id="allele-cards" class="allele-cards-grid" style="margin-top:14px"></div>
        <div id="gel-mount" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="scar.dataset.title"></strong></p>
        <p data-i18n="scar.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  function renderScarStrand(alleleType, chromosomeNum) {
    const lang = getLang();
    const len = dataset.ampliconLength[alleleType];
    const widthPercent = (len / maxLen) * 100;

    // Primers shown as small directional arrows (same convention as RAPD /
    // Tetra-ARMS): F above strand pointing right, R below strand pointing
    // left. The insertion (R allele only) stays as a rectangle since it's
    // a genomic feature, not a primer.
    const arrows = [
      {
        position: dataset.primers.forward.start + 10,
        direction: "right",
        side: "above",
        present: true,
        label: "F",
        color: "#3b82f6",
        title: "Forward primer"
      },
      {
        position: len - 10,
        direction: "left",
        side: "below",
        present: true,
        label: "R",
        color: "#a855f7",
        title: "Reverse primer"
      }
    ];

    const features = [];
    // R allele also gets the insertion feature in the middle
    if (alleleType === "R") {
      features.push({
        start: dataset.insertion.start,
        end:   dataset.insertion.end,
        label: t("scar.feature.insertion"),
        bg: "rgba(245,158,11,0.3)",
        border: "#f59e0b",
        color: "#78350f"
      });
    }

    const resultText = `${lang === "th" ? "ผลิตได้: " : "Produces: "}<strong>${len} bp</strong>` +
      (alleleType === "R" ? ` (${lang === "th" ? "มี insertion 50 bp" : "with 50-bp insertion"})` : "");

    const alleleClass = alleleType === "R" ? "A" : "a";
    const tagLabel = `Allele ${alleleType} <small style="opacity:0.75">(${chromosomeLabel(chromosomeNum)})</small>`;

    return renderStrand({
      length: len,
      alleleClass,
      tagLabel,
      features,
      arrows,
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
          .map((a, i) => renderScarStrand(a, i + 1))
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

    // Combined gel per individual — fragments = unique amplicon sizes
    const lanes = dataset.individuals.map(ind => ({
      label: ind.id,
      fragments: ind.alleles.map(a => dataset.ampliconLength[a])
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 600,
      minBp: 100,
      ladder: [600, 500, 480, 430, 400, 300, 200, 100]
    });
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}
