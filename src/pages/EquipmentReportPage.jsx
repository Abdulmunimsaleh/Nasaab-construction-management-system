import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatKES } from '../utils/formatters';
import { generateEquipmentReportPDF } from '../utils/pdfGenerator';
import api from '../services/api';
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
  Building2,
  MapPin,
  Check,
  RotateCcw,
  Receipt
} from 'lucide-react';

export const EquipmentReportPage = () => {
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    switchProject,
    projects,
    isDataLoading,
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

  // Unified custom equipment state (Live PostgreSQL)
  const [customEquipment, setCustomEquipment] = useState([]);

  // ==========================================
  // EQUIPMENT EXPENSES STATE & HELPERS
  // ==========================================
  const createEmptyExpenseEntry = () => ({
    id: `temp-exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    equipmentName: '',
    customName: '',
    amount: '',
    description: ''
  });

  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(true);
  const [expenseEntries, setExpenseEntries] = useState([createEmptyExpenseEntry()]);
  const [customExpenses, setCustomExpenses] = useState([]);

  // Load equipment and expenses from PostgreSQL database
  const loadDatabaseEquipment = async () => {
    try {
      const [fetchedEq, fetchedExp] = await Promise.all([
        api.equipment.getAll(selectedProjectId),
        api.equipment.getExpenses(selectedProjectId)
      ]);
      setCustomEquipment(Array.isArray(fetchedEq) ? fetchedEq : []);
      setCustomExpenses(Array.isArray(fetchedExp) ? fetchedExp : []);
    } catch (err) {
      console.error('Failed to load equipment from database:', err);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem('nasaab_equipment_ledger_v2');
      localStorage.removeItem('nasaab_equipment_expenses_ledger_v2');
    } catch (e) {
      // ignore
    }
    loadDatabaseEquipment();
  }, [selectedProjectId]);

  // Open modal and pre-select project
  const handleOpenAddModal = () => {
    setEquipmentEntries([createEmptyEquipmentEntry()]);
    const defaultPId = selectedProjectId !== 'all' ? selectedProjectId : (projects?.[0]?.id || '');
    setModalProjectId(defaultPId);
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

  // Save new equipment entries — strictly assigned to the chosen project site
  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    const validEntries = equipmentEntries.filter((eq) => eq.equipmentName && eq.equipmentName.trim());
    if (validEntries.length === 0) {
      addToast && addToast('Please enter at least one equipment / machinery name', 'error');
      return;
    }

    const assignedPId = modalProjectId || (selectedProjectId !== 'all' ? selectedProjectId : projects?.[0]?.id);
    const targetProjObj = (projects || []).find((p) => p.id === assignedPId);
    const assignedPName = targetProjObj?.name || currentProject?.name || 'Assigned Site';

    const todayStr = new Date().toISOString().split('T')[0];
    const newItems = validEntries.map((eq, i) => ({
      id: `eq-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
      equipmentName: eq.equipmentName.trim(),
      status: eq.status || 'Active',
      machineNotes: (eq.machineNotes || '').trim(),
      date: todayStr,
      projectId: assignedPId,
      projectName: assignedPName
    }));

    try {
      await api.equipment.create(newItems);
      const updated = [...newItems, ...customEquipment];
      setCustomEquipment(updated);
      addToast && addToast(
        `Added ${newItems.length} equipment ${newItems.length === 1 ? 'record' : 'records'} to ${assignedPName} successfully!`
      );
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to save equipment:', err);
      addToast && addToast('Failed to save equipment to database: ' + err.message, 'error');
    }
  };

  // Delete equipment entry — strictly removes ONLY that specific item
  const handleDeleteEquipment = async (eq) => {
    if (eq.source === 'lae') {
      addToast && addToast(
        `This machine is part of official Daily LAE Log #${eq.formNumber || ''}. To remove it, please edit that daily log directly.`,
        'warning'
      );
      return;
    }

    try {
      await api.equipment.delete(eq.id);
      const updated = customEquipment.filter((item) => item.id !== eq.id);
      setCustomEquipment(updated);
      addToast && addToast(`Removed ${eq.equipmentName} from ${eq.projectName || 'site'}.`, 'info');
    } catch (err) {
      console.error('Failed to delete equipment:', err);
      addToast && addToast('Failed to delete equipment: ' + err.message, 'error');
    }
  };

  // Reset or clear custom equipment for the active site
  const handleClearSiteEquipment = async () => {
    if (selectedProjectId === 'all') {
      addToast && addToast('Please select a specific project site to reset its machinery fleet.', 'warning');
      return;
    }
    const siteName = currentProject?.name || 'this site';
    if (!window.confirm(`Are you sure you want to clear all custom logged equipment for ${siteName}? This cannot be undone.`)) {
      return;
    }

    try {
      const toDelete = customEquipment.filter((item) => item.projectId === selectedProjectId);
      await Promise.all(toDelete.map((item) => api.equipment.delete(item.id)));
      const updated = customEquipment.filter((item) => item.projectId !== selectedProjectId);
      setCustomEquipment(updated);
      addToast && addToast(`All equipment records cleared for ${siteName}.`, 'info');
    } catch (err) {
      console.error('Failed to clear equipment records:', err);
      addToast && addToast('Failed to clear equipment: ' + err.message, 'error');
    }
  };

  // Filter custom equipment strictly by selected project
  const scopedCustomEquipment = useMemo(() => {
    if (selectedProjectId === 'all') {
      return customEquipment;
    }
    return customEquipment.filter((item) => item.projectId === selectedProjectId);
  }, [customEquipment, selectedProjectId]);

  // Combine with LAE forms equipment strictly scoped to selected project
  const allEquipment = useMemo(() => {
    const list = [...scopedCustomEquipment];

    (laeForms || []).forEach((form) => {
      if (
        selectedProjectId !== 'all' &&
        form.project_id &&
        form.project_id !== selectedProjectId
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
  }, [scopedCustomEquipment, laeForms, selectedProjectId, currentProject]);

  // Calculate equipment counts per project for site switcher badges
  const siteEquipmentCounts = useMemo(() => {
    const counts = { all: 0 };
    (projects || []).forEach((p) => {
      counts[p.id] = 0;
    });

    customEquipment.forEach((eq) => {
      counts.all = (counts.all || 0) + 1;
      if (eq.projectId && counts[eq.projectId] !== undefined) {
        counts[eq.projectId] = (counts[eq.projectId] || 0) + 1;
      }
    });

    (laeForms || []).forEach((form) => {
      if (Array.isArray(form.equipmentItems)) {
        form.equipmentItems.forEach(() => {
          counts.all = (counts.all || 0) + 1;
          if (form.project_id && counts[form.project_id] !== undefined) {
            counts[form.project_id] = (counts[form.project_id] || 0) + 1;
          }
        });
      }
    });

    return counts;
  }, [customEquipment, laeForms, projects]);

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

  // Filtered equipment by search query
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

  // Available machine names for the expense dropdown
  const machineOptions = useMemo(() => {
    const names = new Set();
    allEquipment.forEach((eq) => {
      if (eq.equipmentName && eq.equipmentName.trim()) {
        names.add(eq.equipmentName.trim());
      }
    });
    return Array.from(names);
  }, [allEquipment]);

  // ==========================================
  // EXPENSES HANDLERS
  // ==========================================
  const handleAddExpenseEntry = () => {
    setExpenseEntries((prev) => [...prev, createEmptyExpenseEntry()]);
  };

  const handleRemoveExpenseEntry = (index) => {
    if (expenseEntries.length === 1) {
      setExpenseEntries([createEmptyExpenseEntry()]);
      return;
    }
    setExpenseEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExpenseEntry = (index, field, value) => {
    setExpenseEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveExpenses = async (e) => {
    e.preventDefault();
    const validEntries = expenseEntries.filter((exp) => {
      const name = exp.equipmentName === 'custom' ? exp.customName : exp.equipmentName;
      return name && name.trim() && exp.amount && parseFloat(exp.amount) > 0;
    });

    if (validEntries.length === 0) {
      addToast && addToast('Please select/enter a machine name and valid expense amount.', 'error');
      return;
    }

    const assignedPId = selectedProjectId !== 'all' ? selectedProjectId : (projects?.[0]?.id || 'default');
    const targetProjObj = (projects || []).find((p) => p.id === assignedPId);
    const assignedPName = targetProjObj?.name || currentProject?.name || 'Site Workspace';
    const todayStr = new Date().toISOString().split('T')[0];

    const newItems = validEntries.map((exp, i) => {
      const resolvedName = exp.equipmentName === 'custom' ? exp.customName.trim() : exp.equipmentName.trim();
      return {
        id: `exp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
        equipmentName: resolvedName,
        amount: parseFloat(exp.amount) || 0,
        description: (exp.description || '').trim(),
        date: todayStr,
        projectId: assignedPId,
        projectName: assignedPName
      };
    });

    try {
      await api.equipment.createExpense(newItems);
      const updated = [...newItems, ...customExpenses];
      setCustomExpenses(updated);
      addToast && addToast(
        `Logged ${newItems.length} equipment expense ${newItems.length === 1 ? 'record' : 'records'} for ${assignedPName} successfully!`
      );
      setExpenseEntries([createEmptyExpenseEntry()]);
    } catch (err) {
      console.error('Failed to save expenses:', err);
      addToast && addToast('Failed to save equipment expenses: ' + err.message, 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await api.equipment.deleteExpense(id);
      const updated = customExpenses.filter((e) => e.id !== id);
      setCustomExpenses(updated);
      addToast && addToast('Equipment expense record removed.', 'info');
    } catch (err) {
      console.error('Failed to delete expense:', err);
      addToast && addToast('Failed to delete expense: ' + err.message, 'error');
    }
  };

  // Filter expenses strictly by selected project
  const scopedExpenses = useMemo(() => {
    if (selectedProjectId === 'all') {
      return customExpenses;
    }
    return customExpenses.filter((e) => e.projectId === selectedProjectId);
  }, [customExpenses, selectedProjectId]);

  const totalExpenseAmount = useMemo(() => {
    return scopedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [scopedExpenses]);

  const handleDownloadEquipmentPDF = () => {
    try {
      const activeProj = currentProject || (selectedProjectId !== 'all' ? (projects || []).find((p) => p.id === selectedProjectId) : null) || { name: 'All Sites Combined', code: 'ALL' };
      const doc = generateEquipmentReportPDF({
        project: activeProj,
        equipmentList: filteredEquipment.map((e) => ({
          name: e.equipmentName,
          category: e.category || 'Plant Equipment',
          status: e.status || 'Active',
          condition: e.condition || 'Operational',
          dailyRate: e.dailyRate || 0,
          operator: e.operatorName || 'Site Assigned',
          location: e.projectName || activeProj.name
        })),
        expensesList: scopedExpenses,
        metrics: {
          activeCount: operationalStats.active,
          maintenanceCount: operationalStats.maintenance,
          totalExpenses: totalExpenseAmount
        },
        companySettings
      });
      const fileCode = (activeProj.code || activeProj.name || 'Site').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Equipment_Report_${fileCode}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast && addToast('Equipment & Machinery PDF report downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate equipment PDF:', err);
      addToast && addToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

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
          <button
            onClick={handleDownloadEquipmentPDF}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Download formatted Equipment & Machinery PDF report"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Log Equipment Entry</span>
          </button>
        </div>
      </div>

      {/* DEDICATED SITE SWITCHER BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Filter by Site Workspace:
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any site tab to switch view and view only its machinery
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2.5">
          <button
            onClick={() => switchProject && switchProject('all')}
            disabled={isDataLoading}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${selectedProjectId === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
              }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>All Sites Combined</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedProjectId === 'all'
                ? 'bg-amber-600 text-slate-950'
                : 'bg-slate-200 text-slate-600'
                }`}
            >
              {siteEquipmentCounts.all || 0}
            </span>
            {selectedProjectId === 'all' && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
          </button>

          {(projects || []).map((p) => {
            const isSelected = selectedProjectId === p.id;
            const count = siteEquipmentCounts[p.id] || 0;
            return (
              <button
                key={p.id}
                onClick={() => switchProject && switchProject(p.id)}
                disabled={isDataLoading}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
              >
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{p.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-amber-600 text-slate-950' : 'bg-slate-200 text-slate-600'
                    }`}
                >
                  {count}
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
              </button>
            );
          })}
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
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {eq.projectName || currentProject?.name || 'Assigned Site'}
                          </span>
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

      {/* ============================================================== */}
      {/* EQUIPMENT EXPENSES SECTION (EXACTLY AS IN USER'S IMAGE) */}
      {/* ============================================================== */}
      <div className="space-y-4 pt-2">
        {/* Trigger button & descriptive label */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <button
            onClick={() => setIsExpenseFormOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Add Equipment Expenses</span>
          </button>
          <span className="text-xs text-slate-500">
            Record servicing, repairs, spare parts & fuel costs
          </span>
        </div>

        {/* Expenses Log Form Card */}
        {isExpenseFormOpen && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-amber-500" />
                  <span>Equipment Expenses Log</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter operational maintenance and running expenses for machinery deployed at{' '}
                  <strong className="text-slate-800">{currentProject?.name || 'All Sites Combined'}</strong> workspace.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 font-mono self-start sm:self-auto">
                Workspace: {currentProject?.name || 'All Sites Combined'}
              </div>
            </div>

            <form onSubmit={handleSaveExpenses} className="space-y-4">
              {expenseEntries.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-100/70 px-2.5 py-1 rounded-md">
                      MACHINE ENTRY #{idx + 1}
                    </span>
                    {expenseEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseEntry(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Machine Entry"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        EQUIPMENT / MACHINE NAME <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={entry.equipmentName}
                        onChange={(e) => handleUpdateExpenseEntry(idx, 'equipmentName', e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="">Select machine...</option>
                        {machineOptions.map((name, mIdx) => (
                          <option key={mIdx} value={name}>
                            {name}
                          </option>
                        ))}
                        <option value="custom">+ Other / Custom Machine</option>
                      </select>

                      {entry.equipmentName === 'custom' && (
                        <input
                          type="text"
                          placeholder="Enter machine name..."
                          value={entry.customName || ''}
                          onChange={(e) => handleUpdateExpenseEntry(idx, 'customName', e.target.value)}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        TOTAL EXPENSE AMOUNT (KSH) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                          KSh
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          placeholder="e.g. 45,000"
                          value={entry.amount}
                          onChange={(e) => handleUpdateExpenseEntry(idx, 'amount', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      DESCRIPTION / NOTES
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Describe expense details: repairs, fuel consumption, spare parts replaced, servicing, operational hours, technician notes..."
                      value={entry.description}
                      onChange={(e) => handleUpdateExpenseEntry(idx, 'description', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddExpenseEntry}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 px-4 py-2 text-xs font-bold text-amber-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>+ Add Another Machine</span>
              </button>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-xs cursor-pointer transition-all"
                >
                  Save Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpenseFormOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recorded Equipment Expenses Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" />
                <span>Logged Equipment Maintenance & Operating Expenses</span>
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Ledger of repairs, servicing, and spare parts expenses for {currentProject?.name || 'All Sites'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Total Expenses:</span>
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-xs font-extrabold text-amber-900 border border-amber-200">
                {formatKES(totalExpenseAmount)}
              </span>
            </div>
          </div>

          {scopedExpenses.length === 0 ? (
            <div className="py-10 text-center">
              <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                No equipment expenses recorded yet for {currentProject?.name || 'this workspace'}. Use the form above to log expenses.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Equipment / Machine</th>
                    <th className="py-3 px-4 w-40">Site / Workspace</th>
                    <th className="py-3 px-4 w-36">Expense Amount</th>
                    <th className="py-3 px-4 w-32">Date Logged</th>
                    <th className="py-3 px-4">Expense Details & Remarks</th>
                    <th className="py-3 px-4 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedExpenses.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 shrink-0">
                            <Wrench className="h-3 w-3" />
                          </div>
                          <span>{exp.equipmentName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{exp.projectName || currentProject?.name || 'Site'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                        {formatKES(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {exp.date || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                        {exp.description || <span className="text-slate-400 italic">No notes provided</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Expense Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* SITE SELECTOR ALWAYS VISIBLE IN FORM */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-amber-600" />
                  <span>
                    Project Site / Location <span className="text-rose-500">*</span>
                  </span>
                </label>
                <select
                  value={modalProjectId}
                  onChange={(e) => setModalProjectId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden cursor-pointer shadow-xs"
                >
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'Site'}) {p.location ? `— ${p.location}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Select the exact site workspace where this equipment will be deployed and recorded.
                </p>
              </div>

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
