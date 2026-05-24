// RFLP marker page: principle + interactive simulation + Southern blot
// (probe hybridization) + diploid dataset showing codominance + quiz.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { digestWithCoords, fragmentHybridizes } from "../components/restriction.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";

// ── Deterministic 1500 bp filler. The 30-bp repeat contains no GAATTC,
// so the only EcoRI sites in the locus are the ones we insert by hand.
const FILLER_UNIT = "ATCGTACGATCGTACGTACGCATCGATCGT"; // 30 bp
const BASE_1500 = FILLER_UNIT.repeat(50);            // 1500 bp

function replaceAt(seq, pos, fragment) {
  return seq.slice(0, pos) + fragment + seq.slice(pos + fragment.length);
}

/**
 * Build one allele's 1500 bp sequence from the dataset description.
 * @param {"A"|"a"} alleleType
 * @param {object} dataset      The rflp_gene_x.json contents.
 */
function buildAlleleSeq(alleleType, dataset) {
  let s = BASE_1500;
  // Two invariant EcoRI sites (same for every allele)
  for (const pos of dataset.invariantSites) {
    s = replaceAt(s, pos, "GAATTC");
  }
  // Variable site — present in allele A, abolished by SNP in allele a
  const vpos = dataset.variableSite.pos;
  const motif =
    alleleType === "A"
      ? dataset.variableSite.alleleA_motif
      : dataset.variableSite.allelea_motif;
  s = replaceAt(s, vpos, motif);
  return s;
}

export async function render(root) {
  const [enzymes, dataset, quiz] = await Promise.all([
    fetch("data/enzymes.json").then(r => r.json()),
    fetch("data/sequences/rflp_gene_x.json").then(r => r.json()),
    fetch("data/quizzes/rflp.json").then(r => r.json())
  ]);

  const probe = dataset.probe;

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="rflp.title"></h2>
        <p class="subtitle" data-i18n="rflp.subtitle"></p>
      </header>

      <!-- Principle -->
      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="rflp.principle.p1"></p>
        <p data-i18n="rflp.principle.p2"></p>
        <p data-i18n="rflp.principle.p3"></p>
        <p data-i18n="rflp.principle.p4"></p>
      </section>

      <!-- Simulation -->
      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="rflp.sim.help"></p>

        <div class="controls" style="margin-top:14px">
          <div class="control">
            <label data-i18n="ctrl.enzyme"></label>
            <select id="enzyme-pick">
              ${enzymes
                .map(
                  e => `<option value="${e.name}">${e.name} — ${e.recognition}</option>`
                )
                .join("")}
            </select>
          </div>
          <button class="primary" id="run-btn" data-i18n="ctrl.run"></button>
        </div>

        <div id="allele-cards" class="allele-cards-grid"></div>

        <div class="gel-row">
          <div class="gel-pane">
            <h4 class="gel-pane-title" data-i18n="rflp.view.stained"></h4>
            <div id="gel-stained"></div>
          </div>
          <div class="gel-pane">
            <h4 class="gel-pane-title" data-i18n="rflp.view.southern"></h4>
            <div id="gel-southern"></div>
          </div>
        </div>
      </section>

      <!-- Dataset -->
      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="rflp.dataset.title"></strong></p>
        <p data-i18n="rflp.dataset.note"></p>
        <div class="callout">${escapeHtml(
          "Tip: Stained gel มี band เยอะมาก (ในแล็บจริงเป็น smear) — Southern blot เท่านั้นที่ตัดเสียงรบกวนออกให้เห็น band ของ locus เป้าหมาย"
        )}</div>
      </section>

      <!-- Quiz -->
      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);

  const enzymeSelect = root.querySelector("#enzyme-pick");
  enzymeSelect.value = "EcoRI";

  const runBtn = root.querySelector("#run-btn");
  runBtn.addEventListener("click", runSimulation);

  const unsub = onLanguageChange(() => renderAlleleCards());

  function currentEnzyme() {
    return enzymes.find(e => e.name === enzymeSelect.value);
  }

  // Compute per-individual fragments for the current enzyme.
  // For each diploid individual we digest both alleles and combine.
  function computeIndividuals() {
    const enzyme = currentEnzyme();
    return dataset.individuals.map(ind => {
      const alleles = ind.alleles.map(at => {
        const seq = buildAlleleSeq(at, dataset);
        const { fragments, sites } = digestWithCoords(seq, enzyme);
        const hybridized = fragments.filter(f => fragmentHybridizes(f, probe));
        return { type: at, fragments, hybridized, sites };
      });
      return { ind, alleles };
    });
  }

  function renderAlleleCards() {
    const lang = getLang();
    const enzyme = currentEnzyme();
    const data = computeIndividuals();
    const mount = root.querySelector("#allele-cards");
    mount.innerHTML = data
      .map(({ ind, alleles }) => {
        // Always render BOTH homologous chromosomes — even for homozygotes —
        // so the diploid concept is consistent across AA/Aa/aa.
        const strands = alleles
          .map((a, i) => renderAlleleStrand(a, dataset, enzyme, { chromosome: i + 1 }))
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

    const stainedLanes = data.map(({ ind, alleles }) => ({
      label: ind.id,
      fragments: alleles.flatMap(a => a.fragments.map(f => f.size))
    }));

    const southernLanes = data.map(({ ind, alleles }) => ({
      label: ind.id,
      fragments: alleles.flatMap(a => a.hybridized.map(f => f.size))
    }));

    const gelOpts = {
      maxBp: 1500,
      minBp: 50,
      ladder: [1500, 1000, 700, 500, 300, 200, 100, 50]
    };

    renderGel(root.querySelector("#gel-stained"), stainedLanes, gelOpts);
    renderGel(root.querySelector("#gel-southern"), southernLanes, {
      ...gelOpts,
      theme: "membrane"
    });
  }

  runSimulation();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);

  return () => unsub();
}

// Per-allele DNA strand schematic: shows the actual recognition sequence text
// at each cut site (GAATTC/GAACTC etc.), the SNP base highlighted, and the
// probe-binding region. Uses HTML + absolute positioning (no SVG text) so
// labels never get stretched/distorted by responsive scaling.
function renderAlleleStrand(alleleData, dataset, enzyme, opts = {}) {
  const lang = getLang();
  const L = dataset.length;
  const probe = dataset.probe;
  const xpct = pos => (pos / L) * 100;

  const alleleType = alleleData.type;        // "A" or "a"
  const variablePos = dataset.variableSite.pos;
  const alleleA_motif = dataset.variableSite.alleleA_motif;
  const allelea_motif = dataset.variableSite.allelea_motif;

  // Find the SNP base index by comparing the two motifs.
  const snpIdx = findDiffIndex(alleleA_motif, allelea_motif);
  const thisMotif = alleleType === "A" ? alleleA_motif : allelea_motif;
  const motifHtml = highlightAt(thisMotif, snpIdx);

  // Real cut markers from the digest.
  const variableCutFound = alleleData.sites.some(
    s => s.start <= variablePos && s.end >= variablePos + thisMotif.length
  );

  const cutMarkers = alleleData.sites
    .map(s => {
      const atVariable =
        s.start <= variablePos && s.end >= variablePos + thisMotif.length;
      const seqText = atVariable ? motifHtml : enzyme.recognition;
      const dtype = atVariable ? "variable-cut" : "invariant";
      return `
        <div class="cut-marker" data-type="${dtype}" style="left:${xpct(s.cut)}%">
          <div class="cut-seq">${seqText}</div>
          <div class="cut-tick"></div>
          <div class="cut-label">↓ ${s.cut}</div>
        </div>
      `;
    })
    .join("");

  // "No-cut" marker at the variable site — only when the variable position
  // isn't a real cut (e.g. allele a + EcoRI). Helps students see WHY there's
  // no cut: "the SNP changed the recognition sequence".
  let noCutMarker = "";
  if (!variableCutFound) {
    noCutMarker = `
      <div class="cut-marker" data-type="no-cut" style="left:${xpct(variablePos + snpIdx)}%">
        <div class="cut-seq cut-seq-muted">${motifHtml}</div>
        <div class="cut-tick"></div>
        <div class="cut-label">✗ ${lang === "th" ? "ไม่ใช่ site" : "no site"}</div>
      </div>
    `;
  }

  // Probe overlay.
  const probeWidth = xpct(probe.end) - xpct(probe.start);
  const probeLeft = xpct(probe.start);

  // Result summary.
  const sizes = alleleData.fragments.map(f => f.size).join(" + ") + " bp";
  const hybSize =
    alleleData.hybridized.map(f => `${f.size} bp`).join(", ") || "—";
  const chromosomeLabel = lang === "th"
    ? `homologous chromosome ที่ ${opts.chromosome}`
    : `homologous chromosome ${opts.chromosome}`;
  const tagLabel = `Allele ${alleleType} <small style="opacity:0.75">(${chromosomeLabel})</small>`;

  return `
    <div class="allele-strand">
      <span class="strand-tag allele-${alleleType === "A" ? "A" : "a"}">${tagLabel}</span>
      <div class="strand-vis">
        <div class="strand-backbone"></div>
        <div class="strand-probe" style="left:${probeLeft}%; width:${probeWidth}%" title="${probe.name} (${probe.start}–${probe.end})">
          ${probe.name}
        </div>
        ${cutMarkers}
        ${noCutMarker}
        <div class="position-axis">
          <span style="left:0">0</span>
          <span class="end" style="left:100%">${L} bp</span>
        </div>
      </div>
      <div class="strand-result">
        <span class="strand-result-cuts">
          ${alleleData.sites.length} cut${alleleData.sites.length === 1 ? "" : "s"} → ${sizes}
        </span>
        <span class="strand-result-probe">${probe.name} ${lang === "th" ? "จับ" : "binds"}: <strong>${hybSize}</strong></span>
      </div>
    </div>
  `;
}

// Index of first differing character between two equal-length strings.
function findDiffIndex(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
}

// Return motif HTML with the base at `idx` wrapped in <span class="snp">.
function highlightAt(motif, idx) {
  if (idx < 0) return motif;
  return motif.slice(0, idx) + `<span class="snp">${motif[idx]}</span>` + motif.slice(idx + 1);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
