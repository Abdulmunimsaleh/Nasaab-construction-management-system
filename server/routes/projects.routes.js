/**
 * NASAAB Construction — Projects Routes
 * 
 * Implements project management:
 * - Admin and Director: Can view all projects, create projects, edit details, view/manage assigned users.
 * - Automatic availability in login dropdown.
 * - Global access for Admins/Directors to all projects without manual assignment.
 * - Partner, Foreman, Storekeeper: Can only view assigned projects.
 */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, requireRole, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/projects
 * Lists projects authorized for current user.
 */
router.get('/', requireAuth, async (req, res) => {
  const user = req.session.user;
  const role = (user.role || '').toLowerCase();

  try {
    let rows;
    if (['admin', 'director'].includes(role)) {
      [rows] = await pool.query('SELECT * FROM projects ORDER BY name ASC');
    } else {
      [rows] = await pool.query(`
        SELECT p.*
        FROM projects p
        JOIN project_user_assignments pua ON p.id = pua.project_id
        WHERE pua.user_id = ?
        ORDER BY p.name ASC
      `, [user.id]);
    }

    res.json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects', detail: err.message });
  }
});

/**
 * GET /api/projects/:id
 * Fetch single project detail with access check.
 */
router.get('/:id', requireAuth, requireProjectAccess, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project', detail: err.message });
  }
});

/**
 * POST /api/projects
 * Create project — Admin and Director only.
 * Immediately makes project available in MySQL and login dropdown.
 */
router.post('/', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const { name, location, code, status = 'active' } = req.body;

  if (!name || !location) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Project name and location are required.'
    });
  }

  try {
    const cleanName = String(name).trim();
    const cleanLocation = String(location).trim();

    // Generate unique slug-like ID and code if not supplied
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM projects');
    const nextNum = (countRows[0]?.count || 0) + 1;
    const generatedCode = code ? String(code).trim().toUpperCase() : `PRJ-${String(nextNum).padStart(2, '0')}`;
    const generatedId = `prj-${generatedCode.toLowerCase()}-${crypto.randomBytes(3).toString('hex')}`;

    await pool.query(
      `INSERT INTO projects (id, code, name, location, status) VALUES (?, ?, ?, ?, ?)`,
      [generatedId, generatedCode, cleanName, cleanLocation, status]
    );

    const [createdRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [generatedId]);
    await logAuditEvent(req, 'CREATE_PROJECT', 'project', generatedId, { name: cleanName, location: cleanLocation });

    res.status(201).json({
      success: true,
      message: 'Project created successfully and is now active.',
      project: createdRows[0]
    });

  } catch (err) {
    console.error('Failed to create project:', err);
    res.status(500).json({ error: 'Failed to create project', detail: err.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project details — Admin and Director.
 */
router.put('/:id', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const projectId = req.params.id;
  const { name, location, code, status } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const current = existing[0];
    const newName = name ? String(name).trim() : current.name;
    const newLocation = location ? String(location).trim() : current.location;
    const newCode = code ? String(code).trim().toUpperCase() : current.code;
    const newStatus = status || current.status;

    await pool.query(
      `UPDATE projects SET name = ?, location = ?, code = ?, status = ? WHERE id = ?`,
      [newName, newLocation, newCode, newStatus, projectId]
    );

    const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    await logAuditEvent(req, 'UPDATE_PROJECT', 'project', projectId, { name: newName });

    res.json({
      success: true,
      message: 'Project updated successfully.',
      project: updated[0]
    });

  } catch (err) {
    console.error('Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project', detail: err.message });
  }
});

/**
 * GET /api/projects/:id/users
 * View assigned users for this project — Admin, Director, or assigned Partner.
 */
router.get('/:id/users', requireAuth, requireProjectAccess, async (req, res) => {
  const projectId = req.params.id;

  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.user_id, u.name, u.role, u.status, u.email, u.phone, pua.role AS project_role, pua.created_at AS assigned_at
      FROM project_user_assignments pua
      JOIN users u ON pua.user_id = u.id
      WHERE pua.project_id = ?
      ORDER BY u.name ASC
    `, [projectId]);

    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch assigned users:', err);
    res.status(500).json({ error: 'Failed to retrieve assigned users', detail: err.message });
  }
});

/**
 * POST /api/projects/:id/users
 * Assign an existing user to this project — Admin and Director only.
 * Does NOT create duplicate user accounts.
 */
router.post('/:id/users', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const projectId = req.params.id;
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId', message: 'User ID is required.' });
  }

  try {
    // 1. Verify project exists
    const [pRows] = await pool.query('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (pRows.length === 0) return res.status(404).json({ error: 'Project not found' });

    // 2. Find user by id or user_id
    const [uRows] = await pool.query('SELECT id, user_id, name, role FROM users WHERE id = ? OR user_id = ?', [userId, userId]);
    if (uRows.length === 0) return res.status(404).json({ error: 'User account not found' });

    const targetUser = uRows[0];
    const assignedRole = role || targetUser.role;

    // 3. Upsert assignment into project_user_assignments
    const assignmentId = `pua-${crypto.randomBytes(8).toString('hex')}`;
    await pool.query(`
      INSERT INTO project_user_assignments (id, project_id, user_id, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE role = VALUES(role), updated_at = CURRENT_TIMESTAMP
    `, [assignmentId, projectId, targetUser.id, assignedRole]);

    await logAuditEvent(req, 'ASSIGN_USER_TO_PROJECT', 'project_user_assignment', targetUser.id, {
      projectId,
      user: targetUser.name,
      role: assignedRole
    });

    res.json({
      success: true,
      message: `${targetUser.name} assigned to ${pRows[0].name} as ${assignedRole}.`
    });

  } catch (err) {
    console.error('Failed to assign user to project:', err);
    res.status(500).json({ error: 'Failed to assign user', detail: err.message });
  }
});

/**
 * POST /api/projects/:id/create-user-and-assign
 * Create a new user account and assign to this project — Admin and Director only.
 */
router.post('/:id/create-user-and-assign', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const projectId = req.params.id;
  const { name, userId, role, email, phone } = req.body;

  if (!name || !userId || !role) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Name, unique User ID, and Role are required.'
    });
  }

  const validRoles = ['Admin', 'Director', 'Partner', 'Storekeeper', 'Foreman'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role', message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check project exists
    const [pRows] = await connection.query('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (pRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check unique user_id
    const cleanUserId = String(userId).trim().toLowerCase();
    const [existing] = await connection.query('SELECT id FROM users WHERE user_id = ?', [cleanUserId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'User ID exists',
        message: `An account with User ID "${cleanUserId}" already exists. Assign the existing user instead.`
      });
    }

    // Generate secure activation token and temporary password
    const newId = `usr-${crypto.randomBytes(6).toString('hex')}`;
    const activationToken = crypto.randomBytes(24).toString('hex');
    const tempPassword = `Nsb#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await connection.query(`
      INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, email, phone, activation_token)
      VALUES (?, ?, ?, ?, ?, 1, 'active', ?, ?, ?)
    `, [newId, cleanUserId, name.trim(), passwordHash, role, email || null, phone || null, activationToken]);

    // Assign to project
    const assignmentId = `pua-${crypto.randomBytes(8).toString('hex')}`;
    await connection.query(`
      INSERT INTO project_user_assignments (id, project_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `, [assignmentId, projectId, newId, role]);

    await connection.commit();
    await logAuditEvent(req, 'CREATE_USER_AND_ASSIGN', 'user', newId, { project: pRows[0].name, role });

    res.status(201).json({
      success: true,
      message: `User ${name} created and assigned to ${pRows[0].name}.`,
      user: {
        id: newId,
        userId: cleanUserId,
        name: name.trim(),
        role,
        activationToken
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to create and assign user:', err);
    res.status(500).json({ error: 'Failed to create user', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/projects/:id/users/:userId
 * Remove a user's project assignment without deleting their account or history.
 * Admin and Director only.
 */
router.delete('/:id/users/:userId', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    // Resolve userId if username passed
    const [uRows] = await pool.query('SELECT id FROM users WHERE id = ? OR user_id = ?', [userId, userId]);
    const targetUserId = uRows[0]?.id || userId;

    const [result] = await pool.query(
      'DELETE FROM project_user_assignments WHERE project_id = ? AND user_id = ?',
      [projectId, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await logAuditEvent(req, 'REMOVE_PROJECT_ASSIGNMENT', 'project_user_assignment', userId, { projectId });

    res.json({
      success: true,
      message: 'Project assignment removed. The user account and historical records remain intact.'
    });

  } catch (err) {
    console.error('Failed to remove project assignment:', err);
    res.status(500).json({ error: 'Failed to remove assignment', detail: err.message });
  }
});

export default router;
