// Reusable per-allele DNA strand schematic.
// Renders a horizontal "molecule" with:
//   - backbone line
//   - feature overlays (primers, probes, repeat regions, etc.)
//   - cut markers with the actual recognition motif text
//   - position axis (0 — N bp)
//   - result line (digest sizes, probe-binding info, etc.)
//
// Used by RFLP / CAPs / dCAPs / (future) SCAR / SSR markers.

import { getLang } from "../i18n.js";

/**
 * @param {object} cfg
 * @param {number}  cfg.length          DNA length in bp.
 * @param {"A"|"a"} cfg.alleleClass     CSS color class — "A" = blue, "a" = red.
 * @param {string}  cfg.tagLabel        HTML for the allele tag (top-left).
 * @param {Array}   [cfg.features]      [{start, end, label, title, bg, border, color}]
 * @param {Array}   [cfg.cuts]          [{position, motifHtml, kind, label}]
 *                                      kind: "invariant" | "variable-cut" | "no-cut"
 * @param {Array}   [cfg.arrows]        [{position, direction, side, present, label, color, title, star}]
 *                                      direction: "right" | "left"
 *                                      side:      "above" | "below"
 *                                      present:   true = bound, false = mutated/absent
 *                                      star:      true = draw red ★ at -2 (designed mismatch)
 * @param {string}  [cfg.resultText]    HTML for the result line (e.g. "2 cuts → 248 + 232 bp").
 * @param {string}  [cfg.resultExtra]   Optional extra HTML appended to the result row.
 * @param {number}  [cfg.widthPercent]  Strand width as percent of container (default 100).
 *                                      Use to visually convey length differences across alleles
 *                                      (e.g. SSR alleles with different repeat counts).
 */
export function renderStrand(cfg) {
  const {
    length,
    alleleClass = "A",
    tagLabel,
    features = [],
    cuts = [],
    arrows = [],
    resultText = "",
    resultExtra = "",
    widthPercent = 100
  } = cfg;

  const xpct = pos => (pos / length) * 100;

  const featuresHtml = features
    .map(f => {
      const left = xpct(f.start);
      const width = xpct(f.end) - left;
      const styles = [
        `left:${left}%`,
        `width:${width}%`,
        f.bg && `background:${f.bg}`,
        f.border && `border-color:${f.border}`,
        f.color && `color:${f.color}`
      ]
        .filter(Boolean)
        .join(";");
      const title = f.title || f.label;
      return `<div class="strand-feature" style="${styles}" title="${escapeAttr(title)}">${f.label}</div>`;
    })
    .join("");

  const cutsHtml = cuts
    .map(
      c => `
        <div class="cut-marker" data-type="${c.kind}" style="left:${xpct(c.position)}%">
          <div class="cut-seq${c.kind === "no-cut" ? " cut-seq-muted" : ""}">${c.motifHtml}</div>
          <div class="cut-tick"></div>
          <div class="cut-label">${c.label}</div>
        </div>
      `
    )
    .join("");

  // Directional primer arrows (RAPD / Tetra-ARMS). Drawn as small SVG (stem
  // + triangle head) so the direction is obvious. Optional red star (a.star)
  // marks a designed mismatch position — used to flag the −2 secondary
  // mismatch on Tetra-ARMS inner primers (Ye & Day, 2001).
  const arrowsHtml = arrows
    .map(a => {
      const xpos = xpct(a.position);
      const present = a.present !== false;
      const color = present ? (a.color || "#3b82f6") : "#94a3b8";
      const sideClass = a.side === "below" ? "below" : "above";
      const stateClass = present ? "present" : "absent";
      const star = a.star
        ? (a.direction === "right"
            ? `<text x="22" y="5" font-size="9" fill="#dc2626" font-weight="700" text-anchor="middle">★</text>`
            : `<text x="12" y="5" font-size="9" fill="#dc2626" font-weight="700" text-anchor="middle">★</text>`)
        : "";
      const arrowSvg = a.direction === "right"
        ? `<svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
             <line x1="2" y1="9" x2="24" y2="9" stroke="${color}" stroke-width="2.6"/>
             <polygon points="24,4.5 32,9 24,13.5" fill="${color}"/>
             ${star}
           </svg>`
        : `<svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
             <line x1="10" y1="9" x2="32" y2="9" stroke="${color}" stroke-width="2.6"/>
             <polygon points="10,4.5 2,9 10,13.5" fill="${color}"/>
             ${star}
           </svg>`;
      return `
        <div class="strand-arrow ${sideClass} ${stateClass}"
             style="left:${xpos}%" title="${escapeAttr(a.title || a.label || "")}">
          <div class="arrow-glyph">${arrowSvg}</div>
          ${a.label
            ? `<div class="arrow-label" style="color:${present ? "var(--ink-soft)" : "#94a3b8"}">${a.label}</div>`
            : ""}
        </div>
      `;
    })
    .join("");

  const visStyle = widthPercent < 100 ? ` style="width:${widthPercent}%;min-width:auto"` : "";

  return `
    <div class="allele-strand">
      <span class="strand-tag allele-${alleleClass}">${tagLabel}</span>
      <div class="strand-vis"${visStyle}>
        <div class="strand-backbone"></div>
        ${featuresHtml}
        ${cutsHtml}
        ${arrowsHtml}
        <div class="position-axis">
          <span style="left:0">0</span>
          <span class="end" style="left:100%">${length} bp</span>
        </div>
      </div>
      <div class="strand-result">
        <span class="strand-result-cuts">${resultText}</span>
        ${resultExtra}
      </div>
    </div>
  `;
}

/** "homologous chromosome ที่ N" / "homologous chromosome N" suffix. */
export function chromosomeLabel(n) {
  return getLang() === "th"
    ? `homologous chromosome ที่ ${n}`
    : `homologous chromosome ${n}`;
}

/** Index of first differing character between two equal-length strings. -1 if none. */
export function findDiffIndex(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
}

/** Wrap one base at `idx` with the SNP-highlight span. */
export function highlightAt(motif, idx) {
  if (idx < 0) return motif;
  return motif.slice(0, idx) + `<span class="snp">${motif[idx]}</span>` + motif.slice(idx + 1);
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
