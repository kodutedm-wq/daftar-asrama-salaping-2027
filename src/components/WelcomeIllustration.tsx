import React from 'react';

export const WelcomeIllustration: React.FC = () => {
  return (
    <svg
      viewBox="0 0 180 110"
      className="h-24 w-36 shrink-0 sm:h-28 sm:w-44"
      fill="none"
      aria-hidden="true"
    >
      {/* Soft warm hills */}
      <path
        d="M8 96C30 68 58 64 88 80C114 93 142 62 174 82V104H8V96Z"
        fill="#F4C784"
        fillOpacity="0.55"
      />
      <path
        d="M28 104C58 76 92 78 124 92C145 101 160 88 176 94V104H28Z"
        fill="#E9B063"
        fillOpacity="0.45"
      />
      {/* Stylized hostel building */}
      <rect x="78" y="42" width="56" height="50" rx="6" fill="#FFFFFF" />
      <path d="M72 44L106 24L140 44H72Z" fill="#6C3CF0" />
      <rect x="88" y="52" width="12" height="12" rx="2" fill="#EDE8FD" />
      <rect x="112" y="52" width="12" height="12" rx="2" fill="#EDE8FD" />
      <rect x="88" y="70" width="12" height="12" rx="2" fill="#EDE8FD" />
      <rect x="103" y="70" width="10" height="22" rx="2" fill="#F59E0B" />
      <rect x="118" y="70" width="10" height="12" rx="2" fill="#EDE8FD" />
      {/* Sun & trees */}
      <circle cx="44" cy="30" r="10" fill="#F59E0B" fillOpacity="0.65" />
      <rect x="150" y="70" width="4" height="22" rx="2" fill="#92400E" />
      <circle cx="152" cy="64" r="11" fill="#1F6F4A" fillOpacity="0.85" />
      <rect x="52" y="76" width="3.5" height="16" rx="1.75" fill="#92400E" />
      <circle cx="53.75" cy="72" r="8.5" fill="#1F6F4A" fillOpacity="0.75" />
    </svg>
  );
};
