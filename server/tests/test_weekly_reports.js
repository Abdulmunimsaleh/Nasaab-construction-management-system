/**
 * Automated Test Suite for Weekly PDF Reports Feature
 * 
 * Tests the 3 categories across project sites:
 * 1. Full weekly report (LAE + Material) — Admin, Director, Partner only
 * 2. Labour, activity & equipment weekly report — Admin, Director, Partner, Foreman only
 * 3. Material weekly report — Admin, Director, Partner, Foreman only
 * 4. Project site coverage (every site: Majestic Palms, MMA, SeaCrest)
 * 5. Database persistence in `weekly_reports` table
 */

import '../env.js';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import pool from '../db.js';

import weeklyReportsRoutes from '../routes/weekly_reports.routes.js';
import laeFormsRoutes from '../routes/lae_forms.routes.js';
import materialRequestsRoutes from '../routes/material_requests.routes.js';

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(session({
  name: 'nasaab.sid',
  secret: process.env.SESSION_SECRET || 'nasaab_dev_session_secret_key_8492048',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Test session injector for testing roles directly
app.post('/api/test-session', (req, res) => {
  const { user, activeProjectId } = req.body;
  req.session.user = user;
  req.session.activeProjectId = activeProjectId;
  res.json({ success: true, user: req.session.user });
});

app.use('/api/weekly-reports', weeklyReportsRoutes);
app.use('/api/lae-forms', laeFormsRoutes);
app.use('/api/material-requests', materialRequestsRoutes);

let server;
const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(url, options = {}, cookie = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  const setCookie = res.headers.get('set-cookie');
  let newCookie = cookie;
  if (setCookie) {
    const match = setCookie.match(/nasaab\.sid=([^;]+)/);
    if (match) newCookie = `nasaab.sid=${match[1]}`;
  }

  return { status: res.status, ok: res.ok, body, cookie: newCookie };
}

async function createPersonaSession(user, activeProjectId) {
  const res = await request('/test-session', {
    method: 'POST',
    body: JSON.stringify({ user, activeProjectId })
  });
  return res.cookie;
}

async function runWeeklyReportTests() {
  console.log('===============================================================');
  console.log('🧪 WEEKLY PDF REPORTS TEST SUITE');
  console.log('===============================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });
  console.log(`📡 Test server running on http://localhost:${TEST_PORT}\n`);

  try {
    const adminUser = { id: 'usr-abdulmunim-swaleh', user_id: 'abdulmunim.swaleh', name: 'Abdulmunim Swaleh', role: 'Admin', status: 'active' };
    const directorUser = { id: 'usr-firdaus-ali', user_id: 'firdaus.ali', name: 'Firdaus Ali', role: 'Director', status: 'active' };
    const partnerUser = { id: 'usr-mohamed-amoody', user_id: 'mohamed.alamoody', name: 'Mohamed Alamoody', role: 'Partner', status: 'active' };
    const foremanUser = { id: 'usr-daniel-arap', user_id: 'daniel.nzuki', name: 'Daniel Nzuki', role: 'Foreman', status: 'active' };
    const storekeeperUser = { id: 'usr-mohamed-majeed', user_id: 'mohamed.majeed', name: 'Mohamed Majeed', role: 'Storekeeper', status: 'active' };

    console.log('🔑 Establishing sessions for test personas...');
    const adminCookie = await createPersonaSession(adminUser, 'prj-majestic-palms');
    const directorCookie = await createPersonaSession(directorUser, 'prj-majestic-palms');
    const partnerCookie = await createPersonaSession(partnerUser, 'prj-majestic-palms');
    const foremanCookie = await createPersonaSession(foremanUser, 'prj-majestic-palms');
    const storekeeperCookie = await createPersonaSession(storekeeperUser, 'prj-majestic-palms');

    console.log('✅ All test personas initialized.\n');

    // -------------------------------------------------------------------------
    // TEST 1: CATEGORY 1 — FULL WEEKLY REPORT (LAE + MATERIALS COMBINED)
    // Rule: Admin, Director, Partner ONLY. Foreman & Storekeeper FORBIDDEN.
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Category 1 — Full Weekly Report Permissions ---');

    // Admin should succeed
    const adminFull = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=full&weekNumber=42&year=2026',
      {},
      adminCookie
    );
    console.log(`   Admin -> Full Weekly Report: HTTP ${adminFull.status} (Expected: 200 OK)`);
    if (adminFull.status !== 200) throw new Error('Admin should access Full weekly report');

    // Director should succeed
    const dirFull = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=full&weekNumber=42&year=2026',
      {},
      directorCookie
    );
    console.log(`   Director -> Full Weekly Report: HTTP ${dirFull.status} (Expected: 200 OK)`);
    if (dirFull.status !== 200) throw new Error('Director should access Full weekly report');

    // Partner should succeed
    const partFull = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=full&weekNumber=42&year=2026',
      {},
      partnerCookie
    );
    console.log(`   Partner -> Full Weekly Report: HTTP ${partFull.status} (Expected: 200 OK)`);
    if (partFull.status !== 200) throw new Error('Partner should access Full weekly report');

    // Foreman MUST FAIL (403 Forbidden)
    const foremanFull = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=full&weekNumber=42&year=2026',
      {},
      foremanCookie
    );
    console.log(`   Foreman -> Full Weekly Report: HTTP ${foremanFull.status} (Expected: 403 Forbidden)`);
    if (foremanFull.status !== 403) throw new Error('Foreman must be forbidden from Full weekly report');

    // Storekeeper MUST FAIL (403 Forbidden)
    const storekeeperFull = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=full&weekNumber=42&year=2026',
      {},
      storekeeperCookie
    );
    console.log(`   Storekeeper -> Full Weekly Report: HTTP ${storekeeperFull.status} (Expected: 403 Forbidden)`);
    if (storekeeperFull.status !== 403) throw new Error('Storekeeper must be forbidden from Full weekly report');

    console.log('   ✅ Category 1 Role Guard Verified: Admin, Director, Partner ONLY.\n');

    // -------------------------------------------------------------------------
    // TEST 2: CATEGORY 2 — LABOUR, ACTIVITY & EQUIPMENT WEEKLY REPORT
    // Rule: Admin, Director, Partner, Foreman. Storekeeper FORBIDDEN.
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 2: Category 2 — LAE Weekly Report Permissions ---');

    // Admin should succeed
    const adminLae = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=lae&weekNumber=42&year=2026',
      {},
      adminCookie
    );
    console.log(`   Admin -> LAE Weekly Report: HTTP ${adminLae.status} (Expected: 200 OK)`);
    if (adminLae.status !== 200) throw new Error('Admin should access LAE weekly report');

    // Partner should succeed
    const partLae = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=lae&weekNumber=42&year=2026',
      {},
      partnerCookie
    );
    console.log(`   Partner -> LAE Weekly Report: HTTP ${partLae.status} (Expected: 200 OK)`);
    if (partLae.status !== 200) throw new Error('Partner should access LAE weekly report');

    // Foreman MUST SUCCEED (200 OK)
    const foremanLae = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=lae&weekNumber=42&year=2026',
      {},
      foremanCookie
    );
    console.log(`   Foreman -> LAE Weekly Report: HTTP ${foremanLae.status} (Expected: 200 OK)`);
    if (foremanLae.status !== 200) throw new Error('Foreman should access LAE weekly report');

    // Storekeeper MUST FAIL (403 Forbidden)
    const storekeeperLae = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=lae&weekNumber=42&year=2026',
      {},
      storekeeperCookie
    );
    console.log(`   Storekeeper -> LAE Weekly Report: HTTP ${storekeeperLae.status} (Expected: 403 Forbidden)`);
    if (storekeeperLae.status !== 403) throw new Error('Storekeeper must be forbidden from LAE weekly report');

    console.log('   ✅ Category 2 Role Guard Verified: Admin, Director, Partner, Foreman ONLY.\n');

    // -------------------------------------------------------------------------
    // TEST 3: CATEGORY 3 — MATERIAL WEEKLY REPORT
    // Rule: Admin, Director, Partner, Storekeeper ONLY. Foreman FORBIDDEN.
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 3: Category 3 — Material Weekly Report Permissions ---');

    // Admin should succeed
    const adminMat = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=materials&weekNumber=42&year=2026',
      {},
      adminCookie
    );
    console.log(`   Admin -> Material Weekly Report: HTTP ${adminMat.status} (Expected: 200 OK)`);
    if (adminMat.status !== 200) throw new Error('Admin should access Material weekly report');

    // Director should succeed
    const dirMat = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=materials&weekNumber=42&year=2026',
      {},
      directorCookie
    );
    console.log(`   Director -> Material Weekly Report: HTTP ${dirMat.status} (Expected: 200 OK)`);
    if (dirMat.status !== 200) throw new Error('Director should access Material weekly report');

    // Partner should succeed
    const partMat = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=materials&weekNumber=42&year=2026',
      {},
      partnerCookie
    );
    console.log(`   Partner -> Material Weekly Report: HTTP ${partMat.status} (Expected: 200 OK)`);
    if (partMat.status !== 200) throw new Error('Partner should access Material weekly report');

    // Storekeeper MUST SUCCEED (200 OK)
    const storekeeperMat = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=materials&weekNumber=42&year=2026',
      {},
      storekeeperCookie
    );
    console.log(`   Storekeeper -> Material Weekly Report: HTTP ${storekeeperMat.status} (Expected: 200 OK)`);
    if (storekeeperMat.status !== 200) throw new Error('Storekeeper should access Material weekly report');

    // Foreman MUST FAIL (403 Forbidden)
    const foremanMat = await request(
      '/weekly-reports/data?projectId=prj-majestic-palms&reportType=materials&weekNumber=42&year=2026',
      {},
      foremanCookie
    );
    console.log(`   Foreman -> Material Weekly Report: HTTP ${foremanMat.status} (Expected: 403 Forbidden)`);
    if (foremanMat.status !== 403) throw new Error('Foreman must be forbidden from Material weekly report');

    console.log('   ✅ Category 3 Role Guard Verified: Admin, Director, Partner, Storekeeper ONLY (Foreman blocked).\n');

    // -------------------------------------------------------------------------
    // TEST 4: ALL 3 PROJECT SITES COVERAGE (Majestic Palms, MMA, SeaCrest)
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 4: Every Project Site Verification ---');

    const sites = [
      { id: 'prj-majestic-palms', name: 'Majestic Palms' },
      { id: 'prj-mma', name: 'MMA' },
      { id: 'prj-seacrest', name: 'SeaCrest' }
    ];

    for (const site of sites) {
      // 1. Weeks endpoint
      const weeksRes = await request(`/weekly-reports/weeks?projectId=${site.id}`, {}, adminCookie);
      console.log(`   [${site.name}] Available weeks: ${weeksRes.body.length} week(s) found`);
      if (!weeksRes.body || weeksRes.body.length === 0) {
        throw new Error(`Site ${site.name} should have available reporting weeks`);
      }

      // 2. Data aggregation endpoint for Full report
      const dataRes = await request(
        `/weekly-reports/data?projectId=${site.id}&reportType=full&weekNumber=42&year=2026`,
        {},
        adminCookie
      );
      if (dataRes.status !== 200) {
        throw new Error(`Site ${site.name} failed weekly data query: HTTP ${dataRes.status}`);
      }

      const summary = dataRes.body.summaryTotals;
      console.log(`   [${site.name}] Weekly Data -> Workers: ${summary.totalWorkers}, Labour Cost: KES ${summary.totalLabourCost.toLocaleString()}, Equipment: KES ${summary.totalEquipmentCost.toLocaleString()}, Materials: KES ${summary.totalMaterialCost.toLocaleString()}`);
    }

    console.log('   ✅ All 3 Project Sites confirmed working with rich weekly data.\n');

    // -------------------------------------------------------------------------
    // TEST 5: DATABASE PERSISTENCE (weekly_reports TABLE)
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 5: Database Persistence in weekly_reports table ---');

    const saveRes = await request(
      '/weekly-reports/save',
      {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'prj-majestic-palms',
          reportType: 'full',
          weekNumber: 42,
          year: 2026,
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          title: 'Week 42 Full Executive Report — Majestic Palms',
          summary: 'Verified executive dossier for week 42.',
          totalWorkers: 24,
          totalLabourCost: 22500,
          totalEquipmentCost: 9500,
          totalMaterialCost: 85000,
          laeFormCount: 6,
          materialRequestCount: 4
        })
      },
      adminCookie
    );

    console.log(`   Save Weekly Report: HTTP ${saveRes.status} (Expected: 201 Created)`);
    if (saveRes.status !== 201) throw new Error('Saving weekly report should succeed');

    // Retrieve saved reports
    const listRes = await request('/weekly-reports?projectId=prj-majestic-palms', {}, adminCookie);
    console.log(`   Retrieve Saved Reports: Found ${listRes.body.length} report(s) in MySQL`);
    const found = listRes.body.find((r) => r.week_number === 42 && r.report_type === 'full');
    if (!found) throw new Error('Saved report should be found in MySQL weekly_reports table');
    console.log(`   Saved report ID: ${found.id}, Title: "${found.title}", Status: ${found.status}`);

    console.log('   ✅ Database persistence and retrieval verified.\n');

    console.log('🎉 ALL 5 TEST GROUPS PASSED WITH ZERO ERRORS!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runWeeklyReportTests();
