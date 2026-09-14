'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Navbar } from '@/components/layout/Navbar';
import { LoginPage } from '@/components/auth/LoginPage';
import { HodDashboard } from '@/components/modules/hod/HodDashboard';
import { LogisticsDashboard } from '@/components/modules/logistics/LogisticsDashboard';
import { FinanceDashboard } from '@/components/modules/finance/FinanceDashboard';
import { PmDashboard } from '@/components/modules/pm/PmDashboard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Home() {
  const { currentUser, activeRole, isAppLoading } = useApp();
  const [activeModuleTab, setActiveModuleTab] = useState<string>('overview');

  // Loading Screen
  if (isAppLoading) {
    return <LoadingScreen message="Sinkronisasi Periode & Data Pengadaan..." />;
  }

  // If user is not logged in, display the username/password Login Page
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0c0e12] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Header Navigation Bar */}
      <Navbar />

      {/* Main Spacious Workspace Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeRole === 'hod' && (
          <HodDashboard
            activeTab={activeModuleTab}
            onTabChange={setActiveModuleTab}
          />
        )}

        {activeRole === 'admin_logistics' && (
          <LogisticsDashboard
            activeTab={activeModuleTab as any}
            onTabChange={setActiveModuleTab as any}
          />
        )}

        {activeRole === 'admin_finance' && (
          <FinanceDashboard
            activeTab={activeModuleTab as any}
            onTabChange={setActiveModuleTab as any}
          />
        )}

        {activeRole === 'project_manager' && (
          <PmDashboard
            activeTab={activeModuleTab as any}
            onTabChange={setActiveModuleTab as any}
          />
        )}

        {/* Clean Modern Footer */}
        <footer className="mt-16 pt-6 border-t border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            &copy; 2026 <strong className="text-zinc-800 dark:text-zinc-200">PT Sumber Mineral Abadi</strong> &bull; PAM Mineral Group
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>PostgreSQL Live</span>
            </span>
            <span>&bull;</span>
            <span>Mining Procurement Portal</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
