import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  generateLaeFormPDF,
  generateMaterialRequestPDF,
  generateProjectSummaryPDF,
  generateWeeklyFullReportPDF,
  generateWeeklyLaeReportPDF,
  generateWeeklyMaterialReportPDF
} from '../utils/pdfGenerator';
import {
  canAccessFullWeeklyReport,
  canAccessLaeWeeklyReport,
  canAccessMaterialWeeklyReport,
  canAccessAnyWeeklyReport
} from '../utils/auth';
import api from '../services/api';
import { getDayOfWeek } from '../utils/formatters';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  HardHat,
  Boxes,
  Truck,
  AlertCircle,
  Lock,
  Layers,
  Save,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const ReportsPage = () => {
  const {
    projects,
    laeForms,
    materialRequests,
    companySettings,
    currentUser,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    selectedProjectId: globalProjectId,
    addToast
  } = useApp();

  const userRole = currentUser?.role || 'User';

  // 1. Report Mode: 'weekly' (Dossier) vs 'single' (Individual Form)
  const canAccessWeekly = canAccessAnyWeeklyReport(userRole);
  const [reportMode, setReportMode] = useState(canAccessWeekly ? 'weekly' : 'single');

  // 2. Project Site Selection
  const [selectedProjectId, setSelectedProjectId] = useState(
    (globalProjectId && globalProjectId !== 'all' ? globalProjectId : (currentUser?.assignedProjectId || projects[0]?.id || ''))
  );

  useEffect(() => {
    if (globalProjectId && globalProjectId !== 'all') {
      setSelectedProjectId(globalProjectId);
    }
  }, [globalProjectId]);

  // 3. Weekly Report Categories:
  // - 'full': Admin, Director, Partner only
  // - 'lae': Admin, Director, Partner, Foreman only
  // - 'materials': Admin, Director, Partner, Storekeeper only
  const hasFullAccessToReport = canAccessFullWeeklyReport(userRole);
  const [weeklyCategory, setWeeklyCategory] = useState(
    hasFullAccessToReport
      ? 'full'
      : canAccessLaeWeeklyReport(userRole)
      ? 'lae'
      : 'materials'
  );

  // 4. Available Weeks for the Selected Project Site
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeekKey, setSelectedWeekKey] = useState('');
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);

  // 5. Weekly Aggregated Data State
  const [weeklyData, setWeeklyData] = useState(null);
  const [isLoadingWeeklyData, setIsLoadingWeeklyData] = useState(false);

  // 6. Archived Saved Reports State
  const [savedWeeklyReports, setSavedWeeklyReports] = useState([]);
  const [isSavingReport, setIsSavingReport] = useState(false);

  // 7. Single Form Selection State
  const [singleCategory, setSingleCategory] = useState(isStoreKeeper ? 'materials' : 'lae');
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 8. PDF Blob URL for Live Viewport
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const projectLaeForms = laeForms.filter(
    (f) => !selectedProjectId || selectedProjectId === 'all' || f.project_id === selectedProjectId
  );

  const projectMaterialRequests = materialRequests.filter(
    (r) => !selectedProjectId || selectedProjectId === 'all' || r.project_id === selectedProjectId
  );

  // ---------------------------------------------------------------------------
  // Load Available Weeks for the Selected Site
  // ---------------------------------------------------------------------------
  const loadAvailableWeeks = useCallback(async (projId) => {
    if (!projId || !canAccessWeekly) return;
    setIsLoadingWeeks(true);
    try {
      const weeks = await api.weeklyReports.getWeeks(projId);
      setAvailableWeeks(weeks || []);
      if (weeks && weeks.length > 0) {
        setSelectedWeekKey(`${weeks[0].year}-${weeks[0].weekNumber}`);
      }
    } catch (err) {
      console.error('Failed to load weeks:', err);
    } finally {
      setIsLoadingWeeks(false);
    }
  }, [canAccessWeekly]);

  // ---------------------------------------------------------------------------
  // Load Saved Weekly Reports for this Project Site
  // ---------------------------------------------------------------------------
  const loadSavedWeeklyReports = useCallback(async (projId) => {
    if (!projId || !canAccessWeekly) return;
    try {
      const reports = await api.weeklyReports.getAll(projId);
      setSavedWeeklyReports(reports || []);
    } catch (err) {
      console.error('Failed to load saved weekly reports:', err);
    }
  }, [canAccessWeekly]);

  useEffect(() => {
    if (selectedProjectId) {
      loadAvailableWeeks(selectedProjectId);
      loadSavedWeeklyReports(selectedProjectId);
      setPdfBlobUrl(null);
    }
  }, [selectedProjectId, loadAvailableWeeks, loadSavedWeeklyReports]);

  // Selected week object
  const currentWeekObj = availableWeeks.find(
    (w) => `${w.year}-${w.weekNumber}` === selectedWeekKey
  ) || availableWeeks[0];

  // ---------------------------------------------------------------------------
  // Fetch Weekly Aggregated Data when Project, Category, or Week Changes
  // ---------------------------------------------------------------------------
  const fetchWeeklyData = useCallback(async () => {
    if (!selectedProjectId || !currentWeekObj || reportMode !== 'weekly') return;

    // Check role eligibility for the selected category
    if (weeklyCategory === 'full' && !canAccessFullWeeklyReport(userRole)) {
      setWeeklyData(null);
      return;
    }
    if (weeklyCategory === 'lae' && !canAccessLaeWeeklyReport(userRole)) {
      setWeeklyData(null);
      return;
    }
    if (weeklyCategory === 'materials' && !canAccessMaterialWeeklyReport(userRole)) {
      setWeeklyData(null);
      return;
    }

    setIsLoadingWeeklyData(true);
    try {
      const data = await api.weeklyReports.getData({
        projectId: selectedProjectId,
        reportType: weeklyCategory,
        weekNumber: currentWeekObj.weekNumber,
        year: currentWeekObj.year,
        startDate: currentWeekObj.startDate,
        endDate: currentWeekObj.endDate
      });
      setWeeklyData(data);
    } catch (err) {
      console.error('Failed to fetch weekly report data:', err);
      addToast(err.message || 'Failed to aggregate weekly data for this site', 'error');
      setWeeklyData(null);
    } finally {
      setIsLoadingWeeklyData(false);
    }
  }, [selectedProjectId, currentWeekObj, weeklyCategory, reportMode, userRole, addToast]);

  useEffect(() => {
    if (reportMode === 'weekly') {
      fetchWeeklyData();
    }
  }, [fetchWeeklyData, reportMode]);

  // ---------------------------------------------------------------------------
  // PDF Generation Handler
  // ---------------------------------------------------------------------------
  const handleGeneratePDF = async (download = false) => {
    setIsGeneratingPdf(true);
    try {
      let doc = null;

      if (reportMode === 'weekly') {
        if (!weeklyData) {
          addToast('Loading weekly site data... Please try again in a moment.', 'warning');
          return;
        }

        const weekInfo = {
          weekNumber: currentWeekObj?.weekNumber || weeklyData.weekNumber,
          year: currentWeekObj?.year || weeklyData.year,
          startDate: currentWeekObj?.startDate || weeklyData.startDate,
          endDate: currentWeekObj?.endDate || weeklyData.endDate
        };

        if (weeklyCategory === 'full') {
          if (!canAccessFullWeeklyReport(userRole)) {
            addToast('Full Weekly Reports are restricted to Admin, Director & Partner.', 'error');
            return;
          }
          doc = generateWeeklyFullReportPDF({
            project: selectedProject,
            weekInfo,
            summaryTotals: weeklyData.summaryTotals,
            laeData: weeklyData.laeData,
            materialData: weeklyData.materialData,
            sitePhotos: weeklyData.sitePhotos,
            companySettings,
            author: currentUser
          });
        } else if (weeklyCategory === 'lae') {
          if (!canAccessLaeWeeklyReport(userRole)) {
            addToast('Access denied for Labour, Activity & Equipment reports.', 'error');
            return;
          }
          doc = generateWeeklyLaeReportPDF({
            project: selectedProject,
            weekInfo,
            summaryTotals: weeklyData.summaryTotals,
            laeData: weeklyData.laeData,
            sitePhotos: weeklyData.sitePhotos,
            companySettings,
            author: currentUser
          });
        } else if (weeklyCategory === 'materials') {
          if (!canAccessMaterialWeeklyReport(userRole)) {
            addToast('Access denied for Material Weekly reports.', 'error');
            return;
          }
          doc = generateWeeklyMaterialReportPDF({
            project: selectedProject,
            weekInfo,
            summaryTotals: weeklyData.summaryTotals,
            materialData: weeklyData.materialData,
            sitePhotos: weeklyData.sitePhotos,
            companySettings,
            author: currentUser
          });
        }
      } else {
        // Single Form Mode
        if (singleCategory === 'lae') {
          if (isStoreKeeper) {
            addToast('Storekeepers cannot generate Labour & Equipment reports.', 'error');
            return;
          }
          const targetForm = projectLaeForms.find((f) => f.id === selectedRecordId) || projectLaeForms[0];
          if (!targetForm) {
            addToast('No Labour & Equipment form found for this site.', 'warning');
            return;
          }
          let fullForm = targetForm;
          try {
            fullForm = await api.laeForms.getById(targetForm.id);
          } catch (e) {
            // fallback
          }
          doc = generateLaeFormPDF({
            project: selectedProject,
            form: fullForm,
            companySettings,
            author: currentUser
          });
        } else if (singleCategory === 'materials') {
          if (isForeman) {
            addToast('Foremen cannot access individual storekeeper requisitions directly.', 'error');
            return;
          }
          const targetReq = projectMaterialRequests.find((r) => r.id === selectedRecordId) || projectMaterialRequests[0];
          if (!targetReq) {
            addToast('No Material Request found for this site.', 'warning');
            return;
          }
          let fullReq = targetReq;
          try {
            fullReq = await api.materialRequests.getById(targetReq.id);
          } catch (e) {
            // fallback
          }
          doc = generateMaterialRequestPDF({
            project: selectedProject,
            request: fullReq,
            companySettings,
            author: currentUser
          });
        } else {
          doc = generateProjectSummaryPDF({
            project: selectedProject,
            laeForms: projectLaeForms,
            materialRequests: projectMaterialRequests,
            companySettings,
            userRole: currentUser?.role,
            author: currentUser
          });
        }
      }

      if (!doc) return;

      const fileName = reportMode === 'weekly'
        ? `NASAAB_${selectedProject?.code || 'SITE'}_Week${currentWeekObj?.weekNumber || '00'}_${weeklyCategory.toUpperCase()}_Report.pdf`
        : `NASAAB_${selectedProject?.code || 'SITE'}_Single_Report_${Date.now()}.pdf`;

      if (download) {
        doc.save(fileName);
        addToast('PDF report downloaded successfully!');
      } else {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        addToast('PDF document rendered into viewport.');
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
      addToast('Failed to generate PDF document: ' + err.message, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save / Archive Weekly Report into Database
  // ---------------------------------------------------------------------------
  const handleSaveWeeklyReport = async () => {
    if (!weeklyData || !currentWeekObj) {
      addToast('No weekly data loaded to save.', 'warning');
      return;
    }

    setIsSavingReport(true);
    try {
      await api.weeklyReports.save({
        projectId: selectedProjectId,
        reportType: weeklyCategory,
        weekNumber: currentWeekObj.weekNumber,
        year: currentWeekObj.year,
        startDate: currentWeekObj.startDate,
        endDate: currentWeekObj.endDate,
        title: `Week ${currentWeekObj.weekNumber}, ${currentWeekObj.year} ${weeklyCategory.toUpperCase()} Report — ${selectedProject?.name}`,
        summary: `Site progress dossier for ${selectedProject?.name} during week ${currentWeekObj.weekNumber}. Total estimated expenditure KES ${Number(weeklyData.summaryTotals?.grandTotalCost || 0).toLocaleString()}.`,
        totalWorkers: weeklyData.summaryTotals?.totalWorkers || 0,
        totalLabourCost: weeklyData.summaryTotals?.totalLabourCost || 0,
        totalEquipmentCost: weeklyData.summaryTotals?.totalEquipmentCost || 0,
        totalMaterialCost: weeklyData.summaryTotals?.totalMaterialCost || 0,
        laeFormCount: weeklyData.summaryTotals?.laeFormCount || 0,
        materialRequestCount: weeklyData.summaryTotals?.materialRequestCount || 0,
        metadata: {
          projectCode: selectedProject?.code,
          projectName: selectedProject?.name,
          location: selectedProject?.location
        }
      });

      addToast('Weekly report archived to database successfully!');
      loadSavedWeeklyReports(selectedProjectId);
    } catch (err) {
      console.error('Failed to save weekly report:', err);
      addToast(err.message || 'Failed to save weekly report', 'error');
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-amber-500" />
            <span>Official Construction PDF Reports</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Generate formal, tamper-resistant PDF dossiers for weekly site progress, labour & equipment verification, and material requisitions.
          </p>
        </div>

        {/* Mode Toggle: Weekly Dossiers vs Individual Forms */}
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              if (!canAccessWeekly) {
                addToast('Storekeepers can only generate material requisitions.', 'warning');
                return;
              }
              setReportMode('weekly');
              setPdfBlobUrl(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportMode === 'weekly'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            } ${!canAccessWeekly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Layers className="h-4 w-4" />
            <span>Weekly Site Dossiers (3 Categories)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setReportMode('single');
              setPdfBlobUrl(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportMode === 'single'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Individual Form Records</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black text-amber-900">
                1
              </span>
              <span>Report Configuration</span>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {reportMode === 'weekly' ? 'Weekly Dossier' : 'Single Record'}
            </span>
          </div>

          {/* Project Site Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Target Project Site</span>
              {(isForeman || isStoreKeeper) && (
                <span className="text-[10px] font-normal text-amber-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Assigned Site
                </span>
              )}
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPdfBlobUrl(null);
              }}
              disabled={isForeman || isStoreKeeper}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — {p.location.split(',')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* ========================================================================= */}
          {/* MODE: WEEKLY DOSSIER CONFIGURATION */}
          {/* ========================================================================= */}
          {reportMode === 'weekly' ? (
            <div className="space-y-4">
              {/* Category Selector (The 3 Required Categories) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Weekly Report Category
                </label>
                <div className="space-y-2">
                  {/* Category 1: Full Weekly Report (LAE + Materials) */}
                  <div
                    onClick={() => {
                      if (!canAccessFullWeeklyReport(userRole)) {
                        addToast('Category 1: Full Weekly Report is accessible to Admin, Director & Partner only.', 'warning');
                        return;
                      }
                      setWeeklyCategory('full');
                      setPdfBlobUrl(null);
                    }}
                    className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer relative ${
                      weeklyCategory === 'full'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-950 shadow-xs'
                        : canAccessFullWeeklyReport(userRole)
                        ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        : 'border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${weeklyCategory === 'full' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">1. Full Weekly Report</p>
                          <p className="text-[11px] text-slate-500">Combines LAE Report + Material Report for the week</p>
                        </div>
                      </div>
                      {!canAccessFullWeeklyReport(userRole) ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <Lock className="h-2.5 w-2.5" /> Restricted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Authorized
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Access: Admin, Director, Partner only</span>
                    </div>
                  </div>

                  {/* Category 2: Labour, Activity & Equipment Weekly Report */}
                  <div
                    onClick={() => {
                      if (!canAccessLaeWeeklyReport(userRole)) {
                        addToast('Category 2: Labour, Activity & Equipment reports are restricted to Admin, Director, Partner & Foreman only. Storekeepers cannot access Labour reports.', 'warning');
                        return;
                      }
                      setWeeklyCategory('lae');
                      setPdfBlobUrl(null);
                    }}
                    className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer relative ${
                      weeklyCategory === 'lae'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-950 shadow-xs'
                        : canAccessLaeWeeklyReport(userRole)
                        ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        : 'border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${weeklyCategory === 'lae' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                          <HardHat className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">2. Labour, Activity & Equipment Report</p>
                          <p className="text-[11px] text-slate-500">Workforce headcount, tasks progress & plant expenses</p>
                        </div>
                      </div>
                      {!canAccessLaeWeeklyReport(userRole) ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <Lock className="h-2.5 w-2.5" /> Restricted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Authorized
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Access: Admin, Director, Partner & Foreman only</span>
                    </div>
                  </div>

                  {/* Category 3: Material Weekly Report */}
                  <div
                    onClick={() => {
                      if (!canAccessMaterialWeeklyReport(userRole)) {
                        addToast('Category 3: Material Weekly Reports are restricted to Admin, Director, Partner & Storekeeper only. Foremen cannot access Material reports.', 'warning');
                        return;
                      }
                      setWeeklyCategory('materials');
                      setPdfBlobUrl(null);
                    }}
                    className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer relative ${
                      weeklyCategory === 'materials'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-950 shadow-xs'
                        : canAccessMaterialWeeklyReport(userRole)
                        ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        : 'border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${weeklyCategory === 'materials' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                          <Boxes className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">3. Material Weekly Report</p>
                          <p className="text-[11px] text-slate-500">Weekly site requisitions, deliveries & receipt vouchers</p>
                        </div>
                      </div>
                      {!canAccessMaterialWeeklyReport(userRole) ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <Lock className="h-2.5 w-2.5" /> Restricted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Authorized
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Access: Admin, Director, Partner & Storekeeper only</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Week Period Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Reporting Week Period</span>
                  {isLoadingWeeks && <span className="text-[10px] text-amber-600">Scanning site logs...</span>}
                </label>
                <select
                  value={selectedWeekKey}
                  onChange={(e) => {
                    setSelectedWeekKey(e.target.value);
                    setPdfBlobUrl(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  {availableWeeks.map((w) => (
                    <option key={`${w.year}-${w.weekNumber}`} value={`${w.year}-${w.weekNumber}`}>
                      {w.label}
                    </option>
                  ))}
                  {availableWeeks.length === 0 && (
                    <option value="2026-42">Week 42, 2026 (12 Oct – 18 Oct)</option>
                  )}
                </select>
              </div>

              {/* Real-time Week Summary Card */}
              {weeklyData && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Site Weekly Metrics
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-600">
                      Week {currentWeekObj?.weekNumber || 42}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400">Total Workforce</p>
                      <p className="font-bold text-slate-900">{weeklyData.summaryTotals?.totalWorkers || 0} Workers</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400">Labour Cost</p>
                      <p className="font-bold text-slate-900">KES {Number(weeklyData.summaryTotals?.totalLabourCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400">Equipment Exp.</p>
                      <p className="font-bold text-slate-900">KES {Number(weeklyData.summaryTotals?.totalEquipmentCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400">Materials Req.</p>
                      <p className="font-bold text-slate-900">KES {Number(weeklyData.summaryTotals?.totalMaterialCost || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-slate-900 border-t border-slate-200/60">
                    <span>Weekly Total Cost:</span>
                    <span className="text-amber-600">KES {Number(weeklyData.summaryTotals?.grandTotalCost || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE: INDIVIDUAL FORM RECORDS */
            /* ========================================================================= */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Form Type</label>
                <div className="space-y-2">
                  {!isStoreKeeper && (
                    <button
                      type="button"
                      onClick={() => {
                        setSingleCategory('lae');
                        setSelectedRecordId('');
                        setPdfBlobUrl(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        singleCategory === 'lae'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HardHat className="h-4 w-4 text-amber-500" />
                        <span>Labour, Activity & Equipment Form</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">({projectLaeForms.length})</span>
                    </button>
                  )}

                  {!isForeman && (
                    <button
                      type="button"
                      onClick={() => {
                        setSingleCategory('materials');
                        setSelectedRecordId('');
                        setPdfBlobUrl(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        singleCategory === 'materials'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Boxes className="h-4 w-4 text-amber-500" />
                        <span>Material Needed Requisition</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">({projectMaterialRequests.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Single Record Selector */}
              {singleCategory === 'lae' && projectLaeForms.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Specific Form</label>
                  <select
                    value={selectedRecordId}
                    onChange={(e) => {
                      setSelectedRecordId(e.target.value);
                      setPdfBlobUrl(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  >
                    {projectLaeForms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.form_number} — {getDayOfWeek(f.date)}, {f.date} ({f.prepared_by_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {singleCategory === 'materials' && projectMaterialRequests.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Requisition</label>
                  <select
                    value={selectedRecordId}
                    onChange={(e) => {
                      setSelectedRecordId(e.target.value);
                      setPdfBlobUrl(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  >
                    {projectMaterialRequests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.request_number} — {getDayOfWeek(r.date_needed)}, {r.date_needed} ({r.urgency})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => handleGeneratePDF(false)}
              disabled={isGeneratingPdf || isLoadingWeeklyData}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              <span>{isGeneratingPdf ? 'Generating Document...' : 'Preview PDF Document'}</span>
            </button>

            <button
              onClick={() => handleGeneratePDF(true)}
              disabled={isGeneratingPdf || isLoadingWeeklyData}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF File</span>
            </button>

            {reportMode === 'weekly' && (isAdmin || isDirector || isPartner) && (
              <button
                onClick={handleSaveWeeklyReport}
                disabled={isSavingReport || !weeklyData}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4 text-emerald-600" />
                <span>{isSavingReport ? 'Saving to Database...' : 'Save & Finalize in Database'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Viewport & Archived Reports */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Document Preview Panel */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col min-h-[580px] text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live PDF Document Viewport — {selectedProject?.name}
                </h3>
              </div>
              {pdfBlobUrl && (
                <a
                  href={pdfBlobUrl}
                  download={`NASAAB_${selectedProject?.code || 'SITE'}_Report_${Date.now()}.pdf`}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Save Local Copy</span>
                </a>
              )}
            </div>

            <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800/60">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="NASAAB Construction PDF Viewer"
                  className="w-full h-full border-0 min-h-[540px]"
                />
              ) : (
                <div className="text-center p-8 text-slate-500 space-y-3 max-w-sm">
                  <FileText className="h-12 w-12 mx-auto text-slate-700" />
                  <p className="text-xs font-semibold text-slate-300">No PDF Document Generated Yet</p>
                  <p className="text-[11px] text-slate-500">
                    Select a project site and report category on the left, then click{' '}
                    <span className="text-amber-400 font-semibold">"Preview PDF Document"</span> to render.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Archived / Saved Weekly Reports Table */}
          {reportMode === 'weekly' && savedWeeklyReports.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Archived Weekly Reports for {selectedProject?.name} ({savedWeeklyReports.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => loadSavedWeeklyReports(selectedProjectId)}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="pb-2 font-semibold">Week</th>
                      <th className="pb-2 font-semibold">Category</th>
                      <th className="pb-2 font-semibold">Total Cost</th>
                      <th className="pb-2 font-semibold">Prepared By</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savedWeeklyReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900">
                          Week {r.week_number}, {r.year}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {r.start_date} to {r.end_date}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.report_type === 'full'
                              ? 'bg-amber-100 text-amber-900'
                              : r.report_type === 'lae'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {r.report_type === 'full' ? 'Full Weekly' : r.report_type === 'lae' ? 'Labour & Equip' : 'Materials'}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-slate-900">
                          KES {Number((Number(r.total_labour_cost || 0) + Number(r.total_equipment_cost || 0) + Number(r.total_material_cost || 0))).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-slate-600">{r.prepared_by_name}</td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {r.status?.toUpperCase() || 'FINAL'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWeekKey(`${r.year}-${r.week_number}`);
                              setWeeklyCategory(r.report_type);
                              setTimeout(() => handleGeneratePDF(false), 300);
                            }}
                            className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                          >
                            View PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
