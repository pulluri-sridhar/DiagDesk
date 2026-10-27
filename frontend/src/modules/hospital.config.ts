/**
 * Hospital Module Feature Flags
 *
 * Set `enabled: false` for any module a customer does not need.
 * Routes, sidebar links, and role permissions are all gated on these flags —
 * disabling a module here removes it completely from the UI.
 */

export type HospitalModule =
  | 'OPD_QUEUE'
  | 'IPD_BEDS'
  | 'RADIOLOGY'
  | 'MEDICAL_HISTORY'
  | 'CONSULTATION_NOTES'
  | 'DOCTOR_SHARE'
  | 'ACCOUNTING';

interface ModuleDef {
  enabled: boolean;
  label: string;
  description: string;
  icon: string;
}

export const HOSPITAL_MODULES: Record<HospitalModule, ModuleDef> = {
  OPD_QUEUE:            { enabled: true,  label: 'OPD Queue',            icon: 'queue',            description: 'Outpatient token queue, walk-ins and vital signs'     },
  IPD_BEDS:             { enabled: true,  label: 'IPD & Bed Management', icon: 'bed',              description: 'Ward board, admissions and discharge workflow'         },
  RADIOLOGY:            { enabled: true,  label: 'Radiology',            icon: 'radiology',        description: 'Imaging orders, worklist and radiologist reporting'     },
  MEDICAL_HISTORY:      { enabled: true,  label: 'Medical History',      icon: 'history_edu',      description: 'Patient allergies, conditions and past operations'     },
  CONSULTATION_NOTES:   { enabled: true,  label: 'Consultation Notes',   icon: 'clinical_notes',   description: 'Structured SOAP notes by doctors'                     },
  DOCTOR_SHARE:         { enabled: false, label: 'Doctor Revenue Share', icon: 'payments',         description: 'Commission policies and revenue sharing'               },
  ACCOUNTING:           { enabled: false, label: 'Accounting',           icon: 'account_balance',  description: 'Income and expense ledger'                            },
};

export function isModuleEnabled(module: HospitalModule): boolean {
  return HOSPITAL_MODULES[module].enabled;
}

export function enabledModules(): HospitalModule[] {
  return (Object.keys(HOSPITAL_MODULES) as HospitalModule[]).filter(isModuleEnabled);
}
