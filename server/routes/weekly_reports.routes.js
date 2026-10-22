/**
 * NASAAB Construction — Weekly Reports API Routes
 * 
 * Manages weekly construction dossiers across all project sites:
 * 1. Full Weekly Report (Combines LAE + Materials) — Admin, Director, Partner only
 * 2. Labour, Activity and Equipment Weekly Report — Admin, Director, Partner, Foreman only
 * 3. Material Weekly Report — Admin, Director, Partner, Foreman only
 * 
 * Strict role and site access enforcement:
 * - Admin & Director: Universal site access
 * - Partner: Assigned sites only
 * - Foreman: Assigned sites only, restricted to LAE and Material weekly reports (NO Full report)
 * - Storekeeper: No access to any of the 3 weekly reports
 */

import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireProjectAccess, logAuditEvent, isLabourRestrictedUser } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireProjectAccess);

/**
 * Check role authorization for weekly report categories:
 * 1. Full Weekly Report: Admin, Director, Partner only
 * 2. LAE Weekly Report: Admin, Director, Partner, Foreman only (Storekeeper forbidden)
 * 3. Material Weekly Report: Admin, Director, Partner, Storekeeper only (Foreman forbidden)
 */
function verifyWeeklyReportAccess(userRole, reportType, user = null, projectId = null) {
  const role = String(userRole || '').trim().toLowerCase();
  const type = String(reportType || '').trim().toLowerCase();

  // If partner is restricted from labour on SeaCrest (Mohamed Hussein & Abdi Mahad)
  if (isLabourRestrictedUser(user, projectId)) {
    if (type === 'lae' || type === 'full') {
      return {
        allowed: false,
        message: 'Access restricted: Mohamed Hussein and Abdi Mahad do not have access to Labour reports on SeaCrest.'
      };
    }
  }

  // 1. Full Weekly Report: Admin, Director, Partner only
  if (type === 'full') {
    if (['admin', 'director', 'partner'].includes(role)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: 'Full Weekly Reports (combined LAE + Materials) are restricted to Administrators, Directors, and Partners.'
    };
  }

  // 2. LAE Weekly Report: Admin, Director, Partner, Foreman only (Storekeeper forbidden)
  if (type === 'lae') {
    if (['admin', 'director', 'partner', 'foreman'].includes(role)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: 'Labour, Activity & Equipment Weekly Reports are restricted to Administrators, Directors, Partners, and Foremen. Storekeepers cannot access Labour reports.'
    };
  }

  // 3. Material Weekly Report: Admin, Director, Partner, Storekeeper only (Foreman forbidden)
  if (type === 'materials') {
    if (['admin', 'director', 'partner', 'storekeeper'].includes(role)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: 'Material Weekly Reports are restricted to Administrators, Directors, Partners, and Storekeepers. Site Foremen can only view Labour, Activity & Equipment reports.'
    };
  }

  return { allowed: false, message: 'Invalid report category.' };
}

/**
 * Helper to compute ISO week date bounds (Monday - Sunday)
 */
function getWeekDateRange(year, weekNumber) {
  const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setUTCDate(ISOweekStart.getUTCDate() + 6);

  return {
    startDate: ISOweekStart.toISOString().split('T')[0],
    endDate: ISOweekEnd.toISOString().split('T')[0]
  };
}

/**
 * GET /api/weekly-reports
 * List saved weekly reports for the scoped project site
 */
router.get('/', async (req, res) => {
  const projectId = req.authorizedProjectId;
  const userRole = (req.session.user.role || '').toLowerCase();
  const { reportType } = req.query;

  // Validate if specific reportType requested is allowed
  if (reportType) {
    const check = verifyWeeklyReportAccess(userRole, reportType, req.session?.user, projectId);
    if (!check.allowed) {
      return res.status(403).json({ error: 'Access denied', message: check.message });
    }
  }

  try {
    let query = `
      SELECT r.*, p.name AS project_name, p.code AS project_code
      FROM weekly_reports r
      JOIN projects p ON r.project_id = p.id
    `;
    const params = [];

    const conditions = [];
    if (projectId && projectId !== 'all') {
      conditions.push('r.project_id = ?');
      params.push(projectId);
    }

    if (reportType) {
      conditions.push('r.report_type = ?');
      params.push(reportType);
    }

    // Role filtering:
    // - Foreman can only see LAE weekly reports (never materials or full)
    // - Storekeeper can only see Material weekly reports (never LAE or full)
    if (userRole === 'foreman') {
      conditions.push("r.report_type = 'lae'");
    } else if (userRole === 'storekeeper') {
      conditions.push("r.report_type = 'materials'");
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.year DESC, r.week_number DESC, r.created_at DESC';

    const [reports] = await pool.query(query, params);
    res.json(reports);
  } catch (err) {
    console.error('Failed to list weekly reports:', err);
    res.status(500).json({ error: 'Failed to retrieve weekly reports', detail: err.message });
  }
});

/**
 * GET /api/weekly-reports/weeks
 * Compute available weeks with form activity for the scoped project site
 */
router.get('/weeks', async (req, res) => {
  const projectId = req.authorizedProjectId;

  try {
    let laeQuery = `SELECT DISTINCT date FROM labour_activity_equipment_forms`;
    let matQuery = `SELECT DISTINCT date_needed, DATE(created_at) as created_date FROM material_request_forms`;
    const params = [];

    if (projectId && projectId !== 'all') {
      laeQuery += ' WHERE project_id = ?';
      matQuery += ' WHERE project_id = ?';
      params.push(projectId);
    }

    const [laeDates] = await pool.query(laeQuery, params);
    const [matDates] = await pool.query(matQuery, params);

    const allDates = new Set();
    laeDates.forEach((r) => {
      if (r.date) allDates.add(String(r.date).substring(0, 10));
    });
    matDates.forEach((r) => {
      if (r.date_needed) allDates.add(String(r.date_needed).substring(0, 10));
      if (r.created_date) allDates.add(String(r.created_date).substring(0, 10));
    });

    // Also include current date
    allDates.add(new Date().toISOString().substring(0, 10));

    const weeksMap = new Map();

    allDates.forEach((dateStr) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      // Calculate ISO week
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
      const year = new Date(firstThursday).getFullYear();

      const key = `${year}-${weekNumber}`;
      if (!weeksMap.has(key)) {
        const bounds = getWeekDateRange(year, weekNumber);
        weeksMap.set(key, {
          weekNumber,
          year,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          label: `Week ${weekNumber}, ${year} (${bounds.startDate} to ${bounds.endDate})`
        });
      }
    });

    const weeks = Array.from(weeksMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });

    res.json(weeks);
  } catch (err) {
    console.error('Failed to list available weeks:', err);
    res.status(500).json({ error: 'Failed to retrieve available weeks', detail: err.message });
  }
});

/**
 * GET /api/weekly-reports/data
 * Aggregate real-time weekly data for a project site
 */
router.get('/data', async (req, res) => {
  const projectId = req.authorizedProjectId;
  const userRole = req.session.user.role;
  const { reportType = 'full', startDate, endDate, weekNumber, year } = req.query;

  // Authorization check for this category
  const authCheck = verifyWeeklyReportAccess(userRole, reportType, req.session?.user, projectId);
  if (!authCheck.allowed) {
    return res.status(403).json({ error: 'Forbidden', message: authCheck.message });
  }

  let effectiveStartDate = startDate;
  let effectiveEndDate = endDate;

  if ((!effectiveStartDate || !effectiveEndDate) && weekNumber && year) {
    const range = getWeekDateRange(parseInt(year, 10), parseInt(weekNumber, 10));
    effectiveStartDate = range.startDate;
    effectiveEndDate = range.endDate;
  }

  if (!effectiveStartDate || !effectiveEndDate) {
    return res.status(400).json({ error: 'Missing date range or week/year parameters' });
  }

  try {
    // 1. Fetch Project Details
    const [projectRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectRows[0];

    let laeForms = [];
    let labourTradeSummary = [];
    let activitySummary = [];
    let equipmentSummary = [];
    let incidentsList = [];
    let sitePhotos = [];
    let totalWorkers = 0;
    let totalLabourCost = 0;
    let totalEquipmentCost = 0;

    // 2. Fetch LAE Data if 'full' or 'lae'
    if (['full', 'lae'].includes(reportType)) {
      const [forms] = await pool.query(
        `SELECT * FROM labour_activity_equipment_forms
         WHERE project_id = ? AND date BETWEEN ? AND ?
         ORDER BY date ASC`,
        [projectId, effectiveStartDate, effectiveEndDate]
      );
      laeForms = forms;

      if (laeForms.length > 0) {
        const formIds = laeForms.map((f) => f.id);
        const placeholders = formIds.map(() => '?').join(',');

        // Labour items
        const [labourItems] = await pool.query(
          `SELECT l.*, f.date AS form_date
           FROM lae_form_labour_items l
           JOIN labour_activity_equipment_forms f ON l.form_id = f.id
           WHERE l.form_id IN (${placeholders})`,
          formIds
        );

        // Aggregate labour by trade
        const tradeMap = new Map();
        labourItems.forEach((item) => {
          const trade = item.trade || 'General Labour';
          const prev = tradeMap.get(trade) || {
            trade,
            foremanCount: 0,
            skilledCount: 0,
            unskilledCount: 0,
            totalWorkers: 0,
            totalCost: 0,
            foremanRate: item.foreman_rate || 1500,
            skilledRate: item.skilled_rate || 1000,
            unskilledRate: item.unskilled_rate || 500,
            workDoneList: []
          };

          const fCount = Number(item.foreman_count || 0);
          const sCount = Number(item.skilled_count || 0);
          const uCount = Number(item.unskilled_count || 0);
          const cost = Number(item.total_cost || 0);

          prev.foremanCount += fCount;
          prev.skilledCount += sCount;
          prev.unskilledCount += uCount;
          prev.totalWorkers += fCount + sCount + uCount;
          prev.totalCost += cost;

          if (item.work_done_today && !prev.workDoneList.includes(item.work_done_today)) {
            prev.workDoneList.push(item.work_done_today);
          }

          tradeMap.set(trade, prev);
          totalWorkers += fCount + sCount + uCount;
          totalLabourCost += cost;
        });
        labourTradeSummary = Array.from(tradeMap.values());

        // Activity items
        const [activityItems] = await pool.query(
          `SELECT a.*, f.date AS form_date
           FROM lae_form_activity_items a
           JOIN labour_activity_equipment_forms f ON a.form_id = f.id
           WHERE a.form_id IN (${placeholders})
           ORDER BY a.created_at ASC`,
          formIds
        );
        activitySummary = activityItems;

        // Equipment items
        const [equipItems] = await pool.query(
          `SELECT e.*, f.date AS form_date
           FROM lae_form_equipment_items e
           JOIN labour_activity_equipment_forms f ON e.form_id = f.id
           WHERE e.form_id IN (${placeholders})`,
          formIds
        );

        // Aggregate equipment by name
        const equipMap = new Map();
        equipItems.forEach((eq) => {
          const name = eq.equipment_name || 'Equipment';
          const prev = equipMap.get(name) || {
            name,
            totalQuantity: 0,
            fuelCost: 0,
            operatorCost: 0,
            repairCost: 0,
            mechanicCost: 0,
            transportCost: 0,
            totalExpense: 0,
            operatingStatus: eq.operating_status || eq.status || 'Active',
            notes: []
          };

          const fuel = Number(eq.fuel_cost || 0);
          const op = Number(eq.operator_cost || 0);
          const rep = Number(eq.repair_cost || 0);
          const mech = Number(eq.mechanic_cost || 0);
          const tr = Number(eq.transport_cost || 0);
          const exp = Number(eq.total_expense || (fuel + op + rep + mech + tr));

          prev.totalQuantity += Number(eq.quantity || 1);
          prev.fuelCost += fuel;
          prev.operatorCost += op;
          prev.repairCost += rep;
          prev.mechanicCost += mech;
          prev.transportCost += tr;
          prev.totalExpense += exp;

          if (eq.machine_notes && !prev.notes.includes(eq.machine_notes)) {
            prev.notes.push(eq.machine_notes);
          }

          equipMap.set(name, prev);
          totalEquipmentCost += exp;
        });
        equipmentSummary = Array.from(equipMap.values());

        // Incidents and Photos
        laeForms.forEach((f) => {
          if (f.delays_issues_incidents) {
            incidentsList.push({
              date: f.date,
              incident: f.delays_issues_incidents,
              visitors: f.site_visitors,
              weather: f.weather
            });
          }
          if (f.site_photos) {
            try {
              const photos = typeof f.site_photos === 'string' ? JSON.parse(f.site_photos) : f.site_photos;
              if (Array.isArray(photos)) {
                photos.forEach((p) => {
                  sitePhotos.push({
                    url: typeof p === 'string' ? p : p.url,
                    name: typeof p === 'object' ? p.name : 'Site Photo',
                    sourceDate: f.date
                  });
                });
              }
            } catch (e) {
              // Safe parse fallback
            }
          }
        });
      }
    }

    // 3. Fetch Materials Data if 'full' or 'materials'
    let materialRequests = [];
    let materialItemsSummary = [];
    let receiptPhotos = [];
    let totalMaterialCost = 0;

    if (['full', 'materials'].includes(reportType)) {
      const [requests] = await pool.query(
        `SELECT * FROM material_request_forms
         WHERE project_id = ?
           AND ((date_needed BETWEEN ? AND ?) OR (DATE(created_at) BETWEEN ? AND ?))
         ORDER BY date_needed ASC`,
        [projectId, effectiveStartDate, effectiveEndDate, effectiveStartDate, effectiveEndDate]
      );
      materialRequests = requests;

      if (materialRequests.length > 0) {
        const reqIds = materialRequests.map((r) => r.id);
        const placeholders = reqIds.map(() => '?').join(',');

        const [items] = await pool.query(
          `SELECT i.*, r.request_number, r.date_needed, r.requested_by_name
           FROM material_request_items i
           JOIN material_request_forms r ON i.request_id = r.id
           WHERE i.request_id IN (${placeholders})`,
          reqIds
        );

        items.forEach((item) => {
          const qty = Number(item.quantity || 0);
          const unitCost = Number(item.estimated_unit_cost || 0);
          const lineCost = qty * unitCost;
          totalMaterialCost += lineCost;

          materialItemsSummary.push({
            id: item.id,
            requestNumber: item.request_number,
            dateNeeded: item.date_needed,
            itemName: item.item_name,
            supplierVendor: item.supplier_vendor || 'Site Supply',
            quantity: qty,
            unit: item.unit || 'units',
            estimatedUnitCost: unitCost,
            estimatedTotalCost: lineCost,
            deliveryNotes: item.delivery_notes || ''
          });

          if (item.receipt_photos) {
            try {
              const photos = typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos) : item.receipt_photos;
              if (Array.isArray(photos)) {
                photos.forEach((rp) => {
                  receiptPhotos.push({
                    url: typeof rp === 'string' ? rp : rp.url,
                    itemTitle: item.item_name,
                    supplier: item.supplier_vendor
                  });
                });
              }
            } catch (e) {
              // safe fallback
            }
          }
        });

        // Add photos from material requests
        materialRequests.forEach((r) => {
          if (r.site_photos) {
            try {
              const photos = typeof r.site_photos === 'string' ? JSON.parse(r.site_photos) : r.site_photos;
              if (Array.isArray(photos)) {
                photos.forEach((p) => {
                  sitePhotos.push({
                    url: typeof p === 'string' ? p : p.url,
                    name: typeof p === 'object' ? p.name : 'Material Field Photo',
                    sourceDate: r.date_needed
                  });
                });
              }
            } catch (e) {
              // safe fallback
            }
          }
        });
      }
    }

    const payload = {
      project,
      reportType,
      weekNumber: parseInt(weekNumber, 10) || null,
      year: parseInt(year, 10) || null,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      summaryTotals: {
        totalWorkers,
        totalLabourCost,
        totalEquipmentCost,
        totalMaterialCost,
        grandTotalCost: totalLabourCost + totalEquipmentCost + totalMaterialCost,
        laeFormCount: laeForms.length,
        materialRequestCount: materialRequests.length
      },
      laeData: {
        forms: laeForms,
        labourTradeSummary,
        activitySummary,
        equipmentSummary,
        incidentsList
      },
      materialData: {
        requests: materialRequests,
        itemsSummary: materialItemsSummary,
        receiptPhotos
      },
      sitePhotos
    };

    res.json(payload);
  } catch (err) {
    console.error('Failed to aggregate weekly report data:', err);
    res.status(500).json({ error: 'Failed to aggregate weekly report data', detail: err.message });
  }
});

/**
 * POST /api/weekly-reports/save
 * Save / Archive a generated weekly report in the database
 */
router.post('/save', async (req, res) => {
  const projectId = req.authorizedProjectId;
  const user = req.session.user;
  const {
    reportType,
    weekNumber,
    year,
    startDate,
    endDate,
    title,
    summary,
    totalWorkers = 0,
    totalLabourCost = 0,
    totalEquipmentCost = 0,
    totalMaterialCost = 0,
    laeFormCount = 0,
    materialRequestCount = 0,
    metadata = {}
  } = req.body;

  // Authorization check
  const authCheck = verifyWeeklyReportAccess(user.role, reportType, user, projectId);
  if (!authCheck.allowed) {
    return res.status(403).json({ error: 'Forbidden', message: authCheck.message });
  }

  if (!reportType || !weekNumber || !year || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required weekly report fields' });
  }

  const reportId = `wr-${crypto.randomBytes(8).toString('hex')}`;
  const reportTitle = title || `Week ${weekNumber}, ${year} ${reportType.toUpperCase()} Report`;

  try {
    await pool.query(
      `INSERT INTO weekly_reports (
        id, project_id, report_type, week_number, year, start_date, end_date,
        title, summary, status, prepared_by_id, prepared_by_name,
        total_workers, total_labour_cost, total_equipment_cost, total_material_cost,
        lae_form_count, material_request_count, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        projectId,
        reportType,
        weekNumber,
        year,
        startDate,
        endDate,
        reportTitle,
        summary || null,
        'generated',
        user.id,
        user.name,
        totalWorkers,
        totalLabourCost,
        totalEquipmentCost,
        totalMaterialCost,
        laeFormCount,
        materialRequestCount,
        JSON.stringify(metadata)
      ]
    );

    await logAuditEvent(
      req,
      'CREATE_WEEKLY_REPORT',
      'weekly_reports',
      reportId,
      { message: `Generated ${reportType} weekly report for site ${projectId} (Week ${weekNumber}/${year})` }
    );

    res.status(201).json({
      success: true,
      id: reportId,
      message: 'Weekly report saved to database successfully.'
    });
  } catch (err) {
    console.error('Failed to save weekly report:', err);
    res.status(500).json({ error: 'Failed to save weekly report', detail: err.message });
  }
});

export default router;
