import React, {useEffect, useState} from 'react';
import {User} from 'firebase/auth';
import {
  Building2,
  CheckCircle2,
  Download,
  Loader2,
  LogIn,
  Search,
} from 'lucide-react';
import {lookupStatusInCloud} from '../services/hostelRepository';
import {getAsramaBlockName, PublicStatusResult} from '../types/hostel';
import {downloadApplicationPdf} from '../utils/pdfExport';
import {StatusBadge} from './StatusBadge';

interface StatusCheckerProps {
  user: User | null;
  isAdmin: boolean;
  initialQuery?: string;
  onSignIn?: () => Promise<void>;
  onNotify: (message: string) => void;
}

export const StatusChecker: React.FC<StatusCheckerProps> = ({
  user,
  isAdmin,
  initialQuery = '',
  onSignIn,
  onNotify,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [result, setResult] = useState<PublicStatusResult | null>(null);

  const performLookup = async (raw: string) => {
    const clean = raw.trim();
    setSearchedQuery(clean);
    if (!clean) {
      setResult(null);
      return;
    }
    setIsSearching(true);
    try {
      const found = await lookupStatusInCloud(clean, user, isAdmin);
      setResult(found);
    } catch {
      onNotify('Gagal menyemak status daripada pangkalan data awan.');
      setResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
      void performLookup(initialQuery);
    }
  }, [initialQuery]);

  // Re-fetch enriched PII details automatically if user logs in after searching
  useEffect(() => {
    if (searchedQuery && user) {
      void performLookup(searchedQuery);
    }
  }, [user?.uid, isAdmin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLookup(query);
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setIsGeneratingPdf(true);
    try {
      await downloadApplicationPdf({
        record: result.fullRecord,
        publicStatus: result,
      });
      onNotify('Borang pendaftaran asrama (PDF) berjaya dimuat turun.');
    } catch {
      onNotify('Gagal menjana fail PDF. Sila cuba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sampleRefs = ['A101', 'A102', 'A105'];

  const resolvedAsrama = result?.fullRecord
    ? getAsramaBlockName(result.fullRecord.jantina)
    : result?.asrama;
  const resolvedDorm = (
    result?.fullRecord?.dorm ??
    result?.dorm ??
    ''
  ).trim();

  return (
    <section className="rounded-2xl border border-[#ece9f6] bg-white p-5 shadow-xs sm:p-7 dark:border-[#2a273d] dark:bg-[#1b1929]">
      <h2 className="font-display text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa] sm:text-xl">
        Semak status permohonan asrama
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-[#5e5a77] dark:text-[#a8a4c2]">
        Masukkan Nombor Kad Pengenalan pelajar atau Nombor Rujukan daripada
        pangkalan data storan awan sekolah.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 max-w-xl">
        <label
          htmlFor="status-lookup-input"
          className="mb-1.5 block text-xs font-semibold text-[#5e5a77] dark:text-[#a8a4c2]"
        >
          No. Kad Pengenalan / No. Rujukan
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            id="status-lookup-input"
            type="text"
            autoComplete="off"
            placeholder="Contoh: A101 atau 080512-12-0456"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono-num min-h-[46px] flex-1 rounded-xl border border-[#e5e2f2] bg-[#f7f6fc] px-3.5 py-2 text-base text-[#1d1b2e] placeholder:text-[#7d7996]/70 focus:border-[#6c3cf0] focus:outline-none focus:ring-2 focus:ring-[#6c3cf0]/20 sm:min-h-[44px] sm:text-sm dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5a2cd9] disabled:opacity-55 sm:min-h-[44px] sm:w-auto cursor-pointer whitespace-nowrap shrink-0"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isSearching ? 'Menyemak...' : 'Semak status'}</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
          <span>Rujukan contoh:</span>
          {sampleRefs.map((refId) => (
            <button
              key={refId}
              type="button"
              onClick={() => {
                setQuery(refId);
                void performLookup(refId);
              }}
              className="font-mono-num inline-flex min-h-[36px] items-center rounded-lg bg-[#f3f1fb] px-2.5 py-1 font-semibold text-[#6c3cf0] hover:bg-[#e6e0fb] dark:bg-[#252238] dark:text-[#b79eff] cursor-pointer"
            >
              {refId}
            </button>
          ))}
        </div>
      </form>

      {searchedQuery !== null && !isSearching && (
        <div className="mt-6">
          {result ? (
            <div className="rounded-2xl border border-[#ece9f6] bg-[#f8f7fc] p-5 dark:border-[#2a273d] dark:bg-[#13111f]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ece9f6] pb-4 dark:border-[#2a273d]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#7d7996] dark:text-[#9893b8]">
                    <span className="font-mono-num font-bold text-[#6c3cf0] dark:text-[#a285ff]">
                      {result.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{result.tkt}</span>
                    {resolvedAsrama && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                          {resolvedAsrama}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">
                      Dihantar {result.tarikh}
                    </span>
                  </div>
                  <h3 className="font-display mt-1 text-lg font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
                    {result.fullRecord
                      ? result.fullRecord.nama
                      : `Permohonan Rujukan ${result.id}`}
                  </h3>
                </div>
                <StatusBadge status={result.status} />
              </div>

              {/* Approved Dorm Assignment & PDF Registration Banner */}
              {result.status === 'Diluluskan' && (
                <div className="mt-4 rounded-xl border border-[#1f6f4a]/30 bg-[#e8f5ee] p-4 dark:border-[#4cc38a]/35 dark:bg-[#152d22]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f6f4a] text-white dark:bg-[#2c8a5e]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#1f6f4a] dark:text-[#6ee7b7]">
                          Permohonan Diluluskan
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#153e2b] dark:text-[#ecfdf5]">
                          <Building2
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {resolvedAsrama ? `${resolvedAsrama} · ` : ''}
                            {resolvedDorm
                              ? `Dorm ${resolvedDorm}`
                              : 'Penempatan dorm sedang dikemas kini'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-[#153e2b] dark:text-[#d1fae5]">
                          Arahan: Sila download borang PDF ini dan bawa bersama
                          akuan kesihatan semasa pendaftaran. Borang yang dimuat
                          turun adalah borang permohonan yang telah diisi
                          secara online.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:shrink-0">
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => void handleDownloadPdf()}
                        className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1f6f4a] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#17573a] disabled:opacity-60 sm:w-auto dark:bg-[#2c8a5e] dark:hover:bg-[#23704c] cursor-pointer whitespace-nowrap"
                      >
                        {isGeneratingPdf ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Download className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>Download Borang PDF</span>
                      </button>
                      {!result.fullRecord && !user && onSignIn && (
                        <button
                          type="button"
                          onClick={() => void onSignIn()}
                          className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#1f6f4a]/35 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1f6f4a] hover:bg-[#f2fbf6] dark:border-[#4cc38a]/40 dark:bg-[#1b1929] dark:text-[#6ee7b7] cursor-pointer whitespace-nowrap"
                        >
                          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Log Masuk untuk Butiran Penuh</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                {result.fullRecord ? (
                  <>
                    <div>
                      <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                        No. Kad Pengenalan
                      </dt>
                      <dd className="font-mono-num mt-0.5 font-medium text-[#1d1b2e] dark:text-[#f2f0fa]">
                        {result.fullRecord.kp}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                        Penjaga
                      </dt>
                      <dd className="mt-0.5 font-medium text-[#1d1b2e] dark:text-[#f2f0fa]">
                        {result.fullRecord.penjaga}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                      Perlindungan Privasi
                    </dt>
                    <dd className="mt-0.5 text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                      Butiran peribadi penuh hanya dipaparkan kepada pemilik
                      akaun yang memohon atau Warden asrama.
                      {!user && onSignIn && (
                        <button
                          type="button"
                          onClick={() => void onSignIn()}
                          className="ml-1.5 inline-flex items-center gap-1 font-semibold text-[#6c3cf0] underline dark:text-[#a285ff] cursor-pointer"
                        >
                          <LogIn className="h-3 w-3" aria-hidden="true" />
                          <span>Log masuk Google untuk maklumat penuh</span>
                        </button>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                    Penempatan Dorm
                  </dt>
                  <dd className="font-mono-num mt-0.5 font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                    {resolvedDorm
                      ? `${resolvedAsrama ? `${resolvedAsrama} · ` : ''}Dorm ${resolvedDorm}`
                      : 'Belum ditetapkan'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[#7d7996] dark:text-[#9893b8]">
                    Borang Kesihatan
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#1d1b2e] dark:text-[#f2f0fa]">
                    {result.hasHealthForm ? 'Dilampirkan' : 'Tiada'}
                  </dd>
                </div>
              </dl>

              {result.catatanWarden && (
                <div className="mt-4 border-t border-[#ece9f6] pt-3 text-xs text-[#5e5a77] dark:border-[#2a273d] dark:text-[#a8a4c2]">
                  <span className="font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                    Catatan Warden:
                  </span>{' '}
                  {result.catatanWarden}
                </div>
              )}

              {result.status !== 'Diluluskan' && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ece9f6] pt-3 dark:border-[#2a273d]">
                  <span className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                    Simpan salinan slip semakan permohonan anda:
                  </span>
                  <button
                    type="button"
                    disabled={isGeneratingPdf}
                    onClick={() => void handleDownloadPdf()}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#d6cbfb] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#6c3cf0] hover:bg-[#ede8fd]/60 disabled:opacity-60 dark:border-[#3e2f70] dark:bg-[#1b1929] dark:text-[#b79eff] cursor-pointer"
                  >
                    {isGeneratingPdf ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Muat Turun Slip PDF</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ece9f6] bg-[#f8f7fc] p-5 text-sm text-[#5e5a77] dark:border-[#2a273d] dark:bg-[#13111f] dark:text-[#a8a4c2]">
              Tiada rekod dijumpai bagi carian{' '}
              <span className="font-mono-num font-semibold text-[#1d1b2e] dark:text-[#f2f0fa]">
                &quot;{searchedQuery || '—'}&quot;
              </span>
              . Sila semak semula nombor kad pengenalan atau nombor rujukan
              anda.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
