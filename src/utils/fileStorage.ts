const DB_NAME = 'asrama27_files';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;
const MAX_CLOUD_DATAURL_LENGTH = 440000;

export interface StoredAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  updatedAt: number;
}

function openFileDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak disokong oleh pelayar ini.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'id'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Gagal membuka storan setempat.'));
  });
}

export async function saveLocalAttachment(
  attachment: StoredAttachment,
): Promise<void> {
  try {
    const db = await openFileDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(attachment);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB may be restricted in private browsing; ignore silently
  }
}

export async function getLocalAttachment(
  id: string,
): Promise<StoredAttachment | null> {
  try {
    const db = await openFileDb();
    const item = await new Promise<StoredAttachment | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () =>
        resolve((req.result as StoredAttachment | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return item;
  } catch {
    return null;
  }
}

export async function deleteLocalAttachment(id: string): Promise<void> {
  try {
    const db = await openFileDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca fail.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca fail.'));
    reader.readAsDataURL(file);
  });
}

export async function prepareFileForCloudStorage(file: File): Promise<{
  fullDataUrl: string;
  cloudDataUrl: string | null;
}> {
  const fullDataUrl = await readFileAsDataUrl(file);

  if (fullDataUrl.length <= MAX_CLOUD_DATAURL_LENGTH) {
    return {fullDataUrl, cloudDataUrl: fullDataUrl};
  }

  if (file.type.startsWith('image/')) {
    try {
      const compressed = await compressImageDataUrl(fullDataUrl, 1000, 0.76);
      if (compressed.length <= MAX_CLOUD_DATAURL_LENGTH) {
        return {fullDataUrl, cloudDataUrl: compressed};
      }
      const smaller = await compressImageDataUrl(fullDataUrl, 760, 0.62);
      return {
        fullDataUrl,
        cloudDataUrl:
          smaller.length <= MAX_CLOUD_DATAURL_LENGTH ? smaller : null,
      };
    } catch {
      return {fullDataUrl, cloudDataUrl: null};
    }
  }

  return {fullDataUrl, cloudDataUrl: null};
}

function compressImageDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width || 1, img.height || 1),
      );
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = dataUrl;
  });
}

export async function prepareStudentPortraitPhoto(
  source: File | string,
): Promise<string> {
  const rawDataUrl =
    typeof source === 'string' ? source : await readFileAsDataUrl(source);

  const attempts: Array<[number, number]> = [
    [560, 0.82],
    [440, 0.75],
    [360, 0.65],
  ];

  for (const [maxDim, quality] of attempts) {
    const compressed = await compressImageDataUrl(rawDataUrl, maxDim, quality);
    if (compressed.length <= 180000) {
      return compressed;
    }
  }

  const minimal = await compressImageDataUrl(rawDataUrl, 280, 0.55);
  if (minimal.length > 210000) {
    throw new Error('Saiz gambar terlalu besar untuk disimpan ke storan awan.');
  }
  return minimal;
}

export async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}
