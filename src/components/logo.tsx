// Círculo (equilibrio, completitud) atravesado por una onda en calma — la
// imagen que evoca "ataraxia": una superficie sin perturbación.
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
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.5" />
      <path
        d="M7.5 16.5c2 0 2-2.4 4-2.4s2 2.4 4 2.4 2-2.4 4-2.4 2 2.4 4 2.4 2-2.4 4-2.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="10.4" r="1.6" fill="#ffffff" />
    </svg>
  );
}
