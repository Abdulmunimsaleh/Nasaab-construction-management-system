import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NewMaterialRequestModal } from '../../components/materials/NewMaterialRequestModal';
import { ViewMaterialRequestModal } from '../../components/materials/ViewMaterialRequestModal';
import api from '../../services/api';
import { generateMaterialRequestPDF } from '../../utils/pdfGenerator';
import { getDayOfWeek } from '../../utils/formatters';
import {
  Boxes,
  Plus,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  FileText,
  Edit3,
  Download,
  Loader2,
  Lock
} from 'lucide-react';

export const MaterialsPage = () => {
  const {
    materialRequests,
    currentProject,
    selectedProjectId,
    deleteMaterialRequest,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    companySettings,
    currentUser,
    addToast
  } = useApp();

  // Helper to check if 24 hours have passed since creation
  const isOlderThan24Hours = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadDirectPDF = async (req) => {
    setDownloadingId(req.id);
    try {
      const fullReq = await api.materialRequests.getById(req.id);
      const doc = generateMaterialRequestPDF({
        project: {
          name: fullReq.project_name || currentProject?.name,
          code: fullReq.project_code || currentProject?.code,
          location: fullReq.project_location || currentProject?.location
        },
        request: fullReq,
        companySettings,
        author: { name: fullReq.requested_by_name || currentUser?.name }
      });
      doc.save(`Material_Log_${fullReq.request_number || req.id}_${fullReq.date_needed || 'record'}.pdf`);
      addToast && addToast('PDF report downloaded successfully!');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      addToast && addToast('Failed to generate PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Open modal in edit mode with full line items & details
  const handleOpenEdit = async (req) => {
    // 24-hour edit restriction strictly for storekeepers
    if (isStoreKeeper && isOlderThan24Hours(req.created_at)) {
      addToast && addToast('Edit window expired: Storekeepers can only edit requests within 24 hours of creation.', 'warning');
      return;
    }

    try {
      const fullData = await api.materialRequests.getById(req.id);
      setEditingRequest(fullData);
      setIsNewModalOpen(true);
    } catch (err) {
      // Fallback to local data
      setEditingRequest(req);
      setIsNewModalOpen(true);
    }
  };

  // Foreman barrier: Foremen are strictly forbidden from Materials
  if (isForeman) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-rose-300 leading-relaxed">
          Site Foremen are restricted from accessing Materials and Material Requests. Please navigate to the Labour, Activity & Equipment module.
        </p>
      </div>
    );
  }

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const isFormToday = (r) => {
    if (!r) return false;
    const rDate = (r.date_needed || '').split('T')[0];
    const rCreated = (r.created_at || '').split('T')[0];
    return rDate === todayStr || rCreated === todayStr;
  };

  const todayRequest = (materialRequests || []).find((r) =>
    isFormToday(r) && (selectedProjectId === 'all' || r.project_id === currentProject?.id)
  );

  const filteredRequests = (materialRequests || []).filter((r) => {
    const matchesSearch =
      (r.request_number && r.request_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.requested_by_name && r.requested_by_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.date_needed && r.date_needed.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = (materialRequests || []).filter((r) => r.status === 'pending').length;
  const approvedCount = (materialRequests || []).filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-amber-500" />
            <span>Material Needed Requests & Site Logs</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Dedicated records for materials received on site and requisitions needed for tomorrow — <strong className="text-slate-800">{currentProject?.name}</strong>.
          </p>
        </div>

        {todayRequest ? (
          <button
            onClick={() => handleOpenEdit(todayRequest)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
            title="Today's material form has already been submitted. Click to edit and update."
          >
            <Edit3 className="h-4 w-4 stroke-[2.5]" />
            <span>Edit Today's Form ({todayRequest.request_number})</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setEditingRequest(null);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ New Material Needed Request</span>
          </button>
        )}
      </div>

      {/* Notice if today's form already exists */}
      {todayRequest && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Today's Material Request Logged ({todayRequest.request_number})
              </h4>
              <p className="mt-0.5 text-xs text-amber-800">
                A Material Needed request was submitted today by <strong>{todayRequest.requested_by_name}</strong>. Only 1 form per day is permitted per project. Team members can edit and update this form.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenEdit(todayRequest)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Today's Form</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Logs & Requisitions</span>
            <Boxes className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {materialRequests.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total requests logged in database</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
            {pendingCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Awaiting management clearance</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Requests</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {approvedCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Cleared for procurement & delivery</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Request Number, Items, Requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {['all', 'pending', 'approved', 'rejected', 'fulfilled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Empty State */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center">
            <Boxes className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Material Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              There are no material logs saved for this project. Use the button below to submit a new material request.
            </p>
            <button
              onClick={() => {
                setEditingRequest(null);
                setIsNewModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Request</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Req #</th>
                  <th className="py-3 px-4">Site / Project</th>
                  <th className="py-3 px-4">Log Date</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4">Logged By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Edit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span>{req.request_number}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{req.project_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.project_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{getDayOfWeek(req.date_needed)}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold uppercase border border-amber-200">
                          Day
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{req.date_needed}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {req.total_items || 0} line items
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {req.requested_by_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : req.status === 'fulfilled'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    {/* Dedicated Edit column placed right between Status and Action */}
                    <td className="py-3.5 px-4 text-center">
                      {isStoreKeeper && isOlderThan24Hours(req.created_at) ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none shadow-2xs"
                          title="Editing locked: 24 hours have passed since creation (Storekeepers can only edit within 24 hours)"
                        >
                          <Lock className="h-3 w-3 text-slate-400" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(req)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/90 px-2.5 py-1 text-[11px] font-bold text-amber-800 transition-colors cursor-pointer shadow-2xs"
                          title="Edit Request"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRequestId(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-500" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDirectPDF(req)}
                          disabled={downloadingId === req.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-slate-600" />
                          )}
                          <span>PDF</span>
                        </button>
                        {(isAdmin || isDirector || isPartner) && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete request ${req.request_number}?`)) {
                                deleteMaterialRequest(req.id);
                              }
                            }}
                            className="rounded-lg border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: New / Edit Material Request */}
      <NewMaterialRequestModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingRequest(null);
        }}
        editData={editingRequest}
      />

      {/* Modal 2: View Material Request Detail, Approval & Download PDF */}
      <ViewMaterialRequestModal
        requestId={selectedRequestId}
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        onEdit={(req) => {
          setEditingRequest(req);
          setIsNewModalOpen(true);
        }}
      />
    </div>
  );
};

export default MaterialsPage;
