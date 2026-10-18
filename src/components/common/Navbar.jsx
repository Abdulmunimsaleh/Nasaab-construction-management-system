import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ProjectSelector } from './ProjectSelector';
import { formatRelativeTime } from '../../utils/formatters';
import {
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Download
} from 'lucide-react';

export const Navbar = ({ onToggleMobile, onOpenQuickAction, onOpenCreateProject }) => {
  const {
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    logoutUser,
    exportLocalStorageBackup
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await logoutUser();
    navigate('/login', { replace: true });
  };

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Section: Mobile Menu Button & Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{getGreeting()}, {currentUser.name ? currentUser.name.split(' ')[0] : 'User'}</span>
            <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              {currentUser.role}
            </span>
          </h2>
          <p className="hidden md:block text-[11px] text-slate-500 font-medium">
            Kenya Standard Time • Site Operations Active
          </p>
        </div>
      </div>

      {/* Center Section: Global Project Selector */}
      <div className="hidden sm:block">
        <ProjectSelector onOpenCreateProject={onOpenCreateProject} />
      </div>

      {/* Right Section: Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Site Alerts & Notices
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                {(!notifications || notifications.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No notifications right now.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.link) {
                          navigate(notif.link);
                          setShowNotifications(false);
                        }
                      }}
                      className={`group flex items-start gap-2.5 rounded-xl p-2.5 text-xs transition-colors cursor-pointer ${
                        notif.read ? 'bg-slate-50/50 hover:bg-slate-50' : 'bg-amber-50/70 hover:bg-amber-50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'error' ? (
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                        ) : notif.type === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold truncate ${notif.read ? 'text-slate-700' : 'text-slate-900 font-bold'}`}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-1 sm:px-2.5 sm:py-1.5 hover:bg-slate-50 transition-colors"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.name}
              className="h-7 w-7 rounded-lg object-cover border border-slate-200"
            />
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-none capitalize">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.licenseNo || 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Profile & Account
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  System & Database Settings
                </button>
                <button
                  onClick={() => {
                    exportLocalStorageBackup();
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-400" />
                  Export LocalStorage Backup
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
