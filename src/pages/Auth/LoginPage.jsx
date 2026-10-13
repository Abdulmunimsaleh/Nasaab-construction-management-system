import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SYSTEM_ACCOUNTS } from '../../utils/auth';
import { HardHat, Lock, User, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginUser, addToast } = useApp();

  const [usernameOrEmail, setUsernameOrEmail] = useState('foreman');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedInput = usernameOrEmail.trim().toLowerCase();
    const account = SYSTEM_ACCOUNTS.find(
      (acc) =>
        (acc.email.toLowerCase() === trimmedInput || acc.username.toLowerCase() === trimmedInput) &&
        acc.password === password
    );

    if (!account) {
      setErrorMessage('Invalid username/email or password. Try username "foreman", "admin", "contractor", or "pm" with password "password123".');
      return;
    }

    loginUser(account);

    if (account.role === 'Foreman') {
      // Foreman is directed straight to their assigned site workspace
      navigate(`/projects/${account.assignedProjectId || 'PRJ-002'}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleQuickDemo = (account) => {
    setUsernameOrEmail(account.username);
    setPassword(account.password);
    setErrorMessage('');
    loginUser(account);

    if (account.role === 'Foreman') {
      navigate(`/projects/${account.assignedProjectId || 'PRJ-002'}`);
    } else {
      navigate('/dashboard');
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
          BuildTrack Africa
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Construction Site Intelligence & Project Management Platform
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Username or Email Field */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300">
                Username or Work Email
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => {
                    setUsernameOrEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="foreman, admin, contractor, or email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                />
                <span>Keep me signed in on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
            >
              <span>Sign In with Username & Password</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 text-center">
              Quick 1-Click Role Login (Pass: password123)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEM_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleQuickDemo(account)}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 text-left hover:border-amber-500/50 hover:bg-slate-850 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white group-hover:text-amber-400 transition-colors">
                      {account.role}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1 rounded">
                      {account.username}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{account.name}</div>
                  {account.role === 'Foreman' && (
                    <div className="text-[9px] text-amber-400/80 mt-1 font-semibold truncate">
                      Site: Nairobi Tower
                    </div>
                  )}
                </button>
              ))}
            </div>
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
    </div>
  );
};
