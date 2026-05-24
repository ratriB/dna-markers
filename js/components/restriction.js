// Restriction-enzyme digest engine.
// Scans a DNA sequence for an enzyme's recognition motif (IUPAC supported)
// and returns the resulting fragment sizes + highlighted-sequence HTML.

const IUPAC = {
  A: "A", C: "C", G: "G", T: "T",
  R: "[AG]", Y: "[CT]", S: "[GC]", W: "[AT]",
  K: "[GT]", M: "[AC]",
  B: "[CGT]", D: "[AGT]", H: "[ACT]", V: "[ACG]",
  N: "[ACGT]"
};

function motifToRegex(motif) {
  const body = motif.toUpperCase().split("").map(c => IUPAC[c] || c).join("");
  return new RegExp(body, "g");
}

/**
 * Digest a linear DNA sequence with a single enzyme.
 *
 * @param {string} sequence  Upper-case DNA string.
 * @param {object} enzyme    {name, recognition, cut} — cut = offset within
 *                           recognition where the cleavage falls (e.g. EcoRI
 *                           G^AATTC → cut = 1).
 * @returns {{fragments: number[], sites: Array<{start: number, end: number, cut: number}>}}
 */
export function digest(sequence, enzyme) {
  const { fragments, sites } = digestWithCoords(sequence, enzyme);
  return { fragments: fragments.map(f => f.size), sites };
}

/**
 * Same as digest() but each fragment carries its start/end coordinates in
 * the original sequence — needed to check whether a probe target overlaps a
 * given fragment for Southern-blot simulation.
 *
 * @returns {{
 *   fragments: Array<{start: number, end: number, size: number}>,
 *   sites: Array<{start: number, end: number, cut: number}>
 * }}
 */
export function digestWithCoords(sequence, enzyme) {
  const seq = sequence.toUpperCase().replace(/\s+/g, "");
  const re = motifToRegex(enzyme.recognition);
  const sites = [];
  let m;
  while ((m = re.exec(seq)) !== null) {
    sites.push({
      start: m.index,
      end: m.index + enzyme.recognition.length,
      cut: m.index + enzyme.cut
    });
    if (re.lastIndex === m.index) re.lastIndex++;
  }

  if (sites.length === 0) {
    return {
      fragments: [{ start: 0, end: seq.length, size: seq.length }],
      sites: []
    };
  }

  const fragments = [];
  let prev = 0;
  for (const s of sites) {
    fragments.push({ start: prev, end: s.cut, size: s.cut - prev });
    prev = s.cut;
  }
  fragments.push({ start: prev, end: seq.length, size: seq.length - prev });
  return { fragments, sites };
}

/**
 * Whether a fragment (start, end in original sequence) overlaps a probe
 * target region.
 */
export function fragmentHybridizes(fragment, probe) {
  return fragment.end > probe.start && fragment.start < probe.end;
}

/**
 * Return HTML with recognition sites highlighted.
 * Cut positions are marked with a tiny |.
 */
export function highlightSequence(sequence, enzyme) {
  const seq = sequence.toUpperCase().replace(/\s+/g, "");
  const { sites } = digest(seq, enzyme);
  if (sites.length === 0) return escapeHtml(seq);

  let html = "";
  let cursor = 0;
  for (const s of sites) {
    html += escapeHtml(seq.slice(cursor, s.start));
    const recog = seq.slice(s.start, s.end);
    const cutOffset = s.cut - s.start;
    html +=
      `<span class="site">` +
      escapeHtml(recog.slice(0, cutOffset)) +
      `<span class="site-cut">|</span>` +
      escapeHtml(recog.slice(cutOffset)) +
      `</span>`;
    cursor = s.end;
  }
  html += escapeHtml(seq.slice(cursor));
  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
