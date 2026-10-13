import React from 'react';
import { HardHat } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = HardHat,
  title = 'No records found',
  description = 'There are currently no items matching your criteria in this project.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
