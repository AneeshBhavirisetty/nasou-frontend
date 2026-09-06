import { cx } from '../lib/format';
import Icon from './Icon';

/* ─────────────────────────────────────────────────────────────
   EmptyState — reusable empty / zero-results state component.

   Props:
     icon     string          Icon name from Icon.jsx
     title    string          Bold headline
     note     string          Supporting sentence
     action   ReactNode       Optional CTA (a Button)
     compact  bool            Smaller padding variant
   ───────────────────────────────────────────────────────────── */
export default function EmptyState({ icon = 'search', title, note, action, compact = false }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-xl border border-dashed border-line bg-white text-center',
        compact ? 'px-8 py-14' : 'px-8 py-24'
      )}
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-ink-35">
        <Icon name={icon} size={24} />
      </span>
      {title && (
        <p className="mt-5 font-display text-[18px] font-bold">{title}</p>
      )}
      {note && (
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-50">{note}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
