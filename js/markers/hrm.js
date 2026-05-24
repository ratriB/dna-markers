// HRM marker page. Normalized difference melting-curve plot showing AA, AB,
// BB genotypes as distinct curve shapes. Curves are generated mathematically
// (sigmoid-derivative-style peaks centered at each allele's Tm) so the SNP
// effect is visually obvious.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderQuiz } from "../components/quiz.js";

let highlighted = "all"; // "all" | "AA" | "AB" | "BB"

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/hrm_locus.json?v=2").then(r => r.json()),
    fetch("data/quizzes/hrm.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="hrm.title"></h2>
        <p class="subtitle" data-i18n="hrm.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="hrm.principle.p1"></p>
        <p data-i18n="hrm.principle.p2"></p>
        <p data-i18n="hrm.principle.p3"></p>
        <p data-i18n="hrm.principle.p4"></p>
        <div id="hrm-duplex-fig" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="hrm.sim.help"></p>
        <div class="hrm-controls" id="hrm-buttons"></div>
        <div id="hrm-plot" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="hrm.dataset.title"></strong></p>
        <p data-i18n="hrm.dataset.note"></p>
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

    // Genotype buttons
    const buttons = ["all", "AA", "AB", "BB"].map(g => {
      const label = g === "all"
        ? (lang === "th" ? "ดูทุก genotype" : "Show all")
        : dataset.genotypes[g].label[lang];
      return `<button class="hrm-btn ${highlighted === g ? 'active' : ''}" data-gt="${g}">${label}</button>`;
    }).join("");
    root.querySelector("#hrm-buttons").innerHTML = buttons;
    root.querySelectorAll(".hrm-btn").forEach(b => {
      b.addEventListener("click", () => {
        highlighted = b.dataset.gt;
        render2();
      });
    });

    // Plot (Tm window strip is now integrated above the curves inside the SVG)
    root.querySelector("#hrm-plot").innerHTML = renderHrmPlot(dataset);

    // Principle figure: duplex formation + heteroduplex species + SNP class
    root.querySelector("#hrm-duplex-fig").innerHTML = renderHrmPrincipleFig();
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// Compute normalized difference value at temperature t for a homozygous
// genotype with given Tm. Bell-curve approximation of the derivative of a
// melting sigmoid (Gaussian).
function gaussian(t, tm, sigma = 0.55) {
  const x = (t - tm) / sigma;
  return Math.exp(-0.5 * x * x);
}

// Heterozygote: superposition of two Gaussians at tm1, tm2, broadened
// slightly + a small low-Tm bump for heteroduplex.
function heteroCurve(t, tm1, tm2, broaden = 0.6) {
  const homoA = 0.5 * gaussian(t, tm1, 0.55);
  const homoB = 0.5 * gaussian(t, tm2, 0.55);
  const hetero = 0.45 * gaussian(t, (tm1 + tm2) / 2 - 1.2, 0.8 + broaden);
  return homoA + homoB + hetero;
}

function renderHrmPlot(dataset) {
  const lang = getLang();

  // Layout: two stacked regions sharing the same temperature x-axis.
  //   ┌─ Tm window strip (top)  → 3 horizontal bars + range labels
  //   │
  //   ├─ Melt curve area (below)
  //   └─ x-axis (temperature)
  const W = 720;
  const H = 400;
  const padL = 56, padR = 140, padT = 14, padB = 42;
  const plotW = W - padL - padR;

  const stripH   = 60;           // 3 rows of ~20 px
  const stripGap = 10;           // visual breathing room before curves start
  const plotH    = H - padT - padB - stripH - stripGap;
  const plotTop  = padT + stripH + stripGap;

  const tMin = dataset.tempStart;
  const tMax = dataset.tempEnd;
  const step = dataset.tempStep;

  const xFromT = t => padL + ((t - tMin) / (tMax - tMin)) * plotW;

  // ── Curves (for the lower panel) ───────────────────────────────────
  const curves = {};
  const ts = [];
  for (let t = tMin; t <= tMax + 1e-9; t += step) ts.push(+t.toFixed(2));

  curves.AA = ts.map(t => gaussian(t, dataset.genotypes.AA.tm));
  curves.BB = ts.map(t => gaussian(t, dataset.genotypes.BB.tm));
  curves.AB = ts.map(t => heteroCurve(t,
    dataset.genotypes.AB.tm1, dataset.genotypes.AB.tm2,
    dataset.genotypes.AB.heteroduplexBroaden));

  const allValues = [...curves.AA, ...curves.BB, ...curves.AB];
  const yMax = Math.max(...allValues) * 1.08;
  const yFromV = v => plotTop + plotH - (v / yMax) * plotH;

  const pathFor = (vals) => vals.map((v, i) => {
    const cmd = i === 0 ? "M" : "L";
    return `${cmd} ${xFromT(ts[i]).toFixed(1)} ${yFromV(v).toFixed(1)}`;
  }).join(" ");

  // ── Tm windows (for the top strip) ─────────────────────────────────
  // Same curve maths as above, but sampled finer (0.05 °C) and reduced
  // to the temperature range where the curve still reaches 25 % of its
  // peak. Driven by the dataset → bars adjust automatically if Tm values
  // change.
  const fineTs = [];
  for (let t = tMin; t <= tMax + 1e-9; t += 0.05) fineTs.push(+t.toFixed(2));
  const windowOf = (curveFn) => {
    const vals = fineTs.map(curveFn);
    const peak = Math.max(...vals);
    const thr = 0.25 * peak;
    let lo = fineTs[0], hi = fineTs[fineTs.length - 1];
    for (let i = 0; i < vals.length; i++) if (vals[i] >= thr) { lo = fineTs[i]; break; }
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] >= thr) { hi = fineTs[i]; break; }
    return [lo, hi];
  };
  const ranges = {
    AA: windowOf(t => gaussian(t, dataset.genotypes.AA.tm)),
    BB: windowOf(t => gaussian(t, dataset.genotypes.BB.tm)),
    AB: windowOf(t => heteroCurve(t,
      dataset.genotypes.AB.tm1, dataset.genotypes.AB.tm2,
      dataset.genotypes.AB.heteroduplexBroaden))
  };

  // ── Top strip bars ────────────────────────────────────────────────
  // Order top → bottom: aa (high Tm) · Aa (broad) · AA (low Tm) — matches
  // the conference reference figure (GG / GA / AA stacked on the right).
  const stripOrder = ["BB", "AB", "AA"];
  const rowSpacing = stripH / stripOrder.length;
  const stripBars = stripOrder.map((g, idx) => {
    const [lo, hi] = ranges[g];
    const color = dataset.genotypes[g].color;
    const y = padT + rowSpacing * idx + rowSpacing / 2;
    const x1 = xFromT(lo);
    const x2 = xFromT(hi);
    const dim = highlighted !== "all" && highlighted !== g;
    const op = dim ? 0.18 : 0.85;
    const tag = dataset.genotypes[g].label[lang].replace(/^Homozygous |^Heterozygous /, "");
    return `
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
            stroke="${color}" stroke-width="10" stroke-linecap="round" opacity="${op}"/>
      <text x="${padL + plotW + 8}" y="${y + 4}" font-size="12" font-weight="700"
            fill="${color}" opacity="${dim ? 0.4 : 1}">${tag}</text>
      <text x="${padL + plotW + 34}" y="${y + 4}" font-size="10"
            fill="${color}" opacity="${dim ? 0.35 : 0.9}">${lo.toFixed(2)}–${hi.toFixed(2)}°C</text>
    `;
  }).join("");

  // Subtle divider between strip and curve area
  const dividerHtml = `<line x1="${padL}" y1="${plotTop - 5}" x2="${padL + plotW}" y2="${plotTop - 5}" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2,3"/>`;

  // ── Axes ──────────────────────────────────────────────────────────
  const xTicks = [];
  for (let t = Math.ceil(tMin); t <= Math.floor(tMax); t++) {
    xTicks.push(`
      <line x1="${xFromT(t)}" y1="${plotTop + plotH}" x2="${xFromT(t)}" y2="${plotTop + plotH + 4}" stroke="#94a3b8" stroke-width="0.6"/>
      <text x="${xFromT(t)}" y="${plotTop + plotH + 16}" text-anchor="middle" font-size="10" fill="#64748b">${t}</text>
    `);
  }

  // Tm vertical guides — drawn from the very top of the strip down to
  // the x-axis so students can project each homozygote Tm onto both the
  // strip and the curve.
  const tmLines = `
    <line x1="${xFromT(dataset.genotypes.AA.tm)}" y1="${padT}" x2="${xFromT(dataset.genotypes.AA.tm)}" y2="${plotTop + plotH}" stroke="#3b82f6" stroke-width="0.6" stroke-dasharray="2,3" opacity="0.45"/>
    <line x1="${xFromT(dataset.genotypes.BB.tm)}" y1="${padT}" x2="${xFromT(dataset.genotypes.BB.tm)}" y2="${plotTop + plotH}" stroke="#ef4444" stroke-width="0.6" stroke-dasharray="2,3" opacity="0.45"/>
  `;

  // ── Curves (selected drawn last so it sits on top) ────────────────
  const order = highlighted === "all" ? ["AA", "BB", "AB"] : (() => {
    const others = ["AA", "BB", "AB"].filter(g => g !== highlighted);
    return [...others, highlighted];
  })();
  const pathsHtml = order.map(g => {
    const color = dataset.genotypes[g].color;
    const dim = highlighted !== "all" && highlighted !== g;
    return `<path d="${pathFor(curves[g])}" fill="none" stroke="${color}" stroke-width="${dim ? 1.5 : 3}" opacity="${dim ? 0.25 : 1}"/>`;
  }).join("");

  // Legend
  const legend = ["AA", "AB", "BB"].map(g =>
    `<span><span class="hrm-legend-dot" style="background:${dataset.genotypes[g].color}"></span>${dataset.genotypes[g].label[lang]} (Tm = ${dataset.genotypes[g].tm || `${dataset.genotypes[g].tm1}/${dataset.genotypes[g].tm2}`}°C)</span>`
  ).join("");

  return `
    <div class="hrm-plot-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="hrm-svg">
        ${tmLines}

        <!-- Tm window strip (top) -->
        ${stripBars}
        ${dividerHtml}

        <!-- Curve plot axes -->
        <line x1="${padL}" y1="${plotTop}" x2="${padL}" y2="${plotTop + plotH}" stroke="#475569" stroke-width="1"/>
        <line x1="${padL}" y1="${plotTop + plotH}" x2="${padL + plotW}" y2="${plotTop + plotH}" stroke="#475569" stroke-width="1"/>

        ${xTicks.join("")}
        ${pathsHtml}

        <!-- Axis labels -->
        <text x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#475569">${t("hrm.axis.temp")}</text>
        <text x="14" y="${plotTop + plotH / 2}" text-anchor="middle" font-size="11" fill="#475569" transform="rotate(-90 14 ${plotTop + plotH / 2})">${t("hrm.axis.diff")}</text>
      </svg>
      <p class="hrm-range-caption">${t("hrm.range.caption")}</p>
      <div class="hrm-legend">${legend}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────
// Principle figure: shows WHY the heterozygote curve is broader.
//
// Top row (post-PCR): each genotype has 2 dsDNA copies — homozygotes
//   produce 2 identical duplexes, heterozygote produces one of each.
// Bottom row (after heat + re-anneal during HRM ramp): homozygotes
//   re-form only their own homoduplex; the heterozygote can re-pair
//   strands across alleles → 4 species (2 homo + 2 hetero with a
//   mismatch bubble at the SNP). The mismatch bubble lowers Tm → wider
//   melt curve with an extra low-Tm shoulder.
//
// SNP class mini-table below: reminds students that not all SNPs are
// equally HRM-friendly. Class 1 (C/T, G/A — like our [A/G] example) is
// easiest; Class 4 (A/T) is hardest.
//
// Convention used here (matches the dataset Tm values):
//   AA homozygote → A/T duplex (blue, lower GC, Tm = 81.5)
//   aa homozygote → G/C duplex (red,  higher GC, Tm = 82.8)
//   Aa heterozygote → both → re-anneal mixes them
// ─────────────────────────────────────────────────────────────────────
function renderHrmPrincipleFig() {
  const lang = getLang();
  const W = 820;
  const H = 470;

  const BLUE = "#3b82f6";   // A allele strands (A/T duplex)
  const RED  = "#ef4444";   // a allele strands (G/C duplex)

  const colX = [140, 410, 680];
  const titles = ["Homozygous AA", "Heterozygous Aa", "Homozygous aa"];

  // ── Section row labels (left margin) ──────────────────────────────
  const ampLabel = lang === "th" ? "หลัง PCR" : "Post-PCR";
  const reaLabel = lang === "th" ? "หลัง denature + re-anneal" : "After denature + re-anneal";
  const rampNote = lang === "th"
    ? "(heat → cool ใน HRM ramp)"
    : "(heat → cool during HRM ramp)";

  // Post-PCR duplexes — 2 stacked per column
  const ampHtml = [
    duplex(colX[0], 70,  "A", "T", BLUE,  BLUE),
    duplex(colX[0], 115, "A", "T", BLUE,  BLUE),
    duplex(colX[1], 70,  "A", "T", BLUE,  BLUE),
    duplex(colX[1], 115, "G", "C", RED,   RED),
    duplex(colX[2], 70,  "G", "C", RED,   RED),
    duplex(colX[2], 115, "G", "C", RED,   RED)
  ].join("");

  // Down-arrows (one per column) between amplification + re-anneal sections
  const arrowsHtml = colX.map(x => arrowDown(x, 165, 200)).join("");

  // Re-annealed species
  //  AA / aa columns → 1 homoduplex centred
  //  Aa column → 2×2 grid: 2 homoduplex (top row) + 2 heteroduplex (bottom)
  const aX1 = colX[1] - 92;
  const aX2 = colX[1] + 92;
  const aY1 = 290;
  const aY2 = 360;

  const reaHtml = [
    duplex(colX[0], 320, "A", "T", BLUE, BLUE),
    duplex(aX1, aY1, "A", "T", BLUE, BLUE),
    duplex(aX2, aY1, "G", "C", RED,  RED),
    duplex(aX1, aY2, "G", "T", RED,  BLUE, { mismatch: true }),
    duplex(aX2, aY2, "A", "C", BLUE, RED,  { mismatch: true }),
    duplex(colX[2], 320, "G", "C", RED, RED)
  ].join("");

  // Small descriptors under each Aa species
  const aaTags = [
    { x: aX1, y: aY1 + 32, text: lang === "th" ? "homoduplex" : "homoduplex" },
    { x: aX2, y: aY1 + 32, text: lang === "th" ? "homoduplex" : "homoduplex" },
    { x: aX1, y: aY2 + 38, text: lang === "th" ? "heteroduplex (G·T)" : "heteroduplex (G·T)" },
    { x: aX2, y: aY2 + 38, text: lang === "th" ? "heteroduplex (A·C)" : "heteroduplex (A·C)" }
  ].map(s =>
    `<text x="${s.x}" y="${s.y}" text-anchor="middle" font-size="9.5" fill="#64748b" font-style="italic">${s.text}</text>`
  ).join("");

  // Column conclusion lines (under the re-anneal block)
  const conclusion = [
    { x: colX[0], text: lang === "th" ? "1 species → Tm เดียว → peak แคบ" : "1 species → single Tm → narrow peak" },
    { x: colX[1], text: lang === "th" ? "4 species (2 homo + 2 hetero)" : "4 species (2 homo + 2 hetero)" },
    { x: colX[2], text: lang === "th" ? "1 species → Tm เดียว → peak แคบ" : "1 species → single Tm → narrow peak" }
  ];
  const conclusionLine2 = {
    x: colX[1],
    text: lang === "th"
      ? "→ multi-Tm → curve กว้าง + ไหล่ Tm ต่ำ"
      : "→ multi-Tm → broader curve, low-Tm shoulder"
  };
  const conclusionHtml =
    conclusion.map(c =>
      `<text x="${c.x}" y="430" text-anchor="middle" font-size="11" fill="#334155" font-weight="600">${c.text}</text>`
    ).join("") +
    `<text x="${conclusionLine2.x}" y="446" text-anchor="middle" font-size="11" fill="#334155" font-weight="600">${conclusionLine2.text}</text>`;

  // Column titles (top row)
  const titlesHtml = colX.map((x, i) =>
    `<text x="${x}" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">${titles[i]}</text>`
  ).join("");

  // Left-margin section labels
  const sectionLabels = `
    <text x="10" y="95"  font-size="11" fill="#64748b" font-weight="700">${ampLabel}</text>
    <text x="10" y="295" font-size="11" fill="#64748b" font-weight="700">${reaLabel}</text>
    <text x="10" y="310" font-size="10" fill="#94a3b8">${rampNote}</text>
  `;

  return `
    <figure class="hrm-principle-fig">
      <figcaption class="hrm-principle-cap">${t("hrm.duplex.title")}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="hrm-svg">
        ${titlesHtml}
        ${ampHtml}
        ${arrowsHtml}
        ${reaHtml}
        ${aaTags}
        ${conclusionHtml}
        ${sectionLabels}
      </svg>
      ${renderHrmSnpClassTable()}
    </figure>
  `;
}

// One double-stranded DNA "molecule" centred at (cx, cy).
//   topBase / botBase  — single-letter base label drawn above / below
//   topColor / botColor — strand colour (different for heteroduplex)
//   opts.mismatch       — draws a bubble (strands bulge outward, H-bonds gap)
function duplex(cx, cy, top, bot, topColor, botColor, opts = {}) {
  const w = 110, h = 22;
  const x1 = cx - w / 2;
  const x2 = cx + w / 2;
  const y1 = cy - h / 2;
  const y2 = cy + h / 2;
  const mismatch = !!opts.mismatch;

  const numBonds = 8;
  const midIdx = Math.floor(numBonds / 2);
  let bonds = "";
  for (let i = 1; i <= numBonds; i++) {
    if (mismatch && (i === midIdx || i === midIdx + 1)) continue;
    const bx = x1 + (w / (numBonds + 1)) * i;
    bonds += `<line x1="${bx}" y1="${y1}" x2="${bx}" y2="${y2}" stroke="#22c55e" stroke-width="1.5"/>`;
  }

  const topStrand = mismatch
    ? `<path d="M ${x1} ${y1} L ${cx - 14} ${y1} Q ${cx} ${y1 - 10} ${cx + 14} ${y1} L ${x2} ${y1}" stroke="${topColor}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
    : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" stroke="${topColor}" stroke-width="2.8" stroke-linecap="round"/>`;

  const botStrand = mismatch
    ? `<path d="M ${x1} ${y2} L ${cx - 14} ${y2} Q ${cx} ${y2 + 10} ${cx + 14} ${y2} L ${x2} ${y2}" stroke="${botColor}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
    : `<line x1="${x1}" y1="${y2}" x2="${x2}" y2="${y2}" stroke="${botColor}" stroke-width="2.8" stroke-linecap="round"/>`;

  // Base labels — bump outward a touch on mismatch so they sit above/below the bulge
  const topBaseY = mismatch ? y1 - 12 : y1 - 3;
  const botBaseY = mismatch ? y2 + 20 : y2 + 12;
  const baseFill = mismatch ? "#dc2626" : "#0f172a";

  return `
    <g>
      <text x="${cx}" y="${topBaseY}" text-anchor="middle" font-size="11" font-weight="700" fill="${baseFill}">${top}</text>
      ${topStrand}
      ${bonds}
      ${botStrand}
      <text x="${cx}" y="${botBaseY}" text-anchor="middle" font-size="11" font-weight="700" fill="${baseFill}">${bot}</text>
    </g>
  `;
}

function arrowDown(x, y1, y2) {
  const tipY = y2;
  const headY = y2 - 6;
  return `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${headY}" stroke="#94a3b8" stroke-width="1.5"/>
    <polygon points="${x - 5},${headY} ${x + 5},${headY} ${x},${tipY}" fill="#94a3b8"/>
  `;
}

function renderHrmSnpClassTable() {
  const rows = [
    { cls: 1, change: "C/T · G/A",  shift: t("hrm.snpclass.large"),     tag: "easy" },
    { cls: 2, change: "C/A · G/T",  shift: t("hrm.snpclass.moderate"),  tag: null },
    { cls: 3, change: "C/G",        shift: t("hrm.snpclass.small"),     tag: null },
    { cls: 4, change: "A/T",        shift: t("hrm.snpclass.verysmall"), tag: "hard" }
  ];
  const rowsHtml = rows.map(r => {
    let tagHtml = "";
    if (r.tag === "easy") tagHtml = ` <span class="hrm-snp-easy">← ${t("hrm.snpclass.easiest")}</span>`;
    if (r.tag === "hard") tagHtml = ` <span class="hrm-snp-hard">← ${t("hrm.snpclass.hardest")}</span>`;
    return `<tr><td>${r.cls}</td><td>${r.change}</td><td>${r.shift}${tagHtml}</td></tr>`;
  }).join("");

  return `
    <div class="hrm-snp-class-wrap">
      <h5 class="hrm-snp-class-title">${t("hrm.snpclass.title")}</h5>
      <table class="hrm-snp-class">
        <thead>
          <tr>
            <th>${t("hrm.snpclass.col.class")}</th>
            <th>${t("hrm.snpclass.col.change")}</th>
            <th>${t("hrm.snpclass.col.shift")}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p class="hrm-snp-class-note">${t("hrm.snpclass.note")}</p>
    </div>
  `;
}
