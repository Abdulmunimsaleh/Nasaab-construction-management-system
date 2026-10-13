import React from 'react';
import { getStatusColor } from '../../utils/formatters';

export const StatusBadge = ({ status, size = 'sm' }) => {
  const styles = getStatusColor(status);
  
  const sizeClasses = size === 'xs' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : size === 'md' 
    ? 'px-3 py-1 text-xs' 
    : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs ${styles.bg} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      <span className="capitalize">{status || 'Unknown'}</span>
    </span>
  );
};
