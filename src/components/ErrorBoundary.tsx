import React from 'react';
import {AlertTriangle, RotateCcw} from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  {children: React.ReactNode},
  ErrorBoundaryState
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, message: ''};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ralat tidak dijangka telah berlaku.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly =
        'Maaf, sambungan atau operasi storan mengalami gangguan sebentar.';
      try {
        const parsed = JSON.parse(this.state.message) as {error?: string};
        if (parsed.error?.toLowerCase().includes('permission')) {
          friendly =
            'Akses storan ditolak oleh peraturan keselamatan. Sila pastikan anda log masuk dengan akaun yang sah.';
        } else if (parsed.error?.toLowerCase().includes('quota')) {
          friendly =
            'Kuota harian pangkalan data awan telah dicapai buat masa ini. Sila cuba semula esok.';
        }
      } catch {
        // Non-JSON error message
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f3] p-6 text-[#17251e] dark:bg-[#111a15] dark:text-[#e9f0eb]">
          <div className="w-full max-w-md rounded-xl border border-[#dde4dd] bg-white p-6 shadow-sm dark:border-[#2d3d34] dark:bg-[#1a2620]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#b4372f] dark:bg-red-950/60 dark:text-[#ef7d74]">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold">
                  Gangguan Sistem Storan
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5f7067] dark:text-[#9fb0a6]">
                  {friendly}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15573a] dark:bg-[#4cc38a] dark:text-[#0b1a12] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Muat Semula Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
