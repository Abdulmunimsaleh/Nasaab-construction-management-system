import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getDayOfWeek } from '../../utils/formatters';
import {
  Boxes,
  Plus,
  Trash2,
  Calendar,
  X,
  Loader2,
  TrendingUp,
  ArrowRightLeft,
  Camera,
  Image as ImageIcon,
  Upload,
  Check,
  Building2
} from 'lucide-react';

export const NewMaterialRequestModal = ({
  isOpen,
  onClose,
  defaultProjectId,
  editData = null
}) => {
  const { currentProject, projects, createMaterialRequest, updateMaterialRequest, addToast } = useApp();

  // Helper for local YYYY-MM-DD
  const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formProjectId, setFormProjectId] = useState('');
  const [logDate, setLogDate] = useState(getLocalToday);
  const [siteProgress, setSiteProgress] = useState('');
  const [materialsNeededTomorrow, setMaterialsNeededTomorrow] = useState('');
  const [sitePhotos, setSitePhotos] = useState([]);

  // Materials received today items
  const [items, setItems] = useState([
    {
      itemName: '',
      supplierVendor: '',
      deliveryNotes: '',
      quantity: 1,
      unit: 'delivery',
      estimatedUnitCost: 0,
      receiptPhotos: []
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const sitePhotoInputRef = useRef(null);
  const siteCameraInputRef = useRef(null);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormProjectId(editData.project_id || defaultProjectId || currentProject?.id || projects[0]?.id || '');
      const rawDate = editData.date_needed || editData.date || '';
      setLogDate(rawDate ? String(rawDate).split('T')[0] : getLocalToday());
      setSiteProgress(editData.site_progress || '');
      setMaterialsNeededTomorrow(editData.materials_needed_tomorrow || '');

      const parsedSitePhotos = Array.isArray(editData.site_photos)
        ? editData.site_photos
        : (typeof editData.site_photos === 'string' ? JSON.parse(editData.site_photos || '[]') : []);
      setSitePhotos(parsedSitePhotos);

      if (editData.items && editData.items.length > 0) {
        setItems(editData.items.map((i) => ({
          id: i.id,
          itemName: i.item_name || '',
          supplierVendor: i.supplier_vendor || '',
          deliveryNotes: i.delivery_notes || i.notes || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'delivery',
          estimatedUnitCost: i.estimated_unit_cost || 0,
          receiptPhotos: Array.isArray(i.receipt_photos)
            ? i.receipt_photos
            : (typeof i.receipt_photos === 'string' ? JSON.parse(i.receipt_photos || '[]') : [])
        })));
      } else {
        setItems([{
          itemName: '',
          supplierVendor: '',
          deliveryNotes: '',
          quantity: 1,
          unit: 'delivery',
          estimatedUnitCost: 0,
          receiptPhotos: []
        }]);
      }
    } else {
      setFormProjectId(defaultProjectId || currentProject?.id || projects[0]?.id || '');
      setLogDate(getLocalToday());
      setSiteProgress('');
      setMaterialsNeededTomorrow('');
      setSitePhotos([]);
      setItems([{
        itemName: '',
        supplierVendor: '',
        deliveryNotes: '',
        quantity: 1,
        unit: 'delivery',
        estimatedUnitCost: 0,
        receiptPhotos: []
      }]);
    }
  }, [isOpen, editData, defaultProjectId, currentProject, projects]);

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.id === formProjectId) || currentProject || projects[0];

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemName: '',
        supplierVendor: '',
        deliveryNotes: '',
        quantity: 1,
        unit: 'delivery',
        estimatedUnitCost: 0,
        receiptPhotos: []
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      setItems([{
        itemName: '',
        supplierVendor: '',
        deliveryNotes: '',
        quantity: 1,
        unit: 'delivery',
        estimatedUnitCost: 0,
        receiptPhotos: []
      }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
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

  // Handle receipt photos for specific item
  const handleItemReceiptUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            url: dataUrl
          };
        })
      );

      const updated = [...items];
      updated[index] = {
        ...updated[index],
        receiptPhotos: [...(updated[index].receiptPhotos || []), ...newPhotos]
      };
      setItems(updated);
    } catch (err) {
      addToast('Failed to process image attachment', 'error');
    }
  };

  const handleRemoveReceiptPhoto = (itemIndex, photoIndex) => {
    const updated = [...items];
    updated[itemIndex].receiptPhotos = updated[itemIndex].receiptPhotos.filter((_, idx) => idx !== photoIndex);
    setItems(updated);
  };

  // Handle site photos upload
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!targetProject) {
      addToast('Please select a project before saving.', 'error');
      return;
    }

    if (!logDate) {
      addToast('Please specify the log date.', 'error');
      return;
    }

    // Filter valid received items (if any specified)
    const validItems = items.filter(i => (i.itemName && i.itemName.trim()));

    setIsSubmitting(true);
    try {
      const payload = {
        projectId: targetProject.id,
        dateNeeded: logDate,
        logDate,
        siteProgress,
        materialsNeededTomorrow,
        sitePhotos,
        notes: materialsNeededTomorrow || siteProgress || null,
        items: validItems
      };

      if (editData && editData.id) {
        await updateMaterialRequest(editData.id, payload);
      } else {
        await createMaterialRequest(payload);
      }

      onClose();
    } catch (err) {
      // Handled in context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {editData ? 'Edit Material Needed Request' : 'New Material Needed Request'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Dedicated record for materials received on site and requisitions needed for tomorrow
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Top Row: PROJECT SITE, LOG DATE & DAY OF WEEK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                PROJECT SITE <span className="text-rose-500">*</span>
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
                      {p.code} - {p.name}
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
                  LOG DATE <span className="text-rose-500">*</span>
                </label>
                {logDate && (
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    {getDayOfWeek(logDate)}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
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
                  {getDayOfWeek(logDate) || '—'}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 italic">
                Auto-assigned to date
              </p>
            </div>
          </div>

          {/* SITE PROGRESS & SITE PHOTOS / EVIDENCE */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-3.5">
            <div>
              <label className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>SITE PROGRESS</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Column casting 80% complete, slab formwork..."
                value={siteProgress}
                onChange={(e) => setSiteProgress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            {/* SITE PHOTOS & EVIDENCE */}
            <div className="pt-2 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    SITE PHOTOS & EVIDENCE
                  </h3>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {sitePhotos.length} photo{sitePhotos.length === 1 ? '' : 's'} attached
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => siteCameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>Upload from Gallery</span>
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

              {/* Site Photos Thumbnails */}
              {sitePhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
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
              )}
            </div>
          </div>

          {/* SECTION 1: MATERIALS RECEIVED TODAY */}
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/15 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  MATERIALS RECEIVED TODAY
                </h3>
                <p className="text-[11px] text-slate-500">
                  List all batches, deliveries, quantities, and trucks received on site today
                </p>
              </div>
            </div>

            {/* List of Material Items */}
            <div className="space-y-3.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      ITEM #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Material Name / Item <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Simba Portland Cement 42.5N"
                        value={item.itemName}
                        onChange={(e) => handleUpdateItem(idx, 'itemName', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Supplier / Vendor <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bamburi Cement Ltd"
                        value={item.supplierVendor}
                        onChange={(e) => handleUpdateItem(idx, 'supplierVendor', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Delivery Notes & Observations
                    </label>
                    <input
                      type="text"
                      placeholder="Delivered intact in covered truck, stacked on wooden pallets..."
                      value={item.deliveryNotes}
                      onChange={(e) => handleUpdateItem(idx, 'deliveryNotes', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Photo Actions & Attached Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      {/* Take Photo */}
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors">
                        <Camera className="h-3.5 w-3.5 text-slate-500" />
                        <span>Take Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleItemReceiptUpload(idx, e)}
                          className="hidden"
                        />
                      </label>

                      {/* Choose from Gallery */}
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors">
                        <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span>Choose from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleItemReceiptUpload(idx, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Receipt Status Badge */}
                    {item.receiptPhotos && item.receiptPhotos.length > 0 ? (
                      <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>{item.receiptPhotos.length} receipt{item.receiptPhotos.length > 1 ? 's' : ''} attached</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Receipt Thumbnails preview */}
                  {item.receiptPhotos && item.receiptPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {item.receiptPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-12 w-12 bg-slate-100">
                          <img src={photo.url} alt={photo.name || 'Receipt'} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveReceiptPhoto(idx, pIdx)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-rose-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add another material button */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/70 text-amber-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Add Another Material / Category</span>
            </button>
          </div>

          {/* SECTION 2: MATERIALS NEEDED TOMORROW */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/15 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  MATERIALS NEEDED TOMORROW
                </h3>
                <p className="text-[11px] text-slate-500">
                  Materials required on site for tomorrow's planned activities
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="e.g. 24 m³ Ready-Mix Concrete C30 for Level 4 slab pour at 08:30 AM, 50 lengths timber formwork props"
              value={materialsNeededTomorrow}
              onChange={(e) => setMaterialsNeededTomorrow(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{editData ? 'Update Materials Log' : 'Save Materials Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMaterialRequestModal;
