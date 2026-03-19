import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import ForcePasswordModal from '../components/ForcePasswordModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { login, onPasswordChanged } = useAuth();
  const navigate = useNavigate();

  // Redirect to setup if no admin users exist yet
  useEffect(() => {
    axios.get(`${API}/setup/status`)
      .then(res => {
        if (res.data.setup_required) {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {/* network error — show login normally */});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const { must_change_password } = await login(username, password);
      if (must_change_password) {
        setShowModal(true);
      } else {
        toast.success(`Welcome back, ${username}!`);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    onPasswordChanged();
    setShowModal(false);
    toast.success('Password set! Welcome to C4K Inventory.');
    navigate('/', { replace: true });
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #1a2f5e 0%, #2e5496 50%, #3a6abf 100%)' }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10"
          aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Card */}
        <main className="relative z-10 w-full max-w-md px-6">
          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD700] rounded-2xl shadow-xl mb-4 relative">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#2e5496]" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Computers 4 Kids
            </h1>
            <p className="text-white/70 text-sm mt-1 font-medium">Inventory Management System</p>
          </div>

          {/* Login form card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Sign In
            </h2>

            <form onSubmit={handleSubmit} noValidate aria-label="Login form">
              {/* Username */}
              <div className="mb-4">
                <label
                  htmlFor="login-username"
                  className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  aria-required="true"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30 transition-colors duration-150"
                  placeholder="Enter your username"
                  disabled={loading}
                  data-testid="login-username-input"
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30 transition-colors duration-150"
                  placeholder="Enter your password"
                  disabled={loading}
                  data-testid="login-password-input"
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-red-700 text-sm font-medium"
                  data-testid="login-error-message"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full bg-[#2e5496] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#1e3a6e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] focus-visible:ring-offset-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-white/50 text-xs mt-6">
            &copy; {new Date().getFullYear()} Computers 4 Kids &mdash; West Sacramento, CA
          </p>
        </main>
      </div>

      <ForcePasswordModal isOpen={showModal} onSuccess={handlePasswordChanged} />
    </>
  );
}
