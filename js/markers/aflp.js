// AFLP marker page. Multi-step workflow (digest + ligate adapter +
// pre-amplification + selective amplification) → many bands per lane on a
// polyacrylamide-style gel. Polymorphic bands are highlighted in orange so
// students can spot the inter-sample differences quickly.

import { t, getLang, onLanguageChange, applyTranslations } from "../i18n.js";
import { renderGel } from "../components/gel.js";
import { renderQuiz } from "../components/quiz.js";

export async function render(root) {
  const [dataset, quiz] = await Promise.all([
    fetch("data/sequences/aflp_simulated.json").then(r => r.json()),
    fetch("data/quizzes/aflp.json").then(r => r.json())
  ]);

  root.innerHTML = `
    <article class="marker-page">
      <header>
        <h2 data-i18n="aflp.title"></h2>
        <p class="subtitle" data-i18n="aflp.subtitle"></p>
      </header>

      <section class="section">
        <h3><span class="step">1</span> <span data-i18n="section.principle"></span></h3>
        <p data-i18n="aflp.principle.p1"></p>
        <p data-i18n="aflp.principle.p2"></p>
        <p data-i18n="aflp.principle.p3"></p>
        <p data-i18n="aflp.principle.p4"></p>
        ${renderWorkflow()}

        <div class="aflp-interactive">
          <h4 class="aflp-int-title" data-i18n="aflp.int.title"></h4>
          <p class="aflp-int-help" data-i18n="aflp.int.help"></p>
          <div class="aflp-int-tabs" id="aflp-int-tabs"></div>
          <div class="aflp-int-panel" id="aflp-int-panel"></div>
        </div>
      </section>

      <section class="section">
        <h3><span class="step">2</span> <span data-i18n="section.simulation"></span></h3>
        <p data-i18n="aflp.sim.help"></p>
        <div class="aflp-legend">
          <span><span class="aflp-band-dot mono"></span> <span data-i18n="aflp.label.monomorphic"></span></span>
          <span><span class="aflp-band-dot poly"></span> <span data-i18n="aflp.label.polymorphic"></span></span>
        </div>
        <div id="gel-mount" style="margin-top:14px"></div>
        <div id="sample-info" class="aflp-info" style="margin-top:14px"></div>
      </section>

      <section class="section">
        <h3><span class="step">3</span> <span data-i18n="section.dataset"></span></h3>
        <p><strong data-i18n="aflp.dataset.title"></strong></p>
        <p data-i18n="aflp.dataset.note"></p>
      </section>

      <section class="section">
        <h3><span class="step">4</span> <span data-i18n="section.quiz"></span></h3>
        <div id="quiz-mount"></div>
      </section>
    </article>
  `;

  applyTranslations(root);

  // Interactive walkthrough state (1..4) — declared BEFORE first call to
  // renderInteractive() to avoid temporal-dead-zone access.
  let intStep = 1;

  renderInteractive();
  const unsub = onLanguageChange(() => { render2(); renderInteractive(); });

  function renderInteractive() {
    const lang = getLang();
    const tabsEl = root.querySelector("#aflp-int-tabs");
    tabsEl.innerHTML = [1, 2, 3, 4].map(n => `
      <button class="aflp-int-tab ${intStep === n ? 'active' : ''}" data-step="${n}">
        ${n}. ${t(`aflp.int.step${n}.title`).replace(/^ขั้นที่ \d+ — |^Step \d+ — /, '')}
      </button>
    `).join("");
    tabsEl.querySelectorAll(".aflp-int-tab").forEach(b => {
      b.addEventListener("click", () => {
        intStep = Number(b.dataset.step);
        renderInteractive();
      });
    });

    const panelEl = root.querySelector("#aflp-int-panel");
    panelEl.innerHTML = renderStepPanel(intStep, lang);
    const nextBtn = panelEl.querySelector(".aflp-int-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        intStep = intStep < 4 ? intStep + 1 : 1;
        renderInteractive();
      });
    }
  }

  function render2() {
    const lang = getLang();

    // Render the polyacrylamide-style gel with all bands
    const lanes = dataset.samples.map(s => ({
      label: s.id,
      fragments: s.bands,
      polymorphic: s.polymorphic
    }));
    renderGel(root.querySelector("#gel-mount"), lanes, {
      maxBp: 1200,
      minBp: 40,
      ladder: [1200, 1000, 800, 600, 400, 300, 200, 100, 50]
    });
    // Tint polymorphic bands orange
    lanes.forEach((lane, idx) => {
      const laneEl = root.querySelectorAll(".gel-lane")[idx + 1]; // +1 for ladder
      if (!laneEl) return;
      const bandEls = laneEl.querySelectorAll(".gel-band");
      lane.fragments.forEach((size, bi) => {
        if (lane.polymorphic.includes(size)) {
          bandEls[bi].style.background = "#f59e0b";
          bandEls[bi].style.boxShadow = "0 0 8px rgba(245,158,11,0.7)";
        }
      });
    });

    // Sample info
    root.querySelector("#sample-info").innerHTML = dataset.samples.map(s => `
      <div class="aflp-sample">
        <strong>${s.label[lang]}</strong>
        <span>${s.bands.length} ${lang === "th" ? "band ทั้งหมด" : "bands total"} ·
          <span style="color:#92400e">${s.polymorphic.length} polymorphic</span>:
          ${s.polymorphic.map(b => `${b} bp`).join(", ")}</span>
      </div>
    `).join("");
  }

  render2();
  renderQuiz(root.querySelector("#quiz-mount"), quiz);
  return () => unsub();
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive walkthrough — 4 steps with progressive SVG visualization
// ─────────────────────────────────────────────────────────────────────────────

// Fixed scenario shared across the 4 steps:
//   - Genomic DNA shown in viewBox 0..960
//   - Cut sites (mixed enzymes) at:
//        x=120 (M), 250 (E), 400 (M), 540 (M), 700 (E), 820 (M)
//   - Resulting fragments and their end types are pre-computed below.
// Cut sites chosen so the genome produces all THREE fragment types:
//   M–E (useful, the AFLP target) · M–M (most abundant) · E–E (rarest).
const CUT_SITES = [
  { x: 120, enzyme: "M" },
  { x: 250, enzyme: "E" },
  { x: 400, enzyme: "M" },
  { x: 540, enzyme: "M" },
  { x: 700, enzyme: "E" },
  { x: 820, enzyme: "E" }    // EcoRI here gives us an E–E fragment too
];

function buildFragments() {
  // Bookend with the genome edges
  const points = [{ x: 20, enzyme: "edge" }, ...CUT_SITES, { x: 940, enzyme: "edge" }];
  const frags = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const ends = `${a.enzyme}-${b.enzyme}`;
    let kind = "edge";
    if (!ends.includes("edge")) {
      if (ends === "M-M") kind = "MM";
      else if (ends === "E-E") kind = "EE";
      else kind = "useful";   // E-M or M-E
    }
    const useful = kind === "useful";
    frags.push({ x0: a.x, x1: b.x, leftEnd: a.enzyme, rightEnd: b.enzyme, ends, useful, kind });
  }
  return frags;
}

// Re-layout fragments into evenly-spaced slots so adapters and primers don't
// overlap in steps 2–4. Returns new {x0,x1} per fragment, keeping the
// original metadata (kind, ends, etc).
function packSlots(frags, totalW, opts = {}) {
  const { margin = 28, gap = 10, adapterW = 22 } = opts;
  const innerW = totalW - 2 * margin;
  const slotW = (innerW - (frags.length - 1) * gap) / frags.length;
  return frags.map((f, i) => {
    const slotStart = margin + i * (slotW + gap);
    return {
      ...f,
      x0: slotStart + adapterW,
      x1: slotStart + slotW - adapterW
    };
  });
}

function renderStepPanel(step, lang) {
  const title = t(`aflp.int.step${step}.title`);
  const desc = t(`aflp.int.step${step}.desc`);
  const note = t(`aflp.int.step${step}.note`);
  const nextLabel = step < 4 ? t("aflp.int.next") : t("aflp.int.reset");
  return `
    <h5 class="aflp-int-step-title">${title}</h5>
    <p class="aflp-int-step-desc">${desc}</p>
    ${renderStepSvg(step)}
    <p class="aflp-int-step-note">${note}</p>
    <div class="aflp-int-controls">
      <button class="aflp-int-next">${nextLabel}</button>
    </div>
  `;
}

const ENZ_COLOR = { E: "#f59e0b", M: "#3b82f6", edge: "#94a3b8" };
const ENZ_NAME  = { E: "EcoRI",   M: "MseI" };

function renderStepSvg(step) {
  const W = 960, H = 200;
  switch (step) {
    case 1: return svgStep1(W, H);
    case 2: return svgStep2(W, H);
    case 3: return svgStep3(W, H);
    case 4: return svgStep4(W, H);
  }
  return "";
}

// Step 1 — Genomic DNA + cut sites, then fragments after digest
function svgStep1(W, H) {
  const yTop = 50, yBot = 140;
  const frags = buildFragments();
  const TYPE_COLOR = { MM: "#dbeafe", EE: "#fed7aa", useful: "#dcfce7" };
  const TYPE_LABEL = { MM: "M–M", EE: "E–E", useful: "M–E" };

  // Top row: intact genomic DNA with cut markers
  const intactBackbone = `<line x1="20" y1="${yTop}" x2="940" y2="${yTop}" stroke="#475569" stroke-width="3"/>`;
  const cutTicks = CUT_SITES.map(s => `
    <line x1="${s.x}" y1="${yTop - 14}" x2="${s.x}" y2="${yTop + 14}" stroke="${ENZ_COLOR[s.enzyme]}" stroke-width="2.5"/>
    <text x="${s.x}" y="${yTop - 18}" text-anchor="middle" font-size="11" font-weight="700" fill="${ENZ_COLOR[s.enzyme]}">${ENZ_NAME[s.enzyme]}</text>
  `).join("");

  // Bottom row: fragments — color-coded by type
  const fragBars = frags.map(f => {
    const len = f.x1 - f.x0;
    const fill = f.kind === "edge" ? "rgba(148,163,184,0.18)" : TYPE_COLOR[f.kind];
    const stroke = f.kind === "edge" ? "#cbd5e1" : "#475569";
    const leftCap = f.leftEnd !== "edge"
      ? `<rect x="${f.x0 + 1}" y="${yBot - 8}" width="6" height="16" fill="${ENZ_COLOR[f.leftEnd]}"/>` : "";
    const rightCap = f.rightEnd !== "edge"
      ? `<rect x="${f.x1 - 7}" y="${yBot - 8}" width="6" height="16" fill="${ENZ_COLOR[f.rightEnd]}"/>` : "";
    const typeLabel = (f.kind !== "edge" && len > 60)
      ? `<text x="${(f.x0 + f.x1) / 2}" y="${yBot + 22}" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">${TYPE_LABEL[f.kind]}</text>`
      : "";
    return `
      <rect x="${f.x0}" y="${yBot - 6}" width="${len}" height="12" fill="${fill}" stroke="${stroke}" stroke-width="0.6" rx="1"/>
      ${leftCap}${rightCap}
      ${typeLabel}
    `;
  }).join("");

  // Legend — enzyme ends + fragment types
  const legend = `
    <g transform="translate(20, 188)">
      <rect x="0" y="-6" width="14" height="12" fill="#f59e0b"/>
      <text x="20" y="4" font-size="10" fill="#475569">EcoRI end</text>
      <rect x="100" y="-6" width="14" height="12" fill="#3b82f6"/>
      <text x="120" y="4" font-size="10" fill="#475569">MseI end</text>
      <rect x="200" y="-6" width="14" height="12" fill="${TYPE_COLOR.useful}" stroke="#475569" stroke-width="0.5"/>
      <text x="220" y="4" font-size="10" fill="#475569">M–E (useful for AFLP)</text>
      <rect x="370" y="-6" width="14" height="12" fill="${TYPE_COLOR.MM}" stroke="#475569" stroke-width="0.5"/>
      <text x="390" y="4" font-size="10" fill="#475569">M–M (abundant)</text>
      <rect x="500" y="-6" width="14" height="12" fill="${TYPE_COLOR.EE}" stroke="#475569" stroke-width="0.5"/>
      <text x="520" y="4" font-size="10" fill="#475569">E–E (rare)</text>
    </g>
  `;

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="aflp-int-svg" style="height:220px">
      <text x="20" y="20" font-size="12" fill="#475569" font-weight="600">Genomic DNA + cut sites:</text>
      ${intactBackbone}
      ${cutTicks}
      <text x="20" y="110" font-size="12" fill="#475569" font-weight="600">After digest → fragments (3 types):</text>
      ${fragBars}
      ${legend}
    </svg>
  `;
}

// Step 2 — All non-edge fragments (M–E, M–M, E–E), each with adapters ligated
function svgStep2(W, H) {
  const allFrags = buildFragments().filter(f => f.kind !== "edge");
  const frags = packSlots(allFrags, W);
  const TYPE_COLOR = { MM: "#dbeafe", EE: "#fed7aa", useful: "#dcfce7" };
  const TYPE_LABEL = { MM: "M–M", EE: "E–E", useful: "M–E" };
  const y = 80;

  const fragsHtml = frags.map(f => {
    const len = f.x1 - f.x0;
    return `
      <g>
        <!-- Left adapter -->
        <rect x="${f.x0 - 22}" y="${y - 12}" width="22" height="24" fill="${ENZ_COLOR[f.leftEnd]}" stroke="#0f172a" stroke-width="0.5" rx="2"/>
        <text x="${f.x0 - 11}" y="${y + 4}" text-anchor="middle" font-size="9" font-weight="700" fill="white">${ENZ_NAME[f.leftEnd][0]}-adp</text>
        <!-- Fragment body (colored by type) -->
        <rect x="${f.x0}" y="${y - 6}" width="${len}" height="12" fill="${TYPE_COLOR[f.kind]}" stroke="#475569" stroke-width="0.6"/>
        <text x="${(f.x0 + f.x1) / 2}" y="${y + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">${TYPE_LABEL[f.kind]} fragment</text>
        <!-- Right adapter -->
        <rect x="${f.x1}" y="${y - 12}" width="22" height="24" fill="${ENZ_COLOR[f.rightEnd]}" stroke="#0f172a" stroke-width="0.5" rx="2"/>
        <text x="${f.x1 + 11}" y="${y + 4}" text-anchor="middle" font-size="9" font-weight="700" fill="white">${ENZ_NAME[f.rightEnd][0]}-adp</text>
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="aflp-int-svg">
      <text x="20" y="20" font-size="12" fill="#475569" font-weight="600">After ligation — every fragment (all 3 types) carries adapter "name tags":</text>
      ${fragsHtml}
      <g transform="translate(20, 168)">
        <rect x="0" y="-6" width="14" height="12" fill="#f59e0b"/>
        <text x="20" y="4" font-size="11" fill="#475569">EcoRI adapter</text>
        <rect x="140" y="-6" width="14" height="12" fill="#3b82f6"/>
        <text x="160" y="4" font-size="11" fill="#475569">MseI adapter</text>
      </g>
    </svg>
  `;
}

// Step 3 — Pre-amplification: every fragment that has adapters at BOTH ends
// matching the primer combo (E-primer + M-primer) amplifies. M–M and E–E
// fragments only carry one primer type at both ends → no exponential
// amplification with the typical AFLP primer mix.
function svgStep3(W, H) {
  const allFrags = buildFragments().filter(f => f.kind !== "edge");
  const frags = packSlots(allFrags, W);
  const TYPE_COLOR = { MM: "#dbeafe", EE: "#fed7aa", useful: "#dcfce7" };
  const y = 80;

  const fragsHtml = frags.map(f => {
    const len = f.x1 - f.x0;
    const amplifies = f.useful;
    // Primer colors: E (orange) for EcoRI primer, M (blue) for MseI primer
    const leftPColor  = f.leftEnd  === "E" ? "#f59e0b" : "#3b82f6";
    const rightPColor = f.rightEnd === "E" ? "#f59e0b" : "#3b82f6";
    const opacity = amplifies ? 1 : 0.42;
    const stroke = amplifies ? "#475569" : "#94a3b8";

    return `
      <g opacity="${opacity}">
        <rect x="${f.x0 - 22}" y="${y - 10}" width="22" height="20" fill="${ENZ_COLOR[f.leftEnd]}" rx="2"/>
        <rect x="${f.x0}" y="${y - 5}" width="${len}" height="10" fill="${TYPE_COLOR[f.kind]}" stroke="${stroke}" stroke-width="0.5"/>
        <rect x="${f.x1}" y="${y - 10}" width="22" height="20" fill="${ENZ_COLOR[f.rightEnd]}" rx="2"/>
        <!-- Primers as colored arrows -->
        <polygon points="${f.x0 - 22},${y - 22} ${f.x0 - 6},${y - 22} ${f.x0},${y - 16} ${f.x0 - 6},${y - 10} ${f.x0 - 22},${y - 10}"
                 fill="${leftPColor}"/>
        <text x="${f.x0 - 14}" y="${y - 13}" text-anchor="middle" font-size="8" font-weight="700" fill="white">${f.leftEnd}-pr</text>
        <polygon points="${f.x1 + 22},${y - 22} ${f.x1 + 6},${y - 22} ${f.x1},${y - 16} ${f.x1 + 6},${y - 10} ${f.x1 + 22},${y - 10}"
                 fill="${rightPColor}"/>
        <text x="${f.x1 + 14}" y="${y - 13}" text-anchor="middle" font-size="8" font-weight="700" fill="white">${f.rightEnd}-pr</text>
        <!-- Status label -->
        ${amplifies
          ? `<text x="${(f.x0 + f.x1) / 2}" y="${y + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#16a34a">✓ amplifies (×10⁶)</text>`
          : `<text x="${(f.x0 + f.x1) / 2}" y="${y + 24}" text-anchor="middle" font-size="9" font-style="italic" fill="#94a3b8">✗ no exp. amplification</text>`}
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="aflp-int-svg">
      <text x="20" y="20" font-size="12" fill="#475569" font-weight="600">Pre-amp uses E-primer + M-primer (no selective bases yet) — only M–E fragments have both primer-binding sites:</text>
      ${fragsHtml}
      <g transform="translate(20, 178)">
        <polygon points="0,-4 12,-4 18,2 12,8 0,8" fill="#f59e0b"/>
        <text x="24" y="4" font-size="10" fill="#475569">EcoRI primer (+0)</text>
        <polygon points="160,-4 172,-4 178,2 172,8 160,8" fill="#3b82f6"/>
        <text x="184" y="4" font-size="10" fill="#475569">MseI primer (+0)</text>
      </g>
    </svg>
  `;
}

// Step 4 — Selective amplification: only those M–E fragments whose template
// bases match the +3 selective primer extension amplify. Shows the M–E
// fragments (carried over from step 3 — M–M and E–E already dropped out)
// with 1 of 3 matching the selective sequence, as a stand-in for the
// (1/4)³ = 1/64 reduction.
function svgStep4(W, H) {
  const usefulFrags = buildFragments().filter(f => f.useful);
  const frags = packSlots(usefulFrags, W, { margin: 60, gap: 30 });
  const TYPE_COLOR = "#dcfce7";
  const y = 90;

  const fragsHtml = frags.map((f, i) => {
    const selected = i === 1;
    const opacity = selected ? 1 : 0.32;
    const stroke  = selected ? "#f59e0b" : "#94a3b8";
    const strokeW = selected ? 2.5 : 0.5;
    const halo = selected
      ? `<rect x="${f.x0 - 32}" y="${y - 32}" width="${(f.x1 - f.x0) + 64}" height="62" fill="rgba(245,158,11,0.18)" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" rx="6"/>`
      : "";
    const len = f.x1 - f.x0;
    const leftPColor  = f.leftEnd  === "E" ? "#f59e0b" : "#3b82f6";
    const rightPColor = f.rightEnd === "E" ? "#f59e0b" : "#3b82f6";

    return `
      <g opacity="${opacity}">
        ${halo}
        <rect x="${f.x0 - 22}" y="${y - 10}" width="22" height="20" fill="${ENZ_COLOR[f.leftEnd]}" rx="2"/>
        <rect x="${f.x0}" y="${y - 5}" width="${len}" height="10" fill="${TYPE_COLOR}" stroke="${stroke}" stroke-width="${strokeW}"/>
        <rect x="${f.x1}" y="${y - 10}" width="22" height="20" fill="${ENZ_COLOR[f.rightEnd]}" rx="2"/>
        <!-- Selective primers (both ends) with +3 tag -->
        <polygon points="${f.x0 - 22},${y - 28} ${f.x0 - 6},${y - 28} ${f.x0},${y - 19} ${f.x0 - 6},${y - 10} ${f.x0 - 22},${y - 10}"
                 fill="${leftPColor}"/>
        <rect x="${f.x0 - 8}" y="${y - 38}" width="26" height="11" fill="#dc2626" rx="2"/>
        <text x="${f.x0 + 5}" y="${y - 29}" text-anchor="middle" font-size="8" font-weight="700" fill="white">+3 bp</text>

        <polygon points="${f.x1 + 22},${y - 28} ${f.x1 + 6},${y - 28} ${f.x1},${y - 19} ${f.x1 + 6},${y - 10} ${f.x1 + 22},${y - 10}"
                 fill="${rightPColor}"/>
        <rect x="${f.x1 - 18}" y="${y - 38}" width="26" height="11" fill="#dc2626" rx="2"/>
        <text x="${f.x1 - 5}" y="${y - 29}" text-anchor="middle" font-size="8" font-weight="700" fill="white">+3 bp</text>

        ${selected
          ? `<text x="${(f.x0 + f.x1) / 2}" y="${y + 26}" text-anchor="middle" font-size="11" fill="#92400e" font-weight="700">✓ +3 match → amplify</text>`
          : `<text x="${(f.x0 + f.x1) / 2}" y="${y + 26}" text-anchor="middle" font-size="10" fill="#94a3b8" font-style="italic">✗ no match → drop out</text>`}
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="aflp-int-svg">
      <text x="20" y="20" font-size="11" fill="#475569" font-weight="600">Selective primers add +3 bases at the 3' end · only M–E fragments whose templates match those 3 bases continue to amplify:</text>
      ${fragsHtml}
      <text x="${W / 2}" y="${y + 60}" text-anchor="middle" font-size="13" fill="#92400e" font-weight="700">Reduction per primer = (1/4)³ = 1/64 → ~50–100 bands per reaction</text>
    </svg>
  `;
}

// Small horizontal workflow showing the 4 AFLP steps
function renderWorkflow() {
  const steps = [
    { key: "aflp.step.digest",    icon: "✂️" },
    { key: "aflp.step.ligate",    icon: "🔗" },
    { key: "aflp.step.preamp",    icon: "🧬" },
    { key: "aflp.step.selective", icon: "🎯" },
    { key: "aflp.step.gel",       icon: "📊" }
  ];
  return `
    <div class="aflp-workflow">
      ${steps.map((s, i) => `
        <div class="aflp-step">
          <span class="aflp-step-icon">${s.icon}</span>
          <span class="aflp-step-label" data-i18n="${s.key}"></span>
        </div>
        ${i < steps.length - 1 ? '<span class="aflp-arrow">→</span>' : ''}
      `).join("")}
    </div>
  `;
}
