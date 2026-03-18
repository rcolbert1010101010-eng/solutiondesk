import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, Role, Profile } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Users, Shield, AlertCircle, CheckCircle2, Trash2, PlusCircle } from 'lucide-react';

type AdminUsersPayload =
  | {
      action: 'createUser';
      email: string;
      password: string;
      displayName?: string;
      role?: Role;
    }
  | {
      action: 'deleteUser';
      userId: string;
    };

interface EdgeFunctionResponse {
  error?: string;
  ok?: boolean;
}

async function invokeAdminUsers<TResponse = EdgeFunctionResponse>(payload: AdminUsersPayload): Promise<{ success: boolean; data?: TResponse; error?: string }> {
  const { data, error } = await supabase.functions.invoke<TResponse>('admin-users', {
    body: payload,
  });

  if (error) {
    return { success: false, error: error.message || 'Edge function call failed.' };
  }

  const maybeError = (data as EdgeFunctionResponse | null)?.error;
  if (maybeError) {
    return { success: false, error: maybeError };
  }

  return { success: true, data: data ?? undefined };
}

export const UserManagement: React.FC = () => {
  const { currentUser, listProfiles, updateProfileRole, refreshCurrentUser, signOut } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await listProfiles();
    if (!result.success) {
      setProfiles([]);
      setError(result.error || 'Failed to load users.');
      setLoading(false);
      return;
    }

    setProfiles(result.data);
    setLoading(false);
  }, [listProfiles]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      void loadProfiles();
    }
  }, [currentUser?.role, loadProfiles]);

  const adminCount = useMemo(
    () => profiles.filter(profile => profile.role === 'admin').length,
    [profiles],
  );

  const handleRoleChange = async (profileId: string, nextRole: Role) => {
    setError('');
    setSuccess('');
    setSavingUserId(profileId);

    const result = await updateProfileRole(profileId, nextRole);

    if (!result.success) {
      setError(result.error || 'Failed to update role.');
      setSavingUserId(null);
      return;
    }

    setProfiles(prev => prev.map(profile => (
      profile.id === profileId ? { ...profile, role: nextRole } : profile
    )));

    if (profileId === currentUser?.id) {
      await refreshCurrentUser();
    }

    setSuccess('Role updated successfully.');
    setSavingUserId(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const email = newEmail.trim().toLowerCase();
    const password = newPassword;
    const displayName = newDisplayName.trim();

    if (!email) {
      setError('Email is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setCreatingUser(true);

    const result = await invokeAdminUsers({
      action: 'createUser',
      email,
      password,
      displayName: displayName || undefined,
      role: newRole,
    });

    setCreatingUser(false);

    if (!result.success) {
      setError(result.error || 'Failed to create user.');
      return;
    }

    setNewEmail('');
    setNewPassword('');
    setNewDisplayName('');
    setNewRole('user');
    setSuccess('User created successfully.');
    await loadProfiles();
  };

  const openDeleteModal = (profile: Profile) => {
    setDeleteTarget(profile);
    setDeleteConfirmText('');
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    if (deletingUserId) return;
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setError('');
    setSuccess('');

    const isDeletingSelf = deleteTarget.id === currentUser?.id;
    if (isDeletingSelf && deleteConfirmText !== 'DELETE') {
      setError('Type DELETE to confirm deleting your own account.');
      return;
    }

    setDeletingUserId(deleteTarget.id);

    const result = await invokeAdminUsers({
      action: 'deleteUser',
      userId: deleteTarget.id,
    });

    setDeletingUserId(null);

    if (!result.success) {
      setError(result.error || 'Failed to delete user.');
      return;
    }

    const deletedSelf = deleteTarget.id === currentUser?.id;
    setDeleteTarget(null);
    setDeleteConfirmText('');

    if (deletedSelf) {
      setSuccess('Your account was deleted.');
      await signOut();
      return;
    }

    setSuccess('User deleted successfully.');
    await loadProfiles();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-slate-500 dark:text-zinc-400">
        <Shield size={48} className="text-slate-300" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-center max-w-xs">You don't have permission to view this page. Admin access is required.</p>
      </div>
    );
  }

  const card = 'bg-white border-slate-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none';
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
              <p className={`text-xs ${mutedCls}`}>
                {profiles.length} profile{profiles.length !== 1 ? 's' : ''} total, {adminCount} admin{adminCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className={`border rounded-xl p-5 mb-6 ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle size={16} className="text-amber-500" />
            <h2 className={`text-sm font-semibold ${headingCls}`}>Create User</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${headingCls}`}>Email</label>
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                type="email"
                placeholder="user@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${headingCls}`}>Password</label>
              <input
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                type="password"
                placeholder="At least 6 characters"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${headingCls}`}>Display Name</label>
              <input
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                type="text"
                placeholder="Optional"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${headingCls}`}>Role</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as Role)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-amber-400 focus:ring-amber-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={creatingUser}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-lg text-sm transition-colors"
          >
            {creatingUser ? 'Creating...' : 'Create User'}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex-1">
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={`border-b ${theadCls}`}>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Email</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Display Name</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Role</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Created</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {loading ? (
                  <tr>
                    <td className="py-6 px-4 text-sm text-slate-500" colSpan={5}>Loading users...</td>
                  </tr>
                ) : profiles.map(profile => (
                  <tr key={profile.id} className={`transition-colors ${rowHover}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          profile.role === 'admin'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}>
                          {profile.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-zinc-200">{profile.email}</span>
                        {profile.id === currentUser.id && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400">you</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-slate-600 dark:text-zinc-300">{profile.displayName || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={profile.role}
                        disabled={savingUserId === profile.id}
                        onChange={e => {
                          const nextRole = e.target.value as Role;
                          if (nextRole !== profile.role) {
                            void handleRoleChange(profile.id, nextRole);
                          }
                        }}
                        className="border rounded-md px-2 py-1 text-xs bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-amber-400 focus:ring-amber-400/20 disabled:opacity-60 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-400 dark:text-zinc-500">{formatDate(profile.createdAt)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => openDeleteModal(profile)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && profiles.length === 0 && (
            <div className="text-center py-12">
              <p className={`text-sm ${mutedCls}`}>No profiles found.</p>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:bg-zinc-900 dark:border-zinc-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 mb-2">Delete user</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-300 mb-4">
              This will permanently remove <span className="font-medium">{deleteTarget.email}</span> from Auth and profiles.
            </p>

            {deleteTarget.id === currentUser.id && (
              <div className="mb-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1.5">
                  You are deleting your own account. Type <span className="font-semibold">DELETE</span> to confirm.
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:border-red-400 focus:ring-red-400/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingUserId)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleDeleteUser(); }}
                disabled={Boolean(deletingUserId)}
                className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deletingUserId ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
