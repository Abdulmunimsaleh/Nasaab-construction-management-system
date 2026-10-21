/**
 * NASAAB Construction — Subcontract (Piece Work) Routes
 * 
 * Manages subcontractor agreements and weekly payment certificates.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/subcontracts/agreements
 * List agreements for project or all projects (scoped by user access).
 */
router.get('/agreements', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT sa.*, p.name as project_name, p.code as project_code 
      FROM subcontract_agreements sa
      JOIN projects p ON sa.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE sa.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY sa.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      contractId: r.contract_id,
      projectId: r.project_id,
      projectName: r.project_name,
      teamName: r.team_name,
      foremanName: r.foreman_name,
      contractDate: r.contract_date,
      floor: r.floor,
      agreedAmount: Number(r.agreed_amount || 0),
      totalPaid: Number(r.total_paid || 0),
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get agreements:', err);
    res.status(500).json({ error: 'Failed to retrieve subcontract agreements', detail: err.message });
  }
});

/**
 * POST /api/subcontracts/agreements
 * Create new subcontract agreement.
 */
router.post('/agreements', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const b = req.body;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['storekeeper'].includes(role)) {
    return res.status(403).json({ error: 'Storekeepers cannot create subcontract agreements.' });
  }

  const id = b.id || `sc-${crypto.randomBytes(6).toString('hex')}`;
  const contractId = b.contractId || `SC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const agreedAmount = Number(b.agreedAmount || 0);

  try {
    await pool.query(`
      INSERT INTO subcontract_agreements (
        id, contract_id, project_id, team_name, foreman_name,
        contract_date, floor, agreed_amount, total_paid, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      contractId,
      b.projectId || pId,
      b.teamName || 'Subcontractor',
      b.foremanName || req.session?.user?.name || '',
      b.contractDate || new Date().toISOString().split('T')[0],
      b.floor || 'Ground Floor',
      agreedAmount,
      Number(b.totalPaid || 0),
      b.status || 'In Progress',
      b.notes || ''
    ]);

    await logAuditEvent(req, 'CREATE_SUBCONTRACT_AGREEMENT', 'subcontracts', id, { contractId, agreedAmount });

    res.status(201).json({
      id,
      contractId,
      projectId: b.projectId || pId,
      teamName: b.teamName,
      foremanName: b.foremanName,
      contractDate: b.contractDate,
      floor: b.floor,
      agreedAmount,
      totalPaid: Number(b.totalPaid || 0),
      status: b.status || 'In Progress',
      notes: b.notes
    });
  } catch (err) {
    console.error('Failed to create agreement:', err);
    res.status(500).json({ error: 'Failed to create agreement', detail: err.message });
  }
});

/**
 * PUT /api/subcontracts/agreements/:id
 * Update an agreement.
 */
router.put('/agreements/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['storekeeper'].includes(role)) {
    return res.status(403).json({ error: 'Storekeepers cannot modify subcontract agreements.' });
  }

  try {
    await pool.query(`
      UPDATE subcontract_agreements SET
        team_name = COALESCE(?, team_name),
        foreman_name = COALESCE(?, foreman_name),
        contract_date = COALESCE(?, contract_date),
        floor = COALESCE(?, floor),
        agreed_amount = COALESCE(?, agreed_amount),
        total_paid = COALESCE(?, total_paid),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      b.teamName,
      b.foremanName,
      b.contractDate,
      b.floor,
      b.agreedAmount !== undefined ? Number(b.agreedAmount) : null,
      b.totalPaid !== undefined ? Number(b.totalPaid) : null,
      b.status,
      b.notes,
      id
    ]);

    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to update agreement:', err);
    res.status(500).json({ error: 'Failed to update agreement', detail: err.message });
  }
});

/**
 * DELETE /api/subcontracts/agreements/:id
 */
router.delete('/agreements/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();
  if (!['admin', 'director', 'partner'].includes(role)) {
    return res.status(403).json({ error: 'Only directors, partners, or admins can delete agreements.' });
  }

  try {
    await pool.query('DELETE FROM subcontract_agreements WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete agreement:', err);
    res.status(500).json({ error: 'Failed to delete agreement', detail: err.message });
  }
});

/**
 * GET /api/subcontracts/payments
 * List payment certificates.
 */
router.get('/payments', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT sp.*, p.name as project_name, p.code as project_code 
      FROM subcontract_payments sp
      JOIN projects p ON sp.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE sp.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY sp.date DESC, sp.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      paymentRef: r.payment_ref,
      agreementId: r.agreement_id,
      projectId: r.project_id,
      projectName: r.project_name,
      teamName: r.team_name,
      floor: r.floor,
      weekPeriod: r.week_period,
      contractAmount: Number(r.contract_amount || 0),
      paidThisWeek: Number(r.paid_this_week || 0),
      cumulativePaid: Number(r.cumulative_paid || 0),
      remainingBalance: Number(r.remaining_balance || 0),
      date: r.date,
      notes: r.notes,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get payments:', err);
    res.status(500).json({ error: 'Failed to retrieve payments', detail: err.message });
  }
});

/**
 * POST /api/subcontracts/payments
 * Record a payment certificate.
 */
router.post('/payments', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const b = req.body;
  const role = (req.session?.user?.role || '').toLowerCase();

  if (['storekeeper'].includes(role)) {
    return res.status(403).json({ error: 'Storekeepers cannot record payments.' });
  }

  const id = b.id || `pay-${crypto.randomBytes(6).toString('hex')}`;
  const paymentRef = b.paymentRef || `PAY-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    await pool.query(`
      INSERT INTO subcontract_payments (
        id, payment_ref, agreement_id, project_id, team_name, floor,
        week_period, contract_amount, paid_this_week, cumulative_paid,
        remaining_balance, date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      paymentRef,
      b.agreementId || null,
      b.projectId || pId,
      b.teamName || '',
      b.floor || '',
      b.weekPeriod || '',
      Number(b.contractAmount || 0),
      Number(b.paidThisWeek || 0),
      Number(b.cumulativePaid || 0),
      Number(b.remainingBalance || 0),
      b.date || new Date().toISOString().split('T')[0],
      b.notes || ''
    ]);

    // If agreement_id was supplied, update agreement cumulative total_paid
    if (b.agreementId) {
      await pool.query(`
        UPDATE subcontract_agreements 
        SET total_paid = total_paid + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [Number(b.paidThisWeek || 0), b.agreementId]);
    }

    await logAuditEvent(req, 'RECORD_SUBCONTRACT_PAYMENT', 'subcontracts', id, { paymentRef, amount: b.paidThisWeek });

    res.status(201).json({
      id,
      paymentRef,
      agreementId: b.agreementId,
      projectId: b.projectId || pId,
      teamName: b.teamName,
      floor: b.floor,
      weekPeriod: b.weekPeriod,
      contractAmount: Number(b.contractAmount || 0),
      paidThisWeek: Number(b.paidThisWeek || 0),
      cumulativePaid: Number(b.cumulativePaid || 0),
      remainingBalance: Number(b.remainingBalance || 0),
      date: b.date,
      notes: b.notes
    });
  } catch (err) {
    console.error('Failed to record payment:', err);
    res.status(500).json({ error: 'Failed to record payment', detail: err.message });
  }
});

/**
 * DELETE /api/subcontracts/payments/:id
 */
router.delete('/payments/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();
  if (!['admin', 'director', 'partner'].includes(role)) {
    return res.status(403).json({ error: 'Only directors, partners, or admins can delete payments.' });
  }

  try {
    await pool.query('DELETE FROM subcontract_payments WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete payment:', err);
    res.status(500).json({ error: 'Failed to delete payment', detail: err.message });
  }
});

export default router;
