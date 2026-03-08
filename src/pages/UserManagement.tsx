import React, { useState } from 'react';
import { useAuth, Role } from '../context/AuthContext';
import { Users, PlusCircle, Mail, Lock, Shield, CheckCircle2, AlertCircle, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { currentUser, getUsers, createUser } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<Role>('member');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Access denied for non-admins
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-slate-500 dark:text-zinc-400">
        <Shield size={48} className="text-slate-300" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-center max-w-xs">You don't have permission to view this page. Admin access is required.</p>
      </div>
    );
  }

  const users = getUsers();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formEmail.trim()) { setFormError('Email is required.'); return; }
    if (!formPassword) { setFormError('Password is required.'); return; }

    setLoading(true);
    const result = await createUser(formEmail, formPassword, formRole);
    setLoading(false);

    if (result.success) {
      setFormSuccess(`User ${formEmail.toLowerCase().trim()} created successfully.`);
      setFormEmail('');
      setFormPassword('');
      setFormRole('member');
      setTimeout(() => setFormSuccess(''), 4000);
    } else {
      setFormError(result.error || 'Failed to create user.');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const card = 'bg-white border-slate-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none';
  const inputCls = 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/20';
  const labelCls = 'text-slate-600 dark:text-zinc-400';
  const headingCls = 'text-slate-800 dark:text-zinc-100';
  const mutedCls = 'text-slate-400 dark:text-zinc-500';
  const theadCls = 'text-slate-400 border-slate-200 dark:text-zinc-500 dark:border-zinc-800';
  const rowHover = 'hover:bg-slate-50 dark:hover:bg-zinc-800/40';
  const divider = 'divide-slate-100 dark:divide-zinc-800/60';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-[#0f0f10]">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-400/10">
              <Users size={20} className="text-amber-500" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${headingCls}`}>User Management</h1>
              <p className={`text-xs ${mutedCls}`}>{users.length} user{users.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(''); setFormSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold rounded-lg text-sm transition-colors"
          >
            <PlusCircle size={15} />
            {showForm ? 'Cancel' : 'New User'}
          </button>
        </div>

        {/* Create User Form */}
        {showForm && (
          <div className={`border rounded-xl p-6 mb-6 ${card}`}>
            <h2 className={`text-sm font-semibold mb-4 ${headingCls}`}>Create New User</h2>

            {formError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 mb-4 text-sm">
                <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreate} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Email */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${labelCls}`}>Email address *</label>
                  <div className="relative">
                    <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      'text-slate-400 dark:text-zinc-500'
                    }`} />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => { setFormEmail(e.target.value); setFormError(''); }}
                      placeholder="user@example.com"
                      className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors ${inputCls}`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${labelCls}`}>Password *</label>
                  <div className="relative">
                    <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      'text-slate-400 dark:text-zinc-500'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => { setFormPassword(e.target.value); setFormError(''); }}
                      placeholder="Min. 6 characters"
                      className={`w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-1 transition-colors ${inputCls}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${labelCls}`}>Role</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as Role)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors bg-white border-slate-300 text-slate-800 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/20"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Creating…' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(''); setFormSuccess(''); setFormEmail(''); setFormPassword(''); setFormRole('member'); }}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="px-6 pb-6 flex-1">
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className={`border-b ${theadCls}`}>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Email</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Role</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Created</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {users.map(user => (
                  <tr key={user.id} className={`transition-colors ${rowHover}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}>
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-zinc-200">{user.email}</span>
                        {user.id === currentUser.id && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            'bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400'
                          }`}>you</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                        user.role === 'admin'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-500/20'
                          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                      }`}>
                        {user.role === 'admin' && <Shield size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-400 dark:text-zinc-500">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <UserCheck size={10} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-400 border border-slate-200">
                          <UserX size={10} /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className={`text-sm ${mutedCls}`}>No users found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
