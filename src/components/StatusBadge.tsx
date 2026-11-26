import React from 'react';
import {CheckCircle2, Clock, FileSearch, XCircle} from 'lucide-react';
import {ApplicationStatus} from '../types/hostel';

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const STATUS_STYLES: Record<
  ApplicationStatus,
  {
    wrapper: string;
    icon: React.ComponentType<{className?: string}>;
    label: string;
  }
> = {
  Dihantar: {
    wrapper:
      'border-amber-500/30 bg-amber-50 text-amber-800 dark:border-amber-400/35 dark:bg-amber-950/50 dark:text-amber-300',
    icon: Clock,
    label: 'Dihantar',
  },
  Disemak: {
    wrapper:
      'border-[#6c3cf0]/30 bg-[#ede8fd] text-[#5528d6] dark:border-[#a285ff]/35 dark:bg-[#271e46] dark:text-[#c0abff]',
    icon: FileSearch,
    label: 'Disemak',
  },
  Diluluskan: {
    wrapper:
      'border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: CheckCircle2,
    label: 'Diluluskan',
  },
  Ditolak: {
    wrapper:
      'border-red-600/30 bg-red-50 text-red-800 dark:border-red-400/35 dark:bg-red-950/50 dark:text-red-300',
    icon: XCircle,
    label: 'Ditolak',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({status}) => {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.Dihantar;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg.wrapper}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};
