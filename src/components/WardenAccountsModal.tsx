import React, {useState} from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthProvidersUrl,
  mapFirebaseAuthError,
} from '../lib/firebase';
import {
  createWardenAccountInCloud,
  registerAdminUidInCloud,
  removeAdminInCloud,
} from '../services/hostelRepository';
import {AdminRecord} from '../types/hostel';

interface WardenAccountsModalProps {
  open: boolean;
  adminRecords: AdminRecord[];
  currentUserEmail: string | null;
  onClose: () => void;
  onNotify: (message: string) => void;
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$!';
  const all = upper + lower + digits + symbols;
  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = 0; i < 6; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  return chars.sort(() => Math.random() - 0.5).join('');
}

export const WardenAccountsModal: React.FC<WardenAccountsModalProps> = ({
  open,
  adminRecords,
  currentUserEmail,
  onClose,
  onNotify,
}) => {
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generateStrongPassword());
  const [showPassword, setShowPassword] = useState(true);
  const [uidInput, setUidInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsConsoleEnable, setNeedsConsoleEnable] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    nama: string;
    email: string;
    password: string;
    uid: string;
    verificationSent: boolean;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  if (!open) return null;

  const consoleUrl = getFirebaseAuthProvidersUrl();

  const handleCreateWarden = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNeedsConsoleEnable(false);
    setCreatedSummary(null);

    const cleanName = nama.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      setErrorMsg('Sila masukkan nama warden (sekurang-kurangnya 2 aksara).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Sila masukkan alamat e-mel yang sah sebagai ID log masuk.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createWardenAccountInCloud({
        nama: cleanName,
        email: cleanEmail,
        password,
      });
      setCreatedSummary({
        nama: result.nama,
        email: result.email,
        password,
        uid: result.uid,
        verificationSent: result.verificationSent,
      });
      setNama('');
      setEmail('');
      setPassword(generateStrongPassword());
      onNotify('Akaun warden baharu berjaya didaftarkan.');
    } catch (error) {
      const code = getFirebaseAuthErrorCode(error);
      if (code === 'auth/operation-not-allowed') {
        setNeedsConsoleEnable(true);
      }
      setErrorMsg(mapFirebaseAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkUid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNeedsConsoleEnable(false);

    const cleanUid = uidInput.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim() || 'Warden Asrama';

    if (!/^[a-zA-Z0-9_-]{6,128}$/.test(cleanUid)) {
      setErrorMsg('Format Firebase UID tidak sah.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Sila masukkan alamat e-mel akaun tersebut.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAdminUidInCloud({
        uid: cleanUid,
        email: cleanEmail,
        nama: cleanNama,
      });
      setUidInput('');
      setEmail('');
      setNama('');
      onNotify('UID warden berjaya diberi akses pentadbir.');
    } catch (error) {
      setErrorMsg(mapFirebaseAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (uid: string) => {
    setRemovingUid(uid);
    try {
      await removeAdminInCloud(uid);
      onNotify('Akses warden telah dipadam.');
    } catch (error) {
      setErrorMsg(mapFirebaseAuthError(error));
    } finally {
      setRemovingUid(null);
    }
  };

  const copyCredentials = async () => {
    if (!createdSummary) return;
    const text = `Akaun Warden Asrama SMK Salaping 2027\nNama: ${createdSummary.nama}\nID (E-mel): ${createdSummary.email}\nKata Laluan: ${createdSummary.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCredentials(true);
      onNotify('ID & kata laluan berjaya disalin.');
      window.setTimeout(() => setCopiedCredentials(false), 2500);
    } catch {
      onNotify('Sila salin maklumat secara manual.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warden-accounts-title"
    >
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ece9f6] bg-white p-4 shadow-xl sm:p-6 dark:border-[#2a273d] dark:bg-[#1b1929]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#f0edf9] pb-4 dark:border-[#2a273d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="warden-accounts-title"
                className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]"
              >
                Urus ID & Kata Laluan Warden
              </h3>
              <p className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                Daftar ID log masuk khas untuk warden atau pentadbir asrama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tetingkap akaun warden"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e5e2f2] text-[#5e5a77] hover:bg-[#f7f6fc] dark:border-[#2e2a45] dark:text-[#a8a4c2] dark:hover:bg-[#13111f] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setErrorMsg(null);
            }}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'create'
                ? 'bg-[#6c3cf0] text-white shadow-xs'
                : 'border border-[#e5e2f2] bg-[#f8f7fc] text-[#5e5a77] hover:text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a8a4c2]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cipta ID & Kata Laluan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('link');
              setErrorMsg(null);
            }}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'link'
                ? 'bg-[#6c3cf0] text-white shadow-xs'
                : 'border border-[#e5e2f2] bg-[#f8f7fc] text-[#5e5a77] hover:text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a8a4c2]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pautkan UID Firebase Console</span>
          </button>
        </div>

        {/* Error & Firebase Console Guide */}
        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-[#992b24] dark:border-red-900/50 dark:bg-red-950/30 dark:text-[#f59c95]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-semibold">{errorMsg}</p>
                {needsConsoleEnable && (
                  <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-[#684208] dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <p className="font-semibold">
                      Langkah Aktifkan Log Masuk E-mel/Kata Laluan (Sekali Sahaja):
                    </p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                      <li>
                        Buka Firebase Console →{' '}
                        <span className="font-semibold">
                          Authentication → Sign-in method
                        </span>
                        .
                      </li>
                      <li>
                        Pilih <span className="font-semibold">Email/Password</span>{' '}
                        dan aktifkan suis <span className="font-semibold">Enable</span>.
                      </li>
                      <li>Tekan Save, kemudian cuba cipta akaun warden semula di sini.</li>
                    </ol>
                    <a
                      href={consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-semibold text-[#6c3cf0] underline dark:text-[#b79eff]"
                    >
                      Buka Tetapan Firebase Authentication →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Created Credential Summary */}
        {createdSummary && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Akaun Warden Berjaya Dicipta
              </h4>
              <button
                type="button"
                onClick={copyCredentials}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-[#13111f] dark:text-emerald-200 cursor-pointer"
              >
                {copiedCredentials ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{copiedCredentials ? 'Disalin' : 'Salin ID & Kata Laluan'}</span>
              </button>
            </div>
            <dl className="mt-2.5 space-y-1 text-xs text-emerald-900 dark:text-emerald-100">
              <div className="flex gap-2">
                <dt className="font-semibold">Nama:</dt>
                <dd>{createdSummary.nama}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold">ID (E-mel):</dt>
                <dd className="font-mono-num font-bold">{createdSummary.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold">Kata Laluan:</dt>
                <dd className="font-mono-num font-bold">{createdSummary.password}</dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              {createdSummary.verificationSent
                ? 'Pautan pengesahan e-mel telah dihantar ke peti masuk warden tersebut. Warden perlu klik pautan pengesahan sekali sebelum log masuk kali pertama.'
                : 'Sila pastikan e-mel warden disahkan melalui pautan pengesahan semasa log masuk kali pertama.'}
            </p>
          </div>
        )}

        {/* Create New Warden Form */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateWarden} className="mt-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="warden-create-name"
                  className="mb-1 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  Nama Warden
                </label>
                <input
                  id="warden-create-name"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="cth: Cikgu Aminah (Warden Asrama)"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>

              <div>
                <label
                  htmlFor="warden-create-email"
                  className="mb-1 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  E-mel Log Masuk (ID Warden)
                </label>
                <input
                  id="warden-create-email"
                  type="email"
                  required
                  maxLength={200}
                  placeholder="cth: warden.salaping@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label
                  htmlFor="warden-create-password"
                  className="block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  Kata Laluan Khas
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateStrongPassword())}
                  className="inline-flex min-h-[32px] items-center gap-1 text-[11px] font-semibold text-[#6c3cf0] hover:underline dark:text-[#a285ff] cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  <span>Jana kata laluan rawak</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="warden-create-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Sekurang-kurangnya 6 aksara"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono-num min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] pr-12 pl-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata laluan'
                      : 'Tunjukkan kata laluan'
                  }
                  className="absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#7d7996] hover:text-[#1d1b2e] dark:text-[#9893b8] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#7d7996] dark:text-[#9893b8]">
                Gunakan e-mel sebenar yang boleh diakses kerana pautan pengesahan
                keselamatan akan dihantar ke e-mel tersebut.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a2cd9] disabled:opacity-50 sm:w-auto cursor-pointer whitespace-nowrap"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Daftar Akaun Warden</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkUid} className="mt-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="warden-link-uid"
                  className="mb-1 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  Firebase Auth UID
                </label>
                <input
                  id="warden-link-uid"
                  type="text"
                  required
                  placeholder="cth: 8xYzAbCdEf..."
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  className="font-mono-num min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-xs dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>
              <div>
                <label
                  htmlFor="warden-link-email"
                  className="mb-1 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  E-mel Akaun
                </label>
                <input
                  id="warden-link-email"
                  type="email"
                  required
                  placeholder="warden@sekolah.edu.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>
              <div>
                <label
                  htmlFor="warden-link-name"
                  className="mb-1 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  Nama Warden
                </label>
                <input
                  id="warden-link-name"
                  type="text"
                  required
                  placeholder="Nama penuh warden"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a2cd9] disabled:opacity-50 sm:w-auto cursor-pointer whitespace-nowrap"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Beri Akses Warden</span>
              </button>
            </div>
          </form>
        )}

        {/* Active Warden List */}
        <div className="mt-6 border-t border-[#f0edf9] pt-4 dark:border-[#2a273d]">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#7d7996] dark:text-[#9893b8]">
            Senarai Pentadbir & Warden Berdaftar
          </h4>
          <ul className="mt-3 divide-y divide-[#f0edf9] rounded-xl border border-[#ece9f6] bg-[#f8f7fc] dark:divide-[#2a273d] dark:border-[#2a273d] dark:bg-[#13111f]">
            <li className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                  Pentadbir Utama (Super Admin)
                </div>
                <div className="font-mono-num truncate text-[#7d7996] dark:text-[#9893b8]">
                  kodutedm@gmail.com
                </div>
              </div>
              <span className="rounded-lg bg-[#ede8fd] px-2.5 py-1 text-[11px] font-semibold text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff] whitespace-nowrap">
                Dilindungi
              </span>
            </li>

            {adminRecords.map((rec) => {
              const isSelf =
                currentUserEmail?.toLowerCase() === rec.email.toLowerCase();
              return (
                <li
                  key={rec.uid}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                      {rec.nama || 'Warden Asrama'}
                    </div>
                    <div className="font-mono-num truncate text-[#7d7996] dark:text-[#9893b8]">
                      {rec.email} · UID: {rec.uid.slice(0, 10)}...
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSelf || removingUid === rec.uid}
                    onClick={() => void handleRemoveAdmin(rec.uid)}
                    title={
                      isSelf
                        ? 'Tidak boleh padam akaun sedang log masuk'
                        : 'Buang akses warden'
                    }
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#b4372f] hover:bg-red-50 disabled:opacity-40 dark:border-red-900/40 dark:bg-[#1b1929] dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
                  >
                    {removingUid === rec.uid ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Padam</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
