/**
 * NASAAB Construction — Material Expenses Routes
 * 
 * Manages paid material expenses and invoices ledger.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/material-expenses
 * List material expenses.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT me.*, p.name as project_name 
      FROM material_expenses me
      JOIN projects p ON me.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE me.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY me.date DESC, me.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      expenseId: r.expense_id,
      projectId: r.project_id,
      projectName: r.project_name,
      date: r.date,
      description: r.description,
      supplier: r.supplier,
      quantity: r.quantity,
      amount: Number(r.amount || 0),
      category: r.category,
      invoiceRef: r.invoice_ref,
      status: r.status,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get material expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve material expenses', detail: err.message });
  }
});

/**
 * POST /api/material-expenses
 * Record single or batch material expense.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const body = req.body;
  const items = Array.isArray(body) ? body : (body.expenses ? body.expenses : [body]);

  try {
    const inserted = [];
    for (const exp of items) {
      if (!exp.amount && Number(exp.amount) <= 0) continue;
      const id = exp.id && !exp.id.startsWith('temp-') ? exp.id : `me-${crypto.randomBytes(6).toString('hex')}`;
      const expenseId = exp.expenseId || `EXP-${Math.floor(100 + Math.random() * 900)}`;
      const targetProjectId = exp.projectId || pId;
      const date = exp.date || new Date().toISOString().split('T')[0];
      const description = exp.description || 'Material Purchase';
      const supplier = exp.supplier || 'Site Supplier';
      const quantity = String(exp.quantity || '1 Unit');
      const amount = Number(exp.amount || 0);
      const category = exp.category || 'General Materials';
      const invoiceRef = exp.invoiceRef || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const status = exp.status || 'Verified';

      await pool.query(`
        INSERT INTO material_expenses (
          id, expense_id, project_id, date, description, supplier,
          quantity, amount, category, invoice_ref, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, expenseId, targetProjectId, date, description, supplier,
        quantity, amount, category, invoiceRef, status
      ]);

      inserted.push({
        id,
        expenseId,
        projectId: targetProjectId,
        date,
        description,
        supplier,
        quantity,
        amount,
        category,
        invoiceRef,
        status
      });
    }

    await logAuditEvent(req, 'RECORD_MATERIAL_EXPENSES', 'material_expenses', pId, { count: inserted.length });
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Failed to save material expenses:', err);
    res.status(500).json({ error: 'Failed to record material expenses', detail: err.message });
  }
});

/**
 * PUT /api/material-expenses/:id
 */
router.put('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    await pool.query(`
      UPDATE material_expenses SET
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        supplier = COALESCE(?, supplier),
        quantity = COALESCE(?, quantity),
        amount = COALESCE(?, amount),
        category = COALESCE(?, category),
        invoice_ref = COALESCE(?, invoice_ref),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      b.date,
      b.description,
      b.supplier,
      b.quantity ? String(b.quantity) : null,
      b.amount !== undefined ? Number(b.amount) : null,
      b.category,
      b.invoiceRef,
      b.status,
      id
    ]);

    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to update material expense:', err);
    res.status(500).json({ error: 'Failed to update expense', detail: err.message });
  }
});

/**
 * DELETE /api/material-expenses/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();
  if (['storekeeper', 'foreman'].includes(role)) {
    return res.status(403).json({ error: 'Only directors, partners, or admins can delete material expenses.' });
  }

  try {
    await pool.query('DELETE FROM material_expenses WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete material expense:', err);
    res.status(500).json({ error: 'Failed to delete expense', detail: err.message });
  }
});

export default router;
