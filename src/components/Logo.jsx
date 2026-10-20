/* The client's Nivora logo, as supplied (Nivora_Logo_files/), trimmed and
   resized into public/brand/. Never recolour or redraw it — it only sits on
   white or the cream canvas, so dark surfaces give it a white tile.

   variant
     'lockup'   — N mark + NIVORA letters side by side (headers, sidebars)
     'mark'     — the N mark alone (tight square spots)
     'name'     — the NIVORA letters alone, size = height
     'wordmark' — NIVORA + "A product by Naosuhive" (footer, invoice)
     'stacked'  — mark above the wordmark (sign-in screens)
   size is the mark's height in px; the other parts scale from it. */
const SRC = {
  mark: '/brand/nivora-icon.png',
  name: '/brand/nivora-name.png',
  wordmark: '/brand/nivora-wordmark.png',
  stacked: '/brand/nivora-logo.png',
};

export default function Logo({ variant = 'lockup', size = 40, className = '', nameClassName = '' }) {
  if (variant === 'mark') {
    return <img src={SRC.mark} alt="Nivora" width={size} height={size} className={`block shrink-0 object-contain ${className}`} />;
  }
  if (variant === 'name') {
    return <img src={SRC.name} alt="Nivora" height={size} style={{ height: size }} className={`block w-auto ${className}`} />;
  }
  if (variant === 'wordmark' || variant === 'stacked') {
    /* size is the width here — these are read by their width */
    return <img src={SRC[variant]} alt="Nivora — a product by Naosuhive" width={size} className={`block h-auto ${className}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={SRC.mark} alt="" aria-hidden="true" width={size} height={size} className="block shrink-0 object-contain" />
      <img
        src={SRC.name}
        alt="Nivora"
        height={Math.round(size * 0.42)}
        style={{ height: Math.round(size * 0.42) }}
        className={`block w-auto ${nameClassName}`}
      />
    </span>
  );
}
