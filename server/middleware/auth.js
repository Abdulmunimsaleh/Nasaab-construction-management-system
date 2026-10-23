/**
 * NASAAB Construction — Authentication & Authorization Middleware
 * 
 * Enforces centralized server-side authorization:
 * - Active authenticated session
 * - Role-based permissions (Admin, Director, Partner, Storekeeper, Foreman)
 * - Project assignment verification (project_user_assignments table)
 * - Admin and Director have universal access to all projects (including future ones)
 * - Partner has access only to assigned projects
 * - Storekeeper: Access only to Materials module within assigned projects. FORBIDDEN from labour/equipment forms and costs.
 * - Foreman: Access only to Labour, Activity, and Equipment forms within assigned projects. FORBIDDEN from materials and costs.
 */
import crypto from 'crypto';
import pool from '../db.js';

/**
 * 1. Require Authenticated Session
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Your session has expired or you are not signed in. Please log in.'
    });
  }

  const user = req.session.user;
  const status = (user.status || (user.isActive ? 'active' : 'inactive')).toLowerCase();

  if (status !== 'active') {
    req.session.destroy();
    return res.status(403).json({
      error: 'Account deactivated',
      message: 'This account has been deactivated. Please contact an Administrator.'
    });
  }

  next();
}

/**
 * 2. Require One of Specified Roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = (req.session.user.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Your role (${req.session.user.role}) is not authorized to perform this operation.`
      });
    }

    next();
  };
}

/**
 * 3. Verify Project Access Authorization
 * Extracts project ID from params, query, body, or active session project.
 * - Admin and Director: Authorized for any project in the database (including future projects).
 * - Partner, Foreman, Storekeeper: Verified against `project_user_assignments` in MySQL.
 */
export async function requireProjectAccess(req, res, next) {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const role = (user.role || '').toLowerCase();

  const requestedProjectId =
    req.params.projectId ||
    req.params.id ||
    req.query.projectId ||
    req.body.projectId ||
    req.session.activeProjectId;

  if (!requestedProjectId || requestedProjectId === 'all') {
    // If accessing cross-project aggregator, verify user is Admin or Director
    if (['admin', 'director'].includes(role)) {
      req.authorizedProjectId = 'all';
      return next();
    }
    return res.status(403).json({
      error: 'Project scoping required',
      message: 'You must specify an authorized project for this operation.'
    });
  }

  // Admin and Director have universal authority across all projects
  if (['admin', 'director'].includes(role)) {
    req.authorizedProjectId = requestedProjectId;
    return next();
  }

  // Partner, Foreman, Storekeeper: check MySQL project_user_assignments
  try {
    const [rows] = await pool.query(
      'SELECT id, role FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
      [user.id, requestedProjectId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied to project',
        message: `Your account is not authorized to access project '${requestedProjectId}'.`
      });
    }

    req.authorizedProjectId = requestedProjectId;
    next();
  } catch (err) {
    console.error('Project authorization check failed:', err);
    return res.status(500).json({ error: 'Authorization verification failed', detail: err.message });
  }
}

/**
 * 4. Module Access Guard
 * - Foreman: Only Labour, Activity, and Equipment. FORBIDDEN from materials, costs, users.
 * - Storekeeper: Only Materials. FORBIDDEN from labour, equipment, costs, users.
 * - Partner: Full access to permitted project modules within assigned projects. FORBIDDEN from global user management.
 * - Admin / Director: Full access.
 */
export function requireModule(moduleName, operation = 'read') {
  return (req, res, next) => {
    const role = (req.session?.user?.role || '').toLowerCase();
    if (!role) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin & Director have unrestricted access
    if (['admin', 'director'].includes(role)) {
      return next();
    }

    // Partner
    if (role === 'partner') {
      if (moduleName === 'users' && operation !== 'read') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only Administrators and Directors can manage user accounts.'
        });
      }
      return next();
    }

    // Foreman: Can only access labour/activity/equipment
    if (role === 'foreman') {
      if (['materials', 'costs', 'users', 'projects_mgmt'].includes(moduleName)) {
        return res.status(403).json({
          error: 'Module restricted',
          message: `Site Foremen cannot access ${moduleName} or financial records.`
        });
      }
      return next();
    }

    // Storekeeper: Can only access materials
    if (role === 'storekeeper') {
      if (['labour', 'equipment', 'lae_forms', 'costs', 'users', 'projects_mgmt'].includes(moduleName)) {
        return res.status(403).json({
          error: 'Module restricted',
          message: `Storekeepers cannot access ${moduleName} or workforce records.`
        });
      }
      return next();
    }

    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized role module access.' });
  };
}

/**
 * 5. Helper to record audit logs
 */
export async function logAuditEvent(req, action, entityType, entityId, details = null) {
  try {
    const user = req.session?.user;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const auditId = `aud-${crypto.randomBytes(8).toString('hex')}`;
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        user?.id || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        String(ip).substring(0, 45)
      ]
    );
  } catch (err) {
    console.error('Audit log recording failed:', err.message);
  }
}

/**
 * 6. Helper: Check if user is Mohamed Hussein or Abdi Mahad on SeaCrest project
 * Both partners are strictly restricted from the labour & subcontract section on SeaCrest.
 */
export function isLabourRestrictedUser(user, projectId) {
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

  if (!projectId) return true; // Default assigned to SeaCrest

  const pStr = String(projectId).trim().toLowerCase();
  return pStr === 'prj-seacrest' || pStr === 'sc-01' || pStr.includes('seacrest') || pStr === 'all';
}

/**
 * 7. Helper: Check if user is Mohamed Hussein or Abdi Mahad on SeaCrest project
 * Both partners are strictly restricted from Project Financial Overview and Developer Funds & Deposits History on SeaCrest.
 */
export function isFundsRestrictedUser(user, projectId) {
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

  if (!projectId) return true; // Default assigned to SeaCrest

  const pStr = String(projectId).trim().toLowerCase();
  return pStr === 'prj-seacrest' || pStr === 'sc-01' || pStr.includes('seacrest') || pStr === 'all';
}


