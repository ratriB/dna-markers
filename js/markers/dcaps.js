// dCAPs marker page. Demonstrates the engineered-primer trick that creates a
// PstI restriction site only for allele G. Per-allele strand visualization
// + 2 homologous chromosomes per individual.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
import {
  renderStrand,
  chromosomeLabel,
  findDiffIndex,
  highlightAt
} from "../components/strand.js";

// The PstI motif as it appears on the amplicon after PCR with the engineered
// primer. Last base is the SNP — completes the site only when allele is G.
const MOTIF_CUT = "CTGCAG";   // primer (CCTGCA) + allele G base
const MOTIF_NOCUT = "CTGCAA"; // primer (CCTGCA) + allele A base — not a PstI site
const CUT_POSITION = 22;      // engineered cut sits 22 bp from the 5' end
const PRIMER_END = 22;        // forward primer occupies positions 0–22

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/dcaps_gene_z.json").then(r => r.json()),
    fetch("data/quizzes/dcaps.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="dcaps.title"></h2>
        <p class="subtitle" data-i18n="dcaps.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="dcaps.principle.p1"></p>
        <p data-i18n="dcaps.principle.p2"></p>
        <p data-i18n="dcaps.principle.p3"></p>
        <p data-i18n="dcaps.principle.p4"></p>
        ${renderDCAPsWalkthrough()}
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="dcaps.dataset.note"></p>
        <div id="allele-cards" class="allele-cards-grid"></div>
        <div id="gel-mount" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="dcaps.dataset.title"></strong></p>
        <p data-i18n="dcaps.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  function renderDCAPsStrand(alleleType, chromosomeNum) {
    const lang = getLang();
    const snpIdx = findDiffIndex(MOTIF_CUT, MOTIF_NOCUT); // index 5
    const motifText = alleleType === "G" ? MOTIF_CUT : MOTIF_NOCUT;
    const motifHtml = highlightAt(motifText, snpIdx);

    // Cut marker — present for allele G, "no-cut" placeholder for allele A
    const cuts = alleleType === "G"
      ? [{
          position: CUT_POSITION,
          motifHtml,
          kind: "variable-cut",
          label: `↓ ${CUT_POSITION}`
        }]
      : [{
          position: CUT_POSITION,
          motifHtml,
          kind: "no-cut",
          label: `✗ ${lang === "th" ? "ไม่ใช่ PstI site" : "no PstI site"}`
        }];

    // Engineered forward primer overlay
    const features = [
      {
        start: 0,
        end: PRIMER_END,
        label: lang === "th" ? "Engineered F primer" : "Engineered F primer",
        bg: "rgba(249,115,22,0.25)",
        border: "#f97316",
        color: "#7c2d12"
      }
    ];

    // Per-allele fragments
    const fragments = alleleType === "G" ? [22, 198] : [220];
    const sizes = fragments.join(" + ") + " bp";
    const nCuts = alleleType === "G" ? 1 : 0;
    const resultText = `${nCuts} cut${nCuts === 1 ? "" : "s"} → ${sizes}`;

    // Color: G (cuts) → blue (A class); A (no cut) → red (a class)
    const alleleClass = alleleType === "G" ? "A" : "a";
    const tagLabel = `Allele ${alleleType} <small style="opacity:0.75">(${chromosomeLabel(chromosomeNum)})</small>`;

    return renderStrand({
      length: dataset.ampliconLength,
      alleleClass,
      tagLabel,
      features,
      cuts,
      resultText
    });
  }

  function render2() {
    const lang = getLang();
    root.querySelector("#allele-cards").innerHTML = dataset.individuals
      .map(ind => {
        const strands = ind.alleles
          .map((a, i) => renderDCAPsStrand(a, i + 1))
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
      fragments: ind.fragments
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 250,
      minBp: 15,
      ladder: [250, 200, 150, 100, 50, 25, 15]
    });
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// Sequence-level walkthrough: 4 stacked panels showing the dCAPs trick on
// real bases. Same example sequences in every step so students can trace
// changes from native → primer → amplicon → digest.
function renderDCAPsWalkthrough() {
  // Shared sequences (positions 1-30 of a 220 bp amplicon)
  //   positions 1-22  = primer region
  //   position 21     = the engineered mismatch (native T → primer C)
  //   position 23     = SNP (G in allele 1, A in allele 2)
  //   positions 18-23 = CTGCAG (PstI site) — formed only when SNP = G
  const FLANK_5 = "ATCGGTACGGTAATTT";  // positions 1-16 (16 bp)
  const FLANK_3 = "CAGCTAC";           // positions 24-30 (7 bp)

  // Step 1 — native template (no engineering)
  const tplG = `${FLANK_5}CCTG<u>T</u>A<span class="snp-base">G</span>${FLANK_3}`;
  const tplA = `${FLANK_5}CCTG<u>T</u>A<span class="snp-base">A</span>${FLANK_3}`;

  // Step 2 — primer comparison
  const primerNative = `${FLANK_5}CCTG<u>T</u>A`;
  const primerDCAPs  = `${FLANK_5}CCTG<span class="mismatch-base">C</span>A`;

  // Step 3 — PCR amplicon (primer C now incorporated at position 21)
  const ampG3 = `${FLANK_5}<span class="restriction-site">CTG<span class="mismatch-base">C</span>A<span class="snp-base">G</span></span>${FLANK_3.slice(1)}`;
  const ampA3 = `${FLANK_5}CTG<span class="mismatch-base">C</span>A<span class="snp-base">A</span>${FLANK_3.slice(1)}`;

  // Step 4 — after PstI digestion (only allele G is cut)
  const ampG4 = `${FLANK_5}CTG<span class="mismatch-base">C</span>A<span class="cut-mark">✂</span><span class="snp-base">G</span>${FLANK_3.slice(1)}`;
  const ampA4 = `${FLANK_5}CTG<span class="mismatch-base">C</span>A<span class="snp-base">A</span>${FLANK_3.slice(1)}`;

  return `
    <div class="dcaps-walkthrough">
      <h4 class="dcaps-wt-title">${t("dcaps.wt.title")}</h4>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">1</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("dcaps.wt.step1.title")}</h5>
          <pre class="dcaps-seq"><span class="seq-label">${t("dcaps.wt.label.alleleG")}</span> 5'-${tplG}...-3'
<span class="seq-label">${t("dcaps.wt.label.alleleA")}</span> 5'-${tplA}...-3'</pre>
          <p class="dcaps-wt-note">${t("dcaps.wt.step1.note")}</p>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">2</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("dcaps.wt.step2.title")}</h5>
          <pre class="dcaps-seq"><span class="seq-label">${t("dcaps.wt.label.native")}</span> 5'-${primerNative}-3'
<span class="seq-label">${t("dcaps.wt.label.dcaps")}</span> 5'-${primerDCAPs}-3'</pre>
          <p class="dcaps-wt-note">${t("dcaps.wt.step2.note")}</p>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">3</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("dcaps.wt.step3.title")}</h5>
          <pre class="dcaps-seq"><span class="seq-label">${t("dcaps.wt.label.ampG")}</span> 5'-${ampG3}...-3'  <span class="result-good">${t("dcaps.wt.tag.good")}</span>
<span class="seq-label">${t("dcaps.wt.label.ampA")}</span> 5'-${ampA3}...-3'  <span class="result-bad">${t("dcaps.wt.tag.bad")}</span></pre>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">4</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("dcaps.wt.step4.title")}</h5>
          <pre class="dcaps-seq"><span class="seq-label">${t("dcaps.wt.label.ampG")}</span> 5'-${ampG4}...-3'  <span class="result-good">${t("dcaps.wt.tag.cut")}</span>
<span class="seq-label">${t("dcaps.wt.label.ampA")}</span> 5'-${ampA4}...-3'  <span class="result-bad">${t("dcaps.wt.tag.nocut")}</span></pre>
        </div>
      </div>
    </div>
  `;
}
