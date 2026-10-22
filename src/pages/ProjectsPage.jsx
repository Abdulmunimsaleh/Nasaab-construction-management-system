import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users,
  ArrowRightLeft,
  Check
} from 'lucide-react';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const {
    projects,
    selectedProjectId,
    switchProject,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    isPartner,
    hasFullAccess,
    laeForms,
    materialRequests,
    isDataLoading
  } = useApp();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredProjects = (projects || []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || (p.status || 'active').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenProject = (id) => {
    navigate(`/projects/${id}`);
  };

  const handleSwiftSwitch = async (e, id) => {
    e.stopPropagation();
    await switchProject(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-amber-500" />
            <span>{isForeman ? 'My Assigned Site' : 'Construction Projects & Sites'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isForeman
              ? 'Dedicated site workspace and diary for your assigned construction site'
              : 'Multi-site construction management across Mombasa & Kenya. Database-driven projects without code changes.'}
          </p>
        </div>

        {(isAdmin || isDirector) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Create New Project</span>
          </button>
        )}
      </div>

      {/* Swift Site Switcher Bar (Admin, Director & Partner) */}
      {(isAdmin || isDirector || isPartner) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 font-bold">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Swift Site Switcher</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded font-bold border border-emerald-200">
                    Instant
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Switch active site context instantly without signing out
                </p>
              </div>
            </div>
            <div className="text-xs">
              <span className="text-slate-400 text-[11px]">Current Active: </span>
              <span className="font-bold text-amber-600">
                {selectedProjectId === 'all'
                  ? 'All Projects Combined'
                  : (projects.find((p) => p.id === selectedProjectId)?.name || selectedProjectId)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => switchProject('all')}
              disabled={isDataLoading}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedProjectId === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>All Projects Combined</span>
              {selectedProjectId === 'all' && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
            </button>

            {projects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => switchProject(p.id)}
                  disabled={isDataLoading}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isSelected ? 'bg-amber-600 text-slate-950' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {p.code}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search, Filter & Layout Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name, code, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9.5 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Project Statuses</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Projects Presentation */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No projects match the search query or filter.
          </p>
          {(isAdmin || isDirector) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const formsCount = (laeForms || []).filter((f) => f.project_id === p.id).length;
            const requestsCount = (materialRequests || []).filter((r) => r.project_id === p.id).length;
            const isSelected = selectedProjectId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenProject(p.id)}
                className={`group rounded-3xl border bg-white p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50/20 shadow-md ring-2 ring-amber-400/40'
                    : 'border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                      {p.code}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-300">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                        ACTIVE WORKSPACE
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wide">
                        {p.status || 'Active'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {p.name}
                  </h3>

                  <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{p.location}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>{formsCount} Forms</span>
                      <span>•</span>
                      <span>{requestsCount} Requisitions</span>
                    </div>
                    <span className="font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                      Enter Details <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Swift Site Switch Action */}
                  {(isAdmin || isDirector || isPartner || hasFullAccess) && (
                    <div>
                      {!isSelected ? (
                        <button
                          onClick={(e) => handleSwiftSwitch(e, p.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Switch Active Workspace to this Site</span>
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Currently Selected Active Site</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Workspace</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((p) => {
                const isSelected = selectedProjectId === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenProject(p.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-600">{p.code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{p.location}</td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                          Active Site
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleSwiftSwitch(e, p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Switch to Site</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                      Open Project →
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Project */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(created) => {
          switchProject(created.id);
          navigate(`/projects/${created.id}`);
        }}
      />
    </div>
  );
};

export default ProjectsPage;
