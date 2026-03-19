import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Download, LogOut, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/add', label: 'Add New Computer', icon: PlusCircle, end: false },
];

export default function Sidebar({ onExport }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="h-screen w-64 bg-[#2e5496] text-white flex flex-col fixed left-0 top-0 z-50"
      aria-label="Main navigation"
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/15">
        <div className="relative">
          <Star className="w-9 h-9 fill-[#FFD700] text-[#FFD700]" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white leading-none">
            C4K
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-wide">Computers 4 Kids</p>
          <p className="text-white/60 text-xs font-medium">Inventory System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Sidebar navigation">
        <ul role="list" className="space-y-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 w-full
                  ${isActive
                    ? 'bg-white/20 border-l-4 border-[#FFD700] pl-3 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}

          {/* Export */}
          <li>
            <button
              onClick={onExport}
              data-testid="nav-export-data"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-150 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
              aria-label="Export all inventory data to CSV file"
            >
              <Download className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Export Data</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/15 px-4 py-4">
        {user && (
          <p className="text-white/60 text-xs mb-3 px-2 font-medium truncate">
            Signed in as <span className="text-white font-semibold">{user.username}</span>
          </p>
        )}
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-red-200 transition-colors duration-150 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          aria-label="Log out of the system"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
