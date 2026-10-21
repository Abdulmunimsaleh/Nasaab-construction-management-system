import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Eye,
  Camera,
  Image as ImageIcon,
  DollarSign,
  Download
} from 'lucide-react';
import { formatKES } from '../utils/formatters';
import { generateSafetyDelaysReportPDF } from '../utils/pdfGenerator';
import api from '../services/api';

export const SafetyDelaysPage = () => {
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    projects,
    companySettings,
    isForeman,
    isAdmin,
    isDirector,
    isPartner,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('delays'); // 'delays' | 'safety' | 'visitors'
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  // File input refs for photo capture and gallery
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // New item modal form state
  const [newItem, setNewItem] = useState({
    category: 'delay', // 'delay' | 'safety' | 'visitor'
    title: '',
    severity: 'Medium',
    cause: 'Weather / Heavy Rain',
    durationHours: 2.5,
    description: '',
    actionTaken: '',
    totalAmount: '',
    visitorName: '',
    visitorOrg: '',
    purpose: '',
    photos: []
  });

  const [customRecords, setCustomRecords] = useState([]);

  // Load live safety, delays & visitor records from PostgreSQL
  const loadDatabaseRecords = async () => {
    try {
      const records = await api.safetyDelays.getAll(selectedProjectId);
      setCustomRecords(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error('Failed to load safety and delays from database:', err);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem(`nasaab_safety_delays_${selectedProjectId || 'default'}`);
    } catch (e) {
      // ignore
    }
    loadDatabaseRecords();
  }, [selectedProjectId]);

  // Convert uploaded image file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Photo handlers: take photo / choose from gallery for modal
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
            url: dataUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        })
      );
      setNewItem((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos]
      }));
    } catch (err) {
      addToast && addToast('Failed to process image attachment', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (photoIndex) => {
    setNewItem((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, idx) => idx !== photoIndex)
    }));
  };

  const handleOpenAddModal = (catOverride) => {
    const defaultCat =
      catOverride ||
      (activeTab === 'safety' ? 'safety' : activeTab === 'visitors' ? 'visitor' : 'delay');
    setNewItem({
      category: defaultCat,
      title: '',
      severity: 'Medium',
      cause: 'Weather / Heavy Rain',
      durationHours: 2.5,
      description: '',
      actionTaken: '',
      totalAmount: '',
      visitorName: '',
      visitorOrg: '',
      purpose: '',
      photos: []
    });
    setIsAddModalOpen(true);
  };

  const handleSaveItem = async (e) => {
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
      totalAmount: newItem.category === 'safety' ? (Number(newItem.totalAmount) || 0) : 0,
      visitorName: newItem.visitorName,
      visitorOrg: newItem.visitorOrg,
      purpose: newItem.purpose,
      photos: newItem.photos || [],
      date: new Date().toISOString().split('T')[0]
    };

    try {
      await api.safetyDelays.create(item);
      const updated = [item, ...customRecords];
      setCustomRecords(updated);
      addToast && addToast('Record added successfully!');
      setIsAddModalOpen(false);
      setNewItem({
        category: activeTab === 'safety' ? 'safety' : activeTab === 'visitors' ? 'visitor' : 'delay',
        title: '',
        severity: 'Medium',
        cause: 'Weather / Heavy Rain',
        durationHours: 2.5,
        description: '',
        actionTaken: '',
        totalAmount: '',
        visitorName: '',
        visitorOrg: '',
        purpose: '',
        photos: []
      });
    } catch (err) {
      console.error('Failed to save safety/delay record:', err);
      addToast && addToast('Failed to save record: ' + err.message, 'error');
    }
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
    const totalMedicalCost = safety.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

    return {
      delaysCount: delays.length,
      safetyCount: safety.length,
      visitorsCount: visitors.length,
      totalLostHours,
      totalMedicalCost
    };
  }, [allRecords]);

  const handleDownloadSafetyDelaysPDF = () => {
    try {
      const activeProj = currentProject || (selectedProjectId !== 'all' ? (projects || []).find((p) => p.id === selectedProjectId) : null) || { name: 'All Sites Combined', code: 'ALL' };
      const doc = generateSafetyDelaysReportPDF({
        project: activeProj,
        records: filteredRecords,
        stats,
        companySettings
      });
      const fileCode = (activeProj.code || activeProj.name || 'Site').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Safety_Delays_Report_${fileCode}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast && addToast('Safety & Delays PDF report downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate safety PDF:', err);
      addToast && addToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

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

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleDownloadSafetyDelaysPDF}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Download formatted Safety, Delays & Visitors PDF report"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Log Incident / Delay</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safety Audits & Talks</span>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medical / Injury Costs</span>
            <DollarSign className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
            {formatKES(stats.totalMedicalCost)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Hospital & worker medical coverage</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('delays')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'delays'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Clock className="h-4 w-4" />
            <span>Site Delays & Issues ({stats.delaysCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'safety'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Safety & HSE ({stats.safetyCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'visitors'
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
              onClick={() => handleOpenAddModal()}
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
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.severity === 'High'
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

                  {Number(item.totalAmount) > 0 && (
                    <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Total Amount: {formatKES(item.totalAmount)}</span>
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

              {/* Attached Photos */}
              {item.photos && item.photos.length > 0 && (
                <div className="pt-1 border-t border-slate-100/80">
                  <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-amber-500" />
                    <span>Attached Photos & Evidence ({item.photos.length})</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {item.photos.map((photo, pIdx) => (
                      <button
                        key={photo.id || pIdx}
                        type="button"
                        onClick={() => setViewingPhoto(photo)}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 transition-all text-left cursor-pointer"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name || 'Site Photo'}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Log New Safety / Delay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
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

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 overflow-y-auto">
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
                      className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${newItem.category === cat.id
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
                      : newItem.category === 'safety'
                        ? 'e.g. Weekly Scaffold & PPE Safety Briefing'
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

              {newItem.category === 'safety' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Severity Level
                      </label>
                      <select
                        value={newItem.severity}
                        onChange={(e) => setNewItem({ ...newItem, severity: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      >
                        <option value="Low">Low (Toolbox / Routine)</option>
                        <option value="Medium">Medium (Near Miss / Minor)</option>
                        <option value="High">High (Immediate Hazard / Stoppage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Remedial Action / Follow-up
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Issued PPE, hospital referral"
                        value={newItem.actionTaken}
                        onChange={(e) => setNewItem({ ...newItem, actionTaken: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-rose-500" />
                        <span>Total Amount (KES)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Hospital & medical coverage for injury</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 15000 (Hospital bill, medication, worker medical cover)"
                      value={newItem.totalAmount}
                      onChange={(e) => setNewItem({ ...newItem, totalAmount: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
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
                  {newItem.category === 'visitor'
                    ? 'Purpose of Visit & Observations'
                    : 'Detailed Description, Context and Resolution'}
                </label>
                <textarea
                  rows="2"
                  placeholder={
                    newItem.category === 'visitor'
                      ? 'Purpose of inspection, areas visited, and remarks...'
                      : 'Detail observations, areas affected, or incident remarks...'
                  }
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Photo Capture & Gallery Feature at bottom of form (Site Delay, Safety/HSE, and Site Visitor) */}
              <div className="space-y-2.5 rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-amber-500" />
                    <span>
                      {newItem.category === 'delay'
                        ? 'Site Delay Photos & Evidence'
                        : newItem.category === 'safety'
                          ? 'Safety & HSE Photos'
                          : 'Site Visitor Photos & Badges'}
                    </span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {newItem.photos?.length || 0} photo{(newItem.photos?.length || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  {newItem.category === 'delay'
                    ? 'Capture or upload photos of site delay conditions, rainfall, machinery, or blockages.'
                    : newItem.category === 'safety'
                      ? 'Capture or upload photos of safety inspections, toolbox talks, hazard areas, or PPE compliance.'
                      : 'Capture or upload photos of visitor log sheets, visitor badges, or inspected work areas.'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 cursor-pointer shadow-xs transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>Choose from Gallery</span>
                  </button>
                </div>

                {/* Thumbnails preview in modal */}
                {newItem.photos && newItem.photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1.5">
                    {newItem.photos.map((photo, pIdx) => (
                      <div
                        key={photo.id || pIdx}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name || 'Site Photo'}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-1">
                          <p className="truncate text-[9px] font-medium text-white">
                            {photo.name || `Photo ${pIdx + 1}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hidden file inputs for photo capture and gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />

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
              alt={viewingPhoto.name || 'Site Record Photo'}
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

export default SafetyDelaysPage;
