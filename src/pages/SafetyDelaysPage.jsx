import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CloudRain,
  Users,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Calendar,
  X,
  FileWarning,
  Eye
} from 'lucide-react';

export const SafetyDelaysPage = () => {
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

  const [activeTab, setActiveTab] = useState('delays'); // 'delays' | 'safety' | 'visitors'
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New item modal form state
  const [newItem, setNewItem] = useState({
    category: 'delay', // 'delay' | 'safety' | 'visitor'
    title: '',
    severity: 'Medium',
    cause: 'Weather / Heavy Rain',
    durationHours: 2.5,
    description: '',
    actionTaken: '',
    visitorName: '',
    visitorOrg: '',
    purpose: ''
  });

  const storageKey = `nasaab_safety_delays_${selectedProjectId || 'default'}`;
  const [customRecords, setCustomRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'del-1',
        category: 'delay',
        title: 'Heavy coastal rain shower delayed morning slab curing and concreting',
        cause: 'Weather / Heavy Rain',
        severity: 'Medium',
        durationHours: 3.0,
        description: 'Morning downpour flooded access trench and caused concrete truck delay.',
        actionTaken: 'Deployed 2 submersible dewatering pumps. Concreting rescheduled to 11:30 AM.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'del-2',
        category: 'safety',
        title: 'Weekly Tool-Box Safety Talk on Scaffold Safety & Full PPE Compliance',
        severity: 'Low',
        description: 'Conducted mandatory 20-minute safety induction on safety harnesses and fall prevention.',
        actionTaken: 'All 34 site workers signed attendance and were issued replacement high-vis vests.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'del-3',
        category: 'visitor',
        title: 'Lead Structural Engineer Inspection of Beam Reinforcement',
        visitorName: 'Eng. David M. Mwangi, PE',
        visitorOrg: 'Mwangi Consulting Engineers',
        purpose: 'Inspection and sign-off of first floor transfer beam reinforcement prior to casting.',
        actionTaken: 'Passed inspection. Approved casting proceed conditional on extra stirrups at Grid B.',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) {
      addToast && addToast('Please enter a title or description', 'error');
      return;
    }

    const item = {
      id: `sd-${Date.now()}`,
      category: newItem.category,
      title: newItem.title,
      cause: newItem.cause,
      severity: newItem.severity,
      durationHours: Number(newItem.durationHours) || 0,
      description: newItem.description,
      actionTaken: newItem.actionTaken,
      visitorName: newItem.visitorName,
      visitorOrg: newItem.visitorOrg,
      purpose: newItem.purpose,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [item, ...customRecords];
    setCustomRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast('Record added successfully!');
    setIsAddModalOpen(false);
  };

  // Compile all entries including delays_issues_incidents and site_visitors from LAE forms
  const allRecords = useMemo(() => {
    const list = [...customRecords];

    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId && form.project_id !== currentProject?.id) {
        return;
      }

      if (form.delays_issues_incidents && form.delays_issues_incidents.trim() !== '') {
        list.push({
          id: `lae-delay-${form.id}`,
          category: 'delay',
          title: `Daily Form Ref: ${form.form_number}`,
          cause: 'Operational Site Incident',
          severity: 'Medium',
          durationHours: 2.0,
          description: form.delays_issues_incidents,
          actionTaken: form.general_notes || 'Reviewed by site supervisor',
          date: form.date,
          source: `LAE Form (${form.form_number})`
        });
      }

      if (form.site_visitors && form.site_visitors.trim() !== '') {
        list.push({
          id: `lae-vis-${form.id}`,
          category: 'visitor',
          title: `Site Visitor Log: ${form.form_number}`,
          visitorName: form.site_visitors,
          visitorOrg: 'Site Inspection',
          purpose: 'Official site walkthrough & progress verification',
          actionTaken: 'Entry permitted and escorted by site foreman',
          date: form.date,
          source: `LAE Form (${form.form_number})`
        });
      }
    });

    return list;
  }, [laeForms, customRecords, selectedProjectId, currentProject]);

  // Filtered by search and active category tab
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      if (rec.category !== activeTab) return false;

      const matchesSearch =
        rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.description && rec.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rec.visitorName && rec.visitorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rec.actionTaken && rec.actionTaken.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [allRecords, activeTab, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const delays = allRecords.filter((r) => r.category === 'delay');
    const safety = allRecords.filter((r) => r.category === 'safety');
    const visitors = allRecords.filter((r) => r.category === 'visitor');
    const totalLostHours = delays.reduce((acc, d) => acc + (d.durationHours || 0), 0);

    return {
      delaysCount: delays.length,
      safetyCount: safety.length,
      visitorsCount: visitors.length,
      totalLostHours
    };
  }, [allRecords]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
              HSE & Site Operations
            </span>
            <span className="text-xs text-slate-400">• Risk Intelligence</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-amber-500" />
            <span>Safety, Delays & Site Visitors</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive register of environmental disruptions, HSE incidents, weather delays, and visitor logs for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Log Incident / Delay</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Safe Site Days</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900 font-mono">
            142 Days
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">Zero Lost-Time Incidents (LTI)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged Delays</span>
            <CloudRain className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
            {stats.delaysCount} Incidents
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{stats.totalLostHours.toFixed(1)} hrs total stoppage</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HSE Audits & Talks</span>
            <ShieldAlert className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.safetyCount} Logged
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Toolbox talks & PPE compliance</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Official Visitors</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.visitorsCount} Registered
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Engineers, architects & authorities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('delays')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'delays'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Site Delays & Issues ({stats.delaysCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'safety'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Safety & HSE ({stats.safetyCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'visitors'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Site Visitors ({stats.visitorsCount})</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Record Cards */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Entries Under This Category</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              All operations are running smoothly with no outstanding issues logged.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log New Record</span>
            </button>
          </div>
        ) : (
          filteredRecords.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.severity === 'High'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : item.severity === 'Medium'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.severity ? `${item.severity} Severity` : item.category.toUpperCase()}
                  </span>

                  {item.cause && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {item.cause}
                    </span>
                  )}

                  {item.durationHours > 0 && (
                    <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Impact: {item.durationHours} hrs
                    </span>
                  )}

                  {item.visitorOrg && (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {item.visitorOrg}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{item.date}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Resolution or action taken */}
              {item.actionTaken && (
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <strong className="text-slate-800">Remedial Action / Notes: </strong>
                  <span className="text-slate-600">{item.actionTaken}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Log New Safety / Delay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Site Record</h3>
                  <p className="text-[11px] text-slate-500">Record a safety issue, delay, or visitor</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entry Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'delay', label: 'Site Delay' },
                    { id: 'safety', label: 'Safety / HSE' },
                    { id: 'visitor', label: 'Site Visitor' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewItem({ ...newItem, category: cat.id })}
                      className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                        newItem.category === cat.id
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newItem.category === 'visitor'
                      ? 'e.g. Structural inspection by Engineer David'
                      : 'e.g. Rain stoppage during excavation'
                  }
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {newItem.category === 'delay' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delay Root Cause
                    </label>
                    <select
                      value={newItem.cause}
                      onChange={(e) => setNewItem({ ...newItem, cause: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value="Weather / Heavy Rain">Weather / Heavy Rain</option>
                      <option value="Material Delivery Delayed">Material Delivery Delayed</option>
                      <option value="Power / Utility Outage">Power / Utility Outage</option>
                      <option value="Machinery Breakdown">Machinery Breakdown</option>
                      <option value="Council / Regulatory Inspection">Council / Regulatory Inspection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lost Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newItem.durationHours}
                      onChange={(e) => setNewItem({ ...newItem, durationHours: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {newItem.category === 'visitor' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Visitor Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Eng. David Mwangi"
                      value={newItem.visitorName}
                      onChange={(e) => setNewItem({ ...newItem, visitorName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Organization / Firm
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Consultant"
                      value={newItem.visitorOrg}
                      onChange={(e) => setNewItem({ ...newItem, visitorOrg: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description & Context
                </label>
                <textarea
                  rows="2"
                  placeholder="Detail observations, areas affected, or visitor remarks..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remedial Action / Resolution
                </label>
                <input
                  type="text"
                  placeholder="What corrective action or preventive measures were enacted?"
                  value={newItem.actionTaken}
                  onChange={(e) => setNewItem({ ...newItem, actionTaken: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyDelaysPage;
