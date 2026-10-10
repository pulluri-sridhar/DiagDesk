// ── Types ─────────────────────────────────────────────────────────────────────

export interface Analyte {
  id: string;
  label: string;
  unit: string;
  refRange: string;
  refRangeM?: string;
  refRangeF?: string;
  category?: string;
  methodology?: string;
}

export interface ReportTemplate {
  id: string;
  department: string;
  title: string;
  testKeywords: string[];
  specimenType: string;
  specimenContainer: string;
  methodology: string;
  analytes: Analyte[];
  interpretationNotes?: string;
}

// ── Templates ──────────────────────────────────────────────────────────────────

export const TEMPLATES: ReportTemplate[] = [
  {
    id: 'cbc',
    department: 'Hematology',
    title: 'Complete Blood Count (CBC) with Differential',
    testKeywords: ['cbc', 'blood count', 'haemogram', 'hemogram', 'hematology', 'haematology'],
    specimenType: 'Blood (EDTA)',
    specimenContainer: 'Purple Cap (EDTA)',
    methodology: 'Automated 5-Part Differential Cell Counter (Sysmex XN-550)',
    interpretationNotes: 'Results should be interpreted in clinical context. Morphological abnormalities may require peripheral smear examination.',
    analytes: [
      { id: 'hemoglobin',  label: 'Hemoglobin',       unit: 'g/dL',      refRangeM: '13.5 – 17.5', refRangeF: '12.0 – 16.0', refRange: '12.0 – 17.5', category: 'Red Blood Cell Parameters' },
      { id: 'rbc',         label: 'RBC Count',         unit: '×10⁶/μL',  refRangeM: '4.5 – 5.5',  refRangeF: '4.0 – 5.0',  refRange: '4.0 – 5.5',  category: 'Red Blood Cell Parameters' },
      { id: 'pcv',         label: 'PCV / Hematocrit',  unit: '%',         refRangeM: '41 – 53',    refRangeF: '36 – 48',    refRange: '36 – 53',    category: 'Red Blood Cell Parameters' },
      { id: 'mcv',         label: 'MCV',                unit: 'fL',        refRange: '80 – 100',    category: 'Red Blood Cell Parameters' },
      { id: 'mch',         label: 'MCH',                unit: 'pg',        refRange: '27 – 33',     category: 'Red Blood Cell Parameters' },
      { id: 'mchc',        label: 'MCHC',               unit: 'g/dL',      refRange: '32 – 36',     category: 'Red Blood Cell Parameters' },
      { id: 'rdw',         label: 'RDW-CV',             unit: '%',         refRange: '11.5 – 14.5', category: 'Red Blood Cell Parameters' },
      { id: 'wbc',         label: 'WBC (Total Count)',  unit: '×10³/μL',  refRange: '4.5 – 11.0',  category: 'White Blood Cell Parameters' },
      { id: 'neutrophils', label: 'Neutrophils',        unit: '%',         refRange: '50 – 70',     category: 'White Blood Cell Parameters' },
      { id: 'lymphocytes', label: 'Lymphocytes',        unit: '%',         refRange: '20 – 40',     category: 'White Blood Cell Parameters' },
      { id: 'monocytes',   label: 'Monocytes',          unit: '%',         refRange: '2 – 8',       category: 'White Blood Cell Parameters' },
      { id: 'eosinophils', label: 'Eosinophils',        unit: '%',         refRange: '1 – 4',       category: 'White Blood Cell Parameters' },
      { id: 'basophils',   label: 'Basophils',          unit: '%',         refRange: '0 – 1',       category: 'White Blood Cell Parameters' },
      { id: 'platelets',   label: 'Platelet Count',     unit: '×10³/μL',  refRange: '150 – 450',   category: 'Platelet Parameters' },
      { id: 'mpv',         label: 'MPV',                unit: 'fL',        refRange: '7.5 – 12.5',  category: 'Platelet Parameters' },
    ],
  },

  {
    id: 'lft',
    department: 'Biochemistry',
    title: 'Liver Function Test (LFT)',
    testKeywords: ['lft', 'liver', 'hepatic', 'bilirubin', 'sgot', 'sgpt', 'ast', 'alt', 'alkaline phosphatase', 'alp'],
    specimenType: 'Blood (SST)',
    specimenContainer: 'Yellow Cap (SST)',
    methodology: 'Colorimetric / Spectrophotometry — Beckman Coulter AU680',
    interpretationNotes: 'Mildly elevated enzymes (2–3× ULN) are common with fatty liver and medications. Moderate to severe elevations require clinical correlation and repeat testing.',
    analytes: [
      { id: 'tbil',    label: 'Total Bilirubin',    unit: 'mg/dL', refRange: '0.3 – 1.2', category: 'Bilirubin' },
      { id: 'dbil',    label: 'Direct Bilirubin',   unit: 'mg/dL', refRange: '0.1 – 0.4', category: 'Bilirubin' },
      { id: 'ibil',    label: 'Indirect Bilirubin', unit: 'mg/dL', refRange: '0.2 – 0.8', category: 'Bilirubin' },
      { id: 'ast',     label: 'SGOT (AST)',          unit: 'U/L',   refRange: '10 – 40',  category: 'Liver Enzymes' },
      { id: 'alt',     label: 'SGPT (ALT)',          unit: 'U/L',   refRange: '7 – 56',   category: 'Liver Enzymes' },
      { id: 'alp',     label: 'Alkaline Phosphatase (ALP)', unit: 'U/L', refRange: '44 – 147', category: 'Liver Enzymes' },
      { id: 'ggt',     label: 'GGT',                 unit: 'U/L',   refRangeM: '12 – 73', refRangeF: '8 – 35', refRange: '8 – 73', category: 'Liver Enzymes' },
      { id: 'tprot',   label: 'Total Protein',       unit: 'g/dL',  refRange: '6.3 – 8.2', category: 'Proteins' },
      { id: 'alb',     label: 'Albumin',             unit: 'g/dL',  refRange: '3.5 – 5.0', category: 'Proteins' },
      { id: 'glob',    label: 'Globulin',            unit: 'g/dL',  refRange: '2.3 – 3.5', category: 'Proteins' },
      { id: 'ag',      label: 'A/G Ratio',           unit: 'ratio', refRange: '1.2 – 2.2', category: 'Proteins' },
    ],
  },

  {
    id: 'kft',
    department: 'Biochemistry',
    title: 'Kidney Function Test (KFT / RFT)',
    testKeywords: ['kft', 'rft', 'kidney', 'renal', 'creatinine', 'urea', 'uric acid', 'electrolyte', 'egfr'],
    specimenType: 'Blood (SST)',
    specimenContainer: 'Yellow Cap (SST)',
    methodology: 'Enzymatic / ISE Method — Beckman Coulter AU680',
    interpretationNotes: 'eGFR < 60 mL/min/1.73m² for ≥3 months indicates Chronic Kidney Disease. Creatinine interpretation should account for muscle mass and dietary protein intake.',
    analytes: [
      { id: 'urea',     label: 'Blood Urea',           unit: 'mg/dL',            refRange: '15 – 45',  category: 'Renal Function' },
      { id: 'bun',      label: 'Blood Urea Nitrogen',  unit: 'mg/dL',            refRange: '7 – 20',   category: 'Renal Function' },
      { id: 'creat',    label: 'Serum Creatinine',     unit: 'mg/dL',            refRangeM: '0.7 – 1.3', refRangeF: '0.5 – 1.1', refRange: '0.5 – 1.3', category: 'Renal Function' },
      { id: 'egfr',     label: 'eGFR (CKD-EPI)',       unit: 'mL/min/1.73m²',   refRange: '> 60',     category: 'Renal Function' },
      { id: 'uric',     label: 'Uric Acid',            unit: 'mg/dL',            refRangeM: '3.5 – 7.5', refRangeF: '2.5 – 6.5', refRange: '2.5 – 7.5', category: 'Renal Function' },
      { id: 'sodium',   label: 'Sodium (Na⁺)',         unit: 'mEq/L',            refRange: '135 – 145', category: 'Electrolytes' },
      { id: 'potassium',label: 'Potassium (K⁺)',        unit: 'mEq/L',            refRange: '3.5 – 5.1', category: 'Electrolytes' },
      { id: 'chloride', label: 'Chloride (Cl⁻)',       unit: 'mEq/L',            refRange: '98 – 107',  category: 'Electrolytes' },
      { id: 'bicarb',   label: 'Bicarbonate (HCO₃⁻)', unit: 'mEq/L',            refRange: '22 – 29',   category: 'Electrolytes' },
      { id: 'calcium',  label: 'Serum Calcium',        unit: 'mg/dL',            refRange: '8.5 – 10.5', category: 'Minerals' },
      { id: 'phosph',   label: 'Serum Phosphorus',     unit: 'mg/dL',            refRange: '2.5 – 4.5', category: 'Minerals' },
    ],
  },

  {
    id: 'thyroid',
    department: 'Endocrinology',
    title: 'Thyroid Function Test (TFT)',
    testKeywords: ['tsh', 'thyroid', 't3', 't4', 'free t3', 'free t4', 'thyroxine', 'triiodothyronine'],
    specimenType: 'Blood (SST)',
    specimenContainer: 'Yellow Cap (SST)',
    methodology: 'Electrochemiluminescence Immunoassay (ECLIA) — Roche Cobas e601',
    interpretationNotes: 'TSH is the primary screening test. TSH > 5 with normal FT4 indicates subclinical hypothyroidism. Thyroid antibodies recommended for all newly diagnosed cases.',
    analytes: [
      { id: 'tsh',  label: 'TSH (Thyroid Stimulating Hormone)', unit: 'μIU/mL', refRange: '0.50 – 5.00',  category: 'Thyroid Hormones' },
      { id: 't3',   label: 'T3 (Triiodothyronine, Total)',       unit: 'ng/dL',  refRange: '80 – 200',     category: 'Thyroid Hormones' },
      { id: 't4',   label: 'T4 (Thyroxine, Total)',             unit: 'μg/dL',  refRange: '5.0 – 12.0',   category: 'Thyroid Hormones' },
      { id: 'ft3',  label: 'Free T3',                           unit: 'pg/mL',  refRange: '2.0 – 4.4',    category: 'Thyroid Hormones' },
      { id: 'ft4',  label: 'Free T4',                           unit: 'ng/dL',  refRange: '0.8 – 1.8',    category: 'Thyroid Hormones' },
    ],
  },

  {
    id: 'lipid',
    department: 'Biochemistry',
    title: 'Lipid Profile (Fasting)',
    testKeywords: ['lipid', 'cholesterol', 'ldl', 'hdl', 'triglyceride', 'vldl', 'lipid profile'],
    specimenType: 'Blood (SST) — 10–12 hours fasting',
    specimenContainer: 'Yellow Cap (SST)',
    methodology: 'Enzymatic Colorimetric Method — Beckman Coulter AU680',
    interpretationNotes: 'LDL-C < 70 mg/dL is the target for very high CV risk. Dietary modification, exercise, and statin therapy should be considered for elevated values.',
    analytes: [
      { id: 'tchol',  label: 'Total Cholesterol',         unit: 'mg/dL', refRange: '< 200 Desirable',        category: 'Lipids' },
      { id: 'ldl',    label: 'LDL Cholesterol',           unit: 'mg/dL', refRange: '< 100 Optimal',          category: 'Lipids' },
      { id: 'hdl',    label: 'HDL Cholesterol',           unit: 'mg/dL', refRangeM: '> 40', refRangeF: '> 50', refRange: '> 40', category: 'Lipids' },
      { id: 'vldl',   label: 'VLDL Cholesterol',          unit: 'mg/dL', refRange: '< 30',                   category: 'Lipids' },
      { id: 'trig',   label: 'Triglycerides',             unit: 'mg/dL', refRange: '< 150 Normal',           category: 'Lipids' },
      { id: 'tcratio',label: 'Total Cholesterol/HDL Ratio',unit: 'ratio', refRange: '< 5.0',                 category: 'Derived Indices' },
      { id: 'lhrat',  label: 'LDL/HDL Ratio',            unit: 'ratio', refRange: '< 3.5',                  category: 'Derived Indices' },
    ],
  },

  {
    id: 'blood_sugar',
    department: 'Biochemistry',
    title: 'Blood Glucose Profile',
    testKeywords: ['glucose', 'blood sugar', 'fbs', 'ppbs', 'rbs', 'hba1c', 'glycated', 'diabetes', 'fasting blood'],
    specimenType: 'Blood (NaF/Grey Cap for FBS/PPBS; EDTA for HbA1c)',
    specimenContainer: 'Grey Cap (NaF) / Purple Cap (EDTA)',
    methodology: 'Hexokinase Method (Glucose); HPLC (HbA1c)',
    interpretationNotes: 'HbA1c reflects average blood glucose over 2–3 months. ADA criteria: FBS ≥126 mg/dL or HbA1c ≥6.5% on two occasions = Diabetes Mellitus.',
    analytes: [
      { id: 'fbs',   label: 'Fasting Blood Sugar (FBS)',         unit: 'mg/dL', refRange: '70 – 100 Normal; 101–125 Prediabetes; ≥126 Diabetes', category: 'Blood Glucose' },
      { id: 'ppbs',  label: 'Post-Prandial Blood Sugar (PPBS)',  unit: 'mg/dL', refRange: '< 140 Normal; 140–199 Prediabetes; ≥200 Diabetes',  category: 'Blood Glucose' },
      { id: 'rbs',   label: 'Random Blood Sugar (RBS)',          unit: 'mg/dL', refRange: '70 – 140 Normal',                                   category: 'Blood Glucose' },
      { id: 'hba1c', label: 'HbA1c (Glycated Haemoglobin)',     unit: '%',     refRange: '< 5.7 Normal; 5.7–6.4 Prediabetes; ≥6.5 Diabetes', category: 'Glycaemic Control' },
    ],
  },

  {
    id: 'generic',
    department: 'General',
    title: 'Laboratory Report',
    testKeywords: [],
    specimenType: 'As applicable',
    specimenContainer: 'As applicable',
    methodology: 'Standard laboratory methodology',
    analytes: [
      { id: 'test_name', label: 'Test / Analyte', unit: '—', refRange: '—', category: 'Results' },
      { id: 'result',    label: 'Result',          unit: '—', refRange: '—', category: 'Results' },
      { id: 'remarks',   label: 'Remarks',         unit: '—', refRange: '—', category: 'Results' },
    ],
  },
];

// ── Template matching ─────────────────────────────────────────────────────────

export function findTemplate(testName: string, department: string): ReportTemplate {
  const haystack = (testName + ' ' + department).toLowerCase();
  for (const t of TEMPLATES) {
    if (t.id === 'generic') continue;
    if (t.testKeywords.some(kw => haystack.includes(kw))) return t;
  }
  return TEMPLATES.find(t => t.id === 'generic')!;
}

// ── Flag detection ────────────────────────────────────────────────────────────

function parseRange(range: string): { min: number; max: number } | null {
  const m = range.match(/([\d.]+)\s*[–\-]\s*([\d.]+)/);
  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
  const gt = range.match(/>\s*([\d.]+)/);
  if (gt) return { min: parseFloat(gt[1]), max: Infinity };
  const lt = range.match(/<\s*([\d.]+)/);
  if (lt) return { min: -Infinity, max: parseFloat(lt[1]) };
  return null;
}

export function detectFlag(value: string, analyte: Analyte, sex?: string | null): 'H' | 'L' | 'N' | '—' {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  const rangeStr = (sex === 'M' && analyte.refRangeM) ? analyte.refRangeM
    : (sex === 'F' && analyte.refRangeF) ? analyte.refRangeF
    : analyte.refRange;
  const range = parseRange(rangeStr);
  if (!range) return '—';
  if (num > range.max) return 'H';
  if (num < range.min) return 'L';
  return 'N';
}

// ── HTML report renderer ──────────────────────────────────────────────────────

export interface RenderParams {
  template:                ReportTemplate;
  results:                 Record<string, string>;
  patient: {
    name:    string;
    age:     number | null;
    sex:     string | null;
    phone:   string | null;
    mpi_no:  string;
    email?:  string | null;
    address?:string | null;
  };
  order: {
    id:          string;
    ordered_at:  string;
    doctor_name?: string;
    notes?:       string | null;
  };
  labInfo: {
    name:    string;
    address: string;
    phone:   string;
    regNo:   string;
  };
  reportNo:                 string;
  signatureDataUrl?:        string;
  pathologistName?:         string;
  pathologistQualification?:string;
  signedAt?:                string;
}

export function renderReportHTML(p: RenderParams): string {
  const { template, results, patient, order, labInfo, reportNo } = p;
  const isSigned = !!p.signatureDataUrl;
  const collectedDate = new Date(order.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const reportedDate  = isSigned && p.signedAt
    ? new Date(p.signedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // Group analytes by category
  const categories = Array.from(new Set(template.analytes.map(a => a.category ?? 'Results')));

  function flagBadge(flag: string): string {
    if (flag === 'H') return `<span style="background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">H</span>`;
    if (flag === 'L') return `<span style="background:#DBEAFE;color:#1E40AF;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">L</span>`;
    return '';
  }

  function resultRow(a: Analyte, idx: number): string {
    const val  = results[a.id] ?? '—';
    const flag = detectFlag(val, a, patient.sex);
    const rowBg = idx % 2 === 0 ? '#ffffff' : '#F9FAFB';
    const flagHighlight = flag === 'H' ? 'background:#FFF5F5;' : flag === 'L' ? 'background:#EFF6FF;' : '';
    const refRange = patient.sex === 'M' && a.refRangeM ? a.refRangeM
      : patient.sex === 'F' && a.refRangeF ? a.refRangeF
      : a.refRange;
    return `
      <tr style="background:${rowBg};${flagHighlight}">
        <td style="padding:7px 12px;font-size:12px;color:#111;">${a.label}</td>
        <td style="padding:7px 12px;font-size:12px;font-weight:700;color:${flag === 'H' ? '#B91C1C' : flag === 'L' ? '#1D4ED8' : '#111'};">${val}</td>
        <td style="padding:7px 12px;font-size:11px;color:#6B7280;">${a.unit}</td>
        <td style="padding:7px 12px;font-size:11px;color:#374151;">${refRange}</td>
        <td style="padding:7px 12px;text-align:center;">${flagBadge(flag)}</td>
      </tr>`;
  }

  const tableRows = categories.map(cat => {
    const catAnalytes = template.analytes.filter(a => (a.category ?? 'Results') === cat);
    return `
      <tr><td colspan="5" style="background:#EEF2FF;padding:6px 12px;font-size:11px;font-weight:700;color:#3730A3;text-transform:uppercase;letter-spacing:0.05em;">${cat}</td></tr>
      ${catAnalytes.map((a, i) => resultRow(a, i)).join('')}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${template.title} — ${patient.name}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; }
  .watermark { position: fixed; top: 40%; left: 10%; font-size: 80px; color: rgba(23,160,119,0.06); transform: rotate(-30deg); z-index: 0; font-weight: 900; pointer-events: none; }
</style>
</head>
<body>
${isSigned ? '<div class="watermark">VERIFIED</div>' : '<div class="watermark">DRAFT</div>'}

<!-- HEADER -->
<table style="margin-bottom:12px;">
  <tr>
    <td style="width:70%;">
      <div style="font-size:22px;font-weight:900;color:#17A077;letter-spacing:-0.5px;">${labInfo.name}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px;">${labInfo.address}</div>
      <div style="font-size:11px;color:#6B7280;">Tel: ${labInfo.phone} &nbsp;|&nbsp; Reg: ${labInfo.regNo}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:2px;">NABL Accredited Laboratory &nbsp;·&nbsp; ISO 15189:2012 Certified</div>
    </td>
    <td style="text-align:right;vertical-align:top;">
      <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Report No</div>
      <div style="font-size:16px;font-weight:900;color:#17A077;font-family:monospace;">${reportNo}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:6px;font-weight:700;text-transform:uppercase;">Date Collected</div>
      <div style="font-size:12px;font-weight:600;">${collectedDate}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:4px;font-weight:700;text-transform:uppercase;">Date Reported</div>
      <div style="font-size:12px;font-weight:600;">${reportedDate}</div>
    </td>
  </tr>
</table>

<hr style="border:none;border-top:2px solid #17A077;margin-bottom:10px;">

<!-- REPORT TITLE -->
<div style="text-align:center;margin-bottom:10px;">
  <div style="font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#111;">${template.title}</div>
  <div style="font-size:10px;color:#9CA3AF;margin-top:2px;">Specimen: ${template.specimenType} &nbsp;·&nbsp; Method: ${template.methodology}</div>
</div>

<!-- PATIENT INFO -->
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
  <table>
    <tr>
      <td style="width:50%;vertical-align:top;">
        <table>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;width:110px;padding-bottom:4px;">PATIENT NAME</td><td style="font-size:13px;font-weight:700;">${patient.name}</td></tr>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;padding-bottom:4px;">AGE / SEX</td><td style="font-size:12px;">${patient.age ?? '—'}Y &nbsp;/&nbsp; ${patient.sex ?? '—'}</td></tr>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;padding-bottom:4px;">MPI NO</td><td style="font-size:12px;font-family:monospace;">${patient.mpi_no}</td></tr>
        </table>
      </td>
      <td style="width:50%;vertical-align:top;padding-left:16px;border-left:1px solid #E5E7EB;">
        <table>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;width:110px;padding-bottom:4px;">PHONE</td><td style="font-size:12px;">${patient.phone ?? '—'}</td></tr>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;padding-bottom:4px;">REFERRED BY</td><td style="font-size:12px;">${order.doctor_name ?? 'Self'}</td></tr>
          <tr><td style="font-size:10px;color:#9CA3AF;font-weight:700;padding-bottom:4px;">ORDER ID</td><td style="font-size:11px;font-family:monospace;color:#6B7280;">${order.id.slice(0, 8).toUpperCase()}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</div>

<!-- RESULTS TABLE -->
<table style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:12px;">
  <thead>
    <tr style="background:#17A077;">
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Test / Analyte</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Result</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Unit</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Biological Ref. Range</th>
      <th style="padding:9px 12px;text-align:center;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Flag</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>

<!-- INTERPRETATION -->
${template.interpretationNotes ? `
<div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
  <div style="font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;margin-bottom:4px;">Clinical Interpretation Notes</div>
  <div style="font-size:11px;color:#78350F;line-height:1.5;">${template.interpretationNotes}</div>
</div>` : ''}

<!-- SIGNATURE BLOCK -->
<table style="margin-top:24px;">
  <tr>
    <td style="width:60%;vertical-align:bottom;">
      <div style="font-size:9px;color:#9CA3AF;">H = Above reference range &nbsp;&nbsp; L = Below reference range &nbsp;&nbsp; N = Normal</div>
      <div style="font-size:9px;color:#9CA3AF;margin-top:3px;">This is a computer-generated report. ${isSigned ? 'Digitally verified and signed.' : 'DRAFT — Not for clinical use until signed.'}</div>
    </td>
    <td style="width:40%;text-align:center;vertical-align:bottom;padding-left:20px;">
      ${p.signatureDataUrl
        ? `<img src="${p.signatureDataUrl}" style="max-width:160px;max-height:70px;display:block;margin:0 auto 4px;" alt="Signature"/>`
        : `<div style="height:60px;border-bottom:1px solid #D1D5DB;margin-bottom:4px;width:160px;margin:0 auto;"></div>`}
      <div style="font-size:12px;font-weight:700;color:#111;">${p.pathologistName ?? 'Pathologist'}</div>
      <div style="font-size:10px;color:#6B7280;">${p.pathologistQualification ?? 'MD Pathology'}</div>
      <div style="font-size:10px;color:#6B7280;">Consultant Pathologist</div>
      ${isSigned ? `<div style="font-size:9px;color:#17A077;margin-top:2px;">✓ Digitally Signed &amp; Verified</div>` : ''}
    </td>
  </tr>
</table>

<!-- FOOTER -->
<div style="margin-top:20px;padding-top:8px;border-top:1px solid #E5E7EB;text-align:center;font-size:9px;color:#9CA3AF;">
  ${labInfo.name} &nbsp;·&nbsp; ${labInfo.address} &nbsp;·&nbsp; ${labInfo.phone}
  &nbsp;·&nbsp; Generated by DiagDesk v2.4
</div>
</body>
</html>`;
}
