/**
 * NASAAB Construction — Labour, Activity and Equipment Forms Routes
 * 
 * Manages daily site diary records:
 * - Master record: project_id, date, form_number, prepared_by, weather, estimated_site_progress,
 *   delays_issues_incidents, site_visitors, site_photos, general_notes, status
 * - Labour items: trade, foreman_count, skilled_count, unskilled_count, foreman_rate, skilled_rate, unskilled_rate,
 *   work_done_today, work_plan_tomorrow, total_cost, number_of_workers
 * - Equipment items: equipment_name, fuel_cost, operator_cost, repair_cost, mechanic_cost, transport_cost,
 *   total_expense, machine_notes, operating_status
 * 
 * Rates rule:
 * - Fixed rates: Foreman = 1500, Skilled = 1000, Unskilled/Helper = 500
 * - Foremen CANNOT modify rates (forced to 1500, 1000, 500).
 * - Admin, Director, Partner can view and adjust rates if necessary.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, requireModule, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

// Apply session auth, module gate, and project access verification to all routes
router.use(requireAuth);
router.use(requireModule('lae_forms'));

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
 * GET /api/lae-forms
 * List all Labour, Activity and Equipment forms for the scoped project
 */
router.get('/', requireProjectAccess, async (req, res) => {
  const projectId = req.authorizedProjectId;

  try {
    let query = `
      SELECT f.id, f.project_id, f.date, f.form_number, f.prepared_by_id, f.prepared_by_name,
             f.weather, f.estimated_site_progress, f.delays_issues_incidents, f.site_visitors,
             f.site_photos, f.general_notes, f.status, f.created_at, f.updated_at,
             p.name AS project_name, p.code AS project_code,
             COALESCE(SUM(l.foreman_count + l.skilled_count + l.unskilled_count), 0) AS total_headcount,
             COALESCE(SUM(l.total_cost), 0) AS total_labour_cost,
             COALESCE(COUNT(DISTINCT eq.id), 0) AS equipment_count
      FROM labour_activity_equipment_forms f
      JOIN projects p ON f.project_id = p.id
      LEFT JOIN lae_form_labour_items l ON f.id = l.form_id
      LEFT JOIN lae_form_equipment_items eq ON f.id = eq.form_id
    `;
    const params = [];

    if (projectId && projectId !== 'all') {
      query += ' WHERE f.project_id = ?';
      params.push(projectId);
    }

    query += ' GROUP BY f.id, p.id, p.name, p.code ORDER BY f.date DESC, f.created_at DESC';

    const [forms] = await pool.query(query, params);

    let equipByForm = {};
    let actByForm = {};
    if (forms.length > 0) {
      const formIds = forms.map(f => f.id);
      const [equipRows] = await pool.query(
        'SELECT * FROM lae_form_equipment_items WHERE form_id IN (?) ORDER BY created_at ASC',
        [formIds]
      );
      for (const eq of equipRows) {
        if (!equipByForm[eq.form_id]) equipByForm[eq.form_id] = [];
        equipByForm[eq.form_id].push(eq);
      }

      const [actRows] = await pool.query(
        'SELECT * FROM lae_form_activity_items WHERE form_id IN (?) ORDER BY created_at ASC',
        [formIds]
      );
      for (const act of actRows) {
        if (!actByForm[act.form_id]) actByForm[act.form_id] = [];
        actByForm[act.form_id].push(act);
      }
    }

    const formatted = forms.map(f => ({
      ...f,
      site_photos: safeParseJson(f.site_photos, []),
      equipmentItems: equipByForm[f.id] || [],
      activityItems: actByForm[f.id] || []
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to list LAE forms:', err);
    res.status(500).json({ error: 'Failed to retrieve forms', detail: err.message });
  }
});

/**
 * GET /api/lae-forms/:id
 * Retrieve a single form with all its labour, activity, and equipment items
 */
router.get('/:id', async (req, res) => {
  const formId = req.params.id;

  try {
    const [forms] = await pool.query(`
      SELECT f.*, p.name AS project_name, p.code AS project_code, p.location AS project_location
      FROM labour_activity_equipment_forms f
      JOIN projects p ON f.project_id = p.id
      WHERE f.id = ?
    `, [formId]);

    if (forms.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = forms[0];

    // Check project authorization for non-global users
    const userRole = (req.session.user.role || '').toLowerCase();
    if (!['admin', 'director'].includes(userRole)) {
      const [assignments] = await pool.query(
        'SELECT id FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
        [req.session.user.id, form.project_id]
      );
      if (assignments.length === 0) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this project.' });
      }
    }

    // Fetch child items in parallel
    const [labourItems] = await pool.query(
      'SELECT * FROM lae_form_labour_items WHERE form_id = ? ORDER BY created_at ASC',
      [formId]
    );

    const [activityItems] = await pool.query(
      'SELECT * FROM lae_form_activity_items WHERE form_id = ? ORDER BY created_at ASC',
      [formId]
    );

    const [equipmentItems] = await pool.query(
      'SELECT * FROM lae_form_equipment_items WHERE form_id = ? ORDER BY created_at ASC',
      [formId]
    );

    res.json({
      ...form,
      site_photos: safeParseJson(form.site_photos, []),
      labourItems,
      activityItems,
      equipmentItems
    });

  } catch (err) {
    console.error('Failed to retrieve LAE form detail:', err);
    res.status(500).json({ error: 'Failed to retrieve form details', detail: err.message });
  }
});

/**
 * POST /api/lae-forms
 * Create a new Labour, Activity and Equipment form transactionally
 */
router.post('/', requireProjectAccess, async (req, res) => {
  const {
    projectId,
    date,
    reportDate,
    weather,
    estimatedSiteProgress = 0,
    delaysIssuesIncidents,
    siteVisitors,
    sitePhotos = [],
    generalNotes,
    status = 'submitted',
    labourItems = [],
    activityItems = [],
    equipmentItems = []
  } = req.body;

  const targetProjectId = projectId || req.authorizedProjectId;
  const targetDate = date || reportDate;

  if (!targetProjectId || !targetDate) {
    return res.status(400).json({
      error: 'Missing fields',
      message: 'Project ID and Date are required.'
    });
  }

  const userRole = (req.session.user.role || '').toLowerCase();
  const canEditRates = ['admin', 'director', 'partner'].includes(userRole);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const formId = `lae-${crypto.randomBytes(8).toString('hex')}`;
    const formNumber = `LAE-${Date.now().toString().slice(-6)}`;
    const preparedByName = req.session.user.name;
    const preparedById = req.session.user.id;
    // 1. Enforce only one LAE form per day per project
    const todayStr = new Date().toISOString().split('T')[0];
    const [existingForms] = await connection.query(`
      SELECT id, form_number, date, prepared_by_name, created_at
      FROM labour_activity_equipment_forms
      WHERE project_id = ? AND (date = ? OR date = ? OR DATE(created_at) = ?)
      LIMIT 1
    `, [targetProjectId, targetDate, todayStr, todayStr]);

    if (existingForms.length > 0) {
      await connection.rollback();
      const existing = existingForms[0];
      return res.status(400).json({
        error: 'Daily form already exists',
        message: `A Labour, Activity & Equipment form (${existing.form_number}) has already been submitted for this project today by ${existing.prepared_by_name}. Only one form per day is allowed. You can edit and update the existing form.`,
        existingForm: {
          id: existing.id,
          formNumber: existing.form_number,
          date: existing.date,
          preparedByName: existing.prepared_by_name
        }
      });
    }

    // 2. Insert master form
    await connection.query(`
      INSERT INTO labour_activity_equipment_forms (
        id, project_id, date, form_number, prepared_by_id, prepared_by_name, weather,
        estimated_site_progress, delays_issues_incidents, site_visitors, site_photos,
        general_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      formId,
      targetProjectId,
      targetDate,
      formNumber,
      preparedById,
      preparedByName,
      weather || 'Clear / Sunny',
      parseInt(estimatedSiteProgress, 10) || 0,
      delaysIssuesIncidents || null,
      siteVisitors || null,
      sitePhotos && sitePhotos.length > 0 ? JSON.stringify(sitePhotos) : null,
      generalNotes || null,
      status
    ]);

    // 2. Insert labour items
    if (Array.isArray(labourItems) && labourItems.length > 0) {
      for (const item of labourItems) {
        if (!item.trade) continue;

        const fCount = parseInt(item.foremanCount, 10) || 0;
        const sCount = parseInt(item.skilledCount, 10) || 0;
        const uCount = parseInt(item.unskilledCount, 10) || 0;

        // FIXED RATES RULE:
        // Foreman = 1500, Skilled = 1000, Unskilled = 500
        // Foremen can NEVER change rates; Admin/Director/Partner can view/edit
        const fRate = canEditRates ? (parseFloat(item.foremanRate) || 1500.00) : 1500.00;
        const sRate = canEditRates ? (parseFloat(item.skilledRate) || 1000.00) : 1000.00;
        const uRate = canEditRates ? (parseFloat(item.unskilledRate) || 500.00) : 500.00;

        const totalCost = (fCount * fRate) + (sCount * sRate) + (uCount * uRate);
        const totalHeadcount = fCount + sCount + uCount;

        const itemId = `li-${crypto.randomBytes(6).toString('hex')}`;
        await connection.query(`
          INSERT INTO lae_form_labour_items (
            id, form_id, trade, foreman_count, skilled_count, unskilled_count,
            foreman_rate, skilled_rate, unskilled_rate, work_done_today, work_plan_tomorrow,
            total_cost, number_of_workers, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          formId,
          item.trade.trim(),
          fCount,
          sCount,
          uCount,
          fRate,
          sRate,
          uRate,
          item.workDoneToday || null,
          item.workPlanTomorrow || null,
          totalCost,
          totalHeadcount || 1,
          item.workDoneToday || item.notes || null
        ]);
      }
    }

    // 3. Insert equipment items
    if (Array.isArray(equipmentItems) && equipmentItems.length > 0) {
      for (const eq of equipmentItems) {
        if (!eq.equipmentName) continue;

        const fuel = parseFloat(eq.fuelCost) || 0.0;
        const operator = parseFloat(eq.operatorCost) || 0.0;
        const repair = parseFloat(eq.repairCost) || 0.0;
        const mechanic = parseFloat(eq.mechanicCost) || 0.0;
        const transport = parseFloat(eq.transportCost) || 0.0;
        const totalExpense = fuel + operator + repair + mechanic + transport;

        const eqId = `ei-${crypto.randomBytes(6).toString('hex')}`;
        await connection.query(`
          INSERT INTO lae_form_equipment_items (
            id, form_id, equipment_name, fuel_cost, operator_cost, repair_cost,
            mechanic_cost, transport_cost, total_expense, machine_notes, operating_status,
            quantity, status, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          eqId,
          formId,
          eq.equipmentName.trim(),
          fuel,
          operator,
          repair,
          mechanic,
          transport,
          totalExpense,
          eq.machineNotes || null,
          eq.operatingStatus || 'Active',
          1,
          eq.operatingStatus ? eq.operatingStatus.toLowerCase() : 'operational',
          eq.machineNotes || eq.remarks || null
        ]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'CREATE_LAE_FORM', 'lae_form', formId, { formNumber, projectId: targetProjectId });

    res.status(201).json({
      success: true,
      message: 'Labour, Activity and Equipment form saved successfully.',
      form: { id: formId, formNumber, date: targetDate, status }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to create LAE form:', err);
    res.status(500).json({ error: 'Failed to create form', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/lae-forms/:id
 * Edit an existing Labour, Activity and Equipment form
 */
router.put('/:id', async (req, res) => {
  const formId = req.params.id;
  const {
    projectId,
    date,
    reportDate,
    weather,
    estimatedSiteProgress,
    delaysIssuesIncidents,
    siteVisitors,
    sitePhotos = [],
    generalNotes,
    status,
    labourItems = [],
    equipmentItems = []
  } = req.body;

  const targetDate = date || reportDate;
  const userRole = (req.session.user.role || '').toLowerCase();
  const isForeman = userRole === 'foreman';
  const isPrivileged = ['admin', 'director', 'partner'].includes(userRole);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM labour_activity_equipment_forms WHERE id = ?', [formId]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Form not found' });
    }

    const currentForm = existing[0];
    const isOwner = currentForm.prepared_by_id === req.session.user.id;

    if (!isPrivileged && !isOwner && !isForeman) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to edit this form.' });
    }

    // Project access verification for foremen
    if (isForeman && !isOwner) {
      const [assignments] = await pool.query(
        'SELECT id FROM project_user_assignments WHERE user_id = ? AND project_id = ?',
        [req.session.user.id, currentForm.project_id]
      );
      if (assignments.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this project.' });
      }
    }

    // 24-hour edit restriction strictly for foremen
    if (isForeman) {
      const createdAtMs = new Date(currentForm.created_at).getTime();
      const nowMs = Date.now();
      const hoursElapsed = (nowMs - createdAtMs) / (1000 * 60 * 60);

      if (hoursElapsed > 24) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Edit window expired',
          message: 'Foremen can only edit labour reports within 24 hours of submission. This report was submitted more than 24 hours ago.'
        });
      }
    }

    if (targetDate && targetDate !== currentForm.date) {
      const [duplicateForms] = await connection.query(`
        SELECT id, form_number FROM labour_activity_equipment_forms
        WHERE project_id = ? AND date = ? AND id != ?
        LIMIT 1
      `, [projectId || currentForm.project_id, targetDate, formId]);

      if (duplicateForms.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Duplicate date',
          message: `Another Labour, Activity & Equipment form (${duplicateForms[0].form_number}) already exists for this project on ${targetDate}.`
        });
      }
    }

    // 1. Update master form
    await connection.query(`
      UPDATE labour_activity_equipment_forms SET
        project_id = COALESCE(?, project_id),
        date = COALESCE(?, date),
        weather = COALESCE(?, weather),
        estimated_site_progress = COALESCE(?, estimated_site_progress),
        delays_issues_incidents = ?,
        site_visitors = ?,
        site_photos = ?,
        general_notes = ?,
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      projectId || currentForm.project_id,
      targetDate || currentForm.date,
      weather || currentForm.weather,
      estimatedSiteProgress !== undefined ? parseInt(estimatedSiteProgress, 10) : currentForm.estimated_site_progress,
      delaysIssuesIncidents !== undefined ? delaysIssuesIncidents : currentForm.delays_issues_incidents,
      siteVisitors !== undefined ? siteVisitors : currentForm.site_visitors,
      sitePhotos && sitePhotos.length > 0 ? JSON.stringify(sitePhotos) : (Array.isArray(sitePhotos) ? null : currentForm.site_photos),
      generalNotes !== undefined ? generalNotes : currentForm.general_notes,
      status || currentForm.status,
      formId
    ]);

    // 2. Replace labour items if provided
    if (Array.isArray(labourItems)) {
      await connection.query('DELETE FROM lae_form_labour_items WHERE form_id = ?', [formId]);

      for (const item of labourItems) {
        if (!item.trade) continue;

        const fCount = parseInt(item.foremanCount, 10) || 0;
        const sCount = parseInt(item.skilledCount, 10) || 0;
        const uCount = parseInt(item.unskilledCount, 10) || 0;

        const fRate = isPrivileged ? (parseFloat(item.foremanRate) || 1500.00) : 1500.00;
        const sRate = isPrivileged ? (parseFloat(item.skilledRate) || 1000.00) : 1000.00;
        const uRate = isPrivileged ? (parseFloat(item.unskilledRate) || 500.00) : 500.00;

        const totalCost = (fCount * fRate) + (sCount * sRate) + (uCount * uRate);
        const totalHeadcount = fCount + sCount + uCount;

        const itemId = `li-${crypto.randomBytes(6).toString('hex')}`;
        await connection.query(`
          INSERT INTO lae_form_labour_items (
            id, form_id, trade, foreman_count, skilled_count, unskilled_count,
            foreman_rate, skilled_rate, unskilled_rate, work_done_today, work_plan_tomorrow,
            total_cost, number_of_workers, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          formId,
          item.trade.trim(),
          fCount,
          sCount,
          uCount,
          fRate,
          sRate,
          uRate,
          item.workDoneToday || null,
          item.workPlanTomorrow || null,
          totalCost,
          totalHeadcount || 1,
          item.workDoneToday || item.notes || null
        ]);
      }
    }

    // 3. Replace equipment items if provided
    if (Array.isArray(equipmentItems)) {
      await connection.query('DELETE FROM lae_form_equipment_items WHERE form_id = ?', [formId]);

      for (const eq of equipmentItems) {
        if (!eq.equipmentName) continue;

        const fuel = parseFloat(eq.fuelCost) || 0.0;
        const operator = parseFloat(eq.operatorCost) || 0.0;
        const repair = parseFloat(eq.repairCost) || 0.0;
        const mechanic = parseFloat(eq.mechanicCost) || 0.0;
        const transport = parseFloat(eq.transportCost) || 0.0;
        const totalExpense = fuel + operator + repair + mechanic + transport;

        const eqId = `ei-${crypto.randomBytes(6).toString('hex')}`;
        await connection.query(`
          INSERT INTO lae_form_equipment_items (
            id, form_id, equipment_name, fuel_cost, operator_cost, repair_cost,
            mechanic_cost, transport_cost, total_expense, machine_notes, operating_status,
            quantity, status, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          eqId,
          formId,
          eq.equipmentName.trim(),
          fuel,
          operator,
          repair,
          mechanic,
          transport,
          totalExpense,
          eq.machineNotes || null,
          eq.operatingStatus || 'Active',
          1,
          eq.operatingStatus ? eq.operatingStatus.toLowerCase() : 'operational',
          eq.machineNotes || eq.remarks || null
        ]);
      }
    }

    await connection.commit();
    await logAuditEvent(req, 'UPDATE_LAE_FORM', 'lae_form', formId, { formNumber: currentForm.form_number });

    res.json({
      success: true,
      message: 'Labour, Activity and Equipment form updated successfully.'
    });

  } catch (err) {
    await connection.rollback();
    console.error('Failed to update LAE form:', err);
    res.status(500).json({ error: 'Failed to update form', detail: err.message });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/lae-forms/:id
 * Only Admin, Director, or Partner
 */
router.delete('/:id', async (req, res) => {
  const formId = req.params.id;
  const userRole = (req.session.user.role || '').toLowerCase();

  if (userRole === 'foreman') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Foremen cannot delete submitted forms. Please contact an Administrator.'
    });
  }

  try {
    const [result] = await pool.query('DELETE FROM labour_activity_equipment_forms WHERE id = ?', [formId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await logAuditEvent(req, 'DELETE_LAE_FORM', 'lae_form', formId);
    res.json({ success: true, message: 'Form deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete LAE form:', err);
    res.status(500).json({ error: 'Failed to delete form', detail: err.message });
  }
});

export default router;
