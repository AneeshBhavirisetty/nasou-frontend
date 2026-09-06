/* A single stroked icon set keeps the line weight consistent across the
   storefront — mixing icon libraries is the fastest way to look unfinished. */

const paths = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  cart: 'M3 4h2l2.6 11.6a2 2 0 0 0 2 1.4h7.7a2 2 0 0 0 2-1.55L21 8H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  heart: 'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  close: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  leaf: 'M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16Zm0 0c0-6 2-9 7-11',
  route: 'M9 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6M6 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  shield: 'M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z',
  truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  filter: 'M4 5h16M7 12h10M10 19h4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  check: 'm4 12 5 5L20 6',
  pin: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  package: 'M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5m0 0 9-5m-9 5v8',
  sparkle: 'M12 3v6m0 6v6M3 12h6m6 0h6M6.3 6.3l4.2 4.2m3 3 4.2 4.2m0-11.4-4.2 4.2m-3 3-4.2 4.2',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  eye: 'M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Z',
  eyeOff: 'M20.49 15.49A7.5 7.5 0 0 1 15.51 20.49M18.69 6.31A7.5 7.5 0 0 1 6.31 18.69M5 5l14 14',
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.6 }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
