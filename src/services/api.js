/**
 * NASAAB Construction — API Service Client
 * 
 * Centralized, secure HTTP communication with Express backend.
 * Uses HTTP-only cookie credentials for session authentication.
 */

const API_BASE = '/api';

/**
 * Core fetch wrapper with JSON serialization, error handling,
 * and credentials: 'include' for session cookies.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || data.error || `HTTP error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const offlineError = new Error('Cannot connect to backend server. Please verify XAMPP MySQL and Express server are running.');
      offlineError.status = 503;
      throw offlineError;
    }
    throw err;
  }
}

export const api = {
  // 1. AUTHENTICATION & SESSION
  auth: {
    getPublicProjects: () => request('/auth/projects'),
    login: (projectId, userId, password) => request('/auth/login', {
      method: 'POST',
      body: { projectId, userId, password }
    }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: () => request('/auth/me'),
    switchProject: (projectId) => request('/auth/switch-project', {
      method: 'POST',
      body: { projectId }
    }),
    activate: (userId, activationToken, newPassword) => request('/auth/activate', {
      method: 'POST',
      body: { userId, activationToken, newPassword }
    }),
    completePasswordSetup: (currentPassword, newPassword) => request('/auth/complete-password-setup', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
  },

  // 2. PROJECTS MANAGEMENT
  projects: {
    getAll: () => request('/projects'),
    getById: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', { method: 'POST', body: data }),
    update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: data }),
    getUsers: (id) => request(`/projects/${id}/users`),
    assignUser: (projectId, userId, role) => request(`/projects/${projectId}/users`, {
      method: 'POST',
      body: { userId, role }
    }),
    createUserAndAssign: (projectId, userData) => request(`/projects/${projectId}/create-user-and-assign`, {
      method: 'POST',
      body: userData
    }),
    removeUser: (projectId, userId) => request(`/projects/${projectId}/users/${userId}`, {
      method: 'DELETE'
    })
  },

  // 3. USER MANAGEMENT (Admin & Director)
  users: {
    getAll: () => request('/users'),
    create: (data) => request('/users', { method: 'POST', body: data }),
    update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
    resetActivation: (id) => request(`/users/${id}/reset-activation`, { method: 'POST' }),
    updateMyProfile: (data) => request('/users/profile/me', { method: 'PUT', body: data }),
    changePassword: (data) => request('/users/change-password', { method: 'POST', body: data })
  },

  // 4. LABOUR, ACTIVITY & EQUIPMENT FORMS
  laeForms: {
    getAll: (projectId) => request(`/lae-forms${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    getById: (id) => request(`/lae-forms/${id}`),
    create: (data) => request('/lae-forms', { method: 'POST', body: data }),
    update: (id, data) => request(`/lae-forms/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/lae-forms/${id}`, { method: 'DELETE' })
  },

  // 5. MATERIAL NEEDED FORMS (REQUESTS)
  materialRequests: {
    getAll: (projectId) => request(`/material-requests${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    getById: (id) => request(`/material-requests/${id}`),
    create: (data) => request('/material-requests', { method: 'POST', body: data }),
    update: (id, data) => request(`/material-requests/${id}`, { method: 'PUT', body: data }),
    updateStatus: (id, status) => request(`/material-requests/${id}/status`, {
      method: 'PUT',
      body: { status }
    }),
    delete: (id) => request(`/material-requests/${id}`, { method: 'DELETE' })
  },

  // 6. FINANCIAL COSTS (Admin, Director, Partner)
  costs: {
    getAll: (projectId) => request(`/costs${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/costs', { method: 'POST', body: data })
  },

  // 7. COMPANY SETTINGS
  settings: {
    getCompany: () => request('/settings/company'),
    updateCompany: (data) => request('/settings/company', { method: 'PUT', body: data }),
    getNotifications: () => request('/settings/notifications')
  },

  // 8. WEEKLY REPORTS (Full, LAE, Materials)
  weeklyReports: {
    getAll: (projectId, reportType) => request(`/weekly-reports?projectId=${encodeURIComponent(projectId)}${reportType ? `&reportType=${encodeURIComponent(reportType)}` : ''}`),
    getWeeks: (projectId) => request(`/weekly-reports/weeks?projectId=${encodeURIComponent(projectId)}`),
    getData: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/weekly-reports/data?${q}`);
    },
    save: (data) => request('/weekly-reports/save', { method: 'POST', body: data })
  }
};

export default api;
