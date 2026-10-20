import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  ChevronRight,
  TrendingUp,
  HardHat,
  X,
  FileText
} from 'lucide-react';
import { getDayOfWeek } from '../utils/formatters';

export const ActivitiesPage = () => {
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    isForeman,
    isAdmin,
    isDirector,
    isPartner,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New activity form state
  const [newActivity, setNewActivity] = useState({
    description: '',
    zone: 'Ground Floor',
    status: 'in_progress',
    progress: 50,
    workDoneToday: '',
    workPlanTomorrow: '',
    remarks: ''
  });

  // Local storage key for custom logged activities
  const storageKey = `nasaab_activities_${selectedProjectId || 'default'}`;
  const [customActivities, setCustomActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'act-demo-1',
        description: 'Shuttering and formwork reinforcement for first floor suspended slab',
        zone: 'First Floor Slab',
        status: 'in_progress',
        progress: 65,
        workDoneToday: 'Completed positioning 85% of props and marine plywood decking across Grid A-D.',
        workPlanTomorrow: 'Begin laying bottom mat steel reinforcement and electrical conduits.',
        date: new Date().toISOString().split('T')[0],
        source: 'Site Log'
      },
      {
        id: 'act-demo-2',
        description: 'Plumbing rough-in and drainage sleeper pipe sleeves cast into ground beam',
        zone: 'Ground Floor / Substructure',
        status: 'completed',
        progress: 100,
        workDoneToday: 'All 110mm PVC waste lines pressure tested and sleeved through foundation footing.',
        workPlanTomorrow: 'Handover zone to masonry walling crew.',
        date: new Date().toISOString().split('T')[0],
        source: 'Subcontract Inspection'
      },
      {
        id: 'act-demo-3',
        description: 'Casting reinforced concrete columns C1 to C12 with vibrator compaction',
        zone: 'Columns Level 1',
        status: 'in_progress',
        progress: 40,
        workDoneToday: 'Columns C1-C6 poured with class 25 concrete and cube test samples taken.',
        workPlanTomorrow: 'Strip shutters for C1-C6 and assemble casing for C7-C12.',
        date: new Date().toISOString().split('T')[0],
        source: 'Daily Shift Log'
      }
    ];
  });

  // Save custom activities
  const handleSaveActivity = (e) => {
    e.preventDefault();
    if (!newActivity.description.trim()) {
      addToast && addToast('Please enter an activity description', 'error');
      return;
    }

    const created = {
      id: `act-${Date.now()}`,
      description: newActivity.description,
      zone: newActivity.zone,
      status: newActivity.status,
      progress: Number(newActivity.progress) || 0,
      workDoneToday: newActivity.workDoneToday,
      workPlanTomorrow: newActivity.workPlanTomorrow,
      remarks: newActivity.remarks,
      date: new Date().toISOString().split('T')[0],
      source: 'Direct Entry'
    };

    const updated = [created, ...customActivities];
    setCustomActivities(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast('Activity logged successfully!');
    setIsAddModalOpen(false);
    setNewActivity({
      description: '',
      zone: 'Ground Floor',
      status: 'in_progress',
      progress: 50,
      workDoneToday: '',
      workPlanTomorrow: '',
      remarks: ''
    });
  };

  // Compile all activities from both LAE forms and custom entries
  const allActivities = useMemo(() => {
    const list = [...customActivities];

    // Extract activities from LAE forms
    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId && form.project_id !== currentProject?.id) {
        return;
      }

      if (Array.isArray(form.activityItems)) {
        form.activityItems.forEach((act, idx) => {
          list.push({
            id: `lae-act-${form.id}-${idx}`,
            description: act.activity_description || act.description || 'Site construction activity',
            zone: act.location_or_zone || act.zone || 'Main Site Zone',
            status: act.status || 'in_progress',
            progress: Number(act.progress_percentage || act.progress || 50),
            workDoneToday: act.remarks || form.delays_issues_incidents || '',
            workPlanTomorrow: form.general_notes || '',
            date: form.date,
            formNumber: form.form_number,
            preparedBy: form.prepared_by_name,
            source: `LAE Form (${form.form_number || 'Daily'})`
          });
        });
      }

      // Also check labour item work done
      if (Array.isArray(form.labourItems)) {
        form.labourItems.forEach((item, lIdx) => {
          if (item.work_done_today) {
            list.push({
              id: `lae-trade-${form.id}-${lIdx}`,
              description: `${item.trade}: ${item.work_done_today}`,
              zone: 'Trade Workspace',
              status: 'in_progress',
              progress: 60,
              workDoneToday: item.work_done_today,
              workPlanTomorrow: item.work_plan_tomorrow || '',
              date: form.date,
              formNumber: form.form_number,
              preparedBy: form.prepared_by_name,
              source: `LAE Trade Log`
            });
          }
        });
      }
    });

    return list;
  }, [laeForms, customActivities, selectedProjectId, currentProject]);

  // Unique zones
  const zones = useMemo(() => {
    const set = new Set();
    allActivities.forEach((a) => {
      if (a.zone) set.add(a.zone);
    });
    return Array.from(set);
  }, [allActivities]);

  // Filtered list
  const filteredActivities = useMemo(() => {
    return allActivities.filter((act) => {
      const matchesSearch =
        act.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (act.zone && act.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (act.workDoneToday && act.workDoneToday.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        act.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesZone =
        selectedZone === 'all' || act.zone === selectedZone;

      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [allActivities, searchTerm, statusFilter, selectedZone]);

  // Statistics
  const stats = useMemo(() => {
    const total = allActivities.length;
    const inProgress = allActivities.filter((a) => a.status === 'in_progress').length;
    const completed = allActivities.filter((a) => a.status === 'completed').length;
    const delayed = allActivities.filter((a) => a.status === 'delayed').length;
    const avgProgress = total > 0
      ? Math.round(allActivities.reduce((acc, a) => acc + (a.progress || 0), 0) / total)
      : 0;
    return { total, inProgress, completed, delayed, avgProgress };
  }, [allActivities]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Site Operations
            </span>
            <span className="text-xs text-slate-400">• Live Tracking</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-amber-500" />
            <span>Site Activities & Task Progress</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time tracking of operational construction activities, executed work items, and scheduled tasks for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Log Site Activity</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Activities</span>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.total}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total logged construction items</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
            {stats.inProgress}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active tasks currently ongoing</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.completed}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Verified & finished tasks</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Progress</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.avgProgress}%
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities by description, zone, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
            {['all', 'in_progress', 'completed', 'delayed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s === 'in_progress' ? 'In Progress' : s}
              </button>
            ))}
          </div>

          {/* Zone Selector */}
          {zones.length > 0 && (
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Activities Feed / Table */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Site Activities Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              There are no activities matching your current filters. Click below to log a new construction activity.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log First Activity</span>
            </button>
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div
              key={act.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        act.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : act.status === 'delayed'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {act.status.replace('_', ' ')}
                    </span>

                    <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{act.zone}</span>
                    </span>

                    {act.date && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{act.date}</span>
                      </span>
                    )}

                    {act.source && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-500">
                        {act.source}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {act.description}
                  </h3>

                  {/* Work Done Today */}
                  {act.workDoneToday && (
                    <div className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="font-bold text-slate-800">Accomplished: </span>
                      {act.workDoneToday}
                    </div>
                  )}

                  {/* Planned Tomorrow */}
                  {act.workPlanTomorrow && (
                    <div className="text-xs text-amber-900 mt-1.5 bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/60 flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-950">Next Shift Target: </strong>
                        {act.workPlanTomorrow}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Metric */}
                <div className="sm:text-right shrink-0 min-w-32">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                    {act.progress}%
                  </div>
                  <div className="mt-1 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        act.progress === 100
                          ? 'bg-emerald-500'
                          : act.progress >= 50
                          ? 'bg-amber-500'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${act.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Log New Activity */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Site Activity</h3>
                  <p className="text-[11px] text-slate-500">Record a new task for {currentProject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Activity Title / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assembling formwork props for 1st floor slab"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Zone / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. First Floor Slab"
                    value={newActivity.zone}
                    onChange={(e) => setNewActivity({ ...newActivity, zone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newActivity.status}
                    onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Estimated Progress</label>
                  <span className="text-xs font-mono font-bold text-amber-600">{newActivity.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newActivity.progress}
                  onChange={(e) => setNewActivity({ ...newActivity, progress: e.target.value })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Accomplished Today
                </label>
                <textarea
                  rows="2"
                  placeholder="Detail exact milestones reached during today's shift..."
                  value={newActivity.workDoneToday}
                  onChange={(e) => setNewActivity({ ...newActivity, workDoneToday: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planned Work for Tomorrow
                </label>
                <input
                  type="text"
                  placeholder="What is scheduled next?"
                  value={newActivity.workPlanTomorrow}
                  onChange={(e) => setNewActivity({ ...newActivity, workPlanTomorrow: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
