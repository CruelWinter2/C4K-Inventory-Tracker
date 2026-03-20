import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Download, LogOut, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Sidebar({ onExport }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar whenever the route changes (user navigated)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
    navigate('/login', { replace: true });
  };

  const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/add', label: 'Add New Computer', icon: PlusCircle, end: false },
    ...(user?.role === 'admin' ? [{ to: '/users', label: 'User Management', icon: Users, end: false, testid: 'nav-user-management' }] : []),
  ];

  return (
    <>
      {/* Mobile hamburger button — only visible on small screens */}
      <button
        className="fixed top-3 left-3 z-[60] md:hidden bg-[#2e5496] text-white p-2.5 rounded-lg shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
        onClick={() => setMobileOpen(o => !o)}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls="main-sidebar"
        data-testid="mobile-menu-btn"
      >
        {mobileOpen
          ? <X className="w-5 h-5" aria-hidden="true" />
          : <Menu className="w-5 h-5" aria-hidden="true" />}
      </button>

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="main-sidebar"
        className={`h-screen w-64 bg-[#2e5496] text-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        aria-label="Main navigation"
      >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/15">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#FFD700] fill-current" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white leading-none">
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
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, testid }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                data-testid={testid || `nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 w-full
                  ${isActive
                    ? 'bg-white/20 border-l-4 border-[#FFD700] pl-3 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
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
              aria-label="Export currently visible inventory records to a CSV file"
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
            {user.role === 'admin' && (
              <span className="ml-1.5 text-[#FFD700] text-[10px] font-bold uppercase tracking-wide">(Admin)</span>
            )}
          </p>
        )}
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-red-200 transition-colors duration-150 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          aria-label="Log out of the C4K Inventory System"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
