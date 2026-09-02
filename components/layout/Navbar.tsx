'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/lib/utils';
import { NotificationDrawer } from '@/components/ui/NotificationDrawer';
import {
  Calendar,
  Bell,
  LogOut,
  Sun,
  Moon,
  Building2,
  ChevronDown,
} from 'lucide-react';

export function Navbar() {
  const {
    currentUser,
    logout,
    departments,
    activePeriod,
    notifications,
    activeRole,
    selectedDepartmentId,
    setSelectedDepartmentId,
  } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const userDept = departments.find((d) => d.id === currentUser?.department_id);

  const getRoleBadge = () => {
    switch (activeRole) {
      case 'project_manager':
        return { label: 'Project Manager', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'admin_logistics':
        return { label: 'Logistik & Supply Chain', bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
      case 'admin_finance':
        return { label: 'Finance & Kas', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'hod':
      default:
        return { label: `HOD ${userDept?.code || ''}`, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#101317]/95 border-b border-zinc-200 dark:border-[#232830] backdrop-blur-md transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white">
                  PT Sumber Mineral Abadi
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-[#1c222a] text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-emerald-500/30">
                  PAM Mineral
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block font-medium">
                Mining Procurement & Operational Cashflow Portal
              </div>
            </div>
          </div>

          {/* Center: Department Filter if PM / Logistics / Finance */}
          {(activeRole === 'project_manager' || activeRole === 'admin_logistics' || activeRole === 'admin_finance') && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#161a20] border border-zinc-200 dark:border-[#262c36]">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Dept:</span>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Departemen (12 Dept)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Tools: Active Period, Theme Switcher, Notifications, User Badge, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Period Card */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#161a20] border border-zinc-200 dark:border-[#262c36] text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <div className="text-left">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] leading-tight">
                  {activePeriod.period_name}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  Kas: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(activePeriod.disbursed_budget)}</span>
                </div>
              </div>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-[#161a20] hover:bg-zinc-200 dark:hover:bg-[#1f252e] border border-zinc-200 dark:border-[#262c36] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 rounded-xl bg-zinc-100 dark:bg-[#161a20] hover:bg-zinc-200 dark:hover:bg-[#1f252e] border border-zinc-200 dark:border-[#262c36] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Notifikasi Sistem"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black ring-2 ring-white dark:ring-[#101317]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Badge & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-[#262c36]">
                <div
                  className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-emerald-500/20 shrink-0"
                  title={`${currentUser.full_name} (${roleInfo.label})`}
                >
                  {currentUser.full_name?.charAt(0).toUpperCase() || 'S'}
                </div>

                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-200 line-clamp-1">
                    {currentUser.full_name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleInfo.bg}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-0.5 cursor-pointer"
                  title="Keluar / Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}
