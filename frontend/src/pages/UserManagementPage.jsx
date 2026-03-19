import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Plus, KeyRound, Trash2, ShieldCheck, Wrench, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Accessible Modal Shell ────────────────────────────────────────────── */
function Modal({ id, title, onClose, children }) {
  const modalRef = useRef(null);
  const titleId = `${id}-title`;

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const trap = (e) => {
      if (e.key !== 'Tab' || !focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    el.addEventListener('keydown', trap);
    document.addEventListener('keydown', esc);
    return () => { el.removeEventListener('keydown', trap); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 z-10"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
            data-testid="modal-close-button"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Add User Modal ─────────────────────────────────────────────────────── */
function AddUserModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('technician');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/users`, { username: username.trim(), initial_password: password, role });
      toast.success(`User "${res.data.username}" created. They must change password on first login.`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal id="add-user" title="Add New User" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="new-username" className="block text-sm font-bold text-gray-800 mb-1.5">
              Username <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="new-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              aria-required="true"
              autoComplete="off"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20"
              placeholder="e.g. jsmith"
              data-testid="new-username-input"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-bold text-gray-800 mb-1.5">
              Temporary Password <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-required="true"
              aria-describedby="new-pw-hint"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20"
              placeholder="Min. 8 characters"
              data-testid="new-password-input"
            />
            <p id="new-pw-hint" className="text-xs text-gray-400 mt-1">User will be required to change this on first login.</p>
          </div>
          <div>
            <label htmlFor="new-user-role" className="block text-sm font-bold text-gray-800 mb-1.5">Role</label>
            <select
              id="new-user-role"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20"
              data-testid="new-user-role-select"
            >
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-testid="add-user-error">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-[#2e5496] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#1e3a6e] disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
            data-testid="add-user-submit"
          >
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Reset Password Modal ───────────────────────────────────────────────── */
function ResetPasswordModal({ targetUser, onClose, onReset }) {
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/admin/users/${targetUser.username}/reset-password`, { new_password: newPw });
      toast.success(`Password reset for "${targetUser.username}". They must change it on next login.`);
      onReset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal id="reset-pw" title={`Reset Password: ${targetUser.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-gray-500 mb-4">
          Set a temporary password. <strong className="text-gray-700">{targetUser.username}</strong> will be required to change it on their next login.
        </p>
        <div>
          <label htmlFor="reset-new-pw" className="block text-sm font-bold text-gray-800 mb-1.5">
            New Temporary Password <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="reset-new-pw"
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            aria-required="true"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20"
            placeholder="Min. 8 characters"
            data-testid="reset-pw-input"
          />
        </div>
        {error && (
          <div role="alert" aria-live="assertive" className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            data-testid="reset-pw-submit"
          >
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Delete User Dialog ─────────────────────────────────────────────────── */
function DeleteUserDialog({ targetUser, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/admin/users/${targetUser.username}`);
      toast.success(`User "${targetUser.username}" deleted`);
      onDeleted(targetUser.username);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-user-title"
        aria-describedby="del-user-desc"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
      >
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-600" aria-hidden="true" />
        </div>
        <h2 id="del-user-title" className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Delete User?
        </h2>
        <p id="del-user-desc" className="text-gray-500 text-sm mb-6">
          Are you sure you want to delete <strong className="text-gray-900">{targetUser.username}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            autoFocus
            className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
            data-testid="del-user-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            data-testid="del-user-confirm"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const addBtnRef = useRef(null);

  // Guard: non-admins get redirected
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`);
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleModalClose = (setter) => {
    setter(null);
    setTimeout(() => addBtnRef.current?.focus(), 50);
  };

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <Sidebar onExport={() => {}} />

      <main className="ml-64 flex-1 flex flex-col" id="main-content">
        {/* Page header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#2e5496]" aria-hidden="true" />
              User Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Add, remove, and manage technician accounts</p>
          </div>
          <button
            ref={addBtnRef}
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#2e5496] hover:bg-[#1e3a6e] text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
            data-testid="add-user-button"
            aria-label="Add a new user account"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add User
          </button>
        </header>

        <div className="flex-1 px-8 py-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="User accounts table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Username</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Role</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Password Status</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Created</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-busy={loading}>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        <div className="w-7 h-7 border-4 border-[#2e5496] border-t-transparent rounded-full animate-spin mx-auto" role="status" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">No users found</td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`user-row-${u.username}`}>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{u.username}</td>
                      <td className="px-5 py-3.5">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 bg-[#e0e7ff] text-[#2e5496] border border-[#2e5496] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 border border-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <Wrench className="w-3.5 h-3.5" aria-hidden="true" /> Technician
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.must_change_password ? (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">Must Change</span>
                        ) : (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full font-semibold">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setResetTarget(u)}
                            aria-label={`Reset password for ${u.username}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            data-testid={`reset-pw-btn-${u.username}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                            Reset PW
                          </button>
                          {u.username !== currentUser?.username && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              aria-label={`Delete user ${u.username}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              data-testid={`delete-user-btn-${u.username}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                {users.length} {users.length === 1 ? 'user' : 'users'} total
              </div>
            )}
          </div>
        </div>
      </main>

      {showAdd && (
        <AddUserModal
          onClose={() => { setShowAdd(false); setTimeout(() => addBtnRef.current?.focus(), 50); }}
          onCreated={(newUser) => setUsers(prev => [...prev, newUser])}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          targetUser={resetTarget}
          onClose={() => handleModalClose(setResetTarget)}
          onReset={() => fetchUsers()}
        />
      )}
      {deleteTarget && (
        <DeleteUserDialog
          targetUser={deleteTarget}
          onClose={() => handleModalClose(setDeleteTarget)}
          onDeleted={(username) => setUsers(prev => prev.filter(u => u.username !== username))}
        />
      )}
    </div>
  );
}
