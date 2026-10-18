import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import {
  HardHat,
  Lock,
  User,
  Building2,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Search,
  Loader2,
  KeyRound,
  ShieldCheck,
  X
} from 'lucide-react';

// Default project catalog ensures MMA, Majestic Palms, and SeaCrest are always available
// even during initial page load, slow connections, or if backend server is starting up.
const FALLBACK_PROJECTS = [
  {
    id: 'prj-mma',
    code: 'MMA-01',
    name: 'MMA',
    location: 'Tudor, Mombasa, Kenya',
    status: 'Active'
  },
  {
    id: 'prj-majestic-palms',
    code: 'MP-01',
    name: 'Majestic Palms',
    location: 'Kizingo, opposite Masjid Ummu Kulthum, Mombasa, Kenya',
    status: 'Active'
  },
  {
    id: 'prj-seacrest',
    code: 'SC-01',
    name: 'SeaCrest',
    location: 'Nyali, near Masjid Taib, Mombasa, Kenya',
    status: 'Active'
  }
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { handleLoginSuccess, addToast } = useApp();

  // 3 Required Form Fields
  const [selectedProject, setSelectedProject] = useState(FALLBACK_PROJECTS[0]);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Projects from DB
  const [projects, setProjects] = useState(FALLBACK_PROJECTS);
  const [projectSearch, setProjectSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Setup / Activation Modal State
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationUserId, setActivationUserId] = useState('');
  const [activationToken, setActivationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  // Force Password Change on First Login Modal State
  const [showForcedChangeModal, setShowForcedChangeModal] = useState(false);
  const [forcedCurrentPassword, setForcedCurrentPassword] = useState('');
  const [forcedNewPassword, setForcedNewPassword] = useState('');
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('');
  const [isForcedUpdating, setIsForcedUpdating] = useState(false);
  const [forcedError, setForcedError] = useState('');
  const [pendingLoginResult, setPendingLoginResult] = useState(null);

  // Load active projects dynamically from MySQL database
  const fetchProjects = useCallback(() => {
    setIsProjectsLoading(true);
    api.auth.getPublicProjects()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setServerOffline(false);
          // Preserve currently selected project if it exists in the fetched list
          setSelectedProject((prev) => {
            if (prev) {
              const matched = data.find((p) => p.id === prev.id || p.name.toLowerCase() === prev.name.toLowerCase());
              if (matched) return matched;
            }
            return data[0];
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load live projects from server; utilizing local project registry:', err.message);
        setServerOffline(true);
      })
      .finally(() => {
        setIsProjectsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle outside click for searchable dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTrimmed = projectSearch.trim().toLowerCase();
  const filteredProjects = projects.filter((p) => {
    if (!searchTrimmed) return true;
    const nameMatch = (p.name || '').toLowerCase().includes(searchTrimmed);
    const codeMatch = (p.code || '').toLowerCase().includes(searchTrimmed);
    const locMatch = (p.location || '').toLowerCase().includes(searchTrimmed);
    return nameMatch || codeMatch || locMatch;
  });

  const routeByRole = (userRole, activeProjectId) => {
    const role = (userRole || '').toLowerCase();
    if (role === 'foreman') {
      navigate('/labour');
    } else if (role === 'storekeeper') {
      navigate('/materials');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedProject) {
      setErrorMessage('Please select a project to access.');
      return;
    }

    if (!userId.trim()) {
      setErrorMessage('Please enter your unique User ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.auth.login(selectedProject.id, userId.trim(), password);

      // Check if user must set a new password on first login
      if (result.requirePasswordChange) {
        setPendingLoginResult(result);
        setForcedCurrentPassword(password);
        setShowForcedChangeModal(true);
        setIsLoading(false);
        return;
      }

      addToast(result.message || `Signed in as ${result.user.name}`);
      handleLoginSuccess(result.user, result.activeProject, result.accessibleProjects);
      routeByRole(result.user.role, result.activeProject?.id);

    } catch (err) {
      setErrorMessage(err.message || 'Invalid User ID, password, or project authorization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e) => {
    e.preventDefault();
    setForcedError('');

    if (forcedNewPassword.length < 8) {
      setForcedError('New password must be at least 8 characters long.');
      return;
    }

    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcedError('Passwords do not match.');
      return;
    }

    setIsForcedUpdating(true);
    try {
      await api.auth.completePasswordSetup(forcedCurrentPassword, forcedNewPassword);
      addToast('Permanent password set successfully!');

      if (pendingLoginResult) {
        handleLoginSuccess(
          { ...pendingLoginResult.user, mustChangePassword: false },
          pendingLoginResult.activeProject,
          pendingLoginResult.accessibleProjects
        );
        setShowForcedChangeModal(false);
        routeByRole(pendingLoginResult.user.role, pendingLoginResult.activeProject?.id);
      }
    } catch (err) {
      setForcedError(err.message || 'Failed to update password.');
    } finally {
      setIsForcedUpdating(false);
    }
  };

  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    setActivationError('');

    if (!activationUserId.trim() || !activationToken.trim()) {
      setActivationError('User ID and Activation Token are required.');
      return;
    }

    if (newPassword.length < 8) {
      setActivationError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setActivationError('Passwords do not match.');
      return;
    }

    setIsActivating(true);
    try {
      const res = await api.auth.activate(activationUserId.trim(), activationToken.trim(), newPassword);
      addToast(res.message || 'Account activated successfully! Please log in.');
      setShowActivationModal(false);
      setUserId(activationUserId.trim());
      setPassword(newPassword);
    } catch (err) {
      setActivationError(err.message || 'Activation failed. Please check your credentials.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-xl shadow-amber-500/25 mb-4">
          <HardHat className="h-8 w-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
          NASAAB CONSTRUCTION
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          BuildTrack Report System — Multi-Site Intelligence
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5 text-xs">
            {/* FIELD 1: Project Name (Dropdown populated from projects table) */}
            <div className="relative" ref={dropdownRef}>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>1. Project Name</span>
                {/* <span className={`text-[10px] font-normal ${serverOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {serverOffline ? '● Offline Mode' : '● MySQL Connected'}
                </span> */}
              </label>

              <button
                type="button"
                onClick={() => {
                  const nextState = !isDropdownOpen;
                  setIsDropdownOpen(nextState);
                  if (nextState) {
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
                className={`w-full flex items-center justify-between rounded-xl border bg-slate-950/70 px-3.5 py-3 text-white text-left transition-colors cursor-pointer ${isDropdownOpen
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : 'border-slate-700 hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-white">
                      {selectedProject ? selectedProject.name : 'Select a Project...'}
                    </span>
                    {selectedProject?.code && (
                      <span className="ml-2 text-[10px] text-amber-300/90 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {selectedProject.code}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isProjectsLoading && (
                    <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-700 bg-slate-900 p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Type MMA, Majestic Palms, SeaCrest..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredProjects.length > 0) {
                            setSelectedProject(filteredProjects[0]);
                            setIsDropdownOpen(false);
                            setProjectSearch('');
                            if (errorMessage) setErrorMessage('');
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8.5 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                      autoFocus
                    />
                    {projectSearch && (
                      <button
                        type="button"
                        onClick={() => setProjectSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Select Project Buttons */}
                  <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">Quick:</span>
                    {projects.map((p) => (
                      <button
                        key={`quick-${p.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedProject(p);
                          setIsDropdownOpen(false);
                          setProjectSearch('');
                          if (errorMessage) setErrorMessage('');
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors shrink-0 cursor-pointer ${selectedProject?.id === p.id
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                          }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  {/* Offline Warning Notice if server is not responding */}
                  {serverOffline && (
                    <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-center justify-between">
                      <span>Server offline. Displaying cached projects.</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchProjects();
                        }}
                        className="underline font-bold hover:text-amber-200 cursor-pointer ml-2 shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Filtered Project List */}
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredProjects.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-slate-400">No projects matching "{projectSearch}"</p>
                        <button
                          type="button"
                          onClick={() => setProjectSearch('')}
                          className="mt-1 text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      filteredProjects.map((p) => {
                        const isSelected = selectedProject?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProject(p);
                              setIsDropdownOpen(false);
                              setProjectSearch('');
                              if (errorMessage) setErrorMessage('');
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-colors cursor-pointer ${isSelected
                                ? 'bg-amber-500/20 text-white font-semibold border border-amber-500/30'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            <div className="truncate pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white truncate">{p.name}</span>
                                {p.code && (
                                  <span className="text-[9px] font-mono text-amber-300/80 bg-slate-950 px-1 py-0.2 rounded border border-slate-700">
                                    {p.code}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{p.location}</div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FIELD 2: User ID */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                2. User ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. abdulmunim.swaleh, daniel.arap"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-3.5 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* FIELD 3: Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold uppercase tracking-wider text-slate-300">
                  3. Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivationModal(true);
                    setActivationUserId(userId);
                  }}
                  className="font-semibold text-amber-400 hover:text-amber-300 transition-colors text-[11px] cursor-pointer"
                >
                  First-time Activation?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter your account password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-10 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-hidden cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Project</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Strict role-based project isolation. Non-administrative users are verified against project membership in MySQL.
            </p>
          </div>
        </div>

        {/* Public Landing Link */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Public Website
          </Link>
        </div>
      </div>

      {/* MODAL 1: Forced Password Change on First Login */}
      {showForcedChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Set Permanent Password</h3>
                <p className="text-[11px] text-slate-400">First-time account activation requirement</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Welcome, <span className="font-bold text-amber-400">{pendingLoginResult?.user?.name}</span>! For security, you must set your permanent private password before entering the application.
            </p>

            {forcedError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {forcedError}
              </div>
            )}

            <form onSubmit={handleForcedPasswordChange} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Permanent Password</label>
                <input
                  type="password"
                  required
                  value={forcedNewPassword}
                  onChange={(e) => setForcedNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={forcedConfirmPassword}
                  onChange={(e) => setForcedConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isForcedUpdating}
                className="mt-2 w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isForcedUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Password & Enter App</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Account Activation with Token */}
      {showActivationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setShowActivationModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Account Activation</h3>
                <p className="text-[11px] text-slate-400">Use your one-time activation token</p>
              </div>
            </div>

            {activationError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {activationError}
              </div>
            )}

            <form onSubmit={handleActivationSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">User ID</label>
                <input
                  type="text"
                  required
                  value={activationUserId}
                  onChange={(e) => setActivationUserId(e.target.value)}
                  placeholder="e.g. mohamed.alamoody"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">One-Time Activation Token</label>
                <input
                  type="text"
                  required
                  value={activationToken}
                  onChange={(e) => setActivationToken(e.target.value)}
                  placeholder="Paste your 48-character token"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Set New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isActivating}
                className="mt-2 w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Activate Account</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
