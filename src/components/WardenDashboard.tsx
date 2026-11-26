import React, {useEffect, useMemo, useState} from 'react';
import {User} from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  LogIn,
  MailCheck,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthProvidersUrl,
  mapFirebaseAuthError,
} from '../lib/firebase';
import {fetchApplicationFileAttachment} from '../services/hostelRepository';
import {
  AdminRecord,
  ApplicationStatus,
  getAsramaBlockName,
  getDormOptionsByGender,
  HostelApplication,
  TINGKATAN_OPTIONS,
} from '../types/hostel';
import {downloadApplicationPdf} from '../utils/pdfExport';
import {
  exportApplicationsCsv,
  exportApplicationsExcel,
  exportApplicationsJson,
  formatFileSize,
} from '../utils/storage';
import {ConfirmDialog} from './ConfirmDialog';
import {DashboardAnalyticsChart} from './DashboardAnalyticsChart';
import {StatusBadge} from './StatusBadge';
import {WardenAccountsModal} from './WardenAccountsModal';

const HOSTEL_HEADER_IMAGE = '/assets/aistudio/6057847085639772821_da2087ee.jpg';

interface WardenDashboardProps {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isLoadingData: boolean;
  applications: HostelApplication[];
  adminRecords: AdminRecord[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSignIn: () => Promise<void>;
  onSignInEmailPassword: (email: string, password: string) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onSendVerificationEmail: () => Promise<void>;
  onRefreshAuthVerification: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateStatus: (
    id: string,
    status: ApplicationStatus,
    catatanWarden?: string,
    dorm?: string,
  ) => Promise<void>;
  onResetSeed: () => Promise<void>;
  onClearAll: () => Promise<void>;
  onNotify: (message: string) => void;
}

const AVATAR_TONES = [
  'bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]',
  'bg-[#fef2d6] text-[#b4690e] dark:bg-[#382b12] dark:text-[#f8c662]',
  'bg-[#fde8e1] text-[#c2410c] dark:bg-[#3b1f17] dark:text-[#fb9a79]',
  'bg-[#dff5fd] text-[#0369a1] dark:bg-[#142d3a] dark:text-[#67d2f7]',
  'bg-[#e7f4ec] text-[#1f6f4a] dark:bg-[#1a3326] dark:text-[#4cc38a]',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const WardenDashboard: React.FC<WardenDashboardProps> = ({
  user,
  authReady,
  isAdmin,
  isLoadingData,
  applications,
  adminRecords,
  searchQuery,
  onSearchQueryChange,
  onSignIn,
  onSignInEmailPassword,
  onSendPasswordReset,
  onSendVerificationEmail,
  onRefreshAuthVerification,
  onSignOut,
  onUpdateStatus,
  onResetSeed,
  onClearAll,
  onNotify,
}) => {
  const [loginMethod, setLoginMethod] = useState<'password' | 'google'>(
    'password',
  );
  const [wardenEmail, setWardenEmail] = useState('');
  const [wardenPassword, setWardenPassword] = useState('');
  const [showWardenPassword, setShowWardenPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [needsConsoleEnable, setNeedsConsoleEnable] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [tktFilter, setTktFilter] = useState<string>('');
  const [asramaView, setAsramaView] = useState<
    'berasingan' | 'aspura' | 'aspuri'
  >('berasingan');
  const [quickFilter, setQuickFilter] = useState<'all' | 'far' | 'form'>(
    'all',
  );
  const [selectedApp, setSelectedApp] = useState<HostelApplication | null>(
    null,
  );
  const [wardenNotes, setWardenNotes] = useState('');
  const [selectedDorm, setSelectedDorm] = useState('');
  const [attachment, setAttachment] = useState<{
    dataUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    source: 'cloud' | 'local';
  } | null>(null);
  const [isLoadingAttachment, setIsLoadingAttachment] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'reset' | 'clear' | null>(
    null,
  );

  const counts = useMemo(() => {
    const map: Record<ApplicationStatus, number> = {
      Dihantar: 0,
      Disemak: 0,
      Diluluskan: 0,
      Ditolak: 0,
    };
    let male = 0;
    let female = 0;
    let far = 0;
    let withForm = 0;

    for (const app of applications) {
      map[app.status] = (map[app.status] || 0) + 1;
      if (app.jantina === 'L') male++;
      else female++;
      if (parseFloat(app.jarak) > 20) far++;
      if (app.fail) withForm++;
    }
    return {...map, male, female, far, withForm};
  }, [applications]);

  const baseFilteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter && app.status !== statusFilter) return false;
      if (tktFilter && app.tkt !== tktFilter) return false;
      if (quickFilter === 'far' && !(parseFloat(app.jarak) > 20)) return false;
      if (quickFilter === 'form' && !app.fail) return false;
      if (!q) return true;
      return (
        app.nama.toLowerCase().includes(q) ||
        app.kp.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        (app.dorm || '').toLowerCase().includes(q)
      );
    });
  }, [applications, searchQuery, statusFilter, tktFilter, quickFilter]);

  const filteredAspura = useMemo(
    () => baseFilteredApps.filter((app) => app.jantina === 'L'),
    [baseFilteredApps],
  );

  const filteredAspuri = useMemo(
    () => baseFilteredApps.filter((app) => app.jantina === 'P'),
    [baseFilteredApps],
  );

  const filteredApps = useMemo(() => {
    if (asramaView === 'aspura') return filteredAspura;
    if (asramaView === 'aspuri') return filteredAspuri;
    return baseFilteredApps;
  }, [asramaView, baseFilteredApps, filteredAspura, filteredAspuri]);

  const activeDetail = selectedApp
    ? applications.find((a) => a.id === selectedApp.id) || selectedApp
    : null;

  useEffect(() => {
    if (!activeDetail) {
      setAttachment(null);
      setWardenNotes('');
      setSelectedDorm('');
      return;
    }
    setWardenNotes(activeDetail.catatanWarden || '');
    setSelectedDorm(activeDetail.dorm || '');
    let active = true;
    setIsLoadingAttachment(true);
    fetchApplicationFileAttachment(activeDetail.id)
      .then((res) => {
        if (active) setAttachment(res);
      })
      .catch(() => {
        if (active) setAttachment(null);
      })
      .finally(() => {
        if (active) setIsLoadingAttachment(false);
      });
    return () => {
      active = false;
    };
  }, [activeDetail?.id]);

  if (!authReady) {
    return (
      <section className="flex min-h-[260px] items-center justify-center rounded-2xl border border-[#ece9f6] bg-white p-8 dark:border-[#2a273d] dark:bg-[#1b1929]">
        <div className="flex items-center gap-3 text-sm text-[#5e5a77] dark:text-[#a8a4c2]">
          <Loader2 className="h-5 w-5 animate-spin text-[#6c3cf0]" aria-hidden="true" />
          <span>Menyemak sesi pengesahan...</span>
        </div>
      </section>
    );
  }

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setNeedsConsoleEnable(false);

    const email = wardenEmail.trim();
    if (!email || !wardenPassword) {
      setLoginError('Sila masukkan ID (e-mel) dan kata laluan warden.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await onSignInEmailPassword(email, wardenPassword);
      setWardenPassword('');
    } catch (error) {
      const code = getFirebaseAuthErrorCode(error);
      if (code === 'auth/operation-not-allowed') {
        setNeedsConsoleEnable(true);
      }
      setLoginError(mapFirebaseAuthError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordResetClick = async () => {
    setLoginError(null);
    const email = wardenEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError(
        'Masukkan alamat e-mel warden terlebih dahulu untuk menghantar pautan set semula kata laluan.',
      );
      return;
    }
    setIsLoggingIn(true);
    try {
      await onSendPasswordReset(email);
      onNotify(`Pautan set semula kata laluan dihantar ke ${email}.`);
    } catch (error) {
      setLoginError(mapFirebaseAuthError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#ece9f6] bg-white shadow-xs dark:border-[#2a273d] dark:bg-[#1b1929]">
        {/* Dashboard Header Photograph */}
        <div className="relative h-40 w-full overflow-hidden sm:h-52">
          <img
            src={HOSTEL_HEADER_IMAGE}
            alt="Bangunan Asrama SMK Salaping, Kota Marudu"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181130]/85 via-[#181130]/35 to-transparent" />
          <div className="absolute right-5 bottom-4 left-5 sm:right-8 sm:bottom-5 sm:left-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
              SMK Salaping · Kota Marudu
            </p>
            <h2 className="font-display mt-0.5 text-lg font-bold text-white sm:text-2xl">
              Papan Pemuka Pengurusan Asrama 2027
            </h2>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                  Log Masuk Dashboard Warden
                </h3>
                <p className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                  Pilih log masuk menggunakan ID &amp; kata laluan warden khas
                  atau akaun Google pentadbir.
                </p>
              </div>
            </div>

          {/* Login Method Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-[#f4f2fb] p-1 dark:bg-[#13111f]">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setLoginError(null);
              }}
              className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-white text-[#6c3cf0] shadow-xs dark:bg-[#1b1929] dark:text-[#b79eff]'
                  : 'text-[#5e5a77] hover:text-[#1d1b2e] dark:text-[#a8a4c2]'
              }`}
            >
              ID &amp; Kata Laluan
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('google');
                setLoginError(null);
              }}
              className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                loginMethod === 'google'
                  ? 'bg-white text-[#6c3cf0] shadow-xs dark:bg-[#1b1929] dark:text-[#b79eff]'
                  : 'text-[#5e5a77] hover:text-[#1d1b2e] dark:text-[#a8a4c2]'
              }`}
            >
              Akaun Google
            </button>
          </div>

          {loginMethod === 'password' ? (
            <form onSubmit={handleEmailLoginSubmit} className="mt-5 space-y-4">
              {loginError && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-[#992b24] dark:border-red-900/50 dark:bg-red-950/30 dark:text-[#f59c95]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="space-y-2">
                      <p className="font-semibold">{loginError}</p>
                      {needsConsoleEnable && (
                        <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-[#684208] dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                          <p className="font-semibold">
                            Aktifkan E-mel/Kata Laluan di Firebase Console:
                          </p>
                          <p className="mt-1">
                            Log masuk Google sebagai{' '}
                            <span className="font-mono-num font-bold">
                              kodutedm@gmail.com
                            </span>{' '}
                            di tab Akaun Google untuk mencipta ID warden selepas
                            mengaktifkan provider Email/Password.
                          </p>
                          <a
                            href={getFirebaseAuthProvidersUrl()}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-block font-semibold text-[#6c3cf0] underline dark:text-[#b79eff]"
                          >
                            Buka Firebase Authentication →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="warden-login-email"
                  className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                >
                  ID Warden (Alamat E-mel)
                </label>
                <input
                  id="warden-login-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="warden.salaping@gmail.com"
                  value={wardenEmail}
                  onChange={(e) => setWardenEmail(e.target.value)}
                  className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3.5 py-2.5 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="warden-login-password"
                    className="block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
                  >
                    Kata Laluan
                  </label>
                  <button
                    type="button"
                    onClick={() => void handlePasswordResetClick()}
                    className="min-h-[32px] text-xs font-semibold text-[#6c3cf0] hover:underline dark:text-[#a285ff] cursor-pointer"
                  >
                    Lupa kata laluan?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="warden-login-password"
                    type={showWardenPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan kata laluan warden"
                    value={wardenPassword}
                    onChange={(e) => setWardenPassword(e.target.value)}
                    className="min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] pr-12 pl-3.5 py-2.5 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWardenPassword((p) => !p)}
                    aria-label={
                      showWardenPassword
                        ? 'Sembunyikan kata laluan'
                        : 'Tunjukkan kata laluan'
                    }
                    className="absolute top-1/2 right-1.5 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#7d7996] hover:text-[#1d1b2e] dark:text-[#9893b8] cursor-pointer"
                  >
                    {showWardenPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a2cd9] disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Log Masuk Warden</span>
              </button>

              <p className="rounded-xl bg-[#f8f7fc] p-3 text-[11px] leading-relaxed text-[#5e5a77] dark:bg-[#13111f] dark:text-[#a8a4c2]">
                Belum mempunyai ID &amp; kata laluan warden? Log masuk sebagai
                pentadbir utama (
                <span className="font-mono-num font-semibold">
                  kodutedm@gmail.com
                </span>
                ) melalui tab <span className="font-semibold">Akaun Google</span>{' '}
                untuk menjana ID &amp; kata laluan khas di dalam papan pemuka.
              </p>
            </form>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
                Data pemohon dan lampiran borang kesihatan dilindungi oleh
                kawalan akses storan awan. Log masuk menggunakan akaun Google
                pentadbir (
                <span className="font-mono-num font-semibold">
                  kodutedm@gmail.com
                </span>
                ) untuk mengurus permohonan dan mendaftar akaun warden lain.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a2cd9] cursor-pointer"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Log Masuk Akaun Google Warden</span>
              </button>
            </div>
          )}
          </div>
        </div>
      </section>
    );
  }

  if (!user.emailVerified) {
    return (
      <section className="rounded-2xl border border-[#ece9f6] bg-white p-6 shadow-xs sm:p-8 dark:border-[#2a273d] dark:bg-[#1b1929]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="max-w-lg">
            <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
              Pengesahan E-mel Warden Diperlukan
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
              Akaun (<span className="font-semibold">{user.email}</span>) perlu
              disahkan terlebih dahulu sebelum dapat membaca dan mengurus rekod
              asrama yang dilindungi. Sila klik pautan pengesahan yang dihantar
              ke e-mel anda.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={isCheckingVerification}
                onClick={() => {
                  setIsCheckingVerification(true);
                  void onRefreshAuthVerification().finally(() =>
                    setIsCheckingVerification(false),
                  );
                }}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#6c3cf0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5a2cd9] disabled:opacity-50 cursor-pointer"
              >
                {isCheckingVerification ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Saya Sudah Sahkan E-mel</span>
              </button>
              <button
                type="button"
                onClick={() => void onSendVerificationEmail()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-4 py-2 text-xs font-semibold text-[#1d1b2e] hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
              >
                <MailCheck className="h-4 w-4" aria-hidden="true" />
                <span>Hantar Semula Pautan</span>
              </button>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#e5e2f2] bg-white px-4 py-2 text-xs font-semibold text-[#5e5a77] hover:text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#a8a4c2] cursor-pointer"
              >
                <span>Log Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-[#ece9f6] bg-white p-6 shadow-xs sm:p-8 dark:border-[#2a273d] dark:bg-[#1b1929]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="max-w-lg">
            <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
              Akses Warden Diperlukan
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
              Akaun semasa (<span className="font-semibold">{user.email}</span>)
              didaftarkan sebagai pemohon dan tidak mempunyai kebenaran untuk
              membuka senarai semua permohonan asrama.
            </p>
            <button
              type="button"
              onClick={async () => {
                await onSignOut();
              }}
              className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-4 py-2 text-sm font-semibold text-[#1d1b2e] hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Log Keluar &amp; Tukar Akaun Warden</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleStatusChange = async (
    id: string,
    status: ApplicationStatus,
    notes?: string,
    dorm?: string,
  ) => {
    setIsMutating(true);
    try {
      await onUpdateStatus(id, status, notes, dorm);
    } finally {
      setIsMutating(false);
    }
  };

  const firstName =
    (user.displayName || '').trim().split(/\s+/)[0] || 'Warden';

  const statusTiles: Array<{
    key: ApplicationStatus;
    label: string;
    count: number;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {key: 'Dihantar', label: 'Menunggu', count: counts.Dihantar, icon: Clock},
    {
      key: 'Disemak',
      label: 'Disemak',
      count: counts.Disemak,
      icon: FileSearch,
    },
    {
      key: 'Diluluskan',
      label: 'Diluluskan',
      count: counts.Diluluskan,
      icon: CheckCircle2,
    },
    {key: 'Ditolak', label: 'Ditolak', count: counts.Ditolak, icon: XCircle},
  ];

  const rightQuickTiles: Array<{
    id: 'L' | 'P' | 'far' | 'form';
    label: string;
    sub: string;
    bg: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {
      id: 'L',
      label: 'Aspura (Lelaki)',
      sub: `${counts.male} pemohon`,
      bg: 'bg-[#7447f5]',
      icon: Users,
    },
    {
      id: 'P',
      label: 'Aspuri (Perempuan)',
      sub: `${counts.female} pemohon`,
      bg: 'bg-[#f4b932]',
      icon: Users,
    },
    {
      id: 'far',
      label: 'Jarak > 20 km',
      sub: `${counts.far} keutamaan`,
      bg: 'bg-[#f5805b]',
      icon: MapPin,
    },
    {
      id: 'form',
      label: 'Borang Lengkap',
      sub: `${counts.withForm} lampiran`,
      bg: 'bg-[#33bdec]',
      icon: FileCheck2,
    },
  ];

  const hasActiveFilters =
    Boolean(statusFilter) ||
    Boolean(tktFilter) ||
    asramaView !== 'berasingan' ||
    quickFilter !== 'all' ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setStatusFilter('');
    setTktFilter('');
    setAsramaView('berasingan');
    setQuickFilter('all');
    onSearchQueryChange('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      {/* LEFT MAIN WORKSPACE COLUMN */}
      <div className="min-w-0 space-y-6">
        {/* Photographic Dashboard Header Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-[#ece9f6] shadow-xs dark:border-[#2a273d]">
          <img
            src={HOSTEL_HEADER_IMAGE}
            alt="Bangunan Asrama SMK Salaping, Kota Marudu"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#181130]/92 via-[#181130]/75 to-[#181130]/20"
            aria-hidden="true"
          />
          <div className="relative z-10 flex min-h-[172px] flex-col justify-between gap-4 p-5 sm:min-h-[192px] sm:px-7 sm:py-6">
            <div className="max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Asrama SMK Salaping · Kota Marudu
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-white sm:text-2xl">
                Selamat Datang, {firstName}!
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-white/90 sm:text-sm">
                Pengurusan Asrama SMK Salaping 2027. Terdapat{' '}
                <span className="font-mono-num font-bold text-amber-300">
                  {counts.Dihantar}
                </span>{' '}
                permohonan baharu menunggu semakan warden.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-white">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-white/85" aria-hidden="true" />
                  <span className="font-mono-num text-sm font-bold">
                    {applications.length}
                  </span>
                  <span className="text-white/90">Jumlah rekod</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-300"
                    aria-hidden="true"
                  />
                  <span className="font-mono-num text-sm font-bold">
                    {counts.Diluluskan}
                  </span>
                  <span className="text-white/90">Diluluskan</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const base = window.location.origin.replace(
                    'https://ais-dev-',
                    'https://ais-pre-',
                  );
                  const url = `${base}/#pemohon`;
                  try {
                    await navigator.clipboard.writeText(url);
                    onNotify('Pautan borang permohonan pelajar berjaya disalin.');
                  } catch {
                    onNotify(`Pautan pelajar: ${url}`);
                  }
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 cursor-pointer whitespace-nowrap"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Salin Pautan Pelajar</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section Title + 4 Interactive Status Cards */}
        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-[#1d1b2e] sm:text-lg dark:text-[#f2f0fa]">
              Asrama SMK Salaping
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
              <span className="font-mono-num">
                {counts.male} L · {counts.female} P
              </span>
              <select
                aria-label="Tapis mengikut tingkatan"
                value={tktFilter}
                onChange={(e) => setTktFilter(e.target.value)}
                className="min-h-[40px] rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3 py-1.5 text-base font-semibold text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:min-h-[36px] sm:text-xs dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#f2f0fa]"
              >
                <option value="">Semua Tingkatan</option>
                {TINGKATAN_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusTiles.map((tile) => {
              const Icon = tile.icon;
              const isActive = statusFilter === tile.key;
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter((prev) =>
                      prev === tile.key ? '' : tile.key,
                    )
                  }
                  className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#6c3cf0] bg-[#6c3cf0] text-white shadow-lg shadow-[#6c3cf0]/25'
                      : 'border-[#ece9f6] bg-white text-[#1d1b2e] hover:border-[#6c3cf0]/45 dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span
                      className={`font-mono-num text-[11px] font-bold uppercase tracking-wide ${
                        isActive
                          ? 'text-white/90'
                          : 'text-[#7d7996] dark:text-[#9893b8]'
                      }`}
                    >
                      {isActive ? 'AKTIF' : 'TAPIS'}
                    </span>
                    {/* Switch indicator matching screenshot */}
                    <span
                      className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                        isActive
                          ? 'justify-end bg-white/30'
                          : 'justify-start bg-[#e9e7f3] dark:bg-[#2c2842]'
                      }`}
                      aria-hidden="true"
                    >
                      <span
                        className={`h-4 w-4 rounded-full shadow-xs ${
                          isActive
                            ? 'bg-white'
                            : 'bg-white dark:bg-[#9893b8]'
                        }`}
                      />
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <Icon
                        className={`h-5 w-5 ${
                          isActive
                            ? 'text-white'
                            : 'text-[#6c3cf0] dark:text-[#a285ff]'
                        }`}
                        aria-hidden="true"
                      />
                      <div
                        className={`mt-2 text-xs font-semibold ${
                          isActive
                            ? 'text-white'
                            : 'text-[#5e5a77] dark:text-[#c7c3df]'
                        }`}
                      >
                        {tile.label}
                      </div>
                    </div>
                    <span
                      className={`font-mono-num text-2xl font-bold leading-none ${
                        isActive
                          ? 'text-white'
                          : 'text-[#1d1b2e] dark:text-[#f2f0fa]'
                      }`}
                    >
                      {tile.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bottom-Left Workspace Card: Applications Table & Controls */}
        <section className="rounded-2xl border border-[#ece9f6] bg-white p-4 shadow-xs sm:p-5 dark:border-[#2a273d] dark:bg-[#1b1929]">
          <div className="flex flex-col gap-3 border-b border-[#f0edf9] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a273d]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#1d1b2e] sm:text-base dark:text-[#f2f0fa]">
                  Senarai Permohonan Asrama
                </h3>
                <p className="text-xs text-[#7d7996] dark:text-[#9893b8]">
                  <span className="font-mono-num font-semibold">
                    {filteredApps.length}
                  </span>{' '}
                  daripada{' '}
                  <span className="font-mono-num">{applications.length}</span>{' '}
                  rekod
                  {hasActiveFilters && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="font-semibold text-[#6c3cf0] hover:underline dark:text-[#a285ff] cursor-pointer"
                      >
                        Set semula penapis
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAccountsModalOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#d6cbfb] bg-[#ede8fd] px-3 py-1.5 text-xs font-semibold text-[#6c3cf0] transition-colors hover:bg-[#e1d8fb] sm:min-h-[36px] dark:border-[#3e2f70] dark:bg-[#2a214a] dark:text-[#b79eff] cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ID Warden</span>
              </button>
              <button
                type="button"
                disabled={baseFilteredApps.length === 0}
                onClick={() => {
                  exportApplicationsExcel(baseFilteredApps, 'aspura-aspuri');
                  onNotify(
                    'Fail Excel (.xlsx) berasingan ASPURA & ASPURI berjaya dieksport.',
                  );
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#1f6f4a]/35 bg-[#e8f5ee] px-3 py-1.5 text-xs font-semibold text-[#1f6f4a] transition-colors hover:bg-[#d7efe2] disabled:opacity-45 sm:min-h-[36px] dark:border-[#4cc38a]/35 dark:bg-[#152d22] dark:text-[#6ee7b7] cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Eksport Excel</span>
              </button>
              <button
                type="button"
                disabled={filteredApps.length === 0}
                onClick={() => {
                  exportApplicationsCsv(filteredApps);
                  onNotify('Fail CSV berjaya dieksport.');
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-1.5 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] disabled:opacity-45 sm:min-h-[36px] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                disabled={filteredApps.length === 0}
                onClick={() => {
                  exportApplicationsJson(filteredApps);
                  onNotify('Fail JSON berjaya dieksport.');
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-1.5 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] disabled:opacity-45 sm:min-h-[36px] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setConfirmMode('reset')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-1.5 text-xs font-semibold text-[#1d1b2e] transition-colors hover:bg-[#ede8fd] disabled:opacity-45 sm:min-h-[36px] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Data contoh</span>
              </button>
              <button
                type="button"
                disabled={applications.length === 0 || isMutating}
                onClick={() => setConfirmMode('clear')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-[#b4372f] transition-colors hover:bg-red-100 disabled:opacity-45 sm:min-h-[36px] dark:border-red-900/50 dark:bg-red-950/30 dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kosongkan</span>
              </button>
            </div>
          </div>

          {/* Aspura / Aspuri Separation Tabs */}
          <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[#f4f2fb] p-1 sm:grid-cols-3 dark:bg-[#13111f]">
            {[
              {
                id: 'berasingan' as const,
                label: 'Asingkan Aspura & Aspuri',
                count: baseFilteredApps.length,
              },
              {
                id: 'aspura' as const,
                label: 'Aspura (Lelaki)',
                count: filteredAspura.length,
              },
              {
                id: 'aspuri' as const,
                label: 'Aspuri (Perempuan)',
                count: filteredAspuri.length,
              },
            ].map((tab) => {
              const active = asramaView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAsramaView(tab.id)}
                  className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white text-[#6c3cf0] shadow-xs dark:bg-[#1b1929] dark:text-[#b79eff]'
                      : 'text-[#5e5a77] hover:text-[#1d1b2e] dark:text-[#a8a4c2]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono-num rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      active
                        ? 'bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]'
                        : 'bg-[#e6e3f2] text-[#5e5a77] dark:bg-[#252238] dark:text-[#9893b8]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Separated Aspura & Aspuri Sections */}
          <div className="mt-4 space-y-6">
            {isLoadingData ? (
              <div className="rounded-xl border border-[#f0edf9] bg-[#f8f7fc] px-4 py-10 text-center text-sm text-[#5e5a77] dark:border-[#2a273d] dark:bg-[#13111f] dark:text-[#a8a4c2]">
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin text-[#6c3cf0]"
                    aria-hidden="true"
                  />
                  Memuatkan rekod daripada storan awan...
                </span>
              </div>
            ) : (
              (
                [
                  ...(asramaView === 'berasingan' || asramaView === 'aspura'
                    ? [
                        {
                          key: 'aspura' as const,
                          title: 'Permohonan Aspura (Pelajar Lelaki)',
                          dormHint: 'Pilihan Dorm: 1A–1E, 2A–2E, 3A–3E',
                          items: filteredAspura,
                          accentClass:
                            'border-[#d6cbfb] bg-[#f4f1fe] text-[#5528d6] dark:border-[#3e2f70] dark:bg-[#221c3b] dark:text-[#b79eff]',
                        },
                      ]
                    : []),
                  ...(asramaView === 'berasingan' || asramaView === 'aspuri'
                    ? [
                        {
                          key: 'aspuri' as const,
                          title: 'Permohonan Aspuri (Pelajar Perempuan)',
                          dormHint: 'Pilihan Dorm: 1A–1E, 2A–2E, 3A–3E & 4A',
                          items: filteredAspuri,
                          accentClass:
                            'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300',
                        },
                      ]
                    : []),
                ] as const
              ).map((group) => (
                <div key={group.key} className="space-y-3">
                  {/* Group Subheader Banner */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${group.accentClass}`}
                  >
                    <div>
                      <h4 className="font-display text-sm font-bold">
                        {group.title}
                      </h4>
                      <p className="text-[11px] opacity-85">{group.dormHint}</p>
                    </div>
                    <span className="font-mono-num rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold text-[#1d1b2e] dark:bg-[#151322]/80 dark:text-[#f2f0fa]">
                      {group.items.length} rekod
                    </span>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto rounded-xl border border-[#f0edf9] md:block dark:border-[#2a273d]">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#f0edf9] bg-[#f8f7fc] text-xs font-semibold text-[#5e5a77] dark:border-[#2a273d] dark:bg-[#13111f] dark:text-[#a8a4c2]">
                          <th className="px-3 py-2.5">Rujukan</th>
                          <th className="px-3 py-2.5">Nama pelajar</th>
                          <th className="px-3 py-2.5">Tingkatan</th>
                          <th className="px-3 py-2.5 text-right">Jarak</th>
                          <th className="px-3 py-2.5">Dorm</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0edf9] dark:divide-[#2a273d]">
                        {group.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center text-sm text-[#5e5a77] dark:text-[#a8a4c2]"
                            >
                              {applications.length === 0
                                ? 'Tiada permohonan dalam storan awan. Tekan "Data contoh" untuk memuatkan sampel.'
                                : 'Tiada rekod sepadan dengan penapis semasa.'}
                            </td>
                          </tr>
                        ) : (
                          group.items.map((app) => {
                            const dormOptions = getDormOptionsByGender(
                              app.jantina,
                            );
                            return (
                              <tr
                                key={app.id}
                                className="transition-colors hover:bg-[#f8f7fc] dark:hover:bg-[#141221]"
                              >
                                <td className="font-mono-num px-3 py-2.5 text-xs font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                                  {app.id}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {app.fotoDataUrl ? (
                                      <img
                                        src={app.fotoDataUrl}
                                        alt={`Foto ${app.nama}`}
                                        className="h-9 w-9 shrink-0 rounded-full border border-[#e5e2f2] object-cover object-top dark:border-[#2e2a45]"
                                      />
                                    ) : (
                                      <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ede8fd] text-[11px] font-bold text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
                                        {getInitials(app.nama)}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                                        {app.nama}
                                      </div>
                                      <div className="font-mono-num text-xs text-[#7d7996] dark:text-[#9893b8]">
                                        {app.kp}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-[#1d1b2e] dark:text-[#f2f0fa] whitespace-nowrap">
                                  {app.tkt}
                                </td>
                                <td className="font-mono-num px-3 py-2.5 text-right text-xs font-medium text-[#1d1b2e] dark:text-[#f2f0fa] whitespace-nowrap">
                                  {app.jarak} km
                                </td>
                                <td className="px-3 py-2.5">
                                  <select
                                    aria-label={`Pilih dorm untuk ${app.nama}`}
                                    disabled={isMutating}
                                    value={app.dorm || ''}
                                    onChange={(e) =>
                                      void handleStatusChange(
                                        app.id,
                                        app.status,
                                        app.catatanWarden,
                                        e.target.value,
                                      )
                                    }
                                    className="font-mono-num min-h-[34px] rounded-lg border border-[#e5e2f2] bg-[#f8f7fc] px-2 py-1 text-xs font-semibold text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none disabled:opacity-50 dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                                  >
                                    <option value="">-- Dorm --</option>
                                    {dormOptions.map((d) => (
                                      <option key={d} value={d}>
                                        Dorm {d}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <StatusBadge status={app.status} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedApp(app)}
                                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#e5e2f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#1d1b2e] hover:border-[#6c3cf0] hover:text-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
                                    >
                                      <Eye
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      <span>Lihat</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isMutating}
                                      onClick={() =>
                                        void handleStatusChange(
                                          app.id,
                                          'Disemak',
                                          app.catatanWarden,
                                          app.dorm,
                                        )
                                      }
                                      className="min-h-[32px] rounded-lg border border-[#e5e2f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#1d1b2e] hover:border-sky-600 hover:text-sky-700 disabled:opacity-45 dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
                                    >
                                      Semak
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isMutating}
                                      onClick={() =>
                                        void handleStatusChange(
                                          app.id,
                                          'Diluluskan',
                                          app.catatanWarden,
                                          app.dorm,
                                        )
                                      }
                                      className="min-h-[32px] rounded-lg border border-[#1f6f4a]/35 bg-white px-2.5 py-1 text-xs font-semibold text-[#1f6f4a] hover:bg-[#e8f3ec] disabled:opacity-45 dark:border-[#4cc38a]/35 dark:bg-[#13111f] dark:text-[#4cc38a] cursor-pointer whitespace-nowrap"
                                    >
                                      Lulus
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isMutating}
                                      onClick={() =>
                                        void handleStatusChange(
                                          app.id,
                                          'Ditolak',
                                          app.catatanWarden,
                                          app.dorm,
                                        )
                                      }
                                      className="min-h-[32px] rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#b4372f] hover:bg-red-50 disabled:opacity-45 dark:border-red-900/40 dark:bg-[#13111f] dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards List */}
                  <div className="space-y-3 md:hidden">
                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-5 text-center text-sm text-[#5e5a77] dark:border-[#2a273d] dark:bg-[#13111f] dark:text-[#a8a4c2]">
                        Tiada rekod sepadan dengan penapis semasa.
                      </div>
                    ) : (
                      group.items.map((app) => {
                        const dormOptions = getDormOptionsByGender(app.jantina);
                        return (
                          <div
                            key={app.id}
                            className="rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-4 dark:border-[#2a273d] dark:bg-[#13111f]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2.5">
                                {app.fotoDataUrl ? (
                                  <img
                                    src={app.fotoDataUrl}
                                    alt={`Foto ${app.nama}`}
                                    className="h-11 w-11 shrink-0 rounded-xl border border-[#e5e2f2] object-cover object-top dark:border-[#2e2a45]"
                                  />
                                ) : (
                                  <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ede8fd] text-xs font-bold text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]">
                                    {getInitials(app.nama)}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#7d7996] dark:text-[#9893b8]">
                                    <span className="font-mono-num font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                                      {app.id}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{app.tkt}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono-num">
                                      {app.jarak} km
                                    </span>
                                  </div>
                                  <h4 className="mt-0.5 truncate text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                                    {app.nama}
                                  </h4>
                                  <p className="font-mono-num text-xs text-[#7d7996] dark:text-[#9893b8]">
                                    {app.kp}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={app.status} />
                            </div>

                            {/* Inline Mobile Dorm Selector */}
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e5e2f2] bg-white px-3 py-2 dark:border-[#2e2a45] dark:bg-[#1b1929]">
                              <span className="text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]">
                                Dorm {getAsramaBlockName(app.jantina)}:
                              </span>
                              <select
                                aria-label={`Pilih dorm untuk ${app.nama}`}
                                disabled={isMutating}
                                value={app.dorm || ''}
                                onChange={(e) =>
                                  void handleStatusChange(
                                    app.id,
                                    app.status,
                                    app.catatanWarden,
                                    e.target.value,
                                  )
                                }
                                className="font-mono-num min-h-[40px] rounded-lg border border-[#e5e2f2] bg-[#f8f7fc] px-2.5 py-1 text-base font-semibold text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-xs dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
                              >
                                <option value="">-- Pilih Dorm --</option>
                                {dormOptions.map((d) => (
                                  <option key={d} value={d}>
                                    Dorm {d}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-[#e5e2f2] pt-3 sm:grid-cols-4 dark:border-[#2e2a45]">
                              <button
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="min-h-[42px] rounded-xl border border-[#e5e2f2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
                              >
                                Lihat Butiran
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleStatusChange(
                                    app.id,
                                    'Disemak',
                                    app.catatanWarden,
                                    app.dorm,
                                  )
                                }
                                className="min-h-[42px] rounded-xl border border-[#e5e2f2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
                              >
                                Tanda Semak
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleStatusChange(
                                    app.id,
                                    'Diluluskan',
                                    app.catatanWarden,
                                    app.dorm,
                                  )
                                }
                                className="min-h-[42px] rounded-xl border border-[#1f6f4a]/40 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1f6f4a] dark:border-[#4cc38a]/40 dark:bg-[#1b1929] dark:text-[#4cc38a] cursor-pointer whitespace-nowrap"
                              >
                                Luluskan
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleStatusChange(
                                    app.id,
                                    'Ditolak',
                                    app.catatanWarden,
                                    app.dorm,
                                  )
                                }
                                className="min-h-[42px] rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#b4372f] dark:border-red-900/40 dark:bg-[#1b1929] dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
                              >
                                Tolak
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* RIGHT ANALYTICS & SUMMARY PANEL */}
      <aside className="space-y-5">
        {/* 2x2 Color-Coded Quick Segment Cards */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
              Kategori Pemohon
            </h3>
            <button
              type="button"
              onClick={resetAllFilters}
              title="Papar semua kategori"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#ece9f6] bg-white text-[#5e5a77] hover:border-[#6c3cf0] hover:text-[#6c3cf0] dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#a8a4c2] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {rightQuickTiles.map((tile) => {
              const Icon = tile.icon;
              const active =
                (tile.id === 'L' && asramaView === 'aspura') ||
                (tile.id === 'P' && asramaView === 'aspuri') ||
                ((tile.id === 'far' || tile.id === 'form') &&
                  quickFilter === tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => {
                    if (tile.id === 'L') {
                      setAsramaView((prev) =>
                        prev === 'aspura' ? 'berasingan' : 'aspura',
                      );
                    } else if (tile.id === 'P') {
                      setAsramaView((prev) =>
                        prev === 'aspuri' ? 'berasingan' : 'aspuri',
                      );
                    } else {
                      const qId = tile.id;
                      setQuickFilter((prev) => (prev === qId ? 'all' : qId));
                    }
                  }}
                  className={`flex flex-col justify-between rounded-2xl p-3.5 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer ${tile.bg} ${
                    active ? 'ring-3 ring-[#1d1b2e]/30 dark:ring-white/50' : ''
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                      <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                    <span
                      className={`inline-flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${
                        active
                          ? 'justify-end bg-white/45'
                          : 'justify-start bg-black/15'
                      }`}
                      aria-hidden="true"
                    >
                      <span className="h-3 w-3 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-bold leading-tight">
                      {tile.label}
                    </div>
                    <div className="font-mono-num mt-0.5 text-[11px] text-white/85">
                      {tile.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent Applicants Avatar Strip (matching "Members") */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
              Pemohon Terkini
            </h3>
            <button
              type="button"
              onClick={() => {
                if (applications.length > 0) setSelectedApp(applications[0]);
              }}
              disabled={applications.length === 0}
              title="Buka pemohon terkini"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#ece9f6] bg-white text-[#5e5a77] hover:border-[#6c3cf0] hover:text-[#6c3cf0] disabled:opacity-40 dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#a8a4c2] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl border border-[#ece9f6] bg-white p-3.5 shadow-xs dark:border-[#2a273d] dark:bg-[#1b1929]">
            {applications.length === 0 ? (
              <p className="py-2 text-center text-xs text-[#7d7996] dark:text-[#9893b8]">
                Tiada pemohon lagi.
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {applications.slice(0, 5).map((app, index) => {
                  const shortName = app.nama.trim().split(/\s+/)[0] || app.id;
                  const shortTkt = app.tkt.replace('Tingkatan ', 'T');
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      title={`Lihat ${app.nama} (${app.id})`}
                      className="group flex flex-col items-center rounded-xl p-1 text-center transition-colors hover:bg-[#f7f6fc] dark:hover:bg-[#141221] cursor-pointer"
                    >
                      {app.fotoDataUrl ? (
                        <img
                          src={app.fotoDataUrl}
                          alt={`Foto ${app.nama}`}
                          className="h-10 w-10 rounded-full border border-[#e5e2f2] object-cover object-top transition-transform group-hover:scale-105 dark:border-[#2e2a45]"
                        />
                      ) : (
                        <span
                          className={`font-display flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-transform group-hover:scale-105 ${
                            AVATAR_TONES[index % AVATAR_TONES.length]
                          }`}
                        >
                          {getInitials(app.nama)}
                        </span>
                      )}
                      <span className="mt-1.5 w-full truncate text-[11px] font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                        {shortName}
                      </span>
                      <span className="font-mono-num text-[10px] text-[#7d7996] dark:text-[#9893b8]">
                        {shortTkt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Area Spline Analytics Chart (matching "Power Consumed") */}
        <DashboardAnalyticsChart applications={applications} />
      </aside>

      {/* Detail Inspection Modal */}
      {activeDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#ece9f6] bg-white p-4 shadow-xl sm:p-6 dark:border-[#2a273d] dark:bg-[#1b1929]">
            <div className="flex items-start justify-between gap-3 border-b border-[#f0edf9] pb-4 dark:border-[#2a273d]">
              <div className="flex min-w-0 items-center gap-3.5">
                {activeDetail.fotoDataUrl && (
                  <img
                    src={activeDetail.fotoDataUrl}
                    alt={`Foto wajah ${activeDetail.nama}`}
                    className="h-16 w-14 shrink-0 rounded-xl border border-[#e5e2f2] object-cover object-top shadow-xs dark:border-[#2e2a45]"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#7d7996] dark:text-[#9893b8]">
                    <span className="font-mono-num font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                      {activeDetail.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeDetail.tkt}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{activeDetail.tarikh}</span>
                  </div>
                  <h3
                    id="detail-modal-title"
                    className="font-display mt-1 break-words text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]"
                  >
                    {activeDetail.nama}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e5e2f2] text-[#5e5a77] hover:bg-[#f7f6fc] dark:border-[#2e2a45] dark:text-[#a8a4c2] dark:hover:bg-[#13111f] cursor-pointer"
                aria-label="Tutup butiran permohonan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]">
                Status semasa
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void downloadApplicationPdf({
                      record: {
                        ...activeDetail,
                        dorm: selectedDorm,
                        catatanWarden: wardenNotes,
                      },
                    })
                      .then(() =>
                        onNotify(
                          `Borang PDF ${activeDetail.id} berjaya dimuat turun.`,
                        ),
                      )
                      .catch(() =>
                        onNotify('Gagal menjana PDF. Sila cuba lagi.'),
                      );
                  }}
                  className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[#e5e2f2] bg-[#f8f7fc] px-2.5 py-1 text-[11px] font-semibold text-[#1f6f4a] hover:border-[#1f6f4a] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#4cc38a] cursor-pointer"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  <span>Slip PDF</span>
                </button>
                {activeDetail.fotoDataUrl && (
                  <a
                    href={activeDetail.fotoDataUrl}
                    download={`foto-${activeDetail.id}.jpg`}
                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[#e5e2f2] bg-[#f8f7fc] px-2.5 py-1 text-[11px] font-semibold text-[#6c3cf0] hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#a285ff]"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    <span>Muat turun foto</span>
                  </a>
                )}
                <StatusBadge status={activeDetail.status} />
              </div>
            </div>

            <dl className="mt-4 divide-y divide-[#f0edf9] rounded-xl border border-[#ece9f6] text-sm dark:divide-[#2a273d] dark:border-[#2a273d]">
              {[
                ['No. Kad Pengenalan', activeDetail.kp, true],
                [
                  'Jantina / Kategori',
                  `${activeDetail.jantina === 'L' ? 'Lelaki' : 'Perempuan'} (${getAsramaBlockName(activeDetail.jantina)})`,
                ],
                [
                  'Dorm Ditempatkan',
                  activeDetail.dorm
                    ? `${getAsramaBlockName(activeDetail.jantina)} · Dorm ${activeDetail.dorm}`
                    : 'Belum ditetapkan',
                  true,
                ],
                ['Ibu bapa / Penjaga', activeDetail.penjaga],
                ['No. Telefon Penjaga', activeDetail.tel, true],
                ['Jarak ke sekolah', `${activeDetail.jarak} km`, true],
                ['Alamat rumah', activeDetail.alamat || '—'],
                ['Sebab memohon', activeDetail.sebab || '—'],
              ].map(([label, val, mono]) => (
                <div
                  key={String(label)}
                  className="grid grid-cols-1 gap-1 px-3.5 py-2.5 sm:grid-cols-[160px_1fr]"
                >
                  <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                    {label}
                  </dt>
                  <dd
                    className={`break-words font-medium text-[#1d1b2e] dark:text-[#f2f0fa] ${
                      mono ? 'font-mono-num' : ''
                    }`}
                  >
                    {val}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Health Form Attachment Viewer */}
            <div className="mt-4 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] p-3.5 dark:border-[#2a273d] dark:bg-[#13111f]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>Lampiran Borang Kesihatan:</span>
                  <span className="text-[#1d1b2e] dark:text-[#f2f0fa]">
                    {activeDetail.fail || 'Tiada'}
                  </span>
                  {activeDetail.failSize ? (
                    <span className="font-mono-num">
                      ({formatFileSize(activeDetail.failSize)})
                    </span>
                  ) : null}
                </div>

                {attachment?.dataUrl && (
                  <a
                    href={attachment.dataUrl}
                    download={attachment.fileName || activeDetail.fail}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#e5e2f2] bg-white px-2.5 py-1 text-xs font-semibold text-[#6c3cf0] hover:border-[#6c3cf0] dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#a285ff]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Muat turun</span>
                  </a>
                )}
              </div>

              {isLoadingAttachment ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                  <Loader2
                    className="h-4 w-4 animate-spin text-[#6c3cf0]"
                    aria-hidden="true"
                  />
                  <span>Memuatkan lampiran daripada storan...</span>
                </div>
              ) : attachment?.dataUrl &&
                attachment.mimeType.startsWith('image/') ? (
                <img
                  src={attachment.dataUrl}
                  alt={`Borang kesihatan ${activeDetail.nama}`}
                  className="mt-3 max-h-60 w-full rounded-lg border border-[#e5e2f2] object-contain dark:border-[#2e2a45]"
                />
              ) : null}
            </div>

            {/* Dorm Assignment Selector */}
            <div className="mt-4">
              <label
                htmlFor="warden-dorm-select"
                className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
              >
                Pilihan Dorm ({getAsramaBlockName(activeDetail.jantina)} ·{' '}
                {activeDetail.jantina === 'P'
                  ? '1A–1E, 2A–2E, 3A–3E & 4A'
                  : '1A–1E, 2A–2E, 3A–3E'}
                )
              </label>
              <select
                id="warden-dorm-select"
                value={selectedDorm}
                onChange={(e) => setSelectedDorm(e.target.value)}
                className="font-mono-num min-h-[46px] w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3.5 py-2 text-base font-semibold text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:min-h-[42px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
              >
                <option value="">-- Belum ditetapkan --</option>
                {getDormOptionsByGender(activeDetail.jantina).map((dormCode) => (
                  <option key={dormCode} value={dormCode}>
                    {getAsramaBlockName(activeDetail.jantina)} · Dorm{' '}
                    {dormCode}
                  </option>
                ))}
              </select>
            </div>

            {/* Warden Notes */}
            <div className="mt-4">
              <label
                htmlFor="warden-notes-input"
                className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
              >
                Catatan Warden (pilihan)
              </label>
              <textarea
                id="warden-notes-input"
                rows={2}
                maxLength={500}
                placeholder="cth: Layak masuk Dorm 1A atau perlu kemukakan borang kesihatan asal"
                value={wardenNotes}
                onChange={(e) => setWardenNotes(e.target.value)}
                className="w-full rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3 py-2 text-base text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 border-t border-[#f0edf9] pt-4 sm:flex sm:flex-wrap sm:items-center sm:justify-end dark:border-[#2a273d]">
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  void handleStatusChange(
                    activeDetail.id,
                    activeDetail.status,
                    wardenNotes,
                    selectedDorm,
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-[#d6cbfb] bg-[#ede8fd] px-3.5 py-2 text-xs font-semibold text-[#5528d6] hover:bg-[#e1d8fb] disabled:opacity-45 sm:min-h-[40px] sm:w-auto dark:border-[#3e2f70] dark:bg-[#2a214a] dark:text-[#b79eff] cursor-pointer whitespace-nowrap"
              >
                Simpan Dorm &amp; Catatan
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  void handleStatusChange(
                    activeDetail.id,
                    'Disemak',
                    wardenNotes,
                    selectedDorm,
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-white px-3.5 py-2 text-xs font-semibold text-[#1d1b2e] hover:bg-[#f7f6fc] disabled:opacity-45 sm:min-h-[40px] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
              >
                Tanda Disemak
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  void handleStatusChange(
                    activeDetail.id,
                    'Diluluskan',
                    wardenNotes,
                    selectedDorm,
                  )
                }
                className="min-h-[44px] w-full rounded-xl bg-[#6c3cf0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5a2cd9] disabled:opacity-45 sm:min-h-[40px] sm:w-auto cursor-pointer whitespace-nowrap"
              >
                Luluskan
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  void handleStatusChange(
                    activeDetail.id,
                    'Ditolak',
                    wardenNotes,
                    selectedDorm,
                  )
                }
                className="min-h-[44px] w-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-[#b4372f] hover:bg-red-100 disabled:opacity-45 sm:min-h-[40px] sm:w-auto dark:border-red-900/40 dark:bg-red-950/30 dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmMode === 'reset'}
        title="Pulihkan data contoh ke storan awan?"
        message="Semua permohonan sedia ada dalam pangkalan data storan awan akan digantikan dengan 5 rekod contoh asal."
        confirmLabel="Pulihkan data contoh"
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => {
          setConfirmMode(null);
          setIsMutating(true);
          void onResetSeed().finally(() => setIsMutating(false));
        }}
      />

      <ConfirmDialog
        open={confirmMode === 'clear'}
        title="Kosongkan semua permohonan?"
        message="Semua rekod permohonan dalam pangkalan data storan awan akan dipadamkan. Tindakan ini tidak boleh dibatalkan."
        confirmLabel="Ya, kosongkan semua"
        destructive
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => {
          setConfirmMode(null);
          setIsMutating(true);
          void onClearAll().finally(() => setIsMutating(false));
        }}
      />

      {/* Dedicated Warden ID & Password Accounts Modal */}
      <WardenAccountsModal
        open={accountsModalOpen}
        adminRecords={adminRecords}
        currentUserEmail={user.email}
        onClose={() => setAccountsModalOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
};
