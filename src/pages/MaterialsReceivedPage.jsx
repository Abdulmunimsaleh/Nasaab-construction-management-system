import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  PackageCheck,
  Truck,
  Boxes,
  Plus,
  Search,
  Calendar,
  Trash2,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Building2,
  Check,
  ExternalLink
} from 'lucide-react';
import { formatKES, getDayOfWeek, formatDate } from '../utils/formatters';

export const MaterialsReceivedPage = () => {
  const {
    materialRequests,
    projects,
    currentProject,
    selectedProjectId,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    addToast
  } = useApp();

  // Helper for local YYYY-MM-DD
  const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Form State
  const [formProjectId, setFormProjectId] = useState(
    selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : (currentProject?.id || (projects && projects[0]?.id) || '')
  );
  const [deliveryDate, setDeliveryDate] = useState(getLocalToday);
  const [items, setItems] = useState([
    {
      materialItem: '',
      supplier: '',
      deliveredQuantity: '',
      totalAmount: '',
      description: '',
      receiptPhotos: []
    }
  ]);

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
        projectId: 'proj-1',
        projectName: 'Nasaab Residence',
        itemName: 'Bamburi Portland Cement 42.5N',
        supplier: 'Bamburi Cement Limited',
        quantity: '250 Bags',
        totalCost: 220000,
        deliveryNoteNo: 'DN-99421',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Offloaded to dry storage shed; all bags dry and intact with intact manufacturer seals.',
        date: new Date().toISOString().split('T')[0],
        day: getDayOfWeek(new Date().toISOString().split('T')[0]),
        photos: []
      },
      {
        id: 'deliv-2',
        projectId: 'proj-1',
        projectName: 'Nasaab Residence',
        itemName: 'High-Yield Ribbed Reinforcement Bars D16 (12m)',
        supplier: 'Apex Steel Mills Kenya',
        quantity: '120 Bars (5.5 Tonnes)',
        totalCost: 342000,
        deliveryNoteNo: 'APX-7741',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Bend test sample approved by site foreman; stacked on timber battens above ground.',
        date: new Date().toISOString().split('T')[0],
        day: getDayOfWeek(new Date().toISOString().split('T')[0]),
        photos: []
      },
      {
        id: 'deliv-3',
        projectId: 'proj-1',
        projectName: 'Nasaab Residence',
        itemName: 'Clean River Sand (Coarse Graded)',
        supplier: 'Mombasa River Aggregates Ltd',
        quantity: '4 Trips (15-Ton Lorries)',
        totalCost: 96000,
        deliveryNoteNo: 'MRA-1029',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Discharged at batching yard; silt content checked under 4%.',
        date: new Date().toISOString().split('T')[0],
        day: getDayOfWeek(new Date().toISOString().split('T')[0]),
        photos: []
      },
      {
        id: 'deliv-4',
        projectId: 'proj-1',
        projectName: 'Nasaab Residence',
        itemName: 'Marine Film Faced Plywood 18mm (8x4)',
        supplier: 'Coast Timber & Hardware',
        quantity: '80 Sheets',
        totalCost: 256000,
        deliveryNoteNo: 'CT-5510',
        status: 'Verified & Stored',
        receivedBy: 'Storekeeper Ali',
        notes: 'Shuttering boards inspected for edge sealant. Allocated to slab carpenters.',
        date: new Date().toISOString().split('T')[0],
        day: getDayOfWeek(new Date().toISOString().split('T')[0]),
        photos: []
      }
    ];
  });

  // Convert uploaded image file to base64 data URL
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle receipt photos upload for specific subform item
  const handleReceiptPhotoUpload = async (itemIndex, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            url: dataUrl
          };
        })
      );

      setItems((prev) => {
        const updated = [...prev];
        updated[itemIndex] = {
          ...updated[itemIndex],
          receiptPhotos: [...(updated[itemIndex].receiptPhotos || []), ...newPhotos]
        };
        return updated;
      });
      addToast && addToast('Receipt photo attached!', 'success');
    } catch (err) {
      addToast && addToast('Failed to process image attachment', 'error');
    }
    e.target.value = '';
  };

  const handleRemoveReceiptPhoto = (itemIndex, photoIndex) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        receiptPhotos: updated[itemIndex].receiptPhotos.filter((_, idx) => idx !== photoIndex)
      };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        materialItem: '',
        supplier: '',
        deliveredQuantity: '',
        totalAmount: '',
        description: '',
        receiptPhotos: []
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      setItems([
        {
          materialItem: '',
          supplier: '',
          deliveredQuantity: '',
          totalAmount: '',
          description: '',
          receiptPhotos: []
        }
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveDelivery = (e) => {
    e.preventDefault();

    const validItems = items.filter(
      (it) => it.materialItem.trim() || it.supplier.trim() || it.deliveredQuantity.trim()
    );

    if (validItems.length === 0) {
      addToast && addToast('Please fill in at least one material item and supplier', 'error');
      return;
    }

    const selectedProj = (projects || []).find((p) => p.id === formProjectId) || currentProject;
    const projName = selectedProj?.name || currentProject?.name || 'Site Project';
    const shipmentBatchId = `shipment-${Date.now()}`;

    const newEntries = validItems.map((item, idx) => {
      const cleanAmount = Number(String(item.totalAmount).replace(/[^0-9.-]+/g, '')) || 0;
      return {
        id: `deliv-${Date.now()}-${idx}`,
        shipmentBatchId,
        projectId: formProjectId || currentProject?.id || '',
        projectName: projName,
        date: deliveryDate,
        day: getDayOfWeek(deliveryDate),
        itemName: item.materialItem.trim(),
        supplier: item.supplier.trim(),
        quantity: item.deliveredQuantity.trim(),
        totalCost: cleanAmount,
        notes: item.description.trim(),
        photos: item.receiptPhotos || [],
        status: 'Verified & Stored',
        receivedBy: 'Site Storekeeper',
        deliveryNoteNo: `DEL-${Math.floor(10000 + Math.random() * 90000)}`
      };
    });

    const updated = [...newEntries, ...customDeliveries];
    setCustomDeliveries(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast(`${newEntries.length} material item${newEntries.length > 1 ? 's' : ''} verified & recorded!`);
    setIsAddModalOpen(false);

    // Reset modal form state
    setItems([
      {
        materialItem: '',
        supplier: '',
        deliveredQuantity: '',
        totalAmount: '',
        description: '',
        receiptPhotos: []
      }
    ]);
    setDeliveryDate(getLocalToday());
  };

  const handleDeleteCustomDelivery = (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery record?')) return;
    const updated = customDeliveries.filter((d) => d.id !== id);
    setCustomDeliveries(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    addToast && addToast('Delivery record removed', 'success');
  };

  // Compile all deliveries from Material Requests + custom entries
  const allDeliveries = useMemo(() => {
    const list = [...customDeliveries];

    (materialRequests || []).forEach((req) => {
      if (
        selectedProjectId !== 'all' &&
        req.project_id &&
        req.project_id !== selectedProjectId &&
        req.project_id !== currentProject?.id
      ) {
        return;
      }

      // Check request items
      if (Array.isArray(req.items)) {
        req.items.forEach((item, idx) => {
          if (item.supplier_vendor || item.delivery_notes || req.status === 'fulfilled') {
            const qtyStr = item.quantity ? `${item.quantity} ${item.unit || 'units'}` : '1 unit';
            const rate = Number(item.estimated_unit_cost || 0);
            const qtyNum = Number(item.quantity || 1);

            let photos = [];
            if (item.receipt_photos) {
              try {
                photos = typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos) : item.receipt_photos;
              } catch (e) {
                photos = [];
              }
            }

            const rawDate = (req.date_needed || req.created_at || '').split('T')[0];

            list.push({
              id: `req-deliv-${req.id}-${idx}`,
              projectId: req.project_id,
              projectName: req.project_name || currentProject?.name,
              itemName: item.item_name || 'Site Material Delivery',
              supplier: item.supplier_vendor || 'Approved Site Supplier',
              quantity: qtyStr,
              totalCost: qtyNum * rate,
              deliveryNoteNo: req.request_number ? `DEL-${req.request_number}` : 'DN-VERIFIED',
              status: req.status === 'fulfilled' ? 'Verified & Stored' : 'Delivered to Site',
              receivedBy: req.requested_by_name || 'Storekeeper',
              notes: item.delivery_notes || item.notes || req.notes || '',
              date: rawDate,
              day: getDayOfWeek(rawDate),
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
        (d.deliveryNoteNo && d.deliveryNoteNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.notes && d.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.quantity && String(d.quantity).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSupplier =
        selectedSupplier === 'all' || d.supplier === selectedSupplier;

      return matchesSearch && matchesSupplier;
    });
  }, [allDeliveries, searchTerm, selectedSupplier]);

  // Summary KPIs (Shipments Received, Active Suppliers, Verified Stock Value)
  const summary = useMemo(() => {
    const count = allDeliveries.length;
    const totalValue = allDeliveries.reduce((acc, d) => acc + (Number(d.totalCost) || 0), 0);
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
            Log of incoming construction supplies, quantities, receipts, and warehouse intake for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            setFormProjectId(
              selectedProjectId && selectedProjectId !== 'all'
                ? selectedProjectId
                : (currentProject?.id || (projects && projects[0]?.id) || '')
            );
            setDeliveryDate(getLocalToday());
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Record Material Delivery</span>
        </button>
      </div>

      {/* KPI Cards: Shipments Received, Active Suppliers & Verified Stock Value */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Shipments Received */}
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

        {/* Card 2: Active Suppliers */}
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

        {/* Card 3: Verified Stock Value */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Stock Value</span>
            <Boxes className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 font-mono">
            {formatKES(summary.totalValue)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Delivered materials inventory value</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deliveries by item, supplier, quantity, notes..."
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
                  <th className="py-3 px-4">Project Site</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Delivered Quantity</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Material Description</th>
                  <th className="py-3 px-4">Receipts / Invoices</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((deliv) => (
                  <tr key={deliv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Material Item & Date */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-start gap-2.5">
                        <Boxes className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-slate-900 font-bold">{deliv.itemName}</div>
                          {deliv.date && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{deliv.date}</span>
                              {deliv.day && (
                                <span className="bg-amber-50 text-amber-800 font-bold px-1 rounded text-[9px] border border-amber-200">
                                  {deliv.day}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Project Site */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate max-w-[130px]">{deliv.projectName || currentProject?.name || 'Site'}</span>
                      </div>
                    </td>

                    {/* Supplier / Vendor */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {deliv.supplier}
                    </td>

                    {/* Delivered Quantity */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 text-xs">
                        {deliv.quantity}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-700">
                      {deliv.totalCost ? formatKES(deliv.totalCost) : '—'}
                    </td>

                    {/* Material Description */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      <p className="truncate text-xs" title={deliv.notes}>
                        {deliv.notes || '—'}
                      </p>
                    </td>

                    {/* Receipts / Invoices Photos */}
                    <td className="py-3.5 px-4">
                      {deliv.photos && deliv.photos.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {deliv.photos.slice(0, 3).map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setPreviewPhoto(p.url)}
                              className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 cursor-pointer shadow-2xs"
                              title={p.name || 'View Receipt'}
                            >
                              <img src={p.url} alt="Receipt" className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            </button>
                          ))}
                          {deliv.photos.length > 3 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-1 rounded">
                              +{deliv.photos.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No photos</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {deliv.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {deliv.id.startsWith('deliv-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomDelivery(deliv.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete delivery"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Material Delivery */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl my-6 rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6 bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Material Delivery</h3>
                  <p className="text-xs text-slate-500">Log incoming site materials, quantities, amounts, and receipts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDelivery} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Top Row: PROJECT SITE, DATE, DAY */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Project Site */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    PROJECT SITE <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formProjectId}
                      onChange={(e) => setFormProjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 appearance-none focus:border-amber-500 focus:outline-hidden"
                      required
                    >
                      {projects && projects.length > 0 ? (
                        projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))
                      ) : (
                        <option value={currentProject?.id || 'default'}>
                          {currentProject?.name || 'Main Site'}
                        </option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      DELIVERY DATE <span className="text-rose-500">*</span>
                    </label>
                    {deliveryDate && (
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                        {getDayOfWeek(deliveryDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Day */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    DAY OF WEEK
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs font-bold text-amber-900 shadow-2xs">
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide truncate">
                      {getDayOfWeek(deliveryDate) || '—'}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 italic">Auto-assigned</p>
                </div>
              </div>

              {/* Subform Section: MATERIAL ITEMS RECEIVED */}
              <div className="rounded-2xl border-2 border-amber-400/80 bg-amber-50/20 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                      Material Items Received ({items.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* Subforms list */}
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs"
                    >
                      {/* Subform Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-amber-600" />
                          <span>MATERIAL ITEM #{idx + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Material Item & Supplier/Vendor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Material Item <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Simba Portland Cement 42.5N, High-Yield Rebar..."
                            value={item.materialItem}
                            onChange={(e) => handleUpdateItem(idx, 'materialItem', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Supplier / Vendor <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Bamburi Cement Limited, Apex Steel Mills"
                            value={item.supplier}
                            onChange={(e) => handleUpdateItem(idx, 'supplier', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-colors"
                          />
                        </div>
                      </div>

                      {/* Delivered Quantity & Total Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Delivered Quantity <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 5 tonnes of sand, 500 bags of cement, 120 bars..."
                            value={item.deliveredQuantity}
                            onChange={(e) => handleUpdateItem(idx, 'deliveredQuantity', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Total Amount (KES)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 300,000"
                            value={item.totalAmount}
                            onChange={(e) => handleUpdateItem(idx, 'totalAmount', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-colors"
                          />
                        </div>
                      </div>

                      {/* Material Description Paragraph Box */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Material Description (Paragraph)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Condition upon arrival, storage bay allocation, offloading notes, quality checks..."
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-colors resize-y"
                        />
                      </div>

                      {/* Take Photo or Choose from Gallery Feature in Subform */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                            <span>Receipts / Invoices</span>
                          </label>

                          {item.receiptPhotos && item.receiptPhotos.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>{item.receiptPhotos.length} photo{item.receiptPhotos.length > 1 ? 's' : ''} attached</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Take Photo */}
                          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                            <Camera className="h-3.5 w-3.5 text-slate-500" />
                            <span>Take Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleReceiptPhotoUpload(idx, e)}
                              className="hidden"
                            />
                          </label>

                          {/* Choose from Gallery */}
                          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                            <Upload className="h-3.5 w-3.5 text-slate-500" />
                            <span>Choose from Gallery</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleReceiptPhotoUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Thumbnails preview */}
                        {item.receiptPhotos && item.receiptPhotos.length > 0 && (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1.5">
                            {item.receiptPhotos.map((photo, pIdx) => (
                              <div
                                key={pIdx}
                                className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.name || 'Receipt'}
                                  className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setPreviewPhoto(photo.url)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReceiptPhoto(idx, pIdx)}
                                  className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-rose-600 transition-colors"
                                  title="Remove photo"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Plus button to add other material items */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>+ Add Another Material Item</span>
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <span>Verify & Save Delivery</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-rose-600 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Receipt Preview"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsReceivedPage;
