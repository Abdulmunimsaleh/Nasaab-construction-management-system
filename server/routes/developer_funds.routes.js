/**
 * NASAAB Construction — Developer Funds Received Routes
 * 
 * Manages developer capital allocations, site startup deposits, and additional floats.
 * Security:
 * - Admin, Director, Partner: Full Access (Add, Edit, Delete).
 * - Foreman & Storekeeper: READ-ONLY (Viewing only, strictly forbidden from Add/Edit/Delete).
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

router.use(requireAuth);

// Security: Foremen and Storekeepers are strictly forbidden from developer funds
router.use((req, res, next) => {
  const role = (req.session?.user?.role || '').toLowerCase();
  if (['foreman', 'storekeeper'].includes(role)) {
    return res.status(403).json({
      error: 'Module restricted',
      message: 'Foremen and storekeepers are not authorized to access developer funds.'
    });
  }
  next();
});

/**
 * GET /api/developer-funds
 * List funds deposits.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT df.*, p.name as project_name, p.code as project_code 
      FROM developer_funds df
      JOIN projects p ON df.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE df.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY df.date DESC, df.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      projectCode: r.project_code,
      referenceNo: r.reference_no,
      reference: r.reference_no,
      date: r.date,
      title: r.title,
      description: r.title,
      depositor: r.depositor,
      wireRef: r.wire_ref,
      stage: r.stage,
      amount: Number(r.amount || 0),
      fundType: r.fund_type,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get developer funds:', err);
    res.status(500).json({ error: 'Failed to retrieve developer funds', detail: err.message });
  }
});

/**
 * POST /api/developer-funds
 * Record new funds allocation / deposit.
 * Restricted to Admin, Director, Partner.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['foreman', 'storekeeper'].includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Foremen and Storekeepers are not permitted to record financial deposits or add funds.'
    });
  }

  const b = req.body;
  const id = b.id && !b.id.startsWith('temp-') ? b.id : `fund-${crypto.randomBytes(6).toString('hex')}`;
  const targetProjectId = b.projectId || pId;
  const amount = Number(b.amount || 0);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'A valid positive deposit amount is required.' });
  }

  const referenceNo = b.referenceNo || b.reference || `DEP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const title = b.title || b.description || 'Developer Capital Allocation';
  const depositor = b.depositor || 'NASAAB Holdings Ltd';
  const wireRef = b.wireRef || '';
  const stage = b.stage || 'Phase 1';
  const fundType = b.fundType || 'additional';
  const date = b.date || new Date().toISOString().split('T')[0];

  try {
    await pool.query(`
      INSERT INTO developer_funds (
        id, reference_no, project_id, date, title, depositor, wire_ref, stage, amount, fund_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, referenceNo, targetProjectId, date, title, depositor, wireRef, stage, amount, fundType
    ]);

    await logAuditEvent(req, 'RECORD_DEVELOPER_FUNDS', 'developer_funds', id, { amount, referenceNo });

    res.status(201).json({
      id,
      projectId: targetProjectId,
      referenceNo,
      reference: referenceNo,
      date,
      title,
      description: title,
      depositor,
      wireRef,
      stage,
      amount,
      fundType
    });
  } catch (err) {
    console.error('Failed to record developer funds:', err);
    res.status(500).json({ error: 'Failed to record deposit', detail: err.message });
  }
});

/**
 * PUT /api/developer-funds/:id
 * Edit existing funds deposit.
 */
router.put('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['foreman', 'storekeeper'].includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Foremen and Storekeepers are not permitted to edit financial funds.'
    });
  }

  const b = req.body;
  try {
    await pool.query(`
      UPDATE developer_funds SET
        reference_no = COALESCE(?, reference_no),
        date = COALESCE(?, date),
        title = COALESCE(?, title),
        depositor = COALESCE(?, depositor),
        wire_ref = COALESCE(?, wire_ref),
        stage = COALESCE(?, stage),
        amount = COALESCE(?, amount),
        fund_type = COALESCE(?, fund_type)
      WHERE id = ?
    `, [
      b.referenceNo || b.reference,
      b.date,
      b.title || b.description,
      b.depositor,
      b.wireRef,
      b.stage,
      b.amount !== undefined ? Number(b.amount) : null,
      b.fundType,
      id
    ]);

    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to update developer funds:', err);
    res.status(500).json({ error: 'Failed to update deposit', detail: err.message });
  }
});

/**
 * DELETE /api/developer-funds/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['foreman', 'storekeeper'].includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Foremen and Storekeepers cannot delete financial funds.'
    });
  }

  try {
    await pool.query('DELETE FROM developer_funds WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete developer funds:', err);
    res.status(500).json({ error: 'Failed to delete deposit', detail: err.message });
  }
});

export default router;
