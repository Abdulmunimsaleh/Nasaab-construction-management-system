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
import { NewLaeFormModal } from '../components/labour/NewLaeFormModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

export const AppLayout = () => {
  const { currentUser, isForeman, isStoreKeeper, addToast, isLoadingAuth, laeForms, selectedProjectId, projects, isLabourRestricted, currentProject } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const assignedSiteId = currentUser?.assignedProjectId || 'PRJ-001';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals state
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectKey, setCreateProjectKey] = useState(0);
  const [isLabourShiftOpen, setIsLabourShiftOpen] = useState(false);
  const [editingLaeForm, setEditingLaeForm] = useState(null);

  // Authentication & Route Authorization Guard
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    const allowed = isRouteAllowedForRole(currentUser.role, location.pathname, assignedSiteId, currentUser, currentProject || selectedProjectId);
    if (!allowed) {
      if (isLabourRestricted && (location.pathname.startsWith('/labour') || location.pathname === '/equipment-report' || location.pathname === '/safety-delays')) {
        addToast('Access restricted: Mohamed Hussein and Abdi Mahad do not have access to Labour, Equipment, or Safety & Delays on SeaCrest.', 'warning');
        navigate('/dashboard', { replace: true });
      } else if (isForeman) {
        addToast('Access restricted: Foremen can access Labour, Activity & Equipment, and PDF reports.', 'warning');
        navigate('/labour', { replace: true });
      } else if (isStoreKeeper) {
        addToast('Access restricted: Storekeepers can access material requests, dashboard, and reports.', 'warning');
        navigate('/materials', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoadingAuth, currentUser, isForeman, isStoreKeeper, isLabourRestricted, currentProject, selectedProjectId, location.pathname, assignedSiteId, navigate, addToast]);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const handleSelectQuickAction = (actionId) => {
    switch (actionId) {
      case 'labour-shift': {
        if (isLabourRestricted) {
          addToast('Access restricted: Mohamed Hussein and Abdi Mahad cannot log labour shifts on SeaCrest.', 'warning');
          return;
        }
        const activeProjectId = selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || assignedSiteId);
        const existingToday = (laeForms || []).find((f) => {
          if (f.projectId !== activeProjectId && f.project_id !== activeProjectId) return false;
          const fDate = (f.date || '').split('T')[0];
          const cDate = (f.createdAt || f.created_at || '').split('T')[0];
          return fDate === todayStr || cDate === todayStr;
        });

        if (existingToday) {
          if (isForeman) {
            const createdAtMs = new Date(existingToday.createdAt || existingToday.created_at || existingToday.date).getTime();
            const hoursElapsed = (Date.now() - createdAtMs) / (1000 * 60 * 60);
            if (hoursElapsed > 24) {
              addToast('Today’s daily form was created over 24 hours ago and cannot be edited by foremen.', 'warning');
              return;
            }
          }
          addToast(`Opening today's form (${existingToday.formNumber || existingToday.form_number || 'LAE'}) for editing.`, 'info');
          setEditingLaeForm(existingToday);
        } else {
          setEditingLaeForm(null);
        }
        setIsLabourShiftOpen(true);
        break;
      }
      default:
        break;
    }
  };

  // Helper to open create-project modal
  const openCreateProject = () => {
    if (isForeman || isStoreKeeper) {
      addToast('Only Admin, Director and Partner can create new projects.', 'warning');
      return;
    }
    setCreateProjectKey((k) => k + 1);
    setIsCreateProjectOpen(true);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Verifying NASAAB Construction Session...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

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
          <ErrorBoundary>
            <Outlet
              context={{
                onOpenCreateProject: openCreateProject,
                onOpenLabourShift: () => setIsLabourShiftOpen(true)
              }}
            />
          </ErrorBoundary>
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

      {isLabourShiftOpen && (
        <NewLaeFormModal
          isOpen={isLabourShiftOpen}
          editData={editingLaeForm}
          onClose={() => {
            setIsLabourShiftOpen(false);
            setEditingLaeForm(null);
          }}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
