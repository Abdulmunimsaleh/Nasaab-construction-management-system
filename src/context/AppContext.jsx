import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  INITIAL_PROJECTS,
  INITIAL_WORKERS,
  INITIAL_MATERIALS,
  INITIAL_EQUIPMENT,
  INITIAL_DAILY_REPORTS,
  INITIAL_ISSUES,
  INITIAL_PHOTOS,
  INITIAL_COSTS,
  INITIAL_MATERIAL_TRANSACTIONS,
  INITIAL_EQUIPMENT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ATTENDANCE,
  INITIAL_USER,
  INITIAL_COMPANY_SETTINGS
} from '../data/initialData';
import { isForemanRole, canAccessCosts, hasFullAccess, isReportWithin24Hours, canUserEditReport } from '../utils/auth';

const AppContext = createContext(null);

const STORAGE_KEY_PREFIX = 'buildtrack_';

const loadFromStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from localStorage:`, e);
    return fallback;
  }
};

export const AppProvider = ({ children }) => {
  // Central State with LocalStorage Persistence
  const [projects, setProjects] = useState(() => loadFromStorage('projects', INITIAL_PROJECTS));
  const [selectedProjectId, setSelectedProjectId] = useState(() => loadFromStorage('selected_project', 'all'));
  const [workers, setWorkers] = useState(() => loadFromStorage('workers', INITIAL_WORKERS));
  const [attendance, setAttendance] = useState(() => loadFromStorage('attendance', INITIAL_ATTENDANCE));
  const [materials, setMaterials] = useState(() => loadFromStorage('materials', INITIAL_MATERIALS));
  const [materialTransactions, setMaterialTransactions] = useState(() => loadFromStorage('material_txns', INITIAL_MATERIAL_TRANSACTIONS));
  const [equipment, setEquipment] = useState(() => loadFromStorage('equipment', INITIAL_EQUIPMENT));
  const [equipmentLogs, setEquipmentLogs] = useState(() => loadFromStorage('equipment_logs', INITIAL_EQUIPMENT_LOGS));
  const [dailyReports, setDailyReports] = useState(() => {
    const loaded = loadFromStorage('daily_reports', INITIAL_DAILY_REPORTS);
    return (loaded || []).map((r) => {
      let categories = Array.isArray(r.labourCategories) ? r.labourCategories : [];
      if (categories.length === 0 && (r.workDoneToday || r.workCompletedYesterday || r.workPlanTomorrow || r.plannedWork)) {
        categories = [
          {
            id: 'lc-fallback',
            tradeName: 'General Site Workforce',
            foremanCount: 1,
            skilledCount: Math.max(0, (r.workersPresent || 1) - 1),
            unskilledCount: 0,
            foremanRate: 2500,
            skilledRate: 1500,
            helperRate: 800,
            headcount: r.workersPresent || 1,
            cost: r.totalLabourCost || 0,
            workDoneToday: r.workDoneToday || r.workCompletedYesterday || '',
            workPlanTomorrow: r.workPlanTomorrow || r.plannedWork || ''
          }
        ];
      } else {
        categories = categories.map((cat) => ({
          ...cat,
          workDoneToday: cat.workDoneToday || cat.workCompletedYesterday || '',
          workCompletedYesterday: cat.workDoneToday || cat.workCompletedYesterday || '',
          workPlanTomorrow: cat.workPlanTomorrow || cat.plannedWork || '',
          plannedWork: cat.workPlanTomorrow || cat.plannedWork || ''
        }));
      }

      const catWorkDone = categories
        .map((c) => (c.workDoneToday ? `${c.tradeName || 'Trade'}: ${c.workDoneToday}` : ''))
        .filter(Boolean)
        .join('\n');
      const catWorkPlan = categories
        .map((c) => (c.workPlanTomorrow ? `${c.tradeName || 'Trade'}: ${c.workPlanTomorrow}` : ''))
        .filter(Boolean)
        .join('\n');

      const workDoneToday = catWorkDone || r.workDoneToday || r.workCompletedYesterday || '';
      const workPlanTomorrow = catWorkPlan || r.workPlanTomorrow || r.plannedWork || '';

      return {
        ...r,
        labourCategories: categories,
        workDoneToday,
        workCompletedYesterday: workDoneToday,
        workPlanTomorrow,
        plannedWork: workPlanTomorrow
      };
    });
  });
  const [issues, setIssues] = useState(() => loadFromStorage('issues', INITIAL_ISSUES));
  const [photos, setPhotos] = useState(() => loadFromStorage('photos', INITIAL_PHOTOS));
  const [costs, setCosts] = useState(() => loadFromStorage('costs', INITIAL_COSTS));
  const [notifications, setNotifications] = useState(() => loadFromStorage('notifications', INITIAL_NOTIFICATIONS));
  const [currentUser, setCurrentUser] = useState(() => loadFromStorage('user', INITIAL_USER));
  const [companySettings, setCompanySettings] = useState(() => loadFromStorage('company_settings', INITIAL_COMPANY_SETTINGS));

  // Dynamic Activities
  const [activities, setActivities] = useState(() => [
    { id: 'act-1', text: 'Daily site report submitted for Nairobi Commercial Tower', time: new Date().toISOString(), type: 'report' },
    { id: 'act-2', text: '50 bags of Bamburi cement dispatched to Bay 3', time: new Date(Date.now() - 3600000 * 2).toISOString(), type: 'material' },
    { id: 'act-3', text: 'Excavator CAT 320D operating log approved for Berth 2', time: new Date(Date.now() - 3600000 * 5).toISOString(), type: 'equipment' },
    { id: 'act-4', text: 'Shear wall rebar spacing deviation logged as Critical Issue', time: new Date(Date.now() - 3600000 * 18).toISOString(), type: 'issue' },
    { id: 'act-5', text: 'Safety guardrail inspection signed off for Diani Villa 4', time: new Date(Date.now() - 3600000 * 26).toISOString(), type: 'safety' }
  ]);

  // Toast System
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'selected_project', JSON.stringify(selectedProjectId));
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'material_txns', JSON.stringify(materialTransactions));
  }, [materialTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'equipment', JSON.stringify(equipment));
  }, [equipment]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'equipment_logs', JSON.stringify(equipmentLogs));
  }, [equipmentLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'daily_reports', JSON.stringify(dailyReports));
  }, [dailyReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'photos', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'costs', JSON.stringify(costs));
  }, [costs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'company_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  // Helper: Log Activity
  const logActivity = (text, type = 'general') => {
    const newAct = {
      id: 'act-' + Date.now(),
      text,
      time: new Date().toISOString(),
      type
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 24)]);
  };

  // 1. PROJECTS ACTIONS
  const createProject = (projectData) => {
    const newId = `PRJ-${String(projects.length + 1).padStart(3, '0')}`;
    const newProject = {
      id: newId,
      code: projectData.code || `BLD-${String(projects.length + 1).padStart(2, '0')}`,
      name: projectData.name,
      client: projectData.client,
      clientContact: projectData.clientContact || 'N/A',
      location: projectData.location,
      description: projectData.description || '',
      projectManager: projectData.projectManager || currentUser.name,
      siteEngineer: projectData.siteEngineer || 'Assigned Site Engineer',
      startDate: projectData.startDate || new Date().toISOString().split('T')[0],
      expectedCompletion: projectData.expectedCompletion || '2027-12-31',
      contractValue: Number(projectData.contractValue) || 100000000,
      budget: Number(projectData.budget) || 100000000,
      spent: 0,
      status: projectData.status || 'Active',
      progress: Number(projectData.progress) || 0,
      image: projectData.image || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      category: projectData.category || 'General Construction',
      photosCount: (projectData.photos && projectData.photos.length) || 0,
      photos: projectData.photos || []
    };

    setProjects((prev) => [newProject, ...prev]);

    // If initial photos were attached to the project, register them in gallery
    if (projectData.photos && projectData.photos.length > 0) {
      const initialPhotos = projectData.photos.map((p, idx) => ({
        id: `PHT-${Date.now()}-${idx}`,
        url: p.dataUrl,
        caption: p.name || `Initial site photo for ${newProject.name}`,
        projectId: newId,
        projectName: newProject.name,
        date: newProject.startDate,
        location: newProject.location,
        category: 'Progress',
        uploadedBy: currentUser.name,
        tags: ['site-photo', 'project-launch']
      }));
      setPhotos((prev) => [...initialPhotos, ...prev]);
    }

    logActivity(`New project "${newProject.name}" created`, 'project');
    addToast(`Project "${newProject.name}" successfully created!`);
    triggerCelebration();
    return newProject;
  };

  const updateProject = (id, updates) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addToast('Project updated successfully.');
  };

  const archiveProject = (id) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Archived' } : p))
    );
    addToast('Project archived.', 'warning');
  };

  // 2. DAILY REPORTS ACTIONS
  const createDailyReport = (reportData) => {
    const targetProject = projects.find((p) => p.id === reportData.projectId);
    const newId = `REP-${reportData.date || new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const newReport = {
      id: newId,
      date: reportData.date || new Date().toISOString().split('T')[0],
      projectId: reportData.projectId,
      projectName: targetProject ? targetProject.name : 'Unknown Project',
      weather: reportData.weather || 'Clear / Sunny',
      temperature: reportData.temperature || '25°C',
      siteConditions: reportData.siteConditions || 'Dry, accessible ground.',
      overallProgress: Number(reportData.overallProgress) || (targetProject ? targetProject.progress : 50),
      workersPresent: reportData.workersPresent !== undefined ? Number(reportData.workersPresent) : 24,
      workersAbsent: Number(reportData.workersAbsent) || 1,
      labourCategories: (reportData.labourCategories || []).map((cat) => {
        const foremanRate = Number(cat.foremanRate) || 1500;
        const skilledRate = Number(cat.skilledRate) || 1000;
        const helperRate = Number(cat.helperRate) || 500;
        const headcount = (Number(cat.foremanCount) || 0) + (Number(cat.skilledCount) || 0) + (Number(cat.unskilledCount) || 0);
        const cost = cat.cost ?? (
          (Number(cat.foremanCount) || 0) * foremanRate +
          (Number(cat.skilledCount) || 0) * skilledRate +
          (Number(cat.unskilledCount) || 0) * helperRate
        );
        return {
          ...cat,
          foremanRate,
          skilledRate,
          helperRate,
          headcount,
          cost,
          workDoneToday: cat.workDoneToday || cat.workCompletedYesterday || '',
          workCompletedYesterday: cat.workDoneToday || cat.workCompletedYesterday || '',
          workPlanTomorrow: cat.workPlanTomorrow || cat.plannedWork || '',
          plannedWork: cat.workPlanTomorrow || cat.plannedWork || ''
        };
      }),
      totalLabourCost: Number(reportData.totalLabourCost) || 0,
      plantAndEquipment: reportData.plantAndEquipment || [],
      totalEquipmentCost: Number(reportData.totalEquipmentCost) || 0,
      equipmentOperatingHours: Number(reportData.equipmentOperatingHours) || 8,
      status: reportData.status || 'Submitted',
      submittedBy: currentUser.name,
      supervisor: reportData.supervisor || targetProject?.projectManager || 'Site Supervisor',
      siteEngineer: reportData.siteEngineer || targetProject?.siteEngineer || 'Site Engineer',
      workDoneToday:
        (reportData.labourCategories || [])
          .map((c) => (c.workDoneToday ? `${c.tradeName || 'Trade'}: ${c.workDoneToday}` : ''))
          .filter(Boolean)
          .join('\n') ||
        reportData.workDoneToday ||
        reportData.workCompletedYesterday ||
        'Structural works and site inspection.',
      workCompletedYesterday:
        (reportData.labourCategories || [])
          .map((c) => (c.workDoneToday ? `${c.tradeName || 'Trade'}: ${c.workDoneToday}` : ''))
          .filter(Boolean)
          .join('\n') ||
        reportData.workDoneToday ||
        reportData.workCompletedYesterday ||
        'Structural works and site inspection.',
      workPlanTomorrow:
        (reportData.labourCategories || [])
          .map((c) => (c.workPlanTomorrow ? `${c.tradeName || 'Trade'}: ${c.workPlanTomorrow}` : ''))
          .filter(Boolean)
          .join('\n') ||
        reportData.workPlanTomorrow ||
        reportData.plannedWork ||
        'Continue scheduled works.',
      plannedWork:
        (reportData.labourCategories || [])
          .map((c) => (c.workPlanTomorrow ? `${c.tradeName || 'Trade'}: ${c.workPlanTomorrow}` : ''))
          .filter(Boolean)
          .join('\n') ||
        reportData.workPlanTomorrow ||
        reportData.plannedWork ||
        'Continue scheduled works.',
      actualWork: reportData.actualWork || 'Completed scheduled shift tasks.',
      delaysAndSafetyIncidents: reportData.delaysAndSafetyIncidents || reportData.delaysForYesterday || reportData.safetyIncidents || 'Zero incidents reported. No work delays.',
      delaysForYesterday: reportData.delaysForYesterday || reportData.delaysAndSafetyIncidents || 'None reported.',
      safetyIncidents: reportData.safetyIncidents || reportData.delaysAndSafetyIncidents || 'Zero incidents reported.',
      visitorInformation: reportData.visitorInformation || 'No official visitors today.',
      generalNotes: reportData.generalNotes || '',
      materialsReceivedToday: reportData.materialsReceivedToday || '',
      materialsNeededTomorrow: reportData.materialsNeededTomorrow || '',
      materialsSummary: reportData.materialsSummary || [],
      equipmentSummary: reportData.equipmentSummary || [],
      photosCount: (reportData.photos && reportData.photos.length) || 0,
      photos: reportData.photos || [],
      location: reportData.location || '',
      createdAt: reportData.createdAt || new Date().toISOString(),
      submittedAt: reportData.submittedAt || new Date().toISOString(),
      day: reportData.day || (() => {
        const d = new Date((reportData.date || new Date().toISOString().split('T')[0]) + 'T00:00:00');
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
      })()
    };

    setDailyReports((prev) => [newReport, ...prev]);

    // If report has a new overall progress, update project progress
    if (targetProject && reportData.overallProgress) {
      updateProject(targetProject.id, { progress: Number(reportData.overallProgress) });
    }

    logActivity(`Daily report submitted for ${newReport.projectName}`, 'report');
    addToast(`Daily Report for ${newReport.date} submitted!`);
    triggerCelebration();
    return newReport;
  };

  const updateDailyReport = (id, reportData) => {
    // Enforce 24-hour editing window strictly for Foreman role
    if (isForemanRole(currentUser.role)) {
      const existing = dailyReports.find((r) => r.id === id);
      if (existing && !isReportWithin24Hours(existing)) {
        addToast('Editing expired. Foremen can only edit daily reports within 24 hours of submission.', 'error');
        return false;
      }
    }

    const targetProject = projects.find((p) => p.id === reportData.projectId);
    setDailyReports((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const isForeman = isForemanRole(currentUser.role);
        const mappedCategories = reportData.labourCategories
          ? reportData.labourCategories.map((cat) => {
              const existingCat = (r.labourCategories || []).find((c) => c.id === cat.id);
              const foremanRate = isForeman
                ? (existingCat?.foremanRate ?? 1500)
                : (Number(cat.foremanRate) || 1500);
              const skilledRate = isForeman
                ? (existingCat?.skilledRate ?? 1000)
                : (Number(cat.skilledRate) || 1000);
              const helperRate = isForeman
                ? (existingCat?.helperRate ?? 500)
                : (Number(cat.helperRate) || 500);
              const headcount = (Number(cat.foremanCount) || 0) + (Number(cat.skilledCount) || 0) + (Number(cat.unskilledCount) || 0);
              const cost = (Number(cat.foremanCount) || 0) * foremanRate +
                           (Number(cat.skilledCount) || 0) * skilledRate +
                           (Number(cat.unskilledCount) || 0) * helperRate;
              return {
                ...cat,
                foremanRate,
                skilledRate,
                helperRate,
                headcount,
                cost,
                workDoneToday: cat.workDoneToday || cat.workCompletedYesterday || '',
                workCompletedYesterday: cat.workDoneToday || cat.workCompletedYesterday || '',
                workPlanTomorrow: cat.workPlanTomorrow || cat.plannedWork || '',
                plannedWork: cat.workPlanTomorrow || cat.plannedWork || ''
              };
            })
          : r.labourCategories;

        const catWorkDone = mappedCategories
          ? mappedCategories.map((c) => (c.workDoneToday ? `${c.tradeName || 'Trade'}: ${c.workDoneToday}` : '')).filter(Boolean).join('\n')
          : '';
        const catWorkPlan = mappedCategories
          ? mappedCategories.map((c) => (c.workPlanTomorrow ? `${c.tradeName || 'Trade'}: ${c.workPlanTomorrow}` : '')).filter(Boolean).join('\n')
          : '';

        const workDoneToday = catWorkDone || reportData.workDoneToday || reportData.workCompletedYesterday || r.workDoneToday || r.workCompletedYesterday || '';
        const workPlanTomorrow = catWorkPlan || reportData.workPlanTomorrow || reportData.plannedWork || r.workPlanTomorrow || r.plannedWork || '';
        return {
          ...r,
          ...reportData,
          id, // preserve ID
          projectName: targetProject ? targetProject.name : r.projectName,
          labourCategories: mappedCategories,
          workDoneToday,
          workCompletedYesterday: workDoneToday,
          workPlanTomorrow,
          plannedWork: workPlanTomorrow,
          photosCount: (reportData.photos && reportData.photos.length) || r.photosCount || 0,
          updatedAt: new Date().toISOString()
        };
      })
    );

    if (targetProject && reportData.overallProgress) {
      updateProject(targetProject.id, { progress: Number(reportData.overallProgress) });
    }

    logActivity(`Daily report #${id} updated`, 'report');
    addToast(`Daily Report #${id} updated successfully!`);
    return true;
  };

  const approveDailyReport = (id) => {
    setDailyReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))
    );
    logActivity(`Daily report #${id} approved by ${currentUser.name}`, 'report');
    addToast('Daily Report approved.');
  };

  const rejectDailyReport = (id, reason) => {
    setDailyReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected', rejectionReason: reason } : r))
    );
    addToast('Daily Report rejected and returned for revision.', 'error');
  };

  // 3. LABOUR & ATTENDANCE ACTIONS
  const addWorker = (workerData) => {
    const newId = `WRK-${String(workers.length + 101)}`;
    const newWorker = {
      id: newId,
      fullName: workerData.fullName,
      role: workerData.role,
      trade: workerData.trade || workerData.role,
      phone: workerData.phone || '+254 700 000 000',
      company: workerData.company || 'BuildTrack Core Staff',
      dailyRate: Number(workerData.dailyRate) || 1500,
      status: 'Active',
      projectId: workerData.projectId || projects[0]?.id || 'PRJ-001',
      emergencyContact: workerData.emergencyContact || 'N/A',
      skills: workerData.skills || [workerData.role]
    };
    setWorkers((prev) => [newWorker, ...prev]);
    logActivity(`New worker "${newWorker.fullName}" (${newWorker.role}) added`, 'labour');
    addToast(`Worker ${newWorker.fullName} registered.`);
    return newWorker;
  };

  const toggleWorkerAttendance = (workerId, date = new Date().toISOString().split('T')[0]) => {
    const existing = attendance.find((a) => a.workerId === workerId && a.date === date);
    const worker = workers.find((w) => w.id === workerId);
    if (existing) {
      const nextStatus = existing.status === 'Present' ? 'Absent' : 'Present';
      setAttendance((prev) =>
        prev.map((a) =>
          a.id === existing.id
            ? {
              ...a,
              status: nextStatus,
              normalHours: nextStatus === 'Present' ? 8 : 0,
              overtimeHours: nextStatus === 'Present' ? a.overtimeHours : 0
            }
            : a
        )
      );
      addToast(`${worker?.fullName || 'Worker'} marked as ${nextStatus}.`);
    } else {
      const newAtt = {
        id: `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        workerId,
        date,
        status: 'Present',
        checkIn: '07:30',
        checkOut: '17:00',
        normalHours: 8,
        overtimeHours: 0,
        notes: 'Recorded via Site Attendance Sheet'
      };
      setAttendance((prev) => [...prev, newAtt]);
      addToast(`${worker?.fullName || 'Worker'} marked Present.`);
    }
  };

  const updateAttendanceRecord = (attendanceId, updates) => {
    setAttendance((prev) =>
      prev.map((a) => (a.id === attendanceId ? { ...a, ...updates } : a))
    );
    addToast('Attendance details updated.');
  };

  // 4. MATERIALS & TRANSACTIONS ACTIONS
  const addMaterial = (matData) => {
    const newId = `MAT-${String(materials.length + 1).padStart(3, '0')}`;
    const newMat = {
      id: newId,
      name: matData.name,
      category: matData.category || 'General Materials',
      unit: matData.unit || 'Units',
      supplier: matData.supplier || 'Approved Site Supplier',
      unitCost: Number(matData.unitCost) || 1000,
      currentStock: Number(matData.currentStock) || 0,
      minimumStock: Number(matData.minimumStock) || 10,
      projectId: matData.projectId || projects[0]?.id || 'PRJ-001',
      lastRestocked: new Date().toISOString().split('T')[0],
      locationZone: matData.locationZone || 'Site Store'
    };
    setMaterials((prev) => [newMat, ...prev]);
    logActivity(`Material "${newMat.name}" added to inventory`, 'material');
    addToast(`Material "${newMat.name}" added to catalog.`);
    return newMat;
  };

  const recordMaterialTransaction = (txData) => {
    const qty = Number(txData.quantity);
    const targetMat = materials.find((m) => m.id === txData.materialId);

    if (!targetMat) {
      addToast('Material not found.', 'error');
      return;
    }

    let newStock = targetMat.currentStock;
    if (txData.type === 'Used' || txData.type === 'Wasted') {
      newStock = Math.max(0, targetMat.currentStock - qty);
    } else if (txData.type === 'Received' || txData.type === 'Returned') {
      newStock = targetMat.currentStock + qty;
    } else if (txData.type === 'Adjusted') {
      newStock = qty;
    }

    // Update material currentStock
    setMaterials((prev) =>
      prev.map((m) => (m.id === targetMat.id ? { ...m, currentStock: newStock, lastRestocked: new Date().toISOString().split('T')[0] } : m))
    );

    const newTx = {
      id: `TXN-${String(materialTransactions.length + 1).padStart(3, '0')}`,
      materialId: targetMat.id,
      materialName: targetMat.name,
      projectId: txData.projectId || targetMat.projectId,
      type: txData.type,
      quantity: qty,
      date: new Date().toISOString(),
      performedBy: currentUser.name,
      reference: txData.reference || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: txData.notes || `${txData.type} ${qty} ${targetMat.unit}`
    };

    setMaterialTransactions((prev) => [newTx, ...prev]);

    // Check low stock alert
    if (newStock <= targetMat.minimumStock) {
      const alertNotif = {
        id: `NOTIF-${Date.now()}`,
        title: 'Low Stock Alert',
        message: `${targetMat.name} has fallen to ${newStock} ${targetMat.unit} (Below minimum ${targetMat.minimumStock})!`,
        type: 'warning',
        timestamp: new Date().toISOString(),
        read: false,
        link: '/materials'
      };
      setNotifications((prev) => [alertNotif, ...prev]);
      addToast(`Warning: ${targetMat.name} is low on stock (${newStock} ${targetMat.unit} left)!`, 'warning');
    } else {
      addToast(`Recorded: ${txData.type} ${qty} ${targetMat.unit} of ${targetMat.name}`);
    }

    logActivity(`${txData.type} ${qty} ${targetMat.unit} of ${targetMat.name}`, 'material');
  };

  // 5. EQUIPMENT & LOGS ACTIONS
  const addEquipment = (eqData) => {
    const newId = `EQP-${String(equipment.length + 1).padStart(3, '0')}`;
    const newEq = {
      id: newId,
      name: eqData.name,
      code: eqData.code || `EQP-${equipment.length + 1}`,
      type: eqData.type || 'Heavy Plant',
      owner: eqData.owner || 'BuildTrack Fleet',
      operator: eqData.operator || 'Assigned Operator',
      dailyRate: Number(eqData.dailyRate) || 25000,
      hourlyRate: Number(eqData.hourlyRate) || 3500,
      status: eqData.status || 'Available',
      location: eqData.location || 'Site Yard',
      projectId: eqData.projectId || projects[0]?.id || 'PRJ-001',
      totalHours: 0,
      fuelLevel: eqData.fuelLevel || '100%',
      nextService: eqData.nextService || '2027-01-01'
    };
    setEquipment((prev) => [newEq, ...prev]);
    logActivity(`Equipment "${newEq.name}" added to project fleet`, 'equipment');
    addToast(`Equipment "${newEq.name}" registered.`);
    return newEq;
  };

  const updateEquipmentStatus = (id, newStatus) => {
    setEquipment((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
    addToast(`Equipment status changed to ${newStatus}.`);
  };

  const recordEquipmentLog = (logData) => {
    const targetEq = equipment.find((e) => e.id === logData.equipmentId);
    if (!targetEq) {
      addToast('Equipment not found.', 'error');
      return;
    }
    const opHours = Number(logData.operatingHours) || 0;
    const calcCost = opHours * (targetEq.hourlyRate || 3500);

    const newLog = {
      id: `LOG-${String(equipmentLogs.length + 1).padStart(3, '0')}`,
      equipmentId: targetEq.id,
      equipmentName: targetEq.name,
      projectId: logData.projectId || targetEq.projectId,
      date: logData.date || new Date().toISOString().split('T')[0],
      operator: logData.operator || targetEq.operator,
      startTime: logData.startTime || '08:00',
      endTime: logData.endTime || '17:00',
      operatingHours: opHours,
      idleHours: Number(logData.idleHours) || 0,
      fuelUsed: logData.fuelUsed || '0 Litres',
      hourlyRate: targetEq.hourlyRate,
      calculatedCost: calcCost,
      maintenance: logData.maintenance || 'Routine check OK',
      notes: logData.notes || ''
    };

    setEquipmentLogs((prev) => [newLog, ...prev]);

    // Update equipment total hours
    setEquipment((prev) =>
      prev.map((e) => (e.id === targetEq.id ? { ...e, totalHours: (e.totalHours || 0) + opHours, status: 'In Use' } : e))
    );

    logActivity(`Operating log added for ${targetEq.name} (${opHours} hrs)`, 'equipment');
    addToast(`Logged ${opHours} operating hours for ${targetEq.name}.`);
  };

  // 6. ISSUES ACTIONS
  const createIssue = (issueData) => {
    const newId = `ISS-${String(issues.length + 1).padStart(3, '0')}`;
    const newIssue = {
      id: newId,
      title: issueData.title,
      description: issueData.description,
      projectId: issueData.projectId || projects[0]?.id || 'PRJ-001',
      location: issueData.location || 'Main Site',
      category: issueData.category || 'Quality',
      priority: issueData.priority || 'Medium',
      status: 'Open',
      reportedBy: currentUser.name,
      assignedTo: issueData.assignedTo || 'Site Engineer',
      createdDate: new Date().toISOString(),
      dueDate: issueData.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      resolvedDate: null,
      photos: issueData.photos || [],
      timeline: [
        {
          time: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser.name,
          text: `Issue logged: ${issueData.title}`
        }
      ]
    };

    setIssues((prev) => [newIssue, ...prev]);

    if (newIssue.priority === 'Critical') {
      const critNotif = {
        id: `NOTIF-${Date.now()}`,
        title: 'Critical Issue Reported!',
        message: `${newIssue.title} (Location: ${newIssue.location})`,
        type: 'error',
        timestamp: new Date().toISOString(),
        read: false,
        link: '/issues'
      };
      setNotifications((prev) => [critNotif, ...prev]);
    }

    logActivity(`Issue logged: "${newIssue.title}" [${newIssue.priority}]`, 'issue');
    addToast(`Issue #${newId} logged successfully!`, newIssue.priority === 'Critical' ? 'warning' : 'success');
    return newIssue;
  };

  const resolveIssue = (id, resolutionNotes = 'Resolved on site') => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === id) {
          return {
            ...iss,
            status: 'Resolved',
            resolvedDate: new Date().toISOString(),
            timeline: [
              ...iss.timeline,
              {
                time: new Date().toISOString().replace('T', ' ').substring(0, 16),
                author: currentUser.name,
                text: `Resolved: ${resolutionNotes}`
              }
            ]
          };
        }
        return iss;
      })
    );
    logActivity(`Issue #${id} marked as resolved by ${currentUser.name}`, 'issue');
    addToast(`Issue #${id} resolved!`);
    triggerCelebration();
  };

  const updateIssueStatus = (id, newStatus, comment) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === id) {
          const newTimeline = [...iss.timeline];
          if (comment) {
            newTimeline.push({
              time: new Date().toISOString().replace('T', ' ').substring(0, 16),
              author: currentUser.name,
              text: `Status changed to ${newStatus}: ${comment}`
            });
          }
          return {
            ...iss,
            status: newStatus,
            resolvedDate: newStatus === 'Resolved' || newStatus === 'Closed' ? new Date().toISOString() : iss.resolvedDate,
            timeline: newTimeline
          };
        }
        return iss;
      })
    );
    addToast(`Issue #${id} status updated to ${newStatus}.`);
  };

  // 7. PHOTOS ACTIONS
  const uploadPhoto = (photoData) => {
    const targetProject = projects.find((p) => p.id === photoData.projectId);
    const newId = `PHT-${String(photos.length + 1).padStart(3, '0')}`;
    const newPhoto = {
      id: newId,
      url: photoData.url || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      caption: photoData.caption || 'Site progress inspection snapshot',
      projectId: photoData.projectId || projects[0]?.id || 'PRJ-001',
      projectName: targetProject ? targetProject.name : 'Active Site',
      date: photoData.date || new Date().toISOString().split('T')[0],
      location: photoData.location || 'Main Site Area',
      category: photoData.category || 'Progress',
      uploadedBy: currentUser.name,
      tags: photoData.tags || ['site', 'progress']
    };
    setPhotos((prev) => [newPhoto, ...prev]);
    logActivity(`New site photo uploaded for ${newPhoto.projectName}`, 'photo');
    addToast('Site photo uploaded to gallery.');
    return newPhoto;
  };

  // 8. COSTS ACTIONS
  const addCost = (costData) => {
    const amt = Number(costData.amount) || 0;
    const newId = `CST-${String(costs.length + 1).padStart(3, '0')}`;
    const newCost = {
      id: newId,
      date: costData.date || new Date().toISOString().split('T')[0],
      projectId: costData.projectId || projects[0]?.id || 'PRJ-001',
      category: costData.category || 'Materials',
      description: costData.description || 'Site Expense Entry',
      amount: amt,
      supplier: costData.supplier || 'Site Vendor',
      referenceNumber: costData.referenceNumber || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentStatus: costData.paymentStatus || 'Paid',
      notes: costData.notes || ''
    };

    setCosts((prev) => [newCost, ...prev]);

    // Automatically increase project spent
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === newCost.projectId) {
          const newSpent = (p.spent || 0) + amt;
          // Check if budget exceeded
          if (newSpent > p.budget) {
            const overBudgetNotif = {
              id: `NOTIF-${Date.now()}`,
              title: 'Budget Alert: Project Over Budget!',
              message: `${p.name} spending has exceeded allocated budget of KES ${p.budget.toLocaleString()}!`,
              type: 'error',
              timestamp: new Date().toISOString(),
              read: false,
              link: '/costs'
            };
            setNotifications((nPrev) => [overBudgetNotif, ...nPrev]);
          }
          return { ...p, spent: newSpent };
        }
        return p;
      })
    );

    logActivity(`Cost of KES ${amt.toLocaleString()} recorded (${newCost.category})`, 'cost');
    addToast(`Cost of KES ${amt.toLocaleString()} recorded successfully.`);
    return newCost;
  };

  // 9. NOTIFICATIONS ACTIONS
  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('All notifications marked as read.');
  };

  // 10. USER / ROLE SWITCHING & AUTHENTICATION
  const switchRole = (newRole) => {
    const isNowForeman = isForemanRole(newRole);
    const assignedProject = isNowForeman ? (currentUser.assignedProjectId || 'PRJ-002') : undefined;

    setCurrentUser((prev) => ({
      ...prev,
      role: newRole,
      ...(assignedProject ? { assignedProjectId: assignedProject } : {})
    }));

    if (isNowForeman) {
      setSelectedProjectId(assignedProject || 'PRJ-002');
    }

    addToast(`Switched active role to: ${newRole}`, 'info');
  };

  const loginUser = (userAccount) => {
    setCurrentUser(userAccount);
    if (isForemanRole(userAccount.role)) {
      setSelectedProjectId(userAccount.assignedProjectId || 'PRJ-002');
    } else {
      setSelectedProjectId('all');
    }
    addToast(`Authenticated as ${userAccount.name} (${userAccount.role})`);
  };

  const updateUserProfile = (profileData) => {
    setCurrentUser((prev) => ({ ...prev, ...profileData }));
    addToast('User profile updated successfully.');
  };

  // 11. RESET DEMO DATA
  const resetToDemoData = () => {
    setProjects(INITIAL_PROJECTS);
    setSelectedProjectId('all');
    setWorkers(INITIAL_WORKERS);
    setAttendance(INITIAL_ATTENDANCE);
    setMaterials(INITIAL_MATERIALS);
    setMaterialTransactions(INITIAL_MATERIAL_TRANSACTIONS);
    setEquipment(INITIAL_EQUIPMENT);
    setEquipmentLogs(INITIAL_EQUIPMENT_LOGS);
    setDailyReports(INITIAL_DAILY_REPORTS);
    setIssues(INITIAL_ISSUES);
    setPhotos(INITIAL_PHOTOS);
    setCosts(INITIAL_COSTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentUser(INITIAL_USER);
    setCompanySettings(INITIAL_COMPANY_SETTINGS);
    addToast('Application reset to initial Kenyan demo dataset!', 'info');
    triggerCelebration();
  };

  // Enforce site scoping for Foreman
  const isForeman = isForemanRole(currentUser.role);
  const foremanAssignedProjectId = currentUser.assignedProjectId || 'PRJ-002';
  const effectiveProjectId = isForeman ? foremanAssignedProjectId : selectedProjectId;

  // Filtered views based on selectedProjectId and Foreman restrictions
  const currentProject = projects.find((p) => p.id === effectiveProjectId) || (isForeman ? projects.find(p => p.id === foremanAssignedProjectId) : null);

  const filteredProjects = isForeman
    ? projects.filter((p) => p.id === foremanAssignedProjectId)
    : (selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId));

  const filteredDailyReports = effectiveProjectId === 'all'
    ? dailyReports
    : dailyReports.filter((r) => r.projectId === effectiveProjectId);

  const filteredWorkers = effectiveProjectId === 'all'
    ? workers
    : workers.filter((w) => w.projectId === effectiveProjectId);

  const filteredMaterials = effectiveProjectId === 'all'
    ? materials
    : materials.filter((m) => m.projectId === effectiveProjectId);

  const filteredEquipment = effectiveProjectId === 'all'
    ? equipment
    : equipment.filter((e) => e.projectId === effectiveProjectId);

  const filteredIssues = effectiveProjectId === 'all'
    ? issues
    : issues.filter((i) => i.projectId === effectiveProjectId);

  const filteredPhotos = effectiveProjectId === 'all'
    ? photos
    : photos.filter((p) => p.projectId === effectiveProjectId);

  const filteredCosts = isForeman
    ? [] // Foreman can never access costs
    : (effectiveProjectId === 'all'
      ? costs
      : costs.filter((c) => c.projectId === effectiveProjectId));

  return (
    <AppContext.Provider
      value={{
        // State
        projects,
        selectedProjectId,
        setSelectedProjectId,
        currentProject,
        filteredProjects,
        workers,
        filteredWorkers,
        attendance,
        materials,
        filteredMaterials,
        materialTransactions,
        equipment,
        filteredEquipment,
        equipmentLogs,
        dailyReports,
        filteredDailyReports,
        issues,
        filteredIssues,
        photos,
        filteredPhotos,
        costs,
        filteredCosts,
        notifications,
        currentUser,
        companySettings,
        activities,
        toasts,

        // Actions
        addToast,
        removeToast,
        triggerCelebration,
        createProject,
        updateProject,
        archiveProject,
        createDailyReport,
        updateDailyReport,
        approveDailyReport,
        rejectDailyReport,
        addWorker,
        toggleWorkerAttendance,
        updateAttendanceRecord,
        addMaterial,
        recordMaterialTransaction,
        addEquipment,
        updateEquipmentStatus,
        recordEquipmentLog,
        createIssue,
        resolveIssue,
        updateIssueStatus,
        uploadPhoto,
        addCost,
        markNotificationRead,
        markAllNotificationsRead,
        switchRole,
        loginUser,
        updateUserProfile,
        setCompanySettings,
        resetToDemoData,
        logActivity,

        // Permissions
        canAccessCosts: canAccessCosts(currentUser.role),
        isForeman: isForemanRole(currentUser.role),
        hasFullAccess: hasFullAccess(currentUser.role)
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
