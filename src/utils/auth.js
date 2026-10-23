// Authentication, Roles & Authorization Utilities for NASAAB CONSTRUCTION LIMITED

// Standard normalized role identifiers:
// - 'admin'
// - 'director'
// - 'partner'
// - 'foreman'
// - 'storekeeper'

export const ROLE_MAPPING = {
  contractor: 'Director',
  director: 'Director',
  'project manager': 'Partner',
  'project_manager': 'Partner',
  'projectmanager': 'Partner',
  pm: 'Partner',
  partner: 'Partner',
  foreman: 'Foreman',
  admin: 'Admin',
  administrator: 'Admin',
  'store keeper': 'Storekeeper',
  'storekeeper': 'Storekeeper',
  'store_keeper': 'Storekeeper',
  store: 'Storekeeper'
};

// Normalize any role or legacy string to standard role
export const normalizeRole = (role) => {
  if (!role) return 'Admin';
  const clean = String(role).trim().toLowerCase();
  return ROLE_MAPPING[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
};

// Helper: Check if role is Foreman
export const isForemanRole = (role) => {
  if (!role) return false;
  const clean = String(role).trim().toLowerCase();
  return clean === 'foreman';
};

// Helper: Check if role is Storekeeper
export const isStoreKeeperRole = (role) => {
  if (!role) return false;
  const clean = String(role).trim().toLowerCase();
  return clean === 'storekeeper' || clean === 'store keeper' || clean === 'store_keeper';
};

// Helper: Check if role is Director
export const isDirectorRole = (role) => {
  if (!role) return false;
  const clean = String(role).trim().toLowerCase();
  return clean === 'director' || clean === 'contractor';
};

// Helper: Check if role is Partner
export const isPartnerRole = (role) => {
  if (!role) return false;
  const clean = String(role).trim().toLowerCase();
  return clean === 'partner' || clean === 'pm' || clean === 'project manager' || clean === 'project_manager';
};

// Helper: Check if role is Admin
export const isAdminRole = (role) => {
  if (!role) return false;
  const clean = String(role).trim().toLowerCase();
  return clean === 'admin' || clean === 'administrator';
};

// Helper: Check if role has universal full administrative access across all projects (Admin and Director only)
export const hasFullAccess = (role) => {
  return isAdminRole(role) || isDirectorRole(role);
};

// Helper: Check if role has multi-site switcher capability (Admin, Director, and Partner)
export const canSwitchSites = (role) => {
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role);
};

// Helper: Check if user/role can access or view financial costs
// Only Admin, Director, and Partner can view costs.
// Foremen and Storekeepers are strictly forbidden.
export const canAccessCosts = (role) => {
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role);
};

// Helper: Check if user/role can EDIT labour rates
// Only Admin, Director, and Partner can modify rates.
export const canEditRates = (role) => {
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role);
};

// Helper: Check if a user is Mohamed Hussein or Abdi Mahad on SeaCrest project
// They are partners restricted from accessing the labour section on SeaCrest
export const isUserRestrictedFromLabour = (user, projectOrId) => {
  if (!user) return false;
  const username = String(user.userId || user.user_id || '').trim().toLowerCase();
  const userId = String(user.id || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const isTarget =
    username === 'mohamed.hussein' ||
    username === 'abdi.mahad' ||
    userId === 'usr-mohamed-hussein' ||
    userId === 'usr-abdi-mahad' ||
    name === 'mohamed hussein' ||
    name === 'abdi mahad';

  if (!isTarget) return false;

  if (!projectOrId) return true; // Default assigned to SeaCrest

  const pStr = typeof projectOrId === 'string'
    ? projectOrId.toLowerCase()
    : String(projectOrId.id || projectOrId.code || projectOrId.name || '').toLowerCase();

  return pStr.includes('seacrest') || pStr === 'prj-seacrest' || pStr === 'sc-01' || pStr === 'all';
};

// Helper: Check if a user is Mohamed Hussein or Abdi Mahad on SeaCrest project
// They are partners restricted from accessing Project Financial Overview and Developer Funds & Deposits History on SeaCrest
export const isUserRestrictedFromFunds = (user, projectOrId) => {
  if (!user) return false;
  const username = String(user.userId || user.user_id || '').trim().toLowerCase();
  const userId = String(user.id || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const isTarget =
    username === 'mohamed.hussein' ||
    username === 'abdi.mahad' ||
    userId === 'usr-mohamed-hussein' ||
    userId === 'usr-abdi-mahad' ||
    name === 'mohamed hussein' ||
    name === 'abdi mahad';

  if (!isTarget) return false;

  if (!projectOrId) return true; // Default assigned to SeaCrest

  const pStr = typeof projectOrId === 'string'
    ? projectOrId.toLowerCase()
    : String(projectOrId.id || projectOrId.code || projectOrId.name || '').toLowerCase();

  return pStr.includes('seacrest') || pStr === 'prj-seacrest' || pStr === 'sc-01' || pStr === 'all';
};


// ============================================================================
// WEEKLY REPORTS PERMISSIONS
// 1. Full weekly report: Admin, Director, Partner only
// 2. Labour, activity & equipment weekly report: Admin, Director, Partner, Foreman only (Storekeeper forbidden)
// 3. Material weekly report: Admin, Director, Partner, Storekeeper only (Foreman forbidden)
// ============================================================================
export const canAccessFullWeeklyReport = (role, user = null, project = null) => {
  if (isUserRestrictedFromLabour(user, project)) return false;
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role);
};

export const canAccessLaeWeeklyReport = (role, user = null, project = null) => {
  if (isUserRestrictedFromLabour(user, project)) return false;
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role) || isForemanRole(role);
};

export const canAccessMaterialWeeklyReport = (role) => {
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role) || isStoreKeeperRole(role);
};

export const canAccessAnyWeeklyReport = (role) => {
  return isAdminRole(role) || isDirectorRole(role) || isPartnerRole(role) || isForemanRole(role) || isStoreKeeperRole(role);
};

// Helper: Check if user/role can access a specific route path
export const isRouteAllowedForRole = (role, pathname, assignedProjectId = 'PRJ-001', user = null, currentProject = null) => {
  // Check if Mohamed Hussein or Abdi Mahad accessing labour, equipment, or safety routes on SeaCrest
  if (isUserRestrictedFromLabour(user, currentProject || assignedProjectId)) {
    if (
      pathname.startsWith('/labour') ||
      pathname === '/equipment-report' ||
      pathname === '/safety-delays'
    ) {
      return false;
    }
  }

  // Admin and Director have access to all routes
  if (hasFullAccess(role)) return true;

  // Partner has full access to operational routes within assigned projects
  if (isPartnerRole(role)) {
    if (pathname.startsWith('/projects/')) {
      const pId = pathname.split('/')[2];
      // Handled in project context/detail
      return true;
    }
    return true;
  }

  // Storekeeper: Access to Materials modules, Projects, Dashboard, Reports, and Site Progress
  // FORBIDDEN from Labour
  if (isStoreKeeperRole(role)) {
    if (
      pathname === '/materials' ||
      pathname === '/materials-received' ||
      pathname === '/material-expenses' ||
      pathname === '/dashboard' ||
      pathname === '/projects' ||
      pathname.startsWith('/projects/') ||
      pathname === '/activities' ||
      pathname === '/site-progress' ||
      pathname === '/reports' ||
      pathname === '/settings'
    ) {
      return true;
    }
    // Labour is strictly forbidden for Storekeeper
    if (pathname.startsWith('/labour')) return false;
    return false;
  }

  // Foreman: Access to Labour, Activities, Equipment, Safety & Delays, Site Progress, Reports, Projects, and Profile/Settings
  // FORBIDDEN from Materials requisitions
  if (isForemanRole(role)) {
    if (
      pathname.startsWith('/labour') ||
      pathname === '/activities' ||
      pathname === '/equipment-report' ||
      pathname === '/safety-delays' ||
      pathname === '/site-progress' ||
      pathname === '/daily-reports' ||
      pathname === '/reports' ||
      pathname === '/dashboard' ||
      pathname === '/projects' ||
      pathname.startsWith('/projects/') ||
      pathname === '/settings'
    ) {
      return true;
    }
    // Materials is strictly forbidden for Foreman
    if (pathname === '/materials') return false;
    return false;
  }

  return true;
};

// Helper: Check if a daily report was submitted within the last 24 hours
export const isReportWithin24Hours = (report) => {
  if (!report) return false;
  const now = new Date();

  const timestampStr = report.createdAt || report.created_at || report.submittedAt || report.submitted_at;
  if (timestampStr) {
    const ts = new Date(timestampStr).getTime();
    if (!isNaN(ts)) {
      const elapsedHours = (now.getTime() - ts) / (1000 * 60 * 60);
      return elapsedHours >= 0 && elapsedHours <= 24;
    }
  }

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
// Admin, Director, and Partner always have authority.
// Foreman only has authority within 24 hours of submission.
export const canUserEditReport = (role, report) => {
  if (hasFullAccess(role) || isPartnerRole(role)) return true;
  if (isForemanRole(role)) return isReportWithin24Hours(report);
  return false;
};
