import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Building,
  Users,
  Shield,
  FileText,
  Bell,
  User,
  Key,
  RotateCcw,
  CheckCircle2,
  HardHat,
  Save
} from 'lucide-react';

export const SettingsPage = () => {
  const {
    companySettings,
    setCompanySettings,
    currentUser,
    updateUserProfile,
    switchRole,
    resetToDemoData,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('company');

  // Local form states
  const [companyForm, setCompanyForm] = useState(companySettings);
  const [userForm, setUserForm] = useState(currentUser);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompanySettings(companyForm);
    addToast('Company profile settings saved!');
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    updateUserProfile(userForm);
  };

  const handleSaveSecurity = (e) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    addToast('Security password updated successfully!');
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building },
    { id: 'users-roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'profile', label: 'User Profile & EBK License', icon: User },
    { id: 'reports', label: 'Report Settings', icon: FileText },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Key }
  ];

  const rolesMatrix = [
    { role: 'Admin', desc: 'Full system control, financial budgets, project archives and settings', scope: 'Full Access' },
    { role: 'Project Manager', desc: 'Manage assigned sites, schedule approvals, cost oversight', scope: 'Project Scoped' },
    { role: 'Site Engineer', desc: 'Create daily reports, inspect rebar, log plant hours, QA check', scope: 'Technical Field' },
    { role: 'Foreman', desc: 'Take daily attendance, submit site diaries, upload photos', scope: 'Shift Execution' },
    { role: 'Quantity Surveyor', desc: 'Procurement bills, material ledger, financial variance audit', scope: 'Financial/BOQ' },
    { role: 'Worker', desc: 'View attendance records and personal shift rosters', scope: 'Read Only' }
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
            Configure contractor accreditation, company details, user permissions, and report headers
          </p>
        </div>

        <button
          onClick={resetToDemoData}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RotateCcw className="h-4 w-4 text-amber-600" />
          <span>Reset Initial Kenyan Data</span>
        </button>
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
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
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
                  Details printed on formal engineering dossiers, invoices, and PDF site diaries
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
                    value={companyForm.companyName}
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
                      value={companyForm.ncaRegistration}
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
                      value={companyForm.taxPin}
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
                    value={companyForm.address}
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
                      value={companyForm.phone}
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
                      value={companyForm.email}
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
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Company Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ROLES & PERMISSIONS */}
          {activeTab === 'users-roles' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Roles & Access Control Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Test different site permission levels live in BuildTrack
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Active: {currentUser.role}
                </span>
              </div>

              <div className="space-y-3">
                {rolesMatrix.map((rm) => (
                  <div
                    key={rm.role}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      currentUser.role === rm.role
                        ? 'border-amber-400 bg-amber-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{rm.role}</h4>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                          {rm.scope}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{rm.desc}</p>
                    </div>

                    <button
                      onClick={() => switchRole(rm.role)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        currentUser.role === rm.role
                          ? 'bg-amber-500 text-slate-950 cursor-default'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {currentUser.role === rm.role ? 'Current Active' : 'Switch Role'}
                    </button>
                  </div>
                ))}
              </div>
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
                  Personal sign-off credentials for site reports and project authorization
                </p>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                <div className="flex items-center gap-4">
                  <img
                    src={userForm.avatar}
                    alt={userForm.name}
                    className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />
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
                      value={userForm.name}
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
                      required
                      value={userForm.email}
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
                      value={userForm.licenseNo}
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
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
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
                <p className="text-slate-500">Settings for automated document generation</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Include Official Company Stamp & Banner</h4>
                    <p className="text-[11px] text-slate-500">Render high-res NCA accreditation header on page 1</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Include Weather History In Reports</h4>
                    <p className="text-[11px] text-slate-500">Print daily rainfall and temperature for delay justification</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Watermark Draft Reports</h4>
                    <p className="text-[11px] text-slate-500">Show diagonal "DRAFT - NOT SIGNED" until approved by PM</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Site Alerts & Notification Preferences
                </h3>
                <p className="text-slate-500">Configure instant threshold alerts</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Low Material Stock Alerts</h4>
                    <p className="text-[11px] text-slate-500">Trigger alert when inventory drops below safety minimum</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Critical HSE & Defect Notifications</h4>
                    <p className="text-[11px] text-slate-500">Immediate push notice when critical safety hazard logged</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900">Budget Overrun Warnings</h4>
                    <p className="text-[11px] text-slate-500">Alert managers when project cost reaches 90% of contract ceiling</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Security, Passwords & Access Token
                </h3>
                <p className="text-slate-500">Manage login credentials and two-factor safety</p>
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
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
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
                  className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  Change Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
