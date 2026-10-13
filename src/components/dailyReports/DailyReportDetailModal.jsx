import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { generateConstructionReportPDF } from '../../utils/pdfGenerator';
import { formatKES } from '../../utils/formatters';
import { canUserEditReport, canAccessCosts } from '../../utils/auth';
import {
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCheck,
  Camera,
  Image,
  X,
  HardHat,
  Users,
  Truck,
  Boxes,
  Pencil
} from 'lucide-react';

export const DailyReportDetailModal = ({ isOpen, onClose, report, onEdit }) => {
  const {
    projects,
    approveDailyReport,
    rejectDailyReport,
    currentUser,
    companySettings
  } = useApp();

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const canViewCosts = canAccessCosts(currentUser?.role);

  if (!report) return null;

  const project = projects.find((p) => p.id === report.projectId);

  const handleExportPDF = () => {
    const doc = generateConstructionReportPDF({
      project,
      reportType: 'Daily Site Report',
      dateRange: report.date,
      companySettings,
      author: report.submittedBy,
      userRole: currentUser.role,
      data: {
        dailyReport: report,
        workersCount: report.workersPresent,
        materialsCount: (report.materialsSummary && report.materialsSummary.length) || 0,
        equipmentCount: (report.equipmentSummary && report.equipmentSummary.length) || 0,
        issuesCount: 0
      }
    });
    doc.save(`Daily_Report_${report.projectId}_${report.date}.pdf`);
  };

  const handlePrint = () => {
    const doc = generateConstructionReportPDF({
      project,
      reportType: 'Daily Site Report',
      dateRange: report.date,
      companySettings,
      author: report.submittedBy,
      userRole: currentUser.role,
      data: {
        dailyReport: report,
        workersCount: report.workersPresent,
        materialsCount: (report.materialsSummary && report.materialsSummary.length) || 0,
        equipmentCount: (report.equipmentSummary && report.equipmentSummary.length) || 0,
        issuesCount: 0
      }
    });
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  const reportPhotos = report.photos || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Daily Site Report #${report.id}`}
      subtitle={`${report.date} • ${report.projectName}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-amber-600" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              Print
            </button>
            {onEdit && canUserEditReport(currentUser?.role, report) && (
              <button
                onClick={() => onEdit(report)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-800 transition-colors"
              >
                <Pencil className="h-4 w-4 text-amber-600" />
                Edit Report
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {report.status !== 'Approved' && (currentUser.role === 'Admin' || currentUser.role === 'Project Manager') && (
              <>
                <button
                  onClick={() => {
                    rejectDailyReport(report.id, 'Revision requested by Project Manager');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    approveDailyReport(report.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Sign & Approve
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={report.status} size="md" />
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> {report.date}
            </span>
            {report.day && (
              <span className="rounded-lg bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold">
                {report.day}
              </span>
            )}
          </div>
          <div className="text-slate-500 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            Submitted by: <strong className="text-slate-800">{report.submittedBy}</strong>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase text-slate-400">Estimated Site Progress</span>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${report.overallProgress || 0}%` }}
              />
            </div>
            <span className="font-bold text-amber-600 text-sm min-w-[3.5rem] text-right">
              {report.overallProgress || 0}%
            </span>
          </div>
        </div>

        {/* Site Location */}
        {report.location && (
          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200/70 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Site Location</span>
            <span className="text-xs font-semibold text-slate-700">{report.location}</span>
          </div>
        )}

        {/* Labour & Workforce Breakdown */}
        {report.labourCategories && report.labourCategories.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Labour & Workforce Breakdown
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">
                  Total Workers: <strong className="text-slate-900">{report.workersPresent}</strong>
                </span>
                {report.totalLabourCost !== undefined && (
                  <span className="text-slate-500">
                    Est. Daily Cost: <strong className="text-emerald-600">{formatKES(report.totalLabourCost)}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">Trade / Category</th>
                    <th className="px-2 py-2 text-center">Foreman</th>
                    <th className="px-2 py-2 text-center">Skilled</th>
                    <th className="px-2 py-2 text-center">Helpers</th>
                    <th className="px-2 py-2 text-center">Total Headcount</th>
                    <th className="px-3 py-2 text-center">Fixed Rates (F / S / H)</th>
                    <th className="px-3 py-2 text-right">Est. Daily Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.labourCategories.map((cat, i) => {
                    const fRate = Number(cat.foremanRate) || 1500;
                    const sRate = Number(cat.skilledRate) || 1000;
                    const hRate = Number(cat.helperRate) || 500;
                    const rowCost = cat.cost ?? (
                      (Number(cat.foremanCount) || 0) * fRate +
                      (Number(cat.skilledCount) || 0) * sRate +
                      (Number(cat.unskilledCount) || 0) * hRate
                    );
                    const headcount = cat.headcount ?? (
                      (Number(cat.foremanCount) || 0) +
                      (Number(cat.skilledCount) || 0) +
                      (Number(cat.unskilledCount) || 0)
                    );
                    return (
                      <tr key={cat.id || i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-semibold text-slate-800">{cat.tradeName || 'General Trade'}</td>
                        <td className="px-2 py-2 text-center text-slate-600 font-mono">{cat.foremanCount || 0}</td>
                        <td className="px-2 py-2 text-center text-slate-600 font-mono">{cat.skilledCount || 0}</td>
                        <td className="px-2 py-2 text-center text-slate-600 font-mono">{cat.unskilledCount || 0}</td>
                        <td className="px-2 py-2 text-center font-bold text-amber-600">
                          {headcount}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-700 bg-slate-50/50">
                          KES {fRate.toLocaleString()} / {sRate.toLocaleString()} / {hRate.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                          {formatKES(rowCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Category-by-Category Trade Work Activities */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Trade Work Activities & Tomorrow's Plan
              </h5>
              <div className="grid grid-cols-1 gap-2.5">
                {report.labourCategories.map((cat, i) => (
                  <div key={cat.id || i} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        {cat.tradeName || 'General Trade'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {cat.headcount ?? ((cat.foremanCount || 0) + (cat.skilledCount || 0) + (cat.unskilledCount || 0))} workers deployed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                          Work Done Today
                        </span>
                        <p className="text-slate-800 leading-relaxed font-sans text-xs">
                          {cat.workDoneToday || cat.workCompletedYesterday || 'No trade activities recorded.'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Work Plan Tomorrow
                        </span>
                        <p className="text-slate-700 leading-relaxed font-sans text-xs">
                          {cat.workPlanTomorrow || cat.plannedWork || 'Follow standard master schedule.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <HardHat className="h-3.5 w-3.5 text-amber-500" /> Site Workforce Present:
              </span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {report.workersPresent || 0} Workers
              </span>
            </div>
            {(report.workDoneToday || report.workCompletedYesterday || report.workPlanTomorrow || report.plannedWork) && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                      Work Done Today
                    </span>
                    <p className="text-slate-800 leading-relaxed font-sans text-xs">
                      {report.workDoneToday || report.workCompletedYesterday || 'No trade activities recorded.'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Work Plan Tomorrow
                    </span>
                    <p className="text-slate-700 leading-relaxed font-sans text-xs">
                      {report.workPlanTomorrow || report.plannedWork || 'Follow standard master schedule.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plant & Equipment Breakdown */}
        {report.plantAndEquipment && report.plantAndEquipment.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-500" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Plant & Equipment Breakdown
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">
                  Operating Hours: <strong className="text-slate-900">{report.equipmentOperatingHours || 0} hrs</strong>
                </span>
                {report.totalEquipmentCost > 0 && (
                  <span className="text-slate-500">
                    Total Machine Expense: <strong className="text-emerald-600">{formatKES(report.totalEquipmentCost)}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {report.plantAndEquipment.map((eq, i) => (
                <div key={eq.id || i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{eq.machineName || 'Equipment'}</span>
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      {eq.status || 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                    <div>Fuel: <strong className="text-slate-800">{eq.fuelQty || 0} mm</strong></div>
                    <div>Oil: <strong className="text-slate-800">{eq.oilQty || 0} mm</strong></div>
                    <div>Fuel Cost: <strong className="text-slate-800">{formatKES(eq.fuelCost || 0)}</strong></div>
                    <div>Operator Cost: <strong className="text-slate-800">{formatKES(eq.operatorCost || 0)}</strong></div>
                  </div>

                  {((eq.repairCost > 0) || (eq.mechanicCost > 0) || (eq.transportCost > 0)) && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 border-t border-slate-200/50 pt-1.5">
                      <div>Repair: <strong className="text-slate-800">{formatKES(eq.repairCost || 0)}</strong></div>
                      <div>Mechanic: <strong className="text-slate-800">{formatKES(eq.mechanicCost || 0)}</strong></div>
                      <div>Transport: <strong className="text-slate-800">{formatKES(eq.transportCost || 0)}</strong></div>
                    </div>
                  )}

                  {eq.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-md border border-slate-200/60">
                      {eq.notes}
                    </p>
                  )}

                  <div className="text-right pt-0.5 text-[11px]">
                    <span className="text-slate-500">Machine Expense: </span>
                    <strong className="text-slate-900 font-mono font-bold">
                      {formatKES(eq.totalExpense || ((eq.fuelCost || 0) + (eq.operatorCost || 0) + (eq.repairCost || 0) + (eq.mechanicCost || 0) + (eq.transportCost || 0)))}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : report.equipmentSummary && report.equipmentSummary.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Equipment & Machinery on Site
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {report.equipmentSummary.map((eq, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-800">{eq.name}</span>
                  <span className="text-slate-500 font-mono">{eq.hours} hrs</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Materials & Deliveries Breakdown */}
        {(report.materialsReceivedToday || report.materialsNeededTomorrow || (report.materialsSummary && report.materialsSummary.length > 0)) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Materials & Deliveries
              </h4>
            </div>

            {report.materialsReceivedToday && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Materials Received Today
                </span>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/70 text-slate-800 text-xs leading-relaxed">
                  {report.materialsReceivedToday}
                </div>
              </div>
            )}

            {report.materialsNeededTomorrow && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Materials Needed Tomorrow
                </span>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/70 text-slate-800 text-xs leading-relaxed">
                  {report.materialsNeededTomorrow}
                </div>
              </div>
            )}

            {(!report.materialsReceivedToday && !report.materialsNeededTomorrow && report.materialsSummary && report.materialsSummary.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {report.materialsSummary.map((m, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-xs">
                    <span className="font-semibold text-slate-800 block">{m.name}</span>
                    <span className="text-[11px] text-amber-600 font-medium">{m.qty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Narrative Details */}
        <div className="space-y-3">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Delays,Issues & Safety Incidents
            </h4>
            <div className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-slate-700 leading-relaxed">
              {report.delaysAndSafetyIncidents ||
                (report.delaysForYesterday && report.safetyIncidents && report.delaysForYesterday !== report.safetyIncidents
                  ? `Delays: ${report.delaysForYesterday} • Safety: ${report.safetyIncidents}`
                  : report.delaysForYesterday || report.safetyIncidents || 'None recorded.')}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Site Visitors & Client Reps
            </h4>
            <div className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-slate-700">
              {report.visitorInformation || 'No visitors recorded.'}
            </div>
          </div>

          {report.generalNotes && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                General Engineer Remarks / Instructions
              </h4>
              <div className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-slate-700">
                {report.generalNotes}
              </div>
            </div>
          )}
        </div>

        {/* ── Site Photos Section ── */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-amber-50/30 p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Site Photos
            {reportPhotos.length > 0 && (
              <span className="ml-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {reportPhotos.length}
              </span>
            )}
          </h4>

          {reportPhotos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {reportPhotos.map((photo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name || `Site photo ${index + 1}`}
                      className="w-full h-28 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium truncate">
                        {photo.name || `Photo ${index + 1}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Full-size photo lightbox */}
              {selectedPhoto && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                  <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={selectedPhoto.dataUrl}
                      alt={selectedPhoto.name || 'Site photo'}
                      className="w-full h-full object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {selectedPhoto.name && (
                      <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                        <p className="text-xs text-white font-medium">{selectedPhoto.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 text-slate-400">
              <Image className="w-8 h-8 mb-1.5 opacity-40" />
              <p className="text-[11px] font-medium">No photos attached to this report</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
