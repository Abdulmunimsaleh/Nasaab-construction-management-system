/**
 * NASAAB Construction — Financial Site Costs Routes
 * 
 * Strict Confidentiality:
 * - Admin, Director, and Partner ONLY.
 * - Foremen and Storekeepers are completely FORBIDDEN (403).
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, requireModule, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireModule('costs'));

/**
 * GET /api/costs
 * List financial expense entries for project.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = 'SELECT * FROM costs';
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY date DESC, created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map((c) => ({
      ...c,
      amount: Number(c.amount),
      projectId: c.project_id
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve costs', detail: err.message });
  }
});

/**
 * POST /api/costs
 * Record financial expense entry. Admin, Director, Partner only.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const c = req.body;

  const amt = Number(c.amount);
  if (isNaN(amt) || amt <= 0 || !c.description) {
    return res.status(400).json({ error: 'Valid positive amount and description are required' });
  }

  const costId = `cst-${crypto.randomBytes(6).toString('hex')}`;
  const userId = req.session.user.id;

  try {
    await pool.query(`
      INSERT INTO costs (id, project_id, category, description, amount, date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      costId,
      pId,
      c.category || 'Materials',
      c.description,
      amt,
      c.date || new Date().toISOString().split('T')[0],
      userId
    ]);

    await logAuditEvent(req, 'RECORD_COST', 'costs', costId, { amount: amt, category: c.category });

    res.status(201).json({
      id: costId,
      projectId: pId,
      amount: amt,
      category: c.category || 'Materials',
      description: c.description,
      date: c.date || new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Failed to record cost:', err);
    res.status(500).json({ error: 'Failed to record cost entry', detail: err.message });
  }
});

export default router;
