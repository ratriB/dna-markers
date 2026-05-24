// Tetra-ARMS PCR marker page.
// Single PCR with 4 primers. Per chromosome we show: the outer primer pair
// (always active — produces the control band) plus the inner primer that
// matches the chromosome's allele (the mismatched inner primer is shown
// "greyed out" with an ✗ to explain why it doesn't extend).

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";
// Static query bump forces a fresh fetch of strand.js so the per-individual
// cards pick up the new arrow-with-star rendering (see strand.js changelog).
import { renderStrand, chromosomeLabel } from "../components/strand.js?v=2";

const OUTER_PRIMER_WIDTH = 18;   // bp drawn for outer primers

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/tetraarms_gene_w.json").then(r => r.json()),
    fetch("data/quizzes/tetra-arms.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="tetra-arms.title"></h2>
        <p class="subtitle" data-i18n="tetra-arms.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="tetra-arms.principle.p1"></p>
        <p data-i18n="tetra-arms.principle.p2"></p>
        <p data-i18n="tetra-arms.principle.p3"></p>
        <p data-i18n="tetra-arms.principle.p4"></p>
        ${renderTetraWalkthrough()}
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="tetra-arms.dataset.note"></p>
        <div id="allele-cards" class="allele-cards-grid" style="margin-top:14px"></div>
        <div id="gel-mount" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="tetra-arms.dataset.title"></strong></p>
        <p data-i18n="tetra-arms.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  function renderTetraStrand(alleleType, chromosomeNum) {
    const lang = getLang();
    const L = dataset.regionLength;
    const snpPos = dataset.snpPos;
    const ofP = dataset.primers.find(p => p.id === "OF");
    const orP = dataset.primers.find(p => p.id === "OR");

    const ifaActive = alleleType === "A";
    const irtActive = alleleType === "T";

    // 4 primers as directional arrows. Outer primers near the strand edges
    // (offset slightly so the arrow body is fully visible). Inner primers
    // positioned just before the SNP so the arrow head visually points
    // toward it. Inner primers carry the red ★ marking the −2 designed
    // mismatch (Ye & Day, 2001).
    const arrows = [
      {
        position: ofP.pos + 35,
        direction: "right",
        side:      "above",
        present:   true,
        label:     "OF",
        color:     "#0891b2",
        title:     "Outer Forward — always active (control band)"
      },
      {
        position: snpPos - 16,
        direction: "right",
        side:      "above",
        present:   ifaActive,
        label:     ifaActive ? "IF-A" : "✗ IF-A",
        color:     "#2563eb",
        star:      true,
        title:     ifaActive
          ? "Inner Forward A-specific — extends (3' matches allele A)"
          : "Inner Forward A-specific — 3' mismatch with allele T blocks extension"
      },
      {
        position: snpPos + 16,
        direction: "left",
        side:      "below",
        present:   irtActive,
        label:     irtActive ? "IR-T" : "✗ IR-T",
        color:     "#dc2626",
        star:      true,
        title:     irtActive
          ? "Inner Reverse T-specific — extends (3' matches allele T)"
          : "Inner Reverse T-specific — 3' mismatch with allele A blocks extension"
      },
      {
        position: orP.pos - 35,
        direction: "left",
        side:      "below",
        present:   true,
        label:     "OR",
        color:     "#16a34a",
        title:     "Outer Reverse — always active (control band)"
      }
    ];

    // SNP marker — show the actual allele base, no cut tick (override via CSS)
    const cuts = [
      {
        position: snpPos,
        motifHtml: `<span class="snp">${alleleType}</span>`,
        kind: "snp",
        label: `SNP @ ${snpPos}`
      }
    ];

    // PCR products from this chromosome
    const products = [`${dataset.products.control.size} bp (control)`];
    if (ifaActive) products.push(`${dataset.products.alleleA.size} bp (IF-A·OR)`);
    if (irtActive) products.push(`${dataset.products.alleleT.size} bp (OF·IR-T)`);
    const resultText =
      (lang === "th" ? "ผลิตได้: " : "Produces: ") + products.join(" + ");

    const alleleClass = alleleType === "A" ? "A" : "a";
    const tagLabel = `Allele ${alleleType} <small style="opacity:0.75">(${chromosomeLabel(chromosomeNum)})</small>`;

    return renderStrand({
      length: L,
      alleleClass,
      tagLabel,
      features: [],
      arrows,
      cuts,
      resultText
    });
  }

  function computeBands(ind) {
    const bands = [{ size: dataset.products.control.size, kind: "control" }];
    if (ind.alleles.includes("A")) {
      bands.push({ size: dataset.products.alleleA.size, kind: "alleleA" });
    }
    if (ind.alleles.includes("T")) {
      bands.push({ size: dataset.products.alleleT.size, kind: "alleleT" });
    }
    return bands;
  }

  function render2() {
    const lang = getLang();
    root.querySelector("#allele-cards").innerHTML = dataset.individuals
      .map(ind => {
        const strands = ind.alleles
          .map((a, i) => renderTetraStrand(a, i + 1))
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
      fragments: computeBands(ind).map(b => b.size)
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 500,
      minBp: 100,
      ladder: [500, 412, 300, 248, 218, 150, 100]
    });
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequence-level walkthrough — 4 steps explaining ARMS principle + tetra setup
// ─────────────────────────────────────────────────────────────────────────────
function renderTetraWalkthrough() {
  return `
    <div class="dcaps-walkthrough">
      <h4 class="dcaps-wt-title">${t("tetra-arms.wt.title")}</h4>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">1</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("tetra-arms.wt.step1.title")}</h5>
          ${svgArmsPrinciple()}
          <p class="dcaps-wt-note">${t("tetra-arms.wt.step1.note")}</p>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">2</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("tetra-arms.wt.step2.title")}</h5>
          ${svgTetraSetup()}
          <p class="dcaps-wt-note">${t("tetra-arms.wt.step2.note")}</p>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">3</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("tetra-arms.wt.step3.title")}</h5>
          ${renderPcrProducts()}
          <p class="dcaps-wt-note">${t("tetra-arms.wt.step3.note")}</p>
        </div>
      </div>

      <div class="dcaps-wt-step">
        <div class="dcaps-wt-step-num">4</div>
        <div class="dcaps-wt-step-body">
          <h5>${t("tetra-arms.wt.step4.title")}</h5>
          ${renderGenotypeGels()}
          <p class="dcaps-wt-note">${t("tetra-arms.wt.step4.note")}</p>
        </div>
      </div>
    </div>
  `;
}

// Step 1 — Show match vs mismatch on the same template, side by side.
// Labels are wrapped in .seq-label (fixed 110px width) so the bases beneath
// "Template:" and "Primer:" line up vertically in the same column.
function svgArmsPrinciple() {
  const match = `
    <div class="arms-case good">
      <h6>${t("tetra-arms.wt.step1.match")}</h6>
      <pre class="dcaps-seq"><span class="seq-label">${t("tetra-arms.wt.label.template")}</span>5'-...ATCG<span class="snp-base">A</span>TGCA...-3'
<span class="seq-label">${t("tetra-arms.wt.label.primer")}</span>3'-...TAGC<span class="match-base">T</span>-5'   ✓ Taq extends →</pre>
    </div>
  `;
  const mismatch = `
    <div class="arms-case bad">
      <h6>${t("tetra-arms.wt.step1.mismatch")}</h6>
      <pre class="dcaps-seq"><span class="seq-label">${t("tetra-arms.wt.label.template")}</span>5'-...ATCG<span class="snp-base">A</span>TGCA...-3'
<span class="seq-label">${t("tetra-arms.wt.label.primer")}</span>3'-...TAGC<span class="mismatch-base">A</span>-5'   ✗ Taq blocked</pre>
    </div>
  `;
  return `<div class="arms-principle-pair">${match}${mismatch}</div>`;
}

// Step 2 — DsDNA with all 4 primers drawn as arrows
function svgTetraSetup() {
  const W = 720, H = 230;
  const yTop = 95, yBot = 135;
  const xSNP = 360;

  const arrow = (x1, x2, y, color, label, sublabel) => {
    const dir = x2 > x1 ? "right" : "left";
    const head = dir === "right"
      ? `<polygon points="${x2},${y - 5} ${x2 + 8},${y} ${x2},${y + 5}" fill="${color}"/>`
      : `<polygon points="${x2},${y - 5} ${x2 - 8},${y} ${x2},${y + 5}" fill="${color}"/>`;
    return `
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="3"/>
      ${head}
      <text x="${(x1 + x2) / 2}" y="${y - 9}" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${label}</text>
      ${sublabel ? `<text x="${(x1 + x2) / 2}" y="${y + 18}" text-anchor="middle" font-size="9" fill="${color}">${sublabel}</text>` : ""}
    `;
  };

  const star = (x, y) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">★</text>`;

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="tetra-setup-svg">
      <rect x="${xSNP - 8}" y="${yTop - 14}" width="16" height="${yBot - yTop + 28}" fill="#fde047" opacity="0.45" rx="3"/>
      <text x="${xSNP}" y="${yTop - 22}" text-anchor="middle" font-size="11" font-weight="700" fill="#78350f">SNP</text>

      <line x1="30" y1="${yTop}" x2="${W - 30}" y2="${yTop}" stroke="#475569" stroke-width="2.5"/>
      <line x1="30" y1="${yBot}" x2="${W - 30}" y2="${yBot}" stroke="#475569" stroke-width="2.5"/>
      <text x="14" y="${yTop + 4}" font-size="10" fill="#64748b">5'</text>
      <text x="${W - 12}" y="${yTop + 4}" font-size="10" fill="#64748b">3'</text>
      <text x="14" y="${yBot + 4}" font-size="10" fill="#64748b">3'</text>
      <text x="${W - 12}" y="${yBot + 4}" font-size="10" fill="#64748b">5'</text>

      <text x="${xSNP}" y="${yTop + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#78350f" font-family="monospace">A</text>
      <text x="${xSNP}" y="${yBot + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#78350f" font-family="monospace">T</text>

      <text x="${W - 30}" y="${yTop - 22}" text-anchor="end" font-size="9" fill="#94a3b8" font-style="italic">top strand</text>
      <text x="${W - 30}" y="${yBot + 20}" text-anchor="end" font-size="9" fill="#94a3b8" font-style="italic">bottom strand</text>

      <g transform="translate(0, 55)">${arrow(60, 160, 0, "#0891b2", "OF", "Outer Forward")}</g>
      <g transform="translate(0, 55)">
        ${arrow(240, xSNP, 0, "#2563eb", "IF-A", "3' end on SNP → A-specific")}
        ${star(xSNP - 5, 5)}
      </g>
      <g transform="translate(0, 175)">${arrow(660, 560, 0, "#16a34a", "OR", "Outer Reverse")}</g>
      <g transform="translate(0, 175)">
        ${arrow(480, xSNP, 0, "#dc2626", "IR-T", "3' end on SNP → T-specific")}
        ${star(xSNP + 5, -8)}
      </g>

      <g transform="translate(20, ${H - 8})">
        <text x="0" y="0" font-size="10" fill="#475569"><tspan fill="#dc2626" font-weight="700">★</tspan> = secondary mismatch at position −2 from 3' end (Ye &amp; Day, 2001 design — destabilizes wrong-allele duplex)</text>
      </g>
    </svg>
  `;
}

// Step 3 — Show which PCR products are made for each allele template
function renderPcrProducts() {
  const products = [
    { color: "#fbbf24", label: t("tetra-arms.wt.product.control"), width: 95 },
    { color: "#2563eb", label: t("tetra-arms.wt.product.a"),      width: 57 },
    { color: "#dc2626", label: t("tetra-arms.wt.product.t"),      width: 50 }
  ];

  const renderRow = (templateName, made) => `
    <div class="tetra-products-row">
      <div class="tetra-products-label">${templateName}</div>
      <div class="tetra-products-bars">
        ${products.map((p, i) => `
          <div class="tetra-product-bar ${made[i] ? '' : 'notmade'}">
            <div class="bar" style="width:${p.width}%; background:${p.color}; ${made[i] ? '' : 'opacity:0.18'}"></div>
            <span class="bar-label">${p.label}${made[i] ? '' : ` <em>(${t("tetra-arms.wt.product.notmade")})</em>`}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  return `
    <div class="tetra-products">
      ${renderRow(t("tetra-arms.wt.allele.a"), [true, true, false])}
      ${renderRow(t("tetra-arms.wt.allele.t"), [true, false, true])}
    </div>
  `;
}

// Step 4 — Gel pattern for 3 genotypes (AA, AT, TT)
function renderGenotypeGels() {
  const W = 480, H = 220;
  const padT = 18, padB = 38;
  const laneW = 100, laneGap = 30;
  const startX = 60;

  const ladder = [500, 412, 300, 248, 218, 150, 100];
  const maxBp = Math.max(...ladder);
  const minBp = Math.min(...ladder);
  const logMax = Math.log10(maxBp), logMin = Math.log10(minBp);
  const yFromBp = bp => padT + ((logMax - Math.log10(bp)) / (logMax - logMin)) * (H - padT - padB);

  const lanes = [
    { label: t("tetra-arms.wt.geno.aa"), bands: [412, 248] },
    { label: t("tetra-arms.wt.geno.at"), bands: [412, 248, 218] },
    { label: t("tetra-arms.wt.geno.tt"), bands: [412, 218] }
  ];

  const ladderTicks = ladder.map(bp => `
    <line x1="${startX - 5}" y1="${yFromBp(bp)}" x2="${startX}" y2="${yFromBp(bp)}" stroke="#94a3b8" stroke-width="0.8"/>
    <text x="${startX - 8}" y="${yFromBp(bp) + 3}" text-anchor="end" font-size="9" font-family="monospace" fill="#64748b">${bp}</text>
  `).join("");

  const lanesHtml = lanes.map((lane, idx) => {
    const x = startX + 20 + idx * (laneW + laneGap);
    const bandColor = bp => bp === 412 ? "#fbbf24" : (bp === 248 ? "#2563eb" : "#dc2626");
    const bands = lane.bands.map(bp => `
      <rect x="${x + 4}" y="${yFromBp(bp) - 3}" width="${laneW - 8}" height="6" fill="${bandColor(bp)}" rx="1" opacity="0.95"/>
      <text x="${x + laneW + 6}" y="${yFromBp(bp) + 3}" font-size="9" font-family="monospace" fill="${bandColor(bp)}">${bp}</text>
    `).join("");
    return `
      <rect x="${x}" y="${padT}" width="${laneW}" height="${H - padT - padB}" fill="#1e293b" stroke="#475569" stroke-width="0.5" rx="2"/>
      ${bands}
      <text x="${x + laneW / 2}" y="${H - 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#475569">${lane.label}</text>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="tetra-gel-svg">
      <text x="${startX - 8}" y="${padT - 5}" text-anchor="end" font-size="9" font-family="monospace" fill="#64748b">bp</text>
      ${ladderTicks}
      ${lanesHtml}
    </svg>
  `;
}
