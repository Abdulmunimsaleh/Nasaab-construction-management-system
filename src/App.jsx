import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DailyReportsPage } from './pages/DailyReportsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Application Workspace Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/daily-reports" element={<DailyReportsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
