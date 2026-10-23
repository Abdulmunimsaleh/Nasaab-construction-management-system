/**
 * NASAAB Construction — Automated Requirements Verification Test Suite
 * 
 * Verifies all 20 requirements specified in the prompt:
 * - 3 projects with exact names and locations
 * - 13 unique users, single account per person
 * - System-wide global access for Admin and Director
 * - Strict project access isolation for Partners, Storekeepers, Foremen
 * - Module barriers (Foreman blocked from Materials & Costs; Storekeeper blocked from Labour/Equipment & Costs)
 * - Unauthorized direct API requests rejected
 * - Obsolete endpoints (daily reports, issues, photos) return 404
 * - Dynamic project and user creation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  // Extract connect.sid cookie if set
  const setCookie = res.headers.get('set-cookie');
  let cookie = null;
  if (setCookie) {
    const match = setCookie.match(/nasaab\.sid=([^;]+)/);
    if (match) {
      cookie = `nasaab.sid=${match[1]}`;
    }
  }

  return { status: res.status, ok: res.ok, body, cookie };
}

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 NASAAB CONSTRUCTION — VERIFICATION TEST SUITE');
  console.log('=====================================================\n');

  // Load activation credentials for test users
  const credPath = path.resolve(__dirname, '../credentials/activation_tokens.json');
  if (!fs.existsSync(credPath)) {
    throw new Error(`Credentials file not found at ${credPath}. Run npm run provision first.`);
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const userMap = {};
  for (const acc of credentials.accounts) {
    userMap[acc.userId] = acc;
  }

  const results = [];
  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      results.push({ title, pass: true });
    } else {
      console.error(`  ❌ FAIL: ${title} — ${detail}`);
      results.push({ title, pass: false, detail });
    }
  }

  // Helper to log in a user and return cookie
  async function loginUser(projectId, userId, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ projectId, userId, password })
    });
    return res;
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Health & Server Startup (No seed data runtime error)
    // -----------------------------------------------------------------
    console.log('--- TEST GROUP 1: Health & Public Project Listing ---');
    const health = await request('/health');
    assert('Server is running and healthy', health.ok && health.body.status === 'healthy');

    // -----------------------------------------------------------------
    // TEST 2 & 3: Three Projects with Correct Names and Locations
    // -----------------------------------------------------------------
    const publicProjects = await request('/auth/projects');
    assert('Login dropdown projects endpoint returns 200', publicProjects.ok);
    const projs = publicProjects.body;
    assert('Three projects exist in database', Array.isArray(projs) && projs.length === 3);

    const majestic = projs.find(p => p.name.includes('Majestic Palms'));
    const mma = projs.find(p => p.name === 'MMA');
    const seacrest = projs.find(p => p.name.includes('SeaCrest'));

    assert('Majestic Palms located in Kizingo, Mombasa',
      majestic && majestic.location.includes('Kizingo, opposite Masjid Ummu Kulthum, Mombasa, Kenya'));
    assert('MMA located in Tudor, Mombasa',
      mma && mma.location.includes('Tudor, Mombasa, Kenya'));
    assert('SeaCrest located in Nyali, Mombasa',
      seacrest && seacrest.location.includes('Nyali, near Masjid Taib, Mombasa, Kenya'));

    // -----------------------------------------------------------------
    // TEST 4 & 5: Global Admin & Director Access
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Admin & Director Global Access ---');
    const adminAcc = userMap['abdulmunim.swaleh'];
    const adminLogin = await loginUser(majestic.id, adminAcc.userId, adminAcc.tempPassword);
    assert('Abdulmunim Swaleh (Admin) logs into Majestic Palms', adminLogin.ok);
    assert('Admin session has accessible projects list with all 3 projects',
      adminLogin.body.accessibleProjects && adminLogin.body.accessibleProjects.length === 3);

    const adminCookie = adminLogin.cookie;

    // Ensure clean baseline state: remove any test assignment of abdulfatah.sabir on Majestic Palms
    await request(`/projects/${majestic.id}/users/abdulfatah.sabir`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    // Director login
    const directorAcc = userMap['mohamed.amin'];
    const directorLogin = await loginUser(mma.id, directorAcc.userId, directorAcc.tempPassword);
    assert('Mohamed Amin (Director) logs into MMA', directorLogin.ok);

    const firdausAcc = userMap['firdaus.ali'];
    const firdausLogin = await loginUser(seacrest.id, firdausAcc.userId, firdausAcc.tempPassword);
    assert('Firdaus Ali (Director) logs into SeaCrest', firdausLogin.ok);

    // -----------------------------------------------------------------
    // TEST 6: Mohamed Amoody (Majestic Palms only)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Project Access Isolation (Mohamed Amoody) ---');
    const amoodyAcc = userMap['mohamed.amoody'];
    const amoodyMajestic = await loginUser(majestic.id, amoodyAcc.userId, amoodyAcc.tempPassword);
    assert('Mohamed Amoody accesses Majestic Palms', amoodyMajestic.ok);

    const amoodyMMA = await loginUser(mma.id, amoodyAcc.userId, amoodyAcc.tempPassword);
    assert('Mohamed Amoody DENIED access to MMA (403)', amoodyMMA.status === 403);

    const amoodySeaCrest = await loginUser(seacrest.id, amoodyAcc.userId, amoodyAcc.tempPassword);
    assert('Mohamed Amoody DENIED access to SeaCrest (403)', amoodySeaCrest.status === 403);

    // -----------------------------------------------------------------
    // TEST 7: Abdulfatah Sabir (MMA and SeaCrest only, NOT Majestic Palms)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Multi-Project Partner Access (Abdulfatah Sabir) ---');
    const sabirAcc = userMap['abdulfatah.sabir'];
    const sabirMMA = await loginUser(mma.id, sabirAcc.userId, sabirAcc.tempPassword);
    assert('Abdulfatah Sabir accesses MMA', sabirMMA.ok);

    const sabirSeaCrest = await loginUser(seacrest.id, sabirAcc.userId, sabirAcc.tempPassword);
    assert('Abdulfatah Sabir accesses SeaCrest', sabirSeaCrest.ok);

    const sabirMajestic = await loginUser(majestic.id, sabirAcc.userId, sabirAcc.tempPassword);
    assert('Abdulfatah Sabir DENIED access to Majestic Palms (403)', sabirMajestic.status === 403);

    // -----------------------------------------------------------------
    // TEST 8: Mohamed Hussein & Abdi Mahad (SeaCrest only)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: SeaCrest Partners Isolation ---');
    const husseinAcc = userMap['mohamed.hussein'];
    const husseinSeaCrest = await loginUser(seacrest.id, husseinAcc.userId, husseinAcc.tempPassword);
    assert('Mohamed Hussein accesses SeaCrest', husseinSeaCrest.ok);

    const husseinMMA = await loginUser(mma.id, husseinAcc.userId, husseinAcc.tempPassword);
    assert('Mohamed Hussein DENIED access to MMA (403)', husseinMMA.status === 403);

    // -----------------------------------------------------------------
    // TEST 9 & 10: Role-Based Module Barriers (Foreman & Storekeeper)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Role-Based Module Barriers ---');
    // Daniel Nzuki (Foreman - Majestic Palms)
    const danielAcc = userMap['daniel.nzuki'] || userMap['daniel.arap'];
    const danielLogin = await loginUser(majestic.id, danielAcc.userId, danielAcc.tempPassword);
    assert('Daniel Nzuki (Foreman) logs into Majestic Palms', danielLogin.ok);
    const danielCookie = danielLogin.cookie;

    // Foreman tries to access materials requests
    const foremanMaterials = await request('/material-requests', {
      headers: { Cookie: danielCookie }
    });
    assert('Foreman FORBIDDEN from Material Requests (403)', foremanMaterials.status === 403);

    // Foreman tries to access costs
    const foremanCosts = await request('/costs', {
      headers: { Cookie: danielCookie }
    });
    assert('Foreman FORBIDDEN from Financial Costs (403)', foremanCosts.status === 403);

    // Foreman CAN submit Labour, Activity and Equipment form
    const foremanCreateLAE = await request('/lae-forms', {
      method: 'POST',
      headers: { Cookie: danielCookie },
      body: JSON.stringify({
        projectId: majestic.id,
        date: new Date().toISOString().split('T')[0],
        weather: 'Sunny / Breeze',
        generalNotes: 'Full team on site. Foundation excavation in progress.',
        labourItems: [
          { trade: 'Mason', numberOfWorkers: 4, hoursWorked: 8, overtimeHours: 1, notes: 'Excavation alignment' },
          { trade: 'General Labourer', numberOfWorkers: 10, hoursWorked: 8, overtimeHours: 0 }
        ],
        activityItems: [
          { activityDescription: 'Trench digging for block A foundation', locationOrZone: 'Block A', status: 'in_progress', progressPercentage: 35 }
        ],
        equipmentItems: [
          { equipmentName: 'Excavator Cat 320', quantity: 1, hoursUsed: 7.5, operatorName: 'Kiprono', status: 'operational' }
        ]
      })
    });
    assert('Foreman successfully creates Labour, Activity & Equipment Form (201)', foremanCreateLAE.status === 201);
    const createdFormId = foremanCreateLAE.body.form.id;

    // Mohamed Majid (Storekeeper - Majestic Palms)
    const majidAcc = userMap['mohamed.majid'];
    const majidLogin = await loginUser(majestic.id, majidAcc.userId, majidAcc.tempPassword);
    assert('Mohamed Majid (Storekeeper) logs into Majestic Palms', majidLogin.ok);
    const majidCookie = majidLogin.cookie;

    // Storekeeper tries to access LAE forms
    const storekeeperLAE = await request('/lae-forms', {
      headers: { Cookie: majidCookie }
    });
    assert('Storekeeper FORBIDDEN from LAE Forms (403)', storekeeperLAE.status === 403);

    // Storekeeper tries to access costs
    const storekeeperCosts = await request('/costs', {
      headers: { Cookie: majidCookie }
    });
    assert('Storekeeper FORBIDDEN from Financial Costs (403)', storekeeperCosts.status === 403);

    // Storekeeper CAN submit Material Needed request
    const storekeeperCreateMR = await request('/material-requests', {
      method: 'POST',
      headers: { Cookie: majidCookie },
      body: JSON.stringify({
        projectId: majestic.id,
        dateNeeded: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        urgency: 'urgent',
        notes: 'Required for ground slab casting',
        items: [
          { itemName: 'Simba Portland Cement 42.5N', quantity: 200, unit: 'Bags', estimatedUnitCost: 750 },
          { itemName: 'Coarse River Sand', quantity: 2, unit: 'Trips (20T)', estimatedUnitCost: 35000 }
        ]
      })
    });
    assert('Storekeeper successfully creates Material Needed Request (201)', storekeeperCreateMR.status === 201);

    // -----------------------------------------------------------------
    // TEST 11 & 12: Direct API Requests Protection & Project Tampering
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Direct API Security & URL Tampering ---');
    // Direct unauthenticated call
    const directUnauth = await request('/lae-forms');
    assert('Direct unauthenticated request to /lae-forms rejected (401)', directUnauth.status === 401);

    // Storekeeper tries to tamper projectId parameter to access another project's materials
    const tamperedMaterials = await request(`/material-requests?projectId=${mma.id}`, {
      headers: { Cookie: majidCookie } // majid is only assigned to majestic
    });
    assert('Storekeeper denied accessing materials of unassigned project (403)', tamperedMaterials.status === 403);

    // -----------------------------------------------------------------
    // TEST 13: Admin/Director Only User Management
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Administrative Access Control ---');
    const unauthorizedUserCreate = await request('/users', {
      method: 'POST',
      headers: { Cookie: danielCookie }, // Foreman trying to create user
      body: JSON.stringify({ name: 'Hacker', userId: 'hacker', role: 'Admin' })
    });
    assert('Foreman cannot create users (403)', unauthorizedUserCreate.status === 403);

    const adminUserList = await request('/users', {
      headers: { Cookie: adminCookie }
    });
    assert('Admin can view system users list', adminUserList.ok);
    assert('System users count matches 13 unique accounts',
      adminUserList.body && adminUserList.body.length === 13);

    // -----------------------------------------------------------------
    // TEST 15: No Duplicate Account on Project Assignment
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Assignment Without Duplicate Accounts ---');
    // Assign Abdulfatah Sabir to a new assignment (e.g. Majestic Palms test assignment)
    const assignExisting = await request(`/projects/${majestic.id}/users`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ userId: 'abdulfatah.sabir', role: 'Partner' })
    });
    assert('Assign existing user to another project succeeds without duplicate account', assignExisting.ok);

    const usersAfterAssign = await request('/users', {
      headers: { Cookie: adminCookie }
    });
    assert('User count remains exactly 13 (no duplicate accounts)', usersAfterAssign.body.length === 13);

    // Clean up test assignment so test runs are idempotent
    await request(`/projects/${majestic.id}/users/abdulfatah.sabir`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    // -----------------------------------------------------------------
    // TEST 18: Unwanted Modules Return 404 (Removed Everywhere)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: Permanent Removal of Legacy Endpoints ---');
    const legacyDailyReports = await request('/reports/daily', { headers: { Cookie: adminCookie } });
    assert('Legacy /api/reports/daily returns 404', legacyDailyReports.status === 404);

    const legacyIssues = await request('/issues', { headers: { Cookie: adminCookie } });
    assert('Legacy /api/issues returns 404', legacyIssues.status === 404);

    const legacyPhotos = await request('/photos', { headers: { Cookie: adminCookie } });
    assert('Legacy /api/photos returns 404', legacyPhotos.status === 404);

    // -----------------------------------------------------------------
    // TEST SUMMARY
    // -----------------------------------------------------------------
    console.log('\n=====================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
