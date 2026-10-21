/**
 * NASAAB Construction — Express API Server
 * 
 * Provides database-backed REST API for BuildTrack Report System.
 * Enforces session authentication via HTTP-only cookies, centralized RBAC,
 * rate limiting, and project-based tenant authorization.
 */
import './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { testConnection } from './db.js';
import { runMigrations } from './migrations/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

// Route Handlers
import authRoutes from './routes/auth.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import usersRoutes from './routes/users.routes.js';
import laeFormsRoutes from './routes/lae_forms.routes.js';
import materialRequestsRoutes from './routes/material_requests.routes.js';
import costsRoutes from './routes/costs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import weeklyReportsRoutes from './routes/weekly_reports.routes.js';
import subcontractsRoutes from './routes/subcontracts.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import safetyDelaysRoutes from './routes/safety_delays.routes.js';
import siteProgressRoutes from './routes/site_progress.routes.js';
import materialsReceivedRoutes from './routes/materials_received.routes.js';
import developerFundsRoutes from './routes/developer_funds.routes.js';
import materialExpensesRoutes from './routes/material_expenses.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

// Render & production reverse-proxy support (enables secure cookies over HTTPS)
if (isProd) {
  app.set('trust proxy', 1);
}

// --------------- 1. Serve Static Frontend Files First ---------------
// Static assets (JS, CSS, images) should never be blocked by CORS or session overhead
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// --------------- 2. API Middleware ---------------

app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin with credentials (vital for same-origin and custom Render domains)
    callback(null, true);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Secure Session Configuration using HTTP-only cookies
app.use(session({
  name: 'nasaab.sid',
  secret: process.env.SESSION_SECRET || 'nasaab_dev_session_secret_key_8492048',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents client-side script from accessing session cookie
    secure: isProd, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours session duration
  }
}));

// --------------- Health / Connection Test ---------------

app.get('/api/health', async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: dbStatus.success ? 'healthy' : 'degraded',
    server: 'running',
    database: dbStatus.message,
    timestamp: new Date().toISOString()
  });
});

// --------------- Mount API Routes ---------------

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/lae-forms', laeFormsRoutes);
app.use('/api/material-requests', materialRequestsRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/weekly-reports', weeklyReportsRoutes);
app.use('/api/subcontracts', subcontractsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/safety-delays', safetyDelaysRoutes);
app.use('/api/site-progress', siteProgressRoutes);
app.use('/api/materials-received', materialsReceivedRoutes);
app.use('/api/developer-funds', developerFundsRoutes);
app.use('/api/material-expenses', materialExpensesRoutes);

// --------------- 404 Catch-all for API ---------------

app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// --------------- SPA Client-Side Routing Fallback ---------------

if (fs.existsSync(distPath)) {
  // Guard against sending index.html for non-existent static assets
  app.all('/assets/*', (_req, res) => {
    res.status(404).json({ error: 'Static asset not found' });
  });

  // Client-side SPA routing fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn(`⚠️ Warning: Frontend dist directory not found at: ${distPath}`);
  app.get('*', (_req, res) => {
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Build Required — NASAAB Construction</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f172a;color:#f8fafc;text-align:center;">
          <h1 style="color:#f59e0b;">Frontend Build Not Found</h1>
          <p style="color:#94a3b8;">The compiled frontend bundle was not found in <code>dist/</code>.</p>
          <p style="color:#e2e8f0;margin-top:20px;">Please trigger a manual deploy in Render with <strong>Clear build cache</strong> to compile the frontend assets.</p>
        </body>
      </html>
    `);
  });
}

// --------------- Central Error Handler ---------------

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProd ? 'An unexpected error occurred' : err.message
  });
});

// --------------- Start Server ---------------

app.listen(PORT, async () => {
  console.log(`\n🏗️  NASAAB Construction API Server`);
  console.log(`   Server   : http://localhost:${PORT}`);
  console.log(`   Health   : http://localhost:${PORT}/api/health`);
  console.log(`   Frontend : ${distPath} (${fs.existsSync(distPath) ? '✅ Ready' : '❌ Missing dist/'})`);

  // Verify database on startup
  const db = await testConnection();
  if (db.success) {
    console.log(`   ✅ ${db.message}\n`);
    // Run any pending migrations automatically on startup
    try {
      await runMigrations();
    } catch (migErr) {
      console.error('Migration startup notice:', migErr.message);
    }
  } else {
    console.error(`   ❌ Database connection failed — ${db.message}`);
    console.error(`   Check DATABASE_URL in Render or server/.env.\n`);
  }
});

export default app;
