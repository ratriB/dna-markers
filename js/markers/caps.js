// CAPs marker page: PCR amplicon + restriction digest, diploid → codominant
// pattern, with per-allele DNA strand visualization.

import { getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { digestWithCoords } from "../components/restriction.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
import {
  renderStrand,
  chromosomeLabel,
  findDiffIndex,
  highlightAt
} from "../components/strand.js";

const FILLER_UNIT = "ATCGTACGATCGTACGTACGCATCGATCGT"; // 30 bp, no GAATTC
const BASE_480 = FILLER_UNIT.repeat(16);              // 480 bp

function replaceAt(seq, pos, fragment) {
  return seq.slice(0, pos) + fragment + seq.slice(pos + fragment.length);
}

function buildAlleleAmplicon(alleleType, dataset) {
  const v = dataset.variableSite;
  const motif = alleleType === "A" ? v.alleleA_motif : v.allelea_motif;
  return replaceAt(BASE_480, dataset.snpPos - 3, motif);
}

export async function render(root) {
  const [enzymes, dataset, quiz] = await Promise.all([
    fetch("data/enzymes.json").then(r => r.json()),
    fetch("data/sequences/caps_gene_y.json").then(r => r.json()),
    fetch("data/quizzes/caps.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="caps.title"></h2>
        <p class="subtitle" data-i18n="caps.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="caps.principle.p1"></p>
        <p data-i18n="caps.principle.p2"></p>
        <p data-i18n="caps.principle.p3"></p>
        <p data-i18n="caps.principle.p4"></p>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="caps.sim.help"></p>

        <div class="controls" style="margin-top:14px">
          <div class="control">
            <label data-i18n="ctrl.enzyme"></label>
            <select id="enzyme-pick">
              ${enzymes.map(e => `<option value="${e.name}">${e.name} — ${e.recognition}</option>`).join("")}
            </select>
          </div>
          <button class="primary" id="run-btn" data-i18n="ctrl.run"></button>
        </div>

        <div id="allele-cards" class="allele-cards-grid"></div>
        <div id="gel-mount" style="margin-top:18px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="caps.dataset.title"></strong></p>
        <p data-i18n="caps.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);

  const enzymeSelect = root.querySelector("#enzyme-pick");
  enzymeSelect.value = "EcoRI";
  root.querySelector("#run-btn").addEventListener("click", runSimulation);
  const unsub = onLanguageChange(() => renderAlleleCards());

  function currentEnzyme() {
    return enzymes.find(e => e.name === enzymeSelect.value);
  }

  function computeIndividuals() {
    const enzyme = currentEnzyme();
    return dataset.individuals.map(ind => {
      const alleles = ind.alleles.map(at => {
        const seq = buildAlleleAmplicon(at, dataset);
        const { fragments, sites } = digestWithCoords(seq, enzyme);
        return { type: at, fragments, sites };
      });
      return { ind, alleles };
    });
  }

  function renderCAPsStrand(alleleData, chromosomeNum) {
    const lang = getLang();
    const enzyme = currentEnzyme();
    const alleleType = alleleData.type;
    const v = dataset.variableSite;
    const snpIdx = findDiffIndex(v.alleleA_motif, v.allelea_motif);
    const thisMotif = alleleType === "A" ? v.alleleA_motif : v.allelea_motif;
    const motifHtml = highlightAt(thisMotif, snpIdx);
    const variableStart = dataset.snpPos - 3;

    // Cut markers from the digest
    const variableCutFound = alleleData.sites.some(
      s => s.start <= variableStart && s.end >= variableStart + thisMotif.length
    );
    const cuts = alleleData.sites.map(s => {
      const atVariable =
        s.start <= variableStart && s.end >= variableStart + thisMotif.length;
      return {
        position: s.cut,
        motifHtml: atVariable ? motifHtml : enzyme.recognition,
        kind: atVariable ? "variable-cut" : "invariant",
        label: `↓ ${s.cut}`
      };
    });
    if (!variableCutFound) {
      cuts.push({
        position: variableStart + snpIdx,
        motifHtml: motifHtml,
        kind: "no-cut",
        label: `✗ ${lang === "th" ? "ไม่ใช่ site" : "no site"}`
      });
    }

    // Features: forward + reverse primers
    const features = [
      {
        start: dataset.primers.forward.start,
        end: dataset.primers.forward.end,
        label: "F →",
        bg: "rgba(59,130,246,0.28)",
        border: "#3b82f6",
        color: "#1e3a8a"
      },
      {
        start: dataset.primers.reverse.start,
        end: dataset.primers.reverse.end,
        label: "← R",
        bg: "rgba(168,85,247,0.28)",
        border: "#a855f7",
        color: "#581c87"
      }
    ];

    const sizes = alleleData.fragments.map(f => f.size).join(" + ") + " bp";
    const nCuts = alleleData.sites.length;
    const resultText = `${nCuts} cut${nCuts === 1 ? "" : "s"} → ${sizes}`;
    const tagLabel = `Allele ${alleleType} <small style="opacity:0.75">(${chromosomeLabel(chromosomeNum)})</small>`;

    return renderStrand({
      length: dataset.ampliconLength,
      alleleClass: alleleType === "A" ? "A" : "a",
      tagLabel,
      features,
      cuts,
      resultText
    });
  }

  function renderAlleleCards() {
    const lang = getLang();
    const data = computeIndividuals();
    const mount = root.querySelector("#allele-cards");
    mount.innerHTML = data
      .map(({ ind, alleles }) => {
        const strands = alleles
          .map((a, i) => renderCAPsStrand(a, i + 1))
          .join("");
        return `
          <div class="allele-card">
            <h4>
              <span>${escapeHtml(ind.label[lang])}
                <small style="color:var(--muted)">[${escapeHtml(ind.genotype)}]</small>
              </span>
            </h4>
            <p class="allele-desc">${escapeHtml(ind.description[lang])}</p>
            ${strands}
          </div>
        `;
      })
      .join("");
  }

  function runSimulation() {
    renderAlleleCards();
    const data = computeIndividuals();
    const lanes = data.map(({ ind, alleles }) => ({
      label: ind.id,
      fragments: alleles.flatMap(a => a.fragments.map(f => f.size))
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 500,
      minBp: 50,
      ladder: [500, 400, 300, 250, 200, 150, 100, 50]
    });
  }

  runSimulation();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
