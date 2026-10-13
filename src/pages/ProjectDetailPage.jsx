import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { StatCard } from '../components/common/StatCard';
import { formatKES, formatDate, formatDateTime, formatRelativeTime } from '../utils/formatters';
import { DailyReportDetailModal } from '../components/dailyReports/DailyReportDetailModal';
import { generateConstructionReportPDF } from '../utils/pdfGenerator';
import {
  FolderKanban,
  MapPin,
  Calendar,
  Coins,
  Users,
  FileSpreadsheet,
  Boxes,
  Truck,
  AlertTriangle,
  Camera,
  FileText,
  Clock,
  ArrowLeft,
  Plus,
  Printer,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    onOpenDailyReport,
    onOpenIssueModal,
    onOpenAttendance,
    onOpenMaterialTx,
    onOpenEquipmentLog,
    onOpenPhotoUpload,
    onOpenAddCost
  } = useOutletContext();

  const {
    projects,
    setSelectedProjectId,
    dailyReports,
    workers,
    materials,
    equipment,
    issues,
    photos,
    costs,
    companySettings,
    currentUser,
    isForeman,
    canAccessCosts
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReport, setSelectedReport] = useState(null);

  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (project) {
      setSelectedProjectId(project.id);
    }
  }, [project, setSelectedProjectId]);

  // Foreman site authorization: can only access their assigned site
  const assignedSiteId = currentUser?.assignedProjectId || 'PRJ-002';
  if (isForeman && id !== assignedSiteId) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <FolderKanban className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Site Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          As a Site Foreman, your authorization is restricted strictly to your assigned construction site workspace.
        </p>
        <button
          onClick={() => navigate(`/projects/${assignedSiteId}`)}
          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Open My Assigned Site Workspace →
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-lg font-bold text-slate-800">Project Not Found</h3>
        <p className="mt-1 text-sm text-slate-500">The project ref was not found in active records.</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  // Project Filtered Records
  const projectReports = dailyReports.filter((r) => r.projectId === project.id);
  const projectWorkers = workers.filter((w) => w.projectId === project.id);
  const projectMaterials = materials.filter((m) => m.projectId === project.id);
  const projectEquipment = equipment.filter((e) => e.projectId === project.id);
  const projectIssues = issues.filter((i) => i.projectId === project.id);
  const projectPhotos = photos.filter((p) => p.projectId === project.id);
  const projectCosts = costs.filter((c) => c.projectId === project.id);

  const remainingBudget = Math.max(0, project.budget - (project.spent || 0));
  const budgetUtilization = Math.round(((project.spent || 0) / project.budget) * 100);

  // Calculate days remaining
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(project.expectedCompletion) - new Date()) / (1000 * 60 * 60 * 24))
  );

  const handleExportPDF = () => {
    const doc = generateConstructionReportPDF({
      project,
      reportType: 'Project Summary Report',
      dateRange: `${formatDate(project.startDate)} - ${formatDate(project.expectedCompletion)}`,
      companySettings,
      author: currentUser.name,
      userRole: currentUser.role,
      data: {
        dailyReport: projectReports[0],
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
    doc.save(`Project_Summary_${project.code}.pdf`);
  };

  const allTabs = [
    { id: 'overview', label: 'Overview', icon: FolderKanban },
    { id: 'daily-reports', label: `Daily Reports (${projectReports.length})`, icon: FileSpreadsheet },
    { id: 'timeline', label: 'Site Timeline', icon: Clock }
  ];

  const tabs = allTabs;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Projects</span>
      </button>

      {/* Dedicated Project Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="h-32 w-full bg-slate-900 relative">
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-xs px-3.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-white transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-amber-600" />
              <span>Project PDF Dossier</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 -mt-10 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-slate-950 font-mono">
                {project.code}
              </span>
              <StatusBadge status={project.status} size="md" />
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-500" /> {project.location}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
              {project.name}
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-3xl">
              Client: <strong className="text-slate-700">{project.client}</strong> • Lead: <strong className="text-slate-700">{project.projectManager}</strong> • Resident Eng: <strong className="text-slate-700">{project.siteEngineer}</strong>
            </p>
          </div>

          {/* Top Progress & Budget Mini Card */}
          <div className="flex items-center gap-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 self-start md:self-auto">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Progress</span>
              <span className="text-lg font-bold text-amber-600 font-mono">{project.progress}%</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Budget</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{formatKES(project.budget)}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Days Left</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">{daysRemaining}d</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="border-t border-slate-100 px-4 overflow-x-auto scrollbar-none flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial or Operational Stat Cards */}
          {canAccessCosts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Allocated Budget"
                value={formatKES(project.budget)}
                subtitle={`Contract Value: ${formatKES(project.contractValue)}`}
                icon={Coins}
              />
              <StatCard
                title="Amount Spent"
                value={formatKES(project.spent || 0)}
                subtitle={`${budgetUtilization}% budget utilization`}
                icon={TrendingUp}
                variant={budgetUtilization > 90 ? 'warning' : 'default'}
              />
              <StatCard
                title="Remaining Budget"
                value={formatKES(remainingBudget)}
                subtitle="Available for completion"
                icon={CheckCircle2}
                variant={remainingBudget === 0 ? 'danger' : 'default'}
              />
              <StatCard
                title="Days to Handover"
                value={`${daysRemaining} Days`}
                subtitle={`Target: ${formatDate(project.expectedCompletion)}`}
                icon={Calendar}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Site Progress"
                value={`${project.progress}% Complete`}
                subtitle="Overall physical execution"
                icon={TrendingUp}
              />
              <StatCard
                title="Days to Handover"
                value={`${daysRemaining} Days`}
                subtitle={`Target: ${formatDate(project.expectedCompletion)}`}
                icon={Calendar}
              />
              <StatCard
                title="Active Site Workforce"
                value={`${projectWorkers.length} Workers`}
                subtitle="Tradespeople on project roll"
                icon={Users}
              />
              <StatCard
                title="Open Site Issues"
                value={`${projectIssues.filter((i) => i.status !== 'Closed').length} Issues`}
                subtitle="Active safety & snag logs"
                icon={AlertTriangle}
                variant={projectIssues.filter((i) => i.priority === 'Critical').length > 0 ? 'danger' : 'default'}
              />
            </div>
          )}

          {/* Progress Bar & Scope Narrative */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Physical Project Progress Schedule
              </h3>
              <span className="text-sm font-bold text-amber-600 font-mono">
                {project.progress}% Complete
              </span>
            </div>
            <ProgressBar progress={project.progress} size="lg" color="amber" />

            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scope of Work & Specification Summary
              </h4>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {project.description}
              </p>
            </div>
          </div>

          {/* Grid: Recent Daily Reports & Open Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Daily Reports */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Site Reports ({projectReports.length})
                </h3>
                <button
                  onClick={onOpenDailyReport}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  + New Report
                </button>
              </div>

              {projectReports.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No daily reports filed yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {projectReports.slice(0, 3).map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {formatDate(rep.date)}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-sm">
                          {rep.workDoneToday || rep.workCompletedYesterday}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rep.status} />
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Site Issues */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Open Site Issues ({projectIssues.filter((i) => i.status !== 'Closed').length})
                </h3>
                <button
                  onClick={onOpenIssueModal}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  + Report Issue
                </button>
              </div>

              {projectIssues.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Zero defects or safety issues open.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {projectIssues.slice(0, 3).map((iss) => (
                    <div
                      key={iss.id}
                      onClick={() => setSelectedIssue(iss)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 truncate max-w-xs">
                          {iss.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Assigned: {iss.assignedTo} • Due: {formatDate(iss.dueDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={iss.priority} />
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Site Photos strip */}
          {projectPhotos.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Site Photos ({projectPhotos.length})
                </h3>
                <button
                  onClick={() => setActiveTab('photos')}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  View All Gallery →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {projectPhotos.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPhoto(p)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <img
                      src={p.url}
                      alt={p.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                      <span className="text-[10px] text-white font-medium truncate">
                        {p.caption}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY REPORTS */}
      {activeTab === 'daily-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Daily Reports</h3>
            <button
              onClick={onOpenDailyReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Daily Report</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Weather</th>
                    <th className="px-5 py-3.5">Workers</th>
                    <th className="px-5 py-3.5">Plant Hrs</th>
                    <th className="px-5 py-3.5">Work Done Today</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{formatDate(r.date)}</td>
                      <td className="px-5 py-3.5">{r.weather}</td>
                      <td className="px-5 py-3.5">{r.workersPresent} Workers</td>
                      <td className="px-5 py-3.5 font-mono">{r.equipmentOperatingHours}h</td>
                      <td className="px-5 py-3.5 max-w-xs truncate">{r.workDoneToday || r.workCompletedYesterday}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="rounded-lg bg-slate-100 px-3 py-1 font-bold text-slate-800 hover:bg-amber-500 hover:text-slate-950"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LABOUR */}
      {activeTab === 'labour' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Site Labour Workforce</h3>
            <button
              onClick={onOpenAttendance}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Take Attendance</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectWorkers.map((w) => (
              <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{w.fullName}</h4>
                  <span className="font-mono text-[10px] text-slate-400">{w.id}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Role: <strong className="text-slate-700">{w.role}</strong> ({w.trade})
                </div>
                <div className="text-[11px] text-slate-500">
                  Daily Wage: <strong className="text-amber-600 font-mono">{formatKES(w.dailyRate)}/day</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Subcontractor: {w.company}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Material Stores</h3>
            <button
              onClick={onOpenMaterialTx}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Boxes className="h-4 w-4" />
              <span>Record Stock Movement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectMaterials.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{m.name}</h4>
                  <span className="text-[10px] rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                    {m.category}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-slate-500">Available Stock:</span>
                  <span className={`text-base font-bold font-mono ${m.currentStock <= m.minimumStock ? 'text-rose-600' : 'text-slate-900'}`}>
                    {m.currentStock} {m.unit}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Unit Rate: {formatKES(m.unitCost)}</span>
                  <span>Min Reserve: {m.minimumStock} {m.unit}</span>
                </div>
                {m.currentStock <= m.minimumStock && (
                  <div className="rounded-lg bg-rose-50 p-1.5 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Low Stock Threshold Warning!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EQUIPMENT */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Machinery & Plant Fleet</h3>
            <button
              onClick={onOpenEquipmentLog}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Truck className="h-4 w-4" />
              <span>Log Machine Hours</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectEquipment.map((eq) => (
              <div key={eq.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{eq.name}</h4>
                  <StatusBadge status={eq.status} />
                </div>
                <div className="text-[11px] text-slate-500">Operator: <strong>{eq.operator}</strong></div>
                <div className="text-[11px] text-slate-500">Daily Rate: <strong>{formatKES(eq.dailyRate)}</strong></div>
                <div className="text-[11px] text-slate-500">Total Operating Hours: <strong className="font-mono">{eq.totalHours || 0} hrs</strong></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ISSUES */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Defects & Safety Issues</h3>
            <button
              onClick={onOpenIssueModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              <span>Report Issue</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {projectIssues.map((iss) => (
              <div
                key={iss.id}
                onClick={() => setSelectedIssue(iss)}
                className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span>{iss.title}</span>
                    <PriorityBadge priority={iss.priority} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Location: {iss.location} • Assigned: {iss.assignedTo}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={iss.status} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: PHOTOS */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Photo Evidence</h3>
            <button
              onClick={onOpenPhotoUpload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Camera className="h-4 w-4" />
              <span>Upload Photo</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {projectPhotos.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPhoto(p)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 cursor-pointer"
              >
                <img
                  src={p.url}
                  alt={p.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end text-white">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">{p.category}</span>
                  <p className="text-xs font-semibold truncate">{p.caption}</p>
                  <span className="text-[10px] text-slate-300 font-mono mt-0.5">{formatDate(p.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: COSTS */}
      {activeTab === 'costs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Expenditures (KES)</h3>
            <button
              onClick={onOpenAddCost}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Coins className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Supplier / Payee</th>
                  <th className="px-5 py-3.5">Amount (KES)</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectCosts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">{formatDate(c.date)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{c.category}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{c.description}</td>
                    <td className="px-5 py-3.5">{c.supplier}</td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{formatKES(c.amount)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: SITE TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Site Operations Chronological Timeline
            </h3>
            <p className="text-xs text-slate-500">
              Hourly milestone logs for shifts and deliveries on this construction site
            </p>
          </div>

          <div className="relative border-l-2 border-amber-400 pl-6 ml-3 space-y-6">
            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 ring-4 ring-white" />
              <div className="text-[11px] font-mono font-bold text-amber-600">07:00 AM</div>
              <h4 className="text-xs font-bold text-slate-900">Site Gates Open & HSE Toolbox Talk</h4>
              <p className="text-xs text-slate-600 mt-0.5">Safety briefing on high-altitude harness inspection conducted by HSE Officer.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white" />
              <div className="text-[11px] font-mono font-bold text-blue-600">08:30 AM</div>
              <h4 className="text-xs font-bold text-slate-900">Tower Crane & Concrete Boom Pump Operation Started</h4>
              <p className="text-xs text-slate-600 mt-0.5">Pre-lift checks signed off by resident plant operator.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" />
              <div className="text-[11px] font-mono font-bold text-emerald-600">11:15 AM</div>
              <h4 className="text-xs font-bold text-slate-900">Material Delivery: 200 Bags Bamburi Portland Cement Received</h4>
              <p className="text-xs text-slate-600 mt-0.5">GRN-0921 verified and offloaded to Warehouse Bay 3.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-rose-500 ring-4 ring-white" />
              <div className="text-[11px] font-mono font-bold text-rose-600">01:45 PM</div>
              <h4 className="text-xs font-bold text-slate-900">Structural QA Inspection: Shear Wall Rebar Deviation Noted</h4>
              <p className="text-xs text-slate-600 mt-0.5">Critical defect logged by consulting structural engineer for rebar remediation.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 ring-4 ring-white" />
              <div className="text-[11px] font-mono font-bold text-amber-600">05:00 PM</div>
              <h4 className="text-xs font-bold text-slate-900">Shift Completed & Daily Site Report Submitted</h4>
              <p className="text-xs text-slate-600 mt-0.5">Roll call concluded: 46 workers present. Shift diary transmitted for approval.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DailyReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />
    </div>
  );
};
