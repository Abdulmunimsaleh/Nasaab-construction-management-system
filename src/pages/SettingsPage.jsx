import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import {
  Settings,
  Building,
  Shield,
  FileText,
  Bell,
  User,
  Key,
  Save,
  Lock,
  Layers,
  CheckCircle2,
  Users as UsersIcon,
  HardHat
} from 'lucide-react';

export const SettingsPage = () => {
  const {
    companySettings,
    setCompanySettings,
    currentUser,
    updateUserProfile,
    isForeman,
    isStoreKeeper,
    isAdmin,
    isDirector,
    addToast
  } = useApp();

  const isLimitedUser = isForeman || isStoreKeeper;

  const [activeTab, setActiveTab] = useState(isLimitedUser ? 'profile' : 'company');

  // If user role changes/loads, ensure limited user starts on profile
  useEffect(() => {
    if (isLimitedUser && (activeTab === 'company' || activeTab === 'users-roles')) {
      setActiveTab('profile');
    }
  }, [isLimitedUser, activeTab]);

  // Local form states
  const [companyForm, setCompanyForm] = useState(companySettings || {});
  const [userForm, setUserForm] = useState(currentUser || {});
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setCompanyForm(companySettings);
    }
  }, [companySettings]);

  useEffect(() => {
    if (currentUser) {
      setUserForm(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if ((isAdmin || isDirector) && activeTab === 'users-roles') {
      fetchUsers();
    }
  }, [activeTab, isAdmin, isDirector]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.users.list();
      setSystemUsers(res.data?.users || []);
    } catch (err) {
      // Non-critical, ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      await api.settings.updateCompany(companyForm);
      setCompanySettings(companyForm);
      addToast('Company profile settings saved to database!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save company settings', 'error');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(userForm);
    } catch (err) {
      // Toast handled in context
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      addToast('New password and confirm password do not match.', 'error');
      return;
    }
    if (securityForm.newPassword.length < 8) {
      addToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    setIsSavingSecurity(true);
    try {
      await api.users.changePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword
      });
      addToast('Security password updated successfully in database!', 'success');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.message || 'Failed to update password. Please check your current password.', 'error');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const allTabs = [
    { id: 'company', label: 'Company Profile', icon: Building, privilegedOnly: true },
    { id: 'users-roles', label: 'Roles & Access Matrix', icon: Shield, privilegedOnly: true },
    { id: 'profile', label: 'User Profile & EBK License', icon: User },
    { id: 'reports', label: 'Report Settings', icon: FileText, privilegedOnly: true },
    { id: 'security', label: 'Security & Password', icon: Key }
  ];

  const tabs = isLimitedUser
    ? allTabs.filter(t => !t.privilegedOnly)
    : allTabs;

  const rolesMatrix = [
    {
      role: 'Admin',
      scope: 'Global System Control',
      badge: 'bg-rose-100 text-rose-800',
      desc: 'Full system-wide access to every project and module. Can create projects, manage users, modify assignments, and manage all forms, costs, and audit settings.'
    },
    {
      role: 'Director',
      scope: 'Global Executive Oversight',
      badge: 'bg-purple-100 text-purple-800',
      desc: 'Same global access as Admin: creates projects, provisions users, assigns project memberships, and monitors construction diaries and cost summaries.'
    },
    {
      role: 'Partner',
      scope: 'Assigned Project Isolation',
      badge: 'bg-blue-100 text-blue-800',
      desc: 'Full access to available modules strictly within their assigned project(s). Cannot view, create, or alter records for unassigned sites.'
    },
    {
      role: 'Storekeeper',
      scope: 'Stores & Material Requisitions',
      badge: 'bg-emerald-100 text-emerald-800',
      desc: 'Permitted exclusively to Material Needed forms within their assigned project. Strictly blocked from Labour, Equipment, Costs, and Admin controls.'
    },
    {
      role: 'Foreman',
      scope: 'Site Shift Operations',
      badge: 'bg-amber-100 text-amber-800',
      desc: 'Permitted exclusively to Labour, Activity, and Equipment forms within their assigned project. Strictly blocked from Materials, Costs, and Admin controls.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-amber-500" />
            <span>Platform & Company Settings</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise database parameters, role security boundaries, and engineering profile
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Tabs */}
        <div className="lg:col-span-1 space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tab Content Body */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: COMPANY PROFILE */}
          {activeTab === 'company' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Registered Construction Enterprise Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Details stored in MySQL and printed on engineering reports and PDF exports
                </p>
              </div>

              <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    Company Registered Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.companyName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      National Construction Authority (NCA) Class
                    </label>
                    <input
                      type="text"
                      value={companyForm.ncaRegistration || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, ncaRegistration: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      KRA Tax PIN
                    </label>
                    <input
                      type="text"
                      value={companyForm.taxPin || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, taxPin: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    Physical Headquarters Address
                  </label>
                  <input
                    type="text"
                    value={companyForm.address || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={companyForm.phone || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyForm.email || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Base Currency
                    </label>
                    <input
                      type="text"
                      disabled
                      value="KES (Kenyan Shilling)"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-slate-600 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingCompany}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSavingCompany ? 'Saving...' : 'Save Company Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
          {activeTab === 'users-roles' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Role-Based Access Control Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Strict database-enforced permissions governing projects, forms, and authorization barriers
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Your Role: {currentUser?.role}
                </span>
              </div>

              <div className="space-y-3">
                {rolesMatrix.map((rm) => (
                  <div
                    key={rm.role}
                    className={`p-4 rounded-xl border transition-all ${
                      currentUser?.role === rm.role
                        ? 'border-amber-400 bg-amber-50/40 shadow-2xs'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-bold text-sm text-slate-900">{rm.role}</h4>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${rm.badge}`}>
                          {rm.scope}
                        </span>
                      </div>
                      {currentUser?.role === rm.role && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active Account</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{rm.desc}</p>
                  </div>
                ))}
              </div>

              {/* Database User Directory for Admins/Directors */}
              {(currentUser?.role === 'Admin' || currentUser?.role === 'Director') && (
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        MySQL System Users Directory
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Real user accounts retrieved from MySQL database
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {systemUsers.length} Registered Accounts
                    </span>
                  </div>

                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading users from MySQL...</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-2.5">User</th>
                            <th className="px-3.5 py-2.5">User ID / Username</th>
                            <th className="px-3.5 py-2.5">Role</th>
                            <th className="px-3.5 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {systemUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/70">
                              <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                {u.full_name || u.name}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-600">
                                {u.username}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  u.role === 'Admin' ? 'bg-rose-100 text-rose-800' :
                                  u.role === 'Director' ? 'bg-purple-100 text-purple-800' :
                                  u.role === 'Partner' ? 'bg-blue-100 text-blue-800' :
                                  u.role === 'Storekeeper' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USER PROFILE */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  User Profile & Engineers Board of Kenya (EBK) Credentials
                </h3>
                <p className="text-xs text-slate-500">
                  Personal credentials stored in MySQL and used for site authorizations
                </p>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-xl flex items-center justify-center border border-amber-300 shadow-2xs">
                    {userForm.name ? userForm.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{userForm.name}</h4>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      {userForm.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.name || ''}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={userForm.email || ''}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      EBK / BORAQS License Registration #
                    </label>
                    <input
                      type="text"
                      value={userForm.licenseNo || ''}
                      onChange={(e) => setUserForm({ ...userForm, licenseNo: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700">
                      Direct Mobile Phone
                    </label>
                    <input
                      type="tel"
                      value={userForm.phone || ''}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>Update Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: REPORT SETTINGS */}
          {activeTab === 'reports' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  PDF Layout & Formatting Parameters
                </h3>
                <p className="text-slate-500">Settings for automated PDF document generation</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Include Official Company Stamp & Banner</h4>
                    <p className="text-[11px] text-slate-500">Render high-resolution NCA accreditation header on page 1</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Include Weather History In Site Summaries</h4>
                    <p className="text-[11px] text-slate-500">Print recorded rainfall and temperature in LAE site summaries</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Security, Passwords & Access Token
                </h3>
                <p className="text-slate-500">
                  Update your MySQL database password securely using bcrypt hashing
                </p>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-3 max-w-md">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    New Security Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSecurity}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingSecurity ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
