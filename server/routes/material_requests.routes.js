/**
 * NASAAB Construction — Material Request (Material Needed) Forms Routes
 * 
 * Manages material needed requests and requisitions for construction projects:
 * - Master record: project_id, request_number, date_needed, urgency, status, requested_by_name,
 *   site_progress, materials_needed_tomorrow, site_photos, notes
 * - Child items: item_name, supplier_vendor, quantity, unit, estimated_unit_cost, delivery_notes, receipt_photos, notes
 * 
 * Access Control:
 * - Storekeeper, Partner, Director, Admin: Permitted (scoped to assigned project)
 * - Foreman: FORBIDDEN (403)
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, requireModule, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

// Apply session auth, module gate, and project access verification
router.use(requireAuth);
router.use(requireModule('materials'));

/**
 * Helper to safely parse JSON strings or return array
 */
const safeParseJson = (val, defaultVal = []) => {
  if (!val) return defaultVal;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
};

/**
 * GET /api/material-requests
 * List all Material Needed forms for the scoped project
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const projectId = req.authorizedProjectId;

  try {
    let query = `
      SELECT r.id, r.project_id, r.request_number, r.date_needed, r.urgency, r.status,
             r.created_by, r.requested_by_name, r.site_progress, r.materials_needed_tomorrow,
             r.site_photos, r.notes, r.created_at, r.updated_at,
             p.name AS project_name, p.code AS project_code,
             COUNT(i.id) AS total_items,
             COALESCE(SUM(i.quantity * i.estimated_unit_cost), 0) AS estimated_total_cost
      FROM material_request_forms r
      JOIN projects p ON r.project_id = p.id
      LEFT JOIN material_request_items i ON r.id = i.request_id
    `;
    const params = [];

    if (projectId && projectId !== 'all') {
      query += ' WHERE r.project_id = ?';
      params.push(projectId);
    }

    query += ' GROUP BY r.id, p.id, p.name, p.code ORDER BY r.date_needed DESC, r.created_at DESC';

    const [requests] = await pool.query(query, params);

    const formatted = requests.map(r => ({
      ...r,
      site_photos: safeParseJson(r.site_photos, [])
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to list material requests:', err);
    res.status(500).json({ error: 'Failed to retrieve material requests', detail: err.message });
  }
});

/**
 * GET /api/material-requests/:id
 * Retrieve a single request with its line items
 */
router.get('/:id', async (req, res) => {
  const requestId = req.params.id;

  try {
    const [rows] = await pool.query(`
      SELECT r.*, p.name AS project_name, p.code AS project_code, p.location AS project_location
      FROM material_request_forms r
      JOIN projects p ON r.project_id = p.id
      WHERE r.id = ?
    `, [requestId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material request not found' });
    }

    const request = rows[0];

    // Project authorization check for non-global users
    const userRole = (req.session.user.role || '').toLowerCase();
    if (!['admin', 'director'].includes(userRole)) {
      const [assignments] = await pool.query(
        'SELECT id FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
        [req.session.user.id, request.project_id]
      );
      if (assignments.length === 0) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this project.' });
      }
    }

    const [rawItems] = await pool.query(
      'SELECT * FROM material_request_items WHERE request_id = ? ORDER BY created_at ASC',
      [requestId]
    );

    const items = rawItems.map(item => ({
      ...item,
      receipt_photos: safeParseJson(item.receipt_photos, [])
    }));

    res.json({
      ...request,
      site_photos: safeParseJson(request.site_photos, []),
      items
    });

  } catch (err) {
    console.error('Failed to retrieve material request detail:', err);
    res.status(500).json({ error: 'Failed to retrieve material request', detail: err.message });
  }
});

/**
 * POST /api/material-requests
 * Create a new Material Needed request transactionally
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const {
    projectId,
    dateNeeded,
    logDate,
    urgency = 'normal',
    status = 'pending',
    siteProgress,
    materialsNeededTomorrow,
    sitePhotos = [],
    notes,
    items = []
  } = req.body;

  const targetProjectId = projectId || req.authorizedProjectId;
  const targetDate = dateNeeded || logDate;

  if (!targetProjectId || !targetDate) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Project ID and Date are required.'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const requestId = `mr-${crypto.randomBytes(8).toString('hex')}`;
    const requestNumber = `MRN-${Date.now().toString().slice(-6)}`;
    const createdBy = req.session.user.id;
    const requestedByName = req.session.user.name;

    // 1. Enforce only one Material Request form per day per project
    const todayStr = new Date().toISOString().split('T')[0];
    const [existingRequests] = await connection.query(`
      SELECT id, request_number, date_needed, requested_by_name, created_at
      FROM material_request_forms
      WHERE project_id = ? AND (date_needed = ? OR date_needed = ? OR DATE(created_at) = ?)
      LIMIT 1
    `, [targetProjectId, targetDate, todayStr, todayStr]);

    if (existingRequests.length > 0) {
      await connection.rollback();
      const existing = existingRequests[0];
      return res.status(400).json({
        error: 'Daily form already exists',
        message: `A Material Needed request (${existing.request_number}) has already been submitted for this project today by ${existing.requested_by_name}. Only one form per day is allowed. You can edit and update the existing form.`,
        existingRequest: {
          id: existing.id,
          requestNumber: existing.request_number,
          dateNeeded: existing.date_needed,
          requestedByName: existing.requested_by_name
        }
      });
    }

    // 2. Insert master record
    await connection.query(`
      INSERT INTO material_request_forms (
        id, project_id, request_number, date_needed, urgency, status, created_by, requested_by_name,
        site_progress, materials_needed_tomorrow, site_photos, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      requestId,
      targetProjectId,
      requestNumber,
      targetDate,
      urgency,
      status,
      createdBy,
      requestedByName,
      siteProgress || null,
      materialsNeededTomorrow || null,
      sitePhotos && sitePhotos.length > 0 ? JSON.stringify(sitePhotos) : null,
      notes || null
    ]);

    // 2. Insert line items
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemName = item.itemName || item.materialName || item.item_name;
        if (!itemName || !itemName.trim()) continue;

        const itemId = `mri-${crypto.randomBytes(6).toString('hex')}`;
        const supplierVendor = item.supplierVendor || item.supplier_vendor || null;
        const deliveryNotes = item.deliveryNotes || item.delivery_notes || item.notes || null;
        const receiptPhotos = item.receiptPhotos || item.receipt_photos || [];

        await connection.query(`
          INSERT INTO material_request_items (
            id, request_id, item_name, supplier_vendor, quantity, unit, estimated_unit_cost, delivery_notes, receipt_photos, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          requestId,
          itemName.trim(),
          supplierVendor ? supplierVendor.trim() : null,
          parseFloat(item.quantity) || 1.0,
          item.unit || 'delivery',
          parseFloat(item.estimatedUnitCost || item.estimated_unit_cost) || 0.0,
          deliveryNotes ? deliveryNotes.trim() : null,
          receiptPhotos && receiptPhotos.length > 0 ? JSON.stringify(receiptPhotos) : null,
          item.notes || null
        ]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'CREATE_MATERIAL_REQUEST', 'material_request', requestId, { requestNumber, projectId: targetProjectId });

    res.status(201).json({
      success: true,
      message: 'Material request submitted successfully.',
      request: { id: requestId, requestNumber, dateNeeded: targetDate, urgency, status }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to create material request:', err);
    res.status(500).json({ error: 'Failed to create material request', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/material-requests/:id
 * Edit an existing Material Needed request
 */
router.put('/:id', async (req, res) => {
  const requestId = req.params.id;
  const {
    projectId,
    dateNeeded,
    logDate,
    urgency,
    siteProgress,
    materialsNeededTomorrow,
    sitePhotos = [],
    notes,
    items = []
  } = req.body;

  const targetDate = dateNeeded || logDate;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check existing
    const [existing] = await connection.query('SELECT * FROM material_request_forms WHERE id = ?', [requestId]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Material request not found' });
    }

    const currentReq = existing[0];
    const userRole = (req.session.user.role || '').toLowerCase();
    const isOwner = currentReq.created_by === req.session.user.id;
    const isPrivileged = ['admin', 'director', 'partner'].includes(userRole);
    const isStorekeeper = userRole === 'storekeeper';

    if (!isPrivileged && !isOwner && !isStorekeeper) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to edit this request.' });
    }

    // Project access verification for storekeepers who did not create the request
    if (isStorekeeper && !isOwner) {
      const [assignments] = await pool.query(
        'SELECT id FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
        [req.session.user.id, currentReq.project_id]
      );
      if (assignments.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this project.' });
      }
    }

    // 24-hour edit restriction strictly for storekeepers
    if (isStorekeeper) {
      const createdAtMs = new Date(currentReq.created_at).getTime();
      const nowMs = Date.now();
      const hoursElapsed = (nowMs - createdAtMs) / (1000 * 60 * 60);

      if (hoursElapsed > 24) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Edit window expired',
          message: 'Storekeepers can only edit material requests within 24 hours of creation. This request was created more than 24 hours ago.'
        });
      }
    }

    // Check date collisions on edit
    if (targetDate && targetDate !== currentReq.date_needed) {
      const [duplicateRequests] = await connection.query(`
        SELECT id, request_number FROM material_request_forms
        WHERE project_id = ? AND date_needed = ? AND id != ?
        LIMIT 1
      `, [projectId || currentReq.project_id, targetDate, requestId]);

      if (duplicateRequests.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Duplicate date',
          message: `Another Material Needed request (${duplicateRequests[0].request_number}) already exists for this project on ${targetDate}.`
        });
      }
    }

    // 1. Update master record
    await connection.query(`
      UPDATE material_request_forms SET
        project_id = COALESCE(?, project_id),
        date_needed = COALESCE(?, date_needed),
        urgency = COALESCE(?, urgency),
        site_progress = ?,
        materials_needed_tomorrow = ?,
        site_photos = ?,
        notes = ?
      WHERE id = ?
    `, [
      projectId || currentReq.project_id,
      targetDate || currentReq.date_needed,
      urgency || currentReq.urgency,
      siteProgress !== undefined ? siteProgress : currentReq.site_progress,
      materialsNeededTomorrow !== undefined ? materialsNeededTomorrow : currentReq.materials_needed_tomorrow,
      sitePhotos && sitePhotos.length > 0 ? JSON.stringify(sitePhotos) : (Array.isArray(sitePhotos) ? null : currentReq.site_photos),
      notes !== undefined ? notes : currentReq.notes,
      requestId
    ]);

    // 2. Replace items if provided
    if (Array.isArray(items)) {
      await connection.query('DELETE FROM material_request_items WHERE request_id = ?', [requestId]);

      for (const item of items) {
        const itemName = item.itemName || item.materialName || item.item_name;
        if (!itemName || !itemName.trim()) continue;

        const itemId = `mri-${crypto.randomBytes(6).toString('hex')}`;
        const supplierVendor = item.supplierVendor || item.supplier_vendor || null;
        const deliveryNotes = item.deliveryNotes || item.delivery_notes || item.notes || null;
        const receiptPhotos = item.receiptPhotos || item.receipt_photos || [];

        await connection.query(`
          INSERT INTO material_request_items (
            id, request_id, item_name, supplier_vendor, quantity, unit, estimated_unit_cost, delivery_notes, receipt_photos, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          requestId,
          itemName.trim(),
          supplierVendor ? supplierVendor.trim() : null,
          parseFloat(item.quantity) || 1.0,
          item.unit || 'delivery',
          parseFloat(item.estimatedUnitCost || item.estimated_unit_cost) || 0.0,
          deliveryNotes ? deliveryNotes.trim() : null,
          receiptPhotos && receiptPhotos.length > 0 ? JSON.stringify(receiptPhotos) : null,
          item.notes || null
        ]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'UPDATE_MATERIAL_REQUEST', 'material_request', requestId, { requestNumber: currentReq.request_number });

    res.json({
      success: true,
      message: 'Material request updated successfully.'
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to update material request:', err);
    res.status(500).json({ error: 'Failed to update material request', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/material-requests/:id/status
 * Update status (approve, reject, fulfill) — Admin, Director, Partner
 */
router.put('/:id/status', async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;
  const userRole = (req.session.user.role || '').toLowerCase();

  if (userRole === 'storekeeper') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Storekeepers cannot approve or reject material requests. Please contact an Administrator or Partner.'
    });
  }

  if (!['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE material_request_forms SET status = ? WHERE id = ?',
      [status, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material request not found' });
    }

    await logAuditEvent(req, 'UPDATE_MATERIAL_REQUEST_STATUS', 'material_request', requestId, { newStatus: status });
    res.json({ success: true, message: `Status updated to ${status}.` });

  } catch (err) {
    console.error('Failed to update material request status:', err);
    res.status(500).json({ error: 'Failed to update status', detail: err.message });
  }
});

/**
 * DELETE /api/material-requests/:id
 */
router.delete('/:id', async (req, res) => {
  const requestId = req.params.id;
  const userRole = (req.session.user.role || '').toLowerCase();

  if (['storekeeper', 'foreman'].includes(userRole)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You are not authorized to delete material requests.'
    });
  }

  try {
    const [result] = await pool.query('DELETE FROM material_request_forms WHERE id = ?', [requestId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material request not found' });
    }

    await logAuditEvent(req, 'DELETE_MATERIAL_REQUEST', 'material_request', requestId);
    res.json({ success: true, message: 'Material request deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete material request:', err);
    res.status(500).json({ error: 'Failed to delete request', detail: err.message });
  }
});

export default router;
