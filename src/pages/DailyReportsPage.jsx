import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DataTable } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DailyReportDetailModal } from '../components/dailyReports/DailyReportDetailModal';
import { CreateDailyReportModal } from '../components/dailyReports/CreateDailyReportModal';
import { formatDate } from '../utils/formatters';
import { canUserEditReport, isReportWithin24Hours, isForemanRole } from '../utils/auth';
import {
  FileSpreadsheet,
  Plus,
  CloudSun,
  Users,
  Truck,
  Eye,
  CheckCircle2,
  Pencil,
  Lock
} from 'lucide-react';

export const DailyReportsPage = () => {
  const { onOpenDailyReport } = useOutletContext();
  const { filteredDailyReports, projects, currentUser } = useApp();
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  const columns = [
    {
      header: 'Date & ID',
      accessor: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{formatDate(row.date)}</span>
          <span className="text-[10px] font-mono text-slate-400">{row.id}</span>
        </div>
      )
    },
    {
      header: 'Project Name',
      accessor: (row) => (
        <span className="font-semibold text-slate-800 line-clamp-1 max-w-[190px]">
          {row.projectName}
        </span>
      )
    },
    {
      header: 'Weather',
      accessor: (row) => (
        <span className="flex items-center gap-1.5 text-slate-600">
          <CloudSun className="h-4 w-4 text-amber-500 shrink-0" />
          <span>{row.weather}</span>
        </span>
      )
    },
    {
      header: 'Workforce',
      accessor: (row) => (
        <span className="flex items-center gap-1 font-semibold text-slate-800">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          <span>{row.workersPresent} Workers</span>
        </span>
      )
    },
    {
      header: 'Machinery Hours',
      accessor: (row) => (
        <span className="flex items-center gap-1 font-mono text-slate-700">
          <Truck className="h-3.5 w-3.5 text-violet-500" />
          <span>{row.equipmentOperatingHours} hrs</span>
        </span>
      )
    },
    {
      header: 'Reported Progress',
      accessor: (row) => (
        <span className="font-bold font-mono text-amber-600">
          {row.overallProgress}%
        </span>
      )
    },
    {
      header: 'Supervisor',
      accessor: (row) => (
        <span className="text-slate-600 truncate block max-w-[120px]">
          {row.submittedBy}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (row) => {
        const canEdit = canUserEditReport(currentUser?.role, row);
        const isForeman = isForemanRole(currentUser?.role);
        const within24h = isReportWithin24Hours(row);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {canEdit ? (
              <button
                onClick={() => setEditingReport(row)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-400 hover:text-amber-800 px-2.5 py-1.5 font-bold text-slate-700 transition-colors shadow-xs"
                title="Edit this report"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-600" />
                <span>Edit</span>
              </button>
            ) : isForeman && !within24h ? (
              <button
                disabled
                className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-400 cursor-not-allowed opacity-60"
                title="Editing locked: The 24-hour editing window for Foremen has expired for this report."
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Edit</span>
              </button>
            ) : null}

            <button
              onClick={() => setSelectedReport(row)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 px-2.5 py-1.5 font-bold text-slate-800 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Review</span>
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="h-7 w-7 text-amber-500" />
            <span>Daily Site Reports</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive daily site logs capturing progress, labour headcounts, machinery hours, weather & delays
          </p>
        </div>

        <button
          onClick={onOpenDailyReport}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>+ Create Daily Report</span>
        </button>
      </div>

      {/* Main Table with Filters */}
      <DataTable
        columns={columns}
        data={filteredDailyReports}
        searchPlaceholder="Search daily reports by project, author, or notes..."
        searchField={['projectName', 'submittedBy', 'workDoneToday', 'workCompletedYesterday']}
        filters={[
          {
            label: 'Status',
            key: 'status',
            options: ['Submitted', 'Approved', 'Draft', 'Rejected']
          }
        ]}
        mobileCardRenderer={(item) => (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900">{formatDate(item.date)}</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="font-semibold text-slate-800">{item.projectName}</div>
            <div className="text-slate-600 line-clamp-2">{item.workDoneToday || item.workCompletedYesterday}</div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-500">{item.workersPresent} workers • {item.equipmentOperatingHours}h plant</span>
              <div className="flex items-center gap-2">
                {canUserEditReport(currentUser?.role, item) ? (
                  <button
                    onClick={() => setEditingReport(item)}
                    className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-amber-600"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                    <span>Edit</span>
                  </button>
                ) : isForemanRole(currentUser?.role) && !isReportWithin24Hours(item) ? (
                  <span
                    className="inline-flex items-center gap-1 text-slate-400 text-[11px] cursor-not-allowed opacity-60"
                    title="Editing locked: 24-hour editing window has expired"
                  >
                    <Lock className="h-3 w-3 text-slate-400" />
                    <span>Locked (&gt;24h)</span>
                  </span>
                ) : null}
                <button
                  onClick={() => setSelectedReport(item)}
                  className="font-bold text-amber-600 hover:text-amber-700"
                >
                  Review Report →
                </button>
              </div>
            </div>
          </div>
        )}
      />

      {/* Report Detail Modal with Sign-off and PDF Export */}
      <DailyReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onEdit={(rep) => {
          setSelectedReport(null);
          setEditingReport(rep);
        }}
      />

      {/* Edit Daily Report Modal */}
      {editingReport && (
        <CreateDailyReportModal
          isOpen={!!editingReport}
          onClose={() => setEditingReport(null)}
          reportToEdit={editingReport}
        />
      )}
    </div>
  );
};
