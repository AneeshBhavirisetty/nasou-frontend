import Icon from './Icon';
import { SERVICE_AREA } from '../lib/geo';
import { cx } from '../lib/format';

/* "Deliver to" in the header. Nivora delivers in Tirupati only, so this states
   the service area instead of offering a location picker. */

export default function DeliverTo({ className = '' }) {
  return (
    <div className={cx('flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5', className)} title={`We deliver only in ${SERVICE_AREA.city}`}>
      <Icon name="pin" size={17} className="shrink-0 text-forest" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[10.5px] font-semibold text-ink-50">Delivering in</span>
        <span className="block max-w-[150px] truncate text-[12.5px] font-bold text-forest">{SERVICE_AREA.city}</span>
      </span>
    </div>
  );
}
