import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Camera,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Eye,
  X,
  Building,
  HardHat,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export const SiteProgressPage = () => {
  const {
    laeForms,
    materialRequests,
    currentProject,
    selectedProjectId,
    projects
  } = useApp();

  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'photos' | 'timeline'
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Calculate overall site progress % from current project and latest LAE forms
  const overallProgress = useMemo(() => {
    // Check latest LAE form estimated_site_progress
    const forms = (laeForms || []).filter((f) =>
      selectedProjectId === 'all' || f.project_id === selectedProjectId || f.project_id === currentProject?.id
    );

    if (forms.length > 0) {
      const latest = forms[0];
      if (latest.estimated_site_progress) {
        return Number(latest.estimated_site_progress);
      }
    }

    return 62; // Standard default progress for active NASAAB sites
  }, [laeForms, selectedProjectId, currentProject]);

  // Milestone Stages
  const milestones = [
    {
      id: 'm1',
      name: 'Substructure & Foundation Footings',
      description: 'Site clearance, mass excavation, blinding, isolated footings & ground beam casting',
      progress: 100,
      status: 'completed',
      targetDate: 'Completed',
      leadTrade: 'Foundation Masonry & Steel Fixing'
    },
    {
      id: 'm2',
      name: 'Ground Floor Columns & Stub Retaining Walls',
      description: 'Reinforced concrete columns C1-C18 poured with 25MPa vibrated concrete mix',
      progress: 100,
      status: 'completed',
      targetDate: 'Completed',
      leadTrade: 'Formwork Carpentry & Concreting'
    },
    {
      id: 'm3',
      name: 'First Floor Suspended Slab & Transfer Beams',
      description: 'Heavy duty propping, marine plywood shuttering, bottom/top rebar mats, and electrical conduits',
      progress: 75,
      status: 'in_progress',
      targetDate: 'In Progress (Target: End of Month)',
      leadTrade: 'Structural Steel Fixing & MEP Sleeves'
    },
    {
      id: 'm4',
      name: 'External Machine-Cut Coral Stone Walling',
      description: 'Damp proof course (DPC) installation, 9x9 coral block masonry with hoop iron bonding',
      progress: 45,
      status: 'in_progress',
      targetDate: 'Active',
      leadTrade: 'Master Stone Masons'
    },
    {
      id: 'm5',
      name: 'MEP Rough-in (Conduits & Drainage Sleeves)',
      description: 'Chasing conduits into walls, soil waste pipe penetrations, distribution board sleeves',
      progress: 35,
      status: 'in_progress',
      targetDate: 'Next Phase',
      leadTrade: 'Electrical & Plumbing Subcontract'
    },
    {
      id: 'm6',
      name: 'Internal Wall Plastering & Ceiling Screeds',
      description: 'Render coat, 12mm gypsum finishing plaster, float screed to level floors',
      progress: 15,
      status: 'pending',
      targetDate: 'Upcoming',
      leadTrade: 'Plastering & Skimming Subcontract'
    },
    {
      id: 'm7',
      name: 'Architectural Finishes, Doors & Glazing',
      description: 'Aluminium casement windows, flush doors, floor tiles, sanitary ware & exterior paintwork',
      progress: 0,
      status: 'pending',
      targetDate: 'Phase 3',
      leadTrade: 'Finishing Contractors'
    }
  ];

  // Compile all photos uploaded across LAE daily forms and Material deliveries
  const allPhotos = useMemo(() => {
    const photosList = [];

    (laeForms || []).forEach((form) => {
      if (selectedProjectId !== 'all' && form.project_id && form.project_id !== selectedProjectId && form.project_id !== currentProject?.id) {
        return;
      }

      let parsed = [];
      if (form.site_photos) {
        try {
          parsed = typeof form.site_photos === 'string' ? JSON.parse(form.site_photos) : form.site_photos;
        } catch (e) {
          parsed = [];
        }
      }

      if (Array.isArray(parsed)) {
        parsed.forEach((p, pIdx) => {
          photosList.push({
            id: `photo-lae-${form.id}-${pIdx}`,
            url: p.url || p,
            caption: p.caption || `Site Work Photo — ${form.form_number}`,
            date: form.date,
            preparedBy: form.prepared_by_name,
            source: `LAE Form (${form.form_number})`,
            progressTag: `${form.estimated_site_progress || overallProgress}% Milestone`
          });
        });
      }
    });

    (materialRequests || []).forEach((req) => {
      if (selectedProjectId !== 'all' && req.project_id && req.project_id !== selectedProjectId && req.project_id !== currentProject?.id) {
        return;
      }

      if (Array.isArray(req.items)) {
        req.items.forEach((item, idx) => {
          let recPhotos = [];
          if (item.receipt_photos) {
            try {
              recPhotos = typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos) : item.receipt_photos;
            } catch (e) {
              recPhotos = [];
            }
          }

          if (Array.isArray(recPhotos)) {
            recPhotos.forEach((rp, rpIdx) => {
              photosList.push({
                id: `photo-mat-${req.id}-${idx}-${rpIdx}`,
                url: rp.url || rp,
                caption: `Material Delivery: ${item.item_name} (${item.supplier_vendor || 'Site Intake'})`,
                date: req.date_needed || req.created_at?.split('T')[0],
                preparedBy: req.requested_by_name,
                source: `Delivery Note (${req.request_number || 'DEL'})`,
                progressTag: 'Goods Inward'
              });
            });
          }
        });
      }
    });

    return photosList;
  }, [laeForms, materialRequests, selectedProjectId, currentProject, overallProgress]);

  // Timeline entries
  const timelineEntries = useMemo(() => {
    return (laeForms || [])
      .filter((f) => selectedProjectId === 'all' || f.project_id === selectedProjectId || f.project_id === currentProject?.id)
      .map((f) => ({
        id: f.id,
        date: f.date,
        formNumber: f.form_number,
        progress: f.estimated_site_progress || overallProgress,
        preparedBy: f.prepared_by_name,
        notes: f.general_notes || f.delays_issues_incidents || 'Daily operations executed according to schedule.',
        labourCount: Array.isArray(f.labourItems)
          ? f.labourItems.reduce((acc, l) => acc + ((l.foreman_count || 0) + (l.skilled_count || 0) + (l.unskilled_count || 0)), 0)
          : 0
      }));
  }, [laeForms, selectedProjectId, currentProject, overallProgress]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Project Execution
            </span>
            <span className="text-xs text-slate-400">• Visual Timeline</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-amber-500" />
            <span>Site Construction Progress</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Overall site completion percentage, structural milestones, photo verification gallery, and timeline records for{' '}
            <strong className="text-slate-800">{currentProject?.name || 'All Sites'}</strong>
          </p>
        </div>

        {/* Big Circular / Radial Badge */}
        <div className="flex items-center gap-3 bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Site Completion</div>
            <div className="text-2xl font-extrabold text-amber-600 font-mono">{overallProgress}% Done</div>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-full border-4 border-amber-500 border-t-amber-200 flex items-center justify-center font-bold text-xs text-slate-900 font-mono">
            {overallProgress}%
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Stage</span>
            <Building className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 truncate">
            First Floor Suspended Slab
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Phase 2 Structural Framing</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Stages</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            2 of 7 Milestones
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Substructure & columns complete</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photos Logged</span>
            <Camera className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {allPhotos.length > 0 ? `${allPhotos.length} Photos` : 'Active Feed'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Photographic site documentation</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Handover</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900">
            Q4 2026
          </div>
          <p className="mt-1 text-[11px] text-slate-400">On-track contractual schedule</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'milestones'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Structural Milestones ({milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Photo Evidence ({allPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Daily Progress Feed ({timelineEntries.length})</span>
        </button>
      </div>

      {/* Tab 1: Structural Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-3">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold font-mono text-xs ${
                      m.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : m.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    0{idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                    <p className="text-xs text-slate-500">{m.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      m.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                  <div className="text-base font-extrabold text-slate-900 font-mono w-14 text-right">
                    {m.progress}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.progress === 100
                      ? 'bg-emerald-500'
                      : m.progress >= 50
                      ? 'bg-amber-500'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${m.progress}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-600">
                  <HardHat className="h-3.5 w-3.5 text-amber-500" />
                  <span>Trade: {m.leadTrade}</span>
                </div>
                <div className="font-mono text-slate-500">{m.targetDate}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Photos Gallery */}
      {activeTab === 'photos' && (
        <div>
          {allPhotos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
              <Camera className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Site Photos Attached Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Foremen and storekeepers upload site photos when submitting Daily Labour, Activity & Equipment forms or verifying material receipts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs">
                      {photo.progressTag}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{photo.caption}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{photo.source}</p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-100">
                      <span>{photo.date}</span>
                      <span>By: {photo.preparedBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Daily Progress Feed */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {timelineEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-xs">
              <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Historical Forms Logged</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Daily timeline events are automatically populated when daily construction forms are submitted.
              </p>
            </div>
          ) : (
            timelineEntries.map((entry) => (
              <div
                key={entry.id}
                className="relative pl-6 sm:pl-8 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200"
              >
                <div className="absolute left-0 sm:left-1 top-2 h-4 w-4 rounded-full border-2 border-amber-500 bg-white" />
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{entry.formNumber}</span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {entry.progress}% Progress Milestone
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{entry.date}</div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{entry.notes}</p>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Supervisor: {entry.preparedBy}</span>
                    {entry.labourCount > 0 && <span>Workforce on site: {entry.labourCount} operatives</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[70vh] bg-black flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-5 text-white">
              <h3 className="text-sm font-bold">{selectedPhoto.caption}</h3>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{selectedPhoto.source} • By {selectedPhoto.preparedBy}</span>
                <span className="font-mono">{selectedPhoto.date}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteProgressPage;
