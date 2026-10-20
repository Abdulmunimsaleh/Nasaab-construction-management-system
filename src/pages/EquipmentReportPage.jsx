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
  X
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Equipment state
  const [newEquipment, setNewEquipment] = useState({
    equipmentName: '',
    operatingStatus: 'Active',
    hoursUsed: 8,
    fuelCost: 4500,
    operatorCost: 2000,
    repairCost: 0,
    mechanicCost: 0,
    transportCost: 0,
    machineNotes: ''
  });

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
        operatingStatus: 'Active',
        hoursUsed: 7.5,
        fuelCost: 3500,
        operatorCost: 1500,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        totalExpense: 5000,
        machineNotes: 'Mixing concrete for column casting; engine oil level normal.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-2',
        equipmentName: 'CAT 320 Hydraulic Excavator',
        operatingStatus: 'Active',
        hoursUsed: 6.0,
        fuelCost: 14000,
        operatorCost: 3500,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        totalExpense: 17500,
        machineNotes: 'Trench excavation for storm drainage and backfilling.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-3',
        equipmentName: 'Plate Compactor 90kg (Robin Engine)',
        operatingStatus: 'Standby',
        hoursUsed: 2.0,
        fuelCost: 1200,
        operatorCost: 1000,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        totalExpense: 2200,
        machineNotes: 'Used for hardcore leveling in corridor zone.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'eq-4',
        equipmentName: 'Bar Bending & Cutting Machine',
        operatingStatus: 'Active',
        hoursUsed: 8.0,
        fuelCost: 2800,
        operatorCost: 1800,
        repairCost: 500,
        mechanicCost: 0,
        transportCost: 0,
        totalExpense: 5100,
        machineNotes: 'Replaced cutting blade teeth; bending D16 rebar without hitch.',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  const handleSaveEquipment = (e) => {
    e.preventDefault();
    if (!newEquipment.equipmentName.trim()) {
      addToast && addToast('Please enter an equipment name', 'error');
      return;
    }

    const fuel = Number(newEquipment.fuelCost) || 0;
    const operator = Number(newEquipment.operatorCost) || 0;
    const repair = Number(newEquipment.repairCost) || 0;
    const mechanic = Number(newEquipment.mechanicCost) || 0;
    const transport = Number(newEquipment.transportCost) || 0;
    const total = fuel + operator + repair + mechanic + transport;

    const item = {
      id: `eq-${Date.now()}`,
      equipmentName: newEquipment.equipmentName,
      operatingStatus: newEquipment.operatingStatus,
      hoursUsed: Number(newEquipment.hoursUsed) || 0,
      fuelCost: fuel,
      operatorCost: operator,
      repairCost: repair,
      mechanicCost: mechanic,
      transportCost: transport,
      totalExpense: total,
      machineNotes: newEquipment.machineNotes,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [item, ...customEquipment];
    setCustomEquipment(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast('Equipment record added successfully!');
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
          const fuel = Number(eq.fuel_cost || eq.fuelCost || 0);
          const operator = Number(eq.operator_cost || eq.operatorCost || 0);
          const repair = Number(eq.repair_cost || eq.repairCost || 0);
          const mechanic = Number(eq.mechanic_cost || eq.mechanicCost || 0);
          const transport = Number(eq.transport_cost || eq.transportCost || 0);
          const total = Number(eq.total_expense || eq.totalExpense || (fuel + operator + repair + mechanic + transport));

          list.push({
            id: `lae-eq-${form.id}-${idx}`,
            equipmentName: eq.equipment_name || eq.equipmentName || 'Heavy Plant Machine',
            operatingStatus: eq.operating_status || eq.operatingStatus || eq.status || 'Active',
            hoursUsed: Number(eq.hours_used || eq.hoursUsed || 8),
            fuelCost: fuel,
            operatorCost: operator,
            repairCost: repair,
            mechanicCost: mechanic,
            transportCost: transport,
            totalExpense: total,
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

      const matchesStatus =
        statusFilter === 'all' ||
        eq.operatingStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [allEquipment, searchTerm, statusFilter]);

  // Aggregate totals
  const summary = useMemo(() => {
    const totalCount = allEquipment.length;
    const activeCount = allEquipment.filter((e) => e.operatingStatus.toLowerCase() === 'active').length;
    const standbyCount = allEquipment.filter((e) => e.operatingStatus.toLowerCase() === 'standby').length;
    const maintenanceCount = allEquipment.filter(
      (e) => e.operatingStatus.toLowerCase() === 'maintenance' || e.operatingStatus.toLowerCase() === 'breakdown'
    ).length;

    const totalExpense = allEquipment.reduce((acc, e) => acc + (e.totalExpense || 0), 0);
    const totalFuel = allEquipment.reduce((acc, e) => acc + (e.fuelCost || 0), 0);
    const totalOperator = allEquipment.reduce((acc, e) => acc + (e.operatorCost || 0), 0);
    const totalRepairs = allEquipment.reduce((acc, e) => acc + ((e.repairCost || 0) + (e.mechanicCost || 0)), 0);
    const totalHours = allEquipment.reduce((acc, e) => acc + (e.hoursUsed || 0), 0);

    return {
      totalCount,
      activeCount,
      standbyCount,
      maintenanceCount,
      totalExpense,
      totalFuel,
      totalOperator,
      totalRepairs,
      totalHours
    };
  }, [allEquipment]);

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
            Plant deployments, operating status, fuel consumption, and maintenance expenditures for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Log Equipment Entry</span>
        </button>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deployed Fleet</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {summary.totalCount} Machines
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total plant items on site</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {summary.activeCount} Active
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{summary.standbyCount} standby • {summary.maintenanceCount} in maintenance</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Hours</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {summary.totalHours.toFixed(1)} hrs
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total engine hours logged</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Plant Expense</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
            {formatKES(summary.totalExpense)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Fuel, operators & repairs combined</p>
        </div>
      </div>

      {/* Expense Sub-Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Fuel className="h-4 w-4 text-amber-600" />
            <span>Fuel & Diesel Spend</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-amber-950 font-mono">
            {formatKES(summary.totalFuel)}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700">Diesel supply for mixers, plant & generators</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Operator Wages</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 font-mono">
            {formatKES(summary.totalOperator)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Certified plant operators & drivers</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
            <Wrench className="h-4 w-4 text-rose-600" />
            <span>Maintenance & Spares</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-rose-950 font-mono">
            {formatKES(summary.totalRepairs)}
          </div>
          <p className="mt-0.5 text-[11px] text-rose-700">Routine servicing, mechanic & replacement parts</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment by name, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
          {['all', 'active', 'standby', 'maintenance'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
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
              onClick={() => setIsAddModalOpen(true)}
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
                  <th className="py-3 px-4">Equipment Machine</th>
                  <th className="py-3 px-4">Operating Status</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4 text-right">Fuel Cost</th>
                  <th className="py-3 px-4 text-right">Operator Cost</th>
                  <th className="py-3 px-4 text-right">Maint. / Spares</th>
                  <th className="py-3 px-4 text-right">Total Expense</th>
                  <th className="py-3 px-4">Operating Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <div>{eq.equipmentName}</div>
                        {eq.date && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{eq.date}</div>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          eq.operatingStatus.toLowerCase() === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : eq.operatingStatus.toLowerCase() === 'standby'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {eq.operatingStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                      {eq.hoursUsed}h
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatKES(eq.fuelCost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatKES(eq.operatorCost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatKES((eq.repairCost || 0) + (eq.mechanicCost || 0))}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-700">
                      {formatKES(eq.totalExpense)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {eq.machineNotes || '—'}
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
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Plant & Machinery</h3>
                  <p className="text-[11px] text-slate-500">Record equipment status & daily running expenses</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Equipment / Machinery Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Concrete Mixer 400L, CAT 320 Excavator"
                  value={newEquipment.equipmentName}
                  onChange={(e) => setNewEquipment({ ...newEquipment, equipmentName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Status
                  </label>
                  <select
                    value={newEquipment.operatingStatus}
                    onChange={(e) => setNewEquipment({ ...newEquipment, operatingStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="Active">Active / Operational</option>
                    <option value="Standby">Standby</option>
                    <option value="Maintenance">Maintenance / Breakdown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newEquipment.hoursUsed}
                    onChange={(e) => setNewEquipment({ ...newEquipment, hoursUsed: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fuel / Diesel (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEquipment.fuelCost}
                    onChange={(e) => setNewEquipment({ ...newEquipment, fuelCost: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operator Wage (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEquipment.operatorCost}
                    onChange={(e) => setNewEquipment({ ...newEquipment, operatorCost: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Repair / Spares (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEquipment.repairCost}
                    onChange={(e) => setNewEquipment({ ...newEquipment, repairCost: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobilization / Transport (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEquipment.transportCost}
                    onChange={(e) => setNewEquipment({ ...newEquipment, transportCost: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Notes & Maintenance Observations
                </label>
                <textarea
                  rows="2"
                  placeholder="Note oil checks, hydraulic leaks, parts replaced, or specific site work performed..."
                  value={newEquipment.machineNotes}
                  onChange={(e) => setNewEquipment({ ...newEquipment, machineNotes: e.target.value })}
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
                  Save Equipment Log
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
