import { cx } from '../lib/format';

/* Infinite horizontal marquee. Renders the children twice and slides -50%,
   so the loop is seamless. Pauses on hover; frozen under reduced-motion. */
export default function Marquee({ items = [], className = '', render }) {
  const row = (key) => (
    <div key={key} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={key === 'b'}>
      {items.map((it, i) => (
        <div key={i} className="shrink-0">{render ? render(it) : <span>{it}</span>}</div>
      ))}
    </div>
  );
  return (
    <div className={cx('no-bar group relative overflow-hidden', className)}>
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
