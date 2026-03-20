import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

function PasswordRule({ met, text }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${met ? 'text-green-500' : 'text-gray-300'}`} />
      {text}
    </li>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If setup is already done, redirect to login
  useEffect(() => {
    axios.get(`${API_BASE}/setup/status`)
      .then(res => {
        if (!res.data.setup_required) {
          navigate('/login', { replace: true });
        }
      })
      .catch(() => {/* network error — let user try anyway */})
      .finally(() => setChecking(false));
  }, [navigate]);

  const rules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /\d/.test(password),
    match:     password.length > 0 && password === confirm,
  };
  const allRulesMet = Object.values(rules).every(Boolean) && username.trim().length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!allRulesMet) {
      setError('Please meet all password requirements before continuing.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/setup/init`, {
        username: username.trim(),
        password,
        confirm_password: confirm,
      });
      toast.success('Admin account created! You can now sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Setup failed. Please try again.';
      setError(msg);
      if (err.response?.status === 403) {
        // Setup already complete — redirect to login
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a2f5e 0%, #2e5496 50%, #3a6abf 100%)' }}>
        <p className="text-white/70 text-sm">Checking setup status…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: 'linear-gradient(135deg, #1a2f5e 0%, #2e5496 50%, #3a6abf 100%)' }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-10"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <main className="relative z-10 w-full max-w-md px-6" role="main">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD700] rounded-2xl shadow-xl mb-4">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#2e5496]" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Computers 4 Kids
          </h1>
          <p className="text-white/70 text-sm mt-1 font-medium">Inventory Management System</p>
        </div>

        {/* Setup card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block bg-[#FFD700] text-[#1a2f5e] text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide">
              First-Time Setup
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Create Admin Account
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            No users found. Set up your administrator account to get started.
          </p>

          <form onSubmit={handleSubmit} noValidate aria-label="First-time setup form">
            {/* Username */}
            <div className="mb-4">
              <label
                htmlFor="setup-username"
                className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Admin Username
              </label>
              <input
                id="setup-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                aria-required="true"
                aria-describedby={error ? 'setup-error' : 'setup-username-hint'}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30 transition-colors"
                placeholder="e.g. admin"
                disabled={loading}
                data-testid="setup-username-input"
              />
              <p id="setup-username-hint" className="text-xs text-gray-400 mt-1">Minimum 3 characters. Stored in lowercase.</p>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label
                htmlFor="setup-password"
                className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="setup-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-required="true"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-11 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30 transition-colors"
                  placeholder="Create a strong password"
                  disabled={loading}
                  data-testid="setup-password-input"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPass(p => !p)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-5">
              <label
                htmlFor="setup-confirm"
                className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Confirm Password
              </label>
              <input
                id="setup-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                aria-required="true"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30 transition-colors"
                placeholder="Repeat your password"
                disabled={loading}
                data-testid="setup-confirm-input"
              />
            </div>

            {/* Password rules */}
            <ul className="bg-gray-50 rounded-lg px-4 py-3 mb-5 space-y-1" aria-label="Password requirements">
              <PasswordRule met={rules.length}    text="At least 8 characters" />
              <PasswordRule met={rules.uppercase} text="At least one uppercase letter" />
              <PasswordRule met={rules.number}    text="At least one number" />
              <PasswordRule met={rules.match}     text="Passwords match" />
            </ul>

            {/* Error */}
            {error && (
              <div
                id="setup-error"
                role="alert"
                aria-live="assertive"
                className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-red-700 text-sm font-medium"
                data-testid="setup-error-message"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !allRulesMet}
              data-testid="setup-submit-button"
              className="w-full bg-[#2e5496] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#1e3a6e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] focus-visible:ring-offset-2"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {loading ? 'Creating account…' : 'Create Admin Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          &copy; {new Date().getFullYear()} Computers 4 Kids &mdash; West Sacramento, CA
        </p>
      </main>
    </div>
  );
}
