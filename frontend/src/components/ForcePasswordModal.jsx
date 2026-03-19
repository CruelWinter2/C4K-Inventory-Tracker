import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REQUIREMENTS = [
  'At least 8 characters',
  'At least one uppercase letter',
  'At least one number',
];

function checkStrength(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

export default function ForcePasswordModal({ isOpen, onSuccess }) {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const strength = checkStrength(newPw);
  const isStrong = strength.length && strength.upper && strength.number;

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = (e) => {
    if (!modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isStrong) { setError('Password does not meet all requirements.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/auth/change-password`, { new_password: newPw, confirm_password: confirmPw });
      toast.success('Password updated! Welcome to C4K Inventory.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 bg-[#2e5496] rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 id="modal-title" className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Set Your New Password
          </h2>
          <p id="modal-description" className="text-gray-500 text-sm mt-1">
            For security, you must create a new password before accessing the system.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="mb-4">
            <label
              htmlFor="modal-new-password"
              className="block text-sm font-bold text-gray-900 mb-1.5"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              New Password
            </label>
            <input
              ref={firstInputRef}
              id="modal-new-password"
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-requirements"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30"
              placeholder="Enter new password"
              disabled={saving}
              data-testid="modal-new-password"
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-5">
            <label
              htmlFor="modal-confirm-password"
              className="block text-sm font-bold text-gray-900 mb-1.5"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Confirm Password
            </label>
            <input
              id="modal-confirm-password"
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-match-hint"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/30"
              placeholder="Confirm new password"
              disabled={saving}
              data-testid="modal-confirm-password"
            />
            {confirmPw && (
              <p
                id="password-match-hint"
                className={`text-xs mt-1 ${newPw === confirmPw ? 'text-green-600' : 'text-red-500'}`}
                aria-live="polite"
              >
                {newPw === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div
            id="password-requirements"
            className="bg-gray-50 rounded-lg p-4 mb-5"
            aria-label="Password requirements"
          >
            <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Requirements:</p>
            <ul role="list" className="space-y-1.5">
              {[
                { label: REQUIREMENTS[0], met: strength.length },
                { label: REQUIREMENTS[1], met: strength.upper },
                { label: REQUIREMENTS[2], met: strength.number },
              ].map(({ label, met }) => (
                <li key={label} className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
                  <span aria-hidden="true">{met ? '✓' : '○'}</span>
                  <span>{label}</span>
                  <span className="sr-only">{met ? '(met)' : '(not yet met)'}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm"
              data-testid="modal-error"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !isStrong || newPw !== confirmPw}
            data-testid="modal-submit-button"
            className="w-full bg-[#2e5496] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#1e3a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] focus-visible:ring-offset-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {saving ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
