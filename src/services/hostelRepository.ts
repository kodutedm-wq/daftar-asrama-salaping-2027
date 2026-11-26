import {getApps, initializeApp} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  firebaseConfig,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  AdminRecord,
  ApplicationStatus,
  DraftState,
  HostelApplication,
  PublicStatusResult,
} from '../types/hostel';
import {
  deleteLocalAttachment,
  getLocalAttachment,
  saveLocalAttachment,
  sha256Hex,
} from '../utils/fileStorage';
import {createSeedApplications} from '../utils/storage';

const BOOTSTRAP_ADMIN_EMAIL = 'kodutedm@gmail.com';
const DRAFT_ATTACHMENT_KEY = 'draft-current';

export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return true;

  const adminPath = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, adminPath);
  }
}

export function subscribeAllApplications(
  onData: (apps: HostelApplication[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = 'applications';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()));
      items.sort((a, b) => (b.tarikh > a.tarikh ? 1 : -1));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    },
  );
}

export function subscribeMyApplications(
  uid: string,
  onData: (apps: HostelApplication[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = 'applications';
  const q = query(collection(db, path), where('applicantUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()));
      items.sort((a, b) => (b.tarikh > a.tarikh ? 1 : -1));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    },
  );
}

function mapApplicationDoc(
  id: string,
  raw: Record<string, unknown>,
): HostelApplication {
  return {
    id: String(raw.id || id),
    applicantUid:
      typeof raw.applicantUid === 'string' ? raw.applicantUid : undefined,
    applicantEmail:
      typeof raw.applicantEmail === 'string' ? raw.applicantEmail : undefined,
    nama: String(raw.nama || ''),
    kp: String(raw.kp || ''),
    jantina: raw.jantina === 'P' ? 'P' : 'L',
    tkt: String(raw.tkt || 'Tingkatan 1'),
    penjaga: String(raw.penjaga || ''),
    tel: String(raw.tel || ''),
    jarak: String(raw.jarak || '0'),
    alamat: String(raw.alamat || ''),
    sebab: String(raw.sebab || ''),
    fail: String(raw.fail || ''),
    failMimeType:
      typeof raw.failMimeType === 'string' ? raw.failMimeType : undefined,
    failSize: typeof raw.failSize === 'number' ? raw.failSize : undefined,
    hasCloudPreview: Boolean(raw.hasCloudPreview),
    fotoDataUrl: typeof raw.fotoDataUrl === 'string' ? raw.fotoDataUrl : '',
    status: (['Dihantar', 'Disemak', 'Diluluskan', 'Ditolak'].includes(
      String(raw.status),
    )
      ? raw.status
      : 'Dihantar') as ApplicationStatus,
    tarikh: String(raw.tarikh || ''),
    catatanWarden:
      typeof raw.catatanWarden === 'string' ? raw.catatanWarden : '',
    dorm: typeof raw.dorm === 'string' ? raw.dorm : '',
  };
}

function normalizeKp(kp: string): string {
  return kp.replace(/-/g, '').trim().toLowerCase();
}

async function generateUniqueCloudRefId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = `${String(Date.now()).slice(-3)}${Math.floor(10 + Math.random() * 89)}`;
    const candidate = `A${suffix}`;
    try {
      const existing = await getDoc(doc(db, 'applicationStatuses', candidate));
      if (!existing.exists()) {
        return candidate;
      }
    } catch {
      return candidate;
    }
  }
  return `A${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function submitApplicationToCloud(
  user: User,
  draft: DraftState,
  cloudDataUrl: string | null,
): Promise<string> {
  const normalizedKp = normalizeKp(draft.form.kp);
  const kpHash = await sha256Hex(normalizedKp);

  // Check if IC is already registered
  try {
    const existingKpSnap = await getDoc(doc(db, 'kpIndex', kpHash));
    if (existingKpSnap.exists()) {
      const existingRef = existingKpSnap.data()?.refId;
      throw new Error(
        `DUPLICATE_KP:No. Kad Pengenalan ini telah didaftarkan (Rujukan: ${existingRef || 'sedia ada'}).`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('DUPLICATE_KP:')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `kpIndex/${kpHash}`);
  }

  const refId = await generateUniqueCloudRefId();
  const today = new Date().toISOString().slice(0, 10);
  const safeFileName = (draft.fileName || 'borang-kesihatan.pdf').slice(0, 200);
  const safeMimeType = (draft.fileType || 'application/octet-stream').slice(
    0,
    100,
  );
  const safeFileSize = Math.max(
    0,
    Math.min(5242880, Math.round(draft.fileSize || 0)),
  );
  const hasCloudPreview = Boolean(
    cloudDataUrl && cloudDataUrl.length <= 450000,
  );

  const batch = writeBatch(db);
  const appRef = doc(db, 'applications', refId);
  const statusRef = doc(db, 'applicationStatuses', refId);
  const kpRef = doc(db, 'kpIndex', kpHash);

  batch.set(appRef, {
    id: refId,
    applicantUid: user.uid,
    applicantEmail: (user.email || '').slice(0, 200),
    nama: draft.form.nama.trim().slice(0, 150),
    kp: draft.form.kp.trim().slice(0, 20),
    jantina: draft.form.jantina === 'P' ? 'P' : 'L',
    tkt: draft.form.tkt.slice(0, 30),
    penjaga: draft.form.penjaga.trim().slice(0, 150),
    tel: draft.form.tel.trim().slice(0, 20),
    jarak: String(draft.form.jarak).trim().slice(0, 20),
    alamat: draft.form.alamat.trim().slice(0, 500),
    sebab: draft.form.sebab.trim().slice(0, 1000),
    fail: safeFileName,
    failMimeType: safeMimeType,
    failSize: safeFileSize,
    hasCloudPreview,
    fotoDataUrl: (draft.photoDataUrl || '').slice(0, 220000),
    status: 'Dihantar',
    tarikh: today,
    catatanWarden: '',
    dorm: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(statusRef, {
    id: refId,
    applicantUid: user.uid,
    tkt: draft.form.tkt.slice(0, 30),
    status: 'Dihantar',
    tarikh: today,
    hasHealthForm: Boolean(draft.fileName),
    catatanWarden: '',
    dorm: '',
    asrama: draft.form.jantina === 'P' ? 'Aspuri' : 'Aspura',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(kpRef, {
    refId,
    applicantUid: user.uid,
    createdAt: serverTimestamp(),
  });

  if (hasCloudPreview && cloudDataUrl) {
    const fileRef = doc(db, 'applicationFiles', refId);
    batch.set(fileRef, {
      applicationId: refId,
      applicantUid: user.uid,
      fileName: safeFileName,
      mimeType: safeMimeType,
      sizeBytes: safeFileSize,
      dataUrl: cloudDataUrl,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `applications/${refId}`);
  }

  // Copy local attachment under final application ID if present
  const localDraftFile = await getLocalAttachment(DRAFT_ATTACHMENT_KEY);
  if (localDraftFile) {
    await saveLocalAttachment({
      ...localDraftFile,
      id: refId,
      updatedAt: Date.now(),
    });
    await deleteLocalAttachment(DRAFT_ATTACHMENT_KEY);
  }

  return refId;
}

export async function updateApplicationStatusInCloud(
  id: string,
  status: ApplicationStatus,
  catatanWarden = '',
  dorm = '',
  jantina?: 'L' | 'P',
): Promise<void> {
  const safeNotes = catatanWarden.trim().slice(0, 500);
  const safeDorm = dorm.trim().slice(0, 30);
  const batch = writeBatch(db);
  batch.update(doc(db, 'applications', id), {
    status,
    catatanWarden: safeNotes,
    dorm: safeDorm,
    updatedAt: serverTimestamp(),
  });
  const statusUpdate: Record<string, unknown> = {
    status,
    catatanWarden: safeNotes,
    dorm: safeDorm,
    updatedAt: serverTimestamp(),
  };
  if (jantina === 'L' || jantina === 'P') {
    statusUpdate.asrama = jantina === 'P' ? 'Aspuri' : 'Aspura';
  }
  batch.update(doc(db, 'applicationStatuses', id), statusUpdate);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `applications/${id}`);
  }
}

export async function fetchApplicationFileAttachment(
  applicationId: string,
): Promise<{
  dataUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  source: 'cloud' | 'local';
} | null> {
  const path = `applicationFiles/${applicationId}`;
  try {
    const snap = await getDoc(doc(db, 'applicationFiles', applicationId));
    if (snap.exists()) {
      const d = snap.data();
      return {
        dataUrl: String(d.dataUrl || ''),
        fileName: String(d.fileName || ''),
        mimeType: String(d.mimeType || ''),
        sizeBytes: Number(d.sizeBytes || 0),
        source: 'cloud',
      };
    }
  } catch (error) {
    // Only fail loudly if not a missing document
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (!msg.includes('not-found')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  const local = await getLocalAttachment(applicationId);
  if (local) {
    return {
      dataUrl: local.dataUrl,
      fileName: local.fileName,
      mimeType: local.mimeType,
      sizeBytes: local.sizeBytes,
      source: 'local',
    };
  }
  return null;
}

export async function lookupStatusInCloud(
  rawQuery: string,
  currentUser: User | null,
  isAdmin: boolean,
): Promise<PublicStatusResult | null> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;

  let refId = trimmed.toUpperCase();

  // If input looks like an IC number, resolve via kpIndex hash first
  if (/^\d{6}-?\d{2}-?\d{4}$/.test(trimmed)) {
    const kpHash = await sha256Hex(normalizeKp(trimmed));
    const kpPath = `kpIndex/${kpHash}`;
    try {
      const kpSnap = await getDoc(doc(db, 'kpIndex', kpHash));
      if (!kpSnap.exists()) {
        return null;
      }
      refId = String(kpSnap.data()?.refId || '');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, kpPath);
    }
  }

  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(refId)) {
    return null;
  }

  const statusPath = `applicationStatuses/${refId}`;
  let statusSnap;
  try {
    statusSnap = await getDoc(doc(db, 'applicationStatuses', refId));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, statusPath);
  }

  if (!statusSnap.exists()) {
    return null;
  }

  const s = statusSnap.data();
  const result: PublicStatusResult = {
    id: String(s.id || refId),
    tkt: String(s.tkt || ''),
    status: String(s.status || 'Dihantar') as ApplicationStatus,
    tarikh: String(s.tarikh || ''),
    hasHealthForm: Boolean(s.hasHealthForm),
    catatanWarden:
      typeof s.catatanWarden === 'string' ? s.catatanWarden : undefined,
    dorm: typeof s.dorm === 'string' ? s.dorm : undefined,
    asrama:
      s.asrama === 'Aspuri' || s.asrama === 'Aspura' ? s.asrama : undefined,
  };

  // Enrich with full PII record ONLY if signed in as owner or warden/admin
  if (
    currentUser &&
    (isAdmin || s.applicantUid === currentUser.uid)
  ) {
    try {
      const fullSnap = await getDoc(doc(db, 'applications', refId));
      if (fullSnap.exists()) {
        result.fullRecord = mapApplicationDoc(fullSnap.id, fullSnap.data());
      }
    } catch {
      // Fall back to non-PII public status view cleanly
    }
  }

  return result;
}

export async function clearApplicationsInCloud(
  apps: HostelApplication[],
): Promise<void> {
  if (apps.length === 0) return;

  const batch = writeBatch(db);
  for (const app of apps) {
    batch.delete(doc(db, 'applications', app.id));
    batch.delete(doc(db, 'applicationStatuses', app.id));
    batch.delete(doc(db, 'applicationFiles', app.id));
    if (app.kp) {
      const hash = await sha256Hex(normalizeKp(app.kp));
      batch.delete(doc(db, 'kpIndex', hash));
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'applications');
  }
}

export async function seedSampleApplicationsInCloud(
  user: User,
  existingApps: HostelApplication[],
): Promise<void> {
  const seeds = createSeedApplications();
  const deleteIds = new Set<string>([
    ...existingApps.map((a) => a.id),
    ...seeds.map((s) => s.id),
  ]);

  // Delete any pre-existing records cleanly first
  if (deleteIds.size > 0) {
    const deleteBatch = writeBatch(db);
    for (const id of deleteIds) {
      deleteBatch.delete(doc(db, 'applications', id));
      deleteBatch.delete(doc(db, 'applicationStatuses', id));
      deleteBatch.delete(doc(db, 'applicationFiles', id));
    }
    for (const app of existingApps) {
      if (app.kp) {
        const hash = await sha256Hex(normalizeKp(app.kp));
        deleteBatch.delete(doc(db, 'kpIndex', hash));
      }
    }
    for (const seed of seeds) {
      const hash = await sha256Hex(normalizeKp(seed.kp));
      deleteBatch.delete(doc(db, 'kpIndex', hash));
    }
    try {
      await deleteBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'applications');
    }
  }

  // Create fresh seed records atomically
  const createBatch = writeBatch(db);
  for (const seed of seeds) {
    const kpHash = await sha256Hex(normalizeKp(seed.kp));
    createBatch.set(doc(db, 'applications', seed.id), {
      id: seed.id,
      applicantUid: user.uid,
      applicantEmail: (user.email || '').slice(0, 200),
      nama: seed.nama,
      kp: seed.kp,
      jantina: seed.jantina,
      tkt: seed.tkt,
      penjaga: seed.penjaga,
      tel: seed.tel,
      jarak: seed.jarak,
      alamat: seed.alamat,
      sebab: seed.sebab,
      fail: seed.fail,
      failMimeType: 'application/pdf',
      failSize: 148000,
      hasCloudPreview: false,
      fotoDataUrl: '',
      status: seed.status,
      tarikh: seed.tarikh,
      catatanWarden: '',
      dorm: seed.dorm || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    createBatch.set(doc(db, 'applicationStatuses', seed.id), {
      id: seed.id,
      applicantUid: user.uid,
      tkt: seed.tkt,
      status: seed.status,
      tarikh: seed.tarikh,
      hasHealthForm: true,
      catatanWarden: '',
      dorm: seed.dorm || '',
      asrama: seed.jantina === 'P' ? 'Aspuri' : 'Aspura',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    createBatch.set(doc(db, 'kpIndex', kpHash), {
      refId: seed.id,
      applicantUid: user.uid,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await createBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'applications');
  }
}

export function subscribeAdminRecords(
  onData: (admins: AdminRecord[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = 'admins';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AdminRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          uid: String(raw.uid || d.id),
          email: String(raw.email || ''),
          nama: String(raw.nama || ''),
        };
      });
      items.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    },
  );
}

export async function createWardenAccountInCloud(params: {
  nama: string;
  email: string;
  password: string;
}): Promise<{uid: string; email: string; nama: string; verificationSent: boolean}> {
  const cleanName = params.nama.trim().slice(0, 150);
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 200);
  const cleanPassword = params.password;

  const secondaryName = 'warden-provisioner';
  const secondaryApp =
    getApps().find((a) => a.name === secondaryName) ||
    initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    cleanEmail,
    cleanPassword,
  );
  const newUid = cred.user.uid;

  if (cleanName) {
    try {
      await updateProfile(cred.user, {displayName: cleanName});
    } catch {
      // Non-fatal if display name update fails
    }
  }

  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user);
    verificationSent = true;
  } catch {
    verificationSent = false;
  }

  try {
    await signOut(secondaryAuth);
  } catch {
    // Ignore secondary signOut cleanup errors
  }

  const adminPath = `admins/${newUid}`;
  try {
    await setDoc(doc(db, 'admins', newUid), {
      uid: newUid,
      email: cleanEmail,
      nama: cleanName || 'Warden Asrama',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, adminPath);
  }

  return {
    uid: newUid,
    email: cleanEmail,
    nama: cleanName || 'Warden Asrama',
    verificationSent,
  };
}

export async function registerAdminUidInCloud(params: {
  uid: string;
  email: string;
  nama: string;
}): Promise<void> {
  const cleanUid = params.uid.trim();
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 200);
  const cleanNama = params.nama.trim().slice(0, 150) || 'Warden Asrama';
  const adminPath = `admins/${cleanUid}`;

  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: cleanEmail,
      nama: cleanNama,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, adminPath);
  }
}

export async function removeAdminInCloud(uid: string): Promise<void> {
  const adminPath = `admins/${uid}`;
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, adminPath);
  }
}

