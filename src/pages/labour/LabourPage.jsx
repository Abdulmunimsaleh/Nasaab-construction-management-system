import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NewLaeFormModal } from '../../components/labour/NewLaeFormModal';
import { ViewLaeFormModal } from '../../components/labour/ViewLaeFormModal';
import { SubcontractPieceWorkView } from '../../components/labour/SubcontractPieceWorkView';
import api from '../../services/api';
import { generateLaeFormPDF, generateDailyLabourSummaryPDF } from '../../utils/pdfGenerator';
import { getDayOfWeek, formatKES } from '../../utils/formatters';
import {
  HardHat,
  Users,
  Activity,
  Truck,
  Plus,
  Calendar,
  Eye,
  Trash2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Edit3,
  Download,
  Loader2,
  Lock,
  Clock,
  Briefcase,
  CheckCircle2,
  X,
  ChevronRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export const LabourPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    laeForms,
    currentProject,
    selectedProjectId,
    projects,
    deleteLaeForm,
    isStoreKeeper,
    isForeman,
    isAdmin,
    isDirector,
    isPartner,
    isLabourRestricted,
    companySettings,
    addToast
  } = useApp();

  // If partner is restricted from labour on SeaCrest
  if (isLabourRestricted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4 shadow-sm">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Labour Section Restricted</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Access to the labour and workforce section on the SeaCrest project site is restricted for your partner account.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Mode: 'daily' vs 'subcontract'
  const isSubcontractInitial = location.pathname.includes('/subcontract');
  const [activeTab, setActiveTab] = useState(isSubcontractInitial ? 'subcontract' : 'daily');

  // Keep tab synced with URL if route changes
  React.useEffect(() => {
    if (location.pathname.includes('/subcontract')) {
      setActiveTab('subcontract');
    } else if (location.pathname.includes('/daily')) {
      setActiveTab('daily');
    }
  }, [location.pathname]);

  // Helper to check if 24 hours have passed since submission/creation
  const isOlderThan24Hours = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenEdit = async (formSummary) => {
    // 24-hour edit window strictly enforced for foremen
    if (isForeman && isOlderThan24Hours(formSummary.created_at)) {
      addToast && addToast('Edit window expired: Foremen can only edit labour reports within 24 hours of submission.', 'warning');
      return;
    }

    try {
      const fullData = await api.laeForms.getById(formSummary.id);
      setEditingForm(fullData);
      setIsNewModalOpen(true);
    } catch (err) {
      setEditingForm(formSummary);
      setIsNewModalOpen(true);
    }
  };

  const handleDownloadDirectPDF = async (formSummary) => {
    try {
      setDownloadingId(formSummary.id);
      const fullData = await api.laeForms.getById(formSummary.id);
      const doc = generateLaeFormPDF({
        project: {
          name: fullData.project_name || currentProject?.name,
          code: fullData.project_code || currentProject?.code,
          location: fullData.project_location || currentProject?.location
        },
        form: fullData,
        companySettings,
        author: { name: fullData.prepared_by_name }
      });
      doc.save(`Labour_Report_${fullData.form_number || fullData.id}_${fullData.date || 'record'}.pdf`);
      addToast && addToast('PDF downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      addToast && addToast('Failed to generate PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSiteDailyLabourPDF = () => {
    try {
      const activeProj = currentProject || (selectedProjectId !== 'all' ? (projects || []).find((p) => p.id === selectedProjectId) : null) || { name: 'All Sites Combined', code: 'ALL' };
      const doc = generateDailyLabourSummaryPDF({
        project: activeProj,
        forms: filteredForms,
        companySettings
      });
      const fileCode = (activeProj.code || activeProj.name || 'Site').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Daily_Labour_Report_${fileCode}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast && addToast('Daily Labour PDF report downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate daily labour PDF:', err);
      addToast && addToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

  // Storekeeper barrier: Storekeepers are strictly forbidden from Labour
  if (isStoreKeeper) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-rose-300 leading-relaxed">
          Storekeepers are restricted from accessing Labour and Equipment forms. Please navigate to the Material Requests module.
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

  const isFormToday = (f) => {
    if (!f) return false;
    const fDate = (f.date || '').split('T')[0];
    const fCreated = (f.created_at || '').split('T')[0];
    return fDate === todayStr || fCreated === todayStr;
  };

  const todayForm = (laeForms || []).find((f) =>
    isFormToday(f) && (selectedProjectId === 'all' || f.project_id === selectedProjectId || f.project_id === currentProject?.id)
  );

  const filteredForms = (laeForms || []).filter((f) =>
    (f.form_number && f.form_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.prepared_by_name && f.prepared_by_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.date && f.date.includes(searchTerm)) ||
    (f.general_notes && f.general_notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  return (
    <div className="space-y-6">
      {/* Mode Navigation Tabs (Subcontract PW vs Daily) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setActiveTab('subcontract');
            navigate('/labour/subcontract');
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subcontract'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Subcontract (Piece Work)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('daily');
            navigate('/labour/daily');
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Daily Labour (Shift Forms & Headcount)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: SUBCONTRACT (PW) VIEW                            */}
      {/* ======================================================== */}
      {activeTab === 'subcontract' && (
        <SubcontractPieceWorkView />
      )}

      {/* ======================================================== */}
      {/* MODE 2: DAILY LABOUR FORMS VIEW (EXISTING FUNCTIONALITY) */}
      {/* ======================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                  Site Workforce
                </span>
                <span className="text-xs text-slate-400">• Trade Operations</span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <HardHat className="h-7 w-7 text-amber-500" />
                <span>Daily Labour & Workforce Management</span>
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Comprehensive control of daily casual trade labour, shift headcounts, and verified rates for{' '}
                <strong className="text-slate-800">{currentProject?.name}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleDownloadSiteDailyLabourPDF}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                title="Download consolidated Daily Labour PDF report for this site"
              >
                <Download className="h-4 w-4 text-slate-600" />
                <span>Download PDF</span>
              </button>
              {todayForm ? (
                <button
                  onClick={() => handleOpenEdit(todayForm)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  title="Today's daily form has already been submitted. Click to edit and update."
                >
                  <Edit3 className="h-4 w-4 stroke-[2.5]" />
                  <span>Edit Today's Form ({todayForm.form_number})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingForm(null);
                    setIsNewModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>+ New Daily Labour Form</span>
                </button>
              )}
            </div>
          </div>
          {/* Notice if today's form already exists */}
          {todayForm && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-800">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Today's Daily Form Logged ({todayForm.form_number})
                  </h4>
                  <p className="mt-0.5 text-xs text-amber-800">
                    A Labour, Activity & Equipment form was submitted today by <strong>{todayForm.prepared_by_name}</strong>. Only 1 form per day is permitted per project. Team members can edit and update this form.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenEdit(todayForm)}
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
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted Forms</span>
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
                {laeForms.length}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Total verified site forms for project</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Site</span>
                <HardHat className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-base font-bold text-slate-900 truncate">
                {currentProject?.name || 'All Sites'}
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">{currentProject?.location}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trade Pay Scale</span>
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700 space-y-0.5">
                <div>Foreman: KES 1,500 / day</div>
                <div>Skilled Trades: KES 1,000 / day</div>
                <div>Unskilled Helpers: KES 500 / day</div>
              </div>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Form Number, Date, Prepared By..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredForms.length} of {laeForms.length} forms
            </div>
          </div>

          {/* Forms Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {filteredForms.length === 0 ? (
              <div className="py-16 text-center">
                <HardHat className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Daily Labour Forms Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  There are no form records saved in MySQL for this project yet. Use the button below to submit the first daily construction record.
                </p>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Form</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Form Ref</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Site / Project</th>
                      <th className="py-3 px-4">Prepared By</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Edit</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredForms.map((form) => (
                      <tr key={form.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-500" />
                          <span>{form.form_number}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{getDayOfWeek(form.date)}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold uppercase border border-amber-200">
                              Day
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{form.date}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{form.project_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{form.project_code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {form.prepared_by_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                            {form.status || 'Submitted'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isForeman && isOlderThan24Hours(form.created_at) ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none shadow-2xs"
                              title="Editing locked: 24 hours have passed since submission (Foremen can only edit within 24 hours)"
                            >
                              <Lock className="h-3 w-3 text-slate-400" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenEdit(form)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/90 px-2.5 py-1 text-[11px] font-bold text-amber-800 transition-colors cursor-pointer shadow-2xs"
                              title="Edit Daily Report"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedFormId(form.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-amber-500" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDownloadDirectPDF(form)}
                              disabled={downloadingId === form.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                              title="Download PDF"
                            >
                              {downloadingId === form.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                              ) : (
                                <Download className="h-3.5 w-3.5 text-slate-600" />
                              )}
                              <span>PDF</span>
                            </button>
                            {(isAdmin || isDirector || isPartner) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete form ${form.form_number}?`)) {
                                    deleteLaeForm(form.id);
                                  }
                                }}
                                className="rounded-lg border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete Form"
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
        </div>
      )}



      {/* Modal 1: New / Edit Daily Form */}
      <NewLaeFormModal
        isOpen={isNewModalOpen}
        editData={editingForm}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingForm(null);
        }}
      />

      {/* Modal 2: View Form Detail */}
      <ViewLaeFormModal
        formId={selectedFormId}
        isOpen={Boolean(selectedFormId)}
        onClose={() => setSelectedFormId(null)}
        onEdit={(form) => {
          setSelectedFormId(null);
          setEditingForm(form);
          setIsNewModalOpen(true);
        }}
      />
    </div>
  );
};

export default LabourPage;
