import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import {
  Coins,
  ShoppingCart,
  Banknote,
  Landmark,
  Wallet,
  Receipt,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  FileText,
  X,
  Check,
  Building2,
  DollarSign,
  Printer,
  Calendar,
  Layers,
  Package
} from 'lucide-react';

const FUNDS_STORAGE_KEY = 'nasaab_material_expenses_funds_master';
const EXPENSES_STORAGE_KEY = 'nasaab_material_expenses_master';

// Currency formatters matching screenshot UI exactly:
// e.g. "KSh 3,500,000" and "110,000"
const formatKSh = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'KSh 0';
  return `KSh ${Number(amount).toLocaleString('en-US')}`;
};

const formatAmtOnly = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('en-US');
};

export const MaterialExpensesPage = () => {
  const {
    projects,
    currentProject,
    selectedProjectId,
    addToast
  } = useApp();

  // -------------------------------------------------------------
  // 1. PROJECT ID IDENTIFICATION
  // -------------------------------------------------------------
  const proj1Id = projects[0]?.id || 'prj-majestic-palms';
  const proj1Name = projects[0]?.name || 'Majestic Palms';

  const proj2Id = projects[1]?.id || 'prj-mma';
  const proj2Name = projects[1]?.name || 'MMA';

  const proj3Id = projects[2]?.id || 'prj-seacrest';
  const proj3Name = projects[2]?.name || 'SeaCrest';

  // Helper for today's date YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // -------------------------------------------------------------
  // 2. FUNDS RECEIVED STATE & PERSISTENCE
  // -------------------------------------------------------------
  const [fundsList, setFundsList] = useState(() => {
    try {
      const saved = localStorage.getItem(FUNDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading material funds storage:', e);
    }

    // Default funds records across sites
    // Site 1 (Majestic Palms): Exactly matches the screenshot (Initial: 3,000,000, Additional: 500,000 -> Total: 3,500,000)
    return [
      {
        id: 'fund-mp-1',
        projectId: proj1Id,
        projectName: proj1Name,
        reference: 'Initial Funding',
        date: '2026-10-15',
        description: 'Initial funds from developer',
        amount: 3000000,
        fundType: 'initial'
      },
      {
        id: 'fund-mp-2',
        projectId: proj1Id,
        projectName: proj1Name,
        reference: 'Additional Deposit #001',
        date: '2026-10-18',
        description: 'Extra funds for purchasing more materials',
        amount: 500000,
        fundType: 'additional'
      },
      // Site 2 (MMA)
      {
        id: 'fund-mma-1',
        projectId: proj2Id,
        projectName: proj2Name,
        reference: 'Initial Site Allocation',
        date: '2026-10-10',
        description: 'Site startup disbursement from developer',
        amount: 2500000,
        fundType: 'initial'
      },
      {
        id: 'fund-mma-2',
        projectId: proj2Id,
        projectName: proj2Name,
        reference: 'Additional Deposit #001',
        date: '2026-10-19',
        description: 'Supplemental material float for masonry',
        amount: 300000,
        fundType: 'additional'
      },
      // Site 3 (SeaCrest)
      {
        id: 'fund-sc-1',
        projectId: proj3Id,
        projectName: proj3Name,
        reference: 'Initial Foundation Allocation',
        date: '2026-10-08',
        description: 'Initial developer release for ground works',
        amount: 4000000,
        fundType: 'initial'
      },
      {
        id: 'fund-sc-2',
        projectId: proj3Id,
        projectName: proj3Name,
        reference: 'Additional Deposit #001',
        date: '2026-10-23',
        description: 'Structural slab reinforcement funding',
        amount: 1000000,
        fundType: 'additional'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FUNDS_STORAGE_KEY, JSON.stringify(fundsList));
    } catch (e) {
      console.error('Failed to save material funds:', e);
    }
  }, [fundsList]);

  // -------------------------------------------------------------
  // 3. MATERIAL EXPENSES STATE & PERSISTENCE
  // -------------------------------------------------------------
  const [expensesList, setExpensesList] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPENSES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading material expenses storage:', e);
    }

    // Default expenses records across sites
    // Site 1 (Majestic Palms): Rows match the user screenshot items,
    // totaling KSh 1,250,000 for perfect mathematical consistency with the KPI cards!
    return [
      {
        id: 'exp-mp-1',
        expenseId: 'EXP-001',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-15',
        description: 'Cement (50kg bags)',
        supplier: 'Mombasa Cement Ltd',
        quantity: '200 Bags',
        amount: 110000,
        category: 'Cement',
        invoiceRef: 'INV-MCL-8801',
        status: 'Verified'
      },
      {
        id: 'exp-mp-2',
        expenseId: 'EXP-002',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-16',
        description: 'Reinforcement steel (12mm)',
        supplier: 'Steel Masters',
        quantity: '10 Tons',
        amount: 450000,
        category: 'Reinforcement Steel',
        invoiceRef: 'SM-KE-4029',
        status: 'Verified'
      },
      {
        id: 'exp-mp-3',
        expenseId: 'EXP-003',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-18',
        description: 'Sand',
        supplier: 'Mombasa Sand & Gravel',
        quantity: '50 Tons',
        amount: 150000,
        category: 'Sand & Aggregates',
        invoiceRef: 'MSG-3391',
        status: 'Verified'
      },
      {
        id: 'exp-mp-4',
        expenseId: 'EXP-004',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-20',
        description: 'Ballast',
        supplier: 'KPA Supplies',
        quantity: '30 Tons',
        amount: 135000,
        category: 'Sand & Aggregates',
        invoiceRef: 'KPA-8820',
        status: 'Verified'
      },
      {
        id: 'exp-mp-5',
        expenseId: 'EXP-005',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-22',
        description: 'Building blocks (200mm)',
        supplier: 'Alpha Blocks Ltd',
        quantity: '1,000 Pieces',
        amount: 105000,
        category: 'Building Blocks',
        invoiceRef: 'ABL-7712',
        status: 'Verified'
      },
      {
        id: 'exp-mp-6',
        expenseId: 'EXP-006',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-24',
        description: 'Plumbing materials',
        supplier: 'Best Plumbing Supplies',
        quantity: '1 Lot',
        amount: 120000,
        category: 'Plumbing',
        invoiceRef: 'BPS-0092',
        status: 'Verified'
      },
      {
        id: 'exp-mp-7',
        expenseId: 'EXP-007',
        projectId: proj1Id,
        projectName: proj1Name,
        date: '2026-10-27',
        description: 'Electrical materials',
        supplier: 'PowerTech',
        quantity: '1 Lot',
        amount: 180000,
        category: 'Electrical',
        invoiceRef: 'PT-6641',
        status: 'Verified'
      },

      // Site 2 (MMA) records
      {
        id: 'exp-mma-1',
        expenseId: 'EXP-008',
        projectId: proj2Id,
        projectName: proj2Name,
        date: '2026-10-14',
        description: 'Bamburi Cement 42.5N',
        supplier: 'Bamburi Cement Limited',
        quantity: '150 Bags',
        amount: 132000,
        category: 'Cement',
        invoiceRef: 'BAM-1049',
        status: 'Verified'
      },
      {
        id: 'exp-mma-2',
        expenseId: 'EXP-009',
        projectId: proj2Id,
        projectName: proj2Name,
        date: '2026-10-17',
        description: 'High-Yield Ribbed Bars D16',
        supplier: 'Apex Steel Mills',
        quantity: '4.5 Tons',
        amount: 480000,
        category: 'Reinforcement Steel',
        invoiceRef: 'APX-7741',
        status: 'Verified'
      },
      {
        id: 'exp-mma-3',
        expenseId: 'EXP-010',
        projectId: proj2Id,
        projectName: proj2Name,
        date: '2026-10-21',
        description: 'Marine Plywood 18mm & Battens',
        supplier: 'Coast Timber & Hardware',
        quantity: '40 Sheets',
        amount: 128000,
        category: 'Formwork & Timber',
        invoiceRef: 'CT-991',
        status: 'Verified'
      },
      {
        id: 'exp-mma-4',
        expenseId: 'EXP-011',
        projectId: proj2Id,
        projectName: proj2Name,
        date: '2026-10-25',
        description: 'Coarse River Sand Graded',
        supplier: 'Mombasa Sand & Gravel',
        quantity: '35 Tons',
        amount: 120000,
        category: 'Sand & Aggregates',
        invoiceRef: 'MSG-3420',
        status: 'Verified'
      },

      // Site 3 (SeaCrest) records
      {
        id: 'exp-sc-1',
        expenseId: 'EXP-012',
        projectId: proj3Id,
        projectName: proj3Name,
        date: '2026-10-12',
        description: 'ReadyMix Concrete C30 Graded',
        supplier: 'ReadyMix Kenya Ltd',
        quantity: '25 m³',
        amount: 320000,
        category: 'Cement',
        invoiceRef: 'RM-221',
        status: 'Verified'
      },
      {
        id: 'exp-sc-2',
        expenseId: 'EXP-013',
        projectId: proj3Id,
        projectName: proj3Name,
        date: '2026-10-16',
        description: 'Reinforcement Steel D12 & D16',
        supplier: 'Steel Masters Ltd',
        quantity: '6 Tons',
        amount: 620000,
        category: 'Reinforcement Steel',
        invoiceRef: 'SM-551',
        status: 'Verified'
      },
      {
        id: 'exp-sc-3',
        expenseId: 'EXP-014',
        projectId: proj3Id,
        projectName: proj3Name,
        date: '2026-10-20',
        description: 'Heavy Duty PVC Sleeves & 110mm Pipes',
        supplier: 'Metro Hardware Mombasa',
        quantity: '1 Lot',
        amount: 95000,
        category: 'Plumbing',
        invoiceRef: 'MTR-881',
        status: 'Verified'
      },
      {
        id: 'exp-sc-4',
        expenseId: 'EXP-015',
        projectId: proj3Id,
        projectName: proj3Name,
        date: '2026-10-26',
        description: 'Deep Coral Machine Cut Stones 9x9',
        supplier: 'Coast Quarry Works',
        quantity: '2,000 Pieces',
        amount: 130000,
        category: 'Building Blocks',
        invoiceRef: 'CQW-909',
        status: 'Verified'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expensesList));
    } catch (e) {
      console.error('Failed to save material expenses:', e);
    }
  }, [expensesList]);

  // -------------------------------------------------------------
  // 4. FILTERING & SITE SWITCHING CALCULATIONS
  // -------------------------------------------------------------
  // Active site filter
  const isCombinedView = !selectedProjectId || selectedProjectId === 'all';

  // 4a. Filtered Funds for current view
  const siteFunds = useMemo(() => {
    if (isCombinedView) {
      return fundsList;
    }
    return fundsList.filter((f) => f.projectId === selectedProjectId);
  }, [fundsList, selectedProjectId, isCombinedView]);

  // 4b. Filtered Expenses for current view
  const siteExpenses = useMemo(() => {
    if (isCombinedView) {
      return expensesList;
    }
    return expensesList.filter((e) => e.projectId === selectedProjectId);
  }, [expensesList, selectedProjectId, isCombinedView]);

  // 4c. Calculations for current view
  const metrics = useMemo(() => {
    const initialFunds = siteFunds
      .filter((f) => f.fundType === 'initial')
      .reduce((acc, f) => acc + Number(f.amount || 0), 0);

    const additionalFunds = siteFunds
      .filter((f) => f.fundType === 'additional')
      .reduce((acc, f) => acc + Number(f.amount || 0), 0);

    const totalFundsReceived = initialFunds + additionalFunds;

    const totalMaterialExpenses = siteExpenses.reduce(
      (acc, e) => acc + Number(e.amount || 0),
      0
    );

    const availableBalance = totalFundsReceived - totalMaterialExpenses;

    return {
      initialFunds,
      additionalFunds,
      totalFundsReceived,
      totalMaterialExpenses,
      availableBalance
    };
  }, [siteFunds, siteExpenses]);

  // -------------------------------------------------------------
  // 5. SEARCH & CATEGORY FILTERING FOR TRANSACTIONS TABLE
  // -------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const set = new Set();
    siteExpenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [siteExpenses]);

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return siteExpenses.filter((e) => {
      const matchesSearch =
        !term ||
        (e.description && e.description.toLowerCase().includes(term)) ||
        (e.supplier && e.supplier.toLowerCase().includes(term)) ||
        (e.expenseId && e.expenseId.toLowerCase().includes(term)) ||
        (e.category && e.category.toLowerCase().includes(term)) ||
        (e.invoiceRef && e.invoiceRef.toLowerCase().includes(term));

      const matchesCat =
        selectedCategory === 'all' || e.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [siteExpenses, searchTerm, selectedCategory]);

  // Pagination (7 items per page as shown in screenshot)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  // -------------------------------------------------------------
  // 6. MODALS STATE (ADD/EDIT/DELETE FUNDS & EXPENSES)
  // -------------------------------------------------------------
  // Modals for Funds
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [deletingFund, setDeletingFund] = useState(null);

  // Modals for Expenses
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Forms State
  const defaultTargetProjectId =
    selectedProjectId && selectedProjectId !== 'all'
      ? selectedProjectId
      : (currentProject?.id || proj1Id);

  const [fundForm, setFundForm] = useState({
    projectId: defaultTargetProjectId,
    reference: '',
    date: getTodayStr(),
    description: '',
    amount: '',
    fundType: 'additional'
  });

  const [expenseForm, setExpenseForm] = useState({
    projectId: defaultTargetProjectId,
    expenseId: '',
    date: getTodayStr(),
    description: '',
    supplier: '',
    quantity: '',
    amount: '',
    category: 'Cement',
    invoiceRef: ''
  });

  // Sync modal default target project with selectedProjectId
  useEffect(() => {
    const target =
      selectedProjectId && selectedProjectId !== 'all'
        ? selectedProjectId
        : (currentProject?.id || proj1Id);
    setFundForm((prev) => ({ ...prev, projectId: target }));
    setExpenseForm((prev) => ({ ...prev, projectId: target }));
  }, [selectedProjectId, currentProject, proj1Id]);

  // -------------------------------------------------------------
  // 7. HANDLERS: FUNDS CRUD
  // -------------------------------------------------------------
  const handleOpenAddFunds = () => {
    const targetPId =
      selectedProjectId && selectedProjectId !== 'all'
        ? selectedProjectId
        : (currentProject?.id || proj1Id);

    setFundForm({
      projectId: targetPId,
      reference: '',
      date: getTodayStr(),
      description: '',
      amount: '',
      fundType: 'additional'
    });
    setIsAddFundsOpen(true);
  };

  const handleSaveAddFunds = (e) => {
    e.preventDefault();
    if (!fundForm.reference || !fundForm.amount || Number(fundForm.amount) <= 0) {
      addToast('Please provide a valid reference and positive amount.', 'warning');
      return;
    }

    const assignedProj = projects.find((p) => p.id === fundForm.projectId);
    const newEntry = {
      id: `fund-${Date.now()}`,
      projectId: fundForm.projectId,
      projectName: assignedProj?.name || currentProject?.name || 'Assigned Site',
      reference: fundForm.reference.trim(),
      date: fundForm.date || getTodayStr(),
      description: fundForm.description.trim() || 'Project material funding',
      amount: Number(fundForm.amount),
      fundType: fundForm.fundType || 'additional'
    };

    setFundsList((prev) => [newEntry, ...prev]);
    setIsAddFundsOpen(false);
    addToast(`Added fund: ${newEntry.reference} (${formatKSh(newEntry.amount)})`);
  };

  const handleOpenEditFund = (fund) => {
    setEditingFund(fund);
    setFundForm({
      projectId: fund.projectId,
      reference: fund.reference,
      date: fund.date,
      description: fund.description,
      amount: fund.amount,
      fundType: fund.fundType || 'additional'
    });
  };

  const handleSaveEditFund = (e) => {
    e.preventDefault();
    if (!editingFund) return;
    if (!fundForm.reference || !fundForm.amount || Number(fundForm.amount) <= 0) {
      addToast('Please provide a valid reference and positive amount.', 'warning');
      return;
    }

    const assignedProj = projects.find((p) => p.id === fundForm.projectId);
    setFundsList((prev) =>
      prev.map((f) =>
        f.id === editingFund.id
          ? {
            ...f,
            projectId: fundForm.projectId,
            projectName: assignedProj?.name || f.projectName,
            reference: fundForm.reference.trim(),
            date: fundForm.date,
            description: fundForm.description.trim(),
            amount: Number(fundForm.amount),
            fundType: fundForm.fundType
          }
          : f
      )
    );
    setEditingFund(null);
    addToast('Fund entry updated successfully.');
  };

  const handleDeleteFund = () => {
    if (!deletingFund) return;
    setFundsList((prev) => prev.filter((f) => f.id !== deletingFund.id));
    addToast(`Removed fund record: ${deletingFund.reference}`, 'info');
    setDeletingFund(null);
  };

  // -------------------------------------------------------------
  // 8. HANDLERS: EXPENSES CRUD
  // -------------------------------------------------------------
  const handleOpenAddExpense = () => {
    const targetPId =
      selectedProjectId && selectedProjectId !== 'all'
        ? selectedProjectId
        : (currentProject?.id || proj1Id);

    // Auto-generate next expense ID
    const nextNum = expensesList.length + 1;
    const autoId = `EXP-${String(nextNum).padStart(3, '0')}`;

    setExpenseForm({
      projectId: targetPId,
      expenseId: autoId,
      date: getTodayStr(),
      description: '',
      supplier: '',
      quantity: '',
      amount: '',
      category: 'Cement',
      invoiceRef: `INV-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setIsAddExpenseOpen(true);
  };

  const handleSaveAddExpense = (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      addToast('Please provide a valid description and positive total amount.', 'warning');
      return;
    }

    const assignedProj = projects.find((p) => p.id === expenseForm.projectId);
    const newExp = {
      id: `exp-${Date.now()}`,
      expenseId: expenseForm.expenseId || `EXP-${String(expensesList.length + 1).padStart(3, '0')}`,
      projectId: expenseForm.projectId,
      projectName: assignedProj?.name || currentProject?.name || 'Assigned Site',
      date: expenseForm.date || getTodayStr(),
      description: expenseForm.description.trim(),
      supplier: expenseForm.supplier.trim() || 'Approved Supplier',
      quantity: expenseForm.quantity.trim() || '1 Lot',
      amount: Number(expenseForm.amount),
      category: expenseForm.category || 'General',
      invoiceRef: expenseForm.invoiceRef.trim() || 'INV-DIRECT',
      status: 'Verified'
    };

    setExpensesList((prev) => [newExp, ...prev]);
    setIsAddExpenseOpen(false);
    addToast(`Recorded expense: ${newExp.expenseId} (${formatKSh(newExp.amount)})`);
  };

  const handleOpenEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      projectId: expense.projectId,
      expenseId: expense.expenseId,
      date: expense.date,
      description: expense.description,
      supplier: expense.supplier,
      quantity: expense.quantity,
      amount: expense.amount,
      category: expense.category,
      invoiceRef: expense.invoiceRef
    });
  };

  const handleSaveEditExpense = (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!expenseForm.description || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      addToast('Please provide a valid description and positive total amount.', 'warning');
      return;
    }

    const assignedProj = projects.find((p) => p.id === expenseForm.projectId);
    setExpensesList((prev) =>
      prev.map((e) =>
        e.id === editingExpense.id
          ? {
            ...e,
            projectId: expenseForm.projectId,
            projectName: assignedProj?.name || e.projectName,
            expenseId: expenseForm.expenseId,
            date: expenseForm.date,
            description: expenseForm.description.trim(),
            supplier: expenseForm.supplier.trim(),
            quantity: expenseForm.quantity.trim(),
            amount: Number(expenseForm.amount),
            category: expenseForm.category,
            invoiceRef: expenseForm.invoiceRef.trim()
          }
          : e
      )
    );
    setEditingExpense(null);
    addToast('Material expense transaction updated.');
  };

  const handleDeleteExpense = () => {
    if (!deletingExpense) return;
    setExpensesList((prev) => prev.filter((e) => e.id !== deletingExpense.id));
    addToast(`Deleted transaction: ${deletingExpense.expenseId}`, 'info');
    setDeletingExpense(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* 1. PAGE HEADER                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Material Expenses</span>
              {isCombinedView ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  All Sites Combined
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>{currentProject?.name || 'Selected Site'}</span>
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track material purchases and manage project funds.
            </p>
          </div>
        </div>

        {/* Print Ledger Action */}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" />
          <span>Print Financial Sheet</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP STATS CARDS (GRID OF 4)                                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Funds Received */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-500 shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Funds Received
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
              {formatKSh(metrics.totalFundsReceived)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Initial + Additional</div>
          </div>
        </div>

        {/* Total Material Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-500 shrink-0">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Material Expenses
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
              {formatKSh(metrics.totalMaterialExpenses)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Spent on materials</div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-500 shrink-0">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Available Balance
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5 font-mono">
              {formatKSh(metrics.availableBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Remaining funds</div>
          </div>
        </div>

        {/* Initial Funds Received */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-500 shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Initial Funds Received
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
              {formatKSh(metrics.initialFunds)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">From developer</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FUNDS RECEIVED SECTION                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Funds Received</h2>
          </div>

          <button
            onClick={handleOpenAddFunds}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Funds</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt / Reference</th>
                  <th className="py-3 px-4">Date Received</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount Received</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siteFunds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No funds recorded for this site workspace. Click &ldquo;Add Funds&rdquo; to record deposit.
                    </td>
                  </tr>
                ) : (
                  siteFunds.map((fund) => (
                    <tr key={fund.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{fund.reference}</span>
                          {isCombinedView && fund.projectName && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {fund.projectName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDate(fund.date)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {fund.description}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 font-mono">
                        {formatKSh(fund.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditFund(fund)}
                            title="Edit Fund"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingFund(fund)}
                            title="Delete Fund"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {/* Total Row */}
                {siteFunds.length > 0 && (
                  <tr className="bg-slate-50/40 font-bold border-t border-slate-200">
                    <td className="py-3.5 px-4 text-slate-900 font-extrabold text-xs">
                      Total Funds Received
                    </td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 text-xs">
                      {formatKSh(metrics.totalFundsReceived)}
                    </td>
                    <td className="py-3.5 px-4"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MATERIAL EXPENSE TRANSACTIONS SECTION                      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Material Expense Transactions
            </h2>
          </div>

          <button
            onClick={handleOpenAddExpense}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, supplier or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions Table Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Expense ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Material / Expense Description</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Total Amount (KSh)</th>
                  <th className="py-3 px-4">Receipt / Invoice</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No material expenses found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {exp.expenseId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{exp.description}</span>
                          {isCombinedView && exp.projectName && (
                            <span className="text-[10px] font-normal bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {exp.projectName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {exp.supplier}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold font-mono">
                        {exp.quantity}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 font-mono">
                        {formatAmtOnly(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setViewingReceipt(exp)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingReceipt(exp)}
                            title="Quick View Voucher"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            title="Edit Expense"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            title="Delete Expense"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-500">
            <div>
              {filteredExpenses.length === 0
                ? 'Showing 0 transactions'
                : `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                  currentPage * itemsPerPage,
                  filteredExpenses.length
                )} of ${filteredExpenses.length} transactions`}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-7 h-7 px-2 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-colors ${page === currentPage
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. BOTTOM SUMMARY CARDS (ROW OF 5)                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-3">
        {/* Card 1: Initial Funds Received */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Initial Funds Received
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5">
              {formatKSh(metrics.initialFunds)}
            </div>
          </div>
        </div>

        {/* Card 2: Additional Funds Received */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Additional Funds Received
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5">
              {formatKSh(metrics.additionalFunds)}
            </div>
          </div>
        </div>

        {/* Card 3: Total Funds Available */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Total Funds Available
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5">
              {formatKSh(metrics.totalFundsReceived)}
            </div>
          </div>
        </div>

        {/* Card 4: Total Material Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Total Material Expenses
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5">
              {formatKSh(metrics.totalMaterialExpenses)}
            </div>
          </div>
        </div>

        {/* Card 5: Remaining Balance (Highlighted) */}
        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
            $
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-800">
              Remaining Balance
            </div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono mt-0.5">
              {formatKSh(metrics.availableBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD FUNDS                                            */}
      {/* ------------------------------------------------------------- */}
      {isAddFundsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Funds Received</h3>
                  <p className="text-[11px] text-slate-500">Deposit initial or additional project material float</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFundsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddFunds} className="p-6 space-y-4 text-xs">
              {/* Site Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Project Site
                </label>
                <select
                  value={fundForm.projectId}
                  onChange={(e) => setFundForm({ ...fundForm, projectId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'SITE'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fund Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fund Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundForm({ ...fundForm, fundType: 'initial' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${fundForm.fundType === 'initial'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>Initial Funding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundForm({ ...fundForm, fundType: 'additional' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${fundForm.fundType === 'additional'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Additional Deposit</span>
                  </button>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt / Reference <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Additional Deposit #002 or Cheque Ref"
                  value={fundForm.reference}
                  onChange={(e) => setFundForm({ ...fundForm, reference: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date Received <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fundForm.date}
                    onChange={(e) => setFundForm({ ...fundForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Received (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 500000"
                    value={fundForm.amount}
                    onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extra funds for purchasing more materials"
                  value={fundForm.description}
                  onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFundsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Funds Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT FUNDS                                           */}
      {/* ------------------------------------------------------------- */}
      {editingFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Funds Record</h3>
                  <p className="text-[11px] text-slate-500">Update deposit details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingFund(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFund} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Project Site
                </label>
                <select
                  value={fundForm.projectId}
                  onChange={(e) => setFundForm({ ...fundForm, projectId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fund Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundForm({ ...fundForm, fundType: 'initial' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${fundForm.fundType === 'initial'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>Initial Funding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundForm({ ...fundForm, fundType: 'additional' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${fundForm.fundType === 'additional'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Additional Deposit</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt / Reference <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fundForm.reference}
                  onChange={(e) => setFundForm({ ...fundForm, reference: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date Received <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fundForm.date}
                    onChange={(e) => setFundForm({ ...fundForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Received (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={fundForm.amount}
                    onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  value={fundForm.description}
                  onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFund(null)}
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
      {/* MODAL 3: DELETE FUNDS CONFIRMATION                            */}
      {/* ------------------------------------------------------------- */}
      {deletingFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Fund Record?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove &ldquo;{deletingFund.reference}&rdquo; of{' '}
              <strong className="text-slate-800">{formatKSh(deletingFund.amount)}</strong>? This will adjust your project balance.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeletingFund(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFund}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: ADD MATERIAL EXPENSE                                 */}
      {/* ------------------------------------------------------------- */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Material Expense</h3>
                  <p className="text-[11px] text-slate-500">Add an expenditure line item with supplier details</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddExpense} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Site
                  </label>
                  <select
                    value={expenseForm.projectId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expense ID
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.expenseId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="Cement">Cement</option>
                    <option value="Reinforcement Steel">Reinforcement Steel</option>
                    <option value="Sand & Aggregates">Sand & Aggregates</option>
                    <option value="Building Blocks">Building Blocks</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Formwork & Timber">Formwork & Timber</option>
                    <option value="General">General Site Supplies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Material / Expense Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cement (50kg bags) or D16 Steel Bars"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mombasa Cement Ltd"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 200 Bags or 10 Tons"
                    value={expenseForm.quantity}
                    onChange={(e) => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Amount (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 110000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EDIT MATERIAL EXPENSE                                */}
      {/* ------------------------------------------------------------- */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Expense Transaction</h3>
                  <p className="text-[11px] text-slate-500">Update line item details ({editingExpense.expenseId})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Site
                  </label>
                  <select
                    value={expenseForm.projectId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expense ID
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.expenseId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="Cement">Cement</option>
                    <option value="Reinforcement Steel">Reinforcement Steel</option>
                    <option value="Sand & Aggregates">Sand & Aggregates</option>
                    <option value="Building Blocks">Building Blocks</option>
                    <option value="Plumbing">Plumbing Materials</option>
                    <option value="Electrical">Electrical Materials</option>
                    <option value="Formwork & Timber">Formwork Materials & Timber</option>
                    <option value="General">General Site Supplies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Material / Expense Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={expenseForm.quantity}
                    onChange={(e) => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Amount (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Receipt / Invoice Ref
                  </label>
                  <input
                    type="text"
                    value={expenseForm.invoiceRef}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceRef: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
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
      {/* MODAL 6: DELETE EXPENSE CONFIRMATION                          */}
      {/* ------------------------------------------------------------- */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Expense Transaction?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete{' '}
              <strong className="text-slate-800 font-mono">{deletingExpense.expenseId}</strong> (
              {deletingExpense.description}) for{' '}
              <strong className="text-slate-800">{formatKSh(deletingExpense.amount)}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExpense}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: VIEW RECEIPT / INVOICE VOUCHER PREVIEW               */}
      {/* ------------------------------------------------------------- */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Official Procurement Voucher
                </div>
                <div className="text-sm font-extrabold flex items-center gap-2 mt-0.5">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  <span>{viewingReceipt.expenseId}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Site:</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Received:</span>
                  <span className="font-semibold text-slate-800">{formatDate(viewingReceipt.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier / Vendor:</span>
                  <span className="font-semibold text-slate-800">{viewingReceipt.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingReceipt.invoiceRef}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Material Line Item
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{viewingReceipt.description}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Category: {viewingReceipt.category} • Qty: {viewingReceipt.quantity}
                    </div>
                  </div>
                  <div className="text-right font-mono font-extrabold text-base text-slate-900">
                    {formatKSh(viewingReceipt.amount)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Verification Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verified & Stored
                </span>
              </div>

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
                  onClick={() => setViewingReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialExpensesPage;
