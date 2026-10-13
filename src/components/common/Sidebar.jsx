import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  FileText,
  Settings,
  HardHat,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { currentUser, currentProject, isForeman } = useApp();
  const navigate = useNavigate();

  const assignedSiteId = currentUser?.assignedProjectId || 'PRJ-002';

  const allNavigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Daily Reports', path: '/daily-reports', icon: FileSpreadsheet, badge: 'Daily' },
    { label: 'PDF Reports', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Foreman navigation items
  const foremanNavigationItems = [
    { label: 'My Site Workspace', path: `/projects/${assignedSiteId}`, icon: FolderKanban, badge: 'Assigned' },
    { label: 'Daily Reports', path: '/daily-reports', icon: FileSpreadsheet, badge: 'Daily' },
    { label: 'PDF Reports', path: '/reports', icon: FileText, badge: 'Weekly' },
  ];

  const navigationItems = isForeman ? foremanNavigationItems : allNavigationItems;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20">
              <HardHat className="h-6 w-6 stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-white text-lg tracking-tight font-sans flex items-center gap-1.5">
                  BuildTrack <span className="rounded-md bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">PRO</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Site Intelligence & Control
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Current Active Project Micro-Badge (When collapsed or expanded) */}
        {currentProject && !isCollapsed && (
          <div className="mx-3 my-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <span>Scoped Project</span>
              <span className="text-amber-300 font-mono">{currentProject.code}</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-white">
              {currentProject.name}
            </p>
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge && !isActive && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Public Landing Link */}
        {!isCollapsed && (
          <div className="border-t border-slate-800 p-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                Public Landing Page
              </span>
              <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">View</span>
            </a>
          </div>
        )}
      </aside>
    </>
  );
};
