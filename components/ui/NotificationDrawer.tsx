'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { AppNotification } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Bell, CheckCheck, X, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';

export function NotificationDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'need_revision':
      case 'prioritize_confirmation':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'delayed_arrival':
        return <Clock className="w-4 h-4 text-red-500" />;
      case 'purchase_update':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'approval_request':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#14171c] h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-[#232830]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Notifikasi & Peringatan</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-slate-950 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold px-2 py-1 rounded cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tandai dibaca
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1c222a] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Tidak ada notifikasi baru saat ini.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  notif.is_read
                    ? 'bg-zinc-50/50 dark:bg-[#0e1115] border-zinc-200 dark:border-[#232830] opacity-75'
                    : 'bg-white dark:bg-[#181c22] border-emerald-500/40 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                        {formatDateTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
