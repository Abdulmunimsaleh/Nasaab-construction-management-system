import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FolderKanban, MapPin, Building2, X, Loader2 } from 'lucide-react';

export const CreateProjectModal = ({ isOpen, onClose, onCreated }) => {
  const { createProject, addToast } = useApp();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !location.trim()) {
      addToast('Project Name and Location are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject({
        name: name.trim(),
        location: location.trim(),
        code: code.trim().toUpperCase() || undefined,
        status
      });

      setName('');
      setLocation('');
      setCode('');
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      // Error handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Create New Project Site</h3>
              <p className="text-[11px] text-slate-400">Instantly saved to MySQL and available on login screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700/60 bg-slate-800 p-2 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Project Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Majestic Palms, Nyali Heights, Port Terminal"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Location & Site Address <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kizingo, opposite Masjid Ummu Kulthum, Mombasa, Kenya"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Project Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MP-01, MMA-01"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white focus:border-amber-400 focus:outline-hidden"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Project...</span>
                </>
              ) : (
                <span>Save Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
