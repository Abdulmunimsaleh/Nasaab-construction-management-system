import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import {
  Coins,
  ArrowUp,
  ArrowDown,
  Calendar,
  Target,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  X,
  Building2,
  Receipt,
  Download,
  Check
} from 'lucide-react';

const FUNDS_STORAGE_KEY = 'nasaab_developer_funds_master_v1';

// Helper to format currency as KSh X,XXX,XXX
const formatKSh = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'KSh 0';
  return `KSh ${Number(amount).toLocaleString('en-US')}`;
};

// Helper to format short abbreviation like 650k
const formatShortK = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1);
    return val.endsWith('.0') ? `${val.slice(0, -2)}M` : `${val}M`;
  }
  if (num >= 1000) {
    const val = Math.round(num / 1000);
    return `${val}k`;
  }
  return num.toString();
};

export const ProjectFinancialOverview = () => {
  const {
    projects,
    selectedProjectId,
    currentProject,
    laeForms,
    addToast,
    triggerCelebration,
    isForeman,
    isStoreKeeper
  } = useApp();

  // Active workspace label
  const activeWorkspaceName = selectedProjectId === 'all'
    ? 'All Sites Combined'
    : (currentProject?.name || projects[0]?.name || 'MMA');

  const activeWorkspaceCode = selectedProjectId === 'all'
    ? 'ALL-SITES'
    : (currentProject?.code || projects[0]?.code || 'MMA-01');

  // Modal states
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form state for new deposit
  const [depositForm, setDepositForm] = useState({
    projectId: '',
    referenceNo: '',
    date: new Date().toISOString().split('T')[0],
    fundType: 'additional', // 'initial' | 'additional'
    stage: 'Phase 1',
    amount: '',
    title: '',
    depositor: 'NASAAB Holdings Ltd',
    wireRef: ''
  });

  // -------------------------------------------------------------
  // 1. DEVELOPER FUNDS STATE & API DATA
  // -------------------------------------------------------------
  const [funds, setFunds] = useState([]);
  const [subAgreements, setSubAgreements] = useState([]);
  const [subPayments, setSubPayments] = useState([]);
  const [equipmentExpensesList, setEquipmentExpensesList] = useState([]);
  const [safetyList, setSafetyList] = useState([]);

  useEffect(() => {
    if (isForeman || isStoreKeeper) return;
    let isMounted = true;
    const loadFinancials = async () => {
      try {
        const [fData, scAgData, scPayData, eqData, sdData] = await Promise.allSettled([
          api.developerFunds.getAll(selectedProjectId),
          api.subcontracts.getAgreements(selectedProjectId),
          api.subcontracts.getPayments(selectedProjectId),
          api.equipment.getExpenses(selectedProjectId),
          api.safetyDelays.getAll(selectedProjectId)
        ]);

        if (!isMounted) return;
        if (fData.status === 'fulfilled' && Array.isArray(fData.value)) {
          setFunds(fData.value);
        }
        if (scAgData.status === 'fulfilled' && Array.isArray(scAgData.value)) {
          setSubAgreements(scAgData.value);
        }
        if (scPayData.status === 'fulfilled' && Array.isArray(scPayData.value)) {
          setSubPayments(scPayData.value);
        }
        if (eqData.status === 'fulfilled' && Array.isArray(eqData.value)) {
          setEquipmentExpensesList(eqData.value);
        }
        if (sdData.status === 'fulfilled' && Array.isArray(sdData.value)) {
          setSafetyList(sdData.value);
        }
      } catch (err) {
        console.error('Error fetching live financial records:', err);
      }
    };

    loadFinancials();
    return () => { isMounted = false; };
  }, [selectedProjectId, isForeman, isStoreKeeper]);

  // If foreman or storekeeper, do not render this overview
  if (isForeman || isStoreKeeper) {
    return null;
  }

  // Scoped funds for the active project
  const scopedFunds = useMemo(() => {
    if (selectedProjectId === 'all') {
      return funds;
    }
    return funds.filter((f) => f.projectId === selectedProjectId || f.project_id === selectedProjectId);
  }, [funds, selectedProjectId]);

  // Funds KPIs
  const initialFundsReceived = useMemo(() => {
    return scopedFunds
      .filter((f) => (f.fundType || f.fund_type) === 'initial')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [scopedFunds]);

  const additionalFundsReceived = useMemo(() => {
    return scopedFunds
      .filter((f) => (f.fundType || f.fund_type) === 'additional')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [scopedFunds]);

  const totalFundsReceived = useMemo(() => {
    return initialFundsReceived + additionalFundsReceived;
  }, [initialFundsReceived, additionalFundsReceived]);

  const additionalDisbursementsCount = useMemo(() => {
    return scopedFunds.filter((f) => (f.fundType || f.fund_type) === 'additional').length;
  }, [scopedFunds]);

  // -------------------------------------------------------------
  // 2. DYNAMICALLY MAP ALL 4 LABOUR EXPENSE STREAMS PER SITE
  // -------------------------------------------------------------

  // Stream 1: Subcontract Piece Work Expenses (from DB payments & agreements)
  const subcontractExpense = useMemo(() => {
    const projectFilter = (item) => {
      if (!selectedProjectId || selectedProjectId === 'all') return true;
      const pId = item.projectId || item.project_id;
      return String(pId) === String(selectedProjectId);
    };

    const agreementsForProject = Array.isArray(subAgreements) ? subAgreements.filter(projectFilter) : [];
    const paymentsForProject = Array.isArray(subPayments) ? subPayments.filter(projectFilter) : [];

    // Map payments by agreement id / contract id
    const paymentSumsByAgreement = {};
    let unlinkedPaymentsSum = 0;

    paymentsForProject.forEach((pay) => {
      // payment records store paidThisWeek / paid_this_week / amount
      const amt = Number(pay.paidThisWeek ?? pay.paid_this_week ?? pay.amount ?? 0);
      const agId = pay.agreementId || pay.agreement_id;
      if (agId) {
        paymentSumsByAgreement[agId] = (paymentSumsByAgreement[agId] || 0) + amt;
      } else {
        unlinkedPaymentsSum += amt;
      }
    });

    let total = unlinkedPaymentsSum;

    if (agreementsForProject.length > 0) {
      agreementsForProject.forEach((ag) => {
        const agKey1 = ag.id;
        const agKey2 = ag.contractId || ag.contract_id;
        const paymentsTotal = (paymentSumsByAgreement[agKey1] || 0) + (agKey2 && agKey2 !== agKey1 ? (paymentSumsByAgreement[agKey2] || 0) : 0);
        const agreementPaid = Number(ag.totalPaid ?? ag.total_paid ?? 0);
        // Take the highest accurate logged disbursement for each agreement
        total += Math.max(paymentsTotal, agreementPaid);
      });
    } else {
      // Fallback if no agreements are in memory but payment records exist
      let sumPayments = 0;
      paymentsForProject.forEach((pay) => {
        sumPayments += Number(pay.paidThisWeek ?? pay.paid_this_week ?? pay.amount ?? 0);
      });
      total = sumPayments;
    }

    return total;
  }, [selectedProjectId, subPayments, subAgreements]);

  // Stream 2: Daily Labour Expenses (from live LAE forms)
  const dailyLabourExpense = useMemo(() => {
    let total = 0;
    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId) {
        return;
      }
      total += Number(form.total_labour_cost) || 0;
    });
    return total;
  }, [laeForms, selectedProjectId]);

  // Stream 3: Equipment Operating & Maintenance Expenses
  const equipmentExpense = useMemo(() => {
    let total = 0;
    if (Array.isArray(equipmentExpensesList)) {
      equipmentExpensesList.forEach((exp) => {
        if (selectedProjectId === 'all' || exp.projectId === selectedProjectId || exp.project_id === selectedProjectId) {
          total += Number(exp.amount) || 0;
        }
      });
    }
    // Also add any equipment operational expense logged in daily LAE forms
    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId) {
        return;
      }
      if (Array.isArray(form.equipmentItems)) {
        form.equipmentItems.forEach((eq) => {
          total += Number(eq.total_expense) || 0;
        });
      }
    });
    return total;
  }, [laeForms, selectedProjectId, equipmentExpensesList]);

  // Stream 4: Safety & Delays Expenses
  const safetyExpense = useMemo(() => {
    let total = 0;
    if (Array.isArray(safetyList)) {
      safetyList.forEach((item) => {
        const matchesProject = selectedProjectId === 'all' || item.projectId === selectedProjectId || item.project_id === selectedProjectId;
        if (matchesProject && item.category === 'safety') {
          total += Number(item.totalAmount || item.total_amount) || 0;
        }
      });
    }
    return total;
  }, [selectedProjectId, safetyList]);

  // Total Labour Expenses (Sum of all 4 labour expense streams)
  const totalLabourExpenses = useMemo(() => {
    return subcontractExpense + dailyLabourExpense + equipmentExpense + safetyExpense;
  }, [subcontractExpense, dailyLabourExpense, equipmentExpense, safetyExpense]);

  // Available Balance after deduction of all labour expenses
  const availableBalance = useMemo(() => {
    return totalFundsReceived - totalLabourExpenses;
  }, [totalFundsReceived, totalLabourExpenses]);

  const isHealthy = availableBalance >= 0;

  // -------------------------------------------------------------
  // 3. ADD FUNDS MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddFundsModal = () => {
    const targetPId = selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || 'prj-mma');
    const targetProj = projects.find((p) => p.id === targetPId);
    const code = targetProj?.code || 'MMA';
    const nextIndex = scopedFunds.length + 1;
    const refGenerated = `DEP-${code.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-${String(nextIndex).padStart(3, '0')}`;

    setDepositForm({
      projectId: targetPId,
      referenceNo: refGenerated,
      date: new Date().toISOString().split('T')[0],
      fundType: 'additional',
      stage: 'Phase 1',
      amount: '',
      title: '',
      depositor: 'NASAAB Holdings Ltd',
      wireRef: ''
    });
    setIsDepositModalOpen(true);
  };

  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositForm.amount);
    if (!amt || amt <= 0) {
      addToast && addToast('Please enter a valid deposit amount greater than zero.', 'error');
      return;
    }

    const assignedPId = depositForm.projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id);
    const assignedProj = projects.find((p) => p.id === assignedPId);
    const assignedPName = assignedProj?.name || currentProject?.name || 'Assigned Site';

    const newDeposit = {
      referenceNo: depositForm.referenceNo || `DEP-${Date.now().toString().slice(-4)}`,
      date: depositForm.date || new Date().toISOString().split('T')[0],
      title: depositForm.title.trim() || `${depositForm.fundType === 'initial' ? 'Initial Capital Disbursement' : 'Milestone Working Capital Top-up'}`,
      depositor: depositForm.depositor.trim() || 'NASAAB Holdings Ltd',
      wireRef: depositForm.wireRef.trim() || 'EFT-' + Math.floor(10000 + Math.random() * 90000),
      stage: depositForm.stage || 'Phase 1',
      amount: amt,
      fundType: depositForm.fundType,
      projectId: assignedPId,
      projectName: assignedPName
    };

    try {
      const created = await api.developerFunds.create(newDeposit);
      setFunds((prev) => [created || { ...newDeposit, id: `dep-${Date.now()}` }, ...prev]);
      addToast && addToast(`Deposited ${formatKSh(amt)} for ${assignedPName} successfully!`);
      triggerCelebration && triggerCelebration();
      setIsDepositModalOpen(false);
    } catch (err) {
      console.error('Error saving developer funds deposit to DB:', err);
      // Fallback
      setFunds((prev) => [{ ...newDeposit, id: `dep-${Date.now()}` }, ...prev]);
      addToast && addToast(`Saved deposit locally (${err.message})`, 'warning');
      setIsDepositModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* SECTION 1: PROJECT FINANCIAL OVERVIEW & 5 KPI CARDS */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Coins className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Project Financial Overview
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Developer funding allocation, recorded labour expenditures, and active working balance for{' '}
              <strong className="text-slate-800">{activeWorkspaceName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <span className="text-slate-400">Currency:</span>
              <strong className="text-slate-800">KSh (Kenyan Shillings)</strong>
            </div>

            {!isForeman && !isStoreKeeper && (
              <button
                onClick={handleOpenAddFundsModal}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>+ + Add Funds</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Financial KPI Cards (Exact replica of the user screenshot) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Funds Received */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Funds Received</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 font-sans tracking-tight">
                {formatKSh(totalFundsReceived)}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Initial + Additional deposits</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              From Developer Account
            </div>
          </div>

          {/* Card 2: Initial Funds Received */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Initial Funds Received</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 font-sans tracking-tight">
                {formatKSh(initialFundsReceived)}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Base project allocation</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Disbursed at Project Kickoff
            </div>
          </div>

          {/* Card 3: Additional Funds Received */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Additional Funds Received</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Target className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 font-sans tracking-tight">
                {formatKSh(additionalFundsReceived)}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Subsequent developer top-ups</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              {additionalDisbursementsCount} milestone {additionalDisbursementsCount === 1 ? 'disbursement' : 'disbursements'}
            </div>
          </div>

          {/* Card 4: Total Labour Expenses */}
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700">Total Labour Expenses</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-rose-600 font-sans tracking-tight">
                {formatKSh(totalLabourExpenses)}
              </div>
              <p className="mt-0.5 text-[11px] text-rose-600/80 font-medium">All 4 labour expense streams</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-rose-200/60 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-rose-700">
              <span className="bg-rose-100/70 px-1.5 py-0.5 rounded">Sub: {formatShortK(subcontractExpense)}</span>
              <span className="bg-rose-100/70 px-1.5 py-0.5 rounded">Daily: {formatShortK(dailyLabourExpense)}</span>
              <span className="bg-rose-100/70 px-1.5 py-0.5 rounded">Equip: {formatShortK(equipmentExpense)}</span>
              <span className="bg-rose-100/70 px-1.5 py-0.5 rounded">Safety: {formatShortK(safetyExpense)}</span>
            </div>
          </div>

          {/* Card 5: Available Balance */}
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/30 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Available Balance</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{isHealthy ? 'Healthy' : 'Deficit'}</span>
                </span>
              </div>
              <div className={`mt-2 text-2xl font-black tracking-tight font-sans ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatKSh(availableBalance)}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 font-medium">Total Funds – Labour Expenses</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[11px] font-bold text-emerald-700">
              {isHealthy ? 'Active Operating Runway' : 'Immediate Top-up Needed'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: DEVELOPER FUNDS & DEPOSITS HISTORY TABLE */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Developer Funds & Deposits History
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                {activeWorkspaceCode} Workspace
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Audit log of all funds disbursed by NASAAB Holdings / Developer into this project.
            </p>
          </div>

          {!isForeman && !isStoreKeeper && (
            <button
              onClick={handleOpenAddFundsModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5 text-amber-600 stroke-[2.5]" />
              <span>+ Record New Deposit</span>
            </button>
          )}
        </div>

        {/* Deposits Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-36">REFERENCE NO.</th>
                <th className="py-3 px-4 w-32">DATE RECEIVED</th>
                <th className="py-3 px-4">DESCRIPTION / NOTES</th>
                <th className="py-3 px-4 w-44">STAGE / MILESTONE</th>
                <th className="py-3 px-4 w-36 text-right">AMOUNT (KSH)</th>
                <th className="py-3 px-4 w-24 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopedFunds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No developer deposits recorded yet for this workspace. Click &quot;Record New Deposit&quot; above.
                  </td>
                </tr>
              ) : (
                scopedFunds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {fund.referenceNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {fund.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{fund.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Depositor: {fund.depositor} • Bank Wire Ref: {fund.wireRef}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                        {fund.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                      {formatKSh(fund.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(fund)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {scopedFunds.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-amber-300 bg-amber-50/20">
                  <td colSpan="4" className="py-3.5 px-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                    CUMULATIVE TOTAL FUNDS RECORDED
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-amber-700">
                    {formatKSh(totalFundsReceived)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD FUNDS / RECORD NEW DEPOSIT */}
      {/* ========================================================= */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Developer Funds Deposit</h3>
                  <p className="text-[11px] text-slate-500">Log incoming capital & developer milestone disbursements</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Target Project Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Target Project Site <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={depositForm.projectId}
                  onChange={(e) => setDepositForm({ ...depositForm, projectId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                >
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'Site'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deposit Type & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={depositForm.fundType}
                    onChange={(e) => setDepositForm({ ...depositForm, fundType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="additional">Additional Milestone Top-up / Extra Funds</option>
                    <option value="initial">Initial Base Project Allocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage / Milestone
                  </label>
                  <select
                    value={depositForm.stage}
                    onChange={(e) => setDepositForm({ ...depositForm, stage: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Milestone 0 (Kickoff)">Milestone 0 (Kickoff)</option>
                    <option value="Phase 1">Phase 1 (Substructure)</option>
                    <option value="Phase 2">Phase 2 (Columns & First Floor)</option>
                    <option value="Phase 3">Phase 3 (Upper Superstructure)</option>
                    <option value="Phase 4">Phase 4 (Finishes & MEP)</option>
                  </select>
                </div>
              </div>

              {/* Reference No & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEP-MMA-004"
                    value={depositForm.referenceNo}
                    onChange={(e) => setDepositForm({ ...depositForm, referenceNo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Received <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={depositForm.date}
                    onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deposit Amount (KSH) <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    KSh
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 1,000,000"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disbursement Purpose / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 2 Column Casting & Suspended Slab Allocation"
                  value={depositForm.title}
                  onChange={(e) => setDepositForm({ ...depositForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Depositor & Wire Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Depositor Entity / Developer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NASAAB Holdings Ltd"
                    value={depositForm.depositor}
                    onChange={(e) => setDepositForm({ ...depositForm, depositor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank / Wire / Cheque Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBK-99201 or EFT-48190"
                    value={depositForm.wireRef}
                    onChange={(e) => setDepositForm({ ...depositForm, wireRef: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
                >
                  Record Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: OFFICIAL DISBURSEMENT RECEIPT */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Developer Disbursement Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5" id="printable-receipt">
              <div className="text-center pb-4 border-b border-slate-200/80">
                <div className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
                  NASAAB CONSTRUCTION LIMITED
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  OFFICIAL CAPITAL DISBURSEMENT RECEIPT
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Verified Inflow of Developer Working Capital
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.referenceNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Disbursement Date:</span>
                  <span className="font-mono text-slate-800">{selectedReceipt.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Project Workspace:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Project Stage:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.stage}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Purpose & Notes:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedReceipt.title}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Depositor Entity:</span>
                    <div className="font-semibold text-slate-700">{selectedReceipt.depositor}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Bank Wire / Ref:</span>
                    <div className="font-mono font-semibold text-slate-700">{selectedReceipt.wireRef}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Total Disbursed:</span>
                <span className="text-xl font-black font-mono text-amber-700">
                  {formatKSh(selectedReceipt.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  Cleared into Project Account
                </span>
                <span>NASAAB Site Finance System</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFinancialOverview;
