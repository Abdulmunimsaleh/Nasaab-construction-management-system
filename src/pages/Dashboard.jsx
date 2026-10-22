import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { ProjectFinancialOverview } from '../components/dashboard/ProjectFinancialOverview';
import { formatKES, formatRelativeTime } from '../utils/formatters';
import {
  FolderKanban,
  HardHat,
  Boxes,
  Coins,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Building2,
  FileText,
  MapPin,
  ArrowRightLeft,
  Check
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    selectedProjectId,
    switchProject,
    currentProject,
    projects,
    laeForms,
    materialRequests,
    costs,
    activities,
    canAccessCosts,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    isDataLoading
  } = useApp();

  const totalCostSpent = costs.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const pendingRequestsCount = materialRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 text-white border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              {selectedProjectId === 'all' ? 'Enterprise Multi-Site Dashboard' : 'Dedicated Project Workspace'}
            </span>
            <span className="text-xs text-slate-400">• Mombasa, Kenya</span>
          </div>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {selectedProjectId === 'all'
              ? 'NASAAB Construction — Sites Overview'
              : (currentProject?.name || 'NASAAB Construction Workspace')}
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-2xl">
            {selectedProjectId !== 'all' && currentProject
              ? `${currentProject.location} • Code: ${currentProject.code}`
              : 'Real-time database-backed site intelligence across Majestic Palms, MMA, and SeaCrest construction developments.'}
          </p>
        </div>


      </div>

      {/* Swift Site Switcher (Admin, Director & Partner) */}
      {(isAdmin || isDirector || isPartner) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Swift Site Switcher</span>
                  <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200/60">
                    Instant Switching
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Switch active site context instantly without signing out and logging back in
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">Current Workspace:</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {selectedProjectId === 'all' ? 'All Projects Combined' : (currentProject?.name || selectedProjectId)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => switchProject('all')}
              disabled={isDataLoading}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${selectedProjectId === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                }`}
            >
              <Building2 className="h-4 w-4" />
              <span>All Sites Combined</span>
              {selectedProjectId === 'all' && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
            </button>

            {projects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => switchProject(p.id)}
                  disabled={isDataLoading}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                >
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-amber-600 text-slate-950' : 'bg-slate-200 text-slate-600'
                    }`}>
                    {p.code}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={projects.length}
          subtitle="Enrolled construction sites"
          icon={FolderKanban}
          badge="Live"
          onClick={() => navigate('/projects')}
        />

        {!isStoreKeeper ? (
          <StatCard
            title="Labour & Equipment Forms"
            value={laeForms.length}
            subtitle="Verified daily site forms"
            icon={HardHat}
            onClick={() => navigate('/labour')}
          />
        ) : (
          <StatCard
            title="Pending Requests"
            value={pendingRequestsCount}
            subtitle="Awaiting management clearance"
            icon={Clock}
            onClick={() => navigate('/materials')}
          />
        )}

        {!isForeman ? (
          <StatCard
            title="Material Requisitions"
            value={materialRequests.length}
            subtitle={`${pendingRequestsCount} pending approval`}
            icon={Boxes}
            onClick={() => navigate('/materials')}
          />
        ) : (
          <StatCard
            title="Active Workforce Scope"
            value={currentProject?.code || 'Assigned'}
            subtitle={currentProject?.name || 'Assigned site'}
            icon={Building2}
            onClick={() => navigate('/labour')}
          />
        )}

        {canAccessCosts ? (
          <StatCard
            title="Total Costs Recorded"
            value={formatKES(totalCostSpent)}
            subtitle={`${costs.length} recorded expense entries`}
            icon={Coins}
            variant="brand"
          />
        ) : (
          <StatCard
            title="Assigned Workspace"
            value={currentProject?.code || 'Scoped'}
            subtitle={currentProject?.name}
            icon={TrendingUp}
          />
        )}
      </div>

      {/* Project Financial Overview: Developer Funds & Labour Expenses (Restricted: hidden for Foremen and Storekeepers) */}
      {!isForeman && !isStoreKeeper && <ProjectFinancialOverview />}

      {/* Active Construction Sites Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Active Project Developments
            </h3>
            <p className="text-[11px] text-slate-500">
              Real construction sites managed in MySQL — Click to switch site workspace swiftly
            </p>
          </div>
          {(isAdmin || isDirector) && (
            <div className="flex items-center gap-3">
              {selectedProjectId !== 'all' && (
                <button
                  onClick={() => switchProject('all')}
                  className="text-xs font-semibold text-slate-600 hover:text-amber-600 flex items-center gap-1 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Show All Sites</span>
                </button>
              )}
              <button
                onClick={() => navigate('/projects')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Projects</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pLaeCount = laeForms.filter((f) => f.project_id === p.id).length;
            const pMatCount = materialRequests.filter((r) => r.project_id === p.id).length;
            const isSelected = selectedProjectId === p.id;

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${isSelected
                  ? 'border-amber-400 bg-amber-50/40 shadow-sm ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold text-xs">
                        {p.code ? p.code.substring(0, 3) : 'PRJ'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs truncate">{p.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{p.code}</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[9px] font-bold border border-amber-300">
                        <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        ACTIVE SITE
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                        {p.status || 'Active'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{p.location}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{pLaeCount} LAE Forms</span>
                    <span>{pMatCount} Requisitions</span>
                  </div>
                </div>

                {/* Swift Switch & View Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => switchProject(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-xs transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      <span>Switch to Site</span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Current Workspace</span>
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                    title="View Site Details"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Site Activity Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span>Live System Audit & Operation Feed</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500">Real-time log of database and field actions</p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">MySQL Audit Stream</span>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No activity recorded in this session yet.</p>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 leading-snug">
                    {act.text}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                    {formatRelativeTime(act.time)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
