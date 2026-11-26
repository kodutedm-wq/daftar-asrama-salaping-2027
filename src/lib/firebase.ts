import {getApps, initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider} from 'firebase/auth';
import {doc, getDocFromServer, getFirestore} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export {firebaseConfig};
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt: 'select_account'});

export function getFirebaseAuthProvidersUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;
}

export function getFirebaseAuthErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as {code?: unknown}).code || '');
  }
  return '';
}

export function mapFirebaseAuthError(error: unknown): string {
  const code = getFirebaseAuthErrorCode(error);
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Kaedah log masuk E-mel/Kata Laluan belum diaktifkan di Firebase Console.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'ID (e-mel) atau kata laluan warden tidak tepat.';
    case 'auth/invalid-email':
      return 'Format alamat e-mel tidak sah.';
    case 'auth/email-already-in-use':
      return 'Alamat e-mel ini sudah didaftarkan dalam Firebase Authentication.';
    case 'auth/weak-password':
      return 'Kata laluan terlalu lemah. Gunakan sekurang-kurangnya 6 aksara.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percubaan log masuk. Sila tunggu beberapa minit dan cuba lagi.';
    case 'auth/user-disabled':
      return 'Akaun ini telah dinyahaktifkan oleh pentadbir.';
    case 'auth/popup-closed-by-user':
      return 'Log masuk Google dibatalkan.';
    default:
      return error instanceof Error
        ? error.message
        : 'Ralat pengesahan berlaku. Sila cuba lagi.';
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
