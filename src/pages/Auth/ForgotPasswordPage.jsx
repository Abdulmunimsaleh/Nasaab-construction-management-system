import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 mb-4 shadow-lg shadow-amber-500/25">
          <HardHat className="h-8 w-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Reset Account Password</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your registered enterprise work email to receive password reset instructions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">Reset Link Dispatched</h3>
              <p className="text-xs text-slate-400">
                We sent password instructions to <strong className="text-white">{email}</strong>. Check your corporate inbox.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-300">
                  Work Email Address
                </label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@buildtrack.africa"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-10 pr-3.5 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Send Password Reset Email
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
