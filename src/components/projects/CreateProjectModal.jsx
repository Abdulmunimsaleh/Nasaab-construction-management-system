import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Camera, ImagePlus, Image, X, CircleDot, XCircle } from 'lucide-react';

export const CreateProjectModal = ({ isOpen, onClose, onCreated }) => {
  const { createProject, currentUser } = useApp();

  // ── Refs for camera and file upload ──────────────────────────────────────────
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const getInitialFormData = useCallback(() => ({
    name: '',
    code: '',
    client: '',
    clientContact: '',
    location: '',
    description: '',
    projectManager: currentUser?.name || 'Eng. David Ochieng',
    siteEngineer: 'Amina Hassan',
    startDate: new Date().toISOString().split('T')[0],
    expectedCompletion: '',
    contractValue: '',
    budget: '',
    status: 'Active',
    category: 'Commercial High-Rise',
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80'
  }), [currentUser?.name]);

  const [formData, setFormData] = useState(getInitialFormData);

  // ── Photos state (matching CreateDailyReportModal) ───────────────────────────
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

  // Helper to reset form to pristine initial state
  const resetForm = useCallback(() => {
    stopCamera();
    setFormData(getInitialFormData());
    setPhotos([]);
    setCameraOpen(false);
    setCameraError('');
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  }, [stopCamera, getInitialFormData]);

  // Reset form whenever modal is opened, and stop camera when closed or unmounted
  useEffect(() => {
    if (isOpen) {
      resetForm();
    } else {
      stopCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, resetForm, stopCamera]);

  // Attach the stream to the <video> element once it's rendered in the DOM.
  // The video element only exists when cameraOpen is true, so we wait for
  // that state change and then hook up the stream inside an effect.
  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
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
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
      .getDate()
      .toString()
      .padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

    setPhotos((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Project_Photo_${timestamp}.jpg`,
        size: Math.round((dataUrl.length * 3) / 4),
        dataUrl,
        source: 'camera',
      },
    ]);
  };

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      // Validate image type or extension (handles cases where Windows provides empty MIME type)
      const isImage =
        (file.type && file.type.startsWith('image/')) ||
        /\.(jpe?g|png|webp|gif|svg|bmp|avif|heic|jfif)$/i.test(file.name);
      if (!isImage) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPhotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            dataUrl,
            source: 'gallery',
          },
        ]);
      };
      reader.onerror = (err) => {
        console.error('FileReader error:', err);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGallerySelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // ── Form handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.client || !formData.budget) {
      alert('Please fill out required fields (Project Name, Client, Budget).');
      return;
    }

    stopCamera();

    const created = createProject({
      ...formData,
      image: photos.length > 0 ? photos[0].dataUrl : formData.image,
      photosCount: photos.length,
      photos: photos.map((p) => ({ name: p.name, dataUrl: p.dataUrl, source: p.source })),
      contractValue: Number(formData.contractValue) || Number(formData.budget),
      budget: Number(formData.budget),
      progress: 0,
    });

    resetForm();
    onClose();
    if (onCreated) onCreated(created);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Construction Project"
      subtitle="Register a new site workspace into the BuildTrack platform"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Eldoret Referral Hospital Specialty Wing"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Project Code */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Project Code / Ref
            </label>
            <input
              type="text"
              name="code"
              placeholder="e.g. ELD-HOS-01"
              value={formData.code}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Project Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="Commercial High-Rise">Commercial High-Rise</option>
              <option value="Civil & Road Works">Civil &amp; Road Works</option>
              <option value="Marine & Infrastructure">Marine &amp; Infrastructure</option>
              <option value="Residential Development">Residential Development</option>
              <option value="Industrial & Warehousing">Industrial &amp; Warehousing</option>
            </select>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Client / Employer <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="client"
              required
              placeholder="e.g. Ministry of Health Kenya"
              value={formData.client}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Client Contact */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Client Contact Info
            </label>
            <input
              type="text"
              name="clientContact"
              placeholder="+254 722 123 456"
              value={formData.clientContact}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Project Location */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Site Location / Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              required
              placeholder="e.g. Uganda Road, Eldoret CBD, Uasin Gishu County"
              value={formData.location}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Project Manager */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Project Manager (Lead)
            </label>
            <input
              type="text"
              name="projectManager"
              value={formData.projectManager}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Site Engineer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Resident Site Engineer
            </label>
            <input
              type="text"
              name="siteEngineer"
              value={formData.siteEngineer}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Commencement Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Expected Completion */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Target Practical Completion
            </label>
            <input
              type="date"
              name="expectedCompletion"
              value={formData.expectedCompletion}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Contract Value */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Contract Value (KES)
            </label>
            <input
              type="number"
              name="contractValue"
              placeholder="e.g. 450000000"
              value={formData.contractValue}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Project Budget */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Allocated Budget (KES) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="budget"
              required
              placeholder="e.g. 450000000"
              value={formData.budget}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Scope of Work / Description
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Detailed description of structural works, finishes, and engineering specifications..."
              value={formData.description}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* ── Project Photos & Cover Image Section ── */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-amber-50/30 p-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            <Camera className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" />
            Project Photos &amp; Cover
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
            onClick={(e) => {
              e.target.value = null;
            }}
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
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer"
                  title="Close camera"
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full bg-white border-4 border-amber-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
                  title="Take photo"
                >
                  <CircleDot className="w-7 h-7 text-amber-600" />
                </button>
                <div className="w-9 h-9" />
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
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm active:scale-[0.97] transition-all cursor-pointer ${cameraOpen
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
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              Choose from Gallery
            </button>
          </div>

          {/* Photo previews grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-28 object-cover"
                  />
                  {/* Badge for Cover Image */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm">
                      Cover
                    </span>
                  )}
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
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 text-slate-400">
              <Image className="w-8 h-8 mb-1.5 opacity-40" />
              <p className="text-[11px] font-medium">No project photos attached yet</p>
              <p className="text-[10px]">Use the buttons above to capture or choose photos from gallery</p>
            </div>
          )}

          {photos.length > 0 && (
            <p className="mt-2.5 text-[10px] font-semibold text-slate-500">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} attached (first photo serves as the project cover)
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Create Project &amp; Launch Workspace
          </button>
        </div>
      </form>
    </Modal>
  );
};

