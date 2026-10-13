import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { formatKES, formatRelativeTime } from '../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  FolderKanban,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { onOpenDailyReport } = useOutletContext();
  const {
    selectedProjectId,
    currentProject,
    filteredProjects,
    filteredDailyReports,
    filteredCosts,
    activities
  } = useApp();

  // 1. KPI Aggregations based on selected scope
  const activeProjectsCount = filteredProjects.filter((p) => p.status === 'Active').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReportsCount = filteredDailyReports.filter((r) => r.date === todayStr || r.date === '2026-10-06').length;
  const totalProjectCostSpent = filteredCosts.reduce((acc, c) => acc + c.amount, 0);

  const avgProgress = filteredProjects.length > 0
    ? Math.round(filteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / filteredProjects.length)
    : 0;

  // 2. Chart Data: Project Progress
  const progressChartData = filteredProjects.map((p) => ({
    name: p.code || p.name.split(' ')[0],
    fullName: p.name,
    progress: p.progress,
    budgetSpent: Math.round((p.spent / p.budget) * 100)
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Site Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 text-white border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              {selectedProjectId === 'all' ? 'Enterprise Multi-Site Dashboard' : 'Dedicated Project Workspace'}
            </span>
            <span className="text-xs text-slate-400">• Nairobi, Mombasa, Kisumu</span>
          </div>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {currentProject ? currentProject.name : 'All Construction Projects Overview'}
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-2xl">
            {currentProject
              ? `${currentProject.location} • Client: ${currentProject.client} • Budget: ${formatKES(currentProject.budget)}`
              : 'Real-time aggregated site monitoring across all active Kenyan infrastructure and high-rise developments.'}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenDailyReport}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Daily Report</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span>Generate PDF</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={activeProjectsCount}
          subtitle={`Total ${filteredProjects.length} sites enrolled`}
          icon={FolderKanban}
          badge="Live"
          onClick={() => navigate('/projects')}
        />

        <StatCard
          title="Today's Site Reports"
          value={todayReportsCount}
          subtitle="Submitted site diaries today"
          icon={FileSpreadsheet}
          trend={{ value: '100% on schedule', isPositive: true }}
          onClick={() => navigate('/daily-reports')}
        />

        <StatCard
          title="Total Cost Spent"
          value={formatKES(totalProjectCostSpent)}
          subtitle={`${filteredCosts.length} approved expense vouchers`}
          icon={Coins}
          variant="brand"
          onClick={() => navigate('/costs')}
        />

        <StatCard
          title="Overall Progress"
          value={`${avgProgress}%`}
          subtitle="Across active project phases"
          icon={TrendingUp}
          onClick={() => navigate('/projects')}
        />
      </div>

      {/* Project Progress Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Project Progress & Schedule Completion
            </h3>
            <p className="text-[11px] text-slate-500">
              Milestone physical completion vs financial budget burn %
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            All Projects <ChevronRightIcon />
          </button>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
              <Tooltip
                formatter={(val, name) => [`${val}%`, name === 'progress' ? 'Physical Progress' : 'Budget Spent']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="progress" name="Physical Completion (%)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="budgetSpent" name="Budget Consumed (%)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Site Activity Stream */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span>Live Site Activity Feed</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500">Real-time log of field operations</p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Real-time Feed</span>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {activities.map((act) => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

const ChevronRightIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
