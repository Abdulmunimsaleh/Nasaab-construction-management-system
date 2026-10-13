// Authentication, Roles & Authorization Utilities for BuildTrack Africa

export const SYSTEM_ACCOUNTS = [
  {
    id: 'USR-001',
    username: 'admin',
    email: 'abdulmuniim@buildtrack.africa',
    password: 'password123',
    name: 'Eng. Abdulmuniim Al-Habsi',
    role: 'Admin',
    company: 'BuildTrack Infrastructure Ltd',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '+254 700 123 456',
    location: 'Nairobi, Kenya',
    licenseNo: 'EBK-PE-2018-8492'
  },
  {
    id: 'USR-002',
    username: 'contractor',
    email: 'david.ochieng@kpa.co.ke',
    password: 'password123',
    name: 'Eng. Ali Hussein',
    role: 'Contractor',
    company: 'Consortium Marine & Civil Works',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    phone: '+254 722 001 928',
    location: 'Mombasa, Kenya',
    licenseNo: 'NCA-CTR-2015-1049'
  },
  {
    id: 'USR-003',
    username: 'pm',
    email: 'amina.hassan@buildtrack.africa',
    password: 'password123',
    name: 'Eng. Mohammad Amoody',
    role: 'Project Manager',
    company: 'BuildTrack Infrastructure Ltd',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    phone: '+254 733 998 877',
    location: 'Nairobi, Kenya',
    licenseNo: 'EBK-PE-2019-3891'
  },
  {
    id: 'USR-004',
    username: 'foreman',
    email: 'john.mwangi@buildtrack.africa',
    password: 'password123',
    name: 'John Mwangi',
    role: 'Foreman',
    company: 'BuildTrack Core Staff',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    phone: '+254 712 345 678',
    location: 'Upperhill, Nairobi',
    licenseNo: 'NCA-SITE-FM-8821',
    assignedProjectId: 'PRJ-002' // Nairobi Commercial Tower - Upperhill
  }
];

// Helper: Check if role is Foreman
export const isForemanRole = (role) => {
  return role === 'Foreman';
};

// Helper: Check if role has full administrative access (Admin, Contractor, Project Manager)
export const hasFullAccess = (role) => {
  return ['Admin', 'Contractor', 'Project Manager'].includes(role);
};

// Helper: Check if user/role can access or view financial costs
export const canAccessCosts = (role) => {
  return ['Admin', 'Contractor', 'Project Manager'].includes(role);
};

// Helper: Check if user/role can EDIT labour rates
// Only Admin, Contractor, and Project Manager can modify rates.
// Foreman can view rates but never edit them.
export const canEditRates = (role) => {
  return ['Admin', 'Contractor', 'Project Manager'].includes(role);
};

// Helper: Check if user/role can access a specific route path
export const isRouteAllowedForRole = (role, pathname, assignedProjectId = 'PRJ-002') => {
  if (hasFullAccess(role)) return true;

  if (isForemanRole(role)) {
    // Foreman can only access:
    // 1. Projects (/projects or /projects/:assignedProjectId)
    // 2. Daily reports (/daily-reports)
    // 3. Labour (/labour)
    // 4. Issues (/issues)
    if (pathname === '/projects') return true;
    if (pathname.startsWith('/projects/')) {
      const projectId = pathname.split('/')[2];
      return projectId === assignedProjectId;
    }
    if (pathname === '/daily-reports') return true;
    if (pathname === '/labour') return true;
    if (pathname === '/issues') return true;
    if (pathname === '/reports') return true;
    
    // All other routes are restricted for Foreman (costs, materials, equipment, photos, settings, dashboard)
    return false;
  }

  return true;
};

// Helper: Check if a daily report was submitted within the last 24 hours
export const isReportWithin24Hours = (report) => {
  if (!report) return false;
  const now = new Date();

  // If exact timestamp is saved
  const timestampStr = report.createdAt || report.submittedAt;
  if (timestampStr) {
    const ts = new Date(timestampStr).getTime();
    if (!isNaN(ts)) {
      const elapsedHours = (now.getTime() - ts) / (1000 * 60 * 60);
      return elapsedHours >= 0 && elapsedHours <= 24;
    }
  }

  // Fallback to report.date ('YYYY-MM-DD')
  if (report.date) {
    const todayStr = now.toISOString().split('T')[0];
    if (report.date === todayStr) {
      return true;
    }
    const reportDate = new Date(`${report.date}T23:59:59`).getTime();
    if (!isNaN(reportDate)) {
      const elapsedHours = (now.getTime() - reportDate) / (1000 * 60 * 60);
      return elapsedHours >= 0 && elapsedHours <= 24;
    }
  }

  return false;
};

// Helper: Check if a user role has authority to edit a daily report
// Admin, Contractor, and Project Manager always have authority.
// Foreman only has authority within 24 hours of submission.
export const canUserEditReport = (role, report) => {
  if (hasFullAccess(role)) return true;
  if (isForemanRole(role)) return isReportWithin24Hours(report);
  return false;
};

