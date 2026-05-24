// Gel-electrophoresis visualizer. Renders a virtual gel from one or more
// lanes of fragment sizes (in bp). Larger fragments stay near the well (top),
// smaller fragments migrate further (bottom) on a logarithmic scale.

import { t } from "../i18n.js";

const DEFAULT_LADDER = [2000, 1500, 1000, 750, 500, 300, 200, 100];

/**
 * @param {HTMLElement} mount
 * @param {Array<{label: string, fragments: number[]}>} lanes
 * @param {object} [opts]
 * @param {number[]} [opts.ladder]
 * @param {number} [opts.maxBp]  Largest band the gel can resolve (top).
 * @param {number} [opts.minBp]  Smallest band the gel can resolve (bottom).
 * @param {"gel"|"membrane"} [opts.theme]  "gel" = stained gel on dark background;
 *                                          "membrane" = Southern-blot membrane
 *                                          (cream background, dark purple precipitate).
 */
export function renderGel(mount, lanes, opts = {}) {
  const theme = opts.theme ?? "gel";
  const ladder = opts.ladder ?? DEFAULT_LADDER;
  const maxBp = opts.maxBp ?? Math.max(...ladder, ...lanes.flatMap(l => l.fragments), 1);
  const minBp = opts.minBp ?? Math.min(...ladder, 50);

  const logMax = Math.log10(maxBp);
  const logMin = Math.log10(minBp);

  // bp → fractional position (0 = top/well, 1 = bottom)
  const pos = bp => {
    const clamped = Math.max(minBp, Math.min(maxBp, bp));
    return (logMax - Math.log10(clamped)) / (logMax - logMin);
  };

  const ladderHtml = ladder
    .map(bp => {
      const top = (pos(bp) * 100).toFixed(1);
      return `<span class="ladder-tick" style="top:${top}%"></span>
              <span class="ladder-mark" style="top:${top}%">${bp}</span>`;
    })
    .join("");

  const lanesHtml = lanes
    .map(lane => {
      const bands = lane.fragments
        .map(bp => {
          const top = (pos(bp) * 100).toFixed(1);
          return `<span class="gel-band" style="top:${top}%" title="${bp} bp"></span>`;
        })
        .join("");
      return `<div class="gel-lane">
                ${bands}
                <span class="lane-label">${escapeHtml(lane.label)}</span>
              </div>`;
    })
    .join("");

  mount.innerHTML = `
    <div class="gel gel-${theme}">
      <div class="gel-lanes">
        <div class="gel-ladder" aria-label="${t("gel.ladder")}">
          ${ladderHtml}
          <span class="lane-label">${t("gel.ladder")}</span>
        </div>
        ${lanesHtml}
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
