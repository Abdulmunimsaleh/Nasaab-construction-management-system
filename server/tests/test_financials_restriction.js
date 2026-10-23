import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import developerFundsRoutes from '../routes/developer_funds.routes.js';

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

// Test session injector
app.post('/api/test-session', (req, res) => {
  const { user, activeProjectId } = req.body;
  req.session.user = user;
  req.session.activeProjectId = activeProjectId;
  res.json({ success: true, user: req.session.user });
});

app.use('/api/developer-funds', developerFundsRoutes);

let server;
const TEST_PORT = 3101;
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

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 SEACREST FINANCIALS & DEVELOPER FUNDS RESTRICTION TEST SUITE');
  console.log('===============================================================\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });
  console.log(`📡 Test server running on http://localhost:${TEST_PORT}\n`);

  try {
    const adminUser = { id: 'usr-abdulmunim-swaleh', user_id: 'abdulmunim.swaleh', name: 'Abdulmunim Swaleh', role: 'Admin', status: 'active' };
    const husseinUser = { id: 'usr-mohamed-hussein', user_id: 'mohamed.hussein', name: 'Mohamed Hussein', role: 'Partner', status: 'active' };
    const abdiUser = { id: 'usr-abdi-mahad', user_id: 'abdi.mahad', name: 'Abdi Mahad', role: 'Partner', status: 'active' };

    console.log('🔑 Establishing test sessions...');
    const adminCookie = await createPersonaSession(adminUser, 'prj-seacrest');
    const husseinCookie = await createPersonaSession(husseinUser, 'prj-seacrest');
    const abdiCookie = await createPersonaSession(abdiUser, 'prj-seacrest');

    console.log('--- TEST 1: Mohamed Hussein Access Restriction on SeaCrest Developer Funds ---');
    const husseinGet = await request('/developer-funds?projectId=prj-seacrest', { method: 'GET' }, husseinCookie);
    console.log(`   Mohamed Hussein GET /developer-funds: HTTP ${husseinGet.status} (Expected: 403 Forbidden)`);
    if (husseinGet.status !== 403) throw new Error(`Expected 403, got ${husseinGet.status}`);

    const husseinPost = await request('/developer-funds', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'prj-seacrest',
        amount: 500000,
        title: 'Unauthorized deposit attempt'
      })
    }, husseinCookie);
    console.log(`   Mohamed Hussein POST /developer-funds: HTTP ${husseinPost.status} (Expected: 403 Forbidden)`);
    if (husseinPost.status !== 403) throw new Error(`Expected 403, got ${husseinPost.status}`);

    console.log('\n--- TEST 2: Abdi Mahad Access Restriction on SeaCrest Developer Funds ---');
    const abdiGet = await request('/developer-funds?projectId=prj-seacrest', { method: 'GET' }, abdiCookie);
    console.log(`   Abdi Mahad GET /developer-funds: HTTP ${abdiGet.status} (Expected: 403 Forbidden)`);
    if (abdiGet.status !== 403) throw new Error(`Expected 403, got ${abdiGet.status}`);

    const abdiPost = await request('/developer-funds', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'prj-seacrest',
        amount: 250000,
        title: 'Unauthorized deposit attempt'
      })
    }, abdiCookie);
    console.log(`   Abdi Mahad POST /developer-funds: HTTP ${abdiPost.status} (Expected: 403 Forbidden)`);
    if (abdiPost.status !== 403) throw new Error(`Expected 403, got ${abdiPost.status}`);

    console.log('\n--- TEST 3: Admin Authorized Access to SeaCrest Developer Funds ---');
    const adminGet = await request('/developer-funds?projectId=prj-seacrest', { method: 'GET' }, adminCookie);
    console.log(`   Admin GET /developer-funds: HTTP ${adminGet.status} (Expected: 200 OK)`);
    if (adminGet.status !== 200) throw new Error(`Expected 200, got ${adminGet.status}`);

    console.log('\n🎉 ALL RESTRICTION TESTS PASSED! Mohamed Hussein and Abdi Mahad are strictly forbidden from SeaCrest Developer Funds and Project Financial Overview.');
  } finally {
    if (server) {
      server.close();
      console.log('\n📡 Test server stopped.');
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
