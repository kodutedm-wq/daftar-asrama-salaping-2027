import React, {useState} from 'react';
import {Download, Printer, X} from 'lucide-react';
import {ApplicationFormFields} from '../types/hostel';
import {downloadBlob, SCHOOL_LOGO_URL} from '../utils/storage';

interface HealthFormModalProps {
  open: boolean;
  draftForm?: ApplicationFormFields;
  onClose: () => void;
  onNotify: (message: string) => void;
}

const HEALTH_ROWS: Array<[string, string]> = [
  ['Asma / Lelah', 'Alahan makanan'],
  ['Sawan / Epilepsi', 'Alahan ubat-ubatan'],
  ['Kencing manis (Diabetes)', 'Masalah penglihatan / rabun warna'],
  ['Darah tinggi', 'Masalah pendengaran / pertuturan'],
  ['Penyakit jantung', 'Kecacatan fizikal / status OKU'],
  ['Penyakit buah pinggang / hati', 'Penyakit berjangkit / kulit kronik'],
  ['Lain-lain penyakit / masalah kesihatan', 'Pernah wad / pembedahan'],
];

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const HealthFormModal: React.FC<HealthFormModalProps> = ({
  open,
  draftForm,
  onClose,
  onNotify,
}) => {
  const [prefillDraft, setPrefillDraft] = useState(false);

  if (!open) return null;

  const f = prefillDraft && draftForm ? draftForm : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const logoUrl = `${window.location.origin}${SCHOOL_LOGO_URL}`;
    const nama = f?.nama ? escapeHtml(f.nama) : '';
    const kp = f?.kp ? escapeHtml(f.kp) : '';
    const penjaga = f?.penjaga ? escapeHtml(f.penjaga) : '';
    const tel = f?.tel ? escapeHtml(f.tel) : '';
    const jarak = f?.jarak ? escapeHtml(`${f.jarak} km`) : '';
    const alamat = f?.alamat ? escapeHtml(f.alamat) : '';
    const tkt = f?.tkt ? escapeHtml(f.tkt.replace('Tingkatan ', '')) : '________';
    const boxL = f?.jantina === 'L' ? '&#10003;' : '';
    const boxP = f?.jantina === 'P' ? '&#10003;' : '';

    const htmlDoc = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Borang Pemeriksaan Kesihatan Asrama - SMK Salaping 2027</title>
<style>
  :root{--ink:#111;--mut:#333;--line:#444;--pri:#1f6f4a;--soft:#f3f6f3}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:#e8ebe7;color:var(--ink);font:9.5pt/1.18 Arial,Helvetica,sans-serif}
  .toolbar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff;border-bottom:1px solid #ccd6cf}
  .toolbar span{font-size:12px;color:#465}
  .btn{appearance:none;border:1px solid var(--pri);background:var(--pri);color:#fff;padding:6px 12px;border-radius:6px;font:600 12px Arial,sans-serif;cursor:pointer}
  .page{width:210mm;min-height:297mm;margin:8px auto;background:#fff;padding:7mm 8mm 7mm;box-shadow:0 4px 16px rgba(0,0,0,.12)}
  header{display:grid;grid-template-columns:38px 1fr 38px;gap:6px;align-items:center;border-bottom:1.4px solid var(--pri);padding-bottom:2px;margin-bottom:2px}
  header img{width:34px;height:34px;object-fit:contain}
  .head{text-align:center}
  .head .k{font-size:7.5pt;color:var(--mut);text-transform:uppercase;letter-spacing:.2px}
  h1{margin:0;font-size:11.5pt;line-height:1.1;color:var(--pri)}
  .head .s{font-size:9pt;font-weight:700}
  .note{font-size:7.5pt;color:#222;margin:1px 0 2px;line-height:1.15}
  h2{font-size:8.2pt;margin:3px 0 1px;padding:1.5px 5px;background:var(--soft);border:1px solid #cbd7cf;line-height:1.2}
  table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:2px}
  th,td{border:1px solid var(--line);padding:1.4px 3px;font-size:8.2pt;vertical-align:middle;overflow:hidden}
  th{background:#fafcf9;font-weight:700;text-align:left}
  .c{text-align:center}
  .box{display:inline-flex;align-items:center;justify-content:center;width:9px;height:9px;border:1px solid #222;vertical-align:middle;margin-right:2px;font-size:7px;line-height:1}
  .cb{display:inline-flex;align-items:center;gap:2px;margin-right:6px;white-space:nowrap}
  .small{font-size:7.3pt;font-weight:400}
  .sigcell{height:34px;vertical-align:bottom;padding-bottom:1px}
  .sigline{border-top:1px solid #333;margin-top:18px;padding-top:1px;font-size:7.2pt;text-align:center;color:#222}
  .decl{font-size:8pt;line-height:1.15;padding:2px 3px}
  .foot{font-size:7pt;color:#444;text-align:center;margin-top:2px}
  @page{size:A4;margin:6mm}
  @media print{
    html,body{background:#fff}
    .toolbar{display:none !important}
    .page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="toolbar">
  <span>Borang Pemeriksaan Kesihatan Asrama · SMK Salaping 2027 (1 muka surat A4)</span>
  <button class="btn" type="button" onclick="window.print()">Cetak / Simpan PDF</button>
</div>
<div class="page">
  <header>
    <img src="${logoUrl}" alt="Logo SMK Salaping" onerror="this.style.visibility='hidden'">
    <div class="head">
      <div class="k">SMK Salaping, Kota Marudu, Sabah</div>
      <h1>BORANG PEMERIKSAAN KESIHATAN PEMOHON ASRAMA</h1>
      <div class="s">Sesi Persekolahan 2027</div>
    </div>
    <div></div>
  </header>
  <div class="note"><b>Arahan:</b> Bahagian A, B &amp; E diisi oleh pemohon/ibu bapa/penjaga. Bahagian C &amp; D diisi dan disahkan oleh pegawai perubatan (klinik/hospital kerajaan atau swasta berdaftar). Sertakan borang lengkap bersama permohonan asrama.</div>
  <h2>BAHAGIAN A: MAKLUMAT PEMOHON</h2>
  <table>
    <colgroup><col style="width:18%"><col style="width:32%"><col style="width:14%"><col style="width:16%"><col style="width:20%"></colgroup>
    <tr><th>Nama penuh pelajar</th><td colspan="2">${nama}</td><th>No. Kad Pengenalan</th><td>${kp}</td></tr>
    <tr><th>Jantina / Tingkatan 2027</th><td><span class="cb"><span class="box">${boxL}</span>L</span><span class="cb"><span class="box">${boxP}</span>P</span> &nbsp; Tkt: ${tkt}</td><th>Tarikh lahir / Umur</th><td colspan="2"></td></tr>
    <tr><th>Nama ibu bapa/penjaga</th><td>${penjaga}</td><th>Hubungan</th><td></td><th>Tel. penjaga: ${tel}</th></tr>
    <tr><th>Tel. pelajar</th><td></td><th>Jarak ke sekolah (km)</th><td colspan="2">${jarak}</td></tr>
    <tr><th>Alamat tempat tinggal</th><td colspan="4">${alamat}</td></tr>
  </table>
  <h2>BAHAGIAN B: PENGISYTIHARAN SEJARAH KESIHATAN <span class="small">(Tandakan &#10003; pada "Ya" dan nyatakan butiran jika berkaitan)</span></h2>
  <table>
    <colgroup><col style="width:29%"><col style="width:4%"><col style="width:4%"><col style="width:29%"><col style="width:4%"><col style="width:4%"><col style="width:26%"></colgroup>
    <tr><th>Keadaan / Penyakit</th><th class="c">Ya</th><th class="c">Tdk</th><th>Keadaan / Penyakit</th><th class="c">Ya</th><th class="c">Tdk</th><th>Butiran / Catatan</th></tr>
    <tr><td>Asma / Lelah</td><td></td><td></td><td>Alahan makanan</td><td></td><td></td><td rowspan="7" style="vertical-align:top"></td></tr>
    <tr><td>Sawan / Epilepsi</td><td></td><td></td><td>Alahan ubat-ubatan</td><td></td><td></td></tr>
    <tr><td>Kencing manis (Diabetes)</td><td></td><td></td><td>Masalah penglihatan / rabun warna</td><td></td><td></td></tr>
    <tr><td>Darah tinggi</td><td></td><td></td><td>Masalah pendengaran / pertuturan</td><td></td><td></td></tr>
    <tr><td>Penyakit jantung</td><td></td><td></td><td>Kecacatan fizikal / status OKU</td><td></td><td></td></tr>
    <tr><td>Penyakit buah pinggang / hati</td><td></td><td></td><td>Penyakit berjangkit / kulit kronik</td><td></td><td></td></tr>
    <tr><td>Lain-lain penyakit / masalah kesihatan</td><td></td><td></td><td>Pernah wad / pembedahan</td><td></td><td></td></tr>
    <tr><th>Ubat berterusan</th><td colspan="2"><span class="cb"><span class="box"></span>Tiada</span><span class="cb"><span class="box"></span>Ada</span></td><th colspan="3">Keperluan khas / diet / lain-lain</th><td></td></tr>
  </table>
  <h2>BAHAGIAN C: PEMERIKSAAN FIZIKAL <span class="small">(Diisi oleh pegawai perubatan)</span></h2>
  <table>
    <colgroup><col style="width:18%"><col style="width:32%"><col style="width:18%"><col style="width:32%"></colgroup>
    <tr><th>Tarikh pemeriksaan</th><td></td><th>Nama klinik / hospital</th><td></td></tr>
    <tr><th>Tinggi (cm) / Berat (kg)</th><td></td><th>BMI / Tekanan darah</th><td></td></tr>
    <tr><th>Nadi / Suhu</th><td></td><th>Penglihatan (Kanan/Kiri)</th><td></td></tr>
    <tr><th>Rabun warna / Pendengaran</th><td></td><th>Ujian lain (jika ada)</th><td></td></tr>
    <tr><th>Pemeriksaan am &amp; penemuan</th><td colspan="3" style="height:24px;vertical-align:top"><span class="small">(jantung, paru-paru, abdomen, sistem saraf, dll.)</span></td></tr>
    <tr><th>Diagnosis / catatan perubatan</th><td colspan="3"></td></tr>
  </table>
  <h2>BAHAGIAN D: PENGESAHAN PEGAWAI PERUBATAN</h2>
  <table>
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr>
      <th>Keputusan</th>
      <td>
        <span class="cb"><span class="box"></span><b>SIHAT / SESUAI</b> tinggal di asrama</span>
        <span class="cb"><span class="box"></span>Sesuai <b>bersyarat</b></span>
        <span class="cb"><span class="box"></span><b>TIDAK SESUAI</b></span>
        &nbsp; <span class="small">Syarat/catatan: ______________________________</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:0;border:none">
        <table style="margin:0;border:none"><tr>
          <td class="sigcell" style="width:55%;border-top:1px solid var(--line)">
            <div class="sigline">Tandatangan &amp; Cop Rasmi Pegawai Perubatan</div>
            <div class="small">Nama / Jawatan: ________________________________ &nbsp; No. Pendaftaran: ____________</div>
          </td>
          <td class="sigcell" style="width:45%;border-top:1px solid var(--line);border-left:1px solid var(--line)">
            <div class="sigline">Tarikh &amp; No. Telefon Klinik/Hospital</div>
            <div class="small">Tarikh: ____ / ____ / 202__ &nbsp; Tel: __________________</div>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>
  <h2>BAHAGIAN E: PENGAKUAN IBU BAPA / PENJAGA</h2>
  <table>
    <tr><td class="decl">Saya, ${penjaga || '________________________________'} (No. K/P __________________), mengaku bahawa maklumat Bahagian A &amp; B adalah benar dan saya memberi kebenaran kepada pihak sekolah/warden SMK Salaping untuk mendapatkan rawatan perubatan kecemasan bagi anak/jagaan saya sekiranya diperlukan.</td></tr>
    <tr>
      <td style="padding:0;border:none">
        <table style="margin:0;border:none"><tr>
          <td class="sigcell" style="width:60%;border-top:1px solid var(--line)"><div class="sigline">Tandatangan Ibu Bapa / Penjaga</div></td>
          <td class="sigcell" style="width:40%;border-top:1px solid var(--line);border-left:1px solid var(--line)"><div class="sigline">Tarikh: ____ / ____ / 202__</div></td>
        </tr></table>
      </td>
    </tr>
  </table>
  <table style="margin-top:2px">
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr><th>Kegunaan Pejabat/Warden</th><td class="small">No. Rujukan: ____________ &nbsp; Tarikh terima: ____/____/202__ &nbsp; Disemak oleh: ________________ &nbsp; Status: ____________</td></tr>
  </table>
  <div class="foot">Borang Pemeriksaan Kesihatan Asrama · SMK Salaping, Kota Marudu · Sesi 2027</div>
</div>
</body>
</html>`;

    downloadBlob(
      'Borang-Pemeriksaan-Kesihatan-Asrama-SMK-Salaping-2027.html',
      htmlDoc,
      'text/html;charset=utf-8',
    );
    onNotify('Fail borang kesihatan (.html) berjaya dimuat turun.');
  };

  const hasDraftData = Boolean(
    draftForm &&
      (draftForm.nama ||
        draftForm.kp ||
        draftForm.penjaga ||
        draftForm.tel ||
        draftForm.alamat),
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#e8ebe7]/95 dark:bg-[#0d1410]/95 print:static print:overflow-visible print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Borang Pemeriksaan Kesihatan Asrama SMK Salaping 2027"
    >
      {/* Sticky Print Toolbar */}
      <div className="sticky top-0 z-10 border-b border-[#ece9f6] bg-white px-3 py-3 shadow-sm sm:px-4 dark:border-[#2a273d] dark:bg-[#1b1929] no-print">
        <div className="mx-auto flex max-w-[210mm] flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                Borang Pemeriksaan Kesihatan Asrama · SMK Salaping 2027
              </p>
              <p className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                Format 1 muka surat A4 sedia untuk cetakan atau simpanan PDF
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e5e2f2] bg-white text-[#5e5a77] hover:bg-[#f7f6fc] sm:hidden dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a8a4c2] cursor-pointer"
              aria-label="Tutup paparan borang"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasDraftData && (
              <label className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-1.5 text-xs font-medium text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefillDraft}
                  onChange={(e) => setPrefillDraft(e.target.checked)}
                  className="h-4 w-4 accent-[#6c3cf0]"
                />
                <span>Isi daripada draf</span>
              </label>
            )}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#6c3cf0] bg-white px-3.5 py-2 text-xs font-semibold text-[#6c3cf0] transition-colors hover:bg-[#ede8fd] sm:flex-initial dark:border-[#a285ff] dark:bg-transparent dark:text-[#a285ff] dark:hover:bg-[#2a214a] cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Muat Turun (.html)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6c3cf0] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5a2cd9] sm:flex-initial cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#e5e2f2] bg-white text-[#5e5a77] hover:bg-[#f7f6fc] sm:inline-flex dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a8a4c2] cursor-pointer"
              aria-label="Tutup paparan borang"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Scroll Hint */}
      <div className="mx-auto mt-3 max-w-[210mm] px-3 text-center text-xs font-medium text-[#5e5a77] sm:hidden dark:text-[#a8a4c2] no-print">
        Tatal borang ke kiri/kanan untuk pratonton penuh saiz A4.
      </div>

      {/* A4 Sheet */}
      <div className="overflow-x-auto px-3 pb-6 sm:px-4 print:overflow-visible print:p-0">
      <div className="print-only-sheet mx-auto my-3 w-[210mm] min-w-[210mm] bg-white p-[7mm_8mm] text-[#111111] shadow-lg sm:my-6 print:my-0 print:w-auto print:min-w-0 print:max-w-none print:p-0 print:shadow-none">
        <div style={{font: '9.3pt/1.18 Arial, Helvetica, sans-serif'}}>
          {/* Sheet Header */}
          <div className="mb-1 grid grid-cols-[38px_1fr_38px] items-center gap-2 border-b-[1.5px] border-[#1f6f4a] pb-1">
            <img
              src={SCHOOL_LOGO_URL}
              alt="Logo SMK Salaping"
              referrerPolicy="no-referrer"
              className="h-[34px] w-[34px] object-contain"
            />
            <div className="text-center">
              <div className="text-[7.5pt] tracking-wide text-[#333] uppercase">
                SMK Salaping, Kota Marudu, Sabah
              </div>
              <h1 className="m-0 text-[11.5pt] leading-[1.1] font-bold text-[#1f6f4a]">
                BORANG PEMERIKSAAN KESIHATAN PEMOHON ASRAMA
              </h1>
              <div className="text-[9pt] font-bold text-[#111]">
                Sesi Persekolahan 2027
              </div>
            </div>
            <div />
          </div>

          <p className="my-1 text-[7.5pt] leading-[1.18] text-[#222]">
            <b>Arahan:</b> Bahagian A, B &amp; E diisi oleh pemohon/ibu bapa/penjaga.
            Bahagian C &amp; D diisi dan disahkan oleh pegawai perubatan
            (klinik/hospital kerajaan atau swasta berdaftar). Sertakan borang
            lengkap bersama permohonan asrama.
          </p>

          {/* Bahagian A */}
          <div className="mt-1 mb-0.5 border border-[#c5d4cb] bg-[#f3f6f3] px-1.5 py-0.5 text-[8.2pt] font-bold text-[#111]">
            BAHAGIAN A: MAKLUMAT PEMOHON
          </div>
          <table className="mb-1 w-full table-fixed border-collapse text-[8.2pt]">
            <colgroup>
              <col style={{width: '18%'}} />
              <col style={{width: '32%'}} />
              <col style={{width: '15%'}} />
              <col style={{width: '15%'}} />
              <col style={{width: '20%'}} />
            </colgroup>
            <tbody>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Nama penuh pelajar
                </th>
                <td colSpan={2} className="border border-[#444] px-1 py-0.5">
                  {f?.nama || ''}
                </td>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  No. Kad Pengenalan
                </th>
                <td className="border border-[#444] px-1 py-0.5 font-mono text-[8pt]">
                  {f?.kp || ''}
                </td>
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Jantina / Tingkatan 2027
                </th>
                <td className="border border-[#444] px-1 py-0.5">
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-flex h-2.5 w-2.5 items-center justify-center border border-[#222] text-[7pt] leading-none">
                      {f?.jantina === 'L' ? '✓' : ''}
                    </span>
                    L
                  </span>
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-flex h-2.5 w-2.5 items-center justify-center border border-[#222] text-[7pt] leading-none">
                      {f?.jantina === 'P' ? '✓' : ''}
                    </span>
                    P
                  </span>
                  Tkt: {f?.tkt ? f.tkt.replace('Tingkatan ', '') : '________'}
                </td>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Tarikh lahir / Umur
                </th>
                <td colSpan={2} className="border border-[#444] px-1 py-0.5" />
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Nama ibu bapa/penjaga
                </th>
                <td className="border border-[#444] px-1 py-0.5">
                  {f?.penjaga || ''}
                </td>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Hubungan
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Tel. penjaga: <span className="font-normal">{f?.tel || ''}</span>
                </th>
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Tel. pelajar
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Jarak ke sekolah (km)
                </th>
                <td colSpan={2} className="border border-[#444] px-1 py-0.5">
                  {f?.jarak ? `${f.jarak} km` : ''}
                </td>
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Alamat tempat tinggal
                </th>
                <td colSpan={4} className="border border-[#444] px-1 py-0.5">
                  {f?.alamat || ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bahagian B */}
          <div className="mt-1 mb-0.5 border border-[#c5d4cb] bg-[#f3f6f3] px-1.5 py-0.5 text-[8.2pt] font-bold text-[#111]">
            BAHAGIAN B: PENGISYTIHARAN SEJARAH KESIHATAN{' '}
            <span className="text-[7.3pt] font-normal">
              (Tandakan ✓ pada &quot;Ya&quot; dan nyatakan butiran jika berkaitan)
            </span>
          </div>
          <table className="mb-1 w-full table-fixed border-collapse text-[8.2pt]">
            <colgroup>
              <col style={{width: '29%'}} />
              <col style={{width: '4%'}} />
              <col style={{width: '4%'}} />
              <col style={{width: '29%'}} />
              <col style={{width: '4%'}} />
              <col style={{width: '4%'}} />
              <col style={{width: '26%'}} />
            </colgroup>
            <tbody>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Keadaan / Penyakit
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-center font-bold">
                  Ya
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-center font-bold">
                  Tdk
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Keadaan / Penyakit
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-center font-bold">
                  Ya
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-center font-bold">
                  Tdk
                </th>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Butiran / Catatan
                </th>
              </tr>
              {HEALTH_ROWS.map(([left, right], index) => (
                <tr key={left}>
                  <td className="border border-[#444] px-1 py-0.5">{left}</td>
                  <td className="border border-[#444] px-1 py-0.5" />
                  <td className="border border-[#444] px-1 py-0.5" />
                  <td className="border border-[#444] px-1 py-0.5">{right}</td>
                  <td className="border border-[#444] px-1 py-0.5" />
                  <td className="border border-[#444] px-1 py-0.5" />
                  {index === 0 && (
                    <td
                      rowSpan={HEALTH_ROWS.length}
                      className="border border-[#444] px-1 py-0.5 align-top"
                    />
                  )}
                </tr>
              ))}
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Ubat berterusan
                </th>
                <td colSpan={2} className="border border-[#444] px-1 py-0.5">
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 border border-[#222]" />
                    Tiada
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 border border-[#222]" />
                    Ada
                  </span>
                </td>
                <th
                  colSpan={3}
                  className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold"
                >
                  Keperluan khas / diet / lain-lain
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
              </tr>
            </tbody>
          </table>

          {/* Bahagian C */}
          <div className="mt-1 mb-0.5 border border-[#c5d4cb] bg-[#f3f6f3] px-1.5 py-0.5 text-[8.2pt] font-bold text-[#111]">
            BAHAGIAN C: PEMERIKSAAN FIZIKAL{' '}
            <span className="text-[7.3pt] font-normal">
              (Diisi oleh pegawai perubatan)
            </span>
          </div>
          <table className="mb-1 w-full table-fixed border-collapse text-[8.2pt]">
            <colgroup>
              <col style={{width: '18%'}} />
              <col style={{width: '32%'}} />
              <col style={{width: '18%'}} />
              <col style={{width: '32%'}} />
            </colgroup>
            <tbody>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Tarikh pemeriksaan
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Nama klinik / hospital
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Tinggi (cm) / Berat (kg)
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  BMI / Tekanan darah
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Nadi / Suhu
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Penglihatan (Kanan/Kiri)
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Rabun warna / Pendengaran
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Ujian lain (jika ada)
                </th>
                <td className="border border-[#444] px-1 py-0.5" />
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Pemeriksaan am &amp; penemuan
                </th>
                <td
                  colSpan={3}
                  className="h-[24px] border border-[#444] px-1 py-0.5 align-top"
                >
                  <span className="text-[7.3pt] text-[#333]">
                    (jantung, paru-paru, abdomen, sistem saraf, dll.)
                  </span>
                </td>
              </tr>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Diagnosis / catatan perubatan
                </th>
                <td colSpan={3} className="border border-[#444] px-1 py-0.5" />
              </tr>
            </tbody>
          </table>

          {/* Bahagian D */}
          <div className="mt-1 mb-0.5 border border-[#c5d4cb] bg-[#f3f6f3] px-1.5 py-0.5 text-[8.2pt] font-bold text-[#111]">
            BAHAGIAN D: PENGESAHAN PEGAWAI PERUBATAN
          </div>
          <table className="mb-1 w-full table-fixed border-collapse text-[8.2pt]">
            <colgroup>
              <col style={{width: '18%'}} />
              <col style={{width: '82%'}} />
            </colgroup>
            <tbody>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Keputusan
                </th>
                <td className="border border-[#444] px-1 py-0.5">
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 border border-[#222]" />
                    <b>SIHAT / SESUAI</b> tinggal di asrama
                  </span>
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 border border-[#222]" />
                    Sesuai <b>bersyarat</b>
                  </span>
                  <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 border border-[#222]" />
                    <b>TIDAK SESUAI</b>
                  </span>
                  <span className="text-[7.3pt]">
                    Syarat/catatan: ______________________________
                  </span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-[#444] p-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="h-[34px] w-[55%] px-1.5 pb-0.5 align-bottom">
                          <div className="mt-4 border-t border-[#333] pt-0.5 text-center text-[7.2pt] text-[#222]">
                            Tandatangan &amp; Cop Rasmi Pegawai Perubatan
                          </div>
                          <div className="text-[7.2pt]">
                            Nama / Jawatan: ________________________________
                            &nbsp; No. Pendaftaran: ____________
                          </div>
                        </td>
                        <td className="h-[34px] w-[45%] border-l border-[#444] px-1.5 pb-0.5 align-bottom">
                          <div className="mt-4 border-t border-[#333] pt-0.5 text-center text-[7.2pt] text-[#222]">
                            Tarikh &amp; No. Telefon Klinik/Hospital
                          </div>
                          <div className="text-[7.2pt]">
                            Tarikh: ____ / ____ / 202__ &nbsp; Tel:
                            __________________
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bahagian E */}
          <div className="mt-1 mb-0.5 border border-[#c5d4cb] bg-[#f3f6f3] px-1.5 py-0.5 text-[8.2pt] font-bold text-[#111]">
            BAHAGIAN E: PENGAKUAN IBU BAPA / PENJAGA
          </div>
          <table className="mb-1 w-full border-collapse text-[8pt]">
            <tbody>
              <tr>
                <td className="border border-[#444] px-1.5 py-1 leading-[1.2]">
                  Saya,{' '}
                  {f?.penjaga ? (
                    <span className="font-semibold underline">{f.penjaga}</span>
                  ) : (
                    '________________________________'
                  )}{' '}
                  (No. K/P __________________), mengaku bahawa maklumat Bahagian
                  A &amp; B adalah benar dan saya memberi kebenaran kepada pihak
                  sekolah/warden SMK Salaping untuk mendapatkan rawatan
                  perubatan kecemasan bagi anak/jagaan saya sekiranya
                  diperlukan.
                </td>
              </tr>
              <tr>
                <td className="border border-[#444] p-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="h-[34px] w-[60%] px-1.5 pb-0.5 align-bottom">
                          <div className="mt-4 border-t border-[#333] pt-0.5 text-center text-[7.2pt] text-[#222]">
                            Tandatangan Ibu Bapa / Penjaga
                          </div>
                        </td>
                        <td className="h-[34px] w-[40%] border-l border-[#444] px-1.5 pb-0.5 align-bottom">
                          <div className="mt-4 border-t border-[#333] pt-0.5 text-center text-[7.2pt] text-[#222]">
                            Tarikh: ____ / ____ / 202__
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="mt-1 w-full table-fixed border-collapse text-[8pt]">
            <colgroup>
              <col style={{width: '18%'}} />
              <col style={{width: '82%'}} />
            </colgroup>
            <tbody>
              <tr>
                <th className="border border-[#444] bg-[#fafcf9] px-1 py-0.5 text-left font-bold">
                  Kegunaan Pejabat/Warden
                </th>
                <td className="border border-[#444] px-1 py-0.5 text-[7.3pt]">
                  No. Rujukan: ____________ &nbsp; Tarikh terima: ____/____/202__
                  &nbsp; Disemak oleh: ________________ &nbsp; Status:
                  ____________
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-1 text-center text-[7pt] text-[#444]">
            Borang Pemeriksaan Kesihatan Asrama · SMK Salaping, Kota Marudu ·
            Sesi 2027
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
