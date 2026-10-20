import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  ChevronRight,
  HardHat,
  X,
  FileText,
  Camera,
  Image as ImageIcon,
  Tag,
  Eye
} from 'lucide-react';
import { getDayOfWeek } from '../utils/formatters';

// Predefined categories requested for site progress
const DEFAULT_PROGRESS_CATEGORIES = [
  'Blocks & Plasta',
  'Casting',
  'Deshuttering',
  'Electrical',
  'Foreman',
  'Helpers',
  'Operator',
  'Painting',
  'Plumbing',
  'Scalfolding',
  'Steelwork',
  'Shuttering',
  'Supervisor',
  'Tiles',
  'Unskilled'
];

// Helper to convert File to base64 Data URL
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
};

export const SiteProgressPage = () => {
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Available categories (default + user-created custom categories)
  const [availableCategories, setAvailableCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('nasaab_progress_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        const combined = [...DEFAULT_PROGRESS_CATEGORIES];
        parsed.forEach((c) => {
          if (!combined.includes(c)) combined.push(c);
        });
        return combined;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PROGRESS_CATEGORIES;
  });

  // Category addition UI state
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);
  const [showOtherCategoriesPicker, setShowOtherCategoriesPicker] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  // Refs for camera capture and gallery file selection
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // New activity/progress form state
  const [newActivity, setNewActivity] = useState({
    category: '',
    additionalCategories: [],
    descriptionDetails: '',
    description: '',
    zone: 'Ground Floor',
    status: 'in_progress',
    progress: 50,
    workDoneToday: '',
    remarks: '',
    photos: []
  });

  // Local storage key for custom logged progress
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
        category: 'Shuttering',
        additionalCategories: ['Scalfolding', 'Steelwork'],
        description: 'Shuttering - Formwork reinforcement for first floor suspended slab',
        zone: 'First Floor Slab',
        status: 'in_progress',
        progress: 65,
        workDoneToday: 'Completed positioning 85% of props and marine plywood decking across Grid A-D.',
        date: new Date().toISOString().split('T')[0],
        source: 'Site Log',
        photos: []
      },
      {
        id: 'act-demo-2',
        category: 'Plumbing',
        additionalCategories: ['Helpers'],
        description: 'Plumbing - Rough-in and drainage sleeper pipe sleeves cast into ground beam',
        zone: 'Ground Floor / Substructure',
        status: 'completed',
        progress: 100,
        workDoneToday: 'All 110mm PVC waste lines pressure tested and sleeved through foundation footing.',
        date: new Date().toISOString().split('T')[0],
        source: 'Subcontract Inspection',
        photos: []
      },
      {
        id: 'act-demo-3',
        category: 'Casting',
        additionalCategories: ['Operator', 'Unskilled'],
        description: 'Casting - Reinforced concrete columns C1 to C12 with vibrator compaction',
        zone: 'Columns Level 1',
        status: 'in_progress',
        progress: 40,
        workDoneToday: 'Columns C1-C6 poured with class 25 concrete and cube test samples taken.',
        date: new Date().toISOString().split('T')[0],
        source: 'Daily Shift Log',
        photos: []
      }
    ];
  });

  // Photo handlers: take photo / choose from gallery
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            url: dataUrl
          };
        })
      );
      setNewActivity((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos]
      }));
      e.target.value = '';
    } catch (err) {
      console.error(err);
      addToast && addToast('Failed to load selected photo(s)', 'error');
    }
  };

  const handleRemovePhoto = (photoIdx) => {
    setNewActivity((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, idx) => idx !== photoIdx)
    }));
  };

  // Add custom category to list and persist
  const handleAddCustomCategory = (nameToAdd) => {
    const name = (nameToAdd || newCategoryInput).trim();
    if (!name) return;

    if (!availableCategories.includes(name)) {
      const updated = [...availableCategories, name];
      setAvailableCategories(updated);
      try {
        const customOnly = updated.filter((c) => !DEFAULT_PROGRESS_CATEGORIES.includes(c));
        localStorage.setItem('nasaab_progress_categories', JSON.stringify(customOnly));
      } catch (err) {
        console.error(err);
      }
    }

    if (!newActivity.category) {
      setNewActivity((prev) => ({ ...prev, category: name }));
    } else if (!newActivity.additionalCategories.includes(name) && newActivity.category !== name) {
      setNewActivity((prev) => ({
        ...prev,
        additionalCategories: [...(prev.additionalCategories || []), name]
      }));
    }

    setNewCategoryInput('');
    setShowNewCategoryField(false);
    addToast && addToast(`Category "${name}" added!`);
  };

  const toggleAdditionalCategory = (cat) => {
    setNewActivity((prev) => {
      const current = prev.additionalCategories || [];
      if (current.includes(cat)) {
        return { ...prev, additionalCategories: current.filter((c) => c !== cat) };
      } else {
        return { ...prev, additionalCategories: [...current, cat] };
      }
    });
  };

  const removeAdditionalCategory = (catToRemove) => {
    setNewActivity((prev) => ({
      ...prev,
      additionalCategories: (prev.additionalCategories || []).filter((c) => c !== catToRemove)
    }));
  };

  // Save custom progress entry
  const handleSaveActivity = (e) => {
    e.preventDefault();
    const primaryCat = newActivity.category?.trim();
    const details = newActivity.descriptionDetails?.trim();
    const rawDesc = newActivity.description?.trim();

    if (!primaryCat && !rawDesc) {
      addToast && addToast('Please select a category for this progress entry', 'error');
      return;
    }

    const finalDescription = details
      ? `${primaryCat || rawDesc} - ${details}`
      : (primaryCat || rawDesc);

    const created = {
      id: `act-${Date.now()}`,
      category: primaryCat || 'General',
      additionalCategories: newActivity.additionalCategories || [],
      description: finalDescription,
      zone: newActivity.zone,
      status: newActivity.status,
      progress: Number(newActivity.progress) || 0,
      workDoneToday: newActivity.workDoneToday,
      remarks: newActivity.remarks,
      photos: newActivity.photos || [],
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

    addToast && addToast('Site progress logged successfully!');
    setIsAddModalOpen(false);
    setNewActivity({
      category: '',
      additionalCategories: [],
      descriptionDetails: '',
      description: '',
      zone: 'Ground Floor',
      status: 'in_progress',
      progress: 50,
      workDoneToday: '',
      remarks: '',
      photos: []
    });
    setShowNewCategoryField(false);
    setShowOtherCategoriesPicker(false);
  };

  // Compile all activities/progress from both LAE forms and custom entries
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
            category: act.category || 'General Operations',
            description: act.activity_description || act.description || 'Site construction activity',
            zone: act.location_or_zone || act.zone || 'Main Site Zone',
            status: act.status || 'in_progress',
            progress: Number(act.progress_percentage || act.progress || 50),
            workDoneToday: act.remarks || form.delays_issues_incidents || '',
            date: form.date,
            formNumber: form.form_number,
            preparedBy: form.prepared_by_name,
            source: `LAE Form (${form.form_number || 'Daily'})`,
            photos: Array.isArray(form.site_photos) ? form.site_photos : (form.sitePhotos || [])
          });
        });
      }

      // Also check labour item work done
      if (Array.isArray(form.labourItems)) {
        form.labourItems.forEach((item, lIdx) => {
          if (item.work_done_today) {
            list.push({
              id: `lae-trade-${form.id}-${lIdx}`,
              category: item.trade || 'Trade Operations',
              description: `${item.trade}: ${item.work_done_today}`,
              zone: 'Trade Workspace',
              status: 'in_progress',
              progress: 60,
              workDoneToday: item.work_done_today,
              date: form.date,
              formNumber: form.form_number,
              preparedBy: form.prepared_by_name,
              source: `LAE Trade Log`,
              photos: []
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
        (act.category && act.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (act.zone && act.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (act.workDoneToday && act.workDoneToday.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        act.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesZone =
        selectedZone === 'all' || act.zone === selectedZone;

      const matchesCategory =
        selectedCategory === 'all' ||
        act.category === selectedCategory ||
        (Array.isArray(act.additionalCategories) && act.additionalCategories.includes(selectedCategory));

      return matchesSearch && matchesStatus && matchesZone && matchesCategory;
    });
  }, [allActivities, searchTerm, statusFilter, selectedZone, selectedCategory]);

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
            <TrendingUp className="h-7 w-7 text-amber-500" />
            <span>Site Progress & Task Tracking</span>
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
          <span>+ Log Site Progress</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Progress Items</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
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
            placeholder="Search progress by description, zone, keywords..."
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
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${statusFilter === s
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {s === 'in_progress' ? 'In Progress' : s}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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

      {/* Progress Feed / Cards */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Site Progress Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              There are no progress items matching your current filters. Click below to log new site progress.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Site Progress</span>
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
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${act.status === 'completed'
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

                    {act.category && (
                      <span className="rounded-md bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                        {act.category}
                      </span>
                    )}

                    {Array.isArray(act.additionalCategories) && act.additionalCategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {act.additionalCategories.map((c, i) => (
                          <span key={i} className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[10px] font-semibold">
                            +{c}
                          </span>
                        ))}
                      </div>
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

                  {/* Photos attached to progress */}
                  {Array.isArray(act.photos) && act.photos.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-amber-500" />
                        <span>Attached Photos ({act.photos.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {act.photos.map((photo, pIdx) => (
                          <button
                            key={photo.id || pIdx}
                            type="button"
                            onClick={() => setViewingPhoto(photo)}
                            className="relative h-14 w-14 rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
                            title="Click to view full photo"
                          >
                            <img
                              src={photo.url}
                              alt={photo.name || 'Site photo'}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        ))}
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
                      className={`h-full rounded-full transition-all duration-300 ${act.progress === 100
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

      {/* Modal: Log New Site Progress */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Site Progress</h3>
                  <p className="text-[11px] text-slate-500">Record a new progress entry for {currentProject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Category Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Progress Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryField(!showNewCategoryField)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>New Category</span>
                  </button>
                </div>

                <select
                  required
                  value={newActivity.category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowNewCategoryField(true);
                    } else {
                      setNewActivity({ ...newActivity, category: e.target.value });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">-- Select a Category --</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add Custom Category...</option>
                </select>
              </div>

              {/* Inline Add New Category Box */}
              {showNewCategoryField && (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                  <label className="block text-[11px] font-bold text-amber-900">
                    Create New Category
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Carpentry, Glazing, Waterproofing..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCategory();
                        }
                      }}
                      className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomCategory()}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryField(false);
                        setNewCategoryInput('');
                      }}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Description / Sub-task Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Progress Title / Specific Details <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assembling formwork props for 1st floor slab"
                  value={newActivity.descriptionDetails}
                  onChange={(e) => setNewActivity({ ...newActivity, descriptionDetails: e.target.value })}
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
                  className="w-full accent-amber-500 cursor-pointer"
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

              {/* Photo Capture & Gallery Feature */}
              <div className="space-y-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-amber-500" />
                    <span>Progress Photos & Evidence</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {newActivity.photos?.length || 0} photo{(newActivity.photos?.length || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white cursor-pointer shadow-xs transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>Choose from Gallery</span>
                  </button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Photos Grid */}
                {newActivity.photos && newActivity.photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                    {newActivity.photos.map((photo, pIdx) => (
                      <div
                        key={photo.id || pIdx}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs"
                      >
                        <img src={photo.url} alt={photo.name || 'Site Photo'} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-1">
                          <p className="truncate text-[9px] font-medium text-white">{photo.name || `Photo ${pIdx + 1}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Down at the bottom: Plus button to select and add other categories */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                    <span>Additional Categories / Associated Trades</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>

                {/* Selected Additional Categories badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {newActivity.additionalCategories && newActivity.additionalCategories.length > 0 && (
                    newActivity.additionalCategories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalCategory(cat)}
                          className="rounded-full p-0.5 hover:bg-amber-200 text-amber-700 cursor-pointer"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}

                  {/* The Plus Button */}
                  <button
                    type="button"
                    onClick={() => setShowOtherCategoriesPicker(!showOtherCategoriesPicker)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-amber-400 bg-amber-50/70 hover:bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Select / Add Other Categories</span>
                  </button>
                </div>

                {/* Dropdown / Picker panel when Plus button is clicked */}
                {showOtherCategoriesPicker && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md space-y-3 mt-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Select categories to associate:</span>
                      <button
                        type="button"
                        onClick={() => setShowOtherCategoriesPicker(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {availableCategories
                        .filter((c) => c !== newActivity.category)
                        .map((cat) => {
                          const isSelected = newActivity.additionalCategories?.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleAdditionalCategory(cat)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3 w-3" />}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                    </div>

                    {/* Option to type and add a brand new category */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Or type a new category..."
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomCategory();
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomCategory()}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer transition-colors"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / View Photo Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden p-3 shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-5 right-5 z-10 rounded-full bg-slate-800/90 hover:bg-rose-600 p-2 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.name || 'Site Progress Photo'}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain mx-auto"
            />
            <div className="mt-3 flex items-center justify-between px-2 text-slate-300 text-xs">
              <span className="font-semibold truncate max-w-xs">{viewingPhoto.name || 'Site Photo'}</span>
              {viewingPhoto.date && (
                <span className="text-[11px] text-slate-400 font-mono">{viewingPhoto.date}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ActivitiesPage = SiteProgressPage;
export default SiteProgressPage;
