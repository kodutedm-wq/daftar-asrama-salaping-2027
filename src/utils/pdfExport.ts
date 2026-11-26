import {jsPDF} from 'jspdf';
import {
  getAsramaBlockName,
  HostelApplication,
  PublicStatusResult,
} from '../types/hostel';
import {SCHOOL_LOGO_URL} from './storage';

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function downloadApplicationPdf(params: {
  record?: HostelApplication;
  publicStatus?: PublicStatusResult;
}): Promise<void> {
  const {record, publicStatus} = params;
  if (!record && !publicStatus) return;

  const id = record?.id || publicStatus?.id || 'ASRAMA';
  const status = record?.status || publicStatus?.status || 'Dihantar';
  const tkt = record?.tkt || publicStatus?.tkt || '-';
  const tarikh = record?.tarikh || publicStatus?.tarikh || '-';
  const dorm = (record?.dorm ?? publicStatus?.dorm ?? '').trim();
  const catatanWarden = (
    record?.catatanWarden ??
    publicStatus?.catatanWarden ??
    ''
  ).trim();
  const asrama = record
    ? getAsramaBlockName(record.jantina)
    : publicStatus?.asrama || '-';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // School header band
  const logoDataUrl = await loadImageAsDataUrl(SCHOOL_LOGO_URL);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, y, 18, 18);
    } catch {
      // Ignore logo decode fallback
    }
  }

  const textLeft = logoDataUrl ? margin + 22 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(29, 27, 46);
  doc.text('SEKOLAH MENENGAH KEBANGSAAN SALAPING', textLeft, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(94, 90, 119);
  doc.text('Peti Surat 320, 89108 Kota Marudu, Sabah', textLeft, y + 10.5);
  doc.text(
    'Portal Permohonan & Pendaftaran Asrama · Sesi Persekolahan 2027',
    textLeft,
    y + 15,
  );

  y += 22;
  doc.setDrawColor(108, 60, 240);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Document Title Banner
  doc.setFillColor(108, 60, 240);
  doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  const titleText =
    status === 'Diluluskan'
      ? 'BORANG PERMOHONAN & TAWARAN PENDAFTARAN ASRAMA 2027'
      : 'SALINAN BORANG PERMOHONAN ASRAMA SMK SALAPING 2027';
  doc.text(titleText, pageWidth / 2, y + 7, {align: 'center'});
  y += 15;

  // Placement & Student Photo Row
  const hasPhoto = Boolean(record?.fotoDataUrl);
  const photoW = 28;
  const photoH = 34;
  const boxWidth = hasPhoto ? contentWidth - photoW - 5 : contentWidth;
  const boxHeight = hasPhoto ? photoH : 28;

  if (status === 'Diluluskan') {
    doc.setFillColor(236, 249, 241);
    doc.setDrawColor(31, 111, 74);
  } else {
    doc.setFillColor(248, 247, 252);
    doc.setDrawColor(210, 205, 232);
  }
  doc.setLineWidth(0.45);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(94, 90, 119);
  doc.text('NO. RUJUKAN', margin + 5, y + 6.5);
  doc.text('STATUS PERMOHONAN', margin + 45, y + 6.5);
  doc.text('KATEGORI & DORM', margin + 100, y + 6.5);

  doc.setFontSize(12);
  doc.setTextColor(108, 60, 240);
  doc.text(id, margin + 5, y + 13);

  doc.setTextColor(
    status === 'Diluluskan' ? 31 : status === 'Ditolak' ? 180 : 29,
    status === 'Diluluskan' ? 111 : status === 'Ditolak' ? 55 : 27,
    status === 'Diluluskan' ? 74 : status === 'Ditolak' ? 47 : 46,
  );
  doc.text(status.toUpperCase(), margin + 45, y + 13);

  doc.setTextColor(29, 27, 46);
  const dormLabel = dorm
    ? `${asrama !== '-' ? `${asrama} · ` : ''}Dorm ${dorm}`
    : asrama !== '-'
      ? `${asrama} (Dorm belum ditetapkan)`
      : 'Belum ditetapkan';
  doc.text(dormLabel, margin + 100, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(status === 'Diluluskan' ? 21 : 94, status === 'Diluluskan' ? 74 : 90, status === 'Diluluskan' ? 48 : 119);
  const infoSubLine =
    status === 'Diluluskan'
      ? 'Sila bawa borang PDF ini bersama Akuan Kesihatan (disahkan klinik) semasa hari pendaftaran.'
      : `Tarikh permohonan online: ${tarikh} · Tingkatan: ${tkt}`;
  doc.text(infoSubLine, margin + 5, y + (hasPhoto ? 23 : 20.5), {
    maxWidth: boxWidth - 10,
  });

  if (hasPhoto && record?.fotoDataUrl) {
    const photoX = margin + boxWidth + 5;
    doc.setDrawColor(210, 205, 232);
    doc.roundedRect(photoX, y, photoW, photoH, 2, 2, 'S');
    try {
      const format = record.fotoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(
        record.fotoDataUrl,
        format,
        photoX + 0.8,
        y + 0.8,
        photoW - 1.6,
        photoH - 1.6,
      );
    } catch {
      // Skip invalid image safely
    }
  }

  y += boxHeight + 7;

  // Section 1: Applicant details table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 27, 46);
  doc.text('A. MAKLUMAT BORANG PERMOHONAN ONLINE & PENJAGA', margin, y);
  y += 3;

  const detailRows: Array<[string, string]> = record
    ? [
        ['Nama Penuh Pelajar', record.nama],
        ['No. Kad Pengenalan', record.kp],
        [
          'Jantina / Blok Asrama',
          `${record.jantina === 'P' ? 'Perempuan' : 'Lelaki'} (${asrama})`,
        ],
        ['Tingkatan (Sesi 2027)', record.tkt],
        ['Penempatan Dorm', dorm ? `Dorm ${dorm} (${asrama})` : 'Belum ditetapkan'],
        ['Nama Ibu Bapa / Penjaga', record.penjaga],
        ['No. Telefon Penjaga', record.tel],
        ['Jarak Rumah ke Sekolah', `${record.jarak} km`],
        ['Alamat Tempat Tinggal', record.alamat || '-'],
        ['Sebab Memohon Asrama', record.sebab || '-'],
        ['Akuan / Borang Kesihatan', record.fail || 'Dilampirkan'],
        ['Tarikh Permohonan Online', record.tarikh],
      ]
    : [
        ['No. Rujukan Permohonan', id],
        ['Tingkatan (Sesi 2027)', tkt],
        ['Kategori Asrama', asrama],
        ['Penempatan Dorm', dorm ? `Dorm ${dorm}` : 'Belum ditetapkan'],
        ['Status Semasa', status],
        [
          'Akuan / Borang Kesihatan',
          publicStatus?.hasHealthForm ? 'Dilampirkan' : 'Tiada',
        ],
        ['Tarikh Dihantar', tarikh],
        [
          'Nama / No. KP Pelajar',
          'Log masuk akaun Google pemohon pada portal untuk mencetak butiran penuh permohonan online',
        ],
      ];

  if (catatanWarden) {
    detailRows.push(['Catatan Warden', catatanWarden]);
  }

  const labelColW = 54;
  const valueColW = contentWidth - labelColW;

  for (const [label, rawValue] of detailRows) {
    const valueLines = doc.splitTextToSize(
      String(rawValue || '-'),
      valueColW - 6,
    ) as string[];
    const rowH = Math.max(7.2, valueLines.length * 4.5 + 3);

    if (y + rowH > 268) {
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(248, 247, 252);
    doc.setDrawColor(226, 222, 240);
    doc.setLineWidth(0.25);
    doc.rect(margin, y, labelColW, rowH, 'FD');

    doc.setFillColor(255, 255, 255);
    doc.rect(margin + labelColW, y, valueColW, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    doc.setTextColor(84, 80, 108);
    doc.text(label, margin + 3, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(29, 27, 46);
    doc.text(valueLines, margin + labelColW + 3, y + 4.8);

    y += rowH;
  }

  y += 7;
  if (y + 52 > 282) {
    doc.addPage();
    y = 18;
  }

  // Section 2: Registration checklist
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 27, 46);
  doc.text('B. ARAHAN & SENARAI SEMAK HARI PENDAFTARAN', margin, y);
  y += 3;

  doc.setFillColor(250, 249, 254);
  doc.setDrawColor(226, 222, 240);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  const checklist = [
    '[  ]  Membawa cetakan Borang Permohonan Asrama (PDF ini) yang diisi secara online.',
    '[  ]  Membawa Akuan Kesihatan / Borang Pemeriksaan Kesihatan asal yang disahkan klinik.',
    '[  ]  Membawa salinan Kad Pengenalan pelajar serta ibu bapa / penjaga.',
    '[  ]  Melapor diri di Blok & Dorm yang diluluskan pada hari pendaftaran asrama.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(58, 55, 78);
  checklist.forEach((item, idx) => {
    doc.text(item, margin + 4, y + 6 + idx * 5.6);
  });

  y += 34;

  // Section 3: Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 27, 46);
  doc.text('C. PENGESAHAN PENDAFTARAN & WARDEN ASRAMA', margin, y);
  y += 5;

  const sigW = (contentWidth - 10) / 2;
  doc.setDrawColor(190, 186, 212);
  doc.roundedRect(margin, y, sigW, 24, 2, 2, 'S');
  doc.roundedRect(margin + sigW + 10, y, sigW, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(94, 90, 119);
  doc.text('Tandatangan Ibu Bapa / Penjaga:', margin + 4, y + 6);
  doc.text('Nama:', margin + 4, y + 17);
  doc.text('Tarikh:', margin + 4, y + 21.5);

  doc.text('Disahkan oleh Warden / Pejabat Asrama:', margin + sigW + 14, y + 6);
  doc.text('Tandatangan & Cop:', margin + sigW + 14, y + 17);
  doc.text('Tarikh Lapor Diri:', margin + sigW + 14, y + 21.5);

  // Footer note
  doc.setFontSize(7.5);
  doc.setTextColor(135, 130, 160);
  doc.text(
    `Dijana secara rasmi daripada Portal Permohonan Asrama SMK Salaping 2027 · Rujukan: ${id}`,
    pageWidth / 2,
    289,
    {align: 'center'},
  );

  doc.save(`Borang-Pendaftaran-Asrama-${id}.pdf`);
}
