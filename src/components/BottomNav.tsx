import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: '点菜', end: true, d: 'M4 10.5 12 4l8 6.5V20H4z' },
  { to: '/dishes', label: '菜品库', end: false, d: 'M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z' },
  { to: '/pantry', label: '食材库', end: false, d: 'M5 9h14l-1.2 10.2H6.2zM8 9V6.5a4 4 0 0 1 8 0V9' },
  { to: '/ai', label: 'AI 厨房', end: false, d: 'M12 3.5 13.6 9l5.5 1.6-5.5 1.6L12 17.7l-1.6-5.5L4.9 10.6 10.4 9z' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-line bg-cream/95 backdrop-blur">
      <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d} />
              </svg>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
