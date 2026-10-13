import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateConstructionReportPDF } from '../utils/pdfGenerator';
import { buildWeeklyData } from '../utils/weeklyReportHelper';
import { Modal } from '../components/common/Modal';
import { formatKES, formatDate } from '../utils/formatters';
import {
  FileText,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  HardHat,
  Sliders,
  Sparkles,
  Layers,
  ClipboardList
} from 'lucide-react';

export const ReportsPage = () => {
  const {
    projects,
    dailyReports,
    workers,
    materials,
    equipment,
    issues,
    costs,
    companySettings,
    currentUser,
    addToast,
    isForeman,
    canAccessCosts
  } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState(
    isForeman ? (currentUser.assignedProjectId || 'PRJ-002') : (projects[0]?.id || 'PRJ-001')
  );
  const [reportType, setReportType] = useState('Weekly Project Report');
  const [weeklyScope, setWeeklyScope] = useState('combined'); // 'combined' | 'labour' | 'activity'
  const [dateRange, setDateRange] = useState('Current Week (Mon 05 Oct – Sun 11 Oct 2026)');
  const [sections, setSections] = useState({
    labour: true,
    materials: true,
    equipment: true,
    costs: canAccessCosts,
    issues: true,
    signatures: true
  });

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Check if current configuration is in weekly mode
  const isWeekly = reportType.toLowerCase().includes('weekly') ||
    ['All Weekly Combined Report', 'Weekly Labour Report Only', 'Weekly Activity Report Only'].includes(reportType);

  const activeWeeklyScope = isWeekly
    ? (reportType === 'Weekly Labour Report Only' ? 'labour' :
      reportType === 'Weekly Activity Report Only' ? 'activity' :
        weeklyScope)
    : null;

  const currentWeeklyData = isWeekly
    ? buildWeeklyData(selectedProjectId, '2026-10-06', dailyReports, selectedProject)
    : null;

  const effectiveReportType = isWeekly
    ? (activeWeeklyScope === 'labour'
      ? 'Weekly Labour Report Only'
      : activeWeeklyScope === 'activity'
        ? 'Weekly Activity Report Only'
        : 'All Weekly Combined Report')
    : reportType;

  // Generate jsPDF instance based on current selection or override scope
  const handleBuildPDF = (scopeOverride = null) => {
    const scopeToUse = scopeOverride || activeWeeklyScope || weeklyScope;
    const isWeeklyRun = isWeekly || Boolean(scopeOverride);

    const runReportType = isWeeklyRun
      ? (scopeToUse === 'labour'
        ? 'Weekly Labour Report Only'
        : scopeToUse === 'activity'
          ? 'Weekly Activity Report Only'
          : 'All Weekly Combined Report')
      : reportType;

    const weeklyDataToUse = isWeeklyRun
      ? (currentWeeklyData || buildWeeklyData(selectedProjectId, '2026-10-06', dailyReports, selectedProject))
      : null;

    const projectDailyReport = dailyReports.find((r) => r.projectId === selectedProjectId) || dailyReports[0];
    const projectWorkers = workers.filter((w) => w.projectId === selectedProjectId);
    const projectMaterials = materials.filter((m) => m.projectId === selectedProjectId);
    const projectEquipment = equipment.filter((e) => e.projectId === selectedProjectId);
    const projectIssues = issues.filter((i) => i.projectId === selectedProjectId);
    const projectCosts = costs.filter((c) => c.projectId === selectedProjectId);

    return generateConstructionReportPDF({
      project: selectedProject,
      reportType: runReportType,
      dateRange: isWeeklyRun ? `Mon 05 Oct – Sun 11 Oct 2026` : dateRange,
      sections: {
        ...sections,
        labour: scopeToUse === 'combined' ? false : sections.labour,
        costs: scopeToUse === 'combined' ? false : (canAccessCosts ? sections.costs : false)
      },
      companySettings,
      author: currentUser.name,
      userRole: currentUser.role,
      data: {
        weeklyScope: scopeToUse,
        weeklyData: weeklyDataToUse,
        dailyReport: projectDailyReport,
        workersCount: projectWorkers.length,
        materialsCount: projectMaterials.length,
        equipmentCount: projectEquipment.length,
        issuesCount: projectIssues.filter((i) => i.status !== 'Closed').length,
        labour: projectWorkers,
        materials: projectMaterials,
        equipment: projectEquipment,
        costs: canAccessCosts ? projectCosts : [],
        issues: projectIssues
      }
    });
  };

  const handlePreviewPDF = (scopeOverride = null) => {
    const doc = handleBuildPDF(scopeOverride);
    const blobUrl = doc.output('bloburl');
    setPdfPreviewUrl(blobUrl);
    setIsPreviewOpen(true);
    addToast('PDF preview generated.');
  };

  const handleDownloadPDF = (scopeOverride = null) => {
    const doc = handleBuildPDF(scopeOverride);
    const targetType = scopeOverride
      ? (scopeOverride === 'labour' ? 'Weekly_Labour_Report_Only' : scopeOverride === 'activity' ? 'Weekly_Activity_Report_Only' : 'All_Weekly_Combined_Report')
      : effectiveReportType.replace(/\s+/g, '_');
    const filename = `${targetType}_${selectedProject?.code || 'SITE'}_Mon-Sun_Oct2026.pdf`;
    doc.save(filename);
    addToast(`Downloaded ${filename} successfully!`);
  };

  const handlePrintPDF = (scopeOverride = null) => {
    const doc = handleBuildPDF(scopeOverride);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    addToast('Sent to site printer.');
  };

  const allReportTypes = [
    { title: 'Weekly Project Report', desc: 'Monday to Sunday site reporting: Combined, Labour Only, or Activity Only' },
    { title: 'All Weekly Combined Report', desc: 'Monday to Sunday complete dossier: Activities, Labour, Machinery & Deliveries' },
    { title: 'Weekly Labour Report Only', desc: 'Monday to Sunday labour breakdown only: Trades, Headcounts & Fixed Rates' },
    { title: 'Weekly Activity Report Only', desc: 'Monday to Sunday activity log only: Work Done Today & Planned Tomorrow' },
    { title: 'Daily Site Report', desc: 'Single shift diary, weather, workforce, machinery hours & progress' },
    { title: 'Monthly Project Report', desc: 'Executive overview, physical completion vs contract schedule' },
    { title: 'Labour & Workforce Report', desc: 'Tradesperson attendance roll call, trade rosters & shifts' },
    { title: 'Material Inventory Report', desc: 'Bulk stock reserves, supplier deliveries & minimum thresholds' },
    { title: 'Equipment & Plant Log Report', desc: 'Machine operating runtime, diesel usage & maintenance status' },
    { title: 'Project Cost Audit Report', desc: 'Procurement expenditures, subcontractor payouts & budget variance' },
    { title: 'Site Issues & HSE Report', desc: 'Safety non-conformance snags, structural defects & remediation' },
    { title: 'Executive Project Summary', desc: 'Comprehensive multi-page contract dossier for clients & banks' },
  ];

  const reportTypes = canAccessCosts
    ? allReportTypes
    : allReportTypes.filter((r) => r.title !== 'Project Cost Audit Report');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-amber-500" />
            <span>Official Construction PDF Reports</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Generate and print official site dossiers: Weekly Combined, Weekly Labour Only, Weekly Activities, and Daily Reports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handlePreviewPDF()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            <span>Preview Document</span>
          </button>
          <button
            onClick={() => handleDownloadPDF()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  1. Report Configuration
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                {currentUser?.role}
              </span>
            </div>

            {/* Target Project */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Target Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              >
                {(isForeman ? projects.filter(p => p.id === (currentUser?.assignedProjectId || 'PRJ-002')) : projects).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Report Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Report Document Type
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  const val = e.target.value;
                  setReportType(val);
                  if (val === 'Weekly Labour Report Only') setWeeklyScope('labour');
                  else if (val === 'Weekly Activity Report Only') setWeeklyScope('activity');
                  else if (val === 'All Weekly Combined Report' || val === 'Weekly Project Report') setWeeklyScope('combined');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              >
                {reportTypes.map((rt) => (
                  <option key={rt.title} value={rt.title}>
                    {rt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Weekly Options Selector (Available for all weekly modes) */}
            {isWeekly && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Weekly Report Selection (Mon – Sun)
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">Choose Mode</span>
                </div>

                <div className="space-y-2">
                  {/* Option 1: Print All Weekly Combined Report */}
                  <label
                    onClick={() => {
                      setWeeklyScope('combined');
                      setReportType('All Weekly Combined Report');
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${activeWeeklyScope === 'combined'
                      ? 'border-amber-500 bg-white shadow-xs ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="weeklyScopeGroup"
                      checked={activeWeeklyScope === 'combined'}
                      onChange={() => {
                        setWeeklyScope('combined');
                        setReportType('All Weekly Combined Report');
                      }}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-slate-900">
                          1. Print All Weekly Combined Report
                        </strong>
                        <span className="text-[9px] font-extrabold uppercase bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">
                          All-In-One
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Prints everything from daily activities to labour, plant machinery & deliveries from Monday to Sunday all in one PDF report.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Print Weekly Labour Report Only */}
                  <label
                    onClick={() => {
                      setWeeklyScope('labour');
                      setReportType('Weekly Labour Report Only');
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${activeWeeklyScope === 'labour'
                      ? 'border-amber-500 bg-white shadow-xs ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="weeklyScopeGroup"
                      checked={activeWeeklyScope === 'labour'}
                      onChange={() => {
                        setWeeklyScope('labour');
                        setReportType('Weekly Labour Report Only');
                      }}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-slate-900">
                          2. Print Weekly Labour Report Only
                        </strong>
                        <span className="text-[9px] font-extrabold uppercase bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded">
                          Labour Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Prints labour report only of that week all of it from Monday to Sunday (trades, headcounts, fixed rates 1500/1000/500 & daily costs).
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Print Weekly Activity Report Only */}
                  <label
                    onClick={() => {
                      setWeeklyScope('activity');
                      setReportType('Weekly Activity Report Only');
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${activeWeeklyScope === 'activity'
                      ? 'border-amber-500 bg-white shadow-xs ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="weeklyScopeGroup"
                      checked={activeWeeklyScope === 'activity'}
                      onChange={() => {
                        setWeeklyScope('activity');
                        setReportType('Weekly Activity Report Only');
                      }}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-slate-900">
                          3. Print Weekly Activity Report Only
                        </strong>
                        <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded">
                          Activity Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Prints all the activities that were done in that week only from Monday to Sunday (work done today, work plan tomorrow, progress).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Date Range Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Report Period / Shift
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="Current Week (Mon 05 Oct – Sun 11 Oct 2026)">
                  Current Week: Mon 05 Oct – Sun 11 Oct 2026 (Mon-Sun)
                </option>
                <option value="Previous Week (Mon 28 Sep – Sun 04 Oct 2026)">
                  Previous Week: Mon 28 Sep – Sun 04 Oct 2026 (Mon-Sun)
                </option>
                <option value="Today (2026-10-06)">Today (Latest Active Shift)</option>
                <option value="Month of October 2026">Month of October 2026</option>
                <option value="Project Inception to Date">Project Inception to Date</option>
              </select>
            </div>

            {/* Sections To Include Checklist (only for Combined or non-weekly) */}
            {(!isWeekly || activeWeeklyScope === 'combined') && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sections to Include in PDF
                </label>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {(activeWeeklyScope === 'combined'
                    ? [
                      { key: 'materials', label: 'Material Inventory & Stocks' },
                      { key: 'equipment', label: 'Equipment & Machinery Hours' },
                      { key: 'issues', label: 'Site Non-Conformance Issues' },
                      { key: 'signatures', label: 'Engineer & PM Signature Block' }
                    ]
                    : [
                      { key: 'labour', label: 'Workforce & Attendance Table' },
                      { key: 'materials', label: 'Material Inventory & Stocks' },
                      { key: 'equipment', label: 'Equipment & Machinery Hours' },
                      ...(canAccessCosts ? [{ key: 'costs', label: 'Financial Costs & Expenditures' }] : []),
                      { key: 'issues', label: 'Site Non-Conformance Issues' },
                      { key: 'signatures', label: 'Engineer & PM Signature Block' }
                    ]
                  ).map((sec) => (
                    <label key={sec.key} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={sections[sec.key]}
                        onChange={(e) => setSections((prev) => ({ ...prev, [sec.key]: e.target.checked }))}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{sec.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 1-Click Weekly Print Action Buttons */}
            {isWeekly && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  One-Click Weekly Print Buttons
                </span>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handlePrintPDF('combined')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print All Weekly Combined Report</span>
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">Full Dossier →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintPDF('labour')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <HardHat className="w-3.5 h-3.5 text-blue-200" />
                      <span>Print Weekly Labour Report Only</span>
                    </span>
                    <span className="text-[10px] text-blue-200 font-mono">Labour Mon-Sun →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintPDF('activity')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Print Weekly Activity Report Only</span>
                    </span>
                    <span className="text-[10px] text-emerald-200 font-mono">Activities Mon-Sun →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Standard Trigger Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleDownloadPDF()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download Printable PDF ({effectiveReportType})</span>
              </button>
              <button
                onClick={() => handlePrintPDF()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                <span>Direct Print to Plotter / Printer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Preview Sheet */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
            {/* Report Header Mockup */}
            <div className="flex items-start justify-between border-b-2 border-amber-500 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {companySettings.ncaRegistration}
                </span>
                <h2 className="text-xl font-extrabold text-slate-950 tracking-tight font-sans">
                  {companySettings.companyName.toUpperCase()}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {companySettings.address} • Tel: {companySettings.phone}
                </p>
              </div>

              <div className="text-right">
                <span className="rounded-md bg-amber-500 px-3 py-1 text-xs font-extrabold text-slate-950 uppercase tracking-wider inline-block">
                  {effectiveReportType}
                </span>
                <p className="mt-1 text-[11px] font-mono text-slate-400">
                  PERIOD: {isWeekly ? 'Mon 05 Oct – Sun 11 Oct 2026' : dateRange}
                </p>
              </div>
            </div>

            {/* Project Summary Card */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedProject?.name}
                </h3>
                <span className="font-bold text-amber-600 font-mono">
                  {selectedProject?.progress}% Completed
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Client</span>
                  <strong className="text-slate-800">{selectedProject?.client}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                  <strong className="text-slate-800">{selectedProject?.location}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Lead Engineer</span>
                  <strong className="text-slate-800">{selectedProject?.siteEngineer}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Project Manager</span>
                  <strong className="text-slate-800">{selectedProject?.projectManager}</strong>
                </div>
              </div>
            </div>

            {/* Weekly Mode Live Preview Custom Content */}
            {isWeekly && currentWeeklyData && (
              <div className="space-y-4 text-xs">
                {/* Weekly Scope Banner */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Weekly Report Dossier (7 Full Shifts: Monday – Sunday)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {effectiveReportType}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Man-Days</span>
                      <strong className="text-sm font-black text-slate-900">
                        {currentWeeklyData.totalWeeklyManDays} workers
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Est. Weekly Labour</span>
                      <strong className="text-sm font-black text-emerald-600 font-mono">
                        {formatKES(currentWeeklyData.totalWeeklyLabourCost)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Monday to Sunday Breakdown Preview */}
                {(activeWeeklyScope === 'activity' || activeWeeklyScope === 'combined') && (
                  <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                        Weekly Daily Activities Log (Monday through Sunday)
                      </span>
                      <span className="text-[10px] text-slate-400">7 Shifts Mon–Sun</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-2 w-28">Day & Date</th>
                            <th className="p-2">Work Activities Completed (Today)</th>
                            <th className="p-2 w-56">Work Plan Next Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {currentWeeklyData.days.map((day) => (
                            <tr key={day.date} className="hover:bg-slate-50/50">
                              <td className="p-2 font-bold text-slate-800">
                                {day.dayName}
                                <span className="block text-[10px] font-normal text-slate-400 font-mono">{day.dateFormatted}</span>
                              </td>
                              <td className="p-2 text-slate-800 font-sans">
                                {day.workDoneToday}
                              </td>
                              <td className="p-2 text-slate-600 italic font-sans">
                                {day.workPlanTomorrow}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Labour Report Preview (Only or Combined) — Categorised Trade-by-Trade matching Reference Image */}
                {(activeWeeklyScope === 'labour' || activeWeeklyScope === 'combined') && (() => {
                  const tradeMeta = {
                    'Formwork Carpenters': {
                      subtitle: 'Timber & Steel Panel Shuttering, Formwork Assembly & Stripping',
                      dotColor: 'bg-amber-500',
                      rateStd: '1,500 / 1,000 / 500',
                      modelDesc: 'Weighted Daily Rates',
                      subtotalLabel: 'FORMWORK SUBTOTAL',
                      subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
                    },
                    'Steel Fixers & Benders': {
                      subtitle: 'Rebar Fabrication, Bending, Tying & Column Reinforcement',
                      dotColor: 'bg-blue-600',
                      rateStd: '1,500 / 1,000 / 500',
                      modelDesc: 'Fixed Weekly Rate Model',
                      subtotalLabel: 'STEEL FIXERS SUBTOTAL',
                      subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
                    },
                    'Steel Fixers (Special Shift)': {
                      subtitle: 'Saturday Intensive Structural Slab Pre-Pour Reinforcement',
                      dotColor: 'bg-teal-600',
                      rateStd: '2,500 / 800 / 700',
                      modelDesc: 'Weekend Accelerated Rate',
                      subtotalLabel: 'WEEKEND SHIFT SUBTOTAL',
                      subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
                    },
                    'General Site Workforce': {
                      subtitle: 'Excavation, Site Logistics, Material Handling & Concreting Ops',
                      dotColor: 'bg-emerald-600',
                      rateStd: '2,500 / 1,500 / 800',
                      modelDesc: 'Internal Package Allocation',
                      subtotalLabel: 'GENERAL WORKFORCE SUBTOTAL',
                      subtotalBadge: (cost) => cost === 0 ? 'Subtotal: KES 0 (Subcontract/Prepaid)' : `Subtotal: ${formatKES(cost)}`
                    }
                  };

                  // Group labour categories by trade across all 7 days
                  const tradeGroupMap = {};
                  currentWeeklyData.days.forEach((day) => {
                    (day.labourCategories || []).forEach((cat) => {
                      const tName = cat.tradeName || 'General Trade';
                      if (!tradeGroupMap[tName]) {
                        tradeGroupMap[tName] = {
                          tradeName: tName,
                          days: [],
                          totalForemen: 0,
                          totalSkilled: 0,
                          totalHelpers: 0,
                          totalHeadcount: 0,
                          totalCost: 0,
                          foremanRate: Number(cat.foremanRate) || 1500,
                          skilledRate: Number(cat.skilledRate) || 1000,
                          helperRate: Number(cat.helperRate) || 500
                        };
                      }
                      const fCount = Number(cat.foremanCount) || 0;
                      const sCount = Number(cat.skilledCount) || 0;
                      const hCount = Number(cat.unskilledCount) || 0;
                      const headcount = cat.headcount || (fCount + sCount + hCount);
                      const fRate = Number(cat.foremanRate) || tradeGroupMap[tName].foremanRate;
                      const sRate = Number(cat.skilledRate) || tradeGroupMap[tName].skilledRate;
                      const hRate = Number(cat.helperRate) || tradeGroupMap[tName].helperRate;
                      const cost = cat.cost ?? (fCount * fRate + sCount * sRate + hCount * hRate);

                      tradeGroupMap[tName].days.push({
                        dayName: day.dayName,
                        dateFormatted: day.dateFormatted,
                        foremanCount: fCount,
                        skilledCount: sCount,
                        helperCount: hCount,
                        headcount,
                        cost,
                        ratesText: `${fRate.toLocaleString()} / ${sRate.toLocaleString()} / ${hRate.toLocaleString()}`
                      });
                      tradeGroupMap[tName].totalForemen += fCount;
                      tradeGroupMap[tName].totalSkilled += sCount;
                      tradeGroupMap[tName].totalHelpers += hCount;
                      tradeGroupMap[tName].totalHeadcount += headcount;
                      tradeGroupMap[tName].totalCost += cost;
                    });
                  });

                  // Desired order for visual hierarchy matching image
                  const preferredOrder = [
                    'Formwork Carpenters',
                    'Steel Fixers & Benders',
                    'Steel Fixers (Special Shift)',
                    'General Site Workforce'
                  ];

                  const allTradeNames = Object.keys(tradeGroupMap);
                  const sortedTradeNames = [
                    ...preferredOrder.filter((name) => allTradeNames.includes(name)),
                    ...allTradeNames.filter((name) => !preferredOrder.includes(name))
                  ];

                  const tradeGroups = sortedTradeNames.map((name) => tradeGroupMap[name]);

                  return (
                    <div className="space-y-4">
                      {/* Top Header Banner */}
                      <div className="rounded-xl bg-[#101c2e] px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                        <div>
                          <h3 className="text-white font-bold text-xs sm:text-sm tracking-wide uppercase">
                            1. WEEKLY LABOUR & WORKFORCE DEPLOYMENT (MONDAY – SUNDAY)
                          </h3>
                          <p className="text-[#d4a373] text-[10.5px] mt-0.5 font-medium">
                            Hierarchical grouping organized by specialised labour trade categories
                          </p>
                        </div>
                        <span className="bg-[#162740] text-amber-300 border border-slate-700/80 px-3 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase">
                          Categorized Structure
                        </span>
                      </div>

                      {/* Individual Trade Cards */}
                      {tradeGroups.map((trade) => {
                        const meta = tradeMeta[trade.tradeName] || {
                          subtitle: 'Specialised trade operations and site works',
                          dotColor: 'bg-slate-500',
                          rateStd: `${trade.foremanRate.toLocaleString()} / ${trade.skilledRate.toLocaleString()} / ${trade.helperRate.toLocaleString()}`,
                          modelDesc: 'Weighted Daily Rates',
                          subtotalLabel: `${trade.tradeName.toUpperCase()} SUBTOTAL`,
                          subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
                        };

                        // Only show active days where this trade had headcount
                        const activeDays = trade.days.filter((d) => d.headcount > 0);

                        return (
                          <div key={trade.tradeName} className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-sm">
                            {/* Trade Header */}
                            <div className="bg-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-3 h-3 rounded-sm mt-0.5 flex-shrink-0 ${meta.dotColor}`} />
                                <div>
                                  <span className="text-[#0f172a] font-bold text-xs uppercase tracking-wide">
                                    TRADE: {trade.tradeName.toUpperCase()}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">
                                    {meta.subtitle}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                <span className="border border-slate-200 bg-white px-2.5 py-1 rounded font-mono text-slate-600">
                                  Rate Std: {meta.rateStd}
                                </span>
                                <span className="border border-blue-200 bg-blue-50/70 px-2.5 py-1 rounded font-bold font-mono text-blue-700">
                                  Man-Days: {trade.totalHeadcount}
                                </span>
                                <span className="border border-amber-200 bg-amber-50/80 px-2.5 py-1 rounded font-bold font-mono text-amber-900">
                                  {meta.subtotalBadge(trade.totalCost)}
                                </span>
                              </div>
                            </div>

                            {/* Trade Day-by-Day Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-4 py-2.5 w-32">DAY & DATE</th>
                                    <th className="px-2 py-2.5 text-center w-16">FOREMAN</th>
                                    <th className="px-2 py-2.5 text-center w-16">SKILLED</th>
                                    <th className="px-2 py-2.5 text-center w-16">HELPERS</th>
                                    <th className="px-2 py-2.5 text-center w-24 font-black text-slate-900">TOTAL WORKERS</th>
                                    <th className="px-2 py-2.5 text-center w-36">RATES (F / S / H)</th>
                                    <th className="px-4 py-2.5 text-right w-32">DAILY COST</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                  {activeDays.map((d, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-2 font-semibold text-slate-800">
                                        {d.dayName.substring(0, 3)} {d.dateFormatted.substring(0, 6)}
                                      </td>
                                      <td className="px-2 py-2 text-center font-mono text-slate-600">{d.foremanCount}</td>
                                      <td className="px-2 py-2 text-center font-mono text-slate-600">{d.skilledCount}</td>
                                      <td className="px-2 py-2 text-center font-mono text-slate-600">{d.helperCount}</td>
                                      <td className="px-2 py-2 text-center font-mono font-black text-slate-900">{d.headcount}</td>
                                      <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-500">{d.ratesText}</td>
                                      <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                                        {formatKES(d.cost)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-slate-200/90 bg-white font-bold text-[11px]">
                                    <td className="px-4 py-2.5 uppercase font-bold text-slate-900 tracking-wider">
                                      {meta.subtotalLabel}
                                    </td>
                                    <td className="px-2 py-2.5 text-center font-mono text-slate-900">{trade.totalForemen}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-slate-900">{trade.totalSkilled}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-slate-900">{trade.totalHelpers}</td>
                                    <td className="px-2 py-2.5 text-center font-mono font-black text-slate-900">{trade.totalHeadcount}</td>
                                    <td className="px-2 py-2.5 text-center text-[10px] text-slate-400 font-normal italic">
                                      {meta.modelDesc}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">
                                      {formatKES(trade.totalCost)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })}

                      {/* Consolidated Weekly Metrics Banner */}
                      <div className="rounded-xl bg-[#101c2e] px-6 py-4 my-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                            Consolidated Weekly Metrics
                          </span>
                          <span className="text-white font-black text-base sm:text-lg uppercase tracking-wide block mt-0.5">
                            ALL TRADES DEPLOYMENT & EXPENDITURE
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Sum of all site trades across {currentWeeklyData.weekRangeText}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Total Workers Box */}
                          <div className="bg-[#17273e] border border-slate-700/60 rounded-xl px-5 py-2.5 text-center min-w-[130px]">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Total Workers
                            </span>
                            <span className="text-amber-400 font-black text-2xl font-mono leading-none mt-1 block">
                              {currentWeeklyData.totalWeeklyManDays}
                            </span>
                          </div>

                          {/* Week Labour Cost Box */}
                          <div className="bg-[#f59e0b] rounded-xl px-6 py-2.5 text-center min-w-[170px] shadow-sm">
                            <span className="text-[#0f172a] text-[9px] font-black uppercase tracking-wider block">
                              Week Labour Cost
                            </span>
                            <span className="text-white font-black text-xl sm:text-2xl font-mono leading-none mt-1 block">
                              {formatKES(currentWeeklyData.totalWeeklyLabourCost)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Man-Days Matrix */}
                      <div className="space-y-2 mt-5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="font-bold text-slate-900 uppercase text-xs sm:text-sm tracking-wide">
                            2. WEEKLY TRADE ROSTER & MAN-DAYS MATRIX
                          </h4>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                            Audit Cross-Reference
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#c26508] text-[10px] font-black uppercase tracking-wider text-white">
                              <tr>
                                <th className="px-4 py-2.5">Trade / Category</th>
                                <th className="px-2 py-2.5 text-center">Mon</th>
                                <th className="px-2 py-2.5 text-center">Tue</th>
                                <th className="px-2 py-2.5 text-center">Wed</th>
                                <th className="px-2 py-2.5 text-center">Thu</th>
                                <th className="px-2 py-2.5 text-center">Fri</th>
                                <th className="px-2 py-2.5 text-center">Sat</th>
                                <th className="px-2 py-2.5 text-center">Sun</th>
                                <th className="px-3 py-2.5 text-center font-black">Man-Days</th>
                                <th className="px-4 py-2.5 text-right font-black">Total Cost (KES)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px]">
                              {currentWeeklyData.tradeMatrix.map((tm) => (
                                <tr key={tm.tradeName} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-2 font-bold text-slate-800">{tm.tradeName}</td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.mon > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.mon}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.tue > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.tue}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.wed > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.wed}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.thu > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.thu}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.fri > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.fri}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.sat > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.sat}
                                  </td>
                                  <td className={`px-2 py-2 text-center font-mono ${tm.sun > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                    {tm.sun}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono font-black text-slate-900">{tm.totalManDays}</td>
                                  <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatKES(tm.totalCost)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#101c2e] font-bold text-amber-400">
                                <td className="px-4 py-3 uppercase text-[10px] font-black tracking-wider">Daily Total Workers</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[0]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[1]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[2]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[3]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[4]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[5]?.workersPresent || 0}</td>
                                <td className="px-2 py-3 text-center font-mono font-bold text-xs">{currentWeeklyData.days[6]?.workersPresent || 0}</td>
                                <td className="px-3 py-3 text-center font-mono font-black text-xs">{currentWeeklyData.totalWeeklyManDays}</td>
                                <td className="px-4 py-3 text-right font-mono font-black text-xs">{formatKES(currentWeeklyData.totalWeeklyLabourCost)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Standard Non-Weekly Document Content Previews */}
            {!isWeekly && (
              <div className="space-y-4 text-xs">
                <div className="border rounded-xl border-slate-200 p-3 bg-white">
                  <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Included Document Sections
                  </h4>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(sections).map(([key, isInc]) => (
                      <div key={key} className={`flex items-center gap-1.5 p-2 rounded-lg text-xs ${isInc ? 'bg-amber-50 text-amber-900 font-semibold' : 'bg-slate-50 text-slate-400 line-through'}`}>
                        <CheckCircle2 className={`h-3.5 w-3.5 ${isInc ? 'text-amber-600' : 'text-slate-300'}`} />
                        <span className="capitalize">{key} Section</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sign-off Block Preview */}
            <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Official Sign-Off Certification Preview
              </span>
              <div className="grid grid-cols-2 gap-6 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Prepared by (Site Agent / Foreman):</span>
                  <strong className="text-slate-800">{currentUser.name} ({currentUser.role})</strong>
                  <div className="mt-4 border-b border-slate-300 w-36" />
                  <span className="text-[10px] text-slate-400">Signature & Date</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Approved by (Project Manager):</span>
                  <strong className="text-slate-800">{selectedProject?.projectManager}</strong>
                  <div className="mt-4 border-b border-slate-300 w-36" />
                  <span className="text-[10px] text-slate-400">Signature & Date</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              Complies with Republic of Kenya National Construction Authority (NCA) Site Logbook Standard
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Live PDF Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="PDF Document Preview"
        subtitle="Live rendered vector PDF ready for client & consulting engineer distribution"
        maxWidth="max-w-5xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">A4 Printable Format • 300 DPI</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintPDF()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => {
                  handleDownloadPDF();
                  setIsPreviewOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF File</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="w-full h-[70vh] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full border-none"
              title="PDF Report Preview"
            />
          ) : (
            <div className="text-slate-400 text-xs">Generating PDF preview...</div>
          )}
        </div>
      </Modal>
    </div>
  );
};
