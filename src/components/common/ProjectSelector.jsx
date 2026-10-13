import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, ChevronDown, Check, Plus, FolderKanban } from 'lucide-react';

export const ProjectSelector = ({ onOpenCreateProject }) => {
  const { projects, selectedProjectId, setSelectedProjectId, isForeman, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const assignedSiteId = isForeman ? (currentUser?.assignedProjectId || 'PRJ-002') : selectedProjectId;
  const currentProject = projects.find((p) => p.id === (isForeman ? assignedSiteId : selectedProjectId));

  // If user is Foreman, project switcher is locked strictly to their assigned site
  if (isForeman) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-1.5 text-xs font-semibold text-slate-800">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 leading-none flex items-center gap-1">
            <span>Assigned Site</span>
            <span className="text-[9px] bg-amber-200/60 px-1 py-0.2 rounded text-amber-900 font-mono">
              {currentProject?.code || 'SITE'}
            </span>
          </div>
          <div className="max-w-[170px] sm:max-w-[220px] truncate font-bold text-slate-900 mt-0.5">
            {currentProject?.name || 'Assigned Site Workspace'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">
            Selected Site
          </div>
          <div className="max-w-[170px] sm:max-w-[220px] truncate font-bold text-slate-900 mt-0.5">
            {selectedProjectId === 'all'
              ? `All Projects (${projects.length})`
              : currentProject?.name || 'Select Project'}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Switch Construction Workspace
          </div>

          <div className="mt-1 space-y-1 max-h-64 overflow-y-auto">
            {/* All Projects Option */}
            <button
              onClick={() => {
                setSelectedProjectId('all');
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                selectedProjectId === 'all'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FolderKanban className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">All Projects Combined</span>
              </div>
              {selectedProjectId === 'all' && (
                <Check className="h-4 w-4 text-amber-600 shrink-0" />
              )}
            </button>

            {/* Individual Projects */}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  selectedProjectId === p.id
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-left truncate">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{p.location} • {p.progress}%</div>
                </div>
                {selectedProjectId === p.id && (
                  <Check className="h-4 w-4 text-amber-600 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {onOpenCreateProject && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateProject();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" />
                Create New Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
