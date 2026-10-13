import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { isRouteAllowedForRole } from '../utils/auth';
import { Sidebar } from '../components/common/Sidebar';
import { Navbar } from '../components/common/Navbar';
import { MobileNav } from '../components/common/MobileNav';
import { ToastContainer } from '../components/common/ToastContainer';
import { QuickActionModal } from '../components/common/QuickActionModal';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { CreateDailyReportModal } from '../components/dailyReports/CreateDailyReportModal';

export const AppLayout = () => {
  const { currentUser, isForeman, addToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const assignedSiteId = currentUser?.assignedProjectId || 'PRJ-002';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals state
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectKey, setCreateProjectKey] = useState(0);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);

  // Route Authorization Guard for Foreman
  useEffect(() => {
    if (isForeman) {
      const allowed = isRouteAllowedForRole(currentUser.role, location.pathname, assignedSiteId);
      if (!allowed) {
        addToast('Access restricted: Foreman can only access assigned site, daily reports, labour, issues, and PDF reports.', 'warning');
        navigate(`/projects/${assignedSiteId}`, { replace: true });
      }
    }
  }, [isForeman, currentUser?.role, location.pathname, assignedSiteId, navigate, addToast]);

  const handleSelectQuickAction = (actionId) => {
    switch (actionId) {
      case 'daily-report':
        setIsDailyReportOpen(true);
        break;
      default:
        break;
    }
  };

  // Helper to open create-project modal with a fresh key
  const openCreateProject = () => {
    if (isForeman) {
      addToast('Only Admin, Contractor and Project Manager can create new projects.', 'warning');
      return;
    }
    setCreateProjectKey((k) => k + 1);
    setIsCreateProjectOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onOpenCreateProject={openCreateProject}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet
            context={{
              onOpenCreateProject: openCreateProject,
              onOpenDailyReport: () => setIsDailyReportOpen(true)
            }}
          />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </div>

      {/* Global Quick Action Launcher */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Universal Action Modals */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          key={createProjectKey}
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
        />
      )}

      {isDailyReportOpen && (
        <CreateDailyReportModal
          isOpen={isDailyReportOpen}
          onClose={() => setIsDailyReportOpen(false)}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
