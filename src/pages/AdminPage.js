import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  KeyRound,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
  Save,
  Tag,
} from 'lucide-react';
import apiService from '../services/api';

// -----------------------------------------
// Constants
// -----------------------------------------
const AVAILABLE_PERMISSIONS = ['chat', 'ingest', 'manage_users'];

// -----------------------------------------
// Small reusable UI pieces (kept inline to
// respect "only AdminPage.js" guideline)
// -----------------------------------------
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[280px] max-w-md ${
        isSuccess
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}
      data-testid="admin-toast"
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      )}
      <p
        className={`text-sm font-medium flex-1 ${
          isSuccess
            ? 'text-green-800 dark:text-green-300'
            : 'text-red-800 dark:text-red-300'
        }`}
      >
        {toast.message}
      </p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        data-testid="toast-close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ConfirmDialog = ({ open, title, message, onCancel, onConfirm, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            data-testid="confirm-dialog-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="confirm-dialog-confirm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tint }) => (
  <div className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tint}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// -----------------------------------------
// Tabs
// -----------------------------------------
const TabButton = ({ active, onClick, icon: Icon, label, count, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {typeof count === 'number' && (
      <span
        className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

// -----------------------------------------
// USERS TAB
// -----------------------------------------
const UsersTab = ({ users, roles, loading, onRefresh, actions }) => {
  const [confirm, setConfirm] = useState(null);
  const [assign, setAssign] = useState({ email: '', role_name: '' });
  const [busy, setBusy] = useState({});

  const handleAssign = async () => {
    if (!assign.email || !assign.role_name) return;
    setBusy({ ...busy, assign: true });
    await actions.assignRole(assign.email, assign.role_name);
    setBusy({ ...busy, assign: false });
    setAssign({ email: '', role_name: '' });
  };

  const handleRemoveRole = async (email, role_name) => {
    const key = `${email}:${role_name}`;
    setBusy({ ...busy, [key]: true });
    await actions.removeRole(email, role_name);
    setBusy({ ...busy, [key]: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    setBusy({ ...busy, confirm: true });
    if (confirm.type === 'delete') await actions.deleteUser(confirm.email);
    if (confirm.type === 'reactivate') await actions.reactivateUser(confirm.email);
    setBusy({ ...busy, confirm: false });
    setConfirm(null);
  };

  return (
    <div className="space-y-6" data-testid="users-tab-content">
      {/* Assign Role Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Assign Role to User
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <select
            value={assign.email}
            onChange={(e) => setAssign({ ...assign, email: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="assign-user-select"
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.email} value={u.email}>
                {u.email}
              </option>
            ))}
          </select>
          <select
            value={assign.role_name}
            onChange={(e) => setAssign({ ...assign, role_name: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="assign-role-select"
          >
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!assign.email || !assign.role_name || busy.assign}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            data-testid="assign-role-button"
          >
            {busy.assign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Assign
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              All Users
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {users.length} {users.length === 1 ? 'user' : 'users'} registered
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg disabled:opacity-50"
            data-testid="refresh-users-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Roles</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => {
                  const isInactive = user.active === false || user.is_active === false;
                  return (
                    <tr
                      key={user.email}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      data-testid={`user-row-${user.email}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold">
                            {user.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.email}
                            </p>
                            {isInactive && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(user.roles || []).length === 0 ? (
                            <span className="text-xs text-gray-400 italic">No roles</span>
                          ) : (
                            (user.roles || []).map((r) => {
                              const key = `${user.email}:${r}`;
                              return (
                                <span
                                  key={r}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                  data-testid={`user-role-${user.email}-${r}`}
                                >
                                  {r}
                                  <button
                                    onClick={() => handleRemoveRole(user.email, r)}
                                    disabled={busy[key]}
                                    className="ml-0.5 hover:text-red-500 disabled:opacity-50"
                                    title="Remove role"
                                    data-testid={`remove-role-btn-${user.email}-${r}`}
                                  >
                                    {busy[key] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                  </button>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isInactive ? (
                            <button
                              onClick={() =>
                                setConfirm({
                                  type: 'reactivate',
                                  email: user.email,
                                  title: 'Reactivate user?',
                                  message: `Are you sure you want to reactivate ${user.email}?`,
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                              data-testid={`reactivate-btn-${user.email}`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirm({
                                  type: 'delete',
                                  email: user.email,
                                  title: 'Delete user?',
                                  message: `Are you sure you want to delete ${user.email}? This is a soft delete — the user can be reactivated later.`,
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                              data-testid={`delete-user-btn-${user.email}`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirmDelete}
        loading={busy.confirm}
      />
    </div>
  );
};

// -----------------------------------------
// ROLES TAB
// -----------------------------------------
const RolesTab = ({ roles, loading, actions }) => {
  const [newRole, setNewRole] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState({});

  const handleCreate = async () => {
    const name = newRole.trim();
    if (!name) return;
    setBusy({ ...busy, create: true });
    const ok = await actions.createRole(name);
    setBusy({ ...busy, create: false });
    if (ok) setNewRole('');
  };

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    setBusy({ ...busy, confirm: true });
    await actions.deleteRole(confirm.role);
    setBusy({ ...busy, confirm: false });
    setConfirm(null);
  };

  return (
    <div className="space-y-6" data-testid="roles-tab-content">
      {/* Create Role */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Create New Role
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Role name (e.g., EDITOR, MANAGER)"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="new-role-input"
          />
          <button
            onClick={handleCreate}
            disabled={!newRole.trim() || busy.create}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            data-testid="create-role-button"
          >
            {busy.create ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Role
          </button>
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            All Roles
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {roles.length} {roles.length === 1 ? 'role' : 'roles'} defined
          </p>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No roles yet. Create your first role above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map((role) => (
              <div
                key={role}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                data-testid={`role-row-${role}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">{role}</p>
                </div>
                <button
                  onClick={() =>
                    setConfirm({
                      role,
                      title: 'Delete role?',
                      message: `Are you sure you want to delete the role "${role}"? Users assigned to this role may lose access.`,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                  data-testid={`delete-role-btn-${role}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirmDelete}
        loading={busy.confirm}
      />
    </div>
  );
};

// -----------------------------------------
// PERMISSIONS TAB
// -----------------------------------------
const PermissionsTab = ({ roles, rolePermissions, actions, onRefreshRolePerms }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [busy, setBusy] = useState({});

  const [loadingPerms, setLoadingPerms] = useState(false);

  // When role changes, always fetch current permissions from the API
  useEffect(() => {
    if (!selectedRole) { setSelectedPerms([]); return; }
    setLoadingPerms(true);
    apiService.getRolePermissions(selectedRole)
      .then((res) => {
        if (res.success) {
          const perms = res.data?.permissions || [];
          setSelectedPerms(perms);
          onRefreshRolePerms(selectedRole, perms);
        } else {
          setSelectedPerms([]);
        }
      })
      .finally(() => setLoadingPerms(false));
  }, [selectedRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePerm = (perm) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setBusy({ ...busy, save: true });
    await actions.updateRolePermissions(selectedRole, selectedPerms);
    setBusy({ ...busy, save: false });
    onRefreshRolePerms(selectedRole, selectedPerms);
  };

  const handleRemovePerm = async (perm) => {
    if (!selectedRole) return;
    setBusy({ ...busy, [perm]: true });
    const ok = await actions.removePermissionFromRole(selectedRole, perm);
    setBusy({ ...busy, [perm]: false });
    if (ok) {
      const next = selectedPerms.filter((p) => p !== perm);
      setSelectedPerms(next);
      onRefreshRolePerms(selectedRole, next);
    }
  };

  return (
    <div className="space-y-6" data-testid="permissions-tab-content">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Manage Role Permissions
          </h3>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="perms-role-select"
          >
            <option value="">Choose a role...</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {selectedRole && (
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions
                {loadingPerms && <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin text-indigo-500" />}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const checked = selectedPerms.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                      data-testid={`perm-checkbox-${perm}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerm(perm)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {perm}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={busy.save}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              data-testid="save-permissions-button"
            >
              {busy.save ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Permissions
            </button>
          </>
        )}
      </div>

      {/* Current permissions list with remove */}
      {selectedRole && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Current Permissions for{' '}
              <span className="text-indigo-600 dark:text-indigo-400">{selectedRole}</span>
            </h3>
          </div>
          {selectedPerms.length === 0 ? (
            <div className="p-8 text-center">
              <KeyRound className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No permissions assigned. Check permissions above and save.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedPerms.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  data-testid={`current-perm-${perm}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                      <KeyRound className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {perm}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePerm(perm)}
                    disabled={busy[perm]}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
                    data-testid={`remove-perm-btn-${perm}`}
                  >
                    {busy[perm] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------
// MAIN ADMIN PAGE
// -----------------------------------------
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  // role_name -> [permissions]. Populated from users list or user edits.
  const [rolePermissions, setRolePermissions] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Derive roles from users payload (if backend doesn't expose GET /roles)
  const deriveRolesFromUsers = (usersList) => {
    const set = new Set();
    usersList.forEach((u) => (u.roles || []).forEach((r) => set.add(r)));
    return Array.from(set).sort();
  };

  const fetchRoles = useCallback(async () => {
    const res = await apiService.listRoles();
    if (res.success) {
      const names = (res.data || []).map((r) => r.role || r.name || r).filter(Boolean);
      setRoles((prev) => Array.from(new Set([...prev, ...names])).sort());
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await apiService.listUsers();
    setLoading(false);
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : res.data?.users || [];
      setUsers(list);
      setRoles((prev) => {
        const derived = deriveRolesFromUsers(list);
        return Array.from(new Set([...prev, ...derived])).sort();
      });
    } else {
      showToast(res.error || 'Failed to load users', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // -----------------------------------------
  // Action handlers (wired to apiService)
  // -----------------------------------------
  const actions = {
    // USERS
    deleteUser: async (email) => {
      const res = await apiService.deleteUser(email);
      if (res.success) {
        showToast(`User "${email}" deleted`, 'success');
        fetchUsers();
        return true;
      }
      showToast(res.error || 'Failed to delete user', 'error');
      return false;
    },
    reactivateUser: async (email) => {
      const res = await apiService.reactivateUser(email);
      if (res.success) {
        showToast(`User "${email}" reactivated`, 'success');
        fetchUsers();
        return true;
      }
      showToast(res.error || 'Failed to reactivate user', 'error');
      return false;
    },
    assignRole: async (email, role_name) => {
      const res = await apiService.assignRole(email, role_name);
      if (res.success) {
        showToast(`Role "${role_name}" assigned to ${email}`, 'success');
        fetchUsers();
        return true;
      }
      showToast(res.error || 'Failed to assign role', 'error');
      return false;
    },
    removeRole: async (email, role_name) => {
      const res = await apiService.removeRole(email, role_name);
      if (res.success) {
        showToast(`Role "${role_name}" removed from ${email}`, 'success');
        fetchUsers();
        return true;
      }
      showToast(res.error || 'Failed to remove role', 'error');
      return false;
    },
    // ROLES
    createRole: async (role_name) => {
      const res = await apiService.createRole(role_name);
      if (res.success) {
        showToast(`Role "${role_name}" created`, 'success');
        setRoles((prev) => Array.from(new Set([...prev, role_name])).sort());
        return true;
      }
      showToast(res.error || 'Failed to create role', 'error');
      return false;
    },
    deleteRole: async (role_name) => {
      const res = await apiService.deleteRole(role_name);
      if (res.success) {
        showToast(`Role "${role_name}" deleted`, 'success');
        setRoles((prev) => prev.filter((r) => r !== role_name));
        setRolePermissions((prev) => {
          const copy = { ...prev };
          delete copy[role_name];
          return copy;
        });
        fetchUsers();
        return true;
      }
      showToast(res.error || 'Failed to delete role', 'error');
      return false;
    },
    // PERMISSIONS
    updateRolePermissions: async (role_name, permissions) => {
      const res = await apiService.updateRolePermissions(role_name, permissions);
      if (res.success) {
        showToast(`Permissions updated for "${role_name}"`, 'success');
        setRolePermissions((prev) => ({ ...prev, [role_name]: permissions }));
        return true;
      }
      showToast(res.error || 'Failed to update permissions', 'error');
      return false;
    },
    removePermissionFromRole: async (role_name, permission_name) => {
      const res = await apiService.removePermissionFromRole(role_name, permission_name);
      if (res.success) {
        showToast(`Permission "${permission_name}" removed from "${role_name}"`, 'success');
        return true;
      }
      showToast(res.error || 'Failed to remove permission', 'error');
      return false;
    },
  };

  // Stats
  const activeUsers = users.filter((u) => u.active !== false && u.is_active !== false).length;
  const inactiveUsers = users.length - activeUsers;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900" data-testid="admin-page">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Admin Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage users, roles, and permissions
            </p>
          </div>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={users.length} tint="bg-indigo-500" />
            <StatCard icon={UserCheck} label="Active" value={activeUsers} tint="bg-green-500" />
            <StatCard icon={UserX} label="Inactive" value={inactiveUsers} tint="bg-gray-500" />
            <StatCard icon={ShieldCheck} label="Roles" value={roles.length} tint="bg-cyan-500" />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
            <TabButton
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              icon={Users}
              label="Users"
              count={users.length}
              testId="tab-users"
            />
            <TabButton
              active={activeTab === 'roles'}
              onClick={() => setActiveTab('roles')}
              icon={ShieldCheck}
              label="Roles"
              count={roles.length}
              testId="tab-roles"
            />
            <TabButton
              active={activeTab === 'permissions'}
              onClick={() => setActiveTab('permissions')}
              icon={KeyRound}
              label="Permissions"
              testId="tab-permissions"
            />
          </div>

          {/* Tab content */}
          {activeTab === 'users' && (
            <UsersTab
              users={users}
              roles={roles}
              loading={loading}
              onRefresh={fetchUsers}
              actions={actions}
            />
          )}
          {activeTab === 'roles' && (
            <RolesTab roles={roles} loading={loading} actions={actions} />
          )}
          {activeTab === 'permissions' && (
            <PermissionsTab
              roles={roles}
              rolePermissions={rolePermissions}
              actions={actions}
              onRefreshRolePerms={(role, perms) =>
                setRolePermissions((prev) => ({ ...prev, [role]: perms }))
              }
            />
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default AdminPage;