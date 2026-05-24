// Foundation page bootstrap + all interactive sections.
//
// Sections are rendered in order: overview, genome flowchart, locus & allele,
// SNP/InDel viewer, MSA + consensus, marker decision table, discovery timeline.
//
// Glossary tooltips are wired up once at the end so any element with
// data-glossary="<term>" gets a hover popup.

import { initI18n, t, getLang, onLanguageChange, applyTranslations } from "./i18n.js";

(async function init() {
  await initI18n();
  renderOverview();
  renderGenome();
  renderLocus();
  renderVariation();
  renderMarkersMap();
  renderMarkerTypes();
  renderTimeline();
  initGlossary();
  initTocScrollspy();
  onLanguageChange(() => {
    // Re-render dynamic sections so bilingual fields refresh
    renderOverview();
    renderGenome();
    renderLocus();
    renderVariation();
    renderMarkersMap();
    renderMarkerTypes();
    renderTimeline();
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Overview
// ─────────────────────────────────────────────────────────────────────────────
function renderOverview() {
  const mount = document.getElementById("overview-body");
  mount.innerHTML = `<div class="prose">${t("foundation.section1.body")}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Genome structure (interactive flowchart)
// ─────────────────────────────────────────────────────────────────────────────
const GENOME_BOXES = [
  {
    id: "nuclear", parent: null, group: "root",
    related: ["all"],
    detail: {
      th: "ดีเอ็นเอทั้งหมดในนิวเคลียสของเซลล์พืช — ครอบคลุมทั้งยีนและส่วนที่ไม่ใช่ยีน · เป็นแหล่งที่มาของ marker ส่วนใหญ่",
      en: "All DNA inside the plant cell nucleus — includes genes and non-coding regions. Source of nearly all DNA markers."
    }
  },
  {
    id: "genes", parent: "nuclear", group: "single",
    related: ["RFLP", "CAPs", "dCAPs", "Tetra-ARMS", "HRM", "KASP", "SCAR"],
    detail: {
      th: "ยีนและลำดับควบคุมการแสดงออก · มักเป็น single copy · SNP/InDel ในส่วนนี้ส่งผลโดยตรงต่อ phenotype · markers ที่ใช้ตรวจ SNP เช่น CAPs, dCAPs, Tetra-ARMS, HRM, KASP ทำงานในบริเวณนี้",
      en: "Genes and their regulatory sequences. Usually single-copy. SNPs/InDels here can change the phenotype directly. CAPs, dCAPs, Tetra-ARMS, HRM, KASP all target this region."
    }
  },
  {
    id: "repetitive", parent: "nuclear", group: "repetitive",
    related: ["SSR", "AFLP", "RAPD"],
    detail: {
      th: "ลำดับดีเอ็นเอที่ซ้ำกันเป็นจำนวนมาก — เป็นส่วนใหญ่ของจีโนมพืช · แบ่งเป็น 2 ชนิดใหญ่: Tandem (เรียงต่อกัน) และ Dispersed (กระจาย)",
      en: "Highly repeated DNA — dominates plant genome size. Split into two subtypes: Tandem (back-to-back) and Dispersed (scattered)."
    }
  },
  {
    id: "tandem", parent: "repetitive", group: "repetitive",
    related: [],
    detail: {
      th: "ลำดับซ้ำที่เรียงต่อกัน · ครอบคลุม centromere, telomere และ rDNA",
      en: "Repeats arranged back-to-back. Includes centromeres, telomeres, and rDNA arrays."
    }
  },
  {
    id: "dispersed", parent: "repetitive", group: "repetitive",
    related: ["SSR", "AFLP", "RAPD"],
    detail: {
      th: "ลำดับซ้ำที่กระจายอยู่ทั่วจีโนม · ครอบคลุม transposable elements และ <strong>SSR (microsatellites)</strong>",
      en: "Repeats scattered across the genome. Includes transposable elements and <strong>SSR (microsatellites)</strong>."
    }
  },
  {
    id: "centromere", parent: "tandem", group: "leaf",
    related: [],
    detail: {
      th: "ส่วนคล้ายโครโมโซมที่ใช้แบ่งเซลล์ · ประกอบด้วยลำดับซ้ำ ๆ ขนาดใหญ่",
      en: "Chromosomal structures required for cell division — built from large arrays of tandem repeats."
    }
  },
  {
    id: "rdna", parent: "tandem", group: "leaf",
    related: [],
    detail: {
      th: "ยีน rRNA (45S และ 5S) · จัดเรียงเป็น tandem array เพื่อให้ผลิต rRNA ได้เพียงพอ",
      en: "rRNA genes (45S and 5S) arranged as tandem arrays so ribosomal RNA can be produced at high volume."
    }
  },
  {
    id: "te", parent: "dispersed", group: "leaf",
    related: [],
    // Transposons are the basis of several real marker systems (SSAP, IRAP,
    // REMAP, RBIP, ISBP) — outside the scope of this introductory course.
    // Flag so the sidebar shows "not covered in this class" instead of the
    // misleading "no markers" message used for genuinely marker-less leaves.
    outOfScope: true,
    detail: {
      th: "Transposable elements (ยีนกระโดด) · เคลื่อนย้ายตำแหน่งได้ · เป็นแหล่งกำเนิดความหลากหลายในจีโนม",
      en: "Transposable elements (\"jumping genes\") that can change position — a major source of genomic variation."
    }
  },
  {
    id: "ssr", parent: "dispersed", group: "leaf",
    related: ["SSR"],
    detail: {
      th: "<strong>Simple Sequence Repeats / microsatellites</strong> · ลำดับซ้ำสั้น ๆ เช่น (CA)<sub>n</sub>, (GATA)<sub>n</sub> · จำนวนซ้ำต่างกันระหว่างตัวอย่าง → ใช้เป็น <strong>SSR marker</strong> ที่ codominant และนิยมมากในงาน breeding",
      en: "<strong>Simple Sequence Repeats / microsatellites</strong> — short tandem repeats like (CA)<sub>n</sub>, (GATA)<sub>n</sub>. The number of repeats varies between individuals → used as the highly popular codominant <strong>SSR marker</strong>."
    }
  },
  {
    id: "unclassified", parent: "nuclear", group: "leaf",
    related: [],
    detail: {
      th: "ลำดับที่ยังไม่ทราบหน้าที่",
      en: "Sequences whose function is not yet classified."
    }
  }
];

function renderGenome() {
  const mount = document.getElementById("genome-body");
  const lang = getLang();
  const boxesHtml = GENOME_BOXES.map(b => {
    const label = t(`foundation.section2.box.${b.id}`);
    return `<div class="genome-box genome-${b.group}" data-id="${b.id}" tabindex="0">${label}</div>`;
  }).join("");

  mount.innerHTML = `
    ${t("foundation.section2.intro")}
    <div class="genome-flow">
      <div class="genome-flowchart">
        <div class="genome-row root">${boxHtml("nuclear")}${boxHtml("unclassified")}</div>
        <div class="genome-row">${boxHtml("genes")}${boxHtml("repetitive")}</div>
        <div class="genome-row">${boxHtml("tandem")}${boxHtml("dispersed")}</div>
        <div class="genome-row leaves">
          ${boxHtml("centromere")}${boxHtml("rdna")}${boxHtml("te")}${boxHtml("ssr")}
        </div>
      </div>
      <aside class="genome-detail" id="genome-detail">
        <h4>${t("foundation.section2.detail.title")}</h4>
        <p class="placeholder">${t("foundation.section2.detail.placeholder")}</p>
      </aside>
    </div>
  `;

  mount.querySelectorAll(".genome-box").forEach(el => {
    el.addEventListener("click", () => selectGenomeBox(el.dataset.id, mount));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectGenomeBox(el.dataset.id, mount);
      }
    });
  });
}

function boxHtml(id) {
  const b = GENOME_BOXES.find(x => x.id === id);
  return `<div class="genome-box genome-${b.group}" data-id="${b.id}" tabindex="0">${t(`foundation.section2.box.${b.id}`)}</div>`;
}

function selectGenomeBox(id, mount) {
  const lang = getLang();
  const b = GENOME_BOXES.find(x => x.id === id);
  if (!b) return;

  mount.querySelectorAll(".genome-box").forEach(el => el.classList.toggle("active", el.dataset.id === id));

  const related = b.outOfScope
    ? `<p class="genome-related-empty">${lang === "th"
        ? "ไม่กล่าวถึงในคลาสนี้ — มี marker หลายชนิดที่พัฒนาจาก transposon (เช่น <strong>SSAP, IRAP, REMAP, RBIP, ISBP</strong>) แต่อยู่นอกขอบเขตของวิชานี้"
        : "Not covered in this class — many transposon-based markers exist (e.g., <strong>SSAP, IRAP, REMAP, RBIP, ISBP</strong>) but lie outside this course's scope."}</p>`
    : b.related.length === 0
    ? `<p class="genome-related-empty">${lang === "th" ? "ไม่มี marker เฉพาะที่ใช้บริเวณนี้โดยตรง" : "No markers directly target this region."}</p>`
    : (b.related[0] === "all"
        ? `<p>${lang === "th" ? "marker ทุกชนิดทำงานบนจีโนมนิวเคลียส" : "All markers operate on the nuclear genome."}</p>`
        : `<ul class="genome-related">${b.related.map(m => `<li><a href="index.html#${m.toLowerCase()}">${m}</a></li>`).join("")}</ul>`);

  const detail = document.getElementById("genome-detail");
  detail.innerHTML = `
    <h4>${t(`foundation.section2.box.${b.id}`)}</h4>
    <p>${b.detail[lang]}</p>
    <div class="genome-related-label">${lang === "th" ? "Marker ที่เกี่ยวข้อง:" : "Related markers:"}</div>
    ${related}
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Locus & Allele (interactive chromosome)
// ─────────────────────────────────────────────────────────────────────────────
const LOCI = [
  {
    id: "A",
    name: { th: "ยีนสีดอก", en: "Flower color gene" },
    posPct: 18,
    dominantSeq: "TACCAACGCAGT",
    recessiveSeq: "TACCAGCGCAGT", // SNP at index 5 (A→G)
    dominantLabel: { th: "A · ดอกแดง (dominant)",  en: "A · red flower (dominant)" },
    recessiveLabel: { th: "a · ดอกขาว (recessive)", en: "a · white flower (recessive)" }
  },
  {
    id: "B",
    name: { th: "ยีนความสูง",  en: "Plant height gene" },
    posPct: 38,
    dominantSeq: "GGCATTGAATTC",
    recessiveSeq: "GGCATTGACTTC", // SNP at index 9 (T→C)
    dominantLabel: { th: "B · ต้นสูง (dominant)",   en: "B · tall (dominant)" },
    recessiveLabel: { th: "b · ต้นเตี้ย (recessive)", en: "b · dwarf (recessive)" }
  },
  {
    id: "C",
    name: { th: "ยีนต้านทานโรค", en: "Disease resistance" },
    posPct: 62,
    dominantSeq: "ATGGCCTGCAGT",
    recessiveSeq: "ATGGCCTGTAGT", // SNP at index 8 (C→T)
    dominantLabel: { th: "R · ต้านทาน (dominant)",  en: "R · resistant (dominant)" },
    recessiveLabel: { th: "r · อ่อนแอ (recessive)",  en: "r · susceptible (recessive)" }
  },
  {
    id: "D",
    name: { th: "ยีนสีเมล็ด",   en: "Seed color gene" },
    posPct: 82,
    dominantSeq: "CTAAAGCATGCC",
    recessiveSeq: "CTAAAGCATCCC", // SNP at index 9 (G→C)
    dominantLabel: { th: "Y · เมล็ดเหลือง (dominant)",  en: "Y · yellow (dominant)" },
    recessiveLabel: { th: "y · เมล็ดเขียว (recessive)", en: "y · green (recessive)" }
  }
];

const locusGenotypes = {}; // { A: "Aa", B: "AA", ... }
LOCI.forEach(l => { locusGenotypes[l.id] = "Aa"; });
let selectedLocus = "A";

function renderLocus() {
  const mount = document.getElementById("locus-body");
  const lang = getLang();

  const locusMarkers = LOCI.map(l => {
    const gt = locusGenotypes[l.id];
    const [a1, a2] = alleleStates(gt);
    return `
      <g class="locus-marker ${selectedLocus === l.id ? 'selected' : ''}" data-id="${l.id}" tabindex="0">
        <rect class="locus-band chr1 ${a1}" x="-22" y="${l.posPct}%" width="22" height="14" rx="2"/>
        <rect class="locus-band chr2 ${a2}" x="0"  y="${l.posPct}%" width="22" height="14" rx="2"/>
        <text x="28" y="${l.posPct}%" dy="11" font-size="11" fill="#475569">${l.id}</text>
      </g>
    `;
  }).join("");

  mount.innerHTML = `
    ${t("foundation.section3.intro")}
    ${renderGenotypeFigure()}
    <h3 class="locus-subheading">${t("foundation.section3.tryItHeading")}</h3>
    <p class="locus-try-instruction">${t("foundation.section3.tryItInstruction")}</p>
    <div class="locus-lab">
      <div class="chromosome-pair">
        <svg viewBox="0 0 80 320" width="170" height="380" class="chromosome-svg" aria-label="Homologous chromosomes">
          <!-- Chromosome bodies -->
          <rect x="6"  y="10" width="20" height="300" rx="10" class="chromosome-body" />
          <rect x="34" y="10" width="20" height="300" rx="10" class="chromosome-body" />
          <!-- Centromeres -->
          <ellipse cx="16" cy="160" rx="14" ry="6" class="centromere"/>
          <ellipse cx="44" cy="160" rx="14" ry="6" class="centromere"/>
          <!-- Loci -->
          <g transform="translate(38, 0)">${locusMarkers}</g>
        </svg>
        <div class="chr-labels">
          <span>${lang === "th" ? "homologous chr ที่ 1" : "homologous chr 1"}</span>
          <span>${lang === "th" ? "homologous chr ที่ 2" : "homologous chr 2"}</span>
        </div>
      </div>

      <div class="locus-panel" id="locus-panel"></div>
    </div>
    <p class="callout" style="margin-top:18px">${t("foundation.section3.note")}</p>
  `;

  mount.querySelectorAll(".locus-marker").forEach(el => {
    el.addEventListener("click", () => {
      selectedLocus = el.dataset.id;
      renderLocus();
    });
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectedLocus = el.dataset.id;
        renderLocus();
      }
    });
  });

  renderLocusPanel();
}

// Static reference figure (recreates the lecture-note image): three chromosome
// pairs side by side showing AA / Aa / aa with their actual allele sequences.
function renderGenotypeFigure() {
  const lang = getLang();
  const ALLELE_A_TOP = "TACCAACGCAGT";
  const ALLELE_A_BOT = "ATGGTTGCGTCA";
  const ALLELE_a_TOP = "TACCAGCGCAGT";
  const ALLELE_a_BOT = "ATGGTCGCGTCA";
  const snpIdx = findDiffIndex(ALLELE_A_TOP, ALLELE_a_TOP); // index 5

  const pairs = [
    { gt: "AA", labels: ["A","A"], zygosity: "Homozygous",   zClass: "homo-dom" },
    { gt: "Aa", labels: ["A","a"], zygosity: "Heterozygous", zClass: "hetero" },
    { gt: "aa", labels: ["a","a"], zygosity: "Homozygous",   zClass: "homo-rec" }
  ];

  // Single chromosome-pair SVG with allele letters above and red bands at the locus
  const pairSvg = (labels) => {
    const colorL = labels[0] === "A" ? "#dc2626" : "#7f1d1d";
    const colorR = labels[1] === "A" ? "#dc2626" : "#7f1d1d";
    return `
      <svg viewBox="0 0 80 240" width="100" height="240" class="genotype-fig-chr"
           aria-label="Chromosome pair ${labels.join('')}">
        <!-- Allele letters -->
        <text x="16" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">${labels[0]}</text>
        <text x="44" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">${labels[1]}</text>
        <!-- Chromosomes -->
        <rect x="6"  y="32" width="20" height="200" rx="10" class="chromosome-body"/>
        <rect x="34" y="32" width="20" height="200" rx="10" class="chromosome-body"/>
        <!-- Locus bands (top region) -->
        <rect x="4"  y="50" width="24" height="14" rx="2" fill="${colorL}" stroke="#7f1d1d" stroke-width="0.6"/>
        <rect x="32" y="50" width="24" height="14" rx="2" fill="${colorR}" stroke="#7f1d1d" stroke-width="0.6"/>
        <!-- Centromeres -->
        <ellipse cx="16" cy="130" rx="14" ry="6" class="centromere"/>
        <ellipse cx="44" cy="130" rx="14" ry="6" class="centromere"/>
      </svg>
    `;
  };

  const pairsHtml = pairs.map(p => `
    <div class="genotype-fig-pair">
      ${pairSvg(p.labels)}
      <div class="genotype-fig-label">
        <strong class="genotype-fig-gt">${p.gt}</strong>
        <span class="zygosity-tag zygosity-${p.zClass}">${p.zygosity}</span>
      </div>
    </div>
  `).join("");

  return `
    <figure class="genotype-figure">
      <h4 class="genotype-fig-heading">${t("foundation.section3.figureHeading")}</h4>
      <div class="genotype-fig-pairs">${pairsHtml}</div>

      <div class="genotype-fig-sequences">
        <div class="allele-seq-block">
          <div class="allele-seq-label">${t("foundation.section3.figureAlleleA")}</div>
          ${renderDNAHelix(ALLELE_A_TOP, ALLELE_A_BOT, snpIdx)}
        </div>
        <div class="allele-seq-block">
          <div class="allele-seq-label">${t("foundation.section3.figureAllelea")}</div>
          ${renderDNAHelix(ALLELE_a_TOP, ALLELE_a_BOT, snpIdx)}
        </div>
      </div>

      <figcaption class="genotype-fig-caption">${t("foundation.section3.figureCaption")}</figcaption>
    </figure>
  `;
}

// Sanger-style base colors (A green, C blue, G dark, T red).
const HELIX_BASE_COLORS = {
  A: "#16a34a",
  C: "#2563eb",
  G: "#1e293b",
  T: "#dc2626"
};

// Stylized 2D DNA double-helix SVG for a single allele.
// Backbones are drawn as two crossing cosine curves (gives the "twisting"
// look); base letters sit at fixed top/bottom rows so the sequence is
// readable left-to-right. The SNP column is highlighted across both strands.
function renderDNAHelix(senseSeq, antisenseSeq, snpIdx) {
  const bp = senseSeq.length;
  const width = 300;
  const totalHeight = 110;
  const margin = 16;
  const usableW = width - 2 * margin;
  const bpSpacing = usableW / bp;
  const helixPeriod = bpSpacing * 5;  // ~5 bp per turn

  // Backbone band — sits between the top and bottom base rows
  const yTopBand = 30;
  const yBotBand = 80;
  const yCenter = (yTopBand + yBotBand) / 2;
  const amplitude = (yBotBand - yTopBand) / 2 - 2;

  const labelTopY = 14;
  const labelBotY = 100;

  // Trace both backbones as cos waves of opposite phase
  let topPath = "";
  let botPath = "";
  for (let xRel = 0; xRel <= usableW; xRel += 2) {
    const x = margin + xRel;
    const angle = (xRel / helixPeriod) * 2 * Math.PI;
    const yT = yCenter - amplitude * Math.cos(angle);
    const yB = yCenter + amplitude * Math.cos(angle);
    if (xRel === 0) {
      topPath = `M ${x.toFixed(1)} ${yT.toFixed(1)}`;
      botPath = `M ${x.toFixed(1)} ${yB.toFixed(1)}`;
    } else {
      topPath += ` L ${x.toFixed(1)} ${yT.toFixed(1)}`;
      botPath += ` L ${x.toFixed(1)} ${yB.toFixed(1)}`;
    }
  }

  // SNP highlight: vertical yellow band across the helix
  const snpHighlight = snpIdx >= 0
    ? `<rect x="${(margin + bpSpacing*snpIdx).toFixed(1)}" y="2" width="${bpSpacing.toFixed(1)}" height="${totalHeight - 4}" fill="#fde047" opacity="0.45" rx="2"/>`
    : "";

  // Base-pair "rungs" — thin lines connecting both backbones at each bp position
  let rungs = "";
  for (let i = 0; i < bp; i++) {
    const xRel = bpSpacing * (i + 0.5);
    const x = margin + xRel;
    const angle = (xRel / helixPeriod) * 2 * Math.PI;
    const yT = yCenter - amplitude * Math.cos(angle);
    const yB = yCenter + amplitude * Math.cos(angle);
    // Skip drawing a rung when strands cross (would be a zero-length line)
    if (Math.abs(yT - yB) > 2) {
      rungs += `<line x1="${x.toFixed(1)}" y1="${yT.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yB.toFixed(1)}" stroke="#fbbf24" stroke-width="2.5" opacity="0.55"/>`;
    }
  }

  // Letter rows
  const topLetters = senseSeq.split("").map((b, i) => {
    const x = margin + bpSpacing * (i + 0.5);
    return `<text x="${x.toFixed(1)}" y="${labelTopY}" text-anchor="middle" font-size="12" font-weight="700" font-family="monospace" fill="${HELIX_BASE_COLORS[b]}">${b}</text>`;
  }).join("");
  const botLetters = antisenseSeq.split("").map((b, i) => {
    const x = margin + bpSpacing * (i + 0.5);
    return `<text x="${x.toFixed(1)}" y="${labelBotY}" text-anchor="middle" font-size="12" font-weight="700" font-family="monospace" fill="${HELIX_BASE_COLORS[b]}">${b}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${totalHeight}" width="100%" preserveAspectRatio="xMidYMid meet"
         style="max-width:${width}px" class="dna-helix-svg" aria-label="DNA double helix">
      ${snpHighlight}
      ${rungs}
      <path d="${topPath}" stroke="#60a5fa" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>
      <path d="${botPath}" stroke="#60a5fa" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>
      ${topLetters}
      ${botLetters}
      <text x="3" y="${labelTopY}" font-size="9" font-family="monospace" fill="#64748b">5'</text>
      <text x="${width - 3}" y="${labelTopY}" text-anchor="end" font-size="9" font-family="monospace" fill="#64748b">3'</text>
      <text x="3" y="${labelBotY}" font-size="9" font-family="monospace" fill="#64748b">3'</text>
      <text x="${width - 3}" y="${labelBotY}" text-anchor="end" font-size="9" font-family="monospace" fill="#64748b">5'</text>
    </svg>
  `;
}

function alleleStates(gt) {
  // "AA" → ["dominant", "dominant"], "Aa" → ["dominant","recessive"], "aa" → ["recessive","recessive"]
  return [gt[0] === gt[0].toUpperCase() ? "dominant" : "recessive",
          gt[1] === gt[1].toUpperCase() ? "dominant" : "recessive"];
}

function renderLocusPanel() {
  const lang = getLang();
  const locus = LOCI.find(l => l.id === selectedLocus);
  if (!locus) return;
  const gt = locusGenotypes[locus.id];
  const [a1State, a2State] = alleleStates(gt);

  const Upper = locus.id;
  const lower = locus.id.toLowerCase();
  const buttons = [Upper + Upper, Upper + lower, lower + lower].map(g => `
    <button class="genotype-btn ${gt === g ? 'active' : ''}" data-gt="${g}">
      ${g} <small>(${zygosityLabel(g, lang)})</small>
    </button>
  `).join("");

  const a1Seq = a1State === "dominant" ? locus.dominantSeq : locus.recessiveSeq;
  const a2Seq = a2State === "dominant" ? locus.dominantSeq : locus.recessiveSeq;
  const snpIdx = findDiffIndex(locus.dominantSeq, locus.recessiveSeq);
  const a1Label = a1State === "dominant" ? locus.dominantLabel[lang] : locus.recessiveLabel[lang];
  const a2Label = a2State === "dominant" ? locus.dominantLabel[lang] : locus.recessiveLabel[lang];

  const panel = document.getElementById("locus-panel");
  panel.innerHTML = `
    <h3 class="locus-panel-name">
      Locus ${locus.id} — <small>${locus.name[lang]}</small>
    </h3>
    <div class="genotype-current">
      ${lang === "th" ? "Genotype ปัจจุบัน:" : "Current genotype:"}
      <strong>${gt}</strong>
      <span class="zygosity-tag zygosity-${zygosityClass(gt)}">${zygosityLabel(gt, lang)}</span>
    </div>

    <div class="genotype-controls">
      <span class="genotype-controls-label">${t("foundation.section3.controls.title")}</span>
      <div class="genotype-buttons">${buttons}</div>
    </div>

    <div class="allele-rows">
      <div class="allele-row-foundation allele-${a1State === 'dominant' ? 'A' : 'a'}">
        <div class="allele-row-label">
          <span class="chr-tag">${lang === "th" ? "homologous chromosome ที่ 1" : "homologous chromosome 1"}</span>
          <span>${a1Label}</span>
        </div>
        <div class="seq-display">
          5'-${seqWithHighlight(a1Seq, snpIdx)}-3'
        </div>
      </div>
      <div class="allele-row-foundation allele-${a2State === 'dominant' ? 'A' : 'a'}">
        <div class="allele-row-label">
          <span class="chr-tag">${lang === "th" ? "homologous chromosome ที่ 2" : "homologous chromosome 2"}</span>
          <span>${a2Label}</span>
        </div>
        <div class="seq-display">
          5'-${seqWithHighlight(a2Seq, snpIdx)}-3'
        </div>
      </div>
    </div>
  `;

  panel.querySelectorAll(".genotype-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      locusGenotypes[locus.id] = btn.dataset.gt;
      renderLocus(); // re-render so chromosome bands + panel both update
    });
  });
}

function zygosityClass(gt) {
  if (gt[0] === gt[1]) return gt[0] === gt[0].toUpperCase() ? "homo-dom" : "homo-rec";
  return "hetero";
}
function zygosityLabel(gt, lang) {
  if (gt[0] === gt[1] && gt[0] === gt[0].toUpperCase())
    return lang === "th" ? "Homozygous dominant" : "Homozygous dominant";
  if (gt[0] === gt[1])
    return lang === "th" ? "Homozygous recessive" : "Homozygous recessive";
  return "Heterozygous";
}
function findDiffIndex(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
}
function seqWithHighlight(seq, idx) {
  if (idx < 0) return seq;
  return seq.slice(0, idx) + `<span class="snp">${seq[idx]}</span>` + seq.slice(idx + 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — SNP vs InDel viewer
// ─────────────────────────────────────────────────────────────────────────────
let variationTab = "snp";

function renderVariation() {
  const mount = document.getElementById("variation-body");
  const lang = getLang();

  const tabs = [
    { id: "snp", label: t("foundation.section4.tab.snp") },
    { id: "del", label: t("foundation.section4.tab.del") },
    { id: "ins", label: t("foundation.section4.tab.ins") },
    { id: "ssr", label: t("foundation.section4.tab.ssr") }
  ];

  mount.innerHTML = `
    ${t("foundation.section4.intro")}

    <div class="variation-overview">
      <div class="variation-card">
        <h4>${t("foundation.section4.snpTitle")}</h4>
        <p>${t("foundation.section4.snpDesc")}</p>
      </div>
      <div class="variation-card">
        <h4>${t("foundation.section4.indelTitle")}</h4>
        <p>${t("foundation.section4.indelDesc")}</p>
      </div>
      <div class="variation-card">
        <h4>${t("foundation.section4.ssrOverviewTitle")}</h4>
        <p>${t("foundation.section4.ssrOverviewDesc")}</p>
      </div>
    </div>

    <div class="variation-tabs">
      ${tabs.map(t2 => `
        <button class="var-tab ${variationTab === t2.id ? 'active' : ''}" data-tab="${t2.id}">${t2.label}</button>
      `).join("")}
    </div>
    <div id="variation-view" class="variation-view"></div>

    <p class="callout-warning" style="margin-top:14px">${t("foundation.section4.frameshift")}</p>
  `;

  mount.querySelectorAll(".var-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      variationTab = btn.dataset.tab;
      renderVariation();
    });
  });

  renderVariationView();
}

function renderVariationView() {
  const view = document.getElementById("variation-view");
  const lang = getLang();
  const lblT = t("foundation.section4.label.template");
  const lblV = t("foundation.section4.label.variant");

  let template, variant, diffNote;
  if (variationTab === "snp") {
    template = "ATGCATGA";
    variant  = "ATGCTTGA"; // pos 4: A→T
    diffNote = lang === "th" ? "SNP: เบสตำแหน่งที่ 5 เปลี่ยนจาก A → T (1 base change)"
                             : "SNP: position 5 changes A → T (single base change).";
    view.innerHTML = renderAlignedPair(template, variant, lblT, lblV, diffNote);
  } else if (variationTab === "del") {
    template = "CGAATCGTT";
    variant  = "CGAA__GTT"; // _ = gap, TC deleted
    diffNote = lang === "th" ? "Deletion: เบส TC ที่ตำแหน่ง 5–6 ถูกลบไป (−2 bases)"
                             : "Deletion: TC at positions 5–6 removed (−2 bases).";
    view.innerHTML = renderAlignedPair(template, variant, lblT, lblV, diffNote, true);
  } else if (variationTab === "ins") {
    template = "CGAA_TCGTT"; // gap in template at pos 4
    variant  = "CGAAGTCGTT";
    diffNote = lang === "th" ? "Insertion: เบส G ถูกแทรกที่ตำแหน่ง 5 (+1 base)"
                             : "Insertion: G inserted at position 5 (+1 base).";
    view.innerHTML = renderAlignedPair(template, variant, lblT, lblV, diffNote, true);
  } else {
    view.innerHTML = renderSSRPair();
  }
}

// SSR copy-number variation viewer: two alleles share the same flanking
// sequences but differ in the number of (CA) repeats in the middle.
function renderSSRPair() {
  const flank5 = "GTAA";
  const flank3 = "CGTTAA";
  const motif = "CA";
  const n1 = 5;
  const n2 = 8;
  const repeatPad = motif.length * n2;        // align to longer allele
  const block1 = motif.repeat(n1).padEnd(repeatPad, "·");
  const block2 = motif.repeat(n2);
  const seq1 = flank5 + block1 + flank3;
  const seq2 = flank5 + block2 + flank3;
  const size1 = flank5.length + n1 * motif.length + flank3.length;
  const size2 = flank5.length + n2 * motif.length + flank3.length;

  const cells = seq => seq.split("").map(b => {
    if (b === "·") return `<span class="base gap">·</span>`;
    // Mark CA repeat positions in the central block (between flanks)
    return `<span class="base">${b}</span>`;
  }).join("");

  // Tint the repeat region differently for visual clarity
  const tintedCells = (seq, repeatStart, repeatEnd) => seq.split("").map((b, i) => {
    if (b === "·") return `<span class="base gap">·</span>`;
    const inRepeat = i >= repeatStart && i < repeatEnd;
    return `<span class="base ${inRepeat ? "ssr-repeat-base" : "ssr-flank-base"}">${b}</span>`;
  }).join("");

  return `
    <div class="ssr-pair">
      <h4 class="ssr-pair-title">${t("foundation.section4.ssr.title")}</h4>
      <p>${t("foundation.section4.ssr.desc")}</p>

      <div class="ssr-legend">
        <span><span class="dot ssr-flank-dot"></span> ${t("foundation.section4.ssr.flank")}</span>
        <span><span class="dot ssr-repeat-dot"></span> ${t("foundation.section4.ssr.repeat")}</span>
      </div>

      <div class="align-pair" style="margin-top:10px">
        <div class="align-row">
          <span class="align-label">${t("foundation.section4.ssr.allele1")}:</span>
          <div class="seq-grid">${tintedCells(seq1, flank5.length, flank5.length + n2 * motif.length)}</div>
          <span class="ssr-size">${size1} bp</span>
        </div>
        <div class="align-row">
          <span class="align-label">${t("foundation.section4.ssr.allele2")}:</span>
          <div class="seq-grid">${tintedCells(seq2, flank5.length, flank5.length + n2 * motif.length)}</div>
          <span class="ssr-size">${size2} bp</span>
        </div>
      </div>

      <p class="align-note">${t("foundation.section4.ssr.note")}</p>
    </div>
  `;
}

function renderAlignedPair(top, bot, topLabel, botLabel, note, hasGaps = false) {
  const len = Math.max(top.length, bot.length);
  let topCells = "", botCells = "";
  for (let i = 0; i < len; i++) {
    const a = top[i] || "_";
    const b = bot[i] || "_";
    const diff = a !== b;
    const aClass = a === "_" ? "base gap" : (diff ? "base diff" : "base");
    const bClass = b === "_" ? "base gap" : (diff ? "base diff" : "base");
    topCells += `<span class="${aClass}">${a === "_" ? "—" : a}</span>`;
    botCells += `<span class="${bClass}">${b === "_" ? "—" : b}</span>`;
  }
  return `
    <div class="align-pair">
      <div class="align-row">
        <span class="align-label">${topLabel}:</span>
        <div class="seq-grid">${topCells}</div>
      </div>
      <div class="align-row">
        <span class="align-label">${botLabel}:</span>
        <div class="seq-grid">${botCells}</div>
      </div>
      <p class="align-note">${note}</p>
    </div>
  `;
}

// (Section 5 — Reading chromatograms — removed; will be covered in a separate lecture.)

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Variation → Marker (interactive table)
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkersMap() {
  const mount = document.getElementById("markers-map-body");
  const rows = [
    {
      key: "snp",
      markers: ["RFLP", "CAPs", "dCAPs", "Tetra-ARMS", "HRM", "KASP", "RAPD", "AFLP"]
    },
    { key: "indel", markers: ["SSR", "SCAR"] },
    { key: "both", markers: ["NGS"] }
  ];

  const rowsHtml = rows.map(r => {
    const markerLinks = r.markers.map(m => {
      const href = m === "NGS" ? "#" : `index.html#${m.toLowerCase().replace(/\s+/g, "-")}`;
      const klass = m === "NGS" ? "marker-pill disabled" : "marker-pill";
      return `<a class="${klass}" href="${href}">${m}</a>`;
    }).join("");
    return `
      <tr>
        <td><strong>${t(`foundation.section6.row.${r.key}.var`)}</strong></td>
        <td>${markerLinks}</td>
        <td>${t(`foundation.section6.row.${r.key}.principle`)}</td>
      </tr>
    `;
  }).join("");

  mount.innerHTML = `
    ${t("foundation.section6.intro")}
    <table class="marker-map-table">
      <thead>
        <tr>
          <th>${t("foundation.section6.col.variation")}</th>
          <th>${t("foundation.section6.col.markers")}</th>
          <th>${t("foundation.section6.col.principle")}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6.5 — Marker classification (inheritance × technology)
// ─────────────────────────────────────────────────────────────────────────────
// Two-axis classification: inheritance pattern (dominant / codominant) ×
// detection technology (hybridization-based / PCR-based). All 11 markers in
// the app are placed into a 2×2 matrix at the bottom so students can see at
// a glance where each marker sits. The dominant-vs-codominant story is also
// illustrated with side-by-side gel cartoons (1-band-or-none vs 1-2-3 bands)
// because that is the easiest way for students to "see" why codominant
// markers carry strictly more information.
const MARKER_MATRIX = [
  // [rowKey, colKey, marker, hrefSlug, comingSoon?]
  ["hybrid", "codom", "RFLP",       "rflp"],
  ["pcr",    "dom",   "RAPD",       "rapd"],
  ["pcr",    "dom",   "AFLP",       "aflp"],
  ["pcr",    "codom", "CAPs",       "caps"],
  ["pcr",    "codom", "dCAPs",      "dcaps"],
  ["pcr",    "codom", "Tetra-ARMS", "tetra-arms"],
  ["pcr",    "codom", "SCAR",       "scar"],
  ["pcr",    "codom", "SSR",        "ssr"],
  ["pcr",    "codom", "HRM",        "hrm"],
  ["pcr",    "codom", "KASP",       "kasp"],
  ["pcr",    "codom", "MassArray",  "massarray"],
  // Sequencing is a 3rd technology paradigm — reads bases directly, neither
  // hybridization nor PCR-detection. Always codominant (you see every base
  // on both chromosomes). Stub for now → "coming soon" badge on its chip.
  ["seq",    "codom", "Sequencing", "sequencing", true]
];

function renderMarkerTypes() {
  const mount = document.getElementById("marker-types-body");
  if (!mount) return;
  const lang = getLang();

  // Mini gel cartoons for the inheritance comparison
  const domGelSvg = renderInheritanceGel("dominant");
  const codomGelSvg = renderInheritanceGel("codominant");

  // Build the 3×2 matrix — group markers by [row][col]
  const cellMarkers = {
    hybrid: { dom: [], codom: [] },
    pcr:    { dom: [], codom: [] },
    seq:    { dom: [], codom: [] }
  };
  for (const [row, col, name, slug, comingSoon] of MARKER_MATRIX) {
    cellMarkers[row][col].push({ name, slug, comingSoon: !!comingSoon });
  }
  const cell = (row, col) => {
    const items = cellMarkers[row][col];
    if (items.length === 0) {
      return `<span class="mt-cell-empty">—</span>`;
    }
    return items
      .map(m => {
        const cs = m.comingSoon ? " mt-pill-cs" : "";
        const tag = m.comingSoon ? " ⏳" : "";
        return `<a class="mt-pill${cs}" href="index.html#${m.slug}">${m.name}${tag}</a>`;
      })
      .join("");
  };

  mount.innerHTML = `
    <p class="prose">${t("foundation.markerTypes.intro")}</p>

    <!-- Axis 1: Dominant vs Codominant -->
    <h3 class="mt-axis-title">${t("foundation.markerTypes.axis1.title")}</h3>
    <div class="mt-axis-grid">
      <article class="mt-card mt-card-dom">
        <header>
          <span class="mt-badge mt-badge-dom">${t("foundation.markerTypes.dom.tag")}</span>
          <h4>${t("foundation.markerTypes.dom.heading")}</h4>
        </header>
        <div class="mt-gel">${domGelSvg}</div>
        <p>${t("foundation.markerTypes.dom.body")}</p>
        <p class="mt-card-example"><strong>${t("foundation.markerTypes.examples")}:</strong> RAPD, AFLP</p>
      </article>
      <article class="mt-card mt-card-codom">
        <header>
          <span class="mt-badge mt-badge-codom">${t("foundation.markerTypes.codom.tag")}</span>
          <h4>${t("foundation.markerTypes.codom.heading")}</h4>
        </header>
        <div class="mt-gel">${codomGelSvg}</div>
        <p>${t("foundation.markerTypes.codom.body")}</p>
        <p class="mt-card-example"><strong>${t("foundation.markerTypes.examples")}:</strong> RFLP, SSR, SCAR, CAPs, dCAPs, Tetra-ARMS, HRM, KASP, MassArray</p>
      </article>
    </div>

    <!-- Axis 2: Hybridization-based vs PCR-based -->
    <h3 class="mt-axis-title">${t("foundation.markerTypes.axis2.title")}</h3>
    <div class="mt-axis-grid">
      <article class="mt-card mt-card-hybrid">
        <header>
          <span class="mt-badge mt-badge-hybrid">${t("foundation.markerTypes.hybrid.tag")}</span>
          <h4>${t("foundation.markerTypes.hybrid.heading")}</h4>
        </header>
        <p>${t("foundation.markerTypes.hybrid.body")}</p>
        <ul class="mt-pros-cons">
          <li><strong>+</strong> ${t("foundation.markerTypes.hybrid.pro")}</li>
          <li><strong>−</strong> ${t("foundation.markerTypes.hybrid.con")}</li>
        </ul>
        <p class="mt-card-example"><strong>${t("foundation.markerTypes.examples")}:</strong> RFLP</p>
      </article>
      <article class="mt-card mt-card-pcr">
        <header>
          <span class="mt-badge mt-badge-pcr">${t("foundation.markerTypes.pcr.tag")}</span>
          <h4>${t("foundation.markerTypes.pcr.heading")}</h4>
        </header>
        <p>${t("foundation.markerTypes.pcr.body")}</p>
        <ul class="mt-pros-cons">
          <li><strong>+</strong> ${t("foundation.markerTypes.pcr.pro")}</li>
          <li><strong>−</strong> ${t("foundation.markerTypes.pcr.con")}</li>
        </ul>
        <p class="mt-card-example"><strong>${t("foundation.markerTypes.examples")}:</strong> ${lang === "th" ? "ทุกตัวที่เหลือ" : "everything else"}</p>
      </article>
    </div>

    <!-- 2×2 matrix bringing both axes together -->
    <h3 class="mt-axis-title">${t("foundation.markerTypes.matrix.title")}</h3>
    <p class="mt-matrix-intro">${t("foundation.markerTypes.matrix.intro")}</p>
    <div class="mt-matrix-wrap">
      <table class="mt-matrix">
        <thead>
          <tr>
            <th></th>
            <th class="mt-col-dom">${t("foundation.markerTypes.col.dom")}</th>
            <th class="mt-col-codom">${t("foundation.markerTypes.col.codom")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th class="mt-row-hybrid">${t("foundation.markerTypes.row.hybrid")}</th>
            <td>${cell("hybrid", "dom")}</td>
            <td>${cell("hybrid", "codom")}</td>
          </tr>
          <tr>
            <th class="mt-row-pcr">${t("foundation.markerTypes.row.pcr")}</th>
            <td>${cell("pcr", "dom")}</td>
            <td>${cell("pcr", "codom")}</td>
          </tr>
          <tr>
            <th class="mt-row-seq">${t("foundation.markerTypes.row.seq")}</th>
            <td>${cell("seq", "dom")}</td>
            <td>${cell("seq", "codom")}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Practical tips -->
    <div class="mt-tips">
      <h4>${t("foundation.markerTypes.tips.title")}</h4>
      <ul>
        <li>${t("foundation.markerTypes.tips.t1")}</li>
        <li>${t("foundation.markerTypes.tips.t2")}</li>
        <li>${t("foundation.markerTypes.tips.t3")}</li>
        <li>${t("foundation.markerTypes.tips.t4")}</li>
      </ul>
    </div>
  `;
}

// Tiny SVG gel cartoon: 3 lanes (AA, Aa, aa). Dominant version shows just a
// presence-or-absence band per lane; codominant version shows distinct band
// patterns so all three genotypes are distinguishable.
function renderInheritanceGel(mode) {
  const W = 280, H = 130;
  const lanePad = 18;
  const laneW = (W - lanePad * 2) / 3;
  const laneX = i => lanePad + laneW * i + laneW / 2;

  const wellY = 18;
  const bandHigh = 50;  // Tm/longer fragment → band higher up
  const bandLow  = 90;  // shorter fragment → migrates further

  const lanes = ["AA", "Aa", "aa"];
  const labelLang = getLang();
  const captionAx = labelLang === "th" ? "ขนาด" : "size";

  // Bands per lane per mode
  // dominant mode: A-allele → 1 band high; a-allele = nothing
  //   AA → 1 band (high), Aa → 1 band (high), aa → no band
  // codominant: A-allele → high band, a-allele → low band
  //   AA → high only, Aa → both, aa → low only
  const bandsFor = (lane, mode) => {
    if (mode === "dominant") {
      return lane === "aa" ? [] : [bandHigh];
    }
    // codominant
    if (lane === "AA") return [bandHigh];
    if (lane === "aa") return [bandLow];
    return [bandHigh, bandLow];
  };

  const lanesHtml = lanes.map((lane, i) => {
    const x = laneX(i);
    const wellRect = `<rect x="${x - laneW / 2 + 6}" y="${wellY}" width="${laneW - 12}" height="6" fill="#1f2937" rx="1"/>`;
    const bands = bandsFor(lane, mode);
    const bandRects = bands.map(by =>
      `<rect x="${x - laneW / 2 + 8}" y="${by}" width="${laneW - 16}" height="5" fill="#60a5fa" stroke="#1d4ed8" stroke-width="0.6" rx="1"/>`
    ).join("");
    return `
      <g>
        ${wellRect}
        ${bandRects}
        <text x="${x}" y="${H - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">${lane}</text>
      </g>
    `;
  }).join("");

  // Vertical "size" arrow on the left
  const sizeArrow = `
    <line x1="6" y1="${wellY + 6}" x2="6" y2="${H - 22}" stroke="#94a3b8" stroke-width="0.8"/>
    <polygon points="3,${H - 22} 9,${H - 22} 6,${H - 16}" fill="#94a3b8"/>
    <text x="14" y="${(wellY + H - 16) / 2}" font-size="9" fill="#64748b" transform="rotate(-90 14 ${(wellY + H - 16) / 2})">${captionAx} ↓</text>
  `;

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#0f172a" opacity="0.05" rx="4"/>
      ${sizeArrow}
      ${lanesHtml}
    </svg>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Discovery timeline
// ─────────────────────────────────────────────────────────────────────────────
// Discovery timeline. Each event carries one or more primary references with
// DOI/PMC links so students can read the original paper. Events split into
// two phases: molecular-biology foundations (1869–1977) and the DNA-marker
// era proper (1980 onward).
const TIMELINE_EVENTS = [
  {
    year: 1869,
    phase: "foundation",
    title: { th: "ค้นพบ \"nuclein\" (DNA)", en: "Discovery of \"nuclein\" (DNA)" },
    who:   "Friedrich Miescher",
    detail: {
      th: "แยกสารพันธุกรรมจากนิวเคลียสของเซลล์เม็ดเลือดขาวเป็นครั้งแรก ตั้งชื่อว่า nuclein — ภายหลังถูกระบุว่าคือ DNA",
      en: "Isolated genetic material from leukocyte nuclei for the first time and named it \"nuclein\" — later identified as DNA."
    },
    refs: [
      { citation: "Miescher F. (1871). Ueber die chemische Zusammensetzung der Eiterzellen. Hoppe-Seylers Med Chem Unters 4: 441–460." }
    ]
  },
  {
    year: 1944,
    phase: "foundation",
    title: { th: "DNA คือสารพันธุกรรม", en: "DNA is the hereditary material" },
    who:   "Avery, MacLeod & McCarty",
    detail: {
      th: "ทดลอง transformation ใน Streptococcus pneumoniae พิสูจน์ว่า DNA (ไม่ใช่โปรตีน) เป็นโมเลกุลที่ถ่ายทอดลักษณะจากเซลล์หนึ่งไปยังอีกเซลล์",
      en: "Their pneumococcal transformation experiment proved that DNA (not protein) is the molecule that transfers hereditary traits between cells."
    },
    refs: [
      { citation: "Avery OT, MacLeod CM, McCarty M. (1944). J Exp Med 79(2): 137–158.",
        url: "https://doi.org/10.1084/jem.79.2.137" }
    ]
  },
  {
    year: 1953,
    phase: "foundation",
    title: { th: "โครงสร้าง Double helix ของ DNA", en: "DNA double-helix structure" },
    who:   "Watson, Crick (Franklin & Wilkins)",
    detail: {
      th: "Watson & Crick เสนอแบบจำลองเกลียวคู่ของ DNA โดยอาศัยภาพ X-ray diffraction ของ Rosalind Franklin (\"Photo 51\") — Watson, Crick, Wilkins ได้ Nobel ปี 1962",
      en: "Watson & Crick proposed the double-helix model using Rosalind Franklin's X-ray diffraction data (\"Photo 51\"). Watson, Crick, and Wilkins shared the 1962 Nobel Prize."
    },
    refs: [
      { citation: "Watson JD, Crick FHC. (1953). Nature 171(4356): 737–738.",
        url: "https://doi.org/10.1038/171737a0" }
    ]
  },
  {
    year: 1970,
    phase: "foundation",
    title: { th: "เอนไซม์ตัดจำเพาะตัวแรก (HindII)", en: "First sequence-specific restriction enzyme" },
    who:   "Smith & Wilcox",
    detail: {
      th: "แยกเอนไซม์ HindII จาก <em>Haemophilus influenzae</em> — เป็นเอนไซม์ตัวแรกที่ตัด DNA ในลำดับเบสจำเพาะ → รากฐานของ RFLP, CAPs, dCAPs · Arber, Smith, Nathans ได้ Nobel ปี 1978",
      en: "Isolated HindII from <em>Haemophilus influenzae</em> — the first endonuclease shown to cut DNA at a specific sequence. Foundation for RFLP, CAPs, dCAPs. Arber, Smith, and Nathans shared the 1978 Nobel Prize."
    },
    refs: [
      { citation: "Smith HO, Wilcox KW. (1970). J Mol Biol 51(2): 379–391.",
        url: "https://doi.org/10.1016/0022-2836(70)90149-X" }
    ]
  },
  {
    year: 1977,
    phase: "foundation",
    title: { th: "Sanger sequencing (chain termination)", en: "Sanger sequencing" },
    who:   "Sanger, Nicklen & Coulson",
    detail: {
      th: "พัฒนาวิธีอ่านลำดับ DNA โดยใช้ dideoxynucleotide chain terminators — ทำให้รู้ลำดับเบสที่แท้จริงของยีนได้ · Sanger ได้ Nobel เคมีถึง 2 ครั้ง (1958, 1980) · เป็นฐานของการออกแบบ primer สำหรับ marker ทุกชนิด",
      en: "Developed dideoxynucleotide chain-termination sequencing — letting researchers read any gene's true base sequence. Sanger won the Chemistry Nobel twice (1958, 1980). Underpins primer design for every modern marker."
    },
    refs: [
      { citation: "Sanger F, Nicklen S, Coulson AR. (1977). PNAS 74(12): 5463–5467.",
        url: "https://doi.org/10.1073/pnas.74.12.5463" }
    ]
  },
  {
    year: 1980,
    phase: "marker",
    title: { th: "RFLP marker → แผนที่พันธุกรรมแรก", en: "RFLP → first human linkage map" },
    who:   "Botstein, White, Skolnick & Davis",
    detail: {
      th: "เสนอใช้ RFLP เป็น <strong>molecular marker</strong> เพื่อสร้างแผนที่พันธุกรรมในมนุษย์ — เป็นจุดกำเนิดของ \"DNA marker\" สำหรับงาน mapping และ MAS",
      en: "Proposed using RFLPs as <strong>molecular markers</strong> to build a human genetic linkage map — the birth of DNA markers for mapping and marker-assisted selection."
    },
    refs: [
      { citation: "Botstein D, White RL, Skolnick M, Davis RW. (1980). Am J Hum Genet 32(3): 314–331.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1686077/" }
    ]
  },
  {
    year: 1985,
    phase: "marker",
    title: { th: "PCR — Polymerase Chain Reaction", en: "PCR — Polymerase Chain Reaction" },
    who:   "Saiki et al. (Mullis)",
    detail: {
      th: "Mullis คิดค้น PCR ปี 1983 · บทความแรกของ Saiki et al. ปี 1985 ใช้ PCR + RFLP ตรวจ sickle-cell anemia — ขยาย DNA ได้นับล้านเท่าใน 2 ชั่วโมง · Mullis ได้ Nobel เคมีปี 1993 · เปิดยุค PCR-based markers ทั้งหมด (CAPs, dCAPs, ARMS, SSR, …)",
      en: "Mullis conceived PCR in 1983; Saiki et al. (1985) published the first application — PCR + RFLP diagnosis of sickle-cell anemia. Million-fold amplification in 2 hours. Mullis won the 1993 Chemistry Nobel. Opens the PCR-based marker era (CAPs, dCAPs, ARMS, SSR, …)."
    },
    refs: [
      { citation: "Saiki RK, Scharf S, Faloona F, et al. (1985). Science 230(4732): 1350–1354.",
        url: "https://doi.org/10.1126/science.2999980" },
      { citation: "Mullis KB, Faloona FA. (1987). Methods Enzymol 155: 335–350.",
        url: "https://doi.org/10.1016/0076-6879(87)55023-6" }
    ]
  },
  {
    year: 1989,
    phase: "marker",
    title: { th: "SSR / microsatellite marker", en: "SSR / microsatellite marker" },
    who:   "Litt & Luty · Weber & May",
    detail: {
      th: "พบว่าบริเวณลำดับซ้ำสั้น เช่น (CA)<sub>n</sub> มีจำนวนซ้ำต่างกันระหว่างตัวอย่าง — ตรวจได้ด้วย PCR โดยใช้ primer ที่ขนาบบริเวณซ้ำ · SSR กลายเป็น marker ที่นิยมสูงสุดในงาน breeding ของพืชและสัตว์ (codominant + multiallelic)",
      en: "Short tandem repeats such as (CA)<sub>n</sub> vary in copy number between individuals — detectable by PCR with primers flanking the repeat. SSRs became the most widely used marker in plant and animal breeding (codominant + multiallelic)."
    },
    refs: [
      { citation: "Litt M, Luty JA. (1989). Am J Hum Genet 44(3): 397–401.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1715430/" },
      { citation: "Weber JL, May PE. (1989). Am J Hum Genet 44(3): 388–396.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1715423/" }
    ]
  },
  {
    year: 1990,
    phase: "marker",
    title: { th: "RAPD — Random Amplified Polymorphic DNA", en: "RAPD marker" },
    who:   "Williams et al. · Welsh & McClelland",
    detail: {
      th: "ใช้ primer สั้น (~10 nt) แบบสุ่มเพียงตัวเดียวขยาย DNA จีโนม — ได้ band pattern ต่างกันระหว่างตัวอย่างโดยไม่ต้องรู้ลำดับเบสล่วงหน้า · เป็น dominant marker · ราคาถูกและทำง่าย — นิยมมากในช่วงต้นทศวรรษ 1990",
      en: "Used a single short (~10 nt) random primer to amplify genomic DNA — generating different band patterns without prior sequence information. A dominant marker, inexpensive and easy — very popular in the early 1990s."
    },
    refs: [
      { citation: "Williams JGK, Kubelik AR, Livak KJ, Rafalski JA, Tingey SV. (1990). Nucleic Acids Res 18(22): 6531–6535.",
        url: "https://doi.org/10.1093/nar/18.22.6531" },
      { citation: "Welsh J, McClelland M. (1990). Nucleic Acids Res 18(24): 7213–7218.",
        url: "https://doi.org/10.1093/nar/18.24.7213" }
    ]
  },
  {
    year: 1995,
    phase: "marker",
    title: { th: "AFLP — Amplified Fragment Length Polymorphism", en: "AFLP marker" },
    who:   "Vos et al.",
    detail: {
      th: "รวม restriction digest + adapter ligation + selective PCR — ได้ band หลายร้อยตำแหน่งต่อปฏิกิริยา · ทำซ้ำได้ดีกว่า RAPD และยังไม่ต้องรู้ลำดับเบสล่วงหน้า — นิยมในงาน fingerprinting และ phylogeny",
      en: "Combined restriction digest + adapter ligation + selective PCR — hundreds of loci per reaction. More reproducible than RAPD and still doesn't need prior sequence information — widely used in fingerprinting and phylogeny."
    },
    refs: [
      { citation: "Vos P, Hogers R, Bleeker M, et al. (1995). Nucleic Acids Res 23(21): 4407–4414.",
        url: "https://doi.org/10.1093/nar/23.21.4407" }
    ]
  },
  {
    year: 2003,
    phase: "marker",
    title: { th: "HRM — High Resolution Melting", en: "High-Resolution Melting" },
    who:   "Wittwer, Reed, Gundry, Vandersteen & Pryor",
    detail: {
      th: "ตรวจ SNP/InDel จากรูปร่าง melting curve ของ amplicon โดยใช้ saturating intercalating dye (เช่น LCGreen) — ปฏิกิริยาเดียวจบใน real-time PCR ไม่ต้องตัดด้วย enzyme ไม่ต้อง sequencing",
      en: "SNP/InDel detection from amplicon melting-curve shape using a saturating intercalating dye (e.g., LCGreen) — single-reaction in real-time PCR, no enzyme cut, no sequencing required."
    },
    refs: [
      { citation: "Wittwer CT, Reed GH, Gundry CN, Vandersteen JG, Pryor RJ. (2003). Clin Chem 49(6 Pt 1): 853–860.",
        url: "https://doi.org/10.1373/49.6.853" }
    ]
  },
  {
    year: 2005,
    phase: "marker",
    title: { th: "NGS รุ่นแรก (454 pyrosequencing)", en: "First-generation NGS (454)" },
    who:   "Margulies et al. (454 Life Sciences)",
    detail: {
      th: "454 Life Sciences เปิดตัวเครื่อง pyrosequencing แบบ parallel ใน picolitre reactors — อ่าน DNA นับแสน reads พร้อมกัน · เริ่มยุคของ whole-genome sequencing ราคาเข้าถึงได้ และ Genotyping-by-Sequencing (GBS)",
      en: "454 Life Sciences launched parallel pyrosequencing in picolitre reactors — hundreds of thousands of reads in parallel. Opened the era of affordable whole-genome sequencing and Genotyping-by-Sequencing (GBS)."
    },
    refs: [
      { citation: "Margulies M, Egholm M, Altman WE, et al. (2005). Nature 437(7057): 376–380.",
        url: "https://doi.org/10.1038/nature03959" }
    ]
  },
  {
    year: 2008,
    phase: "marker",
    title: { th: "KASP — high-throughput SNP", en: "KASP — Kompetitive Allele-Specific PCR" },
    who:   "KBioscience (now LGC Genomics)",
    detail: {
      th: "KBioscience พัฒนา KASP — fluorescent SNP genotyping ที่ใช้ allele-specific primers จับคู่กับ FRET cassette · ราคาต่อ data point ต่ำมาก — ปัจจุบันเป็น marker ที่นิยมในงาน MAS ของพืชและสัตว์เชิงพาณิชย์",
      en: "KBioscience released KASP — fluorescent SNP genotyping using allele-specific primers paired with a FRET cassette. Very low cost per data point — today's go-to marker for commercial plant and animal MAS programs."
    },
    refs: [
      { citation: "He C, Holme J, Anthony J. (2014). Methods Mol Biol 1145: 75–86. [review]",
        url: "https://doi.org/10.1007/978-1-4939-0446-4_7" },
      { citation: "Semagn K, Babu R, Hearne S, Olsen M. (2014). Mol Breed 33: 1–14. [review]",
        url: "https://doi.org/10.1007/s11032-013-9917-x" }
    ]
  }
];
let timelineSelected = null;

function renderTimeline() {
  const mount = document.getElementById("timeline-body");
  const lang = getLang();

  // Preserve horizontal scroll across re-renders (otherwise clicking an event
  // scrolls the track back to the left when innerHTML is rewritten).
  const prevTrack = mount.querySelector(".timeline-track");
  const savedScrollLeft = prevTrack ? prevTrack.scrollLeft : 0;

  const events = TIMELINE_EVENTS.map((e, i) => `
    <button class="timeline-event phase-${e.phase} ${timelineSelected === i ? 'selected' : ''}" data-idx="${i}">
      <span class="timeline-year">${e.year}</span>
      <span class="timeline-title">${e.title[lang]}</span>
      <span class="timeline-who">${e.who}</span>
    </button>
  `).join("");

  const detail = timelineSelected !== null
    ? (() => {
        const e = TIMELINE_EVENTS[timelineSelected];
        const refsHtml = (e.refs && e.refs.length)
          ? `<div class="timeline-refs">
              <h5>${lang === "th" ? "เอกสารอ้างอิง" : "References"}</h5>
              <ul>
                ${e.refs.map(r => r.url
                  ? `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeRefHtml(r.citation)}</a> <span class="ref-ext">↗</span></li>`
                  : `<li>${escapeRefHtml(r.citation)}</li>`
                ).join("")}
              </ul>
            </div>`
          : "";
        return `<div class="timeline-detail">
                  <h4><span class="timeline-detail-year">${e.year}</span> — ${e.title[lang]}</h4>
                  <p class="timeline-detail-who">${e.who}</p>
                  <p>${e.detail[lang]}</p>
                  ${refsHtml}
                </div>`;
      })()
    : `<p class="placeholder">${lang === "th" ? "คลิกจุดบนไทม์ไลน์เพื่ออ่านรายละเอียด" : "Click any milestone above to read more."}</p>`;

  const legendHtml = `
    <div class="timeline-legend">
      <span><span class="legend-dot phase-foundation"></span>${lang === "th" ? "พื้นฐาน molecular biology" : "Molecular biology foundations"}</span>
      <span><span class="legend-dot phase-marker"></span>${lang === "th" ? "ยุค DNA marker" : "DNA-marker era"}</span>
    </div>
  `;

  mount.innerHTML = `
    ${t("foundation.section7.intro")}
    ${legendHtml}
    <div class="timeline-track">${events}</div>
    ${detail}
  `;

  // Restore scroll position on the freshly-mounted track
  const newTrack = mount.querySelector(".timeline-track");
  if (newTrack) newTrack.scrollLeft = savedScrollLeft;

  mount.querySelectorAll(".timeline-event").forEach(btn => {
    btn.addEventListener("click", () => {
      timelineSelected = Number(btn.dataset.idx);
      renderTimeline();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Glossary tooltips
// ─────────────────────────────────────────────────────────────────────────────
const GLOSSARY = {
  locus: {
    th: "ตำแหน่งของยีนหรือลำดับ DNA เฉพาะบนโครโมโซม (เหมือนที่อยู่บนแผนที่)",
    en: "The position of a gene or specific DNA sequence on a chromosome — like its street address."
  },
  allele: {
    th: "รูปแบบที่ต่างกันของยีนที่อยู่ใน locus เดียวกัน เกิดจากการกลายพันธุ์",
    en: "A variant form of a gene at the same locus, arising from mutation."
  },
  snp: {
    th: "Single Nucleotide Polymorphism — การเปลี่ยนเบสเพียงตำแหน่งเดียว",
    en: "Single Nucleotide Polymorphism — a single base change."
  },
  indel: {
    th: "Insertion / Deletion — การแทรกหรือลบเบสตั้งแต่ 1 ตัวขึ้นไป",
    en: "Insertion or deletion of one or more bases."
  },
  homologous: {
    th: "Homologous chromosome — โครโมโซมคู่ที่มียีนเดียวกันในตำแหน่งเดียวกัน (มาจากพ่อ 1 ชุด แม่ 1 ชุด)",
    en: "Chromosomes carrying the same genes at the same loci, one inherited from each parent."
  },
  homozygous: { th: "ทั้งสอง allele บน homologous chromosome เหมือนกัน (AA หรือ aa)", en: "Both alleles at a locus are identical (AA or aa)." },
  heterozygous: { th: "สอง allele บน homologous chromosome แตกต่างกัน (Aa)", en: "The two alleles at a locus differ (Aa)." }
};

function initGlossary() {
  const tooltip = document.getElementById("glossary-tooltip");
  if (!tooltip) return;

  document.body.addEventListener("mouseover", e => {
    const target = e.target.closest("[data-glossary]");
    if (!target) return;
    const term = target.dataset.glossary.toLowerCase();
    const entry = GLOSSARY[term];
    if (!entry) return;
    tooltip.innerHTML = entry[getLang()] || entry.en;
    tooltip.setAttribute("aria-hidden", "false");
    positionTooltip(tooltip, target);
  });
  document.body.addEventListener("mouseout", e => {
    if (e.target.closest("[data-glossary]")) {
      tooltip.setAttribute("aria-hidden", "true");
    }
  });
}

// Escape `<` `>` `&` for inserting plain citation text into HTML. Keeps
// ampersands in author lists (e.g. "Watson & Crick") rendering correctly.
function escapeRefHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function positionTooltip(tooltip, el) {
  const rect = el.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOC scroll-spy (highlight current section in sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function initTocScrollspy() {
  const tocLinks = [...document.querySelectorAll("#foundation-toc a")];
  const sections = tocLinks.map(a => document.querySelector(a.getAttribute("href")));
  const setActive = idx => {
    tocLinks.forEach((l, i) => l.classList.toggle("active", i === idx));
  };
  const onScroll = () => {
    const y = window.scrollY + 140;
    let active = 0;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) active = i; });
    setActive(active);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
