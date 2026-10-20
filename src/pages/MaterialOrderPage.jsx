import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart,
  Boxes,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  Eye,
  FileText,
  Download,
  AlertTriangle
} from 'lucide-react';
import { NewMaterialRequestModal } from '../components/materials/NewMaterialRequestModal';
import { ViewMaterialRequestModal } from '../components/materials/ViewMaterialRequestModal';
import { generateMaterialRequestPDF } from '../utils/pdfGenerator';

export const MaterialOrderPage = () => {
  const {
    materialRequests,
    currentProject,
    selectedProjectId,
    companySettings,
    currentUser,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Filter material requests for current project
  const filteredOrders = useMemo(() => {
    return (materialRequests || []).filter((req) => {
      if (selectedProjectId !== 'all' && req.project_id && req.project_id !== selectedProjectId && req.project_id !== currentProject?.id) {
        return false;
      }

      const matchesSearch =
        (req.request_number && req.request_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.requested_by_name && req.requested_by_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.notes && req.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (Array.isArray(req.items) && req.items.some((i) => i.item_name && i.item_name.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesUrgency = urgencyFilter === 'all' || (req.urgency || '').toLowerCase() === urgencyFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || (req.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesUrgency && matchesStatus;
    });
  }, [materialRequests, selectedProjectId, currentProject, searchTerm, urgencyFilter, statusFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const list = materialRequests || [];
    const total = list.length;
    const pending = list.filter((r) => r.status === 'pending').length;
    const approved = list.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length;
    const critical = list.filter((r) => (r.urgency || '').toLowerCase() === 'critical').length;
    return { total, pending, approved, critical };
  }, [materialRequests]);

  const handleDownloadPDF = (req) => {
    try {
      const doc = generateMaterialRequestPDF({
        project: {
          name: req.project_name || currentProject?.name,
          code: req.project_code || currentProject?.code,
          location: req.project_location || currentProject?.location
        },
        request: req,
        companySettings,
        author: { name: req.requested_by_name || currentUser?.name }
      });
      doc.save(`Material_Order_${req.request_number || req.id}.pdf`);
      addToast && addToast('PDF order report downloaded!');
    } catch (err) {
      console.error(err);
      addToast && addToast('Failed to generate PDF', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Procurement & Requisitions
            </span>
            <span className="text-xs text-slate-400">• Orders Pipeline</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="h-7 w-7 text-amber-500" />
            <span>Material Orders & Requisitions</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Site material requisitions, purchase approval statuses, delivery dates, and authorized item orders for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Create Material Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.total}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total requisitions on file</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
            {stats.pending}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Awaiting management clearance</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved / Dispatched</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.approved}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Cleared for delivery</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Critical Priority</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-900 font-mono">
            {stats.critical}
          </div>
          <p className="mt-1 text-[11px] text-rose-700">Immediate dispatch required</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders by number, author, requested items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
            {['all', 'pending', 'approved', 'fulfilled'].map((s) => (
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

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Urgencies</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Material Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              There are no material requisition orders matching your search. Create the first order below.
            </p>
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Date Needed</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{req.request_number || `REQ-${req.id.slice(0, 6)}`}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{req.date_needed}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Logged {req.created_at ? req.created_at.split('T')[0] : 'Recently'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          (req.urgency || '').toLowerCase() === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : (req.urgency || '').toLowerCase() === 'urgent'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.urgency || 'Normal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : req.status === 'approved'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {req.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {Array.isArray(req.items) && req.items.length > 0 ? (
                        <div className="truncate max-w-xs font-medium">
                          {req.items.map((i) => `${i.item_name} (${i.quantity} ${i.unit || ''})`).join(', ')}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No line items listed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {req.requested_by_name || 'Storekeeper'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrderId(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-500" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(req)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-600" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Order */}
      <NewMaterialRequestModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
      />

      {/* Modal: View Order Detail */}
      <ViewMaterialRequestModal
        requestId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
};

export default MaterialOrderPage;
