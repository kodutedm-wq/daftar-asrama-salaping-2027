import React, {useState} from 'react';
import {SCHOOL_LOGO_URL} from '../utils/storage';

interface SchoolCrestProps {
  className?: string;
  alt?: string;
}

export const SchoolCrest: React.FC<SchoolCrestProps> = ({
  className = 'h-9 w-9',
  alt = 'Lencana Rasmi SMK Salaping',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-md border border-[#1f6f4a]/25 bg-[#e8f3ec] text-[#1f6f4a] dark:border-[#4cc38a]/30 dark:bg-[#1f3328] dark:text-[#4cc38a]`}
        aria-label={alt}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={SCHOOL_LOGO_URL}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-md bg-white object-contain p-0.5`}
    />
  );
};
