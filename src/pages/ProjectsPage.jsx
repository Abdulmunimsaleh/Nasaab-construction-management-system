import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatKES, formatDate } from '../utils/formatters';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  User,
  Coins,
  ChevronRight,
  Archive,
  ArrowUpRight
} from 'lucide-react';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { onOpenCreateProject } = useOutletContext();
  const { projects, archiveProject, setSelectedProjectId, isForeman, canAccessCosts } = useApp();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectToArchive, setProjectToArchive] = useState(null);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenProject = (id) => {
    setSelectedProjectId(id);
    navigate(`/projects/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-amber-500" />
            <span>{isForeman ? 'My Assigned Site' : 'Construction Projects'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isForeman
              ? 'Dedicated site workspace and diary for your assigned construction site'
              : 'Portfolio of ongoing civil, marine, commercial, and residential developments across Kenya'}
          </p>
        </div>

        {!isForeman && (
          <button
            onClick={onOpenCreateProject}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create New Project</span>
          </button>
        )}
      </div>

      {/* Search, Filter & Layout Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name, client, code, or location..."
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
            <option value="Active">Active</option>
            <option value="Planning">Planning</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow-2xs text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'table' ? 'bg-white shadow-2xs text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Tabular List View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* GRID CARDS VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const remaining = Math.max(0, project.budget - (project.spent || 0));
            const spentPercent = Math.min(100, Math.round(((project.spent || 0) / project.budget) * 100));

            return (
              <div
                key={project.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-md"
              >
                {/* Image Cover Banner with Project Badge */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
                  
                  {/* Top Bar on Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="rounded-lg bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs font-mono">
                      {project.code}
                    </span>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  {/* Bottom title on Image */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {project.category || 'Construction'}
                    </span>
                    <h3 className="text-base font-bold text-white truncate drop-shadow-sm font-sans">
                      {project.name}
                    </h3>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center text-slate-600 gap-2 truncate">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Client:</span>
                      <strong className="text-slate-800 font-medium truncate max-w-[200px]">{project.client}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Project Manager:</span>
                      <span className="text-slate-700 font-medium">{project.projectManager}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Timeline:</span>
                      <span>{formatDate(project.startDate)} → {formatDate(project.expectedCompletion)}</span>
                    </div>
                  </div>

                  {/* Financial & Progress Breakdown */}
                  <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                    <ProgressBar
                      progress={project.progress}
                      showLabel
                      size="sm"
                    />

                    {canAccessCosts ? (
                      <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-2.5 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Budget</span>
                          <span className="text-[11px] font-bold text-slate-900 font-mono">
                            {formatKES(project.budget)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Spent ({spentPercent}%)</span>
                          <span className="text-[11px] font-bold text-slate-900 font-mono">
                            {formatKES(project.spent || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Remaining</span>
                          <span className={`text-[11px] font-bold font-mono ${remaining === 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatKES(remaining)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Physical Completion</span>
                        <span className="font-bold text-amber-600 font-mono">{project.progress}% On Track</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {!isForeman ? (
                      <button
                        onClick={() => setProjectToArchive(project)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        Active Assignment
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors group-hover:bg-amber-500 group-hover:text-slate-950 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Code & Project</th>
                  <th className="px-5 py-3.5">Client & Location</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Progress</th>
                  {canAccessCosts && (
                    <>
                      <th className="px-5 py-3.5">Budget (KES)</th>
                      <th className="px-5 py-3.5">Spent (KES)</th>
                      <th className="px-5 py-3.5">Remaining (KES)</th>
                    </>
                  )}
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const remaining = Math.max(0, p.budget - (p.spent || 0));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{p.code}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{p.client}</div>
                        <div className="text-[11px] text-slate-400">{p.location}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5 w-32">
                        <ProgressBar progress={p.progress} size="sm" showLabel />
                      </td>
                      {canAccessCosts && (
                        <>
                          <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                            {formatKES(p.budget)}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-700">
                            {formatKES(p.spent || 0)}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">
                            {formatKES(remaining)}
                          </td>
                        </>
                      )}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenProject(p.id)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          Workspace →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Archiving */}
      <ConfirmDialog
        isOpen={!!projectToArchive}
        onClose={() => setProjectToArchive(null)}
        onConfirm={() => {
          if (projectToArchive) archiveProject(projectToArchive.id);
        }}
        title={`Archive Project: ${projectToArchive?.name}`}
        message="Archiving will remove this project from active field dashboards. You can restore it anytime in Settings."
        confirmLabel="Archive Project"
        confirmVariant="danger"
      />
    </div>
  );
};
