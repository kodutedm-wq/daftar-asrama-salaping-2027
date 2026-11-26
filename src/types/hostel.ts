export type ApplicationStatus = 'Dihantar' | 'Disemak' | 'Diluluskan' | 'Ditolak';

export type TabRoute = 'pemohon' | 'semak' | 'admin';

export interface HostelApplication {
  id: string;
  applicantUid?: string;
  applicantEmail?: string;
  nama: string;
  kp: string;
  jantina: 'L' | 'P';
  tkt: string;
  penjaga: string;
  tel: string;
  jarak: string;
  alamat: string;
  sebab: string;
  fail: string;
  failMimeType?: string;
  failSize?: number;
  failDataUrl?: string;
  hasCloudPreview?: boolean;
  fotoDataUrl?: string;
  status: ApplicationStatus;
  tarikh: string;
  catatanWarden?: string;
  dorm?: string;
}

export interface PublicStatusResult {
  id: string;
  tkt: string;
  status: ApplicationStatus;
  tarikh: string;
  hasHealthForm: boolean;
  catatanWarden?: string;
  dorm?: string;
  asrama?: 'Aspura' | 'Aspuri';
  fullRecord?: HostelApplication;
}

export interface ApplicationFormFields {
  nama: string;
  kp: string;
  jantina: 'L' | 'P';
  tkt: string;
  penjaga: string;
  tel: string;
  jarak: string;
  alamat: string;
  sebab: string;
}

export interface DraftState {
  step: number;
  checks: [boolean, boolean, boolean];
  form: ApplicationFormFields;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  hasLocalFile?: boolean;
  photoDataUrl?: string;
}

export const APPLICATION_STEPS = [
  'Muat turun borang',
  'Lengkapkan borang',
  'Pemeriksaan klinik',
  'Isi permohonan',
  'Muat naik borang',
  'Hantar',
] as const;

export const TINGKATAN_OPTIONS = [
  'Tingkatan 1',
  'Tingkatan 2',
  'Tingkatan 3',
  'Tingkatan 4',
  'Tingkatan 5',
  'Tingkatan 6',
] as const;

export const ASPURA_DORM_OPTIONS = [
  '1A',
  '1B',
  '1C',
  '1D',
  '1E',
  '2A',
  '2B',
  '2C',
  '2D',
  '2E',
  '3A',
  '3B',
  '3C',
  '3D',
  '3E',
] as const;

export const ASPURI_DORM_OPTIONS = [
  '1A',
  '1B',
  '1C',
  '1D',
  '1E',
  '2A',
  '2B',
  '2C',
  '2D',
  '2E',
  '3A',
  '3B',
  '3C',
  '3D',
  '3E',
  '4A',
] as const;

export function getDormOptionsByGender(jantina: 'L' | 'P'): readonly string[] {
  return jantina === 'P' ? ASPURI_DORM_OPTIONS : ASPURA_DORM_OPTIONS;
}

export function getAsramaBlockName(jantina: 'L' | 'P'): 'Aspura' | 'Aspuri' {
  return jantina === 'P' ? 'Aspuri' : 'Aspura';
}

export const STATUS_OPTIONS: ApplicationStatus[] = [
  'Dihantar',
  'Disemak',
  'Diluluskan',
  'Ditolak',
];

export interface AdminRecord {
  uid: string;
  email: string;
  nama: string;
}

