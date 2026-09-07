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
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-[100px] space-y-1">
          <p className="eyebrow mb-2 px-3">Admin</p>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-semibold transition',
                  isActive ? 'bg-forest text-white' : 'text-ink-70 hover:bg-sunk hover:text-ink'
                )
              }
            >
              <Icon name={n.icon} size={16} />
              {n.label}
            </NavLink>
          ))}
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
                isActive ? 'border-forest bg-forest text-white' : 'border-line text-ink-70'
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
