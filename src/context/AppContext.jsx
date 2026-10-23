import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import {
  isForemanRole,
  isStoreKeeperRole,
  isDirectorRole,
  isPartnerRole,
  isAdminRole,
  canAccessCosts,
  hasFullAccess,
  canSwitchSites,
  normalizeRole,
  isUserRestrictedFromLabour,
  isUserRestrictedFromFunds
} from '../utils/auth';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // -----------------------------------------------------------------
  // 1. STATE DEFINITIONS
  // -----------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState(null);
  const [accessibleProjects, setAccessibleProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Construction Entities — strictly database-driven
  const [projects, setProjects] = useState([]);
  const [laeForms, setLaeForms] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [costs, setCosts] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [companySettings, setCompanySettings] = useState({
    companyName: 'NASAAB CONSTRUCTION LIMITED',
    ncaRegistration: 'NCA 1 - Building & Civil Engineering Works',
    address: 'Mombasa, Kenya',
    phone: '+254 700 000 000',
    email: 'info@nasaabconstruction.com',
    website: 'www.nasaabconstruction.com',
    pdfLogoText: 'NASAAB CONSTRUCTION LIMITED'
  });

  const [activities, setActivities] = useState([]);
  const [toasts, setToasts] = useState([]);

  // -----------------------------------------------------------------
  // 2. TOAST & NOTIFICATION HELPERS
  // -----------------------------------------------------------------
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerCelebration = () => {
    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    } catch {
      // safe fallback
    }
  };

  const logActivity = (text, type = 'general') => {
    const newAct = {
      id: 'act-' + Date.now(),
      text,
      time: new Date().toISOString(),
      type
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 24)]);
  };

  // -----------------------------------------------------------------
  // 3. FETCH PROJECT-SCOPED DATA FROM API
  // -----------------------------------------------------------------
  const loadProjectData = useCallback(async (activeProjId, userRole) => {
    if (!activeProjId) return;
    setIsDataLoading(true);

    const isForeman = isForemanRole(userRole);
    const isStorekeeper = isStoreKeeperRole(userRole);
    const canViewCosts = canAccessCosts(userRole);
    const isGlobal = hasFullAccess(userRole);

    try {
      // 1. Projects
      const projs = await api.projects.getAll().catch(() => []);
      setProjects(projs);

      const effectivePId = activeProjId;

      // 2. Labour, Activity and Equipment Forms (Foreman, Partner, Admin, Director)
      // Storekeeper is FORBIDDEN
      if (!isStorekeeper && effectivePId) {
        const forms = await api.laeForms.getAll(effectivePId).catch(() => []);
        setLaeForms(forms);
      } else {
        setLaeForms([]);
      }

      // 3. Material Requests (Storekeeper, Partner, Admin, Director)
      // Foreman is FORBIDDEN
      if (!isForeman && effectivePId) {
        const matReqs = await api.materialRequests.getAll(effectivePId).catch(() => []);
        setMaterialRequests(matReqs);
      } else {
        setMaterialRequests([]);
      }

      // 4. Financial Costs (Admin, Director, Partner only)
      if (canViewCosts && effectivePId) {
        const csts = await api.costs.getAll(effectivePId).catch(() => []);
        setCosts(csts);
      } else {
        setCosts([]);
      }

      // 5. System Users (Admin, Director only)
      if (isGlobal) {
        const uList = await api.users.getAll().catch(() => []);
        setSystemUsers(uList);
      } else {
        setSystemUsers([]);
      }

      // 6. Company Settings
      const comp = await api.settings.getCompany().catch(() => null);
      if (comp) setCompanySettings(comp);

    } catch (err) {
      console.error('Error loading project data:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------
  // 4. SESSION VERIFICATION ON MOUNT
  // -----------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);

    api.auth.getMe()
      .then((sessionData) => {
        if (!isMounted) return;
        if (sessionData && sessionData.user) {
          const normRole = normalizeRole(sessionData.user.role);
          const mappedUser = {
            ...sessionData.user,
            role: normRole,
            assignedProjectId: sessionData.activeProjectId
          };

          setCurrentUser(mappedUser);
          setAccessibleProjects(sessionData.accessibleProjects || []);

          const initialPId = !canSwitchSites(normRole)
            ? (sessionData.activeProjectId || sessionData.accessibleProjects?.[0]?.id)
            : (sessionData.activeProjectId || 'all');

          setSelectedProjectId(initialPId);
          loadProjectData(initialPId, normRole);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      });

    return () => { isMounted = false; };
  }, [loadProjectData]);

  // -----------------------------------------------------------------
  // 5. AUTHENTICATION HANDLERS
  // -----------------------------------------------------------------
  const handleLoginSuccess = (user, activeProject, accessibleProjs = []) => {
    const normRole = normalizeRole(user.role);
    const mappedUser = {
      ...user,
      role: normRole,
      assignedProjectId: activeProject?.id
    };

    setCurrentUser(mappedUser);
    setAccessibleProjects(accessibleProjs);

    const activePId = !canSwitchSites(normRole)
      ? (activeProject?.id || accessibleProjs[0]?.id)
      : (activeProject?.id || 'all');

    setSelectedProjectId(activePId);
    loadProjectData(activePId, normRole);
    logActivity(`Signed into ${activeProject?.name || 'Workspace'}`, 'auth');
  };

  const logoutUser = async () => {
    try {
      await api.auth.logout();
    } catch {
      // safe fallback
    }
    setCurrentUser(null);
    setProjects([]);
    setLaeForms([]);
    setMaterialRequests([]);
    setCosts([]);
    setSystemUsers([]);
    addToast('Signed out of NASAAB Construction.', 'info');
  };

  // -----------------------------------------------------------------
  // 6. SWITCH ACTIVE PROJECT
  // -----------------------------------------------------------------
  const switchProject = async (pId) => {
    if (isForemanRole(currentUser?.role)) {
      addToast('Foremen are restricted to their assigned site workspace.', 'warning');
      return;
    }

    if (!canSwitchSites(currentUser?.role) && pId === 'all') {
      addToast('Cross-project view is restricted to Administrators, Directors & Partners.', 'warning');
      return;
    }

    try {
      setIsDataLoading(true);
      await api.auth.switchProject(pId);
      setSelectedProjectId(pId);
      setCurrentUser((prev) => (prev ? { ...prev, assignedProjectId: pId } : null));
      await loadProjectData(pId, currentUser?.role);

      const targetProj = pId === 'all' ? null : projects.find((p) => p.id === pId);
      const siteLabel = pId === 'all' ? 'All Projects Combined' : (targetProj?.name || pId);
      addToast(`Switched active workspace to ${siteLabel}`, 'success');
      logActivity(`Switched workspace to ${siteLabel}`, 'auth');
    } catch (err) {
      addToast(err.message || 'Failed to switch project workspace', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // 7. MUTATIONS: PROJECTS
  // -----------------------------------------------------------------
  const createProject = async (projectData) => {
    try {
      const res = await api.projects.create(projectData);
      const created = res.project || res;
      setProjects((prev) => [created, ...prev]);
      logActivity(`Project "${created.name}" created`, 'project');
      addToast(`Project "${created.name}" created successfully!`);
      triggerCelebration();
      return created;
    } catch (err) {
      addToast(err.message || 'Failed to create project', 'error');
      throw err;
    }
  };

  const updateProject = async (id, updates) => {
    try {
      const res = await api.projects.update(id, updates);
      const updated = res.project || res;
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      addToast('Project updated successfully.');
      return updated;
    } catch (err) {
      addToast(err.message || 'Failed to update project', 'error');
      throw err;
    }
  };

  const assignUserToProject = async (projectId, userId, role) => {
    try {
      const res = await api.projects.assignUser(projectId, userId, role);
      addToast(res.message || 'User assigned to project.');
      await loadProjectData(selectedProjectId, currentUser?.role);
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to assign user', 'error');
      throw err;
    }
  };

  const createUserAndAssign = async (projectId, userData) => {
    try {
      const res = await api.projects.createUserAndAssign(projectId, userData);
      addToast(res.message || 'User created and assigned.');
      await loadProjectData(selectedProjectId, currentUser?.role);
      triggerCelebration();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to create and assign user', 'error');
      throw err;
    }
  };

  const removeUserFromProject = async (projectId, userId) => {
    try {
      const res = await api.projects.removeUser(projectId, userId);
      addToast(res.message || 'User project assignment removed.');
      await loadProjectData(selectedProjectId, currentUser?.role);
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to remove user from project', 'error');
      throw err;
    }
  };

  // -----------------------------------------------------------------
  // 8. MUTATIONS: LABOUR, ACTIVITY & EQUIPMENT FORMS
  // -----------------------------------------------------------------
  const createLaeForm = async (formData) => {
    try {
      const targetPId = formData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
      const res = await api.laeForms.create({ ...formData, projectId: targetPId });

      if (targetPId && targetPId !== selectedProjectId) {
        setSelectedProjectId(targetPId);
      }
      await loadProjectData(targetPId, currentUser?.role);
      logActivity(`Labour, Activity & Equipment form submitted`, 'form');
      addToast(`Labour, Activity & Equipment Form submitted successfully!`);
      triggerCelebration();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to submit form', 'error');
      throw err;
    }
  };

  const updateLaeForm = async (id, formData) => {
    try {
      const targetPId = formData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
      const res = await api.laeForms.update(id, { ...formData, projectId: targetPId });

      if (targetPId && targetPId !== selectedProjectId) {
        setSelectedProjectId(targetPId);
      }
      await loadProjectData(targetPId, currentUser?.role);
      logActivity(`Labour, Activity and Equipment Form updated`, 'labour');
      addToast('Labour and Equipment form updated successfully!');
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to update form', 'error');
      throw err;
    }
  };

  const deleteLaeForm = async (id) => {
    try {
      await api.laeForms.delete(id);
      setLaeForms((prev) => prev.filter((f) => f.id !== id));
      addToast('Form deleted.');
    } catch (err) {
      addToast(err.message || 'Failed to delete form', 'error');
      throw err;
    }
  };

  // -----------------------------------------------------------------
  // 9. MUTATIONS: MATERIAL REQUESTS
  // -----------------------------------------------------------------
  const createMaterialRequest = async (requestData) => {
    try {
      const targetPId = requestData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
      const res = await api.materialRequests.create({ ...requestData, projectId: targetPId });

      if (targetPId && targetPId !== selectedProjectId) {
        setSelectedProjectId(targetPId);
      }
      await loadProjectData(targetPId, currentUser?.role);
      logActivity(`Material Needed Request submitted`, 'materials');
      addToast(`Material Needed Request submitted successfully!`);
      triggerCelebration();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to submit material request', 'error');
      throw err;
    }
  };

  const updateMaterialRequest = async (id, requestData) => {
    try {
      const targetPId = requestData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
      const res = await api.materialRequests.update(id, { ...requestData, projectId: targetPId });

      if (targetPId && targetPId !== selectedProjectId) {
        setSelectedProjectId(targetPId);
      }
      await loadProjectData(targetPId, currentUser?.role);
      logActivity(`Material Needed Request updated`, 'materials');
      addToast(`Material request updated successfully!`);
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to update material request', 'error');
      throw err;
    }
  };

  const updateMaterialRequestStatus = async (id, status) => {
    try {
      await api.materialRequests.updateStatus(id, status);
      setMaterialRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      addToast(`Material request status updated to ${status}.`);
    } catch (err) {
      addToast(err.message || 'Failed to update request status', 'error');
      throw err;
    }
  };

  const deleteMaterialRequest = async (id) => {
    try {
      await api.materialRequests.delete(id);
      setMaterialRequests((prev) => prev.filter((r) => r.id !== id));
      addToast('Material request deleted.');
    } catch (err) {
      addToast(err.message || 'Failed to delete request', 'error');
      throw err;
    }
  };

  // -----------------------------------------------------------------
  // 10. MUTATIONS: FINANCIAL COSTS
  // -----------------------------------------------------------------
  const createCost = async (costData) => {
    try {
      const targetPId = costData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
      const created = await api.costs.create({ ...costData, projectId: targetPId });
      setCosts((prev) => [created, ...prev]);
      logActivity(`Cost entry of KES ${Number(costData.amount).toLocaleString()} recorded`, 'finance');
      addToast('Financial expense recorded.');
      return created;
    } catch (err) {
      addToast(err.message || 'Failed to record cost entry', 'error');
      throw err;
    }
  };

  // -----------------------------------------------------------------
  // 11. MUTATIONS: USER MANAGEMENT
  // -----------------------------------------------------------------
  const createUser = async (userData) => {
    try {
      const res = await api.users.create(userData);
      addToast(res.message || 'User created successfully.');
      const uList = await api.users.getAll().catch(() => []);
      setSystemUsers(uList);
      triggerCelebration();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to create user', 'error');
      throw err;
    }
  };

  const updateUser = async (id, userData) => {
    try {
      const res = await api.users.update(id, userData);
      addToast(res.message || 'User updated successfully.');
      const uList = await api.users.getAll().catch(() => []);
      setSystemUsers(uList);
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to update user', 'error');
      throw err;
    }
  };

  const resetUserActivation = async (id) => {
    try {
      const res = await api.users.resetActivation(id);
      addToast(res.message || 'Activation token generated.');
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to reset activation', 'error');
      throw err;
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      const res = await api.users.updateMyProfile(profileData);
      setCurrentUser((prev) => ({ ...prev, ...res.user }));
      addToast('Profile updated successfully.');
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
      throw err;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await api.users.changePassword({ currentPassword, newPassword });
      addToast('Password changed successfully.');
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
      throw err;
    }
  };

  const updateCompanySettings = async (settingsData) => {
    try {
      await api.settings.updateCompany(settingsData);
      setCompanySettings((prev) => ({ ...prev, ...settingsData }));
      addToast('Company settings updated.');
    } catch (err) {
      addToast(err.message || 'Failed to update company settings', 'error');
      throw err;
    }
  };

  // -----------------------------------------------------------------
  // 12. DERIVED VALUES & CONTEXT EXPORT
  // -----------------------------------------------------------------
  const currentProject = selectedProjectId === 'all'
    ? null
    : (projects.find((p) => p.id === selectedProjectId) || null);
  const userRole = currentUser?.role;

  const value = {
    // Session & User
    currentUser,
    accessibleProjects,
    selectedProjectId,
    switchProject,
    currentProject,
    userRole,
    isLoadingAuth,
    isDataLoading,

    // Role predicates
    isAdmin: isAdminRole(userRole),
    isDirector: isDirectorRole(userRole),
    isPartner: isPartnerRole(userRole),
    isForeman: isForemanRole(userRole),
    isStoreKeeper: isStoreKeeperRole(userRole),
    hasFullAccess: hasFullAccess(userRole),
    canAccessCosts: canAccessCosts(userRole),
    isLabourRestricted: isUserRestrictedFromLabour(currentUser, currentProject || selectedProjectId),
    isFundsRestricted: isUserRestrictedFromFunds(currentUser, currentProject || selectedProjectId),
    isFinancialRestricted: isUserRestrictedFromFunds(currentUser, currentProject || selectedProjectId),

    // Real DB Entity Data
    projects,
    laeForms,
    materialRequests,
    costs,
    systemUsers,
    companySettings,
    activities,
    toasts,

    // Mutation & Management Handlers
    handleLoginSuccess,
    logoutUser,
    loadProjectData,

    createProject,
    updateProject,
    assignUserToProject,
    createUserAndAssign,
    removeUserFromProject,

    createLaeForm,
    updateLaeForm,
    deleteLaeForm,

    createMaterialRequest,
    updateMaterialRequest,
    updateMaterialRequestStatus,
    deleteMaterialRequest,

    createCost,

    createUser,
    updateUser,
    resetUserActivation,
    updateUserProfile,
    changePassword,
    updateCompanySettings,

    // Toast helpers
    addToast,
    removeToast,
    triggerCelebration,
    logActivity
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
