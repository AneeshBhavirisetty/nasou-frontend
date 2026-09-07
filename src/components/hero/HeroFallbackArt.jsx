/* Static, premium hero art — used when WebGL is unavailable or the viewer
   prefers reduced motion. A layered "exploded fitting" composition. */
export default function HeroFallbackArt({ className = '' }) {
  return (
    <svg viewBox="0 0 420 420" className={className} role="img" aria-label="PVC pipe fitting illustration">
      <defs>
        <radialGradient id="hf-glow" cx="50%" cy="42%" r="60%">
          <stop offset="0" stopColor="#d5eee4" />
          <stop offset="1" stopColor="#d5eee4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hf-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f7f1e3" />
          <stop offset="1" stopColor="#ddd0b6" />
        </linearGradient>
        <linearGradient id="hf-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ddd0b6" />
          <stop offset="1" stopColor="#bcac8c" />
        </linearGradient>
        <filter id="hf-sh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#0d2e22" floodOpacity="0.22" />
        </filter>
      </defs>

      <circle cx="210" cy="185" r="180" fill="url(#hf-glow)" />
      <ellipse cx="210" cy="366" rx="130" ry="20" fill="#0d2e22" opacity="0.1" />

      {/* faint back socket */}
      <g opacity="0.35">
        <rect x="70" y="150" width="120" height="70" rx="16" fill="url(#hf-body)" />
        <ellipse cx="70" cy="185" rx="16" ry="35" fill="url(#hf-ring)" />
      </g>

      {/* main elbow */}
      <g filter="url(#hf-sh)">
        <path d="M150 320 V210 A60 60 0 0 1 210 150 H320"
          fill="none" stroke="url(#hf-body)" strokeWidth="92" strokeLinecap="butt" />
        <path d="M150 320 V210 A60 60 0 0 1 210 150 H320"
          fill="none" stroke="#bcac8c" strokeWidth="94" strokeOpacity="0.25" />
        {/* socket rims */}
        <ellipse cx="320" cy="150" rx="20" ry="48" fill="url(#hf-ring)" />
        <ellipse cx="320" cy="150" rx="12" ry="34" fill="#ddd0b6" />
        <ellipse cx="150" cy="320" rx="48" ry="20" fill="url(#hf-ring)" />
        <ellipse cx="150" cy="320" rx="34" ry="12" fill="#ddd0b6" />
        {/* highlight */}
        <path d="M180 320 V210 A30 30 0 0 1 210 180 H320"
          fill="none" stroke="#ffffff" strokeWidth="7" strokeOpacity="0.55" />
      </g>

      {/* floating detail ring */}
      <g className="animate-float">
        <circle cx="332" cy="300" r="26" fill="none" stroke="#12805c" strokeWidth="6" opacity="0.9" />
        <circle cx="332" cy="300" r="14" fill="#12805c" opacity="0.12" />
      </g>
    </svg>
  );
}
