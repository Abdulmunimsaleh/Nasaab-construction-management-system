import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import { generateLaeFormPDF } from '../../utils/pdfGenerator';
import { getDayOfWeek } from '../../utils/formatters';
import {
  HardHat,
  Users,
  Truck,
  Calendar,
  User,
  X,
  Loader2,
  FileText,
  Download,
  Building2,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Image as ImageIcon,
  ExternalLink,
  Edit,
  TrendingUp,
  Lock
} from 'lucide-react';

export const ViewLaeFormModal = ({ formId, isOpen, onClose, onEdit }) => {
  const { isAdmin, isDirector, isPartner, isForeman, companySettings, currentUser } = useApp();
  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isOlderThan24Hours = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const isPrivileged = isAdmin || isDirector || isPartner;
  const isForemanLocked = isForeman && isOlderThan24Hours(formData?.created_at);
  const canEdit = isPrivileged || (isForeman && !isForemanLocked) || (!isForemanLocked && formData && formData.prepared_by_id === currentUser?.id);

  useEffect(() => {
    if (!isOpen || !formId) return;
    setIsLoading(true);
    setError('');

    api.laeForms.getById(formId)
      .then((data) => {
        setFormData(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load form details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, formId]);

  const handleDownloadPDF = async () => {
    if (!formData) return;
    setIsGeneratingPdf(true);
    try {
      const doc = generateLaeFormPDF({
        project: {
          name: formData.project_name,
          code: formData.project_code,
          location: formData.project_location
        },
        form: formData,
        companySettings,
        author: { name: formData.prepared_by_name }
      });
      doc.save(`Labour_Report_${formData.form_number || formId}_${formData.date || 'record'}.pdf`);
    } catch (err) {
      console.error('Failed to generate LAE PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const labourItems = formData?.labourItems || [];
  const equipmentItems = formData?.equipmentItems || [];
  const sitePhotos = Array.isArray(formData?.site_photos)
    ? formData.site_photos
    : (typeof formData?.site_photos === 'string' ? JSON.parse(formData.site_photos || '[]') : []);

  const totalWorkers = labourItems.reduce((acc, t) => {
    return acc + (Number(t.foreman_count) || 0) + (Number(t.skilled_count) || 0) + (Number(t.unskilled_count) || 0);
  }, 0);

  const totalLabourCost = labourItems.reduce((acc, t) => {
    if (t.total_cost !== undefined && t.total_cost !== null && Number(t.total_cost) > 0) {
      return acc + Number(t.total_cost);
    }
    const fRate = Number(t.foreman_rate) || 1500;
    const sRate = Number(t.skilled_rate) || 1000;
    const uRate = Number(t.unskilled_rate) || 500;
    return acc + (Number(t.foreman_count || 0) * fRate) + (Number(t.skilled_count || 0) * sRate) + (Number(t.unskilled_count || 0) * uRate);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
              <HardHat className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {formData?.form_number || 'Labour & Equipment Form'}
                </h2>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-800">
                  {formData?.project_code || 'SITE'}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${formData?.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : formData?.status === 'draft'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                  }`}>
                  {formData?.status || 'Submitted'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official daily site diary — {formData?.project_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading form details...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
              {error}
            </div>
          ) : formData ? (
            <>
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      <span>Report Date</span>
                    </span>
                    {formData.date && (
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        {getDayOfWeek(formData.date)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono">{formData.date}</div>
                  {formData.date && (
                    <div className="mt-1 text-[11px] font-semibold text-slate-600">
                      {getDayOfWeek(formData.date)}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <User className="h-3.5 w-3.5 text-amber-500" />
                    <span>Prepared By</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">{formData.prepared_by_name}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Site Progress</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 font-mono">
                    {formData.estimated_site_progress || 0}% Completed
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>Site / Project</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">{formData.project_name}</div>
                </div>
              </div>

              {/* SECTION 1: LABOUR & WORKFORCE */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/15 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                      Labour & Workforce ({labourItems.length} Categories)
                    </h3>
                  </div>
                </div>

                {labourItems.length > 0 ? (
                  <div className="space-y-3.5">
                    {labourItems.map((trade, idx) => {
                      const fCount = Number(trade.foreman_count) || 0;
                      const sCount = Number(trade.skilled_count) || 0;
                      const uCount = Number(trade.unskilled_count) || 0;
                      const fRate = Number(trade.foreman_rate) || 1500;
                      const sRate = Number(trade.skilled_rate) || 1000;
                      const uRate = Number(trade.unskilled_rate) || 500;

                      const headCount = fCount + sCount + uCount || trade.number_of_workers || 0;
                      const cost = trade.total_cost !== undefined && trade.total_cost !== null && Number(trade.total_cost) > 0
                        ? Number(trade.total_cost)
                        : (fCount * fRate + sCount * sRate + uCount * uRate);

                      return (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded">
                                Trade #{idx + 1}
                              </span>
                              <span>{trade.trade}</span>
                            </h4>
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <span>Headcount: <strong>{headCount}</strong></span>
                              <span>•</span>
                              <span>Est. Cost: <strong>KES {cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                            </div>
                          </div>

                          {/* Headcount & Rates breakdown */}
                          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 font-semibold block">Foreman / Sup.</span>
                              <span className="font-bold text-slate-900 font-mono">{fCount} workers</span>
                              <span className="text-[10px] text-slate-400 block font-mono">@ KES {fRate.toLocaleString()}/day</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-semibold block">Skilled Workers</span>
                              <span className="font-bold text-slate-900 font-mono">{sCount} workers</span>
                              <span className="text-[10px] text-slate-400 block font-mono">@ KES {sRate.toLocaleString()}/day</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-semibold block">Unskilled / Helpers</span>
                              <span className="font-bold text-slate-900 font-mono">{uCount} workers</span>
                              <span className="text-[10px] text-slate-400 block font-mono">@ KES {uRate.toLocaleString()}/day</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">No labour categories recorded.</p>
                )}

                {/* Overall Labour Summary Dark Bar */}
                <div className="rounded-xl bg-slate-900 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <span className="text-xs font-black tracking-wider uppercase text-slate-200">
                    OVERALL LABOUR SUMMARY
                  </span>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase block">TOTAL WORKERS ON SITE</span>
                      <span className="text-lg font-black text-white font-mono">{totalWorkers}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase block">TOTAL EST. DAILY COST</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        KES {totalLabourCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 border-t border-slate-100">
          {/* Download PDF button at bottom */}
          <div>
            <button
              type="button"
              disabled={isGeneratingPdf || !formData}
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

          {/* Right Action buttons: Edit, Close */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isForemanLocked ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-400 select-none cursor-not-allowed shadow-2xs"
                title="Editing locked: 24 hours have passed since submission (Foremen can only edit within 24 hours)"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Locked (24h Expired)</span>
              </span>
            ) : canEdit && onEdit ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(formData);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <Edit className="h-3.5 w-3.5 text-amber-600" />
                <span>Edit Record</span>
              </button>
            ) : null}

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
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewLaeFormModal;
