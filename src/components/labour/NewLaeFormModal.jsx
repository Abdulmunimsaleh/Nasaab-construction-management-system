import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getDayOfWeek } from '../../utils/formatters';
import {
  HardHat,
  Truck,
  Plus,
  Trash2,
  Calendar,
  X,
  Loader2,
  Building2,
  Camera,
  Image as ImageIcon,
  Upload,
  Clock,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';

export const NewLaeFormModal = ({
  isOpen,
  onClose,
  defaultProjectId,
  editData = null
}) => {
  const { currentProject, projects, createLaeForm, updateLaeForm, addToast, isForeman, isAdmin, isDirector, isPartner } = useApp();

  // Helper for local YYYY-MM-DD
  const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formProjectId, setFormProjectId] = useState('');
  const [reportDate, setReportDate] = useState(getLocalToday);
  const [estimatedSiteProgress, setEstimatedSiteProgress] = useState(0);

  // Section 1: Labour Trades
  const [labourTrades, setLabourTrades] = useState([
    {
      trade: 'Formwork Carpenters',
      foremanCount: 1,
      skilledCount: 4,
      unskilledCount: 2,
      foremanRate: 1500,
      skilledRate: 1000,
      unskilledRate: 500,
      workDoneToday: '',
      workPlanTomorrow: ''
    }
  ]);

  // Section 2: Machinery & Equipment
  const [equipmentList, setEquipmentList] = useState([
    {
      equipmentName: '',
      fuelCost: 0,
      operatorCost: 0,
      repairCost: 0,
      mechanicCost: 0,
      transportCost: 0,
      machineNotes: '',
      operatingStatus: 'Active'
    }
  ]);

  // Section 3: Additional Site Details
  const [delaysIssuesIncidents, setDelaysIssuesIncidents] = useState('');
  const [siteVisitors, setSiteVisitors] = useState('');

  // Section 4: Site Photos
  const [sitePhotos, setSitePhotos] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const sitePhotoInputRef = useRef(null);
  const siteCameraInputRef = useRef(null);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormProjectId(editData.project_id || defaultProjectId || currentProject?.id || projects[0]?.id || '');
      const rawDate = editData.date || editData.reportDate || editData.report_date || '';
      setReportDate(rawDate ? String(rawDate).split('T')[0] : getLocalToday());
      setEstimatedSiteProgress(editData.estimated_site_progress || 0);
      setDelaysIssuesIncidents(editData.delays_issues_incidents || '');
      setSiteVisitors(editData.site_visitors || '');

      const parsedPhotos = Array.isArray(editData.site_photos)
        ? editData.site_photos
        : (typeof editData.site_photos === 'string' ? JSON.parse(editData.site_photos || '[]') : []);
      setSitePhotos(parsedPhotos);

      // Map Labour Items
      if (editData.labourItems && editData.labourItems.length > 0) {
        setLabourTrades(editData.labourItems.map((item) => ({
          trade: item.trade || '',
          foremanCount: item.foreman_count !== undefined ? item.foreman_count : 0,
          skilledCount: item.skilled_count !== undefined ? item.skilled_count : (item.number_of_workers || 1),
          unskilledCount: item.unskilled_count !== undefined ? item.unskilled_count : 0,
          foremanRate: Number(item.foreman_rate) || 1500,
          skilledRate: Number(item.skilled_rate) || 1000,
          unskilledRate: Number(item.unskilled_rate) || 500,
          workDoneToday: item.work_done_today || item.notes || '',
          workPlanTomorrow: item.work_plan_tomorrow || ''
        })));
      } else {
        setLabourTrades([{
          trade: 'Formwork Carpenters',
          foremanCount: 1,
          skilledCount: 4,
          unskilledCount: 2,
          foremanRate: 1500,
          skilledRate: 1000,
          unskilledRate: 500,
          workDoneToday: '',
          workPlanTomorrow: ''
        }]);
      }

      // Map Equipment Items
      if (editData.equipmentItems && editData.equipmentItems.length > 0) {
        setEquipmentList(editData.equipmentItems.map((eq) => ({
          equipmentName: eq.equipment_name || '',
          fuelCost: Number(eq.fuel_cost) || 0,
          operatorCost: Number(eq.operator_cost) || 0,
          repairCost: Number(eq.repair_cost) || 0,
          mechanicCost: Number(eq.mechanic_cost) || 0,
          transportCost: Number(eq.transport_cost) || 0,
          machineNotes: eq.machine_notes || eq.remarks || '',
          operatingStatus: eq.operating_status || 'Active'
        })));
      } else {
        setEquipmentList([{
          equipmentName: '',
          fuelCost: 0,
          operatorCost: 0,
          repairCost: 0,
          mechanicCost: 0,
          transportCost: 0,
          machineNotes: '',
          operatingStatus: 'Active'
        }]);
      }
    } else {
      setFormProjectId(defaultProjectId || currentProject?.id || projects[0]?.id || '');
      setReportDate(getLocalToday());
      setEstimatedSiteProgress(0);
      setDelaysIssuesIncidents('');
      setSiteVisitors('');
      setSitePhotos([]);
      setLabourTrades([{
        trade: 'Formwork Carpenters',
        foremanCount: 1,
        skilledCount: 4,
        unskilledCount: 2,
        foremanRate: 1500,
        skilledRate: 1000,
        unskilledRate: 500,
        workDoneToday: '',
        workPlanTomorrow: ''
      }]);
      setEquipmentList([{
        equipmentName: '',
        fuelCost: 0,
        operatorCost: 0,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        machineNotes: '',
        operatingStatus: 'Active'
      }]);
    }
  }, [isOpen, editData, defaultProjectId, currentProject, projects]);

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.id === formProjectId) || currentProject || projects[0];

  // Handlers for Labour Trades
  const handleAddTrade = () => {
    setLabourTrades([
      ...labourTrades,
      {
        trade: '',
        foremanCount: 0,
        skilledCount: 0,
        unskilledCount: 0,
        foremanRate: 1500,
        skilledRate: 1000,
        unskilledRate: 500,
        workDoneToday: '',
        workPlanTomorrow: ''
      }
    ]);
  };

  const handleRemoveTrade = (index) => {
    if (labourTrades.length === 1) {
      setLabourTrades([{
        trade: '',
        foremanCount: 0,
        skilledCount: 0,
        unskilledCount: 0,
        foremanRate: 1500,
        skilledRate: 1000,
        unskilledRate: 500,
        workDoneToday: '',
        workPlanTomorrow: ''
      }]);
      return;
    }
    setLabourTrades(labourTrades.filter((_, i) => i !== index));
  };

  const handleUpdateTrade = (index, field, value) => {
    const updated = [...labourTrades];
    updated[index] = { ...updated[index], [field]: value };
    setLabourTrades(updated);
  };

  // Handlers for Machinery & Equipment
  const handleAddEquipment = () => {
    setEquipmentList([
      ...equipmentList,
      {
        equipmentName: '',
        fuelCost: 0,
        operatorCost: 0,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        machineNotes: '',
        operatingStatus: 'Active'
      }
    ]);
  };

  const handleRemoveEquipment = (index) => {
    if (equipmentList.length === 1) {
      setEquipmentList([{
        equipmentName: '',
        fuelCost: 0,
        operatorCost: 0,
        repairCost: 0,
        mechanicCost: 0,
        transportCost: 0,
        machineNotes: '',
        operatingStatus: 'Active'
      }]);
      return;
    }
    setEquipmentList(equipmentList.filter((_, i) => i !== index));
  };

  const handleUpdateEquipment = (index, field, value) => {
    const updated = [...equipmentList];
    updated[index] = { ...updated[index], [field]: value };
    setEquipmentList(updated);
  };

  // Convert uploaded image file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSitePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            url: dataUrl
          };
        })
      );
      setSitePhotos([...sitePhotos, ...newPhotos]);
    } catch (err) {
      addToast('Failed to process site photos', 'error');
    }
  };

  const handleRemoveSitePhoto = (photoIndex) => {
    setSitePhotos(sitePhotos.filter((_, idx) => idx !== photoIndex));
  };

  // Permissions: only admin, director, and partner can access/modify rates
  const canEditRate = Boolean(isAdmin || isDirector || isPartner);

  // Calculations for overall summary
  const totalWorkers = labourTrades.reduce((acc, t) => {
    return acc + (Number(t.foremanCount) || 0) + (Number(t.skilledCount) || 0) + (Number(t.unskilledCount) || 0);
  }, 0);

  const totalLabourCost = labourTrades.reduce((acc, t) => {
    const fRate = canEditRate ? (Number(t.foremanRate) || 1500) : 1500;
    const sRate = canEditRate ? (Number(t.skilledRate) || 1000) : 1000;
    const uRate = canEditRate ? (Number(t.unskilledRate) || 500) : 500;

    const fCost = (Number(t.foremanCount) || 0) * fRate;
    const sCost = (Number(t.skilledCount) || 0) * sRate;
    const uCost = (Number(t.unskilledCount) || 0) * uRate;
    return acc + fCost + sCost + uCost;
  }, 0);

  const handleSubmit = async (e, submissionStatus = 'submitted') => {
    if (e && e.preventDefault) e.preventDefault();

    const finalProjectId = targetProject?.id || formProjectId || currentProject?.id;
    if (!finalProjectId) {
      addToast('Please select a project before saving.', 'error');
      return;
    }

    if (!reportDate) {
      addToast('Please specify the report date.', 'error');
      return;
    }

    // Filter valid labour trades
    const validTrades = labourTrades.filter(t => t.trade && t.trade.trim());
    const validEquipment = equipmentList.filter(eq => eq.equipmentName && eq.equipmentName.trim());

    setIsSubmitting(true);
    try {
      const payload = {
        projectId: finalProjectId,
        date: reportDate,
        reportDate,
        weather: 'Clear / Sunny',
        estimatedSiteProgress: Number(estimatedSiteProgress) || 0,
        delaysIssuesIncidents,
        siteVisitors,
        sitePhotos,
        generalNotes: delaysIssuesIncidents || null,
        status: submissionStatus,
        labourItems: validTrades.map((t) => ({
          trade: t.trade,
          foremanCount: Number(t.foremanCount) || 0,
          skilledCount: Number(t.skilledCount) || 0,
          unskilledCount: Number(t.unskilledCount) || 0,
          foremanRate: canEditRate ? (Number(t.foremanRate) || 1500) : 1500,
          skilledRate: canEditRate ? (Number(t.skilledRate) || 1000) : 1000,
          unskilledRate: canEditRate ? (Number(t.unskilledRate) || 500) : 500,
          workDoneToday: t.workDoneToday || '',
          workPlanTomorrow: t.workPlanTomorrow || ''
        })),
        equipmentItems: validEquipment.map((eq) => ({
          equipmentName: eq.equipmentName,
          fuelCost: Number(eq.fuelCost) || 0,
          operatorCost: Number(eq.operatorCost) || 0,
          repairCost: Number(eq.repairCost) || 0,
          mechanicCost: Number(eq.mechanicCost) || 0,
          transportCost: Number(eq.transportCost) || 0,
          machineNotes: eq.machineNotes || '',
          operatingStatus: eq.operatingStatus || 'Active'
        }))
      };

      if (editData && editData.id) {
        await updateLaeForm(editData.id, payload);
      } else {
        await createLaeForm(payload);
      }

      onClose();
    } catch (err) {
      // Handled in context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {editData ? 'Edit Labour, Activity & Equipment Form' : 'New Labour, Activity & Equipment Form'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Official daily site diary recording labour, equipment, and progress.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Row: PROJECT, REPORT DATE, DAY OF WEEK, ESTIMATED SITE PROGRESS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                PROJECT <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 appearance-none focus:border-amber-500 focus:outline-none"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}-{p.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  REPORT DATE <span className="text-rose-500">*</span>
                </label>
                {reportDate && (
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    {getDayOfWeek(reportDate)}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                DAY OF WEEK
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {getDayOfWeek(reportDate) || '—'}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 italic">
                Auto-assigned to date
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                ESTIMATED PROGRESS (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={estimatedSiteProgress}
                  onChange={(e) => setEstimatedSiteProgress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none pr-16"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[11px] font-medium text-slate-400">
                  % Done
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: LABOUR & WORKFORCE */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/15 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <HardHat className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    LABOUR & WORKFORCE
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Record headcount and daily labor expense by trade
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddTrade}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/80 bg-white hover:bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Labour Trade / Category</span>
              </button>
            </div>

            {/* List of Labour Trade Cards */}
            <div className="space-y-4">
              {labourTrades.map((tradeItem, idx) => {
                const fCount = Number(tradeItem.foremanCount) || 0;
                const sCount = Number(tradeItem.skilledCount) || 0;
                const uCount = Number(tradeItem.unskilledCount) || 0;
                const fRate = canEditRate ? (Number(tradeItem.foremanRate) || 1500) : 1500;
                const sRate = canEditRate ? (Number(tradeItem.skilledRate) || 1000) : 1000;
                const uRate = canEditRate ? (Number(tradeItem.unskilledRate) || 500) : 500;

                const tradeHeadcount = fCount + sCount + uCount;
                const tradeEstCost = (fCount * fRate) + (sCount * sRate) + (uCount * uRate);

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs"
                  >
                    {/* Trade Category Header & Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Formwork Carpenters, Masonry, Steel Fixing..."
                        value={tradeItem.trade}
                        onChange={(e) => handleUpdateTrade(idx, 'trade', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTrade(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Headcount Inputs (3 Columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          FOREMAN / SUP.
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="1"
                          value={tradeItem.foremanCount}
                          onChange={(e) => handleUpdateTrade(idx, 'foremanCount', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          SKILLED WORKERS
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="4"
                          value={tradeItem.skilledCount}
                          onChange={(e) => handleUpdateTrade(idx, 'skilledCount', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          UNSKILLED / HELPERS
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="2"
                          value={tradeItem.unskilledCount}
                          onChange={(e) => handleUpdateTrade(idx, 'unskilledCount', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Fixed Rates Inputs (3 Columns) */}
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            FOREMAN RATE (KES)
                          </label>
                          <input
                            type="number"
                            value={fRate}
                            readOnly={!canEditRate}
                            disabled={!canEditRate}
                            onChange={(e) => handleUpdateTrade(idx, 'foremanRate', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              !canEditRate
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                                : 'bg-white text-slate-800 border-slate-200 focus:border-amber-500 focus:outline-none'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            SKILLED RATE (KES)
                          </label>
                          <input
                            type="number"
                            value={sRate}
                            readOnly={!canEditRate}
                            disabled={!canEditRate}
                            onChange={(e) => handleUpdateTrade(idx, 'skilledRate', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              !canEditRate
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                                : 'bg-white text-slate-800 border-slate-200 focus:border-amber-500 focus:outline-none'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            HELPER RATE (KES)
                          </label>
                          <input
                            type="number"
                            value={uRate}
                            readOnly={!canEditRate}
                            disabled={!canEditRate}
                            onChange={(e) => handleUpdateTrade(idx, 'unskilledRate', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              !canEditRate
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                                : 'bg-white text-slate-800 border-slate-200 focus:border-amber-500 focus:outline-none'
                            }`}
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] italic text-slate-400">
                        Rates are set by Admin / Quantities / Project Manager
                      </p>
                    </div>

                    {/* Work Done & Work Plan Tomorrow Textareas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          WORK DONE TODAY
                        </label>
                        <textarea
                          rows={2}
                          placeholder={`Work completed today for ${tradeItem.trade || 'this trade'}...`}
                          value={tradeItem.workDoneToday}
                          onChange={(e) => handleUpdateTrade(idx, 'workDoneToday', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          WORK PLAN TOMORROW
                        </label>
                        <textarea
                          rows={2}
                          placeholder={`Work planned tomorrow for ${tradeItem.trade || 'this trade'}...`}
                          value={tradeItem.workPlanTomorrow}
                          onChange={(e) => handleUpdateTrade(idx, 'workPlanTomorrow', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Bottom Trade Summary Pill */}
                    <div className="flex justify-end pt-1">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
                        <span>Trade Headcount: <strong className="text-amber-700">{tradeHeadcount}</strong></span>
                        <span className="text-amber-400">|</span>
                        <span>Est. Cost: <strong className="text-amber-700">KES {tradeEstCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Another Labour Category Button */}
            <button
              type="button"
              onClick={handleAddTrade}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/70 text-amber-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Add Another Labour Category</span>
            </button>

            {/* Overall Labour Summary Box (Dark Banner) */}
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

          {/* SECTION 2: MACHINERY & EQUIPMENT */}
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/20 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    MACHINERY & EQUIPMENT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track machinery on site, operating & maintenance expenses.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddEquipment}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/80 bg-white hover:bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Equipment / Machine</span>
              </button>
            </div>

            {/* Machinery Items */}
            <div className="space-y-4">
              {equipmentList.map((eq, idx) => {
                const fuel = Number(eq.fuelCost) || 0;
                const operator = Number(eq.operatorCost) || 0;
                const repair = Number(eq.repairCost) || 0;
                const mechanic = Number(eq.mechanicCost) || 0;
                const transport = Number(eq.transportCost) || 0;
                const totalMachineExpense = fuel + operator + repair + mechanic + transport;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs"
                  >
                    {/* Machine Name & Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Cat 320D Excavator - 20T (EX-04)"
                        value={eq.equipmentName}
                        onChange={(e) => handleUpdateEquipment(idx, 'equipmentName', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Equipment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 5 Expense Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          FUEL COST (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eq.fuelCost}
                          onChange={(e) => handleUpdateEquipment(idx, 'fuelCost', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          OPERATOR COST (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eq.operatorCost}
                          onChange={(e) => handleUpdateEquipment(idx, 'operatorCost', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          REPAIR / SPARES COST (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eq.repairCost}
                          onChange={(e) => handleUpdateEquipment(idx, 'repairCost', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          MECHANIC COST (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eq.mechanicCost}
                          onChange={(e) => handleUpdateEquipment(idx, 'mechanicCost', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          TRANSPORT (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eq.transportCost}
                          onChange={(e) => handleUpdateEquipment(idx, 'transportCost', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Machine Notes / Status / Working Hours */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        MACHINE NOTES / STATUS / WORKING HOURS
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 8.5 engine hours logged. Bulk trenching south perimeter."
                        value={eq.machineNotes}
                        onChange={(e) => handleUpdateEquipment(idx, 'machineNotes', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* Bottom Machine Summary Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                      <div className="text-xs text-slate-700">
                        Total Machine Expense: <strong className="font-mono text-slate-900">KES {totalMachineExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500">Operating Status:</span>
                        <select
                          value={eq.operatingStatus}
                          onChange={(e) => handleUpdateEquipment(idx, 'operatingStatus', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Standby">Standby</option>
                          <option value="Breakdown">Breakdown</option>
                          <option value="Under Repair">Under Repair</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Another Machine / Equipment Button */}
            <button
              type="button"
              onClick={handleAddEquipment}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/30 hover:bg-orange-100/50 text-orange-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Add Another Machine / Equipment</span>
            </button>
          </div>

          {/* SECTION 3: ADDITIONAL SITE DETAILS */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                DELAYS, ISSUES & SAFETY INCIDENTS
              </label>
              <textarea
                rows={3}
                placeholder="Detail any site delays, weather slippages, equipment downtime, and HSE / safety incidents or toolbox talks..."
                value={delaysIssuesIncidents}
                onChange={(e) => setDelaysIssuesIncidents(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                SITE VISITORS & CLIENT REPS
              </label>
              <input
                type="text"
                placeholder="e.g. Architect inspection, Structural Engineer, County Building Inspector..."
                value={siteVisitors}
                onChange={(e) => setSiteVisitors(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* SECTION 4: SITE PHOTOS */}
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-slate-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                SITE PHOTOS
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => siteCameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer shadow-xs transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Take Photo</span>
              </button>
              <input
                ref={siteCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSitePhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => sitePhotoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>Choose from Gallery</span>
              </button>
              <input
                ref={sitePhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSitePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Photos Preview Grid or Empty state */}
            {sitePhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-2">
                {sitePhotos.map((photo, pIdx) => (
                  <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                    <img src={photo.url} alt={photo.name || 'Site Photo'} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveSitePhoto(pIdx)}
                      className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600">No photos attached yet.</p>
                <p className="text-[11px] text-slate-400">Use the buttons above to capture or upload site photos.</p>
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'submitted')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{editData ? 'Update Daily Report' : 'Submit Daily Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLaeFormModal;
