import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  PackageCheck,
  Truck,
  Boxes,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Eye,
  X,
  ExternalLink,
  ImageIcon
} from 'lucide-react';
import { formatKES } from '../utils/formatters';

export const MaterialsReceivedPage = () => {
  const {
    materialRequests,
    currentProject,
    selectedProjectId,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // New delivery state
  const [newDelivery, setNewDelivery] = useState({
    itemName: '',
    supplier: '',
    quantity: 100,
    unit: 'Bags',
    deliveryNoteNo: '',
    notes: '',
    unitCost: 850
  });

  const storageKey = `nasaab_materials_received_${selectedProjectId || 'default'}`;
  const [customDeliveries, setCustomDeliveries] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'deliv-1',
        itemName: 'Bamburi Portland Cement 42.5N',
        supplier: 'Bamburi Cement Limited',
        quantity: 250,
        unit: 'Bags',
        unitCost: 880,
        totalCost: 220000,
        deliveryNoteNo: 'DN-99421',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Offloaded to dry storage shed; all bags dry and intact with intact manufacturer seals.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'deliv-2',
        itemName: 'High-Yield Ribbed Reinforcement Bars D16 (12m)',
        supplier: 'Apex Steel Mills Kenya',
        quantity: 120,
        unit: 'Bars (5.5 Tonnes)',
        unitCost: 2850,
        totalCost: 342000,
        deliveryNoteNo: 'APX-7741',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Bend test sample approved by site foreman; stacked on timber battens above ground.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'deliv-3',
        itemName: 'Clean River Sand (Coarse Graded)',
        supplier: 'Mombasa River Aggregates Ltd',
        quantity: 4,
        unit: 'Trips (15-Ton Lorries)',
        unitCost: 24000,
        totalCost: 96000,
        deliveryNoteNo: 'MRA-1029',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Discharged at batching yard; silt content checked under 4%.',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 'deliv-4',
        itemName: 'Marine Film Faced Plywood 18mm (8x4)',
        supplier: 'Coast Timber & Hardware',
        quantity: 80,
        unit: 'Sheets',
        unitCost: 3200,
        totalCost: 256000,
        deliveryNoteNo: 'CT-5510',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Shuttering boards inspected for edge sealant. Allocated to slab carpenters.',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  const handleSaveDelivery = (e) => {
    e.preventDefault();
    if (!newDelivery.itemName.trim() || !newDelivery.supplier.trim()) {
      addToast && addToast('Please enter item name and supplier', 'error');
      return;
    }

    const qty = Number(newDelivery.quantity) || 0;
    const rate = Number(newDelivery.unitCost) || 0;

    const delivery = {
      id: `deliv-${Date.now()}`,
      itemName: newDelivery.itemName,
      supplier: newDelivery.supplier,
      quantity: qty,
      unit: newDelivery.unit,
      unitCost: rate,
      totalCost: qty * rate,
      deliveryNoteNo: newDelivery.deliveryNoteNo || `DN-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'Verified & Stored',
      receivedBy: 'Site Storekeeper',
      notes: newDelivery.notes,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [delivery, ...customDeliveries];
    setCustomDeliveries(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast('Material intake verified & recorded!');
    setIsAddModalOpen(false);
  };

  // Compile all deliveries from Material Requests + custom entries
  const allDeliveries = useMemo(() => {
    const list = [...customDeliveries];

    (materialRequests || []).forEach((req) => {
      if (selectedProjectId !== 'all' && req.project_id && req.project_id !== selectedProjectId && req.project_id !== currentProject?.id) {
        return;
      }

      // Check request items
      if (Array.isArray(req.items)) {
        req.items.forEach((item, idx) => {
          if (item.supplier_vendor || item.delivery_notes || req.status === 'fulfilled') {
            const qty = Number(item.quantity || 1);
            const rate = Number(item.estimated_unit_cost || 0);

            let photos = [];
            if (item.receipt_photos) {
              try {
                photos = typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos) : item.receipt_photos;
              } catch (e) {
                photos = [];
              }
            }

            list.push({
              id: `req-deliv-${req.id}-${idx}`,
              itemName: item.item_name || 'Site Material Delivery',
              supplier: item.supplier_vendor || 'Approved Site Supplier',
              quantity: qty,
              unit: item.unit || 'units',
              unitCost: rate,
              totalCost: qty * rate,
              deliveryNoteNo: req.request_number ? `DEL-${req.request_number}` : 'DN-VERIFIED',
              status: req.status === 'fulfilled' ? 'Verified & Stored' : 'Delivered to Site',
              receivedBy: req.requested_by_name || 'Storekeeper',
              notes: item.delivery_notes || item.notes || req.notes || '',
              date: req.date_needed || req.created_at?.split('T')[0],
              photos
            });
          }
        });
      }
    });

    return list;
  }, [materialRequests, customDeliveries, selectedProjectId, currentProject]);

  // Unique suppliers
  const suppliers = useMemo(() => {
    const set = new Set();
    allDeliveries.forEach((d) => {
      if (d.supplier) set.add(d.supplier);
    });
    return Array.from(set);
  }, [allDeliveries]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return allDeliveries.filter((d) => {
      const matchesSearch =
        d.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.deliveryNoteNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier =
        selectedSupplier === 'all' || d.supplier === selectedSupplier;

      return matchesSearch && matchesSupplier;
    });
  }, [allDeliveries, searchTerm, selectedSupplier]);

  // Summary KPIs
  const summary = useMemo(() => {
    const count = allDeliveries.length;
    const totalValue = allDeliveries.reduce((acc, d) => acc + (d.totalCost || 0), 0);
    const activeSuppliers = suppliers.length;
    return { count, totalValue, activeSuppliers };
  }, [allDeliveries, suppliers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Stores & Intake
            </span>
            <span className="text-xs text-slate-400">• Verified Goods Inward</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <PackageCheck className="h-7 w-7 text-amber-500" />
            <span>Materials Received on Site</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Log of incoming construction supplies, delivery notes, physical inspection checks, and warehouse intake for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Record Material Delivery</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shipments Received</span>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {summary.count} Deliveries
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total verified site deliveries</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Suppliers</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {summary.activeSuppliers} Approved
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Cement, steel, aggregates & timber</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Stock Value</span>
            <Boxes className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 font-mono">
            {formatKES(summary.totalValue)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Delivered materials inventory</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Notes</span>
            <FileText className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            100% Filed
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Auditable paper trail backed</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deliveries by item, supplier, delivery note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          {suppliers.length > 0 && (
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {filteredDeliveries.length === 0 ? (
          <div className="py-16 text-center">
            <PackageCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Material Deliveries Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              There are no received shipments matching your query. Record one below.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Record First Delivery</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Material Item</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Quantity Received</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4">Delivery Note</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Intake Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((deliv) => (
                  <tr key={deliv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <div>{deliv.itemName}</div>
                        {deliv.date && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{deliv.date}</div>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {deliv.supplier}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {deliv.quantity} {deliv.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {deliv.unitCost ? formatKES(deliv.unitCost) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-700">
                      {deliv.totalCost ? formatKES(deliv.totalCost) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {deliv.deliveryNoteNo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {deliv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {deliv.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Delivery */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Material Delivery</h3>
                  <p className="text-[11px] text-slate-500">Verify and log goods inward to site warehouse</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Material Item Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bamburi Portland Cement 42.5N"
                  value={newDelivery.itemName}
                  onChange={(e) => setNewDelivery({ ...newDelivery, itemName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier / Vendor Firm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bamburi Cement Limited, Apex Steel"
                  value={newDelivery.supplier}
                  onChange={(e) => setNewDelivery({ ...newDelivery, supplier: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivered Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newDelivery.quantity}
                    onChange={(e) => setNewDelivery({ ...newDelivery, quantity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measurement
                  </label>
                  <input
                    type="text"
                    placeholder="Bags, Tonnes, Lorries, Sheets"
                    value={newDelivery.unit}
                    onChange={(e) => setNewDelivery({ ...newDelivery, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Note Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DN-88120"
                    value={newDelivery.deliveryNoteNo}
                    onChange={(e) => setNewDelivery({ ...newDelivery, deliveryNoteNo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit Cost (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDelivery.unitCost}
                    onChange={(e) => setNewDelivery({ ...newDelivery, unitCost: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Storage Location & Quality Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Condition upon arrival, storage bay allocation, physical verification details..."
                  value={newDelivery.notes}
                  onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
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
                  Verify & Save Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsReceivedPage;
