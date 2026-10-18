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

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Render & production reverse-proxy support (enables secure cookies over HTTPS)
if (isProd) {
  app.set('trust proxy', 1);
}

// --------------- Middleware ---------------

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // In production same-origin requests or allowed local origins
    if (!origin || allowedOrigins.includes(origin) || isProd) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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

// --------------- 404 Catch-all for API ---------------

app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// --------------- Serve Frontend SPA in Production ---------------

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
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
  console.log(`   Server  : http://localhost:${PORT}`);
  console.log(`   Health  : http://localhost:${PORT}/api/health`);

  // Verify database on startup
  const db = await testConnection();
  if (db.success) {
    console.log(`   ✅ Database connected — ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
    // Run any pending migrations automatically on startup
    try {
      await runMigrations();
    } catch (migErr) {
      console.error('Migration startup notice:', migErr.message);
    }
  } else {
    console.error(`   ❌ Database connection failed — ${db.message}`);
    console.error(`   Make sure XAMPP MySQL is running and credentials in server/.env are correct.\n`);
  }
});

export default app;
