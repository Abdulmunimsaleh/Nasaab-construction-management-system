import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';

import { ErrorBoundary } from './components/common/ErrorBoundary';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { LabourPage } from './pages/LabourPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EquipmentReportPage } from './pages/EquipmentReportPage';
import { SafetyDelaysPage } from './pages/SafetyDelaysPage';
import { MaterialsReceivedPage } from './pages/MaterialsReceivedPage';
import { MaterialOrderPage } from './pages/MaterialOrderPage';
import { MaterialExpensesPage } from './pages/MaterialExpensesPage';
import { SiteProgressPage } from './pages/SiteProgressPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ErrorBoundary>
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
              
              {/* Labour (Daily & Subcontract PW) */}
              <Route path="/labour" element={<LabourPage />} />
              <Route path="/labour/daily" element={<LabourPage />} />
              <Route path="/labour/subcontract" element={<LabourPage />} />
              
              {/* Site Operations & Intelligence */}
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/equipment-report" element={<EquipmentReportPage />} />
              <Route path="/safety-delays" element={<SafetyDelaysPage />} />
              <Route path="/materials-received" element={<MaterialsReceivedPage />} />
              <Route path="/material-order" element={<MaterialOrderPage />} />
              <Route path="/material-expenses" element={<MaterialExpensesPage />} />
              <Route path="/site-progress" element={<SiteProgressPage />} />

              {/* Materials Requisitions & PDF Reports & Settings */}
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
