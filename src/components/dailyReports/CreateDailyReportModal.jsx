import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { CloudSun, HardHat, Truck, Boxes, AlertTriangle, Camera, Image, X, ImagePlus, Video, CircleDot, XCircle, Trash2, Plus, Users } from 'lucide-react';

import { formatDate } from '../../utils/formatters';
import { canAccessCosts, canEditRates } from '../../utils/auth';

export const CreateDailyReportModal = ({ isOpen, onClose, preselectedProjectId, reportToEdit }) => {
  const { projects, createDailyReport, updateDailyReport, currentUser } = useApp();
  const canManageRates = canAccessCosts(currentUser?.role);
  const canEditRatesFlag = canEditRates(currentUser?.role);

  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: preselectedProjectId || projects[0]?.id || 'PRJ-001',
    workDoneToday: '',
    workCompletedYesterday: '',
    workPlanTomorrow: '',
    plannedWork: '',
    delaysAndSafetyIncidents: '',
    visitorInformation: 'Consulting Resident Engineer site inspection at 11:00 AM.',
    materialsReceivedToday: '',
    materialsNeededTomorrow: '',
    status: 'Submitted',
    photosCount: 0,
    location: '',
    weather: 'Clear / Sunny',
    temperature: '25°C',
    siteConditions: 'Dry, accessible ground.',
    overallProgress: 50,
    workersAbsent: 1
  });

  // --- Labour & Workforce state ---
  // Fixed default rates: Foreman=1500, Skilled=1000, Non-Skilled(Helper)=500
  const DEFAULT_FOREMAN_RATE = 1500;
  const DEFAULT_SKILLED_RATE = 1000;
  const DEFAULT_HELPER_RATE = 500;

  const [labourCategories, setLabourCategories] = useState([
    {
      id: 'labour-1',
      tradeName: 'Formwork Carpenters',
      foremanCount: 1,
      skilledCount: 4,
      unskilledCount: 2,
      foremanRate: DEFAULT_FOREMAN_RATE,
      skilledRate: DEFAULT_SKILLED_RATE,
      helperRate: DEFAULT_HELPER_RATE,
      workDoneToday: '',
      workPlanTomorrow: ''
    },
    {
      id: 'labour-2',
      tradeName: 'Steel Fixers & Benders',
      foremanCount: 1,
      skilledCount: 6,
      unskilledCount: 3,
      foremanRate: DEFAULT_FOREMAN_RATE,
      skilledRate: DEFAULT_SKILLED_RATE,
      helperRate: DEFAULT_HELPER_RATE,
      workDoneToday: '',
      workPlanTomorrow: ''
    }
  ]);

  const handleAddLabourCategory = () => {
    setLabourCategories((prev) => [
      ...prev,
      {
        id: `labour-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tradeName: '',
        foremanCount: '',
        skilledCount: '',
        unskilledCount: '',
        foremanRate: DEFAULT_FOREMAN_RATE,
        skilledRate: DEFAULT_SKILLED_RATE,
        helperRate: DEFAULT_HELPER_RATE,
        workDoneToday: '',
        workPlanTomorrow: ''
      }
    ]);
  };

  const handleRemoveLabourCategory = (id) => {
    setLabourCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleLabourChange = (id, field, value) => {
    setLabourCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== id) return cat;
        // Block rate changes if user doesn't have edit permission
        if (['foremanRate', 'skilledRate', 'helperRate'].includes(field) && !canEditRatesFlag) {
          return cat;
        }
        if (field === 'tradeName' || field === 'workDoneToday' || field === 'workPlanTomorrow') {
          return { ...cat, [field]: value };
        }
        return { ...cat, [field]: value === '' ? '' : Number(value) };
      })
    );
  };

  const getCategoryHeadcount = (cat) => {
    return (Number(cat.foremanCount) || 0) + (Number(cat.skilledCount) || 0) + (Number(cat.unskilledCount) || 0);
  };

  const getCategoryCost = (cat) => {
    return (
      (Number(cat.foremanCount) || 0) * (Number(cat.foremanRate) || DEFAULT_FOREMAN_RATE) +
      (Number(cat.skilledCount) || 0) * (Number(cat.skilledRate) || DEFAULT_SKILLED_RATE) +
      (Number(cat.unskilledCount) || 0) * (Number(cat.helperRate) || DEFAULT_HELPER_RATE)
    );
  };

  const totalWorkersOnSite = labourCategories.reduce((sum, cat) => sum + getCategoryHeadcount(cat), 0);
  const totalDailyCost = labourCategories.reduce((sum, cat) => sum + getCategoryCost(cat), 0);

  // --- Plant & Equipment state ---
  const [plantAndEquipment, setPlantAndEquipment] = useState([
    {
      id: 'eq-1',
      machineName: 'Cat 320D Excavator - 20T (EX-04)',
      fuelQty: 145,
      oilQty: 5,
      fuelCost: 217.50,
      operatorCost: 95.00,
      repairCost: 50.00,
      mechanicCost: 40.00,
      transportCost: 0.00,
      notes: '8.5 engine hours logged. Bulk trenching south perimeter.',
      status: 'Active'
    },
    {
      id: 'eq-2',
      machineName: 'JCB 3DX Backhoe Loader (BH-02)',
      fuelQty: 60,
      oilQty: 2,
      fuelCost: 90.00,
      operatorCost: 80.00,
      repairCost: 0.00,
      mechanicCost: 0.00,
      transportCost: 120.00,
      notes: '6.0 engine hours logged. Spoil loading and material shifting.',
      status: 'Active'
    }
  ]);

  const handleAddEquipment = () => {
    setPlantAndEquipment((prev) => [
      ...prev,
      {
        id: `eq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        machineName: '',
        fuelQty: '',
        oilQty: '',
        fuelCost: '',
        operatorCost: '',
        repairCost: '',
        mechanicCost: '',
        transportCost: '',
        notes: '',
        status: 'Active'
      }
    ]);
  };

  const handleRemoveEquipment = (id) => {
    setPlantAndEquipment((prev) => prev.filter((eq) => eq.id !== id));
  };

  const handleEquipmentChange = (id, field, value) => {
    setPlantAndEquipment((prev) =>
      prev.map((eq) => {
        if (eq.id !== id) return eq;
        if (field === 'machineName' || field === 'notes' || field === 'status') {
          return { ...eq, [field]: value };
        }
        return { ...eq, [field]: value === '' ? '' : Number(value) };
      })
    );
  };

  const getEquipmentExpense = (eq) => {
    return (
      (Number(eq.fuelCost) || 0) +
      (Number(eq.operatorCost) || 0) +
      (Number(eq.repairCost) || 0) +
      (Number(eq.mechanicCost) || 0) +
      (Number(eq.transportCost) || 0)
    );
  };

  const totalEquipmentCost = plantAndEquipment.reduce(
    (sum, eq) => sum + getEquipmentExpense(eq),
    0
  );

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `KES ${num.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // --- Photo state ---
  const [photos, setPhotos] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraError('');
  }, []);

  // Cleanup camera on unmount or modal close
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Populate form when reportToEdit is provided or reset when creating a new report
  useEffect(() => {
    if (reportToEdit && isOpen) {
      const workDone = reportToEdit.workDoneToday || reportToEdit.workCompletedYesterday || '';
      const workPlan = reportToEdit.workPlanTomorrow || reportToEdit.plannedWork || '';
      setFormData({
        date: reportToEdit.date || new Date().toISOString().split('T')[0],
        projectId: reportToEdit.projectId || projects[0]?.id || 'PRJ-001',
        workDoneToday: workDone,
        workCompletedYesterday: workDone,
        workPlanTomorrow: workPlan,
        plannedWork: workPlan,
        delaysAndSafetyIncidents: reportToEdit.delaysAndSafetyIncidents || reportToEdit.delaysForYesterday || '',
        visitorInformation: reportToEdit.visitorInformation || '',
        materialsReceivedToday: reportToEdit.materialsReceivedToday || '',
        materialsNeededTomorrow: reportToEdit.materialsNeededTomorrow || '',
        status: reportToEdit.status || 'Submitted',
        photosCount: (reportToEdit.photos && reportToEdit.photos.length) || reportToEdit.photosCount || 0,
        location: reportToEdit.location || '',
        weather: reportToEdit.weather || 'Clear / Sunny',
        temperature: reportToEdit.temperature || '25°C',
        siteConditions: reportToEdit.siteConditions || 'Dry, accessible ground.',
        overallProgress: reportToEdit.overallProgress !== undefined ? reportToEdit.overallProgress : 50,
        workersAbsent: reportToEdit.workersAbsent !== undefined ? reportToEdit.workersAbsent : 1
      });
      if (Array.isArray(reportToEdit.labourCategories) && reportToEdit.labourCategories.length > 0) {
        setLabourCategories(
          reportToEdit.labourCategories.map((cat) => ({
            ...cat,
            foremanRate: cat.foremanRate !== undefined && cat.foremanRate !== '' ? Number(cat.foremanRate) : DEFAULT_FOREMAN_RATE,
            skilledRate: cat.skilledRate !== undefined && cat.skilledRate !== '' ? Number(cat.skilledRate) : DEFAULT_SKILLED_RATE,
            helperRate: cat.helperRate !== undefined && cat.helperRate !== '' ? Number(cat.helperRate) : DEFAULT_HELPER_RATE,
            workDoneToday: cat.workDoneToday || cat.workCompletedYesterday || '',
            workPlanTomorrow: cat.workPlanTomorrow || cat.plannedWork || ''
          }))
        );
      }
      if (Array.isArray(reportToEdit.plantAndEquipment) && reportToEdit.plantAndEquipment.length > 0) {
        setPlantAndEquipment(reportToEdit.plantAndEquipment);
      }
      if (Array.isArray(reportToEdit.photos)) {
        setPhotos(reportToEdit.photos);
      }
    } else if (!reportToEdit && isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        projectId: preselectedProjectId || projects[0]?.id || 'PRJ-001',
        workDoneToday: '',
        workCompletedYesterday: '',
        workPlanTomorrow: '',
        plannedWork: '',
        delaysAndSafetyIncidents: '',
        visitorInformation: 'Consulting Resident Engineer site inspection at 11:00 AM.',
        materialsReceivedToday: '',
        materialsNeededTomorrow: '',
        status: 'Submitted',
        photosCount: 0,
        location: '',
        weather: 'Clear / Sunny',
        temperature: '25°C',
        siteConditions: 'Dry, accessible ground.',
        overallProgress: 50,
        workersAbsent: 1
      });
      setLabourCategories([
        {
          id: 'labour-1',
          tradeName: 'Formwork Carpenters',
          foremanCount: 1,
          skilledCount: 4,
          unskilledCount: 2,
          foremanRate: 1500,
          skilledRate: 1000,
          helperRate: 500,
          workDoneToday: '',
          workPlanTomorrow: ''
        },
        {
          id: 'labour-2',
          tradeName: 'Steel Fixers & Benders',
          foremanCount: 1,
          skilledCount: 6,
          unskilledCount: 3,
          foremanRate: 1500,
          skilledRate: 1000,
          helperRate: 500,
          workDoneToday: '',
          workPlanTomorrow: ''
        }
      ]);
      setPlantAndEquipment([
        {
          id: 'eq-1',
          machineName: 'Cat 320D Excavator - 20T (EX-04)',
          fuelQty: 145,
          oilQty: 5,
          fuelCost: 217.50,
          operatorCost: 95.00,
          repairCost: 50.00,
          mechanicCost: 40.00,
          transportCost: 0.00,
          notes: '8.5 engine hours logged. Bulk trenching south perimeter.',
          status: 'Active'
        },
        {
          id: 'eq-2',
          machineName: 'JCB 3DX Backhoe Loader (BH-02)',
          fuelQty: 60,
          oilQty: 2,
          fuelCost: 90.00,
          operatorCost: 80.00,
          repairCost: 0.00,
          mechanicCost: 0.00,
          transportCost: 120.00,
          notes: '6.0 engine hours logged. Spoil loading and material shifting.',
          status: 'Active'
        }
      ]);
      setPhotos([]);
    }
  }, [reportToEdit, isOpen, preselectedProjectId, projects]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera. Please try again.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

    setPhotos((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Site_Photo_${timestamp}.jpg`,
        size: Math.round((dataUrl.length * 3) / 4),
        dataUrl,
        source: 'camera',
      },
    ]);

    // Don't stop camera — user might want to take multiple photos
  };

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            dataUrl: e.target.result,
            source: 'gallery',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGallerySelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'workDoneToday') {
        next.workCompletedYesterday = value;
      } else if (name === 'workCompletedYesterday') {
        next.workDoneToday = value;
      } else if (name === 'workPlanTomorrow') {
        next.plannedWork = value;
      } else if (name === 'plannedWork') {
        next.workPlanTomorrow = value;
      }
      return next;
    });
  };

  const handleSubmit = (statusToSet = 'Submitted') => {
    if (!formData.projectId) {
      alert('Please select a Project.');
      return;
    }

    stopCamera();

    // Calculate total machinery hours from notes if specified
    let totalEquipmentHours = 0;
    const mappedEquipmentSummary = plantAndEquipment
      .filter((eq) => eq.machineName && eq.machineName.trim() !== '')
      .map((eq) => {
        const match = (eq.notes || '').match(/(\d+(\.\d+)?)\s*(engine\s*)?hours?/i);
        const hrs = match ? parseFloat(match[1]) : 8;
        totalEquipmentHours += hrs;
        return {
          name: eq.machineName,
          hours: hrs,
          downtime: 0,
          status: eq.status || 'Active',
          fuelQty: Number(eq.fuelQty) || 0,
          oilQty: Number(eq.oilQty) || 0,
          totalExpense: getEquipmentExpense(eq),
          notes: eq.notes || ''
        };
      });

    // Parse materials text into summary list
    const parsedMaterialsSummary = formData.materialsReceivedToday
      ? formData.materialsReceivedToday
        .split(/[\n,]/)
        .map((m) => m.trim())
        .filter(Boolean)
        .map((item) => ({
          name: item,
          qty: 'Logged'
        }))
      : [];

    const aggregatedWorkDone = labourCategories
      .map((cat) => (cat.workDoneToday ? `${cat.tradeName || 'General Trade'}: ${cat.workDoneToday}` : ''))
      .filter(Boolean)
      .join('\n');
    const aggregatedWorkPlan = labourCategories
      .map((cat) => (cat.workPlanTomorrow ? `${cat.tradeName || 'General Trade'}: ${cat.workPlanTomorrow}` : ''))
      .filter(Boolean)
      .join('\n');

    const mappedLabourCategories = labourCategories.map((cat) => ({
      id: cat.id,
      tradeName: cat.tradeName || 'General Trade',
      foremanCount: Number(cat.foremanCount) || 0,
      skilledCount: Number(cat.skilledCount) || 0,
      unskilledCount: Number(cat.unskilledCount) || 0,
      foremanRate: Number(cat.foremanRate) || DEFAULT_FOREMAN_RATE,
      skilledRate: Number(cat.skilledRate) || DEFAULT_SKILLED_RATE,
      helperRate: Number(cat.helperRate) || DEFAULT_HELPER_RATE,
      headcount: getCategoryHeadcount(cat),
      cost: getCategoryCost(cat),
      workDoneToday: cat.workDoneToday || '',
      workCompletedYesterday: cat.workDoneToday || '',
      workPlanTomorrow: cat.workPlanTomorrow || '',
      plannedWork: cat.workPlanTomorrow || ''
    }));

    const reportPayload = {
      ...formData,
      workDoneToday: aggregatedWorkDone || formData.workDoneToday || '',
      workCompletedYesterday: aggregatedWorkDone || formData.workDoneToday || '',
      workPlanTomorrow: aggregatedWorkPlan || formData.workPlanTomorrow || '',
      plannedWork: aggregatedWorkPlan || formData.workPlanTomorrow || '',
      status: statusToSet,
      overallProgress: Number(formData.overallProgress) || 0,
      delaysAndSafetyIncidents: formData.delaysAndSafetyIncidents || '',
      delaysForYesterday: formData.delaysAndSafetyIncidents || 'None',
      safetyIncidents: formData.delaysAndSafetyIncidents || 'Zero incidents reported.',
      generalNotes: '',
      workersPresent: totalWorkersOnSite,
      workersAbsent: Number(formData.workersAbsent) || 0,
      labourCategories: mappedLabourCategories,
      totalLabourCost: totalDailyCost,
      plantAndEquipment: plantAndEquipment.map((eq) => ({
        ...eq,
        fuelQty: Number(eq.fuelQty) || 0,
        oilQty: Number(eq.oilQty) || 0,
        fuelCost: Number(eq.fuelCost) || 0,
        operatorCost: Number(eq.operatorCost) || 0,
        repairCost: Number(eq.repairCost) || 0,
        mechanicCost: Number(eq.mechanicCost) || 0,
        transportCost: Number(eq.transportCost) || 0,
        totalExpense: getEquipmentExpense(eq)
      })),
      totalEquipmentCost,
      equipmentOperatingHours: totalEquipmentHours || Number(formData.equipmentOperatingHours) || 8,
      equipmentSummary: mappedEquipmentSummary,
      materialsReceivedToday: formData.materialsReceivedToday || '',
      materialsNeededTomorrow: formData.materialsNeededTomorrow || '',
      materialsSummary: parsedMaterialsSummary,
      photosCount: photos.length,
      photos: photos.map((p) => ({ name: p.name, dataUrl: p.dataUrl })),
    };

    if (reportToEdit) {
      updateDailyReport(reportToEdit.id, reportPayload);
    } else {
      createDailyReport(reportPayload);
    }

    onClose();
  };

  // Stop camera when modal closes
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={reportToEdit ? `Edit Daily Site Report #${reportToEdit.id}` : "Create Daily Site Report"}
      subtitle={reportToEdit ? `Update shift records for ${formatDate(reportToEdit.date)} • ${reportToEdit.projectName}` : "Official daily site diary recording labour, equipment, materials and progress"}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Top Grid: Project & Weather */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Project <span className="text-rose-500">*</span>
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Report Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Estimated Site Progress (%)
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min="0"
                max="100"
                name="overallProgress"
                value={formData.overallProgress}
                onChange={handleChange}
                className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:border-amber-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-500">% Completed</span>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Site Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Block C – Ground Floor, Grid Line 4-7"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Labour & Workforce Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 mt-0.5"><HardHat className="w-5 h-5" /></span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Labour & Workforce
                </h3>
                <p className="text-[11px] text-slate-500">
                  Record headcount and daily labor expense by trade
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddLabourCategory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500 bg-white px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Labour Trade / Category</span>
            </button>
          </div>

          {/* Trade Cards */}
          <div className="space-y-3">
            {labourCategories.map((cat) => {
              const headcount = getCategoryHeadcount(cat);
              const cost = getCategoryCost(cat);
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-xs"
                >
                  {/* Top row: Trade name input & trash button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cat.tradeName}
                      onChange={(e) => handleLabourChange(cat.id, 'tradeName', e.target.value)}
                      placeholder="e.g. Formwork Carpenters, Steel Fixers & Benders..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLabourCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Remove Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Headcount columns */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Foreman / Sup.
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.foremanCount === '' ? '' : cat.foremanCount}
                        onChange={(e) => handleLabourChange(cat.id, 'foremanCount', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Skilled Workers
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.skilledCount === '' ? '' : cat.skilledCount}
                        onChange={(e) => handleLabourChange(cat.id, 'skilledCount', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Unskilled / Helpers
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.unskilledCount === '' ? '' : cat.unskilledCount}
                        onChange={(e) => handleLabourChange(cat.id, 'unskilledCount', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Rate columns - visible to everyone, editable only by Admin/Contractor/PM */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Foreman Rate (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.foremanRate === '' ? '' : cat.foremanRate}
                        onChange={(e) => handleLabourChange(cat.id, 'foremanRate', e.target.value)}
                        readOnly={!canEditRatesFlag}
                        tabIndex={!canEditRatesFlag ? -1 : undefined}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden ${canEditRatesFlag
                            ? 'bg-white focus:border-amber-500 cursor-text'
                            : 'bg-slate-50 cursor-not-allowed text-slate-600'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Skilled Rate (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.skilledRate === '' ? '' : cat.skilledRate}
                        onChange={(e) => handleLabourChange(cat.id, 'skilledRate', e.target.value)}
                        readOnly={!canEditRatesFlag}
                        tabIndex={!canEditRatesFlag ? -1 : undefined}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden ${canEditRatesFlag
                            ? 'bg-white focus:border-amber-500 cursor-text'
                            : 'bg-slate-50 cursor-not-allowed text-slate-600'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Helper Rate (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cat.helperRate === '' ? '' : cat.helperRate}
                        onChange={(e) => handleLabourChange(cat.id, 'helperRate', e.target.value)}
                        readOnly={!canEditRatesFlag}
                        tabIndex={!canEditRatesFlag ? -1 : undefined}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden ${canEditRatesFlag
                            ? 'bg-white focus:border-amber-500 cursor-text'
                            : 'bg-slate-50 cursor-not-allowed text-slate-600'
                          }`}
                      />
                    </div>
                  </div>
                  {!canEditRatesFlag && (
                    <p className="text-[10px] text-slate-400 italic mt-1">Rates are set by Admin / Contractor / Project Manager</p>
                  )}

                  {/* Trade Work Activities: Work Done Today & Work Plan Tomorrow */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Work Done Today
                      </label>
                      <textarea
                        rows={2}
                        value={cat.workDoneToday || ''}
                        onChange={(e) => handleLabourChange(cat.id, 'workDoneToday', e.target.value)}
                        placeholder={`Work completed today for ${cat.tradeName || 'this trade'}...`}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Work Plan Tomorrow
                      </label>
                      <textarea
                        rows={2}
                        value={cat.workPlanTomorrow || ''}
                        onChange={(e) => handleLabourChange(cat.id, 'workPlanTomorrow', e.target.value)}
                        placeholder={`Work planned tomorrow for ${cat.tradeName || 'this trade'}...`}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Badge: Trade Headcount & optional Est Cost */}
                  <div className="flex justify-end pt-1">
                    <div className="rounded-md border border-amber-300 bg-amber-50/80 px-3.5 py-1 text-xs text-amber-900 font-medium inline-flex items-center gap-1.5">
                      <span>Trade Headcount: <strong className="font-bold text-amber-950">{headcount}</strong></span>
                      <>
                        <span className="text-amber-400 font-normal">|</span>
                        <span>Est. Cost: <strong className="font-bold text-amber-950">{formatCurrency(cost)}</strong></span>
                      </>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Labour Category Button */}
          <button
            type="button"
            onClick={handleAddLabourCategory}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/70 text-amber-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Another Labour Category</span>
          </button>

          {/* Overall Labour Summary Dark Bar */}
          <div className="rounded-xl bg-[#0B1528] px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="text-xs font-black tracking-wider text-slate-300 uppercase">
              OVERALL LABOUR SUMMARY
            </div>
            <div className="flex items-center gap-8 justify-between sm:justify-end">
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-medium">Total Workers On Site</div>
                <div className="text-xl font-black text-amber-400">{totalWorkersOnSite}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-medium">Total Est. Daily Cost</div>
                <div className="text-xl font-black text-emerald-400">{formatCurrency(totalDailyCost)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Plant & Equipment Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 mt-0.5"><Truck className="w-5 h-5" /></span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  PLANT & EQUIPMENT
                </h3>
                <p className="text-[11px] text-slate-500">
                  Track machinery on-site, fuel level (mm), oil usage, operating & maintenance expenses
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddEquipment}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500 bg-white px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add Equipment / Machine</span>
            </button>
          </div>

          {/* Equipment Cards */}
          <div className="space-y-3">
            {plantAndEquipment.map((eq) => {
              const machineExpense = getEquipmentExpense(eq);
              return (
                <div
                  key={eq.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-xs"
                >
                  {/* Top row: Machine name input & trash button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={eq.machineName}
                      onChange={(e) => handleEquipmentChange(eq.id, 'machineName', e.target.value)}
                      placeholder="e.g. Cat 320D Excavator - 20T (EX-04)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(eq.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Remove Equipment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Fuel & Oil Columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Fuel (mm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={eq.fuelQty === '' ? '' : eq.fuelQty}
                        onChange={(e) => handleEquipmentChange(eq.id, 'fuelQty', e.target.value)}
                        placeholder="0 mm"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Engine & Hyd. Oil (mm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={eq.oilQty === '' ? '' : eq.oilQty}
                        onChange={(e) => handleEquipmentChange(eq.id, 'oilQty', e.target.value)}
                        placeholder="0 mm"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Expense Columns (in KES) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Fuel Cost (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={eq.fuelCost === '' ? '' : eq.fuelCost}
                        onChange={(e) => handleEquipmentChange(eq.id, 'fuelCost', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Operator Cost (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={eq.operatorCost === '' ? '' : eq.operatorCost}
                        onChange={(e) => handleEquipmentChange(eq.id, 'operatorCost', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Repair Cost (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={eq.repairCost === '' ? '' : eq.repairCost}
                        onChange={(e) => handleEquipmentChange(eq.id, 'repairCost', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Mechanic Cost (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={eq.mechanicCost === '' ? '' : eq.mechanicCost}
                        onChange={(e) => handleEquipmentChange(eq.id, 'mechanicCost', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Transport (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={eq.transportCost === '' ? '' : eq.transportCost}
                        onChange={(e) => handleEquipmentChange(eq.id, 'transportCost', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Machine Notes / Status / Working Hours */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Machine Notes / Status / Working Hours
                    </label>
                    <input
                      type="text"
                      value={eq.notes}
                      onChange={(e) => handleEquipmentChange(eq.id, 'notes', e.target.value)}
                      placeholder="e.g. 8.5 engine hours logged. Bulk trenching south perimeter."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Badge: Total Machine Expense & Operating Status */}
                  <div className="flex justify-end pt-1">
                    <div className="rounded-md border border-amber-300 bg-amber-50/80 px-3.5 py-1 text-xs text-amber-900 font-medium inline-flex items-center gap-1.5">
                      <span>Total Machine Expense: <strong className="font-bold text-amber-950">{formatCurrency(machineExpense)}</strong></span>
                      <span className="text-amber-400 font-normal">|</span>
                      <span>
                        Operating Status:{' '}
                        <select
                          value={eq.status || 'Active'}
                          onChange={(e) => handleEquipmentChange(eq.id, 'status', e.target.value)}
                          className="bg-transparent font-bold text-emerald-600 border-none outline-none cursor-pointer focus:ring-0 text-xs py-0 pl-0 pr-1 inline-block"
                        >
                          <option value="Active" className="text-emerald-700">Active</option>
                          <option value="Standby" className="text-amber-700">Standby</option>
                          <option value="Breakdown" className="text-rose-700">Breakdown</option>
                        </select>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Machine Button */}
          <button
            type="button"
            onClick={handleAddEquipment}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/70 text-amber-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Another Machine / Equipment</span>
          </button>
        </div>

        {/* Materials & Deliveries Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-500 mt-0.5"><Boxes className="w-5 h-5" /></span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                MATERIALS & DELIVERIES
              </h3>
              <p className="text-[11px] text-slate-500">
                Record materials received on site, batch numbers, delivery notes, or usage quantities
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                MATERIALS RECEIVED TODAY
              </label>
              <textarea
                rows={3}
                name="materialsReceivedToday"
                value={formData.materialsReceivedToday}
                onChange={handleChange}
                placeholder="List all materials, quantities, delivery tickets, and batch arrivals received on site today (e.g. 24 m³ C30 Concrete, 50 bags cement, 2 tons T16 rebar)..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                MATERIALS NEEDED TOMORROW
              </label>
              <textarea
                rows={3}
                name="materialsNeededTomorrow"
                value={formData.materialsNeededTomorrow}
                onChange={handleChange}
                placeholder="Specify materials, anticipated quantities, or requisitions required for tomorrow's planned activities..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Narrative Section: Delays, Safety, Visitors */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Delays,Issues & Safety Incidents
            </label>
            <textarea
              rows={2}
              name="delaysAndSafetyIncidents"
              value={formData.delaysAndSafetyIncidents}
              onChange={handleChange}
              placeholder="Detail any site delays, weather stoppages, equipment downtime, and HSE / safety incidents or toolbox talks..."
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Site Visitors & Client Reps
            </label>
            <input
              type="text"
              name="visitorInformation"
              value={formData.visitorInformation}
              onChange={handleChange}
              placeholder="Resident Engineer, NCA inspector, client director..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* ── Site Photos Section ── */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-amber-50/30 p-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            <Camera className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" />
            Site Photos
          </label>

          {/* Hidden canvas for capturing frames */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden gallery file input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGallerySelect}
          />

          {/* Camera viewfinder */}
          {cameraOpen && (
            <div className="mb-3 rounded-xl overflow-hidden border-2 border-amber-400 bg-black relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-48 sm:h-56 object-cover"
              />
              {/* Camera controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                  title="Close camera"
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full bg-white border-4 border-amber-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                  title="Take photo"
                >
                  <CircleDot className="w-7 h-7 text-amber-600" />
                </button>
                <div className="w-9 h-9" /> {/* Spacer for centering */}
              </div>
              {/* Live indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase">Live</span>
              </div>
            </div>
          )}

          {/* Camera error message */}
          {cameraError && (
            <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex flex-wrap gap-2.5 mb-3">
            <button
              type="button"
              onClick={cameraOpen ? stopCamera : startCamera}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm active:scale-[0.97] transition-all ${cameraOpen
                ? 'border-rose-300 bg-gradient-to-r from-rose-400 to-rose-500 text-white hover:from-rose-500 hover:to-rose-600'
                : 'border-amber-300 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-500 hover:to-amber-600'
                }`}
            >
              <Camera className="w-4 h-4" />
              {cameraOpen ? 'Close Camera' : 'Take Photo'}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all"
            >
              <ImagePlus className="w-4 h-4" />
              Choose from Gallery
            </button>
          </div>

          {/* Photo previews */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-28 object-cover"
                  />
                  {/* Overlay with file info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white font-medium truncate">{photo.name}</p>
                    <p className="text-[9px] text-white/70">{formatFileSize(photo.size)}</p>
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 text-slate-400">
              <Image className="w-8 h-8 mb-1.5 opacity-40" />
              <p className="text-[11px] font-medium">No photos attached yet</p>
              <p className="text-[10px]">Use the buttons above to capture or upload site photos</p>
            </div>
          )}

          {photos.length > 0 && (
            <p className="mt-2.5 text-[10px] font-semibold text-slate-500">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} attached to this report
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {reportToEdit ? 'Save as Draft' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(reportToEdit ? (reportToEdit.status || 'Submitted') : 'Submitted')}
            className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 transition-colors"
          >
            {reportToEdit ? 'Update Daily Report' : 'Submit Daily Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
