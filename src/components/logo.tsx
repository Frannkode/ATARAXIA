export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.55" />
      <path
        d="M16 9 L22 23 H19.2 L17.6 19 H14.4 L12.8 23 H10 Z M16 13.6 L14.9 16.6 H17.1 Z"
        fill="#ffffff"
      />
    </svg>
  );
}
