import React, { useState, useMemo } from 'react';
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
  Trash2
} from 'lucide-react';

export const EquipmentReportPage = () => {
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    companySettings,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Helper to generate empty equipment entry
  const createEmptyEquipmentEntry = () => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    equipmentName: '',
    machineNotes: ''
  });

  // Multiple equipment entries in Log Plant & Machinery modal
  const [equipmentEntries, setEquipmentEntries] = useState([createEmptyEquipmentEntry()]);

  const handleOpenAddModal = () => {
    setEquipmentEntries([createEmptyEquipmentEntry()]);
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

  const storageKey = `nasaab_equipment_${selectedProjectId || 'default'}`;
  const [customEquipment, setCustomEquipment] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'eq-1',
        equipmentName: 'Concrete Mixer 400L (Hydraulic Hopper)',
        machineNotes: 'Mixing concrete for column casting; operational on site.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-2',
        equipmentName: 'CAT 320 Hydraulic Excavator',
        machineNotes: 'Trench excavation for storm drainage and backfilling.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-3',
        equipmentName: 'Plate Compactor 90kg (Robin Engine)',
        machineNotes: 'Used for hardcore leveling in corridor zone.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-4',
        equipmentName: 'Bar Bending & Cutting Machine',
        machineNotes: 'Bending D16 rebar on ground floor.',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  const handleDeleteEquipment = (id) => {
    const updated = customEquipment.filter((e) => e.id !== id);
    setCustomEquipment(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    addToast && addToast('Equipment record removed.', 'info');
  };

  const handleSaveEquipment = (e) => {
    e.preventDefault();
    const validEntries = equipmentEntries.filter((eq) => eq.equipmentName && eq.equipmentName.trim());
    if (validEntries.length === 0) {
      addToast && addToast('Please enter at least one equipment / machinery name', 'error');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newItems = validEntries.map((eq, i) => ({
      id: `eq-${Date.now()}-${i}`,
      equipmentName: eq.equipmentName.trim(),
      machineNotes: (eq.machineNotes || '').trim(),
      date: todayStr
    }));

    const updated = [...newItems, ...customEquipment];
    setCustomEquipment(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast(`Added ${newItems.length} equipment ${newItems.length === 1 ? 'record' : 'records'} successfully!`);
    setIsAddModalOpen(false);
  };

  // Compile all equipment from LAE forms + custom list
  const allEquipment = useMemo(() => {
    const list = [...customEquipment];

    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId && form.project_id !== currentProject?.id) {
        return;
      }

      if (Array.isArray(form.equipmentItems)) {
        form.equipmentItems.forEach((eq, idx) => {
          list.push({
            id: `lae-eq-${form.id}-${idx}`,
            equipmentName: eq.equipment_name || eq.equipmentName || 'Heavy Plant Machine',
            machineNotes: eq.machine_notes || eq.machineNotes || eq.remarks || '',
            date: form.date,
            formNumber: form.form_number
          });
        });
      }
    });

    return list;
  }, [laeForms, customEquipment, selectedProjectId, currentProject]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    return allEquipment.filter((eq) => {
      const matchesSearch =
        eq.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.machineNotes && eq.machineNotes.toLowerCase().includes(searchTerm.toLowerCase()));
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
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Log Equipment Entry</span>
        </button>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deployed Fleet</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {allEquipment.length} Machines
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total plant items on site</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documented Machines</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {allEquipment.filter((e) => e.machineNotes && e.machineNotes.trim()).length} Documented
          </div>
          <p className="mt-1 text-[11px] text-slate-400">With operational & maintenance notes</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Site</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 truncate">
            {currentProject?.name || 'All Sites Combined'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Machinery tracking ledger</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment by name, remarks, or notes..."
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
              No equipment matching this query is logged. Log equipment using the button below.
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
                  <th className="py-3 px-4 w-32">Date Logged</th>
                  <th className="py-3 px-4">Operating Notes & Remarks</th>
                  <th className="py-3 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((eq, idx) => (
                  <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shrink-0">
                          <Truck className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-900">{eq.equipmentName}</span>
                      </div>
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
                        onClick={() => handleDeleteEquipment(eq.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Equipment Record"
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
                  <p className="text-[11px] text-slate-500">Record equipment status & daily running expenses</p>
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

                  <div>
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
