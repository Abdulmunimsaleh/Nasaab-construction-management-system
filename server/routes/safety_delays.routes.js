/**
 * NASAAB Construction — Safety & Delays Routes
 * 
 * Manages weather stoppages, delays, site incidents, and visitor records.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/safety-delays
 * List safety incidents, delays, and visitors.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT sd.*, p.name as project_name 
      FROM safety_and_delays sd
      JOIN projects p ON sd.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE sd.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY sd.date DESC, sd.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      category: r.category,
      title: r.title,
      cause: r.cause,
      severity: r.severity,
      durationHours: Number(r.duration_hours || 0),
      description: r.description,
      actionTaken: r.action_taken,
      totalAmount: Number(r.total_amount || 0),
      visitorName: r.visitor_name,
      visitorOrg: r.visitor_org,
      purpose: r.purpose,
      photos: r.photos ? (typeof r.photos === 'string' ? JSON.parse(r.photos).catch?.(() => []) || (r.photos.startsWith('[') ? JSON.parse(r.photos) : [r.photos]) : r.photos) : [],
      date: r.date,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Failed to get safety/delays:', err);
    res.status(500).json({ error: 'Failed to retrieve safety & delays records', detail: err.message });
  }
});

/**
 * POST /api/safety-delays
 * Add record.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const b = req.body;
  const id = b.id && !b.id.startsWith('temp-') ? b.id : `sd-${crypto.randomBytes(6).toString('hex')}`;
  const targetProjectId = b.projectId || pId;

  try {
    let photosStr = null;
    if (b.photos && Array.isArray(b.photos)) {
      photosStr = JSON.stringify(b.photos);
    } else if (typeof b.photos === 'string') {
      photosStr = b.photos;
    }

    await pool.query(`
      INSERT INTO safety_and_delays (
        id, project_id, category, title, cause, severity, duration_hours,
        description, action_taken, total_amount, visitor_name, visitor_org,
        purpose, photos, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      targetProjectId,
      b.category || 'delay',
      b.title || 'Incident / Event',
      b.cause || null,
      b.severity || 'Medium',
      Number(b.durationHours || 0),
      b.description || '',
      b.actionTaken || '',
      Number(b.totalAmount || 0),
      b.visitorName || null,
      b.visitorOrg || null,
      b.purpose || null,
      photosStr,
      b.date || new Date().toISOString().split('T')[0]
    ]);

    await logAuditEvent(req, 'RECORD_SAFETY_DELAY', 'safety_delays', id, { category: b.category, title: b.title });

    res.status(201).json({
      id,
      projectId: targetProjectId,
      category: b.category,
      title: b.title,
      cause: b.cause,
      severity: b.severity,
      durationHours: Number(b.durationHours || 0),
      description: b.description,
      actionTaken: b.actionTaken,
      totalAmount: Number(b.totalAmount || 0),
      visitorName: b.visitorName,
      visitorOrg: b.visitorOrg,
      purpose: b.purpose,
      photos: b.photos || [],
      date: b.date || new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Failed to create safety/delay entry:', err);
    res.status(500).json({ error: 'Failed to record safety/delay entry', detail: err.message });
  }
});

/**
 * PUT /api/safety-delays/:id
 * Update an existing record.
 */
router.put('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  const b = req.body;

  try {
    let photosStr = null;
    if (b.photos && Array.isArray(b.photos)) {
      photosStr = JSON.stringify(b.photos);
    } else if (typeof b.photos === 'string') {
      photosStr = b.photos;
    }

    await pool.query(`
      UPDATE safety_and_delays SET
        category = ?, title = ?, cause = ?, severity = ?, duration_hours = ?,
        description = ?, action_taken = ?, total_amount = ?, visitor_name = ?,
        visitor_org = ?, purpose = ?, photos = ?, date = ?
      WHERE id = ?
    `, [
      b.category || 'delay',
      b.title || 'Incident / Event',
      b.cause || null,
      b.severity || 'Medium',
      Number(b.durationHours || 0),
      b.description || '',
      b.actionTaken || '',
      Number(b.totalAmount || 0),
      b.visitorName || null,
      b.visitorOrg || null,
      b.purpose || null,
      photosStr,
      b.date || new Date().toISOString().split('T')[0],
      id
    ]);

    await logAuditEvent(req, 'UPDATE_SAFETY_DELAY', 'safety_delays', id, { category: b.category, title: b.title });

    res.json({
      id,
      category: b.category,
      title: b.title,
      cause: b.cause,
      severity: b.severity,
      durationHours: Number(b.durationHours || 0),
      description: b.description,
      actionTaken: b.actionTaken,
      totalAmount: Number(b.totalAmount || 0),
      visitorName: b.visitorName,
      visitorOrg: b.visitorOrg,
      purpose: b.purpose,
      photos: b.photos || [],
      date: b.date || new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Failed to update safety/delay entry:', err);
    res.status(500).json({ error: 'Failed to update record', detail: err.message });
  }
});

/**
 * DELETE /api/safety-delays/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM safety_and_delays WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete safety/delay:', err);
    res.status(500).json({ error: 'Failed to delete record', detail: err.message });
  }
});

export default router;
