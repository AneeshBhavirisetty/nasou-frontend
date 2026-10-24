import Icon from './Icon';
import { SERVICE_AREA } from '../lib/geo';
import { cx } from '../lib/format';

/* "Deliver to" in the header. Nivora delivers in Tirupati only, so this states
   the service area instead of offering a location picker. Pass display classes
   that keep it a flex row (`flex`, `xl:flex`) — `block` stacks the pin over
   the text and pushes it out of the chip (review 6). */

export default function DeliverTo({ className = 'flex' }) {
  return (
    <div className={cx('h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/70 py-1 pl-3 pr-4', className)} title={`We deliver only in ${SERVICE_AREA.city}`}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-forest">
        <Icon name="pin" size={15} />
      </span>
      <span className="min-w-0 leading-[1.15]">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-50">Delivering in</span>
        <span className="block max-w-[150px] truncate text-[13px] font-bold text-forest">{SERVICE_AREA.city}</span>
      </span>
    </div>
  );
}
