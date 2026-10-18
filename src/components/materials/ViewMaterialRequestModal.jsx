import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import { generateMaterialRequestPDF } from '../../utils/pdfGenerator';
import { getDayOfWeek } from '../../utils/formatters';
import {
  Boxes,
  Calendar,
  User,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRightLeft,
  Image as ImageIcon,
  Download,
  Building2,
  Check,
  Edit,
  ExternalLink,
  Lock
} from 'lucide-react';

export const ViewMaterialRequestModal = ({ requestId, isOpen, onClose, onEdit }) => {
  const {
    updateMaterialRequestStatus,
    isAdmin,
    isDirector,
    isPartner,
    isStoreKeeper,
    companySettings,
    currentUser
  } = useApp();
  const [requestData, setRequestData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isOlderThan24Hours = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    return (Date.now() - createdTime) / (1000 * 60 * 60) > 24;
  };

  const isStorekeeperExpired = isStoreKeeper && isOlderThan24Hours(requestData?.created_at);
  const canApprove = isAdmin || isDirector || isPartner;
  const canEdit = canApprove || (isStoreKeeper ? !isStorekeeperExpired : !isOlderThan24Hours(requestData?.created_at));

  useEffect(() => {
    if (!isOpen || !requestId) return;
    setIsLoading(true);
    setError('');

    api.materialRequests.getById(requestId)
      .then((data) => {
        setRequestData(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load request details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, requestId]);

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateMaterialRequestStatus(requestId, newStatus);
      setRequestData((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!requestData) return;
    setIsGeneratingPdf(true);
    try {
      const doc = generateMaterialRequestPDF({
        project: {
          name: requestData.project_name,
          code: requestData.project_code,
          location: requestData.project_location
        },
        request: requestData,
        companySettings,
        author: { name: requestData.requested_by_name }
      });
      doc.save(`Material_Log_${requestData.request_number || requestId}_${requestData.date_needed || 'record'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const sitePhotos = Array.isArray(requestData?.site_photos)
    ? requestData.site_photos
    : (typeof requestData?.site_photos === 'string' ? JSON.parse(requestData.site_photos || '[]') : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
              <Boxes className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {requestData?.request_number || 'Material Requisition'}
                </h2>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-800">
                  {requestData?.project_code || 'SITE'}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  requestData?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : requestData?.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : requestData?.status === 'fulfilled'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {requestData?.status || 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {requestData?.project_name || 'Project Site'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading material log details...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
              {error}
            </div>
          ) : requestData ? (
            <>
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      <span>Log Date</span>
                    </span>
                    {requestData.date_needed && (
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        {getDayOfWeek(requestData.date_needed)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    {requestData.date_needed}
                  </div>
                  {requestData.date_needed && (
                    <div className="mt-1 text-[11px] font-semibold text-slate-600">
                      {getDayOfWeek(requestData.date_needed)}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <User className="h-3.5 w-3.5 text-amber-500" />
                    <span>Logged By</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {requestData.requested_by_name}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>Project Site</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {requestData.project_name}
                  </div>
                </div>
              </div>

              {/* Site Progress (if recorded) */}
              {requestData.site_progress && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-emerald-800 tracking-wider mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span>Site Progress Observation</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {requestData.site_progress}
                  </p>
                </div>
              )}

              {/* Site Photos & Evidence (if recorded) */}
              {sitePhotos.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                        Site Photos & Evidence ({sitePhotos.length})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {sitePhotos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setPreviewImage(photo.url)}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 hover:opacity-90 cursor-pointer"
                      >
                        <img src={photo.url} alt={photo.name || 'Site Photo'} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 1: Materials Received Today */}
              <div className="rounded-2xl border-2 border-amber-400/80 bg-amber-50/15 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                      Materials Received Today ({requestData.items?.length || 0})
                    </h3>
                  </div>
                </div>

                {requestData.items && requestData.items.length > 0 ? (
                  <div className="space-y-3">
                    {requestData.items.map((item, idx) => {
                      const receipts = Array.isArray(item.receipt_photos)
                        ? item.receipt_photos
                        : (typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos || '[]') : []);

                      return (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block mb-0.5">
                                ITEM #{idx + 1}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{item.item_name}</h4>
                            </div>
                            {item.supplier_vendor && (
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Supplier</span>
                                <span className="text-xs font-semibold text-slate-700">{item.supplier_vendor}</span>
                              </div>
                            )}
                          </div>

                          {(item.delivery_notes || item.notes) && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">Delivery Notes: </span>
                              {item.delivery_notes || item.notes}
                            </div>
                          )}

                          {receipts && receipts.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mb-2">
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>{receipts.length} receipt photo{receipts.length > 1 ? 's' : ''} attached</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {receipts.map((rec, rIdx) => (
                                   <button
                                    key={rIdx}
                                    type="button"
                                    onClick={() => setPreviewImage(rec.url)}
                                    className="group relative rounded-lg overflow-hidden border border-slate-200 h-14 w-14 bg-slate-100 hover:opacity-90 cursor-pointer"
                                  >
                                    <img src={rec.url} alt={rec.name || 'Receipt'} className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">No material items logged for today.</p>
                )}
              </div>

              {/* Section 2: Materials Needed Tomorrow */}
              {(requestData.materials_needed_tomorrow || requestData.notes) && (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/20 p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                      Materials Needed Tomorrow
                    </h3>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-blue-100 whitespace-pre-wrap">
                    {requestData.materials_needed_tomorrow || requestData.notes}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 border-t border-slate-100">
          {/* Download PDF button at bottom */}
          <div>
            <button
              type="button"
              disabled={isGeneratingPdf || !requestData}
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-amber-400" />
              )}
              <span>Download PDF</span>
            </button>
          </div>

          {/* Right Action buttons: Edit, Approve/Reject, Close */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(requestData);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-amber-600" />
                <span>Edit Record</span>
              </button>
            )}

            {isStorekeeperExpired && requestData?.created_by === currentUser?.id && (
              <span
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 select-none"
                title="Editing locked: 24 hours have passed since creation (Storekeepers can only edit within 24 hours)"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Editing Locked (&gt;24h)</span>
              </span>
            )}

            {canApprove && requestData?.status === 'pending' && (
              <>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('rejected')}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('approved')}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Photo Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMaterialRequestModal;
