/**
 * NASAAB Construction — Materials Received Routes
 * 
 * Manages physical inward material deliveries received on site.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/materials-received
 * List inward deliveries.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT mr.*, p.name as project_name 
      FROM materials_received mr
      JOIN projects p ON mr.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE mr.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY mr.date DESC, mr.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => {
      let photosArr = [];
      try {
        if (r.photos) photosArr = JSON.parse(r.photos);
      } catch (e) {
        photosArr = [];
      }

      return {
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        deliveryNoteNo: r.delivery_note_no,
        date: r.date,
        itemName: r.item_name,
        supplier: r.supplier,
        quantity: r.quantity,
        totalCost: Number(r.total_cost || 0),
        receivedBy: r.received_by,
        status: r.status,
        description: r.description,
        photos: photosArr,
        createdAt: r.created_at
      };
    }));
  } catch (err) {
    console.error('Failed to get materials received:', err);
    res.status(500).json({ error: 'Failed to retrieve materials received records', detail: err.message });
  }
});

/**
 * POST /api/materials-received
 * Record single or batch inward delivery.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const body = req.body;
  const items = Array.isArray(body) ? body : (body.items ? body.items : [body]);

  try {
    const inserted = [];
    for (const item of items) {
      if (!item.itemName && !item.materialItem) continue;
      const id = item.id && !item.id.startsWith('temp-') ? item.id : `mr-${crypto.randomBytes(6).toString('hex')}`;
      const targetProjectId = item.projectId || pId;
      const deliveryNoteNo = item.deliveryNoteNo || `DN-${Math.floor(10000 + Math.random() * 90000)}`;
      const date = item.date || item.deliveryDate || new Date().toISOString().split('T')[0];
      const itemName = item.itemName || item.materialItem;
      const supplier = item.supplier || 'Site Delivery';
      const quantity = String(item.quantity || item.deliveredQuantity || '1 Unit');
      const totalCost = Number(item.totalCost || item.totalAmount || 0);
      const receivedBy = item.receivedBy || req.session?.user?.name || 'Storekeeper';
      const status = item.status || 'Verified & Stored';
      const description = item.description || '';
      const photos = item.photos || item.receiptPhotos || [];
      const photosStr = Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : null);

      await pool.query(`
        INSERT INTO materials_received (
          id, project_id, delivery_note_no, date, item_name, supplier,
          quantity, total_cost, received_by, status, description, photos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, targetProjectId, deliveryNoteNo, date, itemName, supplier,
        quantity, totalCost, receivedBy, status, description, photosStr
      ]);

      inserted.push({
        id,
        projectId: targetProjectId,
        deliveryNoteNo,
        date,
        itemName,
        supplier,
        quantity,
        totalCost,
        receivedBy,
        status,
        description,
        photos
      });
    }

    await logAuditEvent(req, 'RECORD_MATERIALS_RECEIVED', 'materials_received', pId, { count: inserted.length });
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Failed to save materials received:', err);
    res.status(500).json({ error: 'Failed to record received materials', detail: err.message });
  }
});

/**
 * DELETE /api/materials-received/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const role = (req.session?.user?.role || '').toLowerCase();
  if (['foreman'].includes(role)) {
    return res.status(403).json({ error: 'Foremen cannot delete material received records.' });
  }

  try {
    await pool.query('DELETE FROM materials_received WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete received material entry:', err);
    res.status(500).json({ error: 'Failed to delete entry', detail: err.message });
  }
});

export default router;
