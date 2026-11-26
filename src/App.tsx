import React, {useCallback, useEffect, useState} from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  ClipboardList,
  LayoutGrid,
  LogIn,
  LogOut,
  Moon,
  Printer,
  Search,
  Sun,
} from 'lucide-react';
import {ApplicationWizard} from './components/ApplicationWizard';
import {HealthFormModal} from './components/HealthFormModal';
import {
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallButton';
import {SchoolCrest} from './components/SchoolCrest';
import {StatusChecker} from './components/StatusChecker';
import {WardenDashboard} from './components/WardenDashboard';
import {auth, googleProvider, mapFirebaseAuthError} from './lib/firebase';
import {
  checkIsAdminUser,
  clearApplicationsInCloud,
  seedSampleApplicationsInCloud,
  submitApplicationToCloud,
  subscribeAdminRecords,
  subscribeAllApplications,
  subscribeMyApplications,
  updateApplicationStatusInCloud,
} from './services/hostelRepository';
import {
  AdminRecord,
  ApplicationStatus,
  DraftState,
  HostelApplication,
  TabRoute,
} from './types/hostel';
import {
  createEmptyDraft,
  loadFromStorage,
  loadInitialDraft,
  saveToStorage,
  STORAGE_KEYS,
} from './utils/storage';

function getRouteFromLocation(): TabRoute {
  const hash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
  const path = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  const tabParam = (new URLSearchParams(window.location.search).get('tab') || '').toLowerCase();
  const candidate = hash || tabParam || path;
  if (candidate === 'pemohon') return 'pemohon';
  if (candidate === 'semak') return 'semak';
  return 'admin';
}

export default function App() {
  const [route, setRoute] = useState<TabRoute>(() => getRouteFromLocation());
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);

  const [allApplications, setAllApplications] = useState<HostelApplication[]>(
    [],
  );
  const [myApplications, setMyApplications] = useState<HostelApplication[]>([]);
  const [adminRecords, setAdminRecords] = useState<AdminRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [globalSearch, setGlobalSearch] = useState('');
  const [statusLookupSeed, setStatusLookupSeed] = useState('');
  const [draft, setDraft] = useState<DraftState>(() => loadInitialDraft());
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = loadFromStorage<string>(STORAGE_KEYS.THEME, '');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const onRouteChange = () => setRoute(getRouteFromLocation());
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setAllApplications([]);
        setMyApplications([]);
        setAdminRecords([]);
        setAuthReady(true);
        return;
      }
      try {
        const adminFlag = await checkIsAdminUser(nextUser);
        setIsAdmin(adminFlag);
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setIsLoadingData(true);
    let unsubAll: (() => void) | undefined;
    let unsubAdmins: (() => void) | undefined;

    if (isAdmin) {
      unsubAll = subscribeAllApplications(
        (items) => {
          setAllApplications(items);
          setIsLoadingData(false);
        },
        (err) => {
          setIsLoadingData(false);
          setFatalError(err);
        },
      );
      unsubAdmins = subscribeAdminRecords(
        (items) => setAdminRecords(items),
        () => setAdminRecords([]),
      );
    } else {
      setAllApplications([]);
      setAdminRecords([]);
    }

    const unsubMine = subscribeMyApplications(
      user.uid,
      (items) => {
        setMyApplications(items);
        if (!isAdmin) setIsLoadingData(false);
      },
      (err) => {
        if (!isAdmin) setIsLoadingData(false);
        setFatalError(err);
      },
    );

    return () => {
      if (unsubAll) unsubAll();
      if (unsubAdmins) unsubAdmins();
      unsubMine();
    };
  }, [authReady, user, isAdmin, authRefreshTick]);

  const navigateTo = (next: TabRoute) => {
    setRoute(next);
    window.location.hash = next;
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.THEME, next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Berjaya log masuk.');
    } catch (error) {
      showToast(mapFirebaseAuthError(error));
    }
  };

  const handleSignInEmailPassword = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const adminFlag = await checkIsAdminUser(cred.user);
    setIsAdmin(adminFlag);
    setAuthRefreshTick((t) => t + 1);
    if (!cred.user.emailVerified) {
      showToast('Sila sahkan e-mel anda terlebih dahulu.');
    } else if (adminFlag) {
      showToast('Berjaya log masuk sebagai Warden.');
    } else {
      showToast('Berjaya log masuk.');
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const handleSendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      showToast('Pautan pengesahan telah dihantar semula ke e-mel anda.');
    } catch (error) {
      showToast(mapFirebaseAuthError(error));
    }
  };

  const handleRefreshAuthVerification = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setUser(refreshed);
    const adminFlag = await checkIsAdminUser(refreshed);
    setIsAdmin(adminFlag);
    setAuthRefreshTick((t) => t + 1);
    if (!refreshed.emailVerified) {
      showToast('E-mel masih belum disahkan. Sila klik pautan dalam peti masuk anda.');
    } else if (adminFlag) {
      showToast('Pengesahan berjaya. Selamat datang ke Dashboard Warden.');
    } else {
      showToast('E-mel disahkan, tetapi akaun belum berdaftar sebagai Warden.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast('Anda telah log keluar.');
  };

  const handleUpdateDraft = (nextDraft: DraftState) => {
    setDraft(nextDraft);
    saveToStorage(STORAGE_KEYS.DRAFT, nextDraft);
  };

  const handleSubmitApplication = async (
    submittedDraft: DraftState,
    cloudDataUrl: string | null,
  ): Promise<string> => {
    if (!user) {
      throw new Error('Sila log masuk terlebih dahulu.');
    }
    const refId = await submitApplicationToCloud(
      user,
      submittedDraft,
      cloudDataUrl,
    );
    const empty = createEmptyDraft();
    setDraft(empty);
    saveToStorage(STORAGE_KEYS.DRAFT, empty);
    showToast('Permohonan berjaya disimpan ke storan awan.');
    return refId;
  };

  const handleUpdateStatus = async (
    id: string,
    status: ApplicationStatus,
    catatanWarden = '',
    dorm?: string,
  ) => {
    const existingApp = allApplications.find((a) => a.id === id);
    const resolvedDorm =
      dorm !== undefined ? dorm : existingApp?.dorm || '';
    await updateApplicationStatusInCloud(
      id,
      status,
      catatanWarden,
      resolvedDorm,
      existingApp?.jantina,
    );
    showToast(
      resolvedDorm
        ? `Rekod ${id} (${status} · Dorm ${resolvedDorm}) dikemas kini.`
        : `Status ${id} dikemas kini kepada ${status}.`,
    );
  };

  const handleResetSeed = async () => {
    if (!user) return;
    await seedSampleApplicationsInCloud(user, allApplications);
    showToast('Data contoh berjaya disimpan ke storan awan.');
  };

  const handleClearAll = async () => {
    await clearApplicationsInCloud(allApplications);
    showToast('Semua rekod storan awan telah dikosongkan.');
  };

  const handleTopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (route !== 'admin' && globalSearch.trim()) {
      setStatusLookupSeed(globalSearch.trim());
      navigateTo('semak');
    }
  };

  const navItems: Array<{
    id: TabRoute;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {
      id: 'admin',
      label: 'Dashboard Warden',
      shortLabel: 'Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'pemohon',
      label: 'Permohonan Asrama',
      shortLabel: 'Permohonan',
      icon: ClipboardList,
    },
    {
      id: 'semak',
      label: 'Semak Status',
      shortLabel: 'Semak',
      icon: Search,
    },
  ];

  const userDisplayName = user
    ? (user.displayName || '').trim().split(/\s+/)[0] ||
      user.email?.split('@')[0] ||
      'Pengguna'
    : 'Log Masuk';

  return (
    <div className="min-h-screen bg-[#efecf9] p-0 text-[#1d1b2e] transition-colors sm:p-4 lg:p-6 dark:bg-[#0d0c16] dark:text-[#f2f0fa]">
      {/* Rounded Outer App Window Shell matching Reference Template */}
      <div className="mx-auto flex min-h-screen max-w-[1380px] flex-col bg-white sm:min-h-[calc(100vh-2rem)] sm:flex-row sm:rounded-[28px] sm:p-4 sm:shadow-[0_24px_64px_rgba(32,20,78,0.09)] lg:min-h-[calc(100vh-3rem)] lg:p-5 dark:bg-[#151322] no-print">
        {/* LEFT VERTICAL VIOLET SIDEBAR RAIL (Desktop / Tablet) */}
        <aside
          aria-label="Navigasi sisi"
          className="hidden sm:flex w-[68px] shrink-0 flex-col items-center justify-between rounded-[22px] bg-gradient-to-b from-[#7344f5] to-[#5e2ce0] py-5 text-white shadow-lg shadow-[#6c3cf0]/25"
        >
          {/* Top Crest Icon */}
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('admin');
            }}
            title="Asrama SMK Salaping 2027"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 p-1 transition-colors hover:bg-white/25"
          >
            <SchoolCrest className="h-8 w-8 rounded-lg" />
          </a>

          {/* Primary Route Icons */}
          <nav className="flex flex-col items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#6c3cf0] shadow-md'
                      : 'text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setHealthModalOpen(true)}
              title="Borang Pemeriksaan Kesihatan (A4)"
              aria-label="Borang Pemeriksaan Kesihatan A4"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <Printer className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>

          {/* Bottom Auth Action Icon */}
          <button
            type="button"
            onClick={() =>
              user ? void handleSignOut() : void handleSignIn()
            }
            title={user ? `Log Keluar (${user.email})` : 'Log Masuk Google'}
            aria-label={user ? 'Log Keluar' : 'Log Masuk Google'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
          >
            {user ? (
              <LogOut className="h-5 w-5" aria-hidden="true" />
            ) : (
              <LogIn className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </aside>

        {/* RIGHT MAIN CONTENT FRAME */}
        <div className="flex min-w-0 flex-1 flex-col px-4 pt-3 pb-24 sm:px-6 sm:pt-1 sm:pb-2 lg:px-8">
          {/* Top Bar inside Main Frame (Search Left + Utilities & Profile Right) */}
          <header className="flex flex-col-reverse gap-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {/* Search Bar */}
            <form
              onSubmit={handleTopSearchSubmit}
              className="relative w-full sm:min-w-[200px] sm:max-w-md sm:flex-1"
            >
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#7d7996] dark:text-[#9893b8]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari nama pelajar, No. KP atau rujukan"
                placeholder="Cari nama, No. KP atau rujukan..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#f3f2f8] pr-4 pl-10 text-base text-[#1d1b2e] placeholder:text-[#7d7996] focus:bg-[#eceaf6] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/25 sm:min-h-[42px] sm:text-sm dark:bg-[#1f1d2e] dark:text-[#f2f0fa] dark:placeholder:text-[#8f8aad]"
              />
            </form>

            {/* Right Utility Controls + User Profile */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:justify-end sm:gap-3">
              <div className="flex items-center gap-2 sm:hidden">
                <SchoolCrest className="h-8 w-8" />
                <span className="font-display text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                  Asrama 2027
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <PWAInstallButton />

                <button
                  type="button"
                  onClick={() => setHealthModalOpen(true)}
                  title="Buka Borang Kesihatan (A4)"
                  aria-label="Buka Borang Kesihatan A4"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] px-3 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] sm:h-10 dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden lg:inline">Borang A4</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Tukar ke mod terang' : 'Tukar ke mod gelap'}
                  title={isDark ? 'Mod terang' : 'Mod gelap'}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ece9f6] bg-[#f8f7fc] text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] sm:h-10 sm:w-10 dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    user ? void handleSignOut() : void handleSignIn()
                  }
                  title={
                    user
                      ? `Log keluar (${user.email})`
                      : 'Log masuk dengan Google'
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] pr-3 pl-1.5 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] sm:h-10 dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6c3cf0] text-[11px] font-bold text-white">
                    {user ? userDisplayName.slice(0, 2).toUpperCase() : 'GM'}
                  </span>
                  <span className="max-w-[84px] truncate sm:max-w-none">
                    {userDisplayName}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* Compact Route Switcher Header */}
          <div className="mt-1 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f0edf9] pb-3 dark:border-[#2a273d]">
            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-[11px] font-medium text-[#7d7996] dark:text-[#9893b8]">
                  SMK Salaping, Kota Marudu · Sesi Persekolahan 2027
                </p>
                <h1 className="font-display text-lg font-bold text-[#1d1b2e] sm:text-xl dark:text-[#f2f0fa]">
                  {route === 'admin'
                    ? 'Portal Permohonan Asrama SMK Salaping 2027'
                    : route === 'pemohon'
                      ? 'Pendaftaran Permohonan Asrama'
                      : 'Semakan Status Permohonan'}
                </h1>
              </div>
            </div>

            {/* Clean inline route links for quick visibility */}
            <nav
              aria-label="Penukar paparan"
              className="hidden sm:flex items-center gap-4 text-xs font-semibold"
            >
              {navItems.map((item) => {
                const active = route === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`border-b-2 pb-1 transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#6c3cf0] text-[#6c3cf0] dark:border-[#a285ff] dark:text-[#a285ff]'
                        : 'border-transparent text-[#7d7996] hover:text-[#1d1b2e] dark:text-[#9893b8] dark:hover:text-[#f2f0fa]'
                    }`}
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Active Viewport */}
          <main className="flex-1">
            {route === 'admin' && (
              <WardenDashboard
                user={user}
                authReady={authReady}
                isAdmin={isAdmin}
                isLoadingData={isLoadingData}
                applications={allApplications}
                adminRecords={adminRecords}
                searchQuery={globalSearch}
                onSearchQueryChange={setGlobalSearch}
                onSignIn={handleSignIn}
                onSignInEmailPassword={handleSignInEmailPassword}
                onSendPasswordReset={handleSendPasswordReset}
                onSendVerificationEmail={handleSendVerificationEmail}
                onRefreshAuthVerification={handleRefreshAuthVerification}
                onSignOut={handleSignOut}
                onUpdateStatus={handleUpdateStatus}
                onResetSeed={handleResetSeed}
                onClearAll={handleClearAll}
                onNotify={showToast}
              />
            )}

            {route === 'pemohon' && (
              <ApplicationWizard
                user={user}
                authReady={authReady}
                myApplications={myApplications}
                draft={draft}
                onUpdateDraft={handleUpdateDraft}
                onSignIn={handleSignIn}
                onSubmitApplication={handleSubmitApplication}
                onOpenHealthForm={() => setHealthModalOpen(true)}
                onGoToCheckStatus={() => navigateTo('semak')}
                onNotify={showToast}
              />
            )}

            {route === 'semak' && (
              <StatusChecker
                user={user}
                isAdmin={isAdmin}
                initialQuery={statusLookupSeed}
                onSignIn={handleSignIn}
                onNotify={showToast}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="mt-6 pt-3 text-center text-xs text-[#7d7996] dark:text-[#8f8aad]">
            Sistem Pendaftaran Asrama SMK Salaping · Storan Awan Cloud
            Firestore · © 2027 SMK Salaping
          </footer>
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation (< 10% viewport height) */}
      <nav
        aria-label="Navigasi mudah alih"
        className="fixed right-0 bottom-0 left-0 z-30 border-t border-[#ece9f6] bg-white/95 backdrop-blur-md sm:hidden dark:border-[#2a273d] dark:bg-[#1b1929]/95 no-print"
        style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}
      >
        <div className="grid h-15 grid-cols-3">
          {navItems.map((item) => {
            const active = route === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'text-[#6c3cf0] dark:text-[#a285ff]'
                    : 'text-[#7d7996] dark:text-[#9893b8]'
                }`}
              >
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-[#6c3cf0] dark:bg-[#a285ff]"
                    aria-hidden="true"
                  />
                )}
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Printable A4 Health Inspection Form Modal */}
      <HealthFormModal
        open={healthModalOpen}
        draftForm={draft.form}
        onClose={() => setHealthModalOpen(false)}
        onNotify={showToast}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-[#1d1b2e] px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg sm:bottom-6 dark:bg-[#f2f0fa] dark:text-[#151322] no-print"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
