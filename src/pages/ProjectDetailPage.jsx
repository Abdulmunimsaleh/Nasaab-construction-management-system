import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import {
  FolderKanban,
  MapPin,
  Calendar,
  Users,
  HardHat,
  Boxes,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Loader2,
  X,
  ArrowRightLeft,
  Check,
  Edit3,
  Clock
} from 'lucide-react';
import { ViewLaeFormModal } from '../components/labour/ViewLaeFormModal';
import { ViewMaterialRequestModal } from '../components/materials/ViewMaterialRequestModal';
import { NewLaeFormModal } from '../components/labour/NewLaeFormModal';
import { NewMaterialRequestModal } from '../components/materials/NewMaterialRequestModal';
import { getDayOfWeek } from '../utils/formatters';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    projects,
    selectedProjectId,
    switchProject,
    updateProject,
    assignUserToProject,
    createUserAndAssign,
    removeUserFromProject,
    laeForms,
    materialRequests,
    currentUser,
    isAdmin,
    isDirector,
    isPartner,
    isForeman,
    isStoreKeeper,
    hasFullAccess,
    accessibleProjects,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'lae-forms' | 'materials'
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modals
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showAssignExistingModal, setShowAssignExistingModal] = useState(false);
  const [showCreateAndAssignModal, setShowCreateAndAssignModal] = useState(false);
  const [selectedLaeId, setSelectedLaeId] = useState(null);
  const [selectedMatReqId, setSelectedMatReqId] = useState(null);
  const [isNewLaeOpen, setIsNewLaeOpen] = useState(false);
  const [isNewMatReqOpen, setIsNewMatReqOpen] = useState(false);

  // Edit Project State
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  // Assign Existing User State
  const [availableSystemUsers, setAvailableSystemUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignRole, setAssignRole] = useState('Foreman');

  // Create User & Assign State
  const [newUserName, setNewUserName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState('Foreman');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const project = projects.find((p) => p.id === id);

  // Verify project access
  const isGlobalUser = hasFullAccess;
  const isAssigned = isGlobalUser || (accessibleProjects && accessibleProjects.some(p => p.id === id)) || (currentUser?.assignedProjectId === id);

  // Load project assigned users
  const loadAssignedUsers = async () => {
    if (!id) return;
    setIsLoadingUsers(true);
    try {
      const uList = await api.projects.getUsers(id);
      setAssignedUsers(uList);
    } catch (err) {
      console.warn('Could not load assigned users:', err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditLocation(project.location);
      setEditCode(project.code || '');
      setEditStatus(project.status || 'active');
      loadAssignedUsers();
    }
  }, [project, id]);

  const loadAllSystemUsers = async () => {
    try {
      const allUsers = await api.users.getAll();
      setAvailableSystemUsers(allUsers);
      if (allUsers.length > 0) {
        setSelectedUserId(allUsers[0].id);
      }
    } catch (err) {
      console.warn('Could not load system users:', err.message);
    }
  };

  if (!isAssigned) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Project Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your account ({currentUser?.role}) is not assigned to this project. Access is strictly restricted to your authorized construction sites.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Project Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">The requested project ID does not exist in MySQL.</p>
        <button
          onClick={() => navigate('/projects')}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Back to Projects List
        </button>
      </div>
    );
  }

  const projectLaeForms = laeForms.filter((f) => f.project_id === project.id);
  const projectMatRequests = materialRequests.filter((r) => r.project_id === project.id);

  // Today's form detection for single daily form rule
  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const todayLaeForm = projectLaeForms.find((f) => {
    const fDate = (f.date || '').split('T')[0];
    const fCreated = (f.created_at || '').split('T')[0];
    return fDate === todayStr || fCreated === todayStr;
  });

  const todayMatRequest = projectMatRequests.find((r) => {
    const rDate = (r.date_needed || '').split('T')[0];
    const rCreated = (r.created_at || '').split('T')[0];
    return rDate === todayStr || rCreated === todayStr;
  });

  const handleSaveEditProject = async (e) => {
    e.preventDefault();
    try {
      await updateProject(project.id, {
        name: editName,
        location: editLocation,
        code: editCode,
        status: editStatus
      });
      setShowEditProjectModal(false);
    } catch (err) {
      // Handled in context
    }
  };

  const handleAssignExistingUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      await assignUserToProject(project.id, selectedUserId, assignRole);
      setShowAssignExistingModal(false);
      loadAssignedUsers();
    } catch (err) {
      // Handled in context
    }
  };

  const handleCreateAndAssignUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserId.trim()) return;

    setIsCreatingUser(true);
    try {
      await createUserAndAssign(project.id, {
        name: newUserName.trim(),
        userId: newUserId.trim().toLowerCase(),
        role: newUserRole,
        email: newUserEmail || undefined,
        phone: newUserPhone || undefined
      });
      setNewUserName('');
      setNewUserId('');
      setNewUserEmail('');
      setNewUserPhone('');
      setShowCreateAndAssignModal(false);
      loadAssignedUsers();
    } catch (err) {
      // Handled in context
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleRemoveAssignment = async (userId, userName) => {
    if (window.confirm(`Remove ${userName} from ${project.name}? Their user account and past form records will NOT be deleted.`)) {
      try {
        await removeUserFromProject(project.id, userId);
        loadAssignedUsers();
      } catch (err) {
        // Handled in context
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {project.code}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                {project.status || 'Active'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Swift Site Workspace Status & Action */}
          {(isAdmin || isDirector || isPartner || hasFullAccess) && (
            selectedProjectId === project.id ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Workspace</span>
              </div>
            ) : (
              <button
                onClick={() => switchProject(project.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer shadow-2xs"
                title="Switch active workspace context to this site"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Set as Active Workspace</span>
              </button>
            )
          )}

          {(isAdmin || isDirector) && (
            <button
              onClick={() => setShowEditProjectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit Details</span>
            </button>
          )}

          {!isStoreKeeper && (
            <button
              onClick={() => setIsNewLaeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <HardHat className="h-4 w-4 stroke-[2.5]" />
              <span>+ Log Labour & Equipment</span>
            </button>
          )}

          {!isForeman && (
            <button
              onClick={() => setIsNewMatReqOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              <Boxes className="h-4 w-4" />
              <span>+ Material Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Project Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Assigned Team ({assignedUsers.length})</span>
        </button>

        {!isStoreKeeper && (
          <button
            onClick={() => setActiveTab('lae-forms')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'lae-forms'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardHat className="h-3.5 w-3.5" />
            <span>Labour & Equipment Forms ({projectLaeForms.length})</span>
          </button>
        )}

        {!isForeman && (
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'materials'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Material Requests ({projectMatRequests.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Site Location</span>
              <div className="flex items-start gap-2 text-xs font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{project.location}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Labour & Plant Forms</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {projectLaeForms.length} submitted
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Material Requisitions</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {projectMatRequests.length} requisitions
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Project Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Project ID (MySQL)</span>
                <span className="font-mono font-semibold text-slate-800">{project.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Site Code</span>
                <span className="font-mono font-semibold text-slate-800">{project.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <span className="font-semibold text-slate-800 capitalize">{project.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Enrolled Personnel</span>
                <span className="font-semibold text-slate-800">{assignedUsers.length} authorized users</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNED USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Personnel & Permissions</h3>
              <p className="text-xs text-slate-500">
                Staff assigned to {project.name}. Admins and Directors automatically hold global access across all sites.
              </p>
            </div>

            {(isAdmin || isDirector) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    loadAllSystemUsers();
                    setShowAssignExistingModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <UserCheck className="h-4 w-4 text-amber-500" />
                  <span>Assign Existing User</span>
                </button>

                <button
                  onClick={() => setShowCreateAndAssignModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
                >
                  <UserPlus className="h-4 w-4 stroke-[2.5]" />
                  <span>+ Create & Assign User</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoadingUsers ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading project assignments...</p>
              </div>
            ) : assignedUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No specific user assignments for this project yet. (Admins and Directors hold universal access).
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Project Role</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{u.user_id}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                          {u.project_role || u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{u.phone || u.email || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        {(isAdmin || isDirector) && (
                          <button
                            onClick={() => handleRemoveAssignment(u.id, u.name)}
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Remove assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LAE FORMS */}
      {activeTab === 'lae-forms' && !isStoreKeeper && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Submitted Labour, Activity & Equipment Forms</h3>
            {todayLaeForm ? (
              <button
                onClick={() => setSelectedLaeId(todayLaeForm.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
                title="Today's daily form has already been submitted. View to edit."
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Today's Form ({todayLaeForm.form_number})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsNewLaeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Form</span>
              </button>
            )}
          </div>

          {todayLaeForm && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3">
              <Clock className="h-4 w-4 text-amber-800 shrink-0" />
              <p className="text-xs text-amber-800">
                Today's form (<strong>{todayLaeForm.form_number}</strong>) was submitted by <strong>{todayLaeForm.prepared_by_name}</strong>. Only 1 form per day is allowed — edit the existing form to update.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {projectLaeForms.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No Labour, Activity & Equipment forms logged for this project yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Form Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Prepared By</th>
                    <th className="py-3 px-4">Weather</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectLaeForms.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{f.form_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{getDayOfWeek(f.date)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{f.date}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{f.prepared_by_name}</td>
                      <td className="py-3 px-4 text-slate-600">{f.weather}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLaeId(f.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MATERIALS */}
      {activeTab === 'materials' && !isForeman && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Material Needed Requests</h3>
            {todayMatRequest ? (
              <button
                onClick={() => setSelectedMatReqId(todayMatRequest.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
                title="Today's material request has already been submitted. View to edit."
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Today's Request ({todayMatRequest.request_number})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsNewMatReqOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Request</span>
              </button>
            )}
          </div>

          {todayMatRequest && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3">
              <Clock className="h-4 w-4 text-amber-800 shrink-0" />
              <p className="text-xs text-amber-800">
                Today's request (<strong>{todayMatRequest.request_number}</strong>) was submitted by <strong>{todayMatRequest.requested_by_name}</strong>. Only 1 form per day is allowed — edit the existing form to update.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {projectMatRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No material requests logged for this project yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request #</th>
                    <th className="py-3 px-4">Needed By</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Urgency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectMatRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.request_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{getDayOfWeek(r.date_needed)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.date_needed}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{r.requested_by_name}</td>
                      <td className="py-3 px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.urgency === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedMatReqId(r.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Project Details */}
      {showEditProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowEditProjectModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Project Details</h3>
            <form onSubmit={handleSaveEditProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Site Location</label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Code</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Existing User */}
      {showAssignExistingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowAssignExistingModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold mb-1">Assign Existing User</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Search for an existing user account without creating a duplicate.
            </p>

            <form onSubmit={handleAssignExistingUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select User Account</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                >
                  {availableSystemUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.user_id}) — Role: {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Project Role Assignment</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                >
                  <option value="Partner">Partner</option>
                  <option value="Storekeeper">Storekeeper</option>
                  <option value="Foreman">Foreman</option>
                  <option value="Director">Director</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignExistingModal(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create New User & Assign */}
      {showCreateAndAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowCreateAndAssignModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold mb-1">Create User & Assign to Site</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Generates a secure activation credential for the new user.
            </p>

            <form onSubmit={handleCreateAndAssignUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Mwangi"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Unique User ID *</label>
                <input
                  type="text"
                  required
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="e.g. john.mwangi"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                >
                  <option value="Foreman">Foreman (Labour & Equipment only)</option>
                  <option value="Storekeeper">Storekeeper (Materials only)</option>
                  <option value="Partner">Partner (Assigned project access)</option>
                  <option value="Director">Director (Global access)</option>
                  <option value="Admin">Admin (Full global access)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+254 700 000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAndAssignModal(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Create & Assign</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Detail Modals */}
      <ViewLaeFormModal
        formId={selectedLaeId}
        isOpen={Boolean(selectedLaeId)}
        onClose={() => setSelectedLaeId(null)}
      />

      <ViewMaterialRequestModal
        requestId={selectedMatReqId}
        isOpen={Boolean(selectedMatReqId)}
        onClose={() => setSelectedMatReqId(null)}
      />

      {/* New Form Modals */}
      <NewLaeFormModal
        isOpen={isNewLaeOpen}
        onClose={() => setIsNewLaeOpen(false)}
      />

      <NewMaterialRequestModal
        isOpen={isNewMatReqOpen}
        onClose={() => setIsNewMatReqOpen(false)}
      />
    </div>
  );
};

export default ProjectDetailPage;
