/**
 * NASAAB Construction — Equipment & Fleet Routes
 * 
 * Manages site plant/equipment inventory and equipment expenses.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/equipment
 * List equipment inventory items.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT eq.*, p.name as project_name 
      FROM site_equipment_inventory eq
      JOIN projects p ON eq.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE eq.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY eq.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      equipmentName: r.equipment_name,
      status: r.status,
      machineNotes: r.machine_notes,
      date: r.date,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get equipment inventory:', err);
    res.status(500).json({ error: 'Failed to retrieve equipment inventory', detail: err.message });
  }
});

/**
 * POST /api/equipment
 * Add single or multiple equipment inventory entries.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const body = req.body;
  const items = Array.isArray(body) ? body : (body.items ? body.items : [body]);

  try {
    const inserted = [];
    for (const item of items) {
      if (!item.equipmentName && !item.name) continue;
      const id = item.id && !item.id.startsWith('temp-') ? item.id : `eq-${crypto.randomBytes(6).toString('hex')}`;
      const targetProjectId = item.projectId || pId;
      const name = item.equipmentName || item.name;
      const status = item.status || 'Active';
      const notes = item.machineNotes || item.notes || '';
      const date = item.date || new Date().toISOString().split('T')[0];

      await pool.query(`
        INSERT INTO site_equipment_inventory (id, project_id, equipment_name, status, machine_notes, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, targetProjectId, name, status, notes, date]);

      inserted.push({
        id,
        projectId: targetProjectId,
        equipmentName: name,
        status,
        machineNotes: notes,
        date
      });
    }

    await logAuditEvent(req, 'ADD_EQUIPMENT_ITEMS', 'equipment', pId, { count: inserted.length });
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Failed to save equipment:', err);
    res.status(500).json({ error: 'Failed to record equipment', detail: err.message });
  }
});

/**
 * DELETE /api/equipment/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM site_equipment_inventory WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete equipment item:', err);
    res.status(500).json({ error: 'Failed to delete equipment item', detail: err.message });
  }
});

/**
 * GET /api/equipment/expenses
 * List equipment expenses.
 */
router.get('/expenses', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT ee.*, p.name as project_name 
      FROM equipment_expenses ee
      JOIN projects p ON ee.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE ee.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY ee.date DESC, ee.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      equipmentName: r.equipment_name,
      amount: Number(r.amount || 0),
      description: r.description,
      date: r.date,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get equipment expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve equipment expenses', detail: err.message });
  }
});

/**
 * POST /api/equipment/expenses
 * Record single or batch equipment expense.
 */
router.post('/expenses', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const body = req.body;
  const items = Array.isArray(body) ? body : (body.items ? body.items : [body]);

  try {
    const inserted = [];
    for (const exp of items) {
      if (!exp.amount && Number(exp.amount) <= 0) continue;
      const id = exp.id && !exp.id.startsWith('temp-') ? exp.id : `ee-${crypto.randomBytes(6).toString('hex')}`;
      const targetProjectId = exp.projectId || pId;
      const equipName = exp.equipmentName || exp.customName || 'General Equipment';
      const amount = Number(exp.amount || 0);
      const desc = exp.description || '';
      const date = exp.date || new Date().toISOString().split('T')[0];

      await pool.query(`
        INSERT INTO equipment_expenses (id, project_id, equipment_name, amount, description, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, targetProjectId, equipName, amount, desc, date]);

      inserted.push({
        id,
        projectId: targetProjectId,
        equipmentName: equipName,
        amount,
        description: desc,
        date
      });
    }

    await logAuditEvent(req, 'RECORD_EQUIPMENT_EXPENSES', 'equipment_expenses', pId, { count: inserted.length });
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Failed to record equipment expenses:', err);
    res.status(500).json({ error: 'Failed to record equipment expenses', detail: err.message });
  }
});

/**
 * DELETE /api/equipment/expenses/:id
 */
router.delete('/expenses/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM equipment_expenses WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete equipment expense:', err);
    res.status(500).json({ error: 'Failed to delete equipment expense', detail: err.message });
  }
});

export default router;
