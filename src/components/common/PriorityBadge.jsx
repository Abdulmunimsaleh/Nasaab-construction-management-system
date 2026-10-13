import React from 'react';
import { getPriorityColor } from '../../utils/formatters';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const PriorityBadge = ({ priority }) => {
  const colorClass = getPriorityColor(priority);

  const renderIcon = () => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return <AlertCircle className="h-3 w-3" />;
      case 'high':
        return <AlertTriangle className="h-3 w-3 text-orange-700" />;
      default:
        return <Info className="h-3 w-3 text-slate-500" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-semibold shadow-2xs ${colorClass}`}
    >
      {renderIcon()}
      <span>{priority || 'Normal'}</span>
    </span>
  );
};
