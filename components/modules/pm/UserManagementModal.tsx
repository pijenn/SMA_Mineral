'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/lib/types';
import {
  Users,
  UserPlus,
  X,
  Shield,
  Building2,
  Lock,
  UserCheck,
  UserX,
  KeyRound,
  Check,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export function UserManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { users, departments, createUserAccount, toggleUserActive, resetUserPassword, refreshUsers } = useApp();

  const [isAddUserFormOpen, setIsAddUserFormOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('hod');
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id || '');
  const [password, setPassword] = useState('password123');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [resetModalUser, setResetModalUser] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('password123');
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshUsers();
      if (!departmentId && departments.length > 0) {
        setDepartmentId(departments[0].id);
      }
    }
  }, [isOpen, departments]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setIsRefreshing(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = await createUserAccount({
      full_name: fullName,
      username,
      role,
      department_id: role === 'hod' ? departmentId : undefined,
      password,
      phone_number: phoneNumber,
    });

    if (!res.success) {
      setFormError(res.error || 'Gagal membuat akun pengguna di database.');
      return;
    }

    setFormSuccess(`Akun untuk ${fullName} (@${username}) berhasil disimpan di Supabase!`);
    setFullName('');
    setUsername('');
    setPassword('password123');
    setPhoneNumber('');
    setIsAddUserFormOpen(false);

    setTimeout(() => setFormSuccess(null), 4000);
  };

  const handleResetPass = async (userId: string) => {
    const res = await resetUserPassword(userId, resetPasswordInput);
    if (res.success) {
      setIsResetSuccess(true);
      setTimeout(() => {
        setResetModalUser(null);
        setIsResetSuccess(false);
        setResetPasswordInput('password123');
      }, 1500);
    } else {
      alert(`Gagal reset password: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-[#14171c] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Manajemen & Pembuatan Akun Pengguna
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Supabase Integrated
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Kelola akun staf, atur hak akses modul, dan sinkronkan langsung ke tabel <code>user_profiles</code> di Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-zinc-200 dark:border-[#232830] hover:bg-zinc-100 dark:hover:bg-[#1c222b] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Refresh Data dari Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddUserFormOpen(!isAddUserFormOpen)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddUserFormOpen ? 'Tutup Form' : '+ Buat Akun Baru'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {formSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Add User Collapsible Form */}
        {isAddUserFormOpen && (
          <div className="p-5 sm:p-6 bg-zinc-50/80 dark:bg-[#0e1115] border-b border-zinc-200 dark:border-[#232830] space-y-4 animate-in slide-in-from-top-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Formulir Pendaftaran Akun Staf Baru ke Supabase
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nama Lengkap (Full Name)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso, S.T."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Username ID (Login)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: user_hse, log_budi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Password (Kata Sandi)
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Hak Akses / Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hod">HOD (Head of Department / User Lapangan)</option>
                    <option value="admin_logistics">Admin Logistik & Supply Chain</option>
                    <option value="admin_finance">Admin Finance & Accounting</option>
                    <option value="project_manager">Project Manager (Supervisor)</option>
                  </select>
                </div>

                {role === 'hod' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Departemen Terkait
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.code}] {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Simpan Akun ke Supabase
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Accounts List Table */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Total {users.length} Akun Terdaftar di Supabase
            </span>
          </div>

          <div className="border border-zinc-200 dark:border-[#232830] rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-[#232830]">
            {users.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-zinc-400">
                Belum ada data akun di database. Silakan jalankan script migrasi atau buat akun baru di atas.
              </div>
            ) : (
              users.map((u) => {
                const uDept = departments.find((d) => d.id === u.department_id);

                return (
                  <div
                    key={u.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          u.role === 'project_manager'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'admin_logistics'
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : u.role === 'admin_finance'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.full_name?.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-white">
                            {u.full_name}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400">
                            @{u.username}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.is_active
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                          >
                            {u.is_active ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Role: <strong className="text-zinc-700 dark:text-zinc-300">{u.role}</strong>
                          {uDept && ` &bull; Dept [${uDept.code}] ${uDept.name}`}
                          {u.phone_number && ` &bull; WA: ${u.phone_number}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setResetModalUser({ id: u.id, name: u.full_name });
                          setResetPasswordInput('password123');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1e232b] hover:bg-zinc-200 dark:hover:bg-[#282f3a] text-zinc-700 dark:text-zinc-300 text-xs font-semibold border border-zinc-300 dark:border-[#2a323e] flex items-center gap-1 cursor-pointer"
                        title="Reset Kata Sandi"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>Reset Password</span>
                      </button>

                      <button
                        onClick={() => toggleUserActive(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          u.is_active
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reset Password Modal Confirmation */}
        {resetModalUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-4">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                Reset Password Akun ({resetModalUser.name})
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Masukkan password baru yang akan disimpan langsung di Supabase:
              </p>

              <div>
                <input
                  type="text"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {isResetSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Password berhasil diperbarui di Supabase!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-500"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleResetPass(resetModalUser.id)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Simpan Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
