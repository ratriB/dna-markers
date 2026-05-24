// KASP marker page. SVG scatter plot of FAM vs HEX fluorescence showing 3
// genotype clusters + NTC. Cluster colors match the standard KASP convention.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderQuiz } from "../components/quiz.js";

const CLUSTER_COLORS = {
  AA:  "#3b82f6",   // blue (FAM)
  BB:  "#ef4444",   // red (HEX)
  AB:  "#a855f7",   // purple (both)
  NTC: "#94a3b8"    // grey
};

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/kasp_locus.json?v=2").then(r => r.json()),
    fetch("data/quizzes/kasp.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="kasp.title"></h2>
        <p class="subtitle" data-i18n="kasp.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="kasp.principle.p1"></p>
        <p data-i18n="kasp.principle.p2"></p>
        <p data-i18n="kasp.principle.p3"></p>
        <p data-i18n="kasp.principle.p4"></p>
        <div id="kasp-mech-fig" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="kasp.sim.help"></p>
        <div id="kasp-plot" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="kasp.dataset.title"></strong></p>
        <p data-i18n="kasp.dataset.note"></p>
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
    root.querySelector("#kasp-plot").innerHTML = renderScatter(dataset);
    root.querySelector("#kasp-mech-fig").innerHTML = renderKaspMechFig();
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

function renderScatter(dataset) {
  const W = 480;
  const H = 460;
  const padL = 60, padR = 18, padT = 18, padB = 50;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const lang = getLang();

  // Domain: 0 .. 1 fluorescence (normalized)
  const xFromV = v => padL + v * plotW;
  const yFromV = v => padT + plotH - v * plotH;

  // Axis ticks at 0, 0.2, 0.4, 0.6, 0.8, 1.0
  const ticksX = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => `
    <line x1="${xFromV(v)}" y1="${padT + plotH}" x2="${xFromV(v)}" y2="${padT + plotH + 4}" stroke="#94a3b8"/>
    <text x="${xFromV(v)}" y="${padT + plotH + 16}" text-anchor="middle" font-size="10" fill="#64748b">${v.toFixed(1)}</text>
  `).join("");
  const ticksY = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => `
    <line x1="${padL - 4}" y1="${yFromV(v)}" x2="${padL}" y2="${yFromV(v)}" stroke="#94a3b8"/>
    <text x="${padL - 8}" y="${yFromV(v) + 3}" text-anchor="end" font-size="10" fill="#64748b">${v.toFixed(1)}</text>
  `).join("");

  // Grid (subtle)
  const grid = [0.2, 0.4, 0.6, 0.8].map(v => `
    <line x1="${xFromV(v)}" y1="${padT}" x2="${xFromV(v)}" y2="${padT + plotH}" stroke="#e2e8f0" stroke-width="0.5"/>
    <line x1="${padL}" y1="${yFromV(v)}" x2="${padL + plotW}" y2="${yFromV(v)}" stroke="#e2e8f0" stroke-width="0.5"/>
  `).join("");

  // Sample dots
  const dots = dataset.samples.map(s => {
    const color = CLUSTER_COLORS[s.genotype];
    return `<circle cx="${xFromV(s.fam)}" cy="${yFromV(s.hex)}" r="6" fill="${color}" fill-opacity="0.75" stroke="${color}" stroke-width="1.5">
              <title>${s.id} — ${s.genotype}</title>
            </circle>`;
  }).join("");

  // Cluster labels (positioned near centroid of each genotype's points)
  const centroid = (gt) => {
    const pts = dataset.samples.filter(s => s.genotype === gt);
    const fam = pts.reduce((a, s) => a + s.fam, 0) / pts.length;
    const hex = pts.reduce((a, s) => a + s.hex, 0) / pts.length;
    return { fam, hex };
  };
  const labels = ["AA", "BB", "AB", "NTC"].map(gt => {
    const c = centroid(gt);
    const dx = gt === "AA" ? 0 : (gt === "BB" ? 0 : (gt === "AB" ? 60 : 60));
    const dy = gt === "AA" ? -22 : (gt === "BB" ? -22 : (gt === "AB" ? 0 : 0));
    const label = t(`kasp.cluster.${gt.toLowerCase()}`);
    return `<text x="${xFromV(c.fam) + dx}" y="${yFromV(c.hex) + dy}"
              text-anchor="middle" font-size="11" font-weight="700" fill="${CLUSTER_COLORS[gt]}">${label}</text>`;
  }).join("");

  // Legend
  const legend = ["AA", "AB", "BB", "NTC"].map(gt => `
    <span><span class="kasp-legend-dot" style="background:${CLUSTER_COLORS[gt]}"></span>${t(`kasp.cluster.${gt.toLowerCase()}`)}</span>
  `).join("");

  return `
    <div class="kasp-plot-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"
           style="max-width:${W}px" class="kasp-svg">
        ${grid}
        <!-- Axes -->
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#475569" stroke-width="1"/>
        <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#475569" stroke-width="1"/>
        ${ticksX}
        ${ticksY}

        ${dots}
        ${labels}

        <text x="${padL + plotW / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#475569">${t("kasp.axis.fam")}</text>
        <text x="14" y="${padT + plotH / 2}" text-anchor="middle" font-size="11" fill="#475569" transform="rotate(-90 14 ${padT + plotH / 2})">${t("kasp.axis.hex")}</text>
      </svg>
      <div class="kasp-legend">${legend}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────
// Principle figure: visualises why each genotype lands in its scatter
// cluster. Two panels:
//
//   (1) FRET cassette mechanism — shows one cassette in two states:
//       quenched (fluorophore + quencher annealed, no signal) and
//       released (allele-specific tail captures the fluorophore strand,
//       quencher displaces, fluorescence emitted).
//
//   (2) Per-genotype outcome — 3 rows (AA · AB · BB) showing which
//       allele-specific primer extends on the template, which FRET
//       cassette gets captured, and the resulting fluorescence colour.
//       This directly explains the 3 clusters in the scatter plot below.
// ─────────────────────────────────────────────────────────────────────
function renderKaspMechFig() {
  const lang = getLang();
  const W = 820;
  const H = 460;

  const BLUE = "#3b82f6";   // FAM
  const RED  = "#ef4444";   // HEX
  const INK  = "#0f172a";
  const MUT  = "#94a3b8";

  // ── Panel 1: FRET cassette mechanism (top) ───────────────────────
  // Left state: quenched (annealed pair, no glow). Right state: released
  // (tail-strand captured by primer tail, quencher displaced, glow on).
  const panel1Y = 24;
  const cassetteW = 130, cassetteH = 26;
  const leftCx = 170, rightCx = 580;
  const arrowX1 = leftCx + cassetteW / 2 + 18;
  const arrowX2 = rightCx - cassetteW / 2 - 18;

  const panel1Label = lang === "th" ? "1 · กลไก FRET cassette" : "1 · FRET cassette mechanism";
  const stateOff = lang === "th" ? "Quenched (off)" : "Quenched (off)";
  const stateOn  = lang === "th" ? "Released (glows)" : "Released (glows)";
  const captureNote = lang === "th"
    ? "tail ที่ primer สังเคราะห์ → จับ cassette → quencher หลุด"
    : "newly-synthesised primer tail captures the cassette → quencher displaced";

  const cassetteSvg = (cx, cy, glowing, color) => {
    const x1 = cx - cassetteW / 2;
    const x2 = cx + cassetteW / 2;
    const y1 = cy - cassetteH / 2;
    const y2 = cy + cassetteH / 2;
    const fluoX  = x1 + 14;
    const quenchX = glowing ? x2 + 18 : x2 - 18;  // quencher walks off when released

    const glow = glowing ? `<circle cx="${fluoX}" cy="${cy}" r="14" fill="${color}" opacity="0.22"/>` : "";
    const fluoLabel = "F";
    const quenchLabel = "Q";

    // Two strands: the top (fluorophore-bearing) strand stays; the bottom
    // (quencher-bearing) strand displaces on capture.
    const topStrand = `<line x1="${x1 + 4}" y1="${y1 + 4}" x2="${x2 - 4}" y2="${y1 + 4}" stroke="#475569" stroke-width="2" stroke-linecap="round"/>`;
    const botStrand = glowing
      ? `<line x1="${x1 + 28}" y1="${y2 + 8}" x2="${x2 + 28}" y2="${y2 + 8}" stroke="${MUT}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3,2"/>`
      : `<line x1="${x1 + 4}" y1="${y2 - 4}" x2="${x2 - 4}" y2="${y2 - 4}" stroke="#475569" stroke-width="2" stroke-linecap="round"/>`;
    const bonds = glowing ? "" : Array.from({ length: 6 }, (_, i) => {
      const bx = x1 + 14 + i * 18;
      return `<line x1="${bx}" y1="${y1 + 5}" x2="${bx}" y2="${y2 - 5}" stroke="#22c55e" stroke-width="1.2"/>`;
    }).join("");

    return `
      <g>
        ${glow}
        ${topStrand}
        ${bonds}
        ${botStrand}
        <circle cx="${fluoX}" cy="${cy}" r="7" fill="${color}" stroke="#1e293b" stroke-width="0.8"/>
        <text x="${fluoX}" y="${cy + 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">${fluoLabel}</text>
        <circle cx="${quenchX}" cy="${glowing ? y2 + 8 : cy}" r="6" fill="#1e293b"/>
        <text x="${quenchX}" y="${(glowing ? y2 + 8 : cy) + 3}" text-anchor="middle" font-size="8" font-weight="700" fill="#ffffff">${quenchLabel}</text>
      </g>
    `;
  };

  const panel1 = `
    <text x="60" y="${panel1Y}" font-size="12" fill="${INK}" font-weight="700">${panel1Label}</text>

    ${cassetteSvg(leftCx,  panel1Y + 50, false, BLUE)}
    <text x="${leftCx}"  y="${panel1Y + 92}" text-anchor="middle" font-size="11" fill="#475569">${stateOff}</text>

    <line x1="${arrowX1}" y1="${panel1Y + 50}" x2="${arrowX2 - 6}" y2="${panel1Y + 50}" stroke="${MUT}" stroke-width="1.5"/>
    <polygon points="${arrowX2 - 6},${panel1Y + 46} ${arrowX2 - 6},${panel1Y + 54} ${arrowX2},${panel1Y + 50}" fill="${MUT}"/>
    <text x="${(arrowX1 + arrowX2) / 2}" y="${panel1Y + 40}" text-anchor="middle" font-size="10" fill="#64748b" font-style="italic">${captureNote}</text>

    ${cassetteSvg(rightCx, panel1Y + 50, true, BLUE)}
    <text x="${rightCx}" y="${panel1Y + 92}" text-anchor="middle" font-size="11" fill="${BLUE}" font-weight="700">${stateOn} ★</text>
  `;

  // Divider between panels
  const dividerY = 160;
  const divider = `<line x1="40" y1="${dividerY}" x2="${W - 40}" y2="${dividerY}" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2,3"/>`;

  // ── Panel 2: per-genotype outcome (bottom) ───────────────────────
  // 3 rows, each row: genotype label | template strand | primer state |
  // cassette state | signal indicator
  const panel2Label = lang === "th"
    ? "2 · ผลลัพธ์ของแต่ละ genotype → ตำแหน่งบน scatter"
    : "2 · Outcome per genotype → position on scatter";
  const colHeader = lang === "th"
    ? ["Genotype", "Template", "Allele-specific primer", "FRET cassette ที่ติด", "สัญญาณ"]
    : ["Genotype", "Template", "Allele-specific primer", "FRET cassette captured", "Signal"];

  const colX = [70, 200, 380, 580, 740];
  const headerY = dividerY + 26;
  const headerHtml = colX.map((x, i) =>
    `<text x="${x}" y="${headerY}" text-anchor="middle" font-size="10.5" fill="#64748b" font-weight="700">${colHeader[i]}</text>`
  ).join("");
  const headerLine = `<line x1="40" y1="${headerY + 8}" x2="${W - 40}" y2="${headerY + 8}" stroke="#cbd5e1" stroke-width="0.5"/>`;

  // gt = internal data key (matches kasp_locus.json) · display = Mendelian
  // notation shown to students (AA / Aa / aa).
  const rows = [
    { gt: "AA", display: "AA", famActive: true,  hexActive: false },
    { gt: "AB", display: "Aa", famActive: true,  hexActive: true  },
    { gt: "BB", display: "aa", famActive: false, hexActive: true  }
  ];
  const rowHeight = 78;
  const rowsHtml = rows.map((row, idx) => {
    const cy = headerY + 40 + idx * rowHeight;

    // Genotype label
    const gtLabel = `<text x="${colX[0]}" y="${cy + 4}" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}">${row.display}</text>`;

    // Template — 1 or 2 strands depending on homo/hetero
    const tmpl = renderTinyTemplate(colX[1], cy, row.gt, BLUE, RED, lang);

    // Primer state — show F-A (allele A) and F-a (allele a) primers stacked,
    // with check/cross indicating which one extends on this template.
    const primerStateHtml = `
      <g transform="translate(${colX[2] - 80}, ${cy - 18})">
        ${renderPrimerRow(0, "F-A", row.famActive, BLUE, lang)}
        ${renderPrimerRow(28, "F-a", row.hexActive, RED, lang)}
      </g>
    `;

    // Cassette captured — show 1 or 2 cassettes glowing
    const casW = 50;
    const casCount = (row.famActive ? 1 : 0) + (row.hexActive ? 1 : 0);
    const casStartX = colX[3] - (casCount - 1) * (casW + 8) / 2;
    let casHtml = "";
    let casIdx = 0;
    if (row.famActive) {
      casHtml += renderMiniCassette(casStartX + casIdx * (casW + 8), cy, BLUE);
      casIdx++;
    }
    if (row.hexActive) {
      casHtml += renderMiniCassette(casStartX + casIdx * (casW + 8), cy, RED);
    }

    // Signal indicator: circles
    let signalHtml = "";
    const cy2 = cy + 4;
    if (row.famActive && !row.hexActive) {
      signalHtml = `
        <circle cx="${colX[4]}" cy="${cy}" r="11" fill="${BLUE}" opacity="0.85"/>
        <text x="${colX[4]}" y="${cy2 + 22}" text-anchor="middle" font-size="10" fill="${BLUE}" font-weight="700">FAM only</text>
      `;
    } else if (!row.famActive && row.hexActive) {
      signalHtml = `
        <circle cx="${colX[4]}" cy="${cy}" r="11" fill="${RED}" opacity="0.85"/>
        <text x="${colX[4]}" y="${cy2 + 22}" text-anchor="middle" font-size="10" fill="${RED}" font-weight="700">HEX only</text>
      `;
    } else {
      signalHtml = `
        <circle cx="${colX[4] - 10}" cy="${cy}" r="11" fill="${BLUE}" opacity="0.8"/>
        <circle cx="${colX[4] + 10}" cy="${cy}" r="11" fill="${RED}" opacity="0.8"/>
        <text x="${colX[4]}" y="${cy2 + 22}" text-anchor="middle" font-size="10" fill="#a855f7" font-weight="700">${lang === "th" ? "ทั้ง FAM + HEX" : "FAM + HEX"}</text>
      `;
    }

    return gtLabel + tmpl + primerStateHtml + casHtml + signalHtml;
  }).join("");

  return `
    <figure class="kasp-mech-fig">
      <figcaption class="kasp-mech-cap">${t("kasp.mech.title")}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="kasp-svg">
        ${panel1}
        ${divider}
        <text x="60" y="${dividerY + 14}" font-size="12" fill="${INK}" font-weight="700">${panel2Label}</text>
        ${headerHtml}
        ${headerLine}
        ${rowsHtml}
      </svg>
      <p class="kasp-mech-note">${t("kasp.mech.note")}</p>
    </figure>
  `;
}

// Tiny template helper for the per-genotype rows. Uses Mendelian allele
// letters (A / a) on the strands to match the AA / Aa / aa genotype labels.
function renderTinyTemplate(cx, cy, gt, blueColor, redColor, lang) {
  const w = 100, h = 14;
  const drawStrand = (yc, base, color) => {
    const x1 = cx - w / 2;
    const x2 = cx + w / 2;
    return `
      <line x1="${x1}" y1="${yc}" x2="${x2}" y2="${yc}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
      <text x="${cx}" y="${yc - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${base}</text>
    `;
  };
  if (gt === "AA") return drawStrand(cy, "A", blueColor) + drawStrand(cy + h + 4, "A", blueColor);
  if (gt === "BB") return drawStrand(cy, "a", redColor)  + drawStrand(cy + h + 4, "a", redColor);
  return drawStrand(cy, "A", blueColor) + drawStrand(cy + h + 4, "a", redColor);
}

function renderPrimerRow(y, label, active, color, lang) {
  const arrowColor = active ? color : "#94a3b8";
  const markColor  = active ? "#15803d" : "#dc2626";
  const mark = active ? "✓" : "✗";
  const status = active
    ? (lang === "th" ? "ขยาย" : "extends")
    : (lang === "th" ? "ไม่ขยาย" : "no extension");
  return `
    <g transform="translate(0, ${y})">
      <text x="0" y="9" font-size="10" font-weight="700" fill="${arrowColor}">${label}</text>
      <line x1="22" y1="6" x2="48" y2="6" stroke="${arrowColor}" stroke-width="2"/>
      <polygon points="48,2 56,6 48,10" fill="${arrowColor}"/>
      <text x="68" y="9" font-size="11" font-weight="700" fill="${markColor}">${mark}</text>
      <text x="82" y="9" font-size="10" fill="${arrowColor}" font-style="italic">${status}</text>
    </g>
  `;
}

function renderMiniCassette(cx, cy, color) {
  const w = 44, h = 12;
  const x1 = cx - w / 2;
  const x2 = cx + w / 2;
  const y1 = cy - h / 2;
  const y2 = cy + h / 2;
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="14" fill="${color}" opacity="0.2"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" stroke="#475569" stroke-width="1.5"/>
      <circle cx="${x1 + 8}" cy="${cy - 3}" r="5" fill="${color}" stroke="#1e293b" stroke-width="0.6"/>
      <text x="${x1 + 8}" y="${cy}" text-anchor="middle" font-size="7" font-weight="700" fill="#ffffff">F</text>
    </g>
  `;
}
