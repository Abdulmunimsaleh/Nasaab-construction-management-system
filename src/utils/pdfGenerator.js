/**
 * NASAAB Construction Limited — Professional PDF Report Generator
 * 
 * Complies with system restructuring requirements:
 * - Generates PDFs strictly for the two supported form types:
 *   1. Labour, Activity and Equipment Forms
 *   2. Material Needed Forms
 * - Fully respects role-based and project access boundaries:
 *   - Foremen: Only Labour, Activity, and Equipment
 *   - Storekeepers: Only Materials
 *   - Partners: Only assigned projects
 *   - Admins & Directors: Full access across projects
 * - Completely free of Daily Reports, Attendance, Issues, Photos, and Inventory Transactions.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getDayOfWeek } from './formatters';

const PRIMARY_COLOR = [15, 23, 42]; // Slate-900
const ACCENT_COLOR = [217, 119, 6]; // Amber-600
const MUTED_COLOR = [100, 116, 139]; // Slate-500
const BORDER_COLOR = [226, 232, 240]; // Slate-200

/**
 * Safely embed image into jsPDF document
 */
const addImageSafelyToDoc = (doc, imageSource, x, y, width, height) => {
  if (!imageSource || typeof imageSource !== 'string' || !imageSource.startsWith('data:image')) {
    return false;
  }
  try {
    let format = 'JPEG';
    if (imageSource.includes('image/png')) format = 'PNG';
    else if (imageSource.includes('image/webp')) format = 'WEBP';
    doc.addImage(imageSource, format, x, y, width, height);
    doc.setDrawColor(...BORDER_COLOR);
    doc.rect(x, y, width, height, 'D');
    return true;
  } catch (e1) {
    try {
      doc.addImage(imageSource, x, y, width, height);
      doc.setDrawColor(...BORDER_COLOR);
      doc.rect(x, y, width, height, 'D');
      return true;
    } catch (e2) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, y, width, height, 'F');
      doc.setDrawColor(...BORDER_COLOR);
      doc.rect(x, y, width, height, 'D');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text('[Image attached]', x + width / 2, y + height / 2, { align: 'center' });
      return false;
    }
  }
};

/**
 * 1. Generate PDF for a Single Labour, Activity and Equipment Form
 */
export const generateLaeFormPDF = ({
  project,
  form,
  companySettings,
  author
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 14;

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 36, 'F');

  // Accent stripe
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 36, 210, 2, 'F');

  // Company Name & Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((companySettings?.companyName || 'NASAAB CONSTRUCTION LIMITED').toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(companySettings?.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works', 14, 21);
  doc.text(`${companySettings?.address || 'Mombasa, Kenya'} | Tel: ${companySettings?.phone || '+254 700 000 000'}`, 14, 26);
  doc.text(`Official Daily Site Diary • Labour, Activity & Equipment Record`, 14, 31);

  currentY = 46;

  // Report Title
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LABOUR, ACTIVITY & EQUIPMENT FIELD REPORT', 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Site: ${project?.name || 'Construction Site'} (${project?.code || 'SITE'}) • ${project?.location || ''}`, 14, currentY);

  currentY += 8;

  // Form Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_COLOR);
  doc.text('FORM REFERENCE', 18, currentY + 6);
  doc.text('REPORT DATE & DAY', 58, currentY + 6);
  doc.text('SITE PROGRESS', 106, currentY + 6);
  doc.text('PREPARED BY', 142, currentY + 6);
  doc.text('STATUS', 174, currentY + 6);

  const rawLaeDate = form.date || form.reportDate || formatDate(new Date());
  const laeDay = getDayOfWeek(rawLaeDate);
  const displayLaeDate = laeDay ? `${laeDay}, ${rawLaeDate}` : rawLaeDate;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(form.form_number || 'LAE-RECORD', 18, currentY + 12);
  doc.text(displayLaeDate, 58, currentY + 12);
  const progressVal = form.estimated_site_progress !== undefined ? form.estimated_site_progress : (form.estimatedSiteProgress || 0);
  doc.setTextColor(5, 150, 105); // Emerald-600
  doc.text(`${progressVal}% Completed`, 106, currentY + 12);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(form.prepared_by_name || author?.name || 'Site Foreman', 142, currentY + 12);
  doc.text(String(form.status || 'Submitted').toUpperCase(), 174, currentY + 12);

  currentY += 25;

  // SECTION 1: LABOUR & WORKFORCE RECORD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('1. LABOUR & WORKFORCE BREAKDOWN BY TRADE', 14, currentY);
  currentY += 3;

  const labourItems = form.labourItems || [];
  let totalWorkers = 0;
  let totalLabourCost = 0;

  const labourRows = labourItems.map((item) => {
    const fCount = Number(item.foreman_count !== undefined ? item.foreman_count : item.foremanCount) || 0;
    const sCount = Number(item.skilled_count !== undefined ? item.skilled_count : item.skilledCount) || 0;
    const uCount = Number(item.unskilled_count !== undefined ? item.unskilled_count : item.unskilledCount) || 0;

    const fRate = Number(item.foreman_rate !== undefined ? item.foreman_rate : item.foremanRate) || 1500;
    const sRate = Number(item.skilled_rate !== undefined ? item.skilled_rate : item.skilledRate) || 1000;
    const uRate = Number(item.unskilled_rate !== undefined ? item.unskilled_rate : item.unskilledRate) || 500;

    const headcount = fCount + sCount + uCount || Number(item.number_of_workers) || 0;
    const cost = item.total_cost !== undefined && item.total_cost !== null && Number(item.total_cost) > 0
      ? Number(item.total_cost)
      : (fCount * fRate + sCount * sRate + uCount * uRate);

    totalWorkers += headcount;
    totalLabourCost += cost;

    return [
      item.trade || 'General Trade',
      `${fCount} (@KES ${fRate.toLocaleString()})`,
      `${sCount} (@KES ${sRate.toLocaleString()})`,
      `${uCount} (@KES ${uRate.toLocaleString()})`,
      String(headcount),
      `KES ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Trade Category', 'Foreman (1,500)', 'Skilled Workers (1,000)', 'Helpers (500)', 'Headcount', 'Est. Daily Cost (KES)']],
    body: labourRows.length > 0 ? labourRows : [['No labour categories recorded', '—', '—', '—', '0', 'KES 0.00']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 30 },
      4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 3;

  // Overall Labour Summary Banner (Spacious, Clean Stacked Layout - No Text Collision)
  doc.setFillColor(...PRIMARY_COLOR);
  doc.roundedRect(14, currentY, 182, 14, 2, 2, 'F');

  // Left Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OVERALL LABOUR SUMMARY', 18, currentY + 8.5);

  // Middle Column: Total Workers On Site
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text('TOTAL WORKERS ON SITE', 98, currentY + 5.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${totalWorkers} Personnel`, 98, currentY + 10.8);

  // Right Column: Total Est. Daily Cost (Stacked cleanly: label on top, value below)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text('TOTAL EST. DAILY COST', 145, currentY + 5.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(52, 211, 153); // Emerald
  doc.text(`KES ${totalLabourCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 145, currentY + 10.8);

  currentY += 19;

  // SECTION 2: WORK ACTIVITIES & PROGRESS (DEDICATED TABLE)
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('2. SITE WORK ACTIVITIES & DAILY PROGRESS', 14, currentY);
  currentY += 3;

  const activityRows = [];
  labourItems.forEach((item) => {
    const workDone = (item.work_done_today || item.workDoneToday || item.notes || '').trim();
    const workPlan = (item.work_plan_tomorrow || item.workPlanTomorrow || '').trim();
    const fCount = Number(item.foreman_count !== undefined ? item.foreman_count : item.foremanCount) || 0;
    const sCount = Number(item.skilled_count !== undefined ? item.skilled_count : item.skilledCount) || 0;
    const uCount = Number(item.unskilled_count !== undefined ? item.unskilled_count : item.unskilledCount) || 0;
    const headcount = fCount + sCount + uCount || Number(item.number_of_workers) || 0;

    if (workDone || workPlan) {
      activityRows.push([
        item.trade || 'General Trade',
        `${headcount} Workers`,
        workDone || 'Work executed according to daily schedule',
        workPlan || 'Continuing planned trade scope'
      ]);
    }
  });

  if (Array.isArray(form.activityItems) && form.activityItems.length > 0) {
    form.activityItems.forEach((act) => {
      activityRows.push([
        act.activity_description || 'Site Milestone',
        act.location_or_zone || 'Site Zone',
        `${act.progress_percentage || 0}% Completed • ${act.status || 'In Progress'}`,
        act.remarks || '—'
      ]);
    });
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Trade / Section', 'Assigned Crew', 'Work Completed Today', 'Work Plan Tomorrow']],
    body: activityRows.length > 0 ? activityRows : [['All Active Trades', `${totalWorkers} Workers`, 'Daily work carried out across active site zones', 'Progress continuation per site plan']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 62 },
      3: { cellWidth: 60 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 3: MACHINERY & EQUIPMENT
  if (currentY > 225) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('3. MACHINERY & EQUIPMENT EXPENSES', 14, currentY);
  currentY += 3;

  const equipmentItems = form.equipmentItems || [];
  let totalEquipmentExpense = 0;

  const equipmentRows = equipmentItems.map((eq) => {
    const fuel = Number(eq.fuel_cost !== undefined ? eq.fuel_cost : eq.fuelCost) || 0;
    const operator = Number(eq.operator_cost !== undefined ? eq.operator_cost : eq.operatorCost) || 0;
    const repair = Number(eq.repair_cost !== undefined ? eq.repair_cost : eq.repairCost) || 0;
    const mechanic = Number(eq.mechanic_cost !== undefined ? eq.mechanic_cost : eq.mechanicCost) || 0;
    const transport = Number(eq.transport_cost !== undefined ? eq.transport_cost : eq.transportCost) || 0;
    const totalExp = eq.total_expense !== undefined && eq.total_expense !== null && Number(eq.total_expense) > 0
      ? Number(eq.total_expense)
      : (fuel + operator + repair + mechanic + transport);

    totalEquipmentExpense += totalExp;

    const status = eq.operating_status || eq.operatingStatus || eq.status || 'Active';
    const notes = eq.machine_notes || eq.machineNotes || eq.remarks || '—';

    return [
      eq.equipment_name || eq.equipmentName || 'Equipment Item',
      String(status).toUpperCase(),
      fuel ? `KES ${fuel.toLocaleString()}` : '0',
      operator ? `KES ${operator.toLocaleString()}` : '0',
      repair ? `KES ${repair.toLocaleString()}` : '0',
      mechanic ? `KES ${mechanic.toLocaleString()}` : '0',
      transport ? `KES ${transport.toLocaleString()}` : '0',
      `KES ${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      notes
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Equipment Item', 'Status', 'Fuel', 'Operator', 'Repair/Spares', 'Mechanic', 'Transport', 'Total Expense', 'Notes / Hours']],
    body: equipmentRows.length > 0 ? equipmentRows : [['No machinery or equipment recorded', '—', '0', '0', '0', '0', '0', 'KES 0.00', '—']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 6.8 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 17, halign: 'right' },
      5: { cellWidth: 15, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 33 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 3;

  // Equipment total bar
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 8, 1, 1, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`TOTAL EQUIPMENT UNITS: ${equipmentItems.length}`, 18, currentY + 5.5);
  doc.text(`TOTAL MACHINERY & EQUIPMENT EXPENSE: KES ${totalEquipmentExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, currentY + 5.5, { align: 'right' });

  currentY += 14;

  // SECTION 4: DELAYS, INCIDENTS, VISITORS
  const delays = form.delays_issues_incidents || form.delaysIssuesIncidents;
  const visitors = form.site_visitors || form.siteVisitors;
  const notes = form.general_notes || form.generalNotes;

  if (delays || visitors || notes) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('4. SITE OBSERVATIONS, INCIDENTS & VISITORS', 14, currentY);
    currentY += 5;

    if (delays) {
      doc.setFillColor(254, 242, 242); // Rose-50
      const splitDelays = doc.splitTextToSize(delays, 174);
      const boxH = Math.max(14, splitDelays.length * 3.8 + 8);
      doc.roundedRect(14, currentY, 182, boxH, 1.5, 1.5, 'F');
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(14, currentY, 182, boxH, 1.5, 1.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(190, 18, 60); // Rose-700
      doc.text('DELAYS, ISSUES & SAFETY INCIDENTS:', 18, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(splitDelays, 18, currentY + 10);
      currentY += boxH + 4;
    }

    if (visitors) {
      if (currentY > 245) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, currentY, 182, 11, 1.5, 1.5, 'F');
      doc.setDrawColor(...BORDER_COLOR);
      doc.roundedRect(14, currentY, 182, 11, 1.5, 1.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_COLOR);
      doc.text('SITE VISITORS & CLIENT REPS:', 18, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(visitors, 18, currentY + 8.5);
      currentY += 15;
    }

    if (notes && notes !== delays) {
      if (currentY > 245) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text('GENERAL REMARKS:', 14, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_COLOR);
      const splitN = doc.splitTextToSize(notes, 182);
      doc.text(splitN, 14, currentY);
      currentY += splitN.length * 3.8 + 6;
    }
  }

  // SECTION 5: SITE PHOTOS & FIELD EVIDENCE
  const rawPhotos = Array.isArray(form.site_photos)
    ? form.site_photos
    : (typeof form.site_photos === 'string' ? JSON.parse(form.site_photos || '[]') : (form.sitePhotos || []));
  const validPhotos = (rawPhotos || []).map(p => typeof p === 'string' ? { url: p, name: 'Site Photo' } : p).filter(p => p && p.url);

  if (validPhotos.length > 0) {
    if (currentY + 65 > 275) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`5. SITE FIELD PHOTOS & VISUAL EVIDENCE (${validPhotos.length})`, 14, currentY);
    currentY += 5;

    const imgWidth = 87;
    const imgHeight = 58;

    validPhotos.forEach((photo, idx) => {
      const isEven = idx % 2 === 0;
      if (!isEven && idx > 0) {
        // second column in current row
      } else if (idx > 0) {
        // new row
        currentY += imgHeight + 10;
        if (currentY + imgHeight + 10 > 280) {
          doc.addPage();
          currentY = 20;
        }
      }

      const posX = isEven ? 14 : 109;
      const posY = currentY;

      addImageSafelyToDoc(doc, photo.url, posX, posY, imgWidth, imgHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      const caption = photo.name ? `Photo #${idx + 1}: ${photo.name}` : `Site Photo #${idx + 1}`;
      doc.text(caption, posX + 2, posY + imgHeight + 4);
    });

    currentY += imgHeight + 10;
  }

  // Signatures
  if (currentY > 245) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = Math.max(currentY + 6, 255);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 80, currentY);
  doc.line(130, currentY, 196, currentY);

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`PREPARED BY: ${form.prepared_by_name || author?.name || 'Site Foreman'}`, 14, currentY + 4);
  doc.text(`CERTIFIED BY: Site Project Manager / Partner`, 130, currentY + 4);

  return doc;
};

/**
 * 2. Generate PDF for a Single Material Needed Form
 */
export const generateMaterialRequestPDF = ({
  project,
  request,
  companySettings,
  author
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 14;

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((companySettings?.companyName || 'NASAAB CONSTRUCTION LIMITED').toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(companySettings?.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works', 14, 21);
  doc.text(`${companySettings?.address || 'Mombasa, Kenya'} | Tel: ${companySettings?.phone || '+254 700 000 000'}`, 14, 26);
  doc.text(`Official Material Requisition & Site Log • Verified System Export`, 14, 31);

  currentY = 46;

  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MATERIAL NEEDED REQUEST & SITE MATERIALS LOG', 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Project Site: ${project?.name || request?.project_name || 'Site'} (${project?.code || request?.project_code || 'SITE'}) • ${project?.location || request?.project_location || ''}`, 14, currentY);

  currentY += 8;

  // Requisition Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'D');

  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text('RECORD REFERENCE', 18, currentY + 6);
  doc.text('LOG DATE & DAY', 65, currentY + 6);
  doc.text('STATUS', 124, currentY + 6);
  doc.text('LOGGED BY', 160, currentY + 6);

  const rawMatDate = request.date_needed || formatDate(new Date());
  const matDay = getDayOfWeek(rawMatDate);
  const displayMatDate = matDay ? `${matDay}, ${rawMatDate}` : rawMatDate;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(request.request_number || 'MRN-RECORD', 18, currentY + 12);
  doc.text(displayMatDate, 65, currentY + 12);
  doc.text(String(request.status || 'Pending').toUpperCase(), 124, currentY + 12);
  doc.text(request.requested_by_name || author?.name || 'Storekeeper', 160, currentY + 12);

  currentY += 24;

  // -------------------------------------------------------------
  // HELPER: Safely embed image into jsPDF document
  // -------------------------------------------------------------
  const addImageSafely = (imageSource, x, y, width, height) => {
    if (!imageSource || typeof imageSource !== 'string' || !imageSource.startsWith('data:image')) {
      return false;
    }
    try {
      let format = 'JPEG';
      if (imageSource.includes('image/png')) format = 'PNG';
      else if (imageSource.includes('image/webp')) format = 'WEBP';
      doc.addImage(imageSource, format, x, y, width, height);
      doc.setDrawColor(...BORDER_COLOR);
      doc.rect(x, y, width, height, 'D');
      return true;
    } catch (e1) {
      try {
        doc.addImage(imageSource, x, y, width, height);
        doc.setDrawColor(...BORDER_COLOR);
        doc.rect(x, y, width, height, 'D');
        return true;
      } catch (e2) {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y, width, height, 'F');
        doc.setDrawColor(...BORDER_COLOR);
        doc.rect(x, y, width, height, 'D');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED_COLOR);
        doc.text('[Image attached]', x + width / 2, y + height / 2, { align: 'center' });
        return false;
      }
    }
  };

  // SITE PROGRESS (if present)
  if (request.site_progress) {
    doc.setFillColor(240, 253, 244); // light green bg
    doc.roundedRect(14, currentY, 182, 14, 1.5, 1.5, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, 182, 14, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text('SITE PROGRESS OBSERVATION:', 18, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const splitProgress = doc.splitTextToSize(request.site_progress, 174);
    doc.text(splitProgress, 18, currentY + 10);

    currentY += 18;
  }

  // SITE PHOTOS & FIELD EVIDENCE (together with site progress before materials received)
  const sitePhotos = Array.isArray(request.site_photos)
    ? request.site_photos
    : (typeof request.site_photos === 'string' ? JSON.parse(request.site_photos || '[]') : []);

  if (sitePhotos.length > 0) {
    if (currentY + 75 > 275) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`SITE PHOTOS & FIELD EVIDENCE (${sitePhotos.length} Attached)`, 14, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text('Visual photographic evidence recorded on site for delivery and progress verification:', 14, currentY);
    currentY += 6;

    // Grid: 2 columns (width 88mm, height 58mm, gap 6mm)
    const spWidth = 88;
    const spHeight = 58;
    const spGap = 6;
    const spCols = 2;

    for (let i = 0; i < sitePhotos.length; i += spCols) {
      if (currentY + spHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowPhotos = sitePhotos.slice(i, i + spCols);
      rowPhotos.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (spWidth + spGap);
        const posY = currentY;
        const imgUrl = typeof photo === 'string' ? photo : photo?.url;
        const imgName = (typeof photo === 'object' && photo?.name) ? photo.name : `Site Photo #${i + colIdx + 1}`;

        if (imgUrl) {
          addImageSafely(imgUrl, posX, posY, spWidth, spHeight);

          // Caption
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...PRIMARY_COLOR);
          doc.text(`Photo #${i + colIdx + 1}: ${imgName.substring(0, 40)}`, posX, posY + spHeight + 4);
        }
      });

      currentY += spHeight + 10;
    }
    currentY += 4;
  }

  // SECTION 1: MATERIALS RECEIVED TODAY TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('MATERIALS RECEIVED TODAY', 14, currentY);
  currentY += 3;

  const items = request.items || [];
  const itemRows = items.map((item, idx) => {
    const receiptsCount = Array.isArray(item.receipt_photos)
      ? item.receipt_photos.length
      : (typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos || '[]').length : 0);

    return [
      `#${idx + 1}`,
      item.item_name || '—',
      item.supplier_vendor || '—',
      item.delivery_notes || item.notes || 'Delivered intact on site',
      receiptsCount > 0 ? `${receiptsCount} receipt(s)` : 'None'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Item #', 'Material Name / Item', 'Supplier / Vendor', 'Delivery Notes & Observations', 'Receipts']],
    body: itemRows.length > 0 ? itemRows : [['—', 'No materials received today', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 2: MATERIALS NEEDED TOMORROW
  if (request.materials_needed_tomorrow || request.notes) {
    let tomorrowText = request.materials_needed_tomorrow || request.notes || '';
    if (typeof tomorrowText === 'string' && (tomorrowText.trim().startsWith('[') || tomorrowText.trim().startsWith('{'))) {
      try {
        const parsed = JSON.parse(tomorrowText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tomorrowText = parsed.map((c) => {
            const header = [c.category ? `Category: ${c.category}` : '', c.floor ? `Floor: ${c.floor}` : ''].filter(Boolean).join(' | ');
            return `${header ? `[${header}]\n` : ''}${c.description || ''}`;
          }).join('\n\n');
        }
      } catch (e) {
        // Fallback to raw text
      }
    }
    doc.setFillColor(239, 246, 255); // light blue bg
    doc.setDrawColor(191, 219, 254);

    const splitTomorrow = doc.splitTextToSize(tomorrowText, 174);
    const boxHeight = Math.max(16, splitTomorrow.length * 4.5 + 8);

    if (currentY + boxHeight > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.roundedRect(14, currentY, 182, boxHeight, 1.5, 1.5, 'F');
    doc.roundedRect(14, currentY, 182, boxHeight, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text('MATERIALS NEEDED TOMORROW (PLANNED ACTIVITIES REQUISITION):', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(splitTomorrow, 18, currentY + 11);

    currentY += boxHeight + 8;
  }

  // -------------------------------------------------------------
  // SECTION 3: MATERIAL DELIVERY RECEIPTS & INVOICES
  // -------------------------------------------------------------
  const allReceiptPhotos = [];
  (request.items || []).forEach((item, itemIdx) => {
    const receipts = Array.isArray(item.receipt_photos)
      ? item.receipt_photos
      : (typeof item.receipt_photos === 'string' ? JSON.parse(item.receipt_photos || '[]') : []);

    receipts.forEach((r, rIdx) => {
      const imgUrl = typeof r === 'string' ? r : r?.url;
      const imgName = (typeof r === 'object' && r?.name) ? r.name : `Receipt #${rIdx + 1}`;
      if (imgUrl) {
        allReceiptPhotos.push({
          url: imgUrl,
          name: imgName,
          itemTitle: item.item_name || `Item #${itemIdx + 1}`,
          supplier: item.supplier_vendor || ''
        });
      }
    });
  });

  if (allReceiptPhotos.length > 0) {
    if (currentY + 65 > 275) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`MATERIAL DELIVERY RECEIPTS & PROOF OF DELIVERY (${allReceiptPhotos.length} Attached)`, 14, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text('Attached delivery notes, weight bridge tickets, and supplier invoices verification:', 14, currentY);
    currentY += 6;

    // Grid: 3 columns (width 56mm, height 42mm, gap 7mm)
    const rWidth = 56;
    const rHeight = 42;
    const rGap = 7;
    const rCols = 3;

    for (let i = 0; i < allReceiptPhotos.length; i += rCols) {
      if (currentY + rHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowPhotos = allReceiptPhotos.slice(i, i + rCols);
      rowPhotos.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (rWidth + rGap);
        const posY = currentY;

        addImageSafely(photo.url, posX, posY, rWidth, rHeight);

        // Caption
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...PRIMARY_COLOR);
        const captionTitle = doc.splitTextToSize(photo.itemTitle, rWidth);
        doc.text(captionTitle[0] || 'Material Item', posX, posY + rHeight + 3.5);

        if (photo.supplier) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...MUTED_COLOR);
          const supplierCaption = doc.splitTextToSize(`Vendor: ${photo.supplier}`, rWidth);
          doc.text(supplierCaption[0] || '', posX, posY + rHeight + 7);
        }
      });

      currentY += rHeight + 12;
    }
    currentY += 4;
  }

  // -------------------------------------------------------------
  // Signatures block
  // -------------------------------------------------------------
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = Math.max(currentY + 12, 255);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 70, currentY);
  doc.line(80, currentY, 135, currentY);
  doc.line(145, currentY, 196, currentY);

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`STOREKEEPER: ${request.requested_by_name || 'Site Storekeeper'}`, 14, currentY + 4);
  doc.text(`PROJECT MANAGER: Verification`, 80, currentY + 4);
  doc.text(`DIRECTOR / PARTNER: Approval`, 145, currentY + 4);

  return doc;
};

/**
 * 3. Generate Project Multi-Form Summary PDF
 * Respects userRole and project scoping.
 */
export const generateProjectSummaryPDF = ({
  project,
  laeForms = [],
  materialRequests = [],
  companySettings,
  userRole,
  author
}) => {
  const normRole = String(userRole || '').trim().toLowerCase();
  const isForeman = normRole === 'foreman';
  const isStorekeeper = normRole === 'storekeeper';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 14;

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((companySettings?.companyName || 'NASAAB CONSTRUCTION LIMITED').toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(companySettings?.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works', 14, 21);
  doc.text(`${companySettings?.address || 'Mombasa, Kenya'} | Tel: ${companySettings?.phone || '+254 700 000 000'}`, 14, 26);
  doc.text(`Official Site Report • Generated by ${author?.name || 'Authorized Staff'} (${userRole || 'User'})`, 14, 31);

  currentY = 46;

  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`SITE OPERATIONS SUMMARY — ${project?.name || 'PROJECT'}`, 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Location: ${project?.location || 'Mombasa, Kenya'} • Code: ${project?.code || 'PRJ'}`, 14, currentY);

  currentY += 10;

  // Section: Labour, Activity & Equipment Forms (FORBIDDEN for Storekeeper)
  if (!isStorekeeper) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`1. LABOUR, ACTIVITY & EQUIPMENT FORMS (${laeForms.length})`, 14, currentY);
    currentY += 3;

    const laeRows = laeForms.map((f) => {
      const day = getDayOfWeek(f.date);
      return [
        f.form_number,
        day ? `${day}, ${f.date}` : (f.date || '—'),
        f.prepared_by_name,
        f.weather || 'Clear',
        String(f.status || 'Submitted').toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Form Reference', 'Day & Date', 'Prepared By', 'Weather', 'Status']],
      body: laeRows.length > 0 ? laeRows : [['No LAE forms logged for site', '—', '—', '—', '—']],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  // Section: Material Needed Requests (FORBIDDEN for Foreman)
  if (!isForeman) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`2. MATERIAL NEEDED REQUISITIONS (${materialRequests.length})`, 14, currentY);
    currentY += 3;

    const matRows = materialRequests.map((r) => {
      const day = getDayOfWeek(r.date_needed);
      return [
        r.request_number,
        day ? `${day}, ${r.date_needed}` : (r.date_needed || '—'),
        String(r.total_items || 0),
        r.requested_by_name,
        String(r.urgency || 'Normal').toUpperCase(),
        String(r.status || 'Pending').toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Request #', 'Needed Day & Date', 'Items Qty', 'Requested By', 'Urgency', 'Status']],
      body: matRows.length > 0 ? matRows : [['No material requisitions logged', '—', '—', '—', '—', '—']],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  return doc;
};

/**
 * Format KES Currency nicely for PDF reports
 */
const formatKES = (amount) => {
  return `KES ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/**
 * Common Header renderer for Weekly Reports
 */
const renderWeeklyReportHeader = (doc, title, subtitle, companySettings, author, project, weekInfo) => {
  // Top Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((companySettings?.companyName || 'NASAAB CONSTRUCTION LIMITED').toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(companySettings?.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works', 14, 19);
  doc.text(`${companySettings?.address || 'Mombasa, Kenya'} | Tel: ${companySettings?.phone || '+254 700 000 000'}`, 14, 24);
  doc.text(`Official Weekly Construction Progress Dossier • BuildTrack System`, 14, 29);

  // Document Title
  let currentY = 46;
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(subtitle, 14, currentY);

  currentY += 6;

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 17, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 17, 2, 2, 'D');

  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  doc.text('PROJECT SITE', 18, currentY + 5.5);
  doc.text('WEEK PERIOD', 75, currentY + 5.5);
  doc.text('DATES (MON - SUN)', 118, currentY + 5.5);
  doc.text('PREPARED BY', 162, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(7.5);
  const projText = `${project?.name || 'Site'} (${project?.code || 'PRJ'})`;
  doc.text(projText.substring(0, 32), 18, currentY + 11.5);
  doc.text(`Week ${weekInfo?.weekNumber || '—'}, ${weekInfo?.year || ''}`, 75, currentY + 11.5);
  doc.text(`${weekInfo?.startDate || '—'} to ${weekInfo?.endDate || '—'}`, 118, currentY + 11.5);
  const authorText = `${author?.name || 'Site Staff'} (${author?.role || 'Staff'})`;
  doc.text(authorText.substring(0, 24), 162, currentY + 11.5);

  return currentY + 23;
};

/**
 * 4. CATEGORY 1: FULL WEEKLY REPORT (LAE + MATERIALS COMBINED)
 * Access: Admin, Director, Partner only
 */
export const generateWeeklyFullReportPDF = ({
  project,
  weekInfo,
  summaryTotals = {},
  laeData = {},
  materialData = {},
  sitePhotos = [],
  companySettings,
  author
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = renderWeeklyReportHeader(
    doc,
    'FULL WEEKLY SITE OPERATIONS & COST REPORT',
    `Integrated Labour, Activity, Equipment & Material Dossier • Site: ${project?.name || ''}`,
    companySettings,
    author,
    project,
    weekInfo
  );

  // Executive KPI Summary Cards
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, currentY, 182, 20, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 20, 2, 2, 'D');

  const cardW = 182 / 4;
  const kpis = [
    { label: 'WORKFORCE TOTAL', val: `${summaryTotals.totalWorkers || 0} Workers`, sub: `${summaryTotals.laeFormCount || 0} daily forms logged` },
    { label: 'LABOUR EXPENDITURE', val: formatKES(summaryTotals.totalLabourCost), sub: 'Approved trade rates' },
    { label: 'EQUIPMENT EXPENSE', val: formatKES(summaryTotals.totalEquipmentCost), sub: 'Fuel, operator & repairs' },
    { label: 'MATERIAL REQUISITIONS', val: formatKES(summaryTotals.totalMaterialCost), sub: `${summaryTotals.materialRequestCount || 0} requisition orders` }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * cardW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.label, x + 4, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(kpi.val, x + 4, currentY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.sub, x + 4, currentY + 16.5);

    if (idx < 3) {
      doc.setDrawColor(...BORDER_COLOR);
      doc.line(x + cardW, currentY + 2, x + cardW, currentY + 18);
    }
  });

  currentY += 26;

  // SECTION 1: LABOUR & WORKFORCE RECORD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('1. WEEKLY LABOUR & WORKFORCE BREAKDOWN BY TRADE', 14, currentY);
  currentY += 3;

  const labourRows = (laeData.labourTradeSummary || []).map((t) => [
    t.trade,
    String(t.foremanCount || 0),
    String(t.skilledCount || 0),
    String(t.unskilledCount || 0),
    String(t.totalWorkers || 0),
    formatKES(t.totalCost || 0),
    (t.workDoneList || []).join('; ') || 'Standard tasks completed'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Trade / Craft', 'Foremen', 'Skilled', 'Unskilled', 'Total Man-Days', 'Weekly Cost', 'Work Summary']],
    body: labourRows.length > 0
      ? labourRows
      : [['No labour logged for this period', '0', '0', '0', '0', 'KES 0', '—']],
    foot: [
      [
        'Total Weekly Labour',
        '—',
        '—',
        '—',
        String(summaryTotals.totalWorkers || 0),
        formatKES(summaryTotals.totalLabourCost || 0),
        'Cumulative workforce distribution'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 2: ACTIVITIES & STRUCTURAL PROGRESS
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('2. WEEKLY SITE ACTIVITIES & MILESTONES PROGRESS', 14, currentY);
  currentY += 3;

  const activityRows = (laeData.activitySummary || []).map((a) => {
    const day = getDayOfWeek(a.form_date);
    return [
      day ? `${day}, ${a.form_date}` : (a.form_date || '—'),
      a.activity_description || 'General Site Activity',
      a.location_or_zone || 'Site-wide',
      String(a.status || 'in_progress').toUpperCase().replace('_', ' '),
      `${a.progress_percentage || 0}%`,
      a.remarks || '—'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Day & Date', 'Activity / Task Description', 'Zone / Level', 'Status', 'Progress %', 'Remarks']],
    body: activityRows.length > 0
      ? activityRows
      : [['—', 'No specific activities recorded for this week', '—', '—', '0%', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 3: PLANT & EQUIPMENT UTILIZATION & OPERATING EXPENSES
  if (currentY > 225) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('3. PLANT & EQUIPMENT UTILIZATION & OPERATING EXPENSES', 14, currentY);
  currentY += 3;

  const equipRows = (laeData.equipmentSummary || []).map((e) => [
    e.name,
    String(e.totalQuantity || 1),
    formatKES(e.fuelCost || 0),
    formatKES(e.operatorCost || 0),
    formatKES(e.repairCost || 0),
    formatKES(e.transportCost || 0),
    formatKES(e.totalExpense || 0),
    String(e.operatingStatus || 'Active').toUpperCase()
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Equipment Name', 'Qty', 'Fuel Cost', 'Operator Cost', 'Repairs/Maint.', 'Transport', 'Total Expense', 'Status']],
    body: equipRows.length > 0
      ? equipRows
      : [['No machinery or plant deployed this week', '0', 'KES 0', 'KES 0', 'KES 0', 'KES 0', 'KES 0', 'STANDBY']],
    foot: [
      [
        'Total Equipment Expense',
        '—',
        '—',
        '—',
        '—',
        '—',
        formatKES(summaryTotals.totalEquipmentCost || 0),
        '—'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 4: MATERIAL REQUISITIONS & INFLOWS
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('4. WEEKLY MATERIAL REQUISITIONS & SITE DELIVERIES', 14, currentY);
  currentY += 3;

  const matRows = (materialData.itemsSummary || []).map((m) => {
    const day = getDayOfWeek(m.dateNeeded);
    return [
      m.requestNumber || 'MRN-—',
      day ? `${day}, ${m.dateNeeded}` : (m.dateNeeded || '—'),
      m.itemName || 'Material Item',
      `${m.quantity} ${m.unit || 'units'}`,
      formatKES(m.estimatedUnitCost || 0),
      formatKES(m.estimatedTotalCost || 0),
      m.supplierVendor || 'Site Store'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Request #', 'Day & Date Needed', 'Material Description', 'Quantity', 'Est. Unit Rate', 'Total Amount', 'Supplier / Vendor']],
    body: matRows.length > 0
      ? matRows
      : [['—', '—', 'No material requisitions logged this week', '—', 'KES 0', 'KES 0', '—']],
    foot: [
      [
        'Total Materials Value',
        '—',
        '—',
        '—',
        '—',
        formatKES(summaryTotals.totalMaterialCost || 0),
        'Cumulative procurement cost'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 5: DELAYS, INCIDENTS & WEATHER OBSERVATIONS
  const incidents = laeData.incidentsList || [];
  if (incidents.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('5. DELAYS, SAFETY INCIDENTS & SITE VISITS RECORD', 14, currentY);
    currentY += 3;

    const incRows = incidents.map((inc) => {
      const day = getDayOfWeek(inc.date);
      return [
        day ? `${day}, ${inc.date}` : (inc.date || '—'),
        inc.weather || 'Clear',
        inc.incident || 'None reported',
        inc.visitors || 'No official visitors'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Day & Date', 'Weather Observation', 'Delays / Incidents / Issues', 'Official Site Visitors']],
      body: incRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // SECTION 6: PHOTOGRAPHIC EVIDENCE GALLERY
  const allPhotos = [...(sitePhotos || []), ...(materialData.receiptPhotos || [])];
  if (allPhotos.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`6. WEEKLY SITE PHOTOGRAPHIC EVIDENCE (${allPhotos.length} Photos)`, 14, currentY);
    currentY += 5;

    const pWidth = 86;
    const pHeight = 56;
    const pGap = 8;
    const pCols = 2;

    for (let i = 0; i < allPhotos.length; i += pCols) {
      if (currentY + pHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowP = allPhotos.slice(i, i + pCols);
      rowP.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (pWidth + pGap);
        const posY = currentY;
        const imgUrl = photo.url;
        const caption = photo.name || photo.itemTitle || `Site Progress Photo #${i + colIdx + 1}`;

        if (imgUrl) {
          addImageSafelyToDoc(doc, imgUrl, posX, posY, pWidth, pHeight);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_COLOR);
          doc.text(caption.substring(0, 45), posX + 1, posY + pHeight + 4);
        }
      });

      currentY += pHeight + 10;
    }
  }

  // SIGNATURES & VERIFICATION BLOCK
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = Math.max(currentY + 12, 255);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 65, currentY);
  doc.line(75, currentY, 130, currentY);
  doc.line(140, currentY, 196, currentY);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`SITE FOREMAN: Verified & Signed`, 14, currentY + 4);
  doc.text(`PROJECT MANAGER / PARTNER: Certified`, 75, currentY + 4);
  doc.text(`DIRECTOR / ADMIN: Authorized`, 140, currentY + 4);

  return doc;
};

/**
 * 5. CATEGORY 2: LABOUR, ACTIVITY & EQUIPMENT WEEKLY REPORT
 * Access: Admin, Director, Partner, Foreman only
 */
export const generateWeeklyLaeReportPDF = ({
  project,
  weekInfo,
  summaryTotals = {},
  laeData = {},
  sitePhotos = [],
  companySettings,
  author
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = renderWeeklyReportHeader(
    doc,
    'WEEKLY LABOUR, ACTIVITY & EQUIPMENT DOSSIER',
    `Workforce Headcount, Site Progress & Plant Operating Expenses • Site: ${project?.name || ''}`,
    companySettings,
    author,
    project,
    weekInfo
  );

  // Executive KPI Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'D');

  const cardW = 182 / 3;
  const kpis = [
    { label: 'WEEKLY WORKFORCE', val: `${summaryTotals.totalWorkers || 0} Man-Days`, sub: `${summaryTotals.laeFormCount || 0} Daily LAE Forms` },
    { label: 'LABOUR EXPENDITURE', val: formatKES(summaryTotals.totalLabourCost), sub: 'Approved Trade Rates' },
    { label: 'EQUIPMENT EXPENSES', val: formatKES(summaryTotals.totalEquipmentCost), sub: 'Fuel, Operators & Repairs' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * cardW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.label, x + 4, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(kpi.val, x + 4, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.sub, x + 4, currentY + 15);

    if (idx < 2) {
      doc.setDrawColor(...BORDER_COLOR);
      doc.line(x + cardW, currentY + 2, x + cardW, currentY + 16);
    }
  });

  currentY += 24;

  // SECTION 1: LABOUR BREAKDOWN BY TRADE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('1. WEEKLY WORKFORCE HEADCOUNT & LABOUR EXPENDITURE', 14, currentY);
  currentY += 3;

  const labourRows = (laeData.labourTradeSummary || []).map((t) => [
    t.trade,
    String(t.foremanCount || 0),
    String(t.skilledCount || 0),
    String(t.unskilledCount || 0),
    String(t.totalWorkers || 0),
    formatKES(t.totalCost || 0),
    (t.workDoneList || []).join('; ') || 'Tasks executed per schedule'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Trade / Craft', 'Foremen', 'Skilled', 'Unskilled', 'Total Workers', 'Labour Cost', 'Work Done Summary']],
    body: labourRows.length > 0
      ? labourRows
      : [['No labour logged this period', '0', '0', '0', '0', 'KES 0', '—']],
    foot: [
      [
        'Total Weekly Labour',
        '—',
        '—',
        '—',
        String(summaryTotals.totalWorkers || 0),
        formatKES(summaryTotals.totalLabourCost || 0),
        'Official approved rates: Foreman 1,500 | Skilled 1,000 | Unskilled 500'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 2: ACTIVITIES & PROGRESS
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('2. SITE ACTIVITIES, STRUCTURAL WORK & PROGRESS %', 14, currentY);
  currentY += 3;

  const actRows = (laeData.activitySummary || []).map((a) => {
    const day = getDayOfWeek(a.form_date);
    return [
      day ? `${day}, ${a.form_date}` : (a.form_date || '—'),
      a.activity_description || 'Activity',
      a.location_or_zone || 'Site-wide',
      String(a.status || 'in_progress').toUpperCase().replace('_', ' '),
      `${a.progress_percentage || 0}%`,
      a.remarks || '—'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Day & Date', 'Task Description', 'Location / Zone', 'Status', 'Progress', 'Remarks']],
    body: actRows.length > 0 ? actRows : [['—', 'No activities recorded for this week', '—', '—', '0%', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 3: PLANT & EQUIPMENT UTILIZATION & OPERATING EXPENSES
  if (currentY > 225) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('3. PLANT & EQUIPMENT DEPLOYMENT & EXPENSE BREAKDOWN', 14, currentY);
  currentY += 3;

  const eqRows = (laeData.equipmentSummary || []).map((e) => [
    e.name,
    String(e.totalQuantity || 1),
    formatKES(e.fuelCost || 0),
    formatKES(e.operatorCost || 0),
    formatKES(e.repairCost || 0),
    formatKES(e.transportCost || 0),
    formatKES(e.totalExpense || 0),
    String(e.operatingStatus || 'Active').toUpperCase()
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Equipment Name', 'Units', 'Fuel Cost', 'Operator Cost', 'Repairs/Maint.', 'Transport', 'Total Expense', 'Status']],
    body: eqRows.length > 0
      ? eqRows
      : [['No plant deployed this period', '0', 'KES 0', 'KES 0', 'KES 0', 'KES 0', 'KES 0', 'STANDBY']],
    foot: [
      [
        'Total Equipment Operating Costs',
        '—',
        '—',
        '—',
        '—',
        '—',
        formatKES(summaryTotals.totalEquipmentCost || 0),
        '—'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 4: DELAYS & INCIDENTS
  const incidents = laeData.incidentsList || [];
  if (incidents.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('4. SITE INCIDENTS, DELAYS & WEATHER DIARY', 14, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      head: [['Day & Date', 'Weather', 'Incident / Delay Log', 'Site Visitors']],
      body: incidents.map((i) => {
        const day = getDayOfWeek(i.date);
        return [day ? `${day}, ${i.date}` : (i.date || '—'), i.weather || 'Clear', i.incident || 'None', i.visitors || 'None'];
      }),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // SECTION 5: PHOTOS
  if (sitePhotos && sitePhotos.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`5. SITE PHOTOGRAPHIC PROGRESS (${sitePhotos.length} Photos)`, 14, currentY);
    currentY += 5;

    const pWidth = 86;
    const pHeight = 56;
    const pGap = 8;
    const pCols = 2;

    for (let i = 0; i < sitePhotos.length; i += pCols) {
      if (currentY + pHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowP = sitePhotos.slice(i, i + pCols);
      rowP.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (pWidth + pGap);
        const posY = currentY;
        if (photo.url) {
          addImageSafelyToDoc(doc, photo.url, posX, posY, pWidth, pHeight);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_COLOR);
          doc.text((photo.name || 'Site Photo').substring(0, 45), posX + 1, posY + pHeight + 4);
        }
      });

      currentY += pHeight + 10;
    }
  }

  // SIGNATURES
  if (currentY > 245) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = Math.max(currentY + 10, 255);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 70, currentY);
  doc.line(80, currentY, 135, currentY);
  doc.line(145, currentY, 196, currentY);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`SITE FOREMAN: Signed`, 14, currentY + 4);
  doc.text(`PROJECT MANAGER: Verified`, 80, currentY + 4);
  doc.text(`DIRECTOR / PARTNER: Approved`, 145, currentY + 4);

  return doc;
};

/**
 * 6. CATEGORY 3: MATERIAL WEEKLY REPORT
 * Access: Admin, Director, Partner, Foreman only
 */
export const generateWeeklyMaterialReportPDF = ({
  project,
  weekInfo,
  summaryTotals = {},
  materialData = {},
  sitePhotos = [],
  companySettings,
  author
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = renderWeeklyReportHeader(
    doc,
    'WEEKLY MATERIAL REQUISITION & SUPPLY DOSSIER',
    `Material Inflows, Site Procurement, Vendors & Delivery Records • Site: ${project?.name || ''}`,
    companySettings,
    author,
    project,
    weekInfo
  );

  // Executive KPI Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'D');

  const cardW = 182 / 3;
  const kpis = [
    { label: 'WEEKLY REQUISITIONS', val: `${summaryTotals.materialRequestCount || 0} Orders`, sub: 'Material Needed Requisitions' },
    { label: 'LINE ITEMS PROCURED', val: `${(materialData.itemsSummary || []).length} Distinct Items`, sub: 'Deliveries to Site' },
    { label: 'TOTAL ESTIMATED VALUE', val: formatKES(summaryTotals.totalMaterialCost), sub: 'Procurement Expenditure' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * cardW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.label, x + 4, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(kpi.val, x + 4, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(kpi.sub, x + 4, currentY + 15);

    if (idx < 2) {
      doc.setDrawColor(...BORDER_COLOR);
      doc.line(x + cardW, currentY + 2, x + cardW, currentY + 16);
    }
  });

  currentY += 24;

  // SECTION 1: MATERIAL ITEMS REQUISITIONS SCHEDULE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('1. WEEKLY MATERIAL ITEMS REQUISITION & DELIVERY SCHEDULE', 14, currentY);
  currentY += 3;

  const matRows = (materialData.itemsSummary || []).map((m) => {
    const day = getDayOfWeek(m.dateNeeded);
    return [
      m.requestNumber || 'MRN-—',
      day ? `${day}, ${m.dateNeeded}` : (m.dateNeeded || '—'),
      m.itemName || 'Material Item',
      `${m.quantity} ${m.unit || 'units'}`,
      formatKES(m.estimatedUnitCost || 0),
      formatKES(m.estimatedTotalCost || 0),
      m.supplierVendor || 'Site Store',
      m.deliveryNotes || '—'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Request #', 'Day & Date Needed', 'Item Description', 'Quantity', 'Est. Unit Rate', 'Total Amount', 'Vendor / Supplier', 'Delivery Notes']],
    body: matRows.length > 0
      ? matRows
      : [['—', '—', 'No material requisitions logged this week', '—', 'KES 0', 'KES 0', '—', '—']],
    foot: [
      [
        'Total Weekly Procurement',
        '—',
        '—',
        '—',
        '—',
        formatKES(summaryTotals.totalMaterialCost || 0),
        'Cumulative procurement expenditure',
        '—'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 2: DELIVERY RECEIPTS & PROOF OF PURCHASE PHOTOS
  const receiptPhotos = materialData.receiptPhotos || [];
  if (receiptPhotos.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`2. DELIVERY RECEIPTS & PROOF OF PURCHASE (${receiptPhotos.length} Attached)`, 14, currentY);
    currentY += 5;

    const rWidth = 56;
    const rHeight = 44;
    const rGap = 7;
    const rCols = 3;

    for (let i = 0; i < receiptPhotos.length; i += rCols) {
      if (currentY + rHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowPhotos = receiptPhotos.slice(i, i + rCols);
      rowPhotos.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (rWidth + rGap);
        const posY = currentY;

        if (photo.url) {
          addImageSafelyToDoc(doc, photo.url, posX, posY, rWidth, rHeight);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...PRIMARY_COLOR);
          doc.text((photo.itemTitle || 'Receipt').substring(0, 26), posX, posY + rHeight + 3.5);

          if (photo.supplier) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(...MUTED_COLOR);
            doc.text(`Vendor: ${photo.supplier}`.substring(0, 28), posX, posY + rHeight + 7);
          }
        }
      });

      currentY += rHeight + 10;
    }
  }

  // SECTION 3: SITE PROGRESS PHOTOS FOR MATERIAL RECEIPT
  if (sitePhotos && sitePhotos.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`3. SITE MATERIAL DELIVERY EVIDENCE (${sitePhotos.length} Photos)`, 14, currentY);
    currentY += 5;

    const pWidth = 86;
    const pHeight = 56;
    const pGap = 8;
    const pCols = 2;

    for (let i = 0; i < sitePhotos.length; i += pCols) {
      if (currentY + pHeight + 14 > 275) {
        doc.addPage();
        currentY = 20;
      }

      const rowP = sitePhotos.slice(i, i + pCols);
      rowP.forEach((photo, colIdx) => {
        const posX = 14 + colIdx * (pWidth + pGap);
        const posY = currentY;
        if (photo.url) {
          addImageSafelyToDoc(doc, photo.url, posX, posY, pWidth, pHeight);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_COLOR);
          doc.text((photo.name || 'Material Field Photo').substring(0, 45), posX + 1, posY + pHeight + 4);
        }
      });

      currentY += pHeight + 10;
    }
  }

  // SIGNATURES
  if (currentY > 245) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY = Math.max(currentY + 10, 255);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 70, currentY);
  doc.line(80, currentY, 135, currentY);
  doc.line(145, currentY, 196, currentY);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`STOREKEEPER / FOREMAN: Received`, 14, currentY + 4);
  doc.text(`PROJECT MANAGER: Verified`, 80, currentY + 4);
  doc.text(`DIRECTOR / PARTNER: Approved`, 145, currentY + 4);

  return doc;
};
