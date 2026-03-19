import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX } from 'lucide-react';

/**
 * AdminRoute — wraps a page that requires role="admin".
 * If a Technician (or any non-admin) navigates here manually,
 * they see an accessible "Access Denied" screen and are
 * redirected to the Dashboard after 2.5 s.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  const isDenied = !loading && user && user.role !== 'admin';

  useEffect(() => {
    if (!isDenied) return;
    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isDenied, countdown, navigate]);

  if (loading) return null;

  if (isDenied) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {/* assertive aria-live: screen reader announces immediately */}
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-white rounded-2xl shadow-xl border border-red-100 p-10 max-w-md w-full text-center"
          data-testid="access-denied-screen"
        >
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldX className="w-7 h-7 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm mb-1">
            You do not have permission to view this page.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Redirecting to Dashboard in <strong className="text-[#2e5496]">{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </div>
    );
  }

  return children;
}
