import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AlertTriangle,
  Camera,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {prepareStudentPortraitPhoto} from '../utils/fileStorage';

interface StudentPhotoCaptureProps {
  photoDataUrl?: string;
  onChange: (nextPhotoDataUrl: string) => void;
  onNotify: (message: string) => void;
}

export const StudentPhotoCapture: React.FC<StudentPhotoCaptureProps> = ({
  photoDataUrl,
  onChange,
  onNotify,
}) => {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      stopCameraStream();
      setCameraError(null);
      setIsStartingCamera(true);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setIsStartingCamera(false);
        setCameraError(
          'Kamera langsung tidak disokong pada pelayar ini. Sila gunakan butang Kamera Peranti atau Pilih dari Galeri.',
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: {ideal: 720},
            height: {ideal: 720},
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError(
          'Akses kamera tidak dibenarkan atau tiada kamera dikesan. Anda boleh gunakan butang Kamera Peranti atau Pilih dari Galeri.',
        );
      } finally {
        setIsStartingCamera(false);
      }
    },
    [stopCameraStream],
  );

  useEffect(() => {
    if (cameraModalOpen) {
      void startCamera(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [cameraModalOpen, facingMode, startCamera, stopCameraStream]);

  const handleCloseCamera = () => {
    stopCameraStream();
    setCameraModalOpen(false);
    setCameraError(null);
  };

  const handleCaptureSnapshot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      onNotify('Kamera masih bersedia. Sila tunggu sebentar.');
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas unavailable');
      }
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const compressed = await prepareStudentPortraitPhoto(rawDataUrl);
      onChange(compressed);
      handleCloseCamera();
      onNotify('Gambar muka pelajar berjaya dirakam.');
    } catch {
      onNotify('Gagal merakam gambar daripada kamera. Sila cuba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      onNotify('Sila pilih fail gambar (JPG, PNG, atau WebP) sahaja.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onNotify('Saiz gambar melebihi 10MB. Sila pilih gambar yang lebih kecil.');
      return;
    }

    setIsProcessing(true);
    try {
      const compressed = await prepareStudentPortraitPhoto(file);
      onChange(compressed);
      if (cameraModalOpen) handleCloseCamera();
      onNotify('Foto wajah pelajar berjaya dimuat naik.');
    } catch {
      onNotify('Gagal memproses gambar yang dipilih. Sila cuba gambar lain.');
    } finally {
      setIsProcessing(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-[#ece9f6] bg-[#f8f7fc] p-4 sm:p-5 dark:border-[#2a273d] dark:bg-[#13111f]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Student Face Portrait Preview */}
        <div className="relative mx-auto flex h-32 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e5e2f2] bg-white shadow-xs sm:mx-0 dark:border-[#2e2a45] dark:bg-[#1b1929]">
          {photoDataUrl ? (
            <img
              src={photoDataUrl}
              alt="Foto wajah pemohon asrama"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-center text-[#8e89a8] dark:text-[#787396]">
              <UserRound className="h-9 w-9" aria-hidden="true" />
              <span className="px-2 text-[10px] font-medium leading-tight">
                Tiada foto
              </span>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2
                className="h-6 w-6 animate-spin text-white"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Instructions & Controls */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
              Foto Wajah Pelajar (Gambar Muka) *
            </h3>
            {photoDataUrl && (
              <span className="text-[11px] font-semibold text-[#1f6f4a] dark:text-[#4cc38a]">
                Sedia disimpan
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
            Ambil gambar muka pelajar terus menggunakan kamera atau pilih foto
            pasport/wajah yang jelas daripada galeri peranti.
          </p>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setCameraModalOpen(true)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#6c3cf0] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a2cd9] disabled:opacity-50 sm:w-auto cursor-pointer whitespace-nowrap"
            >
              <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Ambil Gambar Kamera</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-3.5 py-2 text-xs font-semibold text-[#1d1b2e] transition-colors hover:border-[#6c3cf0] hover:text-[#6c3cf0] disabled:opacity-50 sm:w-auto dark:border-[#2e2a45] dark:bg-[#1b1929] dark:text-[#f2f0fa] cursor-pointer whitespace-nowrap"
            >
              <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pilih dari Galeri</span>
            </button>

            {photoDataUrl && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onChange('')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-[#b4372f] transition-colors hover:bg-red-50 disabled:opacity-50 sm:w-auto dark:border-red-900/40 dark:bg-[#1b1929] dark:text-[#ef7d74] cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Padam</span>
              </button>
            )}
          </div>

          {/* Hidden Inputs: Gallery & Native Camera Fallback */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={(e) => void handleFileInput(e.target.files?.[0])}
            className="sr-only"
            aria-label="Pilih foto wajah daripada galeri peranti"
          />
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => void handleFileInput(e.target.files?.[0])}
            className="sr-only"
            aria-label="Buka kamera peranti"
          />
        </div>
      </div>

      {/* Live Camera Capture Modal */}
      {cameraModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-capture-title"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#ece9f6] bg-white p-4 shadow-xl sm:p-5 dark:border-[#2a273d] dark:bg-[#1b1929]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h4
                  id="camera-capture-title"
                  className="font-display text-base font-bold text-[#1d1b2e] dark:text-[#f2f0fa]"
                >
                  Ambil Gambar Wajah Pelajar
                </h4>
                <p className="text-xs text-[#5e5a77] dark:text-[#a8a4c2]">
                  Pastikan wajah berada di tengah bingkai dan pencahayaan cukup.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                aria-label="Tutup kamera"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e5e2f2] text-[#5e5a77] hover:bg-[#f7f6fc] dark:border-[#2e2a45] dark:text-[#a8a4c2] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-[#7c4d12] dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="space-y-3">
                    <p className="leading-relaxed">{cameraError}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#6c3cf0] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5a2cd9] cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Buka Kamera Peranti</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2e] dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                      >
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Pilih dari Galeri</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#110f1c]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`h-full w-full object-cover ${
                      facingMode === 'user' ? '-scale-x-100' : ''
                    }`}
                  />
                  {/* Face Alignment Oval Guide */}
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="h-52 w-40 rounded-[50%] border-2 border-dashed border-white/65 shadow-[0_0_0_9999px_rgba(12,10,22,0.28)]" />
                  </div>
                  {isStartingCamera && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#110f1c]/80 text-xs text-white">
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      <span>Menghidupkan kamera...</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    disabled={isStartingCamera || isProcessing}
                    onClick={() =>
                      setFacingMode((m) =>
                        m === 'user' ? 'environment' : 'user',
                      )
                    }
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e2f2] bg-[#f8f7fc] px-3.5 py-2 text-xs font-semibold text-[#1d1b2e] hover:border-[#6c3cf0] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tukar Kamera</span>
                  </button>

                  <button
                    type="button"
                    disabled={isStartingCamera || isProcessing}
                    onClick={() => void handleCaptureSnapshot()}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6c3cf0] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5a2cd9] disabled:opacity-50 sm:flex-1 cursor-pointer"
                  >
                    {isProcessing ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Camera className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>Tangkap Gambar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
