import React, {useEffect, useRef, useState} from 'react';
import {User} from 'firebase/auth';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  LogIn,
  Printer,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  APPLICATION_STEPS,
  ApplicationFormFields,
  DraftState,
  getAsramaBlockName,
  HostelApplication,
  TINGKATAN_OPTIONS,
} from '../types/hostel';
import {
  deleteLocalAttachment,
  getLocalAttachment,
  prepareFileForCloudStorage,
  saveLocalAttachment,
} from '../utils/fileStorage';
import {downloadApplicationPdf} from '../utils/pdfExport';
import {formatFileSize} from '../utils/storage';
import {StatusBadge} from './StatusBadge';
import {StudentPhotoCapture} from './StudentPhotoCapture';

const DRAFT_ATTACHMENT_KEY = 'draft-current';

interface ApplicationWizardProps {
  user: User | null;
  authReady: boolean;
  myApplications: HostelApplication[];
  draft: DraftState;
  onUpdateDraft: (next: DraftState) => void;
  onSignIn: () => Promise<void>;
  onSubmitApplication: (
    draft: DraftState,
    cloudDataUrl: string | null,
  ) => Promise<string>;
  onOpenHealthForm: () => void;
  onGoToCheckStatus: () => void;
  onNotify: (message: string) => void;
}

export const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  user,
  authReady,
  myApplications,
  draft,
  onUpdateDraft,
  onSignIn,
  onSubmitApplication,
  onOpenHealthForm,
  onGoToCheckStatus,
  onNotify,
}) => {
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [cloudDataUrl, setCloudDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const step = draft.step;
  const form = draft.form;

  useEffect(() => {
    let active = true;
    if (!draft.fileName) {
      setPreviewDataUrl(null);
      setCloudDataUrl(null);
      return;
    }
    getLocalAttachment(DRAFT_ATTACHMENT_KEY).then((stored) => {
      if (!active || !stored) return;
      if (stored.mimeType.startsWith('image/')) {
        setPreviewDataUrl(stored.dataUrl);
      } else {
        setPreviewDataUrl(null);
      }
      if (stored.dataUrl.length <= 440000) {
        setCloudDataUrl(stored.dataUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [draft.fileName]);

  const setStep = (nextStep: number) => {
    const clamped = Math.max(
      0,
      Math.min(APPLICATION_STEPS.length - 1, nextStep),
    );
    onUpdateDraft({...draft, step: clamped});
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const toggleCheck = (index: 0 | 1 | 2, checked: boolean) => {
    const nextChecks: [boolean, boolean, boolean] = [...draft.checks] as [
      boolean,
      boolean,
      boolean,
    ];
    nextChecks[index] = checked;
    onUpdateDraft({...draft, checks: nextChecks});
  };

  const updateField = <K extends keyof ApplicationFormFields>(
    key: K,
    value: ApplicationFormFields[K],
  ) => {
    onUpdateDraft({
      ...draft,
      form: {
        ...draft.form,
        [key]: value,
      },
    });
  };

  const validateAndProceedStep4 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.photoDataUrl) {
      onNotify('Sila ambil gambar muka atau pilih foto pelajar daripada galeri.');
      return;
    }
    if (!form.nama.trim() || form.nama.trim().length < 2) {
      onNotify('Sila isi nama penuh pelajar.');
      return;
    }
    if (!/^\d{6}-?\d{2}-?\d{4}$/.test(form.kp.trim())) {
      onNotify('Format No. KP tidak sah. Contoh: 080512-12-0456');
      return;
    }
    if (!form.penjaga.trim() || form.penjaga.trim().length < 2) {
      onNotify('Sila isi nama ibu bapa / penjaga.');
      return;
    }
    if (!/^[0-9+\- ]{7,15}$/.test(form.tel.trim())) {
      onNotify('Sila isi nombor telefon penjaga yang sah.');
      return;
    }
    if (!(parseFloat(form.jarak) > 0)) {
      onNotify('Sila isi jarak rumah ke sekolah (km).');
      return;
    }
    setStep(4);
  };

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onNotify('Saiz fail melebihi 5MB. Sila pilih fail yang lebih kecil.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    const extAllowed = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extAllowed) {
      onNotify('Sila muat naik fail PDF, JPG, atau PNG sahaja.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingFile(true);
    try {
      const {fullDataUrl, cloudDataUrl: preparedCloudUrl} =
        await prepareFileForCloudStorage(file);

      await saveLocalAttachment({
        id: DRAFT_ATTACHMENT_KEY,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl: preparedCloudUrl || fullDataUrl,
        updatedAt: Date.now(),
      });

      setPreviewDataUrl(file.type.startsWith('image/') ? fullDataUrl : null);
      setCloudDataUrl(preparedCloudUrl);

      onUpdateDraft({
        ...draft,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        hasLocalFile: true,
      });
      onNotify('Fail borang kesihatan berjaya diproses.');
    } catch {
      onNotify('Gagal membaca fail yang dipilih. Sila cuba lagi.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleClearFile = async () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPreviewDataUrl(null);
    setCloudDataUrl(null);
    await deleteLocalAttachment(DRAFT_ATTACHMENT_KEY);
    onUpdateDraft({
      ...draft,
      fileName: '',
      fileType: undefined,
      fileSize: undefined,
      hasLocalFile: false,
    });
  };

  const handleFinalSubmit = async () => {
    if (!user) {
      await onSignIn();
      return;
    }
    setIsSubmitting(true);
    try {
      const refId = await onSubmitApplication(draft, cloudDataUrl);
      setPreviewDataUrl(null);
      setCloudDataUrl(null);
      setSubmittedRefId(refId);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.startsWith('DUPLICATE_KP:')) {
        onNotify(msg.replace('DUPLICATE_KP:', ''));
      } else {
        onNotify(
          'Gagal menghantar permohonan ke storan awan. Sila cuba lagi.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {submittedRefId ? (
        <section className="rounded-2xl border border-[#ece9f6] bg-white p-6 shadow-xs sm:p-8 dark:border-[#2a273d] dark:bg-[#1b1929]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                Permohonan Berjaya Disimpan ke Storan Awan
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
                Permohonan asrama anda telah direkodkan dalam pangkalan data
                sekolah. Simpan nombor rujukan di bawah untuk semakan status
                pada mana-mana peranti.
              </p>

              <div className="mt-5 inline-flex flex-col rounded-xl border border-[#ece9f6] bg-[#f8f7fc] px-5 py-3.5 dark:border-[#2a273d] dark:bg-[#13111f]">
                <span className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                  Nombor Rujukan Permohonan
                </span>
                <span className="font-mono-num mt-0.5 text-2xl font-bold tracking-tight text-[#6c3cf0] dark:text-[#a285ff]">
                  {submittedRefId}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedRefId(null);
                    onGoToCheckStatus();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] cursor-pointer"
                >
                  Semak Status Permohonan
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedRefId(null)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#e5e2f2] bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Permohonan Baru</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {/* Step Progress Bar */}
          <nav
            aria-label="Langkah permohonan"
            className="rounded-2xl border border-[#ece9f6] bg-white p-2 shadow-xs dark:border-[#2a273d] dark:bg-[#1b1929]"
          >
            <div className="mb-1.5 flex items-center justify-between px-2 pt-0.5 text-xs sm:hidden">
              <span className="font-mono-num font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                Langkah {step + 1} / {APPLICATION_STEPS.length}
              </span>
              <span className="truncate font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                {APPLICATION_STEPS[step]}
              </span>
            </div>
            <ol className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {APPLICATION_STEPS.map((label, index) => {
                const isDone = index < step;
                const isCurrent = index === step;
                return (
                  <li key={label} className="min-w-[120px] flex-1 snap-start">
                    <button
                      type="button"
                      disabled={!isDone}
                      onClick={() => isDone && setStep(index)}
                      title={
                        isDone ? `Kembali ke langkah ${index + 1}` : undefined
                      }
                      className={`flex min-h-[44px] sm:min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border-b-2 px-2.5 py-2 text-center text-xs font-medium transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'border-[#6c3cf0] bg-[#ede8fd] font-bold text-[#5528d6] dark:border-[#a285ff] dark:bg-[#2a214a] dark:text-[#c7b4ff]'
                          : isDone
                            ? 'border-[#6c3cf0]/55 bg-transparent text-[#1d1b2e] hover:bg-[#f7f6fc] dark:border-[#a285ff]/55 dark:text-[#f2f0fa] dark:hover:bg-[#13111f] cursor-pointer'
                            : 'border-[#ece9f6] bg-transparent text-[#7d7996] dark:border-[#2a273d] dark:text-[#8f8aad] cursor-default'
                      }`}
                    >
                      {isDone ? (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[#6c3cf0] dark:text-[#a285ff]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="font-mono-num shrink-0">
                          {index + 1}.
                        </span>
                      )}
                      <span className="truncate">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Active Step Card */}
          <section className="rounded-2xl border border-[#ece9f6] bg-white p-5 shadow-xs sm:p-7 dark:border-[#2a273d] dark:bg-[#1b1929]">
            {step <= 2 && (
              <div>
                {step === 0 && (
                  <>
                    <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                      1. Muat turun &amp; cetak borang kesihatan
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
                      Buka atau muat turun Borang Pemeriksaan Kesihatan Pemohon
                      Asrama (format 1 muka surat A4), kemudian cetak dan bawa
                      ke klinik komuniti atau hospital berdaftar.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onOpenHealthForm}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#6c3cf0] bg-[#ede8fd]/60 px-4 py-2.5 text-sm font-semibold text-[#5528d6] transition-colors hover:bg-[#ede8fd] dark:border-[#a285ff] dark:bg-[#2a214a] dark:text-[#c7b4ff] cursor-pointer"
                      >
                        <Printer
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Buka / Cetak Borang Kesihatan (A4)</span>
                      </button>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                      2. Lengkapkan maklumat pada borang
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
                      Isi Bahagian A (Maklumat Pemohon), Bahagian B
                      (Pengisytiharan Sejarah Kesihatan) dan Bahagian E
                      (Pengakuan Ibu Bapa / Penjaga) sebelum menghadiri
                      pemeriksaan di klinik. Semak ejaan nama penuh dan nombor
                      kad pengenalan dengan teliti.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={onOpenHealthForm}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        <span>Semak semula borang A4</span>
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                      3. Pengesahan pegawai perubatan di klinik
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
                      Bawa borang ke klinik komuniti, klinik kesihatan, atau
                      hospital kerajaan/swasta berdaftar. Pastikan pegawai
                      perubatan melengkapkan Bahagian C &amp; D serta
                      menurunkan tandatangan dan cop rasmi klinik.
                    </p>
                  </>
                )}

                <label className="mt-5 flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-3.5 transition-colors hover:border-[#6c3cf0]/50 dark:border-[#2a273d] dark:bg-[#13111f]">
                  <input
                    type="checkbox"
                    checked={draft.checks[step]}
                    onChange={(e) =>
                      toggleCheck(step as 0 | 1 | 2, e.target.checked)
                    }
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#6c3cf0] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[#1d1b2e] dark:text-[#f2f0fa]">
                    Saya mengesahkan telah melaksanakan langkah ini
                  </span>
                </label>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] sm:min-h-[44px] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Kembali</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!draft.checks[step]}
                    onClick={() => setStep(step + 1)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[44px] sm:w-auto cursor-pointer"
                  >
                    <span>Seterusnya</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={validateAndProceedStep4} noValidate>
                <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                  4. Borang permohonan asrama
                </h2>
                <p className="mt-1.5 text-sm text-[#5e5a77] dark:text-[#a8a4c2]">
                  Ambil foto wajah pelajar serta isi maklumat pemohon dan
                  penjaga. Draf disimpan secara automatik sebelum dihantar ke
                  storan awan.
                </p>

                <div className="mt-5">
                  <StudentPhotoCapture
                    photoDataUrl={draft.photoDataUrl}
                    onChange={(nextUrl) =>
                      onUpdateDraft({...draft, photoDataUrl: nextUrl})
                    }
                    onNotify={onNotify}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="f_nama"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      Nama penuh pelajar *
                    </label>
                    <input
                      id="f_nama"
                      type="text"
                      autoComplete="name"
                      maxLength={150}
                      placeholder="cth: Ahmad bin Abdullah"
                      value={form.nama}
                      onChange={(e) => updateField('nama', e.target.value)}
                      className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="f_kp"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      No. Kad Pengenalan *
                    </label>
                    <input
                      id="f_kp"
                      type="text"
                      autoComplete="off"
                      maxLength={20}
                      placeholder="080512-12-0456"
                      value={form.kp}
                      onChange={(e) => updateField('kp', e.target.value)}
                      className="font-mono-num min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="f_jantina"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      Jantina
                    </label>
                    <select
                      id="f_jantina"
                      value={form.jantina}
                      onChange={(e) =>
                        updateField(
                          'jantina',
                          e.target.value === 'P' ? 'P' : 'L',
                        )
                      }
                      className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    >
                      <option value="L">Lelaki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="f_tkt"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      Tingkatan 2027
                    </label>
                    <select
                      id="f_tkt"
                      value={form.tkt}
                      onChange={(e) => updateField('tkt', e.target.value)}
                      className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    >
                      {TINGKATAN_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="f_penjaga"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      Nama ibu bapa / penjaga *
                    </label>
                    <input
                      id="f_penjaga"
                      type="text"
                      autoComplete="off"
                      maxLength={150}
                      placeholder="cth: Abdullah bin Karim"
                      value={form.penjaga}
                      onChange={(e) => updateField('penjaga', e.target.value)}
                      className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="f_tel"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      No. telefon penjaga *
                    </label>
                    <input
                      id="f_tel"
                      type="tel"
                      autoComplete="tel"
                      maxLength={15}
                      placeholder="012-3456789"
                      value={form.tel}
                      onChange={(e) => updateField('tel', e.target.value)}
                      className="font-mono-num min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="f_jarak"
                      className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                    >
                      Jarak rumah ke sekolah (km) *
                    </label>
                    <input
                      id="f_jarak"
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.5"
                      placeholder="0"
                      value={form.jarak}
                      onChange={(e) => updateField('jarak', e.target.value)}
                      className="font-mono-num min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="f_alamat"
                    className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                  >
                    Alamat tempat tinggal
                  </label>
                  <textarea
                    id="f_alamat"
                    rows={2}
                    maxLength={500}
                    autoComplete="street-address"
                    placeholder="Kampung / Taman, Poskod, Daerah"
                    value={form.alamat}
                    onChange={(e) => updateField('alamat', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2.5 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="f_sebab"
                    className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                  >
                    Sebab memohon asrama
                  </label>
                  <textarea
                    id="f_sebab"
                    rows={2}
                    maxLength={1000}
                    placeholder="Nyatakan keperluan penginapan asrama (cth: jarak jauh, tiada pengangkutan)"
                    value={form.sebab}
                    onChange={(e) => updateField('sebab', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2.5 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/60 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                  />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] sm:min-h-[44px] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] sm:min-h-[44px] sm:w-auto cursor-pointer"
                  >
                    <span>Simpan dan teruskan</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div>
                <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                  5. Muat naik borang pengesahan kesihatan
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-[#5e5a77] dark:text-[#a8a4c2]">
                  Muat naik imbasan atau gambar borang kesihatan yang telah
                  disahkan serta dicop oleh klinik (format PDF, JPG, atau PNG,
                  maksimum 5MB). Imej akan dimampatkan secara automatik untuk
                  simpanan awan supaya dapat disemak oleh warden.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="health-file-input"
                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#6c3cf0]/45 bg-[#f8f7fc] p-6 text-center transition-colors hover:border-[#6c3cf0] hover:bg-[#ede8fd]/40 dark:border-[#a285ff]/40 dark:bg-[#13111f] dark:hover:border-[#a285ff]"
                  >
                    {isProcessingFile ? (
                      <Loader2
                        className="h-6 w-6 animate-spin text-[#6c3cf0] dark:text-[#a285ff]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload
                        className="h-6 w-6 text-[#6c3cf0] dark:text-[#a285ff]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="mt-2 text-sm font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                      {isProcessingFile
                        ? 'Sedang memproses fail...'
                        : 'Pilih fail daripada peranti'}
                    </span>
                    <span className="mt-0.5 text-xs text-[#7d7996] dark:text-[#9893b8]">
                      PDF, JPG, atau PNG · Maksimum 5MB
                    </span>
                    <input
                      id="health-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      className="sr-only"
                    />
                  </label>

                  {draft.fileName && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6c3cf0]/30 bg-[#ede8fd]/60 p-3.5 dark:border-[#a285ff]/30 dark:bg-[#2a214a]">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileCheck2
                          className="h-5 w-5 shrink-0 text-[#6c3cf0] dark:text-[#a285ff]"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                            {draft.fileName}
                          </p>
                          <p className="font-mono-num text-xs text-[#5e5a77] dark:text-[#c7c3df]">
                            {formatFileSize(draft.fileSize)}
                            {draft.fileSize ? ' · ' : ''}
                            {cloudDataUrl
                              ? 'Sedia untuk simpanan awan'
                              : 'Disimpan pada storan peranti'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#e5e2f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#b4372f] hover:bg-red-50 dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#ef7d74] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Buang</span>
                      </button>
                    </div>
                  )}

                  {previewDataUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-2 dark:border-[#2a273d] dark:bg-[#13111f]">
                      <img
                        src={previewDataUrl}
                        alt="Pratonton borang kesihatan yang dimuat naik"
                        className="mx-auto max-h-56 rounded object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] sm:min-h-[44px] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="button"
                    disabled={!draft.fileName || isProcessingFile}
                    onClick={() => setStep(5)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[44px] sm:w-auto cursor-pointer"
                  >
                    <span>Seterusnya</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
                  6. Semak dan hantar permohonan
                </h2>
                <p className="mt-1.5 text-sm text-[#5e5a77] dark:text-[#a8a4c2]">
                  Pastikan semua maklumat pemohon dan dokumen kesihatan adalah
                  tepat sebelum menghantar ke storan awan sekolah.
                </p>

                {draft.photoDataUrl && (
                  <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-3.5 dark:border-[#2a273d] dark:bg-[#13111f]">
                    <img
                      src={draft.photoDataUrl}
                      alt={`Foto wajah ${form.nama || 'pelajar'}`}
                      className="h-20 w-16 shrink-0 rounded-xl border border-[#e5e2f2] object-cover object-top dark:border-[#2e2a45]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]">
                        Foto Wajah Pelajar
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                        {form.nama || 'Pemohon Asrama'}
                      </p>
                      <p className="text-[11px] text-[#1f6f4a] dark:text-[#4cc38a]">
                        Foto sedia dimuat naik bersama permohonan
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 overflow-hidden rounded-xl border border-[#ece9f6] dark:border-[#2a273d]">
                  <dl className="divide-y divide-[#ece9f6] dark:divide-[#2a273d]">
                    {[
                      ['Nama pelajar', form.nama],
                      ['No. Kad Pengenalan', form.kp, true],
                      [
                        'Jantina',
                        form.jantina === 'L' ? 'Lelaki (L)' : 'Perempuan (P)',
                      ],
                      ['Tingkatan 2027', form.tkt],
                      ['Ibu bapa / Penjaga', form.penjaga],
                      ['No. Telefon Penjaga', form.tel, true],
                      [
                        'Jarak ke sekolah',
                        form.jarak ? `${form.jarak} km` : '—',
                        true,
                      ],
                      ['Alamat rumah', form.alamat || '—'],
                      ['Sebab memohon', form.sebab || '—'],
                      ['Borang kesihatan', draft.fileName || '—'],
                    ].map(([label, value, isMono]) => (
                      <div
                        key={String(label)}
                        className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] sm:gap-4"
                      >
                        <dt className="text-xs font-semibold text-[#7d7996] dark:text-[#9893b8]">
                          {label}
                        </dt>
                        <dd
                          className={`break-words text-sm font-medium text-[#1d1b2e] dark:text-[#f2f0fa] ${
                            isMono ? 'font-mono-num' : ''
                          }`}
                        >
                          {value || '—'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {authReady && !user && (
                  <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a273d] dark:bg-[#13111f]">
                    <div className="flex items-start gap-3">
                      <Cloud
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#6c3cf0] dark:text-[#a285ff]"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                          Log masuk diperlukan untuk simpanan awan
                        </p>
                        <p className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                          Sahkan identiti dengan akaun Google supaya rekod anda
                          dilindungi dan boleh disemak di mana-mana peranti.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5a2cd9] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span>Log Masuk Google</span>
                    </button>
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setStep(4)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] sm:min-h-[44px] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !authReady}
                    onClick={handleFinalSubmit}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] disabled:opacity-50 sm:min-h-[44px] sm:w-auto cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {isSubmitting
                        ? 'Menyimpan...'
                        : user
                          ? 'Hantar permohonan'
                          : 'Log Masuk & Hantar'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Signed-in Applicant's Cloud-Synced History */}
      {user && myApplications.length > 0 && (
        <section className="rounded-2xl border border-[#ece9f6] bg-white p-5 shadow-xs sm:p-6 dark:border-[#2a273d] dark:bg-[#1b1929]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece9f6] pb-3 dark:border-[#2a273d]">
            <div>
              <h2 className="font-display text-base font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                Permohonan Saya ({myApplications.length})
              </h2>
              <p className="text-xs text-[#7d7996] dark:text-[#9893b8]">
                Disimpan dalam storan awan untuk akaun {user.email}
              </p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-[#ece9f6] dark:divide-[#2a273d]">
            {myApplications.map((app) => {
              const asramaName = getAsramaBlockName(app.jantina);
              return (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {app.fotoDataUrl && (
                      <img
                        src={app.fotoDataUrl}
                        alt={`Foto ${app.nama}`}
                        className="h-11 w-11 shrink-0 rounded-xl border border-[#e5e2f2] object-cover object-top dark:border-[#2e2a45]"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#7d7996] dark:text-[#9893b8]">
                        <span className="font-mono-num font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                          {app.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{asramaName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{app.tkt}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{app.tarikh}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                        {app.nama}
                      </p>
                      {app.dorm && (
                        <p className="mt-0.5 text-xs font-semibold text-[#1f6f4a] dark:text-[#4cc38a]">
                          Penempatan: {asramaName} · Dorm {app.dorm}
                        </p>
                      )}
                      {app.status === 'Diluluskan' && (
                        <p className="mt-0.5 text-xs font-medium text-[#153e2b] dark:text-[#a7f3d0]">
                          Arahan: Sila download borang PDF ini dan bawa bersama
                          akuan kesihatan semasa pendaftaran.
                        </p>
                      )}
                      {app.catatanWarden && (
                        <p className="mt-0.5 text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                          Catatan warden: {app.catatanWarden}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <StatusBadge status={app.status} />
                    <button
                      type="button"
                      onClick={() => {
                        void downloadApplicationPdf({record: app})
                          .then(() =>
                            onNotify(
                              `Borang PDF ${app.id} berjaya dimuat turun.`,
                            ),
                          )
                          .catch(() =>
                            onNotify('Gagal menjana PDF. Sila cuba lagi.'),
                          );
                      }}
                      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        app.status === 'Diluluskan'
                          ? 'bg-[#1f6f4a] text-white hover:bg-[#17573a] dark:bg-[#2c8a5e]'
                          : 'border border-[#e5e2f2] bg-[#f8f7fc] text-[#6c3cf0] hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a285ff]'
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Muat Turun PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
