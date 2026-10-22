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
    login: (arg1, arg2, arg3) => {
      let body;
      if (arg3 !== undefined) {
        // Legacy call: login(projectId, userId, password)
        body = { projectId: arg1, userId: arg2, password: arg3 };
      } else {
        // Direct call: login(userId, password)
        body = { userId: arg1, password: arg2 };
      }
      return request('/auth/login', {
        method: 'POST',
        body
      });
    },
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
  },

  // 9. SUBCONTRACT PIECE WORK & PAYMENTS
  subcontracts: {
    getAgreements: (projectId) => request(`/subcontracts/agreements${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    createAgreement: (data) => request('/subcontracts/agreements', { method: 'POST', body: data }),
    updateAgreement: (id, data) => request(`/subcontracts/agreements/${id}`, { method: 'PUT', body: data }),
    deleteAgreement: (id) => request(`/subcontracts/agreements/${id}`, { method: 'DELETE' }),
    getPayments: (projectId) => request(`/subcontracts/payments${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    createPayment: (data) => request('/subcontracts/payments', { method: 'POST', body: data }),
    deletePayment: (id) => request(`/subcontracts/payments/${id}`, { method: 'DELETE' })
  },

  // 10. EQUIPMENT INVENTORY & EXPENSES
  equipment: {
    getAll: (projectId) => request(`/equipment${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/equipment', { method: 'POST', body: data }),
    delete: (id) => request(`/equipment/${id}`, { method: 'DELETE' }),
    getExpenses: (projectId) => request(`/equipment/expenses${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    createExpense: (data) => request('/equipment/expenses', { method: 'POST', body: data }),
    deleteExpense: (id) => request(`/equipment/expenses/${id}`, { method: 'DELETE' })
  },

  // 11. SAFETY, DELAYS & VISITORS
  safetyDelays: {
    getAll: (projectId) => request(`/safety-delays${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/safety-delays', { method: 'POST', body: data }),
    update: (id, data) => request(`/safety-delays/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/safety-delays/${id}`, { method: 'DELETE' })
  },

  // 12. SITE PROGRESS & CUSTOM ACTIVITIES
  siteProgress: {
    getAll: (projectId) => request(`/site-progress${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/site-progress', { method: 'POST', body: data }),
    delete: (id) => request(`/site-progress/${id}`, { method: 'DELETE' }),
    getCategories: () => request('/site-progress/categories'),
    createCategory: (name) => request('/site-progress/categories', { method: 'POST', body: { name } })
  },

  // 13. MATERIALS RECEIVED
  materialsReceived: {
    getAll: (projectId) => request(`/materials-received${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/materials-received', { method: 'POST', body: data }),
    delete: (id) => request(`/materials-received/${id}`, { method: 'DELETE' })
  },

  // 14. DEVELOPER FUNDS
  developerFunds: {
    getAll: (projectId) => request(`/developer-funds${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/developer-funds', { method: 'POST', body: data }),
    update: (id, data) => request(`/developer-funds/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/developer-funds/${id}`, { method: 'DELETE' })
  },

  // 15. MATERIAL EXPENSES
  materialExpenses: {
    getAll: (projectId) => request(`/material-expenses${projectId && projectId !== 'all' ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    create: (data) => request('/material-expenses', { method: 'POST', body: data }),
    update: (id, data) => request(`/material-expenses/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/material-expenses/${id}`, { method: 'DELETE' })
  }
};

export default api;

