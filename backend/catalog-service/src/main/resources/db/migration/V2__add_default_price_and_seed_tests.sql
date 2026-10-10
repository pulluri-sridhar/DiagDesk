-- V2: Add default_price to tests + seed demo-tenant catalog

ALTER TABLE catalog.tests
    ADD COLUMN IF NOT EXISTS default_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Demo tenant
DO $$
DECLARE
    t_id VARCHAR(36) := '00000000-0000-0000-0000-000000000001';
BEGIN

INSERT INTO catalog.tests
    (test_id, tenant_id, code, name, method, unit, specimen_type, container, tat_hours, is_custom, nabl_code, default_price)
VALUES
-- Haematology
('c1000000-0000-0000-0000-000000000001', t_id, 'CBC',    'Complete Blood Count (CBC)',              'Automated Analyzer',        'cells/µL',            'Blood',  'EDTA',             4,  false, 'NABL-HEM-001', 250),
('c1000000-0000-0000-0000-000000000002', t_id, 'ESR',    'ESR (Erythrocyte Sedimentation Rate)',    'Westergren Method',         'mm/hr',               'Blood',  'EDTA',             2,  true,  NULL,           80),
('c1000000-0000-0000-0000-000000000003', t_id, 'COAG',   'Coagulation Profile (PT/INR, APTT)',      'Clot Detection',            'seconds / ratio',     'Blood',  'Citrate',          6,  false, 'NABL-COA-001', 500),
('c1000000-0000-0000-0000-000000000004', t_id, 'DDIMER', 'D-Dimer',                                 'ELISA',                     'ng/mL',               'Blood',  'Citrate',          4,  true,  NULL,           700),

-- Biochemistry
('c1000000-0000-0000-0000-000000000005', t_id, 'FBS',    'Blood Glucose — Fasting',                 'Enzymatic (GOD-POD)',       'mg/dL',               'Blood',  'Fluoride',         2,  false, 'NABL-BIO-001', 80),
('c1000000-0000-0000-0000-000000000006', t_id, 'HBA1C',  'HbA1c (Glycated Haemoglobin)',            'HPLC',                      '%',                   'Blood',  'EDTA',             8,  false, 'NABL-BIO-002', 350),
('c1000000-0000-0000-0000-000000000007', t_id, 'LFT',    'Liver Function Tests (LFT)',               'IFCC / Diazo Method',      'U/L, mg/dL',          'Blood',  'Plain/SST',        12, true,  NULL,           350),
('c1000000-0000-0000-0000-000000000008', t_id, 'KFT',    'Kidney Function Tests (KFT)',              'Jaffe / Urease Method',    'mg/dL',               'Blood',  'Plain/SST',        8,  true,  NULL,           300),
('c1000000-0000-0000-0000-000000000009', t_id, 'LIPID',  'Lipid Profile',                            'Enzymatic',                'mg/dL',               'Blood',  'Plain/SST',        12, false, 'NABL-LIP-001', 300),
('c1000000-0000-0000-0000-000000000010', t_id, 'ELEC',   'Serum Electrolytes (Na, K, Cl)',           'ISE Method',               'mEq/L',               'Blood',  'Plain/SST',        6,  true,  NULL,           200),
('c1000000-0000-0000-0000-000000000011', t_id, 'CRP',    'CRP (C-Reactive Protein)',                 'Turbidimetry',             'mg/L',                'Blood',  'Plain/SST',        6,  true,  NULL,           300),
('c1000000-0000-0000-0000-000000000012', t_id, 'IRON',   'Iron Studies (Serum Iron, TIBC, Ferritin)','Colorimetric / CLIA',      'µg/dL, ng/mL',        'Blood',  'Plain/SST',        8,  true,  NULL,           400),
('c1000000-0000-0000-0000-000000000013', t_id, 'PCT',    'Procalcitonin (PCT)',                       'CLIA',                     'ng/mL',               'Blood',  'Plain/SST',        8,  true,  NULL,           1200),
('c1000000-0000-0000-0000-000000000014', t_id, 'TROP',   'Troponin I (Cardiac)',                     'CLIA',                     'ng/mL',               'Blood',  'Plain/SST',        2,  true,  NULL,           800),
('c1000000-0000-0000-0000-000000000015', t_id, 'URICAC', 'Serum Uric Acid',                          'Enzymatic Method',         'mg/dL',               'Blood',  'Plain/SST',        4,  false, 'NABL-BIO-007', 150),

-- Endocrinology
('c1000000-0000-0000-0000-000000000016', t_id, 'TSH',    'Thyroid Panel (TSH, T3, T4)',              'CLIA',                      'µIU/mL, pg/mL, ng/dL','Blood',  'Plain/SST',        24, false, 'NABL-THY-001', 450),
('c1000000-0000-0000-0000-000000000017', t_id, 'VITD',   'Vitamin D (25-OH)',                        'CLIA',                      'ng/mL',               'Blood',  'Plain/SST',        24, false, 'NABL-VIT-001', 800),
('c1000000-0000-0000-0000-000000000018', t_id, 'B12',    'Vitamin B12',                              'CLIA',                      'pg/mL',               'Blood',  'Plain/SST',        24, false, 'NABL-VIT-002', 600),
('c1000000-0000-0000-0000-000000000019', t_id, 'PSA',    'PSA (Prostate Specific Antigen)',           'CLIA',                     'ng/mL',               'Blood',  'Plain/SST',        24, true,  NULL,           600),

-- Immunology / Serology
('c1000000-0000-0000-0000-000000000020', t_id, 'DENGUE', 'Dengue NS1 Antigen',                       'Rapid / ELISA',            'Reactive/Non-reactive','Blood', 'Plain/SST',        6,  false, 'NABL-SER-004', 600),
('c1000000-0000-0000-0000-000000000021', t_id, 'MAL',    'Malaria Antigen Test',                     'Rapid Diagnostic Test',    'Positive/Negative',   'Blood',  'EDTA',             2,  false, 'NABL-SER-005', 300),
('c1000000-0000-0000-0000-000000000022', t_id, 'HBSAG',  'HBsAg (Hepatitis B Surface Antigen)',      'ELISA / CLIA',             'Reactive/Non-reactive','Blood', 'Plain/SST',        4,  false, 'NABL-SER-002', 200),
('c1000000-0000-0000-0000-000000000023', t_id, 'HIV',    'HIV 1 & 2 Antibody',                       'ELISA / CLIA',             'Reactive/Non-reactive','Blood', 'Plain/SST',        4,  false, 'NABL-SER-001', 400),

-- Microbiology
('c1000000-0000-0000-0000-000000000024', t_id, 'BCUL',   'Blood Culture',                            'Automated (BacT/ALERT)',   'N/A',                 'Blood',  'BacT/ALERT bottle',48, false, 'NABL-MIC-001', 800),

-- Urinalysis
('c1000000-0000-0000-0000-000000000025', t_id, 'URINE',  'Urine Routine & Microscopy',               'Manual + Microscopy',      'Various',             'Urine',  'Sterile container',4,  false, 'NABL-URI-001', 100)

ON CONFLICT (tenant_id, code) DO NOTHING;

END $$;
