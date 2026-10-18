/**
 * NASAAB Construction — User Administration & Project Assignment Routes
 * 
 * Access restricted to Admin and Director roles for administrative management.
 * Provides self-service endpoints for authenticated users.
 */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth, requireRole, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * List all users with their project assignments. Admin and Director only.
 */
router.get('/', requireAuth, requireRole('admin', 'director'), async (_req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, user_id, name, role, must_change_password, status, email, phone, activation_token, created_at, updated_at
      FROM users
      ORDER BY name ASC
    `);

    // Fetch assignments for each user
    const [assignments] = await pool.query(`
      SELECT pua.user_id, pua.project_id, pua.role AS project_role, p.name AS project_name, p.code AS project_code
      FROM project_user_assignments pua
      JOIN projects p ON pua.project_id = p.id
    `);

    const userList = users.map((u) => ({
      ...u,
      mustChangePassword: Boolean(u.must_change_password),
      assignedProjects: assignments
        .filter((a) => a.user_id === u.id)
        .map((a) => ({
          id: a.project_id,
          name: a.project_name,
          code: a.project_code,
          role: a.project_role
        }))
    }));

    res.json(userList);
  } catch (err) {
    console.error('Failed to retrieve users:', err);
    res.status(500).json({ error: 'Failed to retrieve users', detail: err.message });
  }
});

/**
 * POST /api/users
 * Provision a new user account with secure activation token and must_change_password = 1.
 * Admin and Director only.
 */
router.post('/', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const { name, userId, role, email, phone, assignedProjectIds = [] } = req.body;

  if (!name || !userId || !role) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Name, User ID, and Role are required.'
    });
  }

  const validRoles = ['Admin', 'Director', 'Partner', 'Storekeeper', 'Foreman'];
  const matchedRole = validRoles.find((r) => r.toLowerCase() === String(role).trim().toLowerCase());
  if (!matchedRole) {
    return res.status(400).json({
      error: 'Invalid role',
      message: `Role must be one of: ${validRoles.join(', ')}`
    });
  }

  const cleanUserId = String(userId).trim().toLowerCase();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check duplicate
    const [existing] = await connection.query('SELECT id, name FROM users WHERE user_id = ?', [cleanUserId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'User already exists',
        message: `An account with User ID "${cleanUserId}" already exists (${existing[0].name}). Do not create duplicate accounts.`
      });
    }

    const newId = `usr-${crypto.randomBytes(6).toString('hex')}`;
    const activationToken = crypto.randomBytes(24).toString('hex');
    const tempPassword = `Nsb#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await connection.query(`
      INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, email, phone, activation_token)
      VALUES (?, ?, ?, ?, ?, 1, 'active', ?, ?, ?)
    `, [newId, cleanUserId, name.trim(), passwordHash, matchedRole, email || null, phone || null, activationToken]);

    // Insert project assignments if provided
    if (Array.isArray(assignedProjectIds) && assignedProjectIds.length > 0) {
      for (const pId of assignedProjectIds) {
        const assignmentId = `pua-${crypto.randomBytes(8).toString('hex')}`;
        await connection.query(`
          INSERT INTO project_user_assignments (id, project_id, user_id, role)
          VALUES (?, ?, ?, ?)
        `, [assignmentId, pId, newId, matchedRole]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'CREATE_USER', 'user', newId, { userId: cleanUserId, role: matchedRole });

    res.status(201).json({
      success: true,
      message: `Account for ${name} created successfully.`,
      user: {
        id: newId,
        userId: cleanUserId,
        name: name.trim(),
        role: matchedRole,
        activationToken,
        mustChangePassword: true
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'Failed to create user', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/users/:id
 * Update user details, role, status, or project assignments. Admin and Director only.
 */
router.put('/:id', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const targetId = req.params.id;
  const { name, role, email, phone, status, assignedProjectIds } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const current = existing[0];
    const newName = name ? String(name).trim() : current.name;
    const newRole = role || current.role;
    const newStatus = status || current.status;
    const newEmail = email !== undefined ? (email ? String(email).trim() : null) : current.email;
    const newPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : current.phone;

    await connection.query(`
      UPDATE users
      SET name = ?, role = ?, status = ?, email = ?, phone = ?
      WHERE id = ?
    `, [newName, newRole, newStatus, newEmail, newPhone, targetId]);

    // Update project assignments if provided
    if (Array.isArray(assignedProjectIds)) {
      await connection.query('DELETE FROM project_user_assignments WHERE user_id = ?', [targetId]);
      for (const pId of assignedProjectIds) {
        const assignmentId = `pua-${crypto.randomBytes(8).toString('hex')}`;
        await connection.query(`
          INSERT INTO project_user_assignments (id, project_id, user_id, role)
          VALUES (?, ?, ?, ?)
        `, [assignmentId, pId, targetId, newRole]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'UPDATE_USER', 'user', targetId, { role: newRole, status: newStatus });

    res.json({ success: true, message: 'User updated successfully' });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'Failed to update user', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/users/:id/reset-activation
 * Generates a new activation token and sets must_change_password = 1.
 * Admin and Director only.
 */
router.post('/:id/reset-activation', requireAuth, requireRole('admin', 'director'), async (req, res) => {
  const targetId = req.params.id;

  try {
    const [existing] = await pool.query('SELECT id, user_id, name FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    const activationToken = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'UPDATE users SET activation_token = ?, must_change_password = 1 WHERE id = ?',
      [activationToken, targetId]
    );

    await logAuditEvent(req, 'RESET_ACTIVATION', 'user', targetId);

    res.json({
      success: true,
      message: `Activation reset. Share the activation token with ${existing[0].name}.`,
      activationToken
    });

  } catch (err) {
    console.error('Failed to reset activation:', err);
    res.status(500).json({ error: 'Failed to reset activation', detail: err.message });
  }
});

/**
 * PUT /api/users/profile/me
 * Self-service profile update.
 */
router.put('/profile/me', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { name, email, phone } = req.body;

  try {
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), email = ?, phone = ? WHERE id = ?',
      [name || null, email || null, phone || null, userId]
    );

    if (name) req.session.user.name = name;
    if (email) req.session.user.email = email;
    if (phone) req.session.user.phone = phone;

    await logAuditEvent(req, 'UPDATE_PROFILE', 'user', userId);
    res.json({ success: true, message: 'Profile updated successfully', user: req.session.user });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', detail: err.message });
  }
});

/**
 * POST /api/users/change-password
 * Self-service password change.
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing fields', message: 'Current and new password are required.' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Weak password', message: 'New password must be at least 8 characters.' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid password', message: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [hash, userId]);

    await logAuditEvent(req, 'CHANGE_PASSWORD', 'user', userId);
    res.json({ success: true, message: 'Password updated successfully.' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to change password', detail: err.message });
  }
});

export default router;
