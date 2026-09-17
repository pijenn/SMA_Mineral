'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard,
  FileText,
  Tag,
  Search,
  Receipt,
  Truck,
  DollarSign,
  ShieldCheck,
  Users,
  Sun,
  Moon,
  Database,
  Building2,
  ChevronRight,
  Layers,
  Sparkles,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';

interface SidebarProps {
  activeModuleTab?: string;
  setActiveModuleTab?: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activeModuleTab,
  setActiveModuleTab,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const { currentUser, activeRole, departments, selectedDepartmentId, setSelectedDepartmentId } = useApp();
  const { theme, toggleTheme } = useTheme();

  const userDept = departments.find((d) => d.id === currentUser?.department_id);

  // Dynamic menu items based on active role
  const getNavItems = () => {
    switch (activeRole) {
      case 'hod':
        return [
          { id: 'overview', label: 'Overview & Pengajuan', icon: LayoutDashboard },
          { id: 'catalog', label: 'Katalog Barang Rutin', icon: Tag },
          { id: 'tracking', label: 'Pelacakan Ekspedisi', icon: Truck },
        ];
      case 'admin_logistics':
        return [
          { id: 'pipeline', label: 'Pipeline Sourcing', icon: LayoutDashboard },
          { id: 'purchasing', label: 'Eksekusi Pembelian (PO)', icon: Receipt },
          { id: 'delivery', label: 'Status Pengiriman', icon: Truck },
          { id: 'backlog', label: 'Barang Tertunda / Defisit', icon: Layers },
        ];
      case 'admin_finance':
        return [
          { id: 'budget', label: 'Saldo Kas & Likuiditas', icon: LayoutDashboard },
          { id: 'item_approval', label: 'Persetujuan Urgensi Barang', icon: ShieldCheck },
          { id: 'requests', label: 'Monitoring Request Dept', icon: ClipboardList },
          { id: 'receipts', label: 'Verifikasi Kuitansi', icon: Receipt },
          { id: 'journals', label: 'Jurnal Akuntansi Otomatis', icon: DollarSign },
          { id: 'report', label: 'Laporan Rekap Mingguan', icon: FileText },
        ];
      case 'project_manager':
      default:
        return [
          { id: 'buy_approval', label: 'Otorisasi Pembelian (Buy)', icon: ShieldCheck },
          { id: 'rollover', label: 'Alokasi Surplus Rollover', icon: Layers },
          { id: 'approval_summary', label: 'Rekap Approval Dept (Excel)', icon: FileSpreadsheet },
          { id: 'final_report', label: 'Sign-Off Laporan Mingguan', icon: FileText },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleHeader = () => {
    switch (activeRole) {
      case 'project_manager':
        return { tag: 'PM Executive', manage: 'Manage PT SMA' };
      case 'admin_logistics':
        return { tag: 'Logistik Panel', manage: 'Manage Supply Chain' };
      case 'admin_finance':
        return { tag: 'Finance Panel', manage: 'Manage Cash & Invoices' };
      case 'hod':
      default:
        return { tag: 'HOD Panel', manage: `Manage ${userDept?.code || 'Dept'}` };
    }
  };

  const roleInfo = getRoleHeader();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Panel Container */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-[#101317] dark:bg-[#0d0f12] text-zinc-300 border-r border-[#232830] dark:border-[#1e2229] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Panel Identity Heading */}
          <div className="p-6 pb-5 border-b border-[#232830] dark:border-[#1e2229]">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-sm tracking-wide">
                {roleInfo.tag}
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-medium mt-0.5">
              {roleInfo.manage}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1 flex-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Menu Navigasi
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModuleTab === item.id || (!activeModuleTab && item.id === navItems[0].id);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (setActiveModuleTab) setActiveModuleTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer group ${
                    isActive
                      ? 'bg-[#1a2027] text-white shadow-xs border border-[#2d3540]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#161a20]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Department Quick Filter for PM/Logistics/Finance */}
          {(activeRole === 'project_manager' || activeRole === 'admin_logistics' || activeRole === 'admin_finance') && (
            <div className="p-4 mx-3 my-2 rounded-2xl bg-[#14181f] border border-[#232830]">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Filter Departemen</span>
              </div>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full text-xs font-semibold bg-[#0d0f12] text-zinc-200 border border-[#2a313d] rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
        </div>

        {/* Bottom Status & Theme Switcher */}
        <div className="p-4 border-t border-[#232830] dark:border-[#1e2229] bg-[#0e1115] space-y-3">
          {/* Theme Quick Toggle in Sidebar */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#161a20] hover:bg-[#1e232b] text-zinc-300 hover:text-white text-xs font-semibold transition-colors border border-[#262c36] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span>Tema Tampilan</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#232830] text-[11px] font-mono text-zinc-300 capitalize">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Supabase Database Connection Status */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Supabase PostgreSQL</span>
            </div>
            <span className="text-[10px] font-mono bg-[#1c222a] px-1.5 py-0.5 rounded text-zinc-300">
              LIVE
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
