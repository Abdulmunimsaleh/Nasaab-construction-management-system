/**
 * NASAAB Construction — Site Progress Routes
 * 
 * Manages site activities, progress tracking, and custom categories.
 * Accessible to ALL roles: Admin, Director, Partner, Foreman, and Storekeeper.
 * Backed by PostgreSQL.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/site-progress
 * List custom progress activities.
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  try {
    let query = `
      SELECT ca.*, p.name as project_name 
      FROM custom_site_activities ca
      JOIN projects p ON ca.project_id = p.id
    `;
    const params = [];
    if (pId && pId !== 'all') {
      query += ' WHERE ca.project_id = ?';
      params.push(pId);
    }
    query += ' ORDER BY ca.date DESC, ca.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows.map(r => {
      let addCats = [];
      try {
        if (r.additional_categories) {
          addCats = JSON.parse(r.additional_categories);
        }
      } catch (e) {
        addCats = [];
      }

      let photosArr = [];
      try {
        if (r.photos) {
          photosArr = JSON.parse(r.photos);
        }
      } catch (e) {
        photosArr = [];
      }

      return {
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        category: r.category,
        additionalCategories: addCats,
        description: r.description,
        zone: r.zone,
        status: r.status,
        progress: Number(r.progress || 0),
        workDoneToday: r.work_done_today,
        remarks: r.remarks,
        source: r.source,
        photos: photosArr,
        date: r.date,
        createdAt: r.created_at
      };
    }));
  } catch (err) {
    console.error('Failed to get site progress activities:', err);
    res.status(500).json({ error: 'Failed to retrieve site progress', detail: err.message });
  }
});

/**
 * POST /api/site-progress
 * Add one or multiple site progress activities.
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const pId = req.authorizedProjectId;
  const body = req.body;
  const items = Array.isArray(body) ? body : (body.activities ? body.activities : [body]);

  try {
    const inserted = [];
    for (const act of items) {
      if (!act.category && !act.description) continue;
      const id = act.id && !act.id.startsWith('temp-') && !act.id.startsWith('entry-') ? act.id : `act-${crypto.randomBytes(6).toString('hex')}`;
      const targetProjectId = act.projectId || pId;
      const cat = act.category || 'General';
      const addCatsStr = act.additionalCategories ? JSON.stringify(act.additionalCategories) : null;
      const desc = act.description || act.descriptionDetails || `${cat} Site Works`;
      const zone = act.zone || 'Ground Floor';
      const status = act.status || 'in_progress';
      const progress = Number(act.progress || 0);
      const workDoneToday = act.workDoneToday || '';
      const remarks = act.remarks || '';
      const source = act.source || 'Site Log';
      const photosStr = act.photos ? JSON.stringify(act.photos) : null;
      const date = act.date || new Date().toISOString().split('T')[0];

      await pool.query(`
        INSERT INTO custom_site_activities (
          id, project_id, category, additional_categories, description,
          zone, status, progress, work_done_today, remarks, source, photos, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, targetProjectId, cat, addCatsStr, desc, zone,
        status, progress, workDoneToday, remarks, source, photosStr, date
      ]);

      inserted.push({
        id,
        projectId: targetProjectId,
        category: cat,
        additionalCategories: act.additionalCategories || [],
        description: desc,
        zone,
        status,
        progress,
        workDoneToday,
        remarks,
        source,
        photos: act.photos || [],
        date
      });
    }

    await logAuditEvent(req, 'RECORD_SITE_PROGRESS', 'site_progress', pId, { count: inserted.length });
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Failed to record site progress:', err);
    res.status(500).json({ error: 'Failed to record site progress', detail: err.message });
  }
});

/**
 * DELETE /api/site-progress/:id
 */
router.delete('/:id', requireProjectAccess, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM custom_site_activities WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete site progress entry:', err);
    res.status(500).json({ error: 'Failed to delete entry', detail: err.message });
  }
});

/**
 * GET /api/site-progress/categories
 * List custom progress categories.
 */
router.get('/categories', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM custom_progress_categories ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (err) {
    console.error('Failed to get categories:', err);
    res.status(500).json({ error: 'Failed to retrieve categories', detail: err.message });
  }
});

/**
 * POST /api/site-progress/categories
 * Add custom category.
 */
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  const catName = name.trim();
  const id = `cat-${crypto.randomBytes(4).toString('hex')}`;

  try {
    await pool.query(`
      INSERT INTO custom_progress_categories (id, name)
      VALUES (?, ?)
      ON CONFLICT (name) DO NOTHING
    `, [id, catName]);

    res.status(201).json({ id, name: catName });
  } catch (err) {
    console.error('Failed to add category:', err);
    res.status(500).json({ error: 'Failed to add category', detail: err.message });
  }
});

export default router;
