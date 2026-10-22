import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Settings,
  HardHat,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Briefcase,
  CalendarCheck,
  TrendingUp,
  Truck,
  ShieldAlert,
  PackageCheck,
  Coins,
  Package
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { currentUser, currentProject, selectedProjectId, isForeman, isStoreKeeper, isAdmin, isDirector, isLabourRestricted } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Accordion state for group dropdown wings
  const isLabourCurrent = location.pathname.startsWith('/labour') || location.pathname === '/equipment-report' || location.pathname === '/safety-delays';
  const isMaterialCurrent = location.pathname === '/materials' || location.pathname === '/materials-received' || location.pathname === '/material-expenses';
  const [expandedGroups, setExpandedGroups] = useState({ Labour: true, Material: true, 'Site Operations': true });
  const [flyoutGroup, setFlyoutGroup] = useState(null);

  const toggleGroup = (groupLabel) => {
    setExpandedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  // Automatically keep groups expanded when navigating to their routes
  useEffect(() => {
    if (isLabourCurrent) {
      setExpandedGroups((prev) => ({ ...prev, Labour: true, 'Site Operations': true }));
    }
  }, [isLabourCurrent]);

  useEffect(() => {
    if (isMaterialCurrent) {
      setExpandedGroups((prev) => ({ ...prev, Material: true }));
    }
  }, [isMaterialCurrent]);

  // Full admin & director navigation items
  const adminNavItems = [
    { type: 'link', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { type: 'link', label: 'Projects & Sites', path: '/projects', icon: FolderKanban },
    {
      type: 'group',
      label: 'Labour',
      icon: HardHat,
      badge: 'Workforce',
      children: [
        { label: 'Subcontract (PW)', path: '/labour/subcontract', icon: Briefcase },
        { label: 'Daily', path: '/labour/daily', icon: CalendarCheck },
        { label: 'Equipment', path: '/equipment-report', icon: Truck },
        { label: 'Safety & Delays', path: '/safety-delays', icon: ShieldAlert }
      ]
    },
    { type: 'link', label: 'Site Progress', path: '/activities', icon: TrendingUp },
    {
      type: 'group',
      label: 'Material',
      icon: Package,
      badge: 'Stores',
      children: [
        { label: 'Material Requests', path: '/materials', icon: Boxes },
        { label: 'Materials Received', path: '/materials-received', icon: PackageCheck },
        { label: 'Material Expenses', path: '/material-expenses', icon: Coins }
      ]
    },
    { type: 'link', label: 'PDF Reports', path: '/reports', icon: FileText },
    { type: 'link', label: 'Settings & Users', path: '/settings', icon: Settings },
  ];

  // Partner navigation items (full project access, but restricted from entire Labour section on SeaCrest)
  const partnerNavItems = [
    { type: 'link', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { type: 'link', label: 'My Projects', path: '/projects', icon: FolderKanban },
    ...(!isLabourRestricted
      ? [
          {
            type: 'group',
            label: 'Labour',
            icon: HardHat,
            badge: 'Workforce',
            children: [
              { label: 'Subcontract (PW)', path: '/labour/subcontract', icon: Briefcase },
              { label: 'Daily', path: '/labour/daily', icon: CalendarCheck },
              { label: 'Equipment', path: '/equipment-report', icon: Truck },
              { label: 'Safety & Delays', path: '/safety-delays', icon: ShieldAlert }
            ]
          }
        ]
      : []),
    { type: 'link', label: 'Site Progress', path: '/activities', icon: TrendingUp },
    {
      type: 'group',
      label: 'Material',
      icon: Package,
      badge: 'Stores',
      children: [
        { label: 'Material Requests', path: '/materials', icon: Boxes },
        { label: 'Materials Received', path: '/materials-received', icon: PackageCheck },
        { label: 'Material Expenses', path: '/material-expenses', icon: Coins }
      ]
    },
    { type: 'link', label: 'PDF Reports', path: '/reports', icon: FileText },
    { type: 'link', label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Foreman navigation items
  const foremanNavItems = [
    { type: 'link', label: 'Site Overview', path: '/dashboard', icon: LayoutDashboard },
    {
      type: 'group',
      label: 'Labour',
      icon: HardHat,
      badge: 'Active',
      children: [
        { label: 'Subcontract (PW)', path: '/labour/subcontract', icon: Briefcase },
        { label: 'Daily', path: '/labour/daily', icon: CalendarCheck },
        { label: 'Equipment', path: '/equipment-report', icon: Truck },
        { label: 'Safety & Delays', path: '/safety-delays', icon: ShieldAlert }
      ]
    },
    { type: 'link', label: 'Site Progress', path: '/activities', icon: TrendingUp },
    { type: 'link', label: 'PDF Reports', path: '/reports', icon: FileText },
    { type: 'link', label: 'Profile & Settings', path: '/settings', icon: Settings },
  ];

  // Storekeeper navigation items
  const storekeeperNavItems = [
    { type: 'link', label: 'Stores Overview', path: '/dashboard', icon: LayoutDashboard },
    {
      type: 'group',
      label: 'Material',
      icon: Package,
      badge: 'Stores',
      children: [
        { label: 'Material Requests', path: '/materials', icon: Boxes },
        { label: 'Materials Received', path: '/materials-received', icon: PackageCheck },
        { label: 'Material Expenses', path: '/material-expenses', icon: Coins }
      ]
    },
    { type: 'link', label: 'Site Progress', path: '/activities', icon: TrendingUp },
    { type: 'link', label: 'PDF Reports', path: '/reports', icon: FileText },
    { type: 'link', label: 'Profile & Settings', path: '/settings', icon: Settings },
  ];


  const navigationItems = isForeman
    ? foremanNavItems
    : isStoreKeeper
      ? storekeeperNavItems
      : (isAdmin || isDirector)
        ? adminNavItems
        : partnerNavItems;

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
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
          } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-4">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20">
              <HardHat className="h-6 w-6 stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-white text-base tracking-tight font-sans flex items-center gap-1.5">
                  NASAAB <span className="rounded-md bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">PRO</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate">
                  Nasaab Construction Ltd
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Current Active Project Micro-Badge */}
        {!isCollapsed && (
          <div className="mx-3 my-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <span>Scoped Workspace</span>
              <span className="text-amber-300 font-mono">
                {selectedProjectId === 'all' ? 'ALL' : (currentProject?.code || 'SITE')}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-white">
              {selectedProjectId === 'all' ? 'All Projects Combined' : (currentProject?.name || 'Site Workspace')}
            </p>
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {navigationItems.map((item, index) => {
            // Group Accordion item (e.g. Labour -> Subcontract (PW) & Daily)
            if (item.type === 'group') {
              const GroupIcon = item.icon;
              const isGroupExpanded = expandedGroups[item.label] ?? false;
              const hasActiveChild = item.children.some(
                (child) => location.pathname === child.path || (child.path === '/labour/daily' && location.pathname === '/labour')
              );

              return (
                <div key={item.label || index} className="relative">
                  {/* Collapsed Mode Button with Flyout Popover */}
                  {isCollapsed ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setFlyoutGroup(item.label)}
                      onMouseLeave={() => setFlyoutGroup(null)}
                    >
                      <button
                        onClick={() => navigate(item.children[0].path)}
                        className={`group flex w-full items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${hasActiveChild
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        title={item.label}
                      >
                        <GroupIcon
                          className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${hasActiveChild ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                            }`}
                        />
                      </button>

                      {/* Floating Flyout Menu when Collapsed */}
                      {flyoutGroup === item.label && (
                        <div className="absolute left-full top-0 ml-2 z-50 w-48 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-md">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800">
                            {item.label}
                          </div>
                          <div className="mt-1 space-y-1">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive =
                                location.pathname === child.path ||
                                (child.path === '/labour/daily' && location.pathname === '/labour');

                              return (
                                <NavLink
                                  key={child.label}
                                  to={child.path}
                                  onClick={() => {
                                    setFlyoutGroup(null);
                                    setIsMobileOpen(false);
                                  }}
                                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${isChildActive
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                  <ChildIcon className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Expanded Mode: Accordion Wing */
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${hasActiveChild
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <GroupIcon
                            className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${hasActiveChild ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-400'
                              }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20">
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180 text-amber-400' : ''
                              }`}
                          />
                        </div>
                      </button>

                      {/* Sub-Items Wing */}
                      {isGroupExpanded && (
                        <div className="ml-5 pl-3 border-l-2 border-slate-800 space-y-1 py-0.5 animate-fadeIn">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive =
                              location.pathname === child.path ||
                              (child.path === '/labour/daily' && location.pathname === '/labour');

                            return (
                              <NavLink
                                key={child.label}
                                to={child.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${isChildActive
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                                  }`}
                              >
                                <ChildIcon
                                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${isChildActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                                    }`}
                                />
                                <span className="truncate">{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Standard Navigation Link
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
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
          <div className="border-t border-slate-800 p-2.5 shrink-0">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span>Public Website</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            </a>
          </div>
        )}

        {/* Current User Micro-Footer */}
        <div className="border-t border-slate-800/80 p-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 text-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 truncate">
                <p className="truncate text-xs font-bold text-white">
                  {currentUser?.name || 'Authorized User'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                    {currentUser?.role || 'Guest'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser?.userId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
