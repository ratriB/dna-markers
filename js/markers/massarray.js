// MassArray marker page. Per-individual MALDI-TOF mass spectra showing 1
// peak (homozygote) or 2 peaks (heterozygote) at the m/z of the single-base
// extension products.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderQuiz } from "../components/quiz.js";

const PEAK_COLORS = {
  5023: "#3b82f6",   // allele A — blue
  5047: "#ef4444"    // allele B — red
};

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/massarray_locus.json?v=3").then(r => r.json()),
    fetch("data/quizzes/massarray.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="massarray.title"></h2>
        <p class="subtitle" data-i18n="massarray.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="massarray.principle.p1"></p>
        <p data-i18n="massarray.principle.p2"></p>
        <p data-i18n="massarray.principle.p3"></p>
        <p data-i18n="massarray.principle.p4"></p>
        <div id="ma-sbe-fig" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="massarray.sim.help"></p>
        <div id="ma-cards" class="allele-cards-grid" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="massarray.dataset.title"></strong></p>
        <p data-i18n="massarray.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);
  const unsub = onLanguageChange(() => render2());

  function render2() {
    const lang = getLang();
    root.querySelector("#ma-sbe-fig").innerHTML = renderSbeFig(dataset);
    root.querySelector("#ma-cards").innerHTML = dataset.individuals
      .map(ind => `
        <div class="allele-card">
          <h4>
            <span>${ind.label[lang]} <small style="color:var(--muted)">[${ind.genotype}]</small></span>
          </h4>
          <p class="allele-desc">${ind.description[lang]}</p>
          ${renderSpectrum(ind, dataset)}
        </div>
      `).join("");
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

function renderSpectrum(ind, dataset) {
  const W = 280;
  const H = 160;
  const padL = 32, padR = 10, padT = 18, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const lang = getLang();

  const mzMin = dataset.spectrumStart;
  const mzMax = dataset.spectrumEnd;
  const xFromMz = m => padL + ((m - mzMin) / (mzMax - mzMin)) * plotW;
  const yFromV = v => padT + plotH - v * plotH;

  // Axis ticks
  const tickMzs = [];
  for (let m = Math.ceil(mzMin / 20) * 20; m <= mzMax; m += 20) tickMzs.push(m);
  const ticks = tickMzs.map(m => `
    <line x1="${xFromMz(m)}" y1="${padT + plotH}" x2="${xFromMz(m)}" y2="${padT + plotH + 4}" stroke="#94a3b8" stroke-width="0.6"/>
    <text x="${xFromMz(m)}" y="${padT + plotH + 14}" text-anchor="middle" font-size="9" fill="#64748b">${m}</text>
  `).join("");

  // Baseline noise (tiny random spikes)
  let noiseLines = "";
  for (let i = 0; i < 60; i++) {
    const x = padL + (i / 59) * plotW;
    const v = Math.random() * 0.03;
    noiseLines += `<line x1="${x}" y1="${yFromV(0)}" x2="${x}" y2="${yFromV(v)}" stroke="#cbd5e1" stroke-width="0.5"/>`;
  }

  // Peaks
  const peaksSvg = ind.peaks.map(p => {
    const color = PEAK_COLORS[p.mz] || "#475569";
    const x = xFromMz(p.mz);
    const yTop = yFromV(p.intensity);
    const yBase = yFromV(0);
    return `
      <line x1="${x}" y1="${yBase}" x2="${x}" y2="${yTop}" stroke="${color}" stroke-width="3"/>
      <circle cx="${x}" cy="${yTop}" r="3" fill="${color}"/>
      <text x="${x}" y="${yTop - 6}" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">m/z ${p.mz}</text>
    `;
  }).join("");

  return `
    <div class="ma-spectrum-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"
           style="max-width:${W}px" class="ma-svg">
        <!-- Axes -->
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#475569" stroke-width="0.8"/>
        <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#475569" stroke-width="0.8"/>
        ${noiseLines}
        ${ticks}
        ${peaksSvg}
        <text x="${padL + plotW / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#475569">${t("massarray.axis.mz")}</text>
        <text x="10" y="${padT + plotH / 2}" text-anchor="middle" font-size="10" fill="#475569" transform="rotate(-90 10 ${padT + plotH / 2})">${t("massarray.axis.intensity")}</text>
      </svg>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────
// Principle figure: visualises the single-base extension (SBE) chemistry
// that produces the mass-spectrum peaks shown in the cards below.
//
// Layout (top → bottom):
//   (1) ddNTP mass reference — 4 coloured pills showing each ddNTP's mass
//   (2) SBE process per genotype — 3 rows (AA · AB · BB):
//         template SNP base · extension primer + arrow · ddNTP picked up ·
//         product mass · peaks produced on the spectrum
//
// The example uses an A/C SNP so the gap (24 Da) matches the dataset.
// ─────────────────────────────────────────────────────────────────────
function renderSbeFig(dataset) {
  const lang = getLang();
  const W = 820;
  const H = 410;
  const INK  = "#0f172a";

  // Our two SNP alleles for the example: A vs C (24 Da gap)
  const alleleA = { base: "A", ddnt: "ddA", mass: 313, color: "#3b82f6", mz: dataset.alleleA_mz };
  const alleleB = { base: "C", ddnt: "ddC", mass: 289, color: "#ef4444", mz: dataset.alleleB_mz };
  const PRIMER_BASE_MASS = alleleA.mz - alleleA.mass; // = 4710 Da (a ~15-mer extension primer)

  // ── Panel 1: ddNTP mass reference ────────────────────────────────
  const panel1Y = 18;
  const panel1Label = lang === "th"
    ? "1 · มวลของ ddNTP (ใช้เป็น \"แสตมป์\" บอก allele)"
    : "1 · ddNTP masses — the chemical \"stamps\" that mark each allele";

  const ddNtps = [
    { name: "ddC", mass: 289, color: "#ef4444", isPick: false },
    { name: "ddT", mass: 304, color: "#f59e0b", isPick: false },
    { name: "ddA", mass: 313, color: "#3b82f6", isPick: false },
    { name: "ddG", mass: 329, color: "#10b981", isPick: false }
  ];
  const pillW = 130, pillH = 36, pillGap = 14;
  const pillStartX = (W - (pillW * 4 + pillGap * 3)) / 2;
  const pillY = panel1Y + 22;
  const pillsHtml = ddNtps.map((p, i) => {
    const x = pillStartX + i * (pillW + pillGap);
    return `
      <g>
        <rect x="${x}" y="${pillY}" width="${pillW}" height="${pillH}" rx="18" fill="${p.color}" opacity="0.15" stroke="${p.color}" stroke-width="1.5"/>
        <text x="${x + 18}" y="${pillY + 24}" font-size="14" font-weight="700" fill="${p.color}">${p.name}</text>
        <text x="${x + pillW - 14}" y="${pillY + 24}" text-anchor="end" font-size="13" fill="${INK}">${p.mass} Da</text>
      </g>
    `;
  }).join("");
  const massHint = lang === "th"
    ? "ผลต่างมวล: ddA−ddT = 9 · ddA−ddG = 16 · ddA−ddC = 24 · ddG−ddC = 40 Da"
    : "Mass gaps: ddA−ddT = 9 · ddA−ddG = 16 · ddA−ddC = 24 · ddG−ddC = 40 Da";

  // ── Panel 2: per-genotype SBE outcome ────────────────────────────
  const dividerY = pillY + pillH + 30;
  const divider = `<line x1="40" y1="${dividerY}" x2="${W - 40}" y2="${dividerY}" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2,3"/>`;

  const panel2Label = lang === "th"
    ? `2 · Single-base extension บน SNP A/C ของแต่ละ genotype (gap = 24 Da)`
    : `2 · Single-base extension on an A/C SNP for each genotype (gap = 24 Da)`;
  const colHeader = lang === "th"
    ? ["Genotype", "Template + extension primer", "ddNTP ที่เติม", "Extension product"]
    : ["Genotype", "Template + extension primer", "ddNTP added", "Extension product"];

  const colX = [70, 290, 540, 720];
  const headerY = dividerY + 26;
  const headerHtml = colX.map((x, i) =>
    `<text x="${x}" y="${headerY}" text-anchor="middle" font-size="10.5" fill="#64748b" font-weight="700">${colHeader[i]}</text>`
  ).join("");
  const headerLine = `<line x1="40" y1="${headerY + 8}" x2="${W - 40}" y2="${headerY + 8}" stroke="#cbd5e1" stroke-width="0.5"/>`;

  // gt = internal key (matches massarray_locus.json genotypes); display =
  // Mendelian notation (AA / Aa / aa) shown to students.
  const rows = [
    { gt: "AA", display: "AA", uses: [alleleA] },
    { gt: "AB", display: "Aa", uses: [alleleA, alleleB] },
    { gt: "BB", display: "aa", uses: [alleleB] }
  ];
  const rowH = 70;
  const rowsHtml = rows.map((row, idx) => {
    const cy = headerY + 38 + idx * rowH;
    const gtLabel = `<text x="${colX[0]}" y="${cy + 4}" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}">${row.display}</text>`;
    const tmpl = renderSbeTemplate(colX[1], cy, row.gt, alleleA, alleleB, lang);
    const ddPick = renderDdPickColumn(colX[2], cy, row.uses);
    const product = renderProductColumn(colX[3], cy, row.uses, PRIMER_BASE_MASS);
    return gtLabel + tmpl + ddPick + product;
  }).join("");

  return `
    <figure class="ma-sbe-fig">
      <figcaption class="ma-sbe-cap">${t("massarray.sbe.title")}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="ma-svg">
        <text x="60" y="${panel1Y}" font-size="12" fill="${INK}" font-weight="700">${panel1Label}</text>
        ${pillsHtml}
        <text x="${W / 2}" y="${pillY + pillH + 16}" text-anchor="middle" font-size="10" fill="#64748b" font-style="italic">${massHint}</text>

        ${divider}
        <text x="60" y="${dividerY + 14}" font-size="12" fill="${INK}" font-weight="700">${panel2Label}</text>
        ${headerHtml}
        ${headerLine}
        ${rowsHtml}
      </svg>
      <p class="ma-sbe-note">${t("massarray.sbe.note")}</p>
    </figure>
  `;
}

// Template + extension primer drawing for one SBE row.
function renderSbeTemplate(cx, cy, gt, alleleA, alleleB, lang) {
  const drawOne = (yc, snpBase, snpColor) => {
    const x1 = cx - 90, x2 = cx + 90;
    const xSnp = cx + 30;
    return `
      <g>
        <!-- template strand (top) -->
        <line x1="${x1}" y1="${yc}" x2="${x2}" y2="${yc}" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
        <text x="${xSnp}" y="${yc - 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${snpColor}">${snpBase}</text>
        <!-- extension primer (bottom, with 3' end abutting the SNP) -->
        <line x1="${x1}" y1="${yc + 10}" x2="${xSnp - 6}" y2="${yc + 10}" stroke="#a855f7" stroke-width="2.4" stroke-linecap="round"/>
        <polygon points="${xSnp - 6},${yc + 6} ${xSnp - 6},${yc + 14} ${xSnp - 2},${yc + 10}" fill="#a855f7"/>
        <text x="${x1 + 2}" y="${yc + 22}" font-size="9" fill="#7c3aed" font-style="italic">ext. primer</text>
        <text x="${xSnp - 12}" y="${yc + 22}" text-anchor="end" font-size="9" fill="#7c3aed">3'</text>
      </g>
    `;
  };
  if (gt === "AA") return drawOne(cy - 6, alleleA.base, alleleA.color);
  if (gt === "BB") return drawOne(cy - 6, alleleB.base, alleleB.color);
  // heterozygote: two templates stacked
  return drawOne(cy - 16, alleleA.base, alleleA.color) + drawOne(cy + 14, alleleB.base, alleleB.color);
}

function renderDdPickColumn(cx, cy, uses) {
  // For each allele used, show a small ddNTP pill incoming
  const w = 64, h = 22;
  const ys = uses.length === 1 ? [cy] : [cy - 16, cy + 14];
  return uses.map((al, i) => {
    const yc = ys[i];
    return `
      <g>
        <rect x="${cx - w / 2}" y="${yc - h / 2}" width="${w}" height="${h}" rx="11" fill="${al.color}" opacity="0.18" stroke="${al.color}" stroke-width="1.4"/>
        <text x="${cx}" y="${yc + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${al.color}">${al.ddnt}</text>
      </g>
    `;
  }).join("");
}

function renderProductColumn(cx, cy, uses, primerBase) {
  const ys = uses.length === 1 ? [cy] : [cy - 18, cy + 14];
  return uses.map((al, i) => {
    const yc = ys[i];
    const mz = al.mz;
    return `
      <g>
        <text x="${cx}" y="${yc - 2}" text-anchor="middle" font-size="11" font-weight="700" fill="${al.color}">m/z = ${mz}</text>
        <text x="${cx}" y="${yc + 12}" text-anchor="middle" font-size="9" fill="#64748b">(${primerBase} + ${al.mass})</text>
      </g>
    `;
  }).join("");
}
