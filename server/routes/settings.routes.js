/**
 * NASAAB Construction — Company Settings Routes
 */
import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole, logAuditEvent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/settings/company
 */
router.get('/company', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM company_settings LIMIT 1');
    if (rows.length === 0) {
      return res.json({
        companyName: 'NASAAB CONSTRUCTION LIMITED',
        ncaRegistration: 'NCA 1 - Building & Civil Engineering Works',
        address: 'Mombasa, Kenya',
        phone: '+254 700 000 000',
        email: 'info@nasaabconstruction.com',
        website: 'www.nasaabconstruction.com',
        pdfLogoText: 'NASAAB CONSTRUCTION LIMITED'
      });
    }

    const s = rows[0];
    res.json({
      companyName: s.company_name,
      ncaRegistration: s.nca_registration,
      address: s.address,
      phone: s.phone,
      email: s.email,
      website: s.website,
      pdfLogoText: s.pdf_logo_text
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company settings', detail: err.message });
  }
});

/**
 * PUT /api/settings/company
 * Admin & Director only.
 */
router.put('/company', requireRole('admin', 'director'), async (req, res) => {
  const s = req.body;
  try {
    const [rows] = await pool.query('SELECT id FROM company_settings LIMIT 1');
    const compId = rows[0]?.id || 'comp-nasaab';

    await pool.query(`
      INSERT INTO company_settings (
        id, company_name, nca_registration, address, phone, email, website, pdf_logo_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        nca_registration = VALUES(nca_registration),
        address = VALUES(address),
        phone = VALUES(phone),
        email = VALUES(email),
        website = VALUES(website),
        pdf_logo_text = VALUES(pdf_logo_text)
    `, [
      compId,
      s.companyName || 'NASAAB CONSTRUCTION LIMITED',
      s.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works',
      s.address || 'Mombasa, Kenya',
      s.phone || '+254 700 000 000',
      s.email || 'info@nasaabconstruction.com',
      s.website || 'www.nasaabconstruction.com',
      s.pdfLogoText || s.companyName || 'NASAAB CONSTRUCTION LIMITED'
    ]);

    await logAuditEvent(req, 'UPDATE_COMPANY_SETTINGS', 'company_settings', compId);

    res.json({ success: true, message: 'Company settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', detail: err.message });
  }
});

/**
 * GET /api/settings/notifications
 */
router.get('/notifications', async (_req, res) => {
  res.json([]);
});

export default router;
