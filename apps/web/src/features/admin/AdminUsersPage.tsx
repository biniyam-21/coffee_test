import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Shield, UserRoundCog } from 'lucide-react';
import { RoleType } from '../../types/api';
import { apiRequest, ApiClientError } from '../../lib/api-client';
import { formatDateTime } from '../../lib/formatters';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  roles: RoleType[];
};

type UsersPageResult = {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const roleLabels: Record<RoleType, string> = {
  [RoleType.CUSTOMER]: 'Customer',
  [RoleType.STAFF]: 'Staff',
  [RoleType.ADMIN]: 'Admin',
};

const UserRoleEditor: React.FC<{
  user: AdminUser;
  isSaving: boolean;
  onSave: (roles: RoleType[]) => void;
}> = ({ user, isSaving, onSave }) => {
  const [roles, setRoles] = useState<RoleType[]>(user.roles);

  useEffect(() => setRoles(user.roles), [user.roles]);

  const toggleRole = (role: RoleType) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  };

  const unchanged = roles.length === user.roles.length && roles.every((role) => user.roles.includes(role));

  return (
    <div className="min-w-[220px] space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.values(RoleType) as RoleType[]).map((role) => (
          <label key={role} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={() => toggleRole(role)}
              aria-label={`${roleLabels[role]} role for ${user.email}`}
              className="accent-[#58259A]"
            />
            {roleLabels[role]}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSave(roles)}
        disabled={isSaving || unchanged || roles.length === 0}
        className="text-xs font-semibold text-[#58259A] disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {isSaving ? 'Saving…' : 'Save roles'}
      </button>
    </div>
  );
};

export const AdminUsersPage: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleType | ''>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter !== 'all') params.set('isActive', activeFilter);
    return params.toString();
  }, [page, search, roleFilter, activeFilter]);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const result = await apiRequest<UsersPageResult>(`/admin/users?${queryString}`, { signal });
      if (signal?.aborted) return;
      setUsers(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (loadError) {
      if (signal?.aborted) return;
      const isAbort =
        (loadError instanceof Error && (loadError.name === 'AbortError' || loadError.message.toLowerCase().includes('aborted'))) ||
        (loadError instanceof ApiClientError && loadError.message.toLowerCase().includes('aborted'));
      if (!isAbort) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load user accounts.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [queryString]);

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const saveRoles = async (userId: string, roles: RoleType[]) => {
    setSavingId(userId);
    try {
      const updated = await apiRequest<AdminUser>(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ roles }),
      });
      setUsers((current) => current.map((user) => (user.id === userId ? updated : user)));
      toast.success('Roles updated', 'The account permissions were saved.');
    } catch (saveError) {
      toast.error('Unable to update roles', saveError instanceof Error ? saveError.message : 'Try again.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    setSavingId(user.id);
    try {
      const updated = await apiRequest<AdminUser>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setUsers((current) => current.map((entry) => (entry.id === user.id ? updated : entry)));
      toast.success(updated.isActive ? 'Account enabled' : 'Account disabled', user.email);
    } catch (saveError) {
      toast.error('Unable to update account', saveError instanceof Error ? saveError.message : 'Try again.');
    } finally {
      setSavingId(null);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#58259A]"><UserRoundCog size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Administration</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-[#242126]">Users and roles</h1>
            <p className="mt-1 text-sm text-[#77717B]">Manage account access while keeping customer order history intact.</p>
          </div>
          <Button variant="outline" onClick={() => { setRefreshing(true); void loadUsers(); }} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'mr-2 animate-spin' : 'mr-2'} /> Refresh
          </Button>
        </div>

        {error && <Alert variant="error" title="Could not load users" onClose={() => setError(null)}>{error}</Alert>}

        <form onSubmit={submitSearch} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E9E3EB] bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_200px_170px_auto]">
          <label className="relative block">
            <span className="sr-only">Search users</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#77717B]" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, email, or phone" className="w-full rounded-xl border border-[#E9E3EB] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#58259A]" />
          </label>
          <label className="text-xs font-semibold text-[#625D66]">Role
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as RoleType | ''); setPage(1); }} className="mt-1 block w-full rounded-xl border border-[#E9E3EB] bg-white px-3 py-2.5 text-sm font-normal text-[#242126]">
              <option value="">All roles</option>
              {(Object.values(RoleType) as RoleType[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#625D66]">Account
            <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as typeof activeFilter); setPage(1); }} className="mt-1 block w-full rounded-xl border border-[#E9E3EB] bg-white px-3 py-2.5 text-sm font-normal text-[#242126]">
              <option value="all">All accounts</option><option value="true">Active</option><option value="false">Disabled</option>
            </select>
          </label>
          <Button type="submit" variant="primary" className="self-end">Search</Button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#E9E3EB] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#E9E3EB] px-5 py-4 text-sm font-semibold text-[#242126]"><Shield size={16} className="text-[#58259A]" /> Account access</div>
          {isLoading ? <div className="p-10 text-center text-sm text-[#77717B]">Loading accounts…</div> : users.length === 0 ? <div className="p-10 text-center text-sm text-[#77717B]">No accounts match those filters.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#FAF8F5] text-xs uppercase tracking-wide text-[#77717B]"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Assigned roles</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead>
                <tbody className="divide-y divide-[#F1EDF2]">
                  {users.map((user) => <tr key={user.id} className="align-top">
                    <td className="px-5 py-4"><div className="font-semibold text-[#242126]">{user.fullName}</div><div className="text-xs text-[#77717B]">{user.email}</div>{user.phoneNumber && <div className="text-xs text-[#77717B]">{user.phoneNumber}</div>}</td>
                    <td className="px-5 py-4 text-xs text-[#625D66]">{formatDateTime(user.createdAt)}</td>
                    <td className="px-5 py-4"><UserRoleEditor user={user} isSaving={savingId === user.id} onSave={(roles) => void saveRoles(user.id, roles)} /></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Disabled'}</span></td>
                    <td className="px-5 py-4"><button type="button" disabled={savingId === user.id} onClick={() => void toggleActive(user)} className="text-xs font-semibold text-[#58259A] disabled:text-slate-400">{user.isActive ? 'Disable account' : 'Enable account'}</button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#E9E3EB] px-5 py-3 text-xs text-[#77717B]">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
};
