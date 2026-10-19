import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import {
  HardHat,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  ShieldCheck,
  X
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { handleLoginSuccess, addToast } = useApp();

  // Credentials Form State
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (!userId.trim()) {
      setErrorMessage('Please enter your User ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // Backend automatically authenticates and maps user to their assigned project site
      const result = await api.auth.login(userId.trim(), password);

      // Check if user must set a new password on first login
      if (result.requirePasswordChange) {
        setPendingLoginResult(result);
        setForcedCurrentPassword(password);
        setShowForcedChangeModal(true);
        setIsLoading(false);
        return;
      }

      const siteName = result.activeProject?.name ? ` — ${result.activeProject.name}` : '';
      addToast(result.message || `Signed in as ${result.user.name}${siteName}`);
      handleLoginSuccess(result.user, result.activeProject, result.accessibleProjects);
      routeByRole(result.user.role, result.activeProject?.id);

    } catch (err) {
      setErrorMessage(err.message || 'Invalid User ID or password.');
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
            {/* FIELD 1: User ID */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                User ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. fatma.jumaan, daniel.arap"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-3.5 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* FIELD 2: Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold uppercase tracking-wider text-slate-300">
                  Password
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-10 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden transition-colors"
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Site auto-mapping footnote */}
          <div className="mt-5 border-t border-slate-800/80 pt-3.5 text-center">
            <p className="text-[11px] text-slate-400">
              Your site workspace (MMA, Majestic Palms, SeaCrest) is automatically mapped upon sign in.
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
