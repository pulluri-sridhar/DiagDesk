import { useEffect, useRef, useState } from 'react';
import { renderToSvg, accessionNumber, barcodeValue, printLabels, type LabelData } from '../lib/barcode';
import type { Order, OrderItem } from '../lib/api';

// ── Tube guide (mirrors PhlebotomistMobile DEPT_TUBE) ────────────────────────

const DEPT_TUBE: Record<string, { hex: string; name: string; prep: string; deptMatch: string[] }> = {
  Hematology:    { hex: '#9333EA', name: 'Purple Cap (EDTA)',    prep: 'No fasting. Invert 8–10×.',               deptMatch: ['Hematology', 'CBC', 'ESR', 'HbA1c'] },
  Biochemistry:  { hex: '#EAB308', name: 'Yellow Cap (SST)',     prep: '10–12 h fasting. Clot 30 min.',          deptMatch: ['Biochemistry', 'LFT', 'KFT', 'Lipid', 'CRP', 'Uric'] },
  Endocrinology: { hex: '#EAB308', name: 'Yellow Cap (SST)',     prep: 'Fasting preferred for glucose hormones.', deptMatch: ['Endocrinology', 'TSH', 'T3', 'T4', 'Cortisol', 'Insulin'] },
  Coagulation:   { hex: '#3B82F6', name: 'Blue Cap (Citrate)',   prep: 'Fill to mark (9:1). No air bubbles.',    deptMatch: ['Coagulation', 'PT-INR', 'APTT', 'D-Dimer'] },
  Microbiology:  { hex: '#EF4444', name: 'Red Cap (Plain)',      prep: 'Full clotting. Sterile technique.',       deptMatch: ['Microbiology', 'Culture', 'Serology', 'Widal', 'HIV', 'HBsAg'] },
};

function tubeForItem(item: OrderItem): typeof DEPT_TUBE[string] {
  const match = Object.values(DEPT_TUBE).find(t =>
    t.deptMatch.some(kw => item.department?.toLowerCase().includes(kw.toLowerCase()) ||
                           item.test_name?.toLowerCase().includes(kw.toLowerCase()))
  );
  return match ?? { hex: '#EAB308', name: 'Yellow Cap (SST)', prep: 'Standard collection.', deptMatch: [] };
}

function uniqueTubes(items: OrderItem[]): { tube: typeof DEPT_TUBE[string]; tests: OrderItem[] }[] {
  const map = new Map<string, { tube: typeof DEPT_TUBE[string]; tests: OrderItem[] }>();
  for (const item of items) {
    const t = tubeForItem(item);
    if (!map.has(t.name)) map.set(t.name, { tube: t, tests: [] });
    map.get(t.name)!.tests.push(item);
  }
  return Array.from(map.values());
}

// ── Barcode preview SVG component ────────────────────────────────────────────

function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) {
      try { renderToSvg(ref.current, value, { width: 1.5, height: 50, fontSize: 10 }); }
      catch (e) { console.error('Barcode render:', e); }
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  order:       Order;
  collectorName?: string;
  onClose:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BarcodeLabelModal({ order, collectorName = 'Lab Staff', onClose }: Props) {
  const [btStatus, setBtStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle');
  const [btMsg, setBtMsg] = useState('');

  const items     = order.items ?? [];
  const tubes     = uniqueTubes(items);
  const accNum    = accessionNumber(order.id);
  const barcode   = barcodeValue(order.id);
  const testNames = items.slice(0, 3).map(i => i.test_name).join(', ') + (items.length > 3 ? ` +${items.length - 3}` : '');
  const dateStr   = new Date(order.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const patMeta   = [order.patient_sex, order.patient_age ? `${order.patient_age}Y` : ''].filter(Boolean).join(' / ');

  // ── Print handler ───────────────────────────────────────────────────────────

  function handlePrint() {
    const labels: LabelData[] = tubes.map(({ tube, tests }) => ({
      accession:   accNum,
      barcode,
      patientName: order.patient_name ?? 'Unknown',
      patientMeta: patMeta,
      date:        order.ordered_at,
      tests:       tests.map(t => t.test_name).join(', '),
      collector:   collectorName,
      tubeColor:   tube.hex,
      tubeName:    tube.name,
    }));

    // Master label (all tests)
    labels.unshift({
      accession:   accNum,
      barcode,
      patientName: order.patient_name ?? 'Unknown',
      patientMeta: patMeta,
      date:        order.ordered_at,
      tests:       testNames,
      collector:   collectorName,
      tubeColor:   '#17A077',
      tubeName:    'Master Label',
    });

    printLabels(labels);
  }

  // ── Web Bluetooth (direct BLE print to paired thermal printer) ─────────────

  async function handleBluetooth() {
    if (!('bluetooth' in navigator)) {
      setBtMsg('Web Bluetooth is not supported on this browser. Use Chrome/Edge on Android or desktop.');
      setBtStatus('error');
      return;
    }
    setBtStatus('connecting');
    setBtMsg('Scanning for nearby Bluetooth printers…');
    try {
      // Request any device — most mini thermal printers (HE24, Phomemo, MUNBYN)
      // advertise via Nordic UART Service or a generic serial service
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic Serial
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
        ],
      });
      setBtMsg(`Connecting to ${device.name ?? 'printer'}…`);
      const server = await device.gatt.connect();
      setBtStatus('connected');
      setBtMsg(`Connected to ${device.name ?? 'Bluetooth printer'}. Sending label data…`);

      // Try Nordic UART TX characteristic (most common for mini thermal printers)
      const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
      const UART_TX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

      let txChar: any = null;
      try {
        const svc = await server.getPrimaryService(UART_SERVICE);
        txChar = await svc.getCharacteristic(UART_TX);
      } catch {
        // Fallback: try generic serial service
        try {
          const svc = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
          txChar = await svc.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        } catch {
          setBtMsg('Could not find print service on this device. Please use the "Print Labels" button instead (printer must be paired via Bluetooth in system settings).');
          setBtStatus('error');
          return;
        }
      }

      // Build ESC/POS text content (works for most thermal label printers)
      const enc = new TextEncoder();
      const ESC = 0x1B; const GS = 0x1D; const LF = 0x0A;
      const lines: Uint8Array[] = [
        new Uint8Array([ESC, 0x40]),           // ESC @ — Initialize printer
        new Uint8Array([ESC, 0x61, 0x01]),     // Center align
        new Uint8Array([ESC, 0x21, 0x08]),     // Bold
        enc.encode(`DiagDesk Sample Label\n`),
        new Uint8Array([ESC, 0x21, 0x00]),     // Normal
        enc.encode(`${accNum}\n`),
        new Uint8Array([GS, 0x68, 0x50]),      // Barcode height 80 dots
        new Uint8Array([GS, 0x77, 0x02]),      // Barcode width ×2
        new Uint8Array([GS, 0x48, 0x02]),      // HRI text below barcode
        new Uint8Array([GS, 0x6B, 0x49, barcode.length, ...enc.encode(barcode)]), // CODE128 barcode
        new Uint8Array([LF]),
        enc.encode(`${order.patient_name ?? 'Unknown'}\n`),
        enc.encode(`${patMeta}  ${dateStr}\n`),
        enc.encode(`${testNames}\n`),
        enc.encode(`Collector: ${collectorName}\n`),
        new Uint8Array([LF, LF, LF, LF]),     // Feed paper
        new Uint8Array([GS, 0x56, 0x00]),     // Full cut
      ];

      for (const chunk of lines) {
        await txChar!.writeValue(chunk);
        await new Promise(r => setTimeout(r, 50)); // small delay between writes
      }
      setBtMsg('Label sent to printer successfully! ✅');
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        setBtMsg('No printer selected. Try again or use "Print Labels" with a paired printer.');
      } else {
        setBtMsg(`Bluetooth error: ${err?.message ?? String(err)}`);
      }
      setBtStatus('error');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
          style={{ background: 'linear-gradient(135deg,#0D4A3E,#17A077)' }}>
          <div className="flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-[22px]">label</span>
            <div>
              <div className="font-black text-[16px]">Sample Labels</div>
              <div className="text-white/70 text-[11px]">{accNum} · {items.length} test{items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Label Preview */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Label Preview</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white"
              style={{ width: '100%', aspectRatio: '50/30', maxWidth: 340, margin: '0 auto' }}>
              {/* Simulate 50mm × 30mm label */}
              <div className="w-full h-full p-2 flex flex-col" style={{ fontFamily: 'monospace' }}>
                {/* Label header row */}
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-black text-[8px]" style={{ color: '#17A077' }}>DiagDesk</span>
                  <span className="font-bold text-[7px] text-gray-500">{accNum}</span>
                </div>
                {/* Barcode */}
                <div className="flex-1 flex items-center">
                  <BarcodeSvg value={barcode} />
                </div>
                {/* Divider */}
                <div className="border-t border-gray-300 my-1"></div>
                {/* Patient info */}
                <div className="flex justify-between">
                  <span className="font-bold text-[7px] text-gray-800 truncate max-w-[55%]">{order.patient_name ?? '—'}</span>
                  <span className="text-[6px] text-gray-500">{patMeta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[6px] text-gray-600 truncate max-w-[60%]">{testNames}</span>
                  <span className="text-[6px] text-gray-500">{dateStr}</span>
                </div>
                {/* Tube row */}
                <div className="flex items-center gap-1 mt-0.5">
                  {tubes.slice(0, 3).map(({ tube }) => (
                    <span key={tube.name} className="w-2.5 h-2.5 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ background: tube.hex }}></span>
                  ))}
                  <span className="text-[6px] text-gray-500 ml-0.5 truncate">{tubes.map(t => t.tube.name).join(', ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tube breakdown */}
          <div className="px-6 pb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tubes Required · {tubes.length} label{tubes.length !== 1 ? 's' : ''} + 1 master = {tubes.length + 1} total
            </p>
            <div className="grid grid-cols-2 gap-2">
              {tubes.map(({ tube, tests }) => (
                <div key={tube.name} className="rounded-xl border-2 p-3 flex flex-col gap-1"
                  style={{ borderColor: tube.hex, background: `${tube.hex}10` }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                      style={{ background: tube.hex, borderColor: tube.hex }}></div>
                    <span className="font-bold text-[11px] text-gray-800">{tube.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">{tests.map(t => t.test_name).join(', ')}</div>
                  <div className="text-[9px] text-gray-400 italic mt-0.5">{tube.prep}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bluetooth Info */}
          <div className="mx-6 mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="material-symbols-outlined text-blue-500 text-[20px] flex-shrink-0">bluetooth</span>
              <div>
                <div className="font-bold text-[13px] text-blue-800">Bluetooth Thermal Printer</div>
                <div className="text-[11px] text-blue-600 mt-0.5">
                  Compatible with HE24, Phomemo M02, MUNBYN, Brother QL, and most 50mm thermal label printers.
                </div>
              </div>
            </div>

            {/* Method 1: Browser print (recommended) */}
            <div className="bg-white rounded-xl p-3 mb-2 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#17A077] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                <span className="font-bold text-[12px] text-gray-700">Easy: Use browser print dialog</span>
              </div>
              <p className="text-[11px] text-gray-500 ml-6">Pair your printer via Bluetooth in device settings → tap "Print Labels" → select your printer from the dialog.</p>
            </div>

            {/* Method 2: Direct BLE */}
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
                <span className="font-bold text-[12px] text-gray-700">Advanced: Direct BLE (Chrome/Android)</span>
              </div>
              <p className="text-[11px] text-gray-500 ml-6 mb-2">Sends ESC/POS commands directly to the printer over Bluetooth — no OS pairing needed.</p>
              <button onClick={handleBluetooth} disabled={btStatus === 'connecting' || btStatus === 'connected'}
                className="ml-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50"
                style={{ background: '#3B82F6' }}>
                <span className="material-symbols-outlined text-[14px]">
                  {btStatus === 'connecting' ? 'sync' : btStatus === 'connected' ? 'check_circle' : 'bluetooth_connected'}
                </span>
                {btStatus === 'connecting' ? 'Connecting…' : btStatus === 'connected' ? 'Sent!' : 'Connect & Print via BLE'}
              </button>
            </div>

            {btMsg && (
              <div className={`mt-2 rounded-xl px-3 py-2 text-[11px] font-medium ${
                btStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                btStatus === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {btMsg}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose}
            className="flex-none px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-bold">
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-3 rounded-xl text-white text-[13px] font-black flex items-center justify-center gap-2"
            style={{ background: '#17A077' }}>
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print {tubes.length + 1} Labels
          </button>
        </div>

      </div>
    </div>
  );
}
