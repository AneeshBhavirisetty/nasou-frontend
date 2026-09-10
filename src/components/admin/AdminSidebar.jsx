import { NavLink } from 'react-router-dom';
import Icon from '../Icon';
import { cx } from '../../lib/format';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'gauge' },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/discounts', label: 'Discounts', icon: 'tag' },
  { to: '/admin/orders', label: 'Orders', icon: 'truck' },
  { to: '/admin/users', label: 'Users', icon: 'user' },
  { to: '/admin/catalog/import', label: 'Catalog import', icon: 'layers' },
];

export default function AdminSidebar() {
  return (
    <>
      {/* desktop rail */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-[100px] rounded-lg border border-line bg-white/80 p-2.5 shadow-card backdrop-blur">
          <div className="mb-2 flex items-center gap-2.5 border-b border-line px-2 pb-3 pt-1.5">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-white">
              <Icon name="shieldCheck" size={17} />
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-bold">Admin</p>
              <p className="text-[11px] text-ink-35">Store console</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-semibold transition',
                    isActive ? 'bg-forest text-white shadow-card' : 'text-ink-70 hover:bg-sunk hover:text-ink'
                  )
                }
              >
                <Icon name={n.icon} size={16} />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* mobile top scroller */}
      <div className="no-bar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition',
                isActive ? 'border-forest bg-forest text-white shadow-card' : 'border-line bg-white text-ink-70'
              )
            }
          >
            <Icon name={n.icon} size={13} />
            {n.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
