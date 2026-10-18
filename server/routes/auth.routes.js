/**
 * NASAAB Construction — Authentication Routes
 * 
 * Implements:
 * - 3-field login (Project, User ID, Password)
 * - MySQL-backed verification
 * - Generic error responses (never reveals if user ID or password was wrong)
 * - Strict project authorization check against project_user_assignments
 * - Global access for Admins & Directors (auto applies to future projects)
 * - Initial password setup / activation flow (forcing password change on first login)
 * - Project switching
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { requireAuth, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for login: max 20 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many attempts',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});

/**
 * GET /api/auth/projects
 * Returns active projects for the login dropdown.
 */
router.get('/projects', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, code, location, status
      FROM projects
      WHERE status != 'completed' OR status = 'active'
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch projects for login:', err);
    res.status(500).json({ error: 'Failed to retrieve project list' });
  }
});

/**
 * POST /api/auth/login
 * Exactly 3 fields: projectId, userId, password.
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { projectId, userId, password } = req.body;

  if (!projectId || !userId || !password) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Project, User ID, and Password are all required.'
    });
  }

  const cleanUserId = String(userId).trim();
  const cleanProjectId = String(projectId).trim();

  try {
    // 1. Verify project exists
    const [projectRows] = await pool.query(
      'SELECT id, name, code, location, status FROM projects WHERE id = ?',
      [cleanProjectId]
    );

    if (projectRows.length === 0) {
      // Return generic failure to prevent project enumeration
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid User ID, password, or project authorization.'
      });
    }

    const targetProject = projectRows[0];

    // 2. Fetch user by user_id or id
    const [userRows] = await pool.query(
      `SELECT id, user_id, name, password_hash, role, must_change_password, status, email, phone
       FROM users
       WHERE user_id = ? OR id = ?`,
      [cleanUserId, cleanUserId]
    );

    // Generic error message: NEVER reveal whether user ID or password was invalid
    const genericAuthError = {
      error: 'Authentication failed',
      message: 'Invalid User ID, password, or project authorization.'
    };

    if (userRows.length === 0) {
      await logAuditEvent(req, 'LOGIN_FAILED_UNKNOWN_USER', 'user', null, { attempted: cleanUserId });
      return res.status(401).json(genericAuthError);
    }

    const user = userRows[0];

    // 3. Verify account is active
    if (user.status !== 'active') {
      await logAuditEvent(req, 'LOGIN_BLOCKED_INACTIVE', 'user', user.id);
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account is currently inactive. Please contact an Administrator.'
      });
    }

    // 4. Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordMatch) {
      await logAuditEvent(req, 'LOGIN_FAILED_CREDENTIALS', 'user', user.id);
      return res.status(401).json(genericAuthError);
    }

    // 5. Verify Project Assignment
    // Admins and Directors have universal access to all projects, including future ones
    const isGlobalRole = ['admin', 'director'].includes(user.role.toLowerCase());
    let accessibleProjects = [];

    if (isGlobalRole) {
      const [allProjects] = await pool.query(
        'SELECT id, name, code, location, status FROM projects ORDER BY name ASC'
      );
      accessibleProjects = allProjects;
    } else {
      // Partner, Storekeeper, Foreman: verify membership in project_user_assignments
      const [assignments] = await pool.query(
        `SELECT p.id, p.name, p.code, p.location, p.status, pua.role AS assigned_role
         FROM project_user_assignments pua
         JOIN projects p ON pua.project_id = p.id
         WHERE pua.user_id = ?`,
        [user.id]
      );

      accessibleProjects = assignments;

      const isAssigned = assignments.some((a) => a.id === targetProject.id);
      if (!isAssigned) {
        await logAuditEvent(req, 'LOGIN_REJECTED_UNAUTHORIZED_PROJECT', 'user', user.id, {
          role: user.role,
          attemptedProject: targetProject.name
        });

        return res.status(403).json({
          error: 'Unauthorized project',
          message: `Your account is not assigned to "${targetProject.name}". Please select an assigned project or contact an Administrator.`
        });
      }
    }

    // 6. Establish Session
    const sessionUserData = {
      id: user.id,
      userId: user.user_id,
      name: user.name,
      role: user.role,
      mustChangePassword: Boolean(user.must_change_password),
      status: user.status,
      email: user.email,
      phone: user.phone
    };

    req.session.user = sessionUserData;
    req.session.activeProjectId = targetProject.id;
    req.session.activeProjectName = targetProject.name;

    await logAuditEvent(req, 'LOGIN_SUCCESS', 'user', user.id, {
      project: targetProject.name,
      role: user.role
    });

    res.json({
      success: true,
      user: sessionUserData,
      activeProject: targetProject,
      accessibleProjects,
      requirePasswordChange: Boolean(user.must_change_password),
      message: `Welcome, ${user.name}!`
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server authentication error', detail: err.message });
  }
});

/**
 * POST /api/auth/activate
 * Account activation / first-time password setup.
 * Requires userId, activationToken, and newPassword.
 */
router.post('/activate', async (req, res) => {
  const { userId, activationToken, newPassword } = req.body;

  if (!userId || !activationToken || !newPassword) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'User ID, Activation Token, and New Password are required.'
    });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'Password must be at least 8 characters long.'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, activation_token, status
       FROM users
       WHERE (user_id = ? OR id = ?) AND activation_token = ?`,
      [userId.trim(), userId.trim(), activationToken.trim()]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'Activation failed',
        message: 'Invalid User ID or activation token.'
      });
    }

    const user = rows[0];
    const newHash = await bcrypt.hash(String(newPassword), 10);

    // Update password, clear token, mark must_change_password = 0
    await pool.query(
      `UPDATE users
       SET password_hash = ?, activation_token = NULL, must_change_password = 0, status = 'active'
       WHERE id = ?`,
      [newHash, user.id]
    );

    await logAuditEvent(req, 'ACCOUNT_ACTIVATED', 'user', user.id);

    res.json({
      success: true,
      message: 'Account successfully activated! You may now log in with your new password.'
    });

  } catch (err) {
    console.error('Account activation error:', err);
    res.status(500).json({ error: 'Activation failed', detail: err.message });
  }
});

/**
 * POST /api/auth/complete-password-setup
 * Authenticated users with must_change_password = 1 must complete this flow.
 */
router.post('/complete-password-setup', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Current password and new password are required.'
    });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'New password must be at least 8 characters long.'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [req.session.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!match) {
      return res.status(401).json({
        error: 'Incorrect current password',
        message: 'The current password provided is incorrect.'
      });
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query(
      `UPDATE users
       SET password_hash = ?, must_change_password = 0, activation_token = NULL
       WHERE id = ?`,
      [newHash, user.id]
    );

    req.session.user.mustChangePassword = false;

    await logAuditEvent(req, 'PASSWORD_SETUP_COMPLETED', 'user', user.id);

    res.json({
      success: true,
      message: 'Password successfully updated! Account is now fully configured.'
    });

  } catch (err) {
    console.error('Password setup error:', err);
    res.status(500).json({ error: 'Password setup failed', detail: err.message });
  }
});

/**
 * POST /api/auth/switch-project
 * Allows authenticated user to switch their active project context.
 */
router.post('/switch-project', requireAuth, async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const user = req.session.user;
  const isGlobalRole = ['admin', 'director'].includes(user.role.toLowerCase());

  try {
    if (projectId === 'all') {
      if (!isGlobalRole) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only Administrator and Director roles can switch to all projects combined view.'
        });
      }

      req.session.activeProjectId = 'all';
      req.session.activeProjectName = 'All Projects Combined';

      await logAuditEvent(req, 'PROJECT_SWITCHED', 'project', 'all');

      return res.json({
        success: true,
        activeProject: { id: 'all', name: 'All Projects Combined', code: 'ALL', location: 'All Sites' },
        message: 'Active workspace switched to All Projects Combined'
      });
    }

    const [projs] = await pool.query(
      'SELECT id, name, code, location, status FROM projects WHERE id = ?',
      [projectId]
    );

    if (projs.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const targetProject = projs[0];

    if (!isGlobalRole) {
      const [assignments] = await pool.query(
        'SELECT id FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
        [user.id, targetProject.id]
      );

      if (assignments.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Your account is not assigned to project "${targetProject.name}".`
        });
      }
    }

    req.session.activeProjectId = targetProject.id;
    req.session.activeProjectName = targetProject.name;

    await logAuditEvent(req, 'PROJECT_SWITCHED', 'project', targetProject.id);

    res.json({
      success: true,
      activeProject: targetProject,
      message: `Active project switched to ${targetProject.name}`
    });

  } catch (err) {
    console.error('Project switch error:', err);
    res.status(500).json({ error: 'Project switch failed', detail: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user and session context.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.session.user;

    const [rows] = await pool.query(
      `SELECT id, user_id, name, role, must_change_password, status, email, phone
       FROM users WHERE id = ?`,
      [sessionUser.id]
    );

    if (rows.length === 0 || rows[0].status !== 'active') {
      req.session.destroy();
      return res.status(401).json({ error: 'Session invalidated' });
    }

    const dbUser = rows[0];
    req.session.user.role = dbUser.role;
    req.session.user.mustChangePassword = Boolean(dbUser.must_change_password);

    const isGlobal = ['admin', 'director'].includes(dbUser.role.toLowerCase());
    let accessibleProjects = [];

    if (isGlobal) {
      const [all] = await pool.query('SELECT id, name, code, location, status FROM projects ORDER BY name ASC');
      accessibleProjects = all;
    } else {
      const [assigned] = await pool.query(`
        SELECT p.id, p.name, p.code, p.location, p.status
        FROM project_user_assignments pua
        JOIN projects p ON pua.project_id = p.id
        WHERE pua.user_id = ?
      `, [dbUser.id]);
      accessibleProjects = assigned;
    }

    let activeProject = null;
    if (req.session.activeProjectId === 'all' && isGlobal) {
      activeProject = { id: 'all', name: 'All Projects Combined', code: 'ALL', location: 'All Sites' };
    } else if (req.session.activeProjectId) {
      const [pRows] = await pool.query('SELECT id, name, code, location, status FROM projects WHERE id = ?', [req.session.activeProjectId]);
      if (pRows.length > 0) activeProject = pRows[0];
    }
    if (!activeProject && accessibleProjects.length > 0) {
      activeProject = accessibleProjects[0];
      req.session.activeProjectId = activeProject.id;
    }

    res.json({
      user: {
        id: dbUser.id,
        userId: dbUser.user_id,
        name: dbUser.name,
        role: dbUser.role,
        mustChangePassword: Boolean(dbUser.must_change_password),
        status: dbUser.status,
        email: dbUser.email,
        phone: dbUser.phone
      },
      activeProjectId: activeProject?.id,
      activeProject,
      accessibleProjects
    });

  } catch (err) {
    console.error('/me check error:', err);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  const userId = req.session?.user?.id;
  logAuditEvent(req, 'LOGOUT', 'user', userId);
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Failed to destroy session' });
    res.clearCookie('nasaab.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
