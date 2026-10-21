import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Plus,
  Search,
  Filter,
  Layers,
  Building,
  CheckCircle2,
  ArrowUpDown,
  Trash2,
  Edit2,
  Eye,
  X,
  Banknote,
  Scale,
  Users,
  Calendar,
  Download,
  Save,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const SUBCONTRACT_TEAMS = [
  'Blocks & Plasta',
  'Casting',
  'Deshuttering',
  'Electrical',
  'Foreman',
  'Helpers',
  'Operator',
  'Painting',
  'Plumbing',
  'Scalfolding',
  'Steelwork',
  'Shuttering',
  'Supervisor',
  'Tiles',
  'Unskilled'
];

const AGREEMENTS_STORAGE_KEY = 'nasaab_subcontract_agreements_master';
const PAYMENTS_STORAGE_KEY = 'nasaab_subcontract_payments_master';

const formatKSh = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'KSh 0';
  return `KSh ${Number(amount).toLocaleString('en-US')}`;
};

const formatAmtOnly = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('en-US');
};

const getInitials = (name) => {
  if (!name) return 'SC';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const SubcontractPieceWorkView = () => {
  const { currentProject, selectedProjectId, projects, addToast } = useApp();

  const isCombinedView = !selectedProjectId || selectedProjectId === 'all';
  const defaultProjectId = selectedProjectId && selectedProjectId !== 'all'
    ? selectedProjectId
    : (currentProject?.id || projects[0]?.id || 'prj-majestic-palms');
  const defaultProjectName = currentProject?.name || projects[0]?.name || 'Majestic Palms';

  // -------------------------------------------------------------
  // 1. AGREEMENTS STATE & LOCALSTORAGE
  // -------------------------------------------------------------
  const [agreements, setAgreements] = useState(() => {
    try {
      const saved = localStorage.getItem(AGREEMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    // Default Seed Data matching exact screenshot figures:
    // Total Value: 900,000 | Total Paid: 250,000 | Outstanding: 650,000
    const p1Id = projects[0]?.id || 'prj-majestic-palms';
    const p1Name = projects[0]?.name || 'Majestic Palms';

    return [
      {
        id: 'sc-1',
        contractId: 'SC-2025-001',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Shuttering',
        foremanName: 'David Mwangi',
        contractDate: '2025-04-12',
        floor: 'Ground Floor',
        agreedAmount: 300000,
        totalPaid: 150000,
        paymentsCount: 2,
        notes: 'Columns, beams & deck casting propping',
        status: 'Partially Paid'
      },
      {
        id: 'sc-2',
        contractId: 'SC-2025-002',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Blocks & Plasta',
        foremanName: 'John Kamau',
        contractDate: '2025-04-18',
        floor: 'Ground Floor',
        agreedAmount: 250000,
        totalPaid: 100000,
        paymentsCount: 1,
        notes: 'Ground floor perimeter & division walling',
        status: 'Partially Paid'
      },
      {
        id: 'sc-3',
        contractId: 'SC-2025-003',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Shuttering',
        foremanName: 'David Mwangi',
        contractDate: '2025-05-02',
        floor: 'First Floor',
        agreedAmount: 350000,
        totalPaid: 0,
        paymentsCount: 0,
        notes: 'First floor slab deck shuttering & props',
        status: 'Active (Unpaid)'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(AGREEMENTS_STORAGE_KEY, JSON.stringify(agreements));
    } catch (e) {
      console.error(e);
    }
  }, [agreements]);

  // -------------------------------------------------------------
  // 2. PAYMENTS STATE & LOCALSTORAGE
  // -------------------------------------------------------------
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    const p1Id = projects[0]?.id || 'prj-majestic-palms';
    const p1Name = projects[0]?.name || 'Majestic Palms';

    return [
      {
        id: 'pay-1',
        paymentRef: 'PAY-WK16-01',
        agreementId: 'SC-2025-001',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Shuttering',
        floor: 'Ground Floor',
        weekPeriod: '12th Apr 2026 to 19th Apr 2026',
        contractAmount: 300000,
        paidThisWeek: 80000,
        cumulativePaid: 80000,
        remainingBalance: 220000,
        date: '2026-04-19'
      },
      {
        id: 'pay-2',
        paymentRef: 'PAY-WK17-02',
        agreementId: 'SC-2025-001',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Shuttering',
        floor: 'Ground Floor',
        weekPeriod: '19th Apr 2026 to 26th Apr 2026',
        contractAmount: 300000,
        paidThisWeek: 70000,
        cumulativePaid: 150000,
        remainingBalance: 150000,
        date: '2026-04-26'
      },
      {
        id: 'pay-3',
        paymentRef: 'PAY-WK17-03',
        agreementId: 'SC-2025-002',
        projectId: p1Id,
        projectName: p1Name,
        teamName: 'Blocks & Plasta',
        floor: 'Ground Floor',
        weekPeriod: '19th Apr 2026 to 26th Apr 2026',
        contractAmount: 250000,
        paidThisWeek: 100000,
        cumulativePaid: 100000,
        remainingBalance: 150000,
        date: '2026-04-26'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    } catch (e) {
      console.error(e);
    }
  }, [payments]);

  // -------------------------------------------------------------
  // 3. SITE-AWARE FILTERING & CALCULATIONS
  // -------------------------------------------------------------
  const siteAgreements = useMemo(() => {
    if (isCombinedView) return agreements;
    return agreements.filter((a) => a.projectId === selectedProjectId);
  }, [agreements, selectedProjectId, isCombinedView]);

  const sitePayments = useMemo(() => {
    if (isCombinedView) return payments;
    return payments.filter((p) => p.projectId === selectedProjectId);
  }, [payments, selectedProjectId, isCombinedView]);

  // Top KPI Stats
  const stats = useMemo(() => {
    const totalContractValue = siteAgreements.reduce((sum, a) => sum + (Number(a.agreedAmount) || 0), 0);
    const totalPaid = siteAgreements.reduce((sum, a) => sum + (Number(a.totalPaid) || 0), 0);
    const outstandingBalance = Math.max(0, totalContractValue - totalPaid);
    const pctPaid = totalContractValue > 0 ? ((totalPaid / totalContractValue) * 100).toFixed(1) : 0;

    // Unique active teams count
    const uniqueTeams = new Set(siteAgreements.map((a) => a.teamName));
    const activeTeamsCount = uniqueTeams.size;

    // Distinct floors
    const uniqueFloors = Array.from(new Set(siteAgreements.map((a) => a.floor).filter(Boolean)));
    const floorsDisplay = uniqueFloors.length > 0 ? uniqueFloors.slice(0, 2).join(' & ') : 'Ground & 1st Floor';

    return {
      totalContractValue,
      totalPaid,
      outstandingBalance,
      pctPaid,
      activeTeamsCount,
      agreementCount: siteAgreements.length,
      floorsDisplay
    };
  }, [siteAgreements]);

  // -------------------------------------------------------------
  // 4. ADD SUBCONTRACT AGREEMENT FORM STATE
  // -------------------------------------------------------------
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const initialSpec = () => ({
    id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    teamName: 'Shuttering',
    foremanName: '',
    floor: 'Ground Floor',
    contractAmount: '',
    startDate: getTodayStr(),
    notes: ''
  });

  const [specifications, setSpecifications] = useState([initialSpec()]);

  const handleAddSpecification = () => {
    setSpecifications((prev) => [...prev, initialSpec()]);
  };

  const handleRemoveSpecification = (index) => {
    if (specifications.length <= 1) return;
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSpecification = (index, field, value) => {
    setSpecifications((prev) =>
      prev.map((spec, i) => (i === index ? { ...spec, [field]: value } : spec))
    );
  };

  const handleResetForm = () => {
    setSpecifications([initialSpec()]);
    addToast('Agreement specifications reset.', 'info');
  };

  const handleSaveAgreements = (e) => {
    e.preventDefault();
    const newItems = [];
    let counter = agreements.length + 1;

    for (const spec of specifications) {
      if (!spec.teamName) {
        addToast('Please select a subcontract team.', 'warning');
        return;
      }
      if (!spec.floor.trim()) {
        addToast('Please enter a floor assignment.', 'warning');
        return;
      }
      if (!spec.contractAmount || Number(spec.contractAmount) <= 0) {
        addToast('Please enter a valid contract amount.', 'warning');
        return;
      }

      const assignedProject = projects.find((p) => p.id === defaultProjectId);
      const contractId = `SC-${new Date().getFullYear()}-${String(counter).padStart(3, '0')}`;
      counter++;

      newItems.push({
        id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        contractId,
        projectId: defaultProjectId,
        projectName: assignedProject?.name || defaultProjectName,
        teamName: spec.teamName,
        foremanName: spec.foremanName || `Foreman: ${spec.teamName} Lead`,
        contractDate: spec.startDate || getTodayStr(),
        floor: spec.floor.trim(),
        agreedAmount: Number(spec.contractAmount),
        totalPaid: 0,
        paymentsCount: 0,
        notes: spec.notes.trim() || 'Floor piecework contract',
        status: 'Active (Unpaid)'
      });
    }

    setAgreements((prev) => [...newItems, ...prev]);
    addToast(`Successfully saved ${newItems.length} Subcontract Agreement(s)!`, 'success');
    setSpecifications([initialSpec()]);
  };

  // -------------------------------------------------------------
  // 5. AGREEMENTS TABLE FILTER & SORT
  // -------------------------------------------------------------
  const [agreementTeamFilter, setAgreementTeamFilter] = useState('all');
  const [agreementFloorFilter, setAgreementFloorFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);

  const availableFloors = useMemo(() => {
    const set = new Set();
    siteAgreements.forEach((a) => {
      if (a.floor) set.add(a.floor);
    });
    return Array.from(set);
  }, [siteAgreements]);

  const filteredAgreements = useMemo(() => {
    let list = siteAgreements.filter((a) => {
      const matchTeam = agreementTeamFilter === 'all' || a.teamName === agreementTeamFilter;
      const matchFloor = agreementFloorFilter === 'all' || a.floor === agreementFloorFilter;
      return matchTeam && matchFloor;
    });

    list.sort((a, b) => {
      const diff = new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime();
      return sortAsc ? -diff : diff;
    });

    return list;
  }, [siteAgreements, agreementTeamFilter, agreementFloorFilter, sortAsc]);

  // -------------------------------------------------------------
  // 6. PAYMENTS TABLE FILTERS
  // -------------------------------------------------------------
  const [paymentTeamFilter, setPaymentTeamFilter] = useState('all');
  const [paymentFloorFilter, setPaymentFloorFilter] = useState('all');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  const filteredPayments = useMemo(() => {
    return sitePayments.filter((p) => {
      const matchTeam = paymentTeamFilter === 'all' || p.teamName === paymentTeamFilter;
      const matchFloor = paymentFloorFilter === 'all' || p.floor === paymentFloorFilter;
      let matchDate = true;
      if (paymentStartDate && p.date && p.date < paymentStartDate) matchDate = false;
      if (paymentEndDate && p.date && p.date > paymentEndDate) matchDate = false;
      return matchTeam && matchFloor && matchDate;
    });
  }, [sitePayments, paymentTeamFilter, paymentFloorFilter, paymentStartDate, paymentEndDate]);

  const totalWeeklyDisbursements = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.paidThisWeek) || 0), 0);
  }, [filteredPayments]);

  // -------------------------------------------------------------
  // 7. RECORD WEEKLY PAYMENT MODAL
  // -------------------------------------------------------------
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    agreementId: '',
    weekPeriod: '',
    paidThisWeek: '',
    paymentDate: getTodayStr(),
    notes: ''
  });

  const handleOpenRecordPayment = () => {
    const firstActiveAgreement = siteAgreements.find((a) => a.agreedAmount > a.totalPaid) || siteAgreements[0];
    const nextPayNum = payments.length + 1;
    const now = new Date();
    const periodStr = `${now.getDate()}th ${now.toLocaleString('default', { month: 'short' })} to ${now.getDate() + 7}th ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    setNewPayment({
      agreementId: firstActiveAgreement ? firstActiveAgreement.contractId : '',
      paymentRef: `PAY-WK${Math.floor(10 + Math.random() * 40)}-${String(nextPayNum).padStart(2, '0')}`,
      weekPeriod: periodStr,
      paidThisWeek: '',
      paymentDate: getTodayStr(),
      notes: ''
    });
    setIsRecordPaymentOpen(true);
  };

  const handleSaveWeeklyPayment = (e) => {
    e.preventDefault();
    if (!newPayment.agreementId) {
      addToast('Please select an active subcontract agreement.', 'warning');
      return;
    }
    const amt = Number(newPayment.paidThisWeek);
    if (isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid disbursement amount.', 'warning');
      return;
    }

    const targetAgreement = agreements.find((a) => a.contractId === newPayment.agreementId);
    if (!targetAgreement) {
      addToast('Selected agreement not found.', 'error');
      return;
    }

    const prevPaid = Number(targetAgreement.totalPaid || 0);
    const newCumulative = prevPaid + amt;
    const newRemaining = Math.max(0, targetAgreement.agreedAmount - newCumulative);
    const updatedStatus = newRemaining <= 0 ? 'Fully Paid' : 'Partially Paid';

    // 1. Update Agreement
    setAgreements((prev) =>
      prev.map((a) =>
        a.contractId === targetAgreement.contractId
          ? {
            ...a,
            totalPaid: newCumulative,
            paymentsCount: (a.paymentsCount || 0) + 1,
            status: updatedStatus
          }
          : a
      )
    );

    // 2. Add Payment Record
    const payItem = {
      id: `pay-${Date.now()}`,
      paymentRef: newPayment.paymentRef || `PAY-${Date.now()}`,
      agreementId: targetAgreement.contractId,
      projectId: targetAgreement.projectId,
      projectName: targetAgreement.projectName,
      teamName: targetAgreement.teamName,
      floor: targetAgreement.floor,
      weekPeriod: newPayment.weekPeriod || 'Weekly Disbursement',
      contractAmount: targetAgreement.agreedAmount,
      paidThisWeek: amt,
      cumulativePaid: newCumulative,
      remainingBalance: newRemaining,
      date: newPayment.paymentDate || getTodayStr()
    };

    setPayments((prev) => [payItem, ...prev]);
    setIsRecordPaymentOpen(false);
    addToast(`Recorded weekly disbursement: ${formatKSh(amt)} for ${targetAgreement.teamName}!`, 'success');
  };

  // -------------------------------------------------------------
  // 8. VIEW & EDIT MODALS FOR AGREEMENTS
  // -------------------------------------------------------------
  const [viewingAgreement, setViewingAgreement] = useState(null);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [deletingAgreement, setDeletingAgreement] = useState(null);

  const handleSaveEditAgreement = (e) => {
    e.preventDefault();
    if (!editingAgreement) return;
    if (!editingAgreement.agreedAmount || Number(editingAgreement.agreedAmount) <= 0) {
      addToast('Please enter a valid contract amount.', 'warning');
      return;
    }

    setAgreements((prev) =>
      prev.map((a) =>
        a.id === editingAgreement.id
          ? {
            ...a,
            teamName: editingAgreement.teamName,
            floor: editingAgreement.floor,
            contractDate: editingAgreement.contractDate,
            agreedAmount: Number(editingAgreement.agreedAmount),
            foremanName: editingAgreement.foremanName,
            notes: editingAgreement.notes
          }
          : a
      )
    );
    setEditingAgreement(null);
    addToast('Agreement updated successfully.');
  };

  const handleDeleteAgreement = () => {
    if (!deletingAgreement) return;
    setAgreements((prev) => prev.filter((a) => a.id !== deletingAgreement.id));
    setDeletingAgreement(null);
    addToast('Agreement deleted.', 'info');
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const rows = [
      ['Contract ID', 'Date', 'Team', 'Floor', 'Agreed Amount (KSh)', 'Total Paid (KSh)', 'Outstanding (KSh)', 'Status'],
      ...siteAgreements.map((a) => [
        a.contractId,
        a.contractDate,
        a.teamName,
        a.floor,
        a.agreedAmount,
        a.totalPaid,
        Math.max(0, a.agreedAmount - a.totalPaid),
        a.status
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Subcontract_Agreements_${currentProject?.name || 'All_Sites'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Subcontract agreements exported to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & EXPORT ACTIONS                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Subcontract (Piece Work)
            </h1>
            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 text-xs font-semibold">
              Floor-Based Labour
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage subcontractor teams, floor-based contracts, weekly payments, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP 4 STAT CARDS — Premium Design                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL CONTRACT VALUE */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-slate-900/5"></div>
          <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full bg-slate-900/[0.03]"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Contract Value
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-slate-900 font-mono">
                {formatKSh(stats.totalContractValue)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200/60">
                  <Layers className="h-2.5 w-2.5 text-slate-500" />
                </span>
                <span>{stats.agreementCount} floor agreement{stats.agreementCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 2: TOTAL PAID */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-emerald-500/5"></div>
          <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full bg-emerald-500/[0.03]"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1.5 flex-1 pr-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Paid
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-emerald-600 font-mono">
                {formatKSh(stats.totalPaid)}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 max-w-[120px] bg-emerald-100 rounded-full h-[5px] overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.pctPaid)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold whitespace-nowrap font-mono bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  {stats.pctPaid}%
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 3: OUTSTANDING BALANCE */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-orange-500/5"></div>
          <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full bg-orange-500/[0.03]"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-orange-600 font-mono">
                {formatKSh(stats.outstandingBalance)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100">
                  <Clock className="h-2.5 w-2.5 text-orange-500" />
                </span>
                <span>Remaining across active works</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Scale className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 4: ACTIVE SUBCONTRACT TEAMS */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-white to-yellow-50/30 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/5"></div>
          <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full bg-amber-500/[0.03]"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Teams
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-slate-900">
                {stats.activeTeamsCount} <span className="text-sm font-bold text-slate-500">Teams</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100">
                  <Building className="h-2.5 w-2.5 text-amber-600" />
                </span>
                <span>{stats.floorsDisplay}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SECTION 1: ADD SUBCONTRACT AGREEMENT (SPECIFICATION FORM)  */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add Subcontract Agreement</h2>
              <p className="text-[11px] text-slate-500">
                Define floor-by-floor piecework agreements. Each team can hold distinct contracts per floor.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full self-start sm:self-auto">
            {currentProject?.name ? `${currentProject.name} Contracts Form` : 'Site Contracts Form'}
          </span>
        </div>

        {/* Form Specifications */}
        <form onSubmit={handleSaveAgreements} className="space-y-4">
          {specifications.map((spec, idx) => (
            <div
              key={spec.id}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="text-amber-700 flex items-center gap-1">
                  <span>#</span> Contract Specification #{idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-400 italic">
                    Separate floor contracts tracked individually
                  </span>
                  {specifications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecification(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove specification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Input Row matching user layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* 1. Select Subcontract Team */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Subcontract Team <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={spec.teamName}
                    onChange={(e) => handleUpdateSpecification(idx, 'teamName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    {SUBCONTRACT_TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Floor Assignment */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Floor Assignment <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ground Floor, 2nd Floor"
                    value={spec.floor}
                    onChange={(e) => handleUpdateSpecification(idx, 'floor', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* 3. Contract Amount (KSh) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contract Amount (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      KSh
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="320000"
                      value={spec.contractAmount}
                      onChange={(e) => handleUpdateSpecification(idx, 'contractAmount', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 4. Start Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={spec.startDate}
                    onChange={(e) => handleUpdateSpecification(idx, 'startDate', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* 5. Agreement Notes / Scope */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agreement Notes / Scope
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Columns, beams & deck casting"
                    value={spec.notes}
                    onChange={(e) => handleUpdateSpecification(idx, 'notes', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddSpecification}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 px-4 py-2 text-xs font-bold text-amber-800 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Another Team / Contract</span>
            </button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset Form</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Agreements</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SECTION 2: SUBCONTRACT AGREEMENTS TABLE                   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        {/* Header and Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Subcontract Agreements</h2>
              <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-bold">
                {filteredAgreements.length} Active Contracts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Floor-specific contracts breakdown with accumulated payments and real-time balances.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filter by Team */}
            <select
              value={agreementTeamFilter}
              onChange={(e) => setAgreementTeamFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Teams</option>
              {SUBCONTRACT_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Filter by Floor */}
            <select
              value={agreementFloorFilter}
              onChange={(e) => setAgreementFloorFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Floors</option>
              {availableFloors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title="Toggle sort direction"
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contract ID</th>
                  <th className="py-3 px-4">Contract Date</th>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Agreed Amount (KSh)</th>
                  <th className="py-3 px-4">Total Paid (KSh)</th>
                  <th className="py-3 px-4">Outstanding (KSh)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No subcontract agreements found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((a) => {
                    const outstanding = Math.max(0, a.agreedAmount - a.totalPaid);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                          {a.contractId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {formatDate(a.contractDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                              {getInitials(a.teamName)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{a.teamName}</div>
                              {a.foremanName && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {a.foremanName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                            <Building className="h-3 w-3 text-amber-600" />
                            <span>{a.floor}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                          {formatKSh(a.agreedAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-emerald-600 font-mono">
                            {formatKSh(a.totalPaid)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({a.paymentsCount || 0} payment{a.paymentsCount === 1 ? '' : 's'})
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-orange-600 font-mono">
                          {formatKSh(outstanding)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${a.status === 'Fully Paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : a.status === 'Partially Paid'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${a.status === 'Fully Paid'
                                  ? 'bg-emerald-600'
                                  : a.status === 'Partially Paid'
                                    ? 'bg-amber-600'
                                    : 'bg-blue-600'
                                }`}
                            ></span>
                            <span>{a.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingAgreement(a)}
                              title="View Agreement Voucher"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingAgreement(a)}
                              title="Edit Agreement"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingAgreement(a)}
                              title="Delete Agreement"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Footer Summary Row — aligned under matching columns */}
              <tfoot>
                <tr className="bg-slate-900 text-white">
                  <td colSpan={4} className="py-3.5 px-4 text-[11px] uppercase tracking-wider font-bold text-slate-300">
                    Total Agreements Sum
                  </td>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400 text-sm">
                    {formatKSh(stats.totalContractValue)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                    {formatKSh(stats.totalPaid)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-orange-400 text-sm">
                    {formatKSh(stats.outstandingBalance)}
                  </td>
                  <td className="py-3.5 px-4 text-[10px] text-slate-400 font-normal italic">
                    Calculated automatically: Total Value - Total Paid = Outstanding
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SECTION 3: WEEKLY SUBCONTRACT PAYMENTS                     */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weekly Subcontract Payments
              </h2>
              <p className="text-xs text-slate-500">
                Record weekly progress disbursements tied to specific floor contracts.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenRecordPayment}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>+ Record Weekly Payment</span>
          </button>
        </div>

        {/* Payments Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <div className="flex items-center gap-1 font-bold text-slate-700 mr-1">
              <Filter className="h-3.5 w-3.5 text-amber-500" />
              <span>Filters:</span>
            </div>

            <select
              value={paymentTeamFilter}
              onChange={(e) => setPaymentTeamFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">Filter by Team (All)</option>
              {SUBCONTRACT_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={paymentFloorFilter}
              onChange={(e) => setPaymentFloorFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">Filter by Floor (All)</option>
              {availableFloors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
              <span className="text-[11px] text-slate-400">Period:</span>
              <input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="text-[11px] text-slate-700 focus:outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="text-[11px] text-slate-700 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Showing {filteredPayments.length} of {sitePayments.length} weekly payment transactions
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Week Period</th>
                  <th className="py-3 px-4">Contract Amount</th>
                  <th className="py-3 px-4">Paid This Week</th>
                  <th className="py-3 px-4">Cumulative Paid</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No weekly payments recorded for the selected filter period.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.paymentRef}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.teamName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {p.floor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.weekPeriod}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {formatKSh(p.contractAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        {formatKSh(p.paidThisWeek)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {formatKSh(p.cumulativePaid)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-600">
                        {formatKSh(p.remainingBalance)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Total Row matching screenshot */}
                {filteredPayments.length > 0 && (
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <td colSpan={5} className="py-3 px-4 text-right text-slate-700 uppercase tracking-wider text-[11px]">
                      Total Recorded Weekly Disbursements:
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-600 text-xs">
                      {formatKSh(totalWeeklyDisbursements)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">—</td>
                    <td className="py-3 px-4 text-slate-400">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECORD WEEKLY PAYMENT                                  */}
      {/* ------------------------------------------------------------- */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Weekly Disbursement</h3>
                  <p className="text-[11px] text-slate-500">Apply progress payout to floor agreement</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeeklyPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Agreement (Contract) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newPayment.agreementId}
                  onChange={(e) => setNewPayment({ ...newPayment, agreementId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">Select agreement...</option>
                  {siteAgreements.map((a) => (
                    <option key={a.id} value={a.contractId}>
                      {a.contractId} — {a.teamName} ({a.floor}) • Remaining: {formatKSh(a.agreedAmount - a.totalPaid)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={newPayment.paymentRef}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentRef: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Week Period Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. 19th Apr 2026 to 26th Apr 2026"
                  value={newPayment.weekPeriod}
                  onChange={(e) => setNewPayment({ ...newPayment, weekPeriod: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount Paid This Week (KSh) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g. 70000"
                  value={newPayment.paidThisWeek}
                  onChange={(e) => setNewPayment({ ...newPayment, paidThisWeek: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW AGREEMENT DETAIL                                  */}
      {/* ------------------------------------------------------------- */}
      {viewingAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Subcontract Agreement Voucher
                </div>
                <div className="text-sm font-extrabold flex items-center gap-2 mt-0.5">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span>{viewingAgreement.contractId}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingAgreement(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subcontract Team:</span>
                  <span className="font-bold text-slate-900">{viewingAgreement.teamName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Floor Assignment:</span>
                  <span className="font-semibold text-slate-900">{viewingAgreement.floor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Team Leader / Foreman:</span>
                  <span className="font-semibold text-slate-800">{viewingAgreement.foremanName || 'Assigned Lead'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Start Date:</span>
                  <span className="font-medium text-slate-800">{formatDate(viewingAgreement.contractDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Workspace:</span>
                  <span className="font-medium text-slate-800">{viewingAgreement.projectName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Agreed Amount</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">
                    {formatKSh(viewingAgreement.agreedAmount)}
                  </div>
                </div>
                <div className="border border-emerald-200 rounded-xl p-2.5 bg-emerald-50/50">
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">Total Paid</div>
                  <div className="font-mono font-bold text-emerald-700 mt-1">
                    {formatKSh(viewingAgreement.totalPaid)}
                  </div>
                </div>
                <div className="border border-orange-200 rounded-xl p-2.5 bg-orange-50/50">
                  <div className="text-[10px] text-orange-800 uppercase font-bold">Outstanding</div>
                  <div className="font-mono font-bold text-orange-700 mt-1">
                    {formatKSh(Math.max(0, viewingAgreement.agreedAmount - viewingAgreement.totalPaid))}
                  </div>
                </div>
              </div>

              {viewingAgreement.notes && (
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Agreement Notes / Scope
                  </div>
                  <p className="text-slate-700">{viewingAgreement.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAgreement(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT AGREEMENT                                         */}
      {/* ------------------------------------------------------------- */}
      {editingAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Agreement</h3>
                  <p className="text-[11px] text-slate-500">{editingAgreement.contractId}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAgreement(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAgreement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subcontract Team
                </label>
                <select
                  value={editingAgreement.teamName}
                  onChange={(e) => setEditingAgreement({ ...editingAgreement, teamName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                >
                  {SUBCONTRACT_TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Floor Assignment
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAgreement.floor}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, floor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contract Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editingAgreement.contractDate}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, contractDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agreed Amount (KSh)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editingAgreement.agreedAmount}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, agreedAmount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Foreman Name
                  </label>
                  <input
                    type="text"
                    value={editingAgreement.foremanName || ''}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, foremanName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agreement Notes / Scope
                </label>
                <textarea
                  rows={2}
                  value={editingAgreement.notes || ''}
                  onChange={(e) => setEditingAgreement({ ...editingAgreement, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAgreement(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION                                    */}
      {/* ------------------------------------------------------------- */}
      {deletingAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Agreement?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <strong className="text-slate-800">{deletingAgreement.contractId}</strong> ({deletingAgreement.teamName} - {deletingAgreement.floor})?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeletingAgreement(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAgreement}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubcontractPieceWorkView;
