import * as XLSX from 'xlsx';
import {
  ApplicationFormFields,
  DraftState,
  getAsramaBlockName,
  HostelApplication,
} from '../types/hostel';

export const STORAGE_KEYS = {
  DRAFT: 'asrama27draft',
  THEME: 'asrama27theme',
} as const;

export const SCHOOL_LOGO_URL = '/assets/aistudio/logo_5877ddda.png';

const SEED_ROWS: Array<
  [string, string, 'L' | 'P', string, string, string, string, HostelApplication['status']]
> = [
  [
    'Aisyah binti Rahman',
    '080512-12-0456',
    'P',
    'Tingkatan 1',
    'Rahman Ali',
    '012-3456789',
    '18',
    'Diluluskan',
  ],
  [
    'Muhammad Daniel',
    '070930-12-1123',
    'L',
    'Tingkatan 2',
    'Hamid Yusof',
    '013-8801122',
    '35',
    'Dihantar',
  ],
  [
    'Nur Elisa',
    '080101-12-0780',
    'P',
    'Tingkatan 1',
    'Salmah Ahmad',
    '014-2203344',
    '12',
    'Disemak',
  ],
  [
    'Jovian Gimbang',
    '060715-12-0345',
    'L',
    'Tingkatan 4',
    'Gimbang Lojuin',
    '016-7712345',
    '42',
    'Dihantar',
  ],
  [
    'Siti Hajar',
    '050303-12-0990',
    'P',
    'Tingkatan 6',
    'Kassim Ibrahim',
    '017-6655443',
    '27',
    'Ditolak',
  ],
];

export function createSeedApplications(): HostelApplication[] {
  return SEED_ROWS.map((row, index) => ({
    id: `A${101 + index}`,
    nama: row[0],
    kp: row[1],
    jantina: row[2],
    tkt: row[3],
    penjaga: row[4],
    tel: row[5],
    jarak: row[6],
    alamat: 'Kg. Salaping, Kota Marudu, Sabah',
    sebab:
      'Jarak tempat tinggal yang jauh daripada sekolah dan kemudahan pengangkutan terhad.',
    fail: 'borang-kesihatan.pdf',
    status: row[7],
    tarikh: `2026-11-${10 + index}`,
    dorm: index === 0 ? '1A' : '',
  }));
}

export function createEmptyForm(): ApplicationFormFields {
  return {
    nama: '',
    kp: '',
    jantina: 'L',
    tkt: 'Tingkatan 1',
    penjaga: '',
    tel: '',
    jarak: '',
    alamat: '',
    sebab: '',
  };
}

export function createEmptyDraft(): DraftState {
  return {
    step: 0,
    checks: [false, false, false],
    form: createEmptyForm(),
    fileName: '',
    photoDataUrl: '',
  };
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadInitialDraft(): DraftState {
  const raw = loadFromStorage<Record<string, unknown> | null>(
    STORAGE_KEYS.DRAFT,
    null,
  );
  if (!raw || typeof raw !== 'object') {
    return createEmptyDraft();
  }
  const base = createEmptyDraft();
  const step =
    typeof raw.step === 'number' ? Math.max(0, Math.min(5, raw.step)) : 0;
  const rawChecks = Array.isArray(raw.checks)
    ? raw.checks
    : Array.isArray(raw.c)
      ? raw.c
      : [false, false, false];
  const checks: [boolean, boolean, boolean] = [
    Boolean(rawChecks[0]),
    Boolean(rawChecks[1]),
    Boolean(rawChecks[2]),
  ];
  const rawForm = (raw.form ?? raw.f ?? {}) as Partial<ApplicationFormFields>;
  const form: ApplicationFormFields = {
    ...base.form,
    ...rawForm,
    jantina: rawForm.jantina === 'P' ? 'P' : 'L',
    tkt: rawForm.tkt || 'Tingkatan 1',
  };
  const fileName =
    typeof raw.fileName === 'string'
      ? raw.fileName
      : typeof raw.file === 'string'
        ? raw.file
        : '';

  return {
    step,
    checks,
    form,
    fileName,
    fileType: typeof raw.fileType === 'string' ? raw.fileType : undefined,
    fileSize: typeof raw.fileSize === 'number' ? raw.fileSize : undefined,
    hasLocalFile: Boolean(raw.hasLocalFile),
    photoDataUrl:
      typeof raw.photoDataUrl === 'string' ? raw.photoDataUrl : '',
  };
}

export function downloadBlob(
  filename: string,
  content: string,
  mimeType: string,
  withBom = false,
): void {
  const parts = withBom ? ['\ufeff', content] : [content];
  const blob = new Blob(parts, {type: mimeType});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportApplicationsCsv(apps: HostelApplication[]): void {
  const headers = [
    'Rujukan',
    'Asrama',
    'Nama',
    'No KP',
    'Jantina',
    'Tingkatan',
    'Dorm',
    'Penjaga',
    'Telefon',
    'E-mel Pemohon',
    'Jarak km',
    'Alamat',
    'Sebab',
    'Borang Kesihatan',
    'Foto Pelajar',
    'Status',
    'Catatan Warden',
    'Tarikh',
  ];
  const rows = [
    headers,
    ...apps.map((a) => [
      a.id,
      getAsramaBlockName(a.jantina),
      a.nama,
      a.kp,
      a.jantina === 'P' ? 'Perempuan' : 'Lelaki',
      a.tkt,
      a.dorm || '',
      a.penjaga,
      a.tel,
      a.applicantEmail || '',
      a.jarak,
      a.alamat,
      a.sebab,
      a.fail,
      a.fotoDataUrl ? 'Ada' : 'Tiada',
      a.status,
      a.catatanWarden || '',
      a.tarikh,
    ]),
  ];
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\r\n');
  downloadBlob(
    'permohonan-asrama-2027.csv',
    csvContent,
    'text/csv;charset=utf-8',
    true,
  );
}

function buildExcelRows(apps: HostelApplication[]): (string | number)[][] {
  const headers = [
    'Bil',
    'No. Rujukan',
    'Kategori Asrama',
    'Nama Pelajar',
    'No. Kad Pengenalan',
    'Jantina',
    'Tingkatan',
    'Dorm',
    'Status',
    'Nama Ibu Bapa / Penjaga',
    'No. Telefon Penjaga',
    'E-mel Pemohon',
    'Jarak (km)',
    'Alamat Rumah',
    'Sebab Memohon',
    'Borang Kesihatan',
    'Foto Pelajar',
    'Catatan Warden',
    'Tarikh Dihantar',
  ];

  const rows = apps.map((a, idx) => [
    idx + 1,
    a.id,
    getAsramaBlockName(a.jantina),
    a.nama,
    a.kp,
    a.jantina === 'P' ? 'Perempuan' : 'Lelaki',
    a.tkt,
    a.dorm || '-',
    a.status,
    a.penjaga,
    a.tel,
    a.applicantEmail || '-',
    Number.isFinite(parseFloat(a.jarak)) ? parseFloat(a.jarak) : a.jarak,
    a.alamat || '-',
    a.sebab || '-',
    a.fail || '-',
    a.fotoDataUrl ? 'Ada' : 'Tiada',
    a.catatanWarden || '-',
    a.tarikh,
  ]);

  return [headers, ...rows];
}

function createWorksheetWithWidths(rows: (string | number)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    {wch: 5},
    {wch: 12},
    {wch: 16},
    {wch: 28},
    {wch: 18},
    {wch: 12},
    {wch: 14},
    {wch: 10},
    {wch: 14},
    {wch: 24},
    {wch: 16},
    {wch: 26},
    {wch: 12},
    {wch: 32},
    {wch: 34},
    {wch: 22},
    {wch: 12},
    {wch: 26},
    {wch: 14},
  ];
  return ws;
}

export function exportApplicationsExcel(
  apps: HostelApplication[],
  fileSuffix = 'aspura-aspuri',
): void {
  const wb = XLSX.utils.book_new();
  const aspuraApps = apps.filter((a) => a.jantina === 'L');
  const aspuriApps = apps.filter((a) => a.jantina === 'P');

  XLSX.utils.book_append_sheet(
    wb,
    createWorksheetWithWidths(buildExcelRows(aspuraApps)),
    'ASPURA',
  );
  XLSX.utils.book_append_sheet(
    wb,
    createWorksheetWithWidths(buildExcelRows(aspuriApps)),
    'ASPURI',
  );
  XLSX.utils.book_append_sheet(
    wb,
    createWorksheetWithWidths(buildExcelRows(apps)),
    'Semua Permohonan',
  );

  const safeSuffix = fileSuffix.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  XLSX.writeFile(wb, `senarai-permohonan-asrama-2027-${safeSuffix}.xlsx`);
}

export function exportApplicationsJson(apps: HostelApplication[]): void {
  const cleanApps = apps.map(
    ({failDataUrl: _omitFile, fotoDataUrl: _omitPhoto, ...rest}) => rest,
  );
  downloadBlob(
    'permohonan-asrama-2027.json',
    JSON.stringify(cleanApps, null, 2),
    'application/json;charset=utf-8',
    false,
  );
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
