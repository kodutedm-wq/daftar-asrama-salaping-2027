import React, {useState} from 'react';
import {Download, Share, WifiOff, X} from 'lucide-react';
import {useOnlineStatus, usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex h-11 sm:h-10 items-center gap-1.5 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] px-3 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf0] dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Pasang Aplikasi</span>
        <span className="sm:hidden">Pasang</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex h-11 sm:h-10 items-center gap-1.5 rounded-xl border border-[#ece9f6] bg-[#f8f7fc] px-3 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] dark:border-[#2a273d] dark:bg-[#1b1929] dark:text-[#f2f0fa] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Pasang iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#ece9f6] bg-white p-5 shadow-xl sm:p-6 dark:border-[#2a273d] dark:bg-[#1b1929]">
              <div className="flex items-start justify-between gap-3">
                <h3
                  id="ios-install-title"
                  className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]"
                >
                  Pasang di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#5e5a77] hover:bg-[#f7f6fc] dark:text-[#a8a4c2] dark:hover:bg-[#13111f] cursor-pointer"
                  aria-label="Tutup panduan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#1d1b2e] dark:text-[#f2f0fa]">
                <li>1. Tekan butang Kongsi (Share) pada bar alat Safari.</li>
                <li>
                  2. Tatal ke bawah dan pilih{' '}
                  <span className="font-semibold">Add to Home Screen</span>.
                </li>
                <li>
                  3. Tekan <span className="font-semibold">Add</span> untuk
                  membuka aplikasi secara terus.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#6c3cf0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a2cd9] cursor-pointer"
              >
                Faham
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg sm:bottom-5 no-print"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Mod Luar Talian — Data disimpan setempat</span>
    </div>
  );
};
