import React from 'react';
import {AlertTriangle} from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#ece9f6] bg-white p-5 shadow-xl sm:p-6 dark:border-[#2a273d] dark:bg-[#1b1929]">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              destructive
                ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                : 'bg-[#ede8fd] text-[#6c3cf0] dark:bg-[#2a214a] dark:text-[#b79eff]'
            }`}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="confirm-dialog-title"
              className="font-display text-base font-bold text-[#1d1b2e] dark:text-[#f2f0fa]"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5e5a77] dark:text-[#a8a4c2]">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] w-full rounded-xl border border-[#e5e2f2] bg-white px-4 py-2 text-sm font-semibold text-[#1d1b2e] transition-colors hover:bg-[#f7f6fc] sm:w-auto dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa] dark:hover:bg-[#252238] cursor-pointer whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors sm:w-auto cursor-pointer whitespace-nowrap ${
              destructive
                ? 'bg-[#b4372f] hover:bg-[#962d26]'
                : 'bg-[#6c3cf0] hover:bg-[#5a2cd9]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
