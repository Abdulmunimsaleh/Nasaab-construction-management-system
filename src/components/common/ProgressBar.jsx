import React from 'react';

export const ProgressBar = ({
  progress = 0,
  size = 'md',
  showLabel = false,
  color = 'amber'
}) => {
  const clamped = Math.min(100, Math.max(0, Number(progress) || 0));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size] || 'h-2.5';

  const getColorClass = () => {
    if (color === 'emerald' || clamped >= 100) return 'bg-emerald-500';
    if (color === 'blue') return 'bg-blue-600';
    if (clamped > 80) return 'bg-emerald-500';
    if (clamped > 50) return 'bg-amber-500';
    return 'bg-amber-600';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700">
          <span>Completion</span>
          <span className="font-semibold text-slate-900">{clamped}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60 ${sizeClasses}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getColorClass()}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
