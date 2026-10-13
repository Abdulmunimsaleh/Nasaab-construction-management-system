import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  const getToastStyles = (type) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-rose-900/95 border-rose-700 text-white',
          icon: <AlertCircle className="h-5 w-5 text-rose-300 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-900/95 border-amber-700 text-white',
          icon: <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" />
        };
      case 'info':
        return {
          bg: 'bg-slate-900/95 border-slate-700 text-white',
          icon: <Info className="h-5 w-5 text-sky-400 shrink-0" />
        };
      case 'success':
      default:
        return {
          bg: 'bg-emerald-950/95 border-emerald-700 text-white',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        };
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const { bg, icon } = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${bg}`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <p className="text-xs sm:text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
