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
  Building2,
  Layers
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
  const [categories, setCategories] = useState([
    { category: '', floor: '', description: '' }
  ]);
  const [sitePhotos, setSitePhotos] = useState([]);

  // Helper to parse tomorrow categories from JSON or legacy text
  const parseCategoriesFromTomorrow = (val) => {
    if (!val) return [{ category: '', floor: '', description: '' }];
    if (Array.isArray(val)) return val.length ? val : [{ category: '', floor: '', description: '' }];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length) return parsed;
          if (typeof parsed === 'object') return [parsed];
        } catch (e) {
          // Fallback below
        }
      }
      return [{ category: '', floor: '', description: trimmed }];
    }
    return [{ category: '', floor: '', description: '' }];
  };

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
      setCategories(parseCategoriesFromTomorrow(editData.materials_needed_tomorrow || editData.notes || ''));

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
      setCategories([{ category: '', floor: '', description: '' }]);
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

  const handleAddCategory = () => {
    setCategories((prev) => [
      ...prev,
      { category: '', floor: '', description: '' }
    ]);
  };

  const handleRemoveCategory = (index) => {
    if (categories.length === 1) {
      setCategories([{ category: '', floor: '', description: '' }]);
      return;
    }
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCategory = (index, field, value) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

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

    // Filter out categories that are completely empty
    const validCategories = categories.filter(
      (c) => (c.category && c.category.trim()) || (c.floor && c.floor.trim()) || (c.description && c.description.trim())
    );

    if (validCategories.length === 0) {
      addToast('Please enter at least one material category needed for tomorrow.', 'error');
      return;
    }

    const serializedTomorrow = JSON.stringify(validCategories);
    const humanSummary = validCategories
      .map((c) => {
        const header = [c.category?.trim(), c.floor?.trim() ? `Floor: ${c.floor.trim()}` : ''].filter(Boolean).join(' | ');
        return header ? `${header}\n${c.description?.trim() || ''}` : (c.description?.trim() || '');
      })
      .filter(Boolean)
      .join('\n\n');

    setIsSubmitting(true);
    try {
      const payload = {
        projectId: targetProject.id,
        dateNeeded: logDate,
        logDate,
        siteProgress,
        materialsNeededTomorrow: serializedTomorrow,
        sitePhotos,
        notes: humanSummary || serializedTomorrow,
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

          {/* SECTION: MATERIALS NEEDED TOMORROW */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/15 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    MATERIALS NEEDED TOMORROW
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Materials required on site for tomorrow's planned activities by category & floor
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
              </span>
            </div>

            {/* List of Material Category Form Cards */}
            <div className="space-y-3.5">
              {categories.map((cat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>CATEGORY #{idx + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Title input box (material category) & Floor input box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Material Category (Title) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Concrete, Rebar / Steel, Timber, Masonry, Plumbing..."
                        value={cat.category}
                        onChange={(e) => handleUpdateCategory(idx, 'category', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Floor / Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ground Floor, 1st Floor, Basement 2, Roof Level..."
                        value={cat.floor}
                        onChange={(e) => handleUpdateCategory(idx, 'floor', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Paragraph input box (material description) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Material Description (Paragraph) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. 24 m³ Ready-Mix Concrete C30 for Level 1 slab casting at 08:30 AM with boom pump, 50 bags OPC cement..."
                      value={cat.description}
                      onChange={(e) => handleUpdateCategory(idx, 'description', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Plus button to add other forms for other material categories */}
            <button
              type="button"
              onClick={handleAddCategory}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 hover:bg-blue-100/70 text-blue-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Add Another Material Category</span>
            </button>
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
