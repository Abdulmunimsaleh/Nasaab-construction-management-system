import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  FileText,
  Plus,
  Menu
} from 'lucide-react';

export const MobileNav = ({ onOpenQuickAction, onToggleMobileMenu }) => {
  const { currentUser, isForeman } = useApp();
  const assignedSiteId = currentUser?.assignedProjectId || 'PRJ-002';

  if (isForeman) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-lg">
        <div className="flex items-center justify-around">
          {/* Site */}
          <NavLink
            to={`/projects/${assignedSiteId}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <FolderKanban className="h-5 w-5" />
            <span>My Site</span>
          </NavLink>

          {/* Daily Reports */}
          <NavLink
            to="/daily-reports"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span>Reports</span>
          </NavLink>

          {/* Quick Action */}
          <button
            onClick={onOpenQuickAction}
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 active:scale-90 transition-transform"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* PDF Reports */}
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <FileText className="h-5 w-5" />
            <span>Reports PDF</span>
          </NavLink>

          {/* More Menu Drawer */}
          <button
            onClick={onToggleMobileMenu}
            className="flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-lg">
      <div className="flex items-center justify-around">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Home</span>
        </NavLink>

        {/* Projects */}
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <FolderKanban className="h-5 w-5" />
          <span>Projects</span>
        </NavLink>

        {/* Central Floating Quick Action Action Button */}
        <button
          onClick={onOpenQuickAction}
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 active:scale-90 transition-transform"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Daily Reports */}
        <NavLink
          to="/daily-reports"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <FileSpreadsheet className="h-5 w-5" />
          <span>Reports</span>
        </NavLink>

        {/* More Menu Drawer */}
        <button
          onClick={onToggleMobileMenu}
          className="flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </div>
  );
};
