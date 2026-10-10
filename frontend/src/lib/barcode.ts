import JsBarcode from 'jsbarcode';

// ── Accession + barcode value ────────────────────────────────────────────────

/** Deterministic 5-digit sequence from an order UUID. */
function orderSeq(orderId: string): string {
  let h = 5381;
  for (let i = 0; i < orderId.length; i++) h = ((h << 5) + h) ^ orderId.charCodeAt(i);
  return ((h >>> 0) % 99999).toString().padStart(5, '0');
}

/** "ACC-2026-04271" — human-readable accession number */
export function accessionNumber(orderId: string): string {
  return `ACC-${new Date().getFullYear()}-${orderSeq(orderId)}`;
}

/** Numeric barcode value (9 digits) — scannable by standard lab barcode readers */
export function barcodeValue(orderId: string): string {
  return `${new Date().getFullYear()}${orderSeq(orderId)}`;
}

// ── SVG rendering ─────────────────────────────────────────────────────────────

export interface BarcodeOptions {
  width?: number;
  height?: number;
  fontSize?: number;
}

/** Renders a Code128 barcode into an existing <svg> DOM element. */
export function renderToSvg(svgEl: SVGSVGElement, value: string, opts: BarcodeOptions = {}): void {
  JsBarcode(svgEl, value, {
    format: 'CODE128',
    width:        opts.width    ?? 1.8,
    height:       opts.height   ?? 52,
    displayValue: true,
    fontSize:     opts.fontSize ?? 10,
    margin:       6,
    textMargin:   2,
    background:   '#ffffff',
    lineColor:    '#000000',
  });
}

/** Creates a standalone SVG element and returns its outerHTML (for print popups). */
export function buildSvgHtml(value: string, opts: BarcodeOptions = {}): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.appendChild(svg);
  try {
    JsBarcode(svg, value, {
      format: 'CODE128',
      width:        opts.width    ?? 1.8,
      height:       opts.height   ?? 52,
      displayValue: true,
      fontSize:     opts.fontSize ?? 10,
      margin:       6,
      textMargin:   2,
      background:   '#ffffff',
      lineColor:    '#000000',
      xmlDocument:  document,
    });
    return svg.outerHTML;
  } finally {
    document.body.removeChild(svg);
  }
}

// ── Print popup ───────────────────────────────────────────────────────────────

export interface LabelData {
  accession:   string;
  barcode:     string;
  patientName: string;
  patientMeta: string;   // e.g. "M / 32Y"
  date:        string;   // ISO or formatted
  tests:       string;   // comma-separated
  collector:   string;
  tubeColor:   string;   // CSS color hex
  tubeName:    string;   // e.g. "Purple Cap (EDTA)"
}

function labelHtml(data: LabelData): string {
  const svgHtml = buildSvgHtml(data.barcode, { width: 1.5, height: 44, fontSize: 9 });
  const dateStr = (() => {
    try { return new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return data.date; }
  })();
  return `
    <div class="label">
      <div class="header">
        <span class="brand">DiagDesk</span>
        <span class="acc">${data.accession}</span>
      </div>
      <div class="barcode-wrap">${svgHtml}</div>
      <div class="divider"></div>
      <div class="info-row">
        <span class="patient">${data.patientName}</span>
        <span class="meta">${data.patientMeta}</span>
      </div>
      <div class="info-row">
        <span class="tests">${data.tests}</span>
        <span class="date">${dateStr}</span>
      </div>
      <div class="tube-row">
        <span class="tube-dot" style="background:${data.tubeColor}"></span>
        <span class="tube-name">${data.tubeName}</span>
        <span class="collector">${data.collector}</span>
      </div>
    </div>`;
}

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @page { margin: 0; size: 50mm 30mm; }
  body { margin: 0; padding: 0; font-family: Inter, system-ui, monospace; background: #fff; }
  .label {
    width: 50mm; height: 30mm;
    padding: 1.5mm 2mm 1mm 2mm;
    overflow: hidden;
    page-break-after: always;
    border: 0.3mm solid #ccc;
    display: flex; flex-direction: column;
  }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5mm; }
  .brand  { font-size: 6pt; font-weight: 900; color: #17A077; letter-spacing: 0.5px; }
  .acc    { font-size: 6pt; font-weight: 700; color: #444; font-family: monospace; }
  .barcode-wrap svg { width: 100% !important; height: auto !important; max-height: 12mm; display: block; }
  .divider { border-top: 0.3mm solid #ddd; margin: 0.8mm 0 0.5mm; }
  .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3mm; }
  .patient { font-size: 6.5pt; font-weight: 700; color: #111; overflow: hidden; white-space: nowrap; max-width: 28mm; text-overflow: ellipsis; }
  .meta    { font-size: 5.5pt; color: #555; white-space: nowrap; }
  .tests   { font-size: 5.5pt; color: #333; overflow: hidden; white-space: nowrap; max-width: 30mm; text-overflow: ellipsis; }
  .date    { font-size: 5.5pt; color: #555; white-space: nowrap; }
  .tube-row { display: flex; align-items: center; gap: 1mm; margin-top: 0.3mm; }
  .tube-dot { width: 3mm; height: 3mm; border-radius: 50%; flex-shrink: 0; border: 0.5mm solid rgba(0,0,0,0.2); }
  .tube-name { font-size: 5pt; font-weight: 700; color: #333; flex: 1; }
  .collector { font-size: 5pt; color: #888; white-space: nowrap; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .label { border: none; }
  }
`;

/** Opens a browser print popup with one or more 50×30mm thermal labels. */
export function printLabels(labels: LabelData[]): void {
  const win = window.open('', '_blank', 'width=400,height=500');
  if (!win) { alert('Allow popups to print labels'); return; }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sample Labels — DiagDesk</title>
  <style>${PRINT_CSS}</style>
</head>
<body onload="window.print()">
  ${labels.map(labelHtml).join('')}
</body>
</html>`);
  win.document.close();
}
