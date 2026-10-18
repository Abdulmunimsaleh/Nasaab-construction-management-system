// Currency & Date Formatting Utilities for Kenyan Construction Tech (Nasaab Construction Limited)

export const formatKES = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'KES 0';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount).replace('Ksh', 'KES').replace('KES\u00a0', 'KES ');
};

export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-KE').format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  // Handle direct YYYY-MM-DD string without timezone-shifting Date parsing
  if (typeof dateStr === 'string') {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(m, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parseInt(d, 10)} ${months[monthIdx]} ${y}`;
      }
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

export const getDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string') {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
};

export const formatDateWithDay = (dateStr) => {
  if (!dateStr) return 'N/A';
  const day = getDayOfWeek(dateStr);
  const formatted = formatDate(dateStr);
  return day ? `${day}, ${formatted}` : formatted;
};

export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'N/A';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return dateTimeStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateStr);
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'resolved':
    case 'available':
    case 'in use':
    case 'paid':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'in progress':
    case 'submitted':
    case 'pending':
    case 'maintenance':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'critical':
    case 'delayed':
    case 'rejected':
    case 'low stock':
    case 'unavailable':
    case 'overdue':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'planning':
    case 'draft':
    case 'on hold':
    case 'closed':
    case 'archived':
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400'
      };
  }
};

export const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return 'bg-red-500 text-white font-semibold animate-pulse';
    case 'high':
      return 'bg-orange-100 text-orange-800 border border-orange-200 font-medium';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border border-amber-200 font-medium';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200 font-medium';
  }
};
