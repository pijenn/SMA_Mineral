'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Lock,
  User,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  Database,
} from 'lucide-react';

export function LoginPage() {
  const { login } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Username atau password salah.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke database Supabase. Silakan periksa koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#f8fafc] dark:bg-[#0c0e12] text-zinc-900 dark:text-zinc-100 font-sans transition-colors relative">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-500" />}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Company Header with Green Globe/Leaf icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden bg-white border border-zinc-200 dark:border-[#232830] mb-1 shadow-md p-1">
            <img
              src="/PT%20SMA%20LOGO.jpeg"
              alt="PT Sumber Mineral Abadi"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              PT Sumber Mineral Abadi
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              PT PAM Mineral Group &bull; Procurement & Operational Cashflow Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Masuk ke Akun Portal
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Gunakan Username dan Password terdaftar di database Supabase untuk masuk.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Username (ID Pengguna)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan username Anda..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Password (Kata Sandi)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Memverifikasi Akun di Supabase...' : 'Masuk ke Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Database Live Status Indicator */}
          <div className="pt-3 border-t border-zinc-200 dark:border-[#232830] flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Terhubung ke Supabase DB</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">PostgreSQL</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-400 font-medium">
          &copy; 2026 PT Sumber Mineral Abadi. Pengadaan & Anggaran Operasional.
        </div>
      </div>
    </div>
  );
}
