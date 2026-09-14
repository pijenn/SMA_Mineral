'use client';

import React from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export function LoadingScreen({
  message = 'Memuat Portal PT Sumber Mineral Abadi...',
  subMessage = 'Sinkronisasi data real-time dengan Supabase PostgreSQL',
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0c0e12] text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="flex flex-col items-center text-center p-8 max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo Container with Pulsing Halo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-3 rounded-3xl bg-emerald-500/20 blur-xl animate-pulse"></div>
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-white dark:bg-[#14171c] p-2 border-2 border-emerald-500/30 shadow-2xl flex items-center justify-center">
            <img
              src="/PT%20SMA%20LOGO.jpeg"
              alt="PT Sumber Mineral Abadi"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Loading Spinner & Label */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
              {message}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {subMessage}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-zinc-200 dark:bg-[#1c222a] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-indeterminate"></div>
        </div>
      </div>
    </div>
  );
}
