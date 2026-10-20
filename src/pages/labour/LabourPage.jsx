import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NewLaeFormModal } from '../../components/labour/NewLaeFormModal';
import { ViewLaeFormModal } from '../../components/labour/ViewLaeFormModal';
import api from '../../services/api';
import { generateLaeFormPDF } from '../../utils/pdfGenerator';
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
    deleteLaeForm,
    isStoreKeeper,
    isForeman,
    isAdmin,
    isDirector,
    isPartner,
    companySettings,
    addToast
  } = useApp();

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

  // Subcontract (Piece Work - PW) State
  const subcontractStorageKey = `nasaab_subcontract_${selectedProjectId || 'default'}`;
  const [subcontracts, setSubcontracts] = useState(() => {
    try {
      const saved = localStorage.getItem(subcontractStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'pw-1',
        trade: 'Formwork Carpentry & Shuttering',
        subcontractor: 'M/S Al-Haq Structural Carpentry',
        leadPerson: 'Fundi Rashid Omar',
        scopeDescription: 'Fabrication and erection of marine plywood casing for 1st floor beams and suspended slab deck (Grid 1-8).',
        measurement: '550 m²',
        ratePerUnit: 450,
        agreedSum: 247500,
        amountPaid: 180000,
        workersOnSite: 8,
        status: 'Active',
        workDoneToday: 'Completed propping and soffit formwork for Beams B1 to B6.',
        workPlanTomorrow: 'Erect slab edge formwork and hand over to steel fixers.'
      },
      {
        id: 'pw-2',
        trade: 'Reinforcement Steel Fixing',
        subcontractor: 'M/S Coast Reinforcement Fixers',
        leadPerson: 'Fundi Juma Bakari',
        scopeDescription: 'Cutting, bending, and tying high-yield ribbed bars D16, D12, and D10 for columns and ground retaining beams.',
        measurement: '14.5 Tonnes',
        ratePerUnit: 12000,
        agreedSum: 174000,
        amountPaid: 120000,
        workersOnSite: 6,
        status: 'Active',
        workDoneToday: 'Tied main column starter bars and spiral shear links.',
        workPlanTomorrow: 'Position bottom mat rebar over Grid A-D suspended slab.'
      },
      {
        id: 'pw-3',
        trade: 'Masonry Walling (Coral Stone)',
        subcontractor: 'Mwangi & Sons Stone Masons',
        leadPerson: 'Fundi Peter Mwangi',
        scopeDescription: 'Laying 9x9 machine-cut stone walling in 1:4 cement-sand mortar with 20 gauge hoop iron bonding.',
        measurement: '820 Running Metres',
        ratePerUnit: 180,
        agreedSum: 147600,
        amountPaid: 147600,
        workersOnSite: 10,
        status: 'Completed',
        workDoneToday: 'Completed walling up to lintel beam level on external boundary.',
        workPlanTomorrow: 'Curing of masonry joints and clean up.'
      },
      {
        id: 'pw-4',
        trade: 'Electrical Conduit & Piping Subcontract',
        subcontractor: 'Kilindini Electrical Contractors',
        leadPerson: 'Technician Salim Hassan',
        scopeDescription: 'Laying heavy-gauge 25mm PVC conduits in slab deck, dropper boxes, and distribution board sleeves.',
        measurement: '72 Outlet Points',
        ratePerUnit: 850,
        agreedSum: 61200,
        amountPaid: 40000,
        workersOnSite: 3,
        status: 'Active',
        workDoneToday: 'Laid slab lighting loops and ceiling fan junction boxes.',
        workPlanTomorrow: 'Tie down conduit tubes with binding wire to rebar.'
      }
    ];
  });

  const [isNewSubcontractModalOpen, setIsNewSubcontractModalOpen] = useState(false);
  const [newSubcontract, setNewSubcontract] = useState({
    trade: '',
    subcontractor: '',
    leadPerson: '',
    scopeDescription: '',
    measurement: '',
    ratePerUnit: 0,
    agreedSum: 0,
    amountPaid: 0,
    workersOnSite: 4,
    status: 'Active',
    workDoneToday: '',
    workPlanTomorrow: ''
  });

  const handleSaveSubcontract = (e) => {
    e.preventDefault();
    if (!newSubcontract.trade.trim() || !newSubcontract.subcontractor.trim()) {
      addToast && addToast('Please enter trade and subcontractor name', 'error');
      return;
    }

    const item = {
      id: `pw-${Date.now()}`,
      ...newSubcontract,
      agreedSum: Number(newSubcontract.agreedSum) || 0,
      amountPaid: Number(newSubcontract.amountPaid) || 0,
      workersOnSite: Number(newSubcontract.workersOnSite) || 1
    };

    const updated = [item, ...subcontracts];
    setSubcontracts(updated);
    try {
      localStorage.setItem(subcontractStorageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    addToast && addToast('Subcontract (PW) record saved successfully!');
    setIsNewSubcontractModalOpen(false);
  };

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

  // Subcontract statistics
  const pwStats = useMemo(() => {
    const totalCount = subcontracts.length;
    const totalCommitted = subcontracts.reduce((acc, s) => acc + (s.agreedSum || 0), 0);
    const totalPaid = subcontracts.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const totalWorkers = subcontracts.reduce((acc, s) => acc + (s.workersOnSite || 0), 0);
    return { totalCount, totalCommitted, totalPaid, totalWorkers };
  }, [subcontracts]);

  const filteredSubcontracts = useMemo(() => {
    return subcontracts.filter((s) => {
      return (
        s.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subcontractor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.scopeDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.leadPerson.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [subcontracts, searchTerm]);

  return (
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
            <span>Labour & Workforce Management</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive control of daily casual trade labour, headcounts, rates, and subcontract piece-work (PW) contracts for{' '}
            <strong className="text-slate-800">{currentProject?.name}</strong>
          </p>
        </div>

        {activeTab === 'subcontract' ? (
          <button
            onClick={() => setIsNewSubcontractModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Add Subcontract (PW) Agreement</span>
          </button>
        ) : todayForm ? (
          <button
            onClick={() => handleOpenEdit(todayForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
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
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ New Daily Labour Form</span>
          </button>
        )}
      </div>

      {/* Mode Navigation Tabs (Subcontract PW vs Daily) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setActiveTab('subcontract');
            navigate('/labour/subcontract');
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subcontract'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Subcontract (PW) — Piece Work ({subcontracts.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('daily');
            navigate('/labour/daily');
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
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
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subcontracts</span>
                <Briefcase className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
                {pwStats.totalCount} Agreements
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Carpentry, steel, masonry & electrical</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PW Workforce on Site</span>
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-indigo-600 font-mono">
                {pwStats.totalWorkers} Operatives
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Total piece-work crew headcounts</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Committed Sum</span>
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">
                {formatKES(pwStats.totalCommitted)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Contractual piece-work value</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid to Date</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
                {formatKES(pwStats.totalPaid)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Balance: {formatKES(pwStats.totalCommitted - pwStats.totalPaid)}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by trade, subcontractor, or scope description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredSubcontracts.length} of {subcontracts.length} agreements
            </div>
          </div>

          {/* Subcontract Cards / Table */}
          <div className="space-y-3">
            {filteredSubcontracts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Subcontract Agreements Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Add piece-work crews, contract rates, and milestone scopes to manage Subcontract (PW) labour.
                </p>
                <button
                  onClick={() => setIsNewSubcontractModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Subcontract (PW) Agreement</span>
                </button>
              </div>
            ) : (
              filteredSubcontracts.map((pw) => (
                <div
                  key={pw.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {pw.trade}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            pw.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {pw.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Crew: {pw.workersOnSite} on site
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        {pw.subcontractor}
                      </h3>
                      <div className="text-xs text-slate-500">
                        Lead: <strong className="text-slate-700">{pw.leadPerson}</strong> • Scope: {pw.measurement}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-medium">Agreed Contract Sum</div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        {formatKES(pw.agreedSum)}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-mono font-semibold">
                        Paid: {formatKES(pw.amountPaid)} • Balance: {formatKES(pw.agreedSum - pw.amountPaid)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong className="text-slate-900">Task Scope: </strong>
                    {pw.scopeDescription}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {pw.workDoneToday && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
                        <div className="font-bold text-emerald-900">Work Accomplished:</div>
                        <div className="text-emerald-800 mt-0.5">{pw.workDoneToday}</div>
                      </div>
                    )}
                    {pw.workPlanTomorrow && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-2.5">
                        <div className="font-bold text-amber-900">Tomorrow's Milestone:</div>
                        <div className="text-amber-800 mt-0.5">{pw.workPlanTomorrow}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: DAILY LABOUR FORMS VIEW (EXISTING FUNCTIONALITY) */}
      {/* ======================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
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

      {/* Modal: Add Subcontract (PW) Agreement */}
      {isNewSubcontractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Subcontract (PW) Agreement</h3>
                  <p className="text-[11px] text-slate-500">Record piece-work crew for {currentProject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSubcontractModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcontract} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trade Specialty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reinforcement Steel Fixing, Formwork Carpentry, Masonry"
                  value={newSubcontract.trade}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, trade: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subcontractor Firm / Team <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M/S Coast Reinforcement"
                    value={newSubcontract.subcontractor}
                    onChange={(e) => setNewSubcontract({ ...newSubcontract, subcontractor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fundi / Team Leader Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fundi Rashid Omar"
                    value={newSubcontract.leadPerson}
                    onChange={(e) => setNewSubcontract({ ...newSubcontract, leadPerson: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contract Scope of Work / BOQ Reference
                </label>
                <textarea
                  rows="2"
                  placeholder="Describe exact area, elements, and measured deliverables..."
                  value={newSubcontract.scopeDescription}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, scopeDescription: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Measurement / Scope
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 450 m², 12 Tonnes"
                    value={newSubcontract.measurement}
                    onChange={(e) => setNewSubcontract({ ...newSubcontract, measurement: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Agreed Sum (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contract sum"
                    value={newSubcontract.agreedSum}
                    onChange={(e) => setNewSubcontract({ ...newSubcontract, agreedSum: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Workers on Site
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSubcontract.workersOnSite}
                    onChange={(e) => setNewSubcontract({ ...newSubcontract, workersOnSite: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSubcontractModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
                >
                  Save Agreement
                </button>
              </div>
            </form>
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
