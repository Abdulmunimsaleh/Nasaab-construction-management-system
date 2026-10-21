import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatKES } from '../utils/formatters';
import {
  Truck,
  Wrench,
  Fuel,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  FileText,
  DollarSign,
  X,
  Trash2,
  Building,
  RotateCcw
} from 'lucide-react';

export const EquipmentReportPage = () => {
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    projects,
    companySettings,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalProjectId, setModalProjectId] = useState('');

  // Helper to generate empty equipment entry
  const createEmptyEquipmentEntry = () => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    equipmentName: '',
    status: 'Active',
    machineNotes: ''
  });

  // Multiple equipment entries in Log Plant & Machinery modal
  const [equipmentEntries, setEquipmentEntries] = useState([createEmptyEquipmentEntry()]);

  const handleOpenAddModal = () => {
    setEquipmentEntries([createEmptyEquipmentEntry()]);
    // Pre-select project ID
    const initialPId = selectedProjectId !== 'all' ? selectedProjectId : (projects?.[0]?.id || '');
    setModalProjectId(initialPId);
    setIsAddModalOpen(true);
  };

  const handleAddEquipmentEntry = () => {
    setEquipmentEntries((prev) => [...prev, createEmptyEquipmentEntry()]);
  };

  const handleRemoveEquipmentEntry = (index) => {
    if (equipmentEntries.length === 1) {
      setEquipmentEntries([createEmptyEquipmentEntry()]);
      return;
    }
    setEquipmentEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEquipmentEntry = (index, field, value) => {
    setEquipmentEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Helper for localStorage key scoped per project
  const getProjectStorageKey = (pId) => `nasaab_equipment_${pId || 'default'}`;

  // Custom equipment state
  const [customEquipment, setCustomEquipment] = useState([]);

  // Load equipment dynamically whenever selectedProjectId or projects list changes
  const loadEquipment = useCallback(() => {
    try {
      if (selectedProjectId === 'all') {
        const combined = [];
        const seenIds = new Set();

        // 1. Gather equipment from every project's storage
        (projects || []).forEach((proj) => {
          const raw = localStorage.getItem(getProjectStorageKey(proj.id));
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((item) => {
                  if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    combined.push({
                      ...item,
                      projectId: item.projectId || proj.id,
                      projectName: item.projectName || proj.name
                    });
                  }
                });
              }
            } catch (e) {
              console.error(e);
            }
          }
        });

        // 2. Also check default key if any standalone equipment was saved
        const rawDef = localStorage.getItem(getProjectStorageKey('default'));
        if (rawDef) {
          try {
            const list = JSON.parse(rawDef);
            if (Array.isArray(list)) {
              list.forEach((item) => {
                if (!seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  combined.push({
                    ...item,
                    projectId: item.projectId || 'default',
                    projectName: item.projectName || 'General / Unassigned'
                  });
                }
              });
            }
          } catch (e) {
            console.error(e);
          }
        }

        setCustomEquipment(combined);
      } else {
        // Specific project active
        const key = getProjectStorageKey(selectedProjectId);
        const saved = localStorage.getItem(key);

        if (saved !== null) {
          try {
            const list = JSON.parse(saved);
            setCustomEquipment(Array.isArray(list) ? list : []);
          } catch (e) {
            setCustomEquipment([]);
          }
        } else {
          // If this project has no saved data in localStorage yet:
          // Check if this is the initial demo seed for the first workspace
          const hasInit = localStorage.getItem('nasaab_equipment_initialized');
          const isFirstProject = projects && projects.length > 0 && selectedProjectId === projects[0]?.id;

          if (!hasInit && isFirstProject) {
            const demoItems = [
              {
                id: 'eq-1',
                equipmentName: 'Concrete Mixer 400L (Hydraulic Hopper)',
                status: 'Active',
                machineNotes: 'Mixing concrete for column casting; operational on site.',
                date: new Date().toISOString().split('T')[0],
                projectId: selectedProjectId,
                projectName: currentProject?.name || projects[0]?.name || ''
              },
              {
                id: 'eq-2',
                equipmentName: 'CAT 320 Hydraulic Excavator',
                status: 'Active',
                machineNotes: 'Trench excavation for storm drainage and backfilling.',
                date: new Date().toISOString().split('T')[0],
                projectId: selectedProjectId,
                projectName: currentProject?.name || projects[0]?.name || ''
              },
              {
                id: 'eq-3',
                equipmentName: 'Plate Compactor 90kg (Robin Engine)',
                status: 'Maintenance / Breakdown',
                machineNotes: 'Used for hardcore leveling in corridor zone.',
                date: new Date().toISOString().split('T')[0],
                projectId: selectedProjectId,
                projectName: currentProject?.name || projects[0]?.name || ''
              },
              {
                id: 'eq-4',
                equipmentName: 'Bar Bending & Cutting Machine',
                status: 'Active',
                machineNotes: 'Bending D16 rebar on ground floor.',
                date: new Date().toISOString().split('T')[0],
                projectId: selectedProjectId,
                projectName: currentProject?.name || projects[0]?.name || ''
              }
            ];
            try {
              localStorage.setItem(key, JSON.stringify(demoItems));
              localStorage.setItem('nasaab_equipment_initialized', 'true');
            } catch (e) { }
            setCustomEquipment(demoItems);
          } else {
            // For any other site, start clean and empty
            setCustomEquipment([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load equipment ledger:', err);
      setCustomEquipment([]);
    }
  }, [selectedProjectId, projects, currentProject]);

  // Re-run whenever selectedProjectId or projects list change
  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // Remove equipment entry cleanly from its scoped storage
  const handleDeleteEquipment = (eq) => {
    if (eq.source === 'lae') {
      addToast && addToast(
        `This machine is part of official Daily Log #${eq.formNumber || ''}. To remove it, please edit that LAE log.`,
        'warning'
      );
      return;
    }

    const targetPId = eq.projectId || (selectedProjectId !== 'all' ? selectedProjectId : null);

    if (targetPId) {
      const key = getProjectStorageKey(targetPId);
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updated = list.filter((e) => e.id !== eq.id);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // If project ID is missing, scan across projects
      (projects || []).forEach((proj) => {
        const k = getProjectStorageKey(proj.id);
        try {
          const r = localStorage.getItem(k);
          if (r) {
            const l = JSON.parse(r);
            if (Array.isArray(l) && l.some((e) => e.id === eq.id)) {
              localStorage.setItem(k, JSON.stringify(l.filter((e) => e.id !== eq.id)));
            }
          }
        } catch (e) { }
      });
      const defKey = getProjectStorageKey('default');
      try {
        const rDef = localStorage.getItem(defKey);
        if (rDef) {
          const lDef = JSON.parse(rDef);
          if (Array.isArray(lDef) && lDef.some((e) => e.id === eq.id)) {
            localStorage.setItem(defKey, JSON.stringify(lDef.filter((e) => e.id !== eq.id)));
          }
        }
      } catch (e) { }
    }

    loadEquipment();
    addToast && addToast('Equipment record removed.', 'info');
  };

  // Reset or clear custom equipment for the active site
  const handleClearSiteEquipment = () => {
    if (selectedProjectId === 'all') {
      addToast && addToast('Please select a specific project site to clear its machinery list.', 'warning');
      return;
    }
    const siteName = currentProject?.name || 'this site';
    if (!window.confirm(`Are you sure you want to remove all custom equipment logged for ${siteName}? This cannot be undone.`)) {
      return;
    }
    const key = getProjectStorageKey(selectedProjectId);
    try {
      localStorage.setItem(key, JSON.stringify([]));
    } catch (err) {
      console.error(err);
    }
    loadEquipment();
    addToast && addToast(`All custom equipment cleared for ${siteName}.`, 'info');
  };

  // Save new equipment entries
  const handleSaveEquipment = (e) => {
    e.preventDefault();
    const validEntries = equipmentEntries.filter((eq) => eq.equipmentName && eq.equipmentName.trim());
    if (validEntries.length === 0) {
      addToast && addToast('Please enter at least one equipment / machinery name', 'error');
      return;
    }

    const assignedPId = (selectedProjectId !== 'all' && selectedProjectId)
      ? selectedProjectId
      : (modalProjectId || projects?.[0]?.id || 'default');

    const targetProjObj = (projects || []).find((p) => p.id === assignedPId);
    const assignedPName = targetProjObj?.name || currentProject?.name || 'Assigned Site';

    const todayStr = new Date().toISOString().split('T')[0];
    const newItems = validEntries.map((eq, i) => ({
      id: `eq-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      equipmentName: eq.equipmentName.trim(),
      status: eq.status || 'Active',
      machineNotes: (eq.machineNotes || '').trim(),
      date: todayStr,
      projectId: assignedPId,
      projectName: assignedPName
    }));

    const key = getProjectStorageKey(assignedPId);
    let existing = [];
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) existing = parsed;
      }
    } catch (err) {
      console.error(err);
    }

    const updated = [...newItems, ...existing];
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    loadEquipment();
    addToast && addToast(
      `Added ${newItems.length} equipment ${newItems.length === 1 ? 'record' : 'records'} to ${assignedPName} successfully!`
    );
    setIsAddModalOpen(false);
  };

  // Compile all equipment from LAE forms + scoped custom list
  const allEquipment = useMemo(() => {
    const list = [...customEquipment];

    (laeForms || []).forEach((form) => {
      if (
        selectedProjectId !== 'all' &&
        form.project_id &&
        form.project_id !== selectedProjectId &&
        form.project_id !== currentProject?.id
      ) {
        return;
      }

      if (Array.isArray(form.equipmentItems)) {
        form.equipmentItems.forEach((eq, idx) => {
          list.push({
            id: `lae-eq-${form.id}-${idx}`,
            equipmentName: eq.equipment_name || eq.equipmentName || 'Heavy Plant Machine',
            status: eq.operating_status || eq.status || 'Active',
            machineNotes: eq.machine_notes || eq.machineNotes || eq.remarks || '',
            date: form.date,
            formNumber: form.form_number,
            projectId: form.project_id,
            projectName: form.project_name || currentProject?.name || 'Site',
            source: 'lae'
          });
        });
      }
    });

    return list;
  }, [laeForms, customEquipment, selectedProjectId, currentProject]);

  // Operational breakdown stats
  const operationalStats = useMemo(() => {
    let active = 0;
    let maintenance = 0;
    allEquipment.forEach((eq) => {
      const s = (eq.status || 'Active').toLowerCase();
      if (s.includes('breakdown') || s.includes('maint')) {
        maintenance++;
      } else {
        active++;
      }
    });
    return { active, maintenance };
  }, [allEquipment]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    return allEquipment.filter((eq) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        eq.equipmentName.toLowerCase().includes(q) ||
        (eq.status && eq.status.toLowerCase().includes(q)) ||
        (eq.machineNotes && eq.machineNotes.toLowerCase().includes(q)) ||
        (eq.projectName && eq.projectName.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [allEquipment, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Plant & Machinery
            </span>
            <span className="text-xs text-slate-400">• Operational Dossier</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-amber-500" />
            <span>Equipment & Machinery Report</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Plant deployments, site machinery inventory, and equipment tracking for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites Combined'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {selectedProjectId !== 'all' && customEquipment.length > 0 && (
            <button
              onClick={handleClearSiteEquipment}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100/80 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors cursor-pointer shadow-2xs"
              title={`Clear all custom equipment for ${currentProject?.name || 'this site'}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Site Fleet</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Log Equipment Entry</span>
          </button>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deployed Fleet</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {allEquipment.length} {allEquipment.length === 1 ? 'Machine' : 'Machines'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {selectedProjectId === 'all'
              ? 'Across all operational site locations'
              : `Deployed at ${currentProject?.name || 'Active Site'}`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Status</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono flex items-baseline gap-2">
            <span>{operationalStats.active} Active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {operationalStats.maintenance > 0 ? (
              <span className="text-rose-600 font-medium">⚠️ {operationalStats.maintenance} In Maintenance / Breakdown</span>
            ) : (
              '100% fleet active & operational'
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Workspace</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 truncate">
            {currentProject?.name || 'All Sites Combined'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {selectedProjectId === 'all'
              ? 'Multi-site synchronized fleet roster'
              : 'Isolated site plant register'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment by name, status, notes, or site name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Equipment Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {filteredEquipment.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Equipment Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {searchTerm
                ? 'No equipment matching your search query was found.'
                : `No machinery currently logged for ${currentProject?.name || 'this workspace'}. Log machinery using the button below.`}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Equipment</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Equipment / Machinery</th>
                  <th className="py-3 px-4 w-48">Site / Project</th>
                  <th className="py-3 px-4 w-44">Status</th>
                  <th className="py-3 px-4 w-32">Date Logged</th>
                  <th className="py-3 px-4">Operating Notes & Remarks</th>
                  <th className="py-3 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((eq, idx) => {
                  const isBreakdown =
                    (eq.status || '').toLowerCase().includes('breakdown') ||
                    (eq.status || '').toLowerCase().includes('maint');

                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${isBreakdown ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                              } shrink-0`}
                          >
                            {isBreakdown ? <Wrench className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{eq.equipmentName}</span>
                            {eq.source === 'lae' && (
                              <span className="inline-block mt-0.5 text-[10px] text-blue-600 font-medium">
                                LAE Form #{eq.formNumber || 'Diary'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-700">
                          <Building className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{eq.projectName || currentProject?.name || 'Assigned Site'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isBreakdown ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                            <span>Maintenance / Breakdown</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {eq.date || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                        {eq.machineNotes || <span className="text-slate-400 italic">No notes recorded</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(eq)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${eq.source === 'lae'
                              ? 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          title={
                            eq.source === 'lae'
                              ? `Logged via Daily LAE Form #${eq.formNumber || ''}`
                              : 'Remove Equipment Record'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Log Equipment */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Plant & Machinery</h3>
                  <p className="text-[11px] text-slate-500">Record equipment status & site machinery deployments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddEquipmentEntry}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/80 bg-amber-50 hover:bg-amber-100/70 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors cursor-pointer shadow-2xs"
                  title="Add Another Machine"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Add Machine</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Site selector when viewing all projects */}
              {selectedProjectId === 'all' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-amber-600" />
                    <span>Assign Equipment to Site / Project <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={modalProjectId}
                    onChange={(e) => setModalProjectId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    {(projects || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code || 'Site'})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    The logged machinery will be stored and tracked under this specific site.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>
                    Logging equipment for site: <strong className="text-slate-900">{currentProject?.name}</strong>
                  </span>
                </div>
              )}

              {equipmentEntries.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-amber-500" />
                      <span>Machine #{idx + 1}</span>
                    </span>
                    {equipmentEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipmentEntry(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Machine"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Equipment / Machinery Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Concrete Mixer 400L, CAT 320 Excavator, Generator 50kVA"
                        value={entry.equipmentName}
                        onChange={(e) => handleUpdateEquipmentEntry(idx, 'equipmentName', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={entry.status || 'Active'}
                        onChange={(e) => handleUpdateEquipmentEntry(idx, 'status', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Maintenance / Breakdown">Maintenance / Breakdown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Machine Notes & Remarks
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Add notes, operator details, work performed, or site deployment remarks..."
                      value={entry.machineNotes}
                      onChange={(e) => handleUpdateEquipmentEntry(idx, 'machineNotes', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddEquipmentEntry}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>+ Add Another Machine</span>
              </button>

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
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
                >
                  Save Equipment {equipmentEntries.length > 1 ? `(${equipmentEntries.length} Machines)` : 'Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentReportPage;
