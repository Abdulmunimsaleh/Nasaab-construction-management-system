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
  doc.text(`Official Daily Site Diary • Daily Labour Record`, 14, 31);

  currentY = 46;

  // Report Title
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LABOUR DAILY REPORT', 14, currentY);

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
  doc.text('REPORT DATE & DAY', 65, currentY + 6);
  doc.text('PREPARED BY', 122, currentY + 6);
  doc.text('STATUS', 172, currentY + 6);

  const rawLaeDate = form.date || form.reportDate || formatDate(new Date());
  const laeDay = getDayOfWeek(rawLaeDate);
  const displayLaeDate = laeDay ? `${laeDay}, ${rawLaeDate}` : rawLaeDate;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(form.form_number || 'LAE-RECORD', 18, currentY + 12);
  doc.text(displayLaeDate, 65, currentY + 12);
  doc.text(form.prepared_by_name || author?.name || 'Site Foreman', 122, currentY + 12);
  doc.text(String(form.status || 'Submitted').toUpperCase(), 172, currentY + 12);

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

  // SECTION 2: DELAYS, INCIDENTS, VISITORS
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
    doc.text('2. SITE OBSERVATIONS, INCIDENTS & VISITORS', 14, currentY);
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

  // SECTION 3: SITE PHOTOS & FIELD EVIDENCE
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
    doc.text(`3. SITE FIELD PHOTOS & VISUAL EVIDENCE (${validPhotos.length})`, 14, currentY);
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

// ============================================================================
// MODULAR REPORT GENERATION HELPERS
// ============================================================================
const renderReportHeader = (doc, companySettings, reportTitle, subtitle, tagText = 'NASAAB CONSTRUCTION LIMITED') => {
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
  doc.text(tagText, 14, 31);

  let currentY = 46;

  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(reportTitle.toUpperCase(), 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(subtitle, 14, currentY);

  return currentY + 8;
};

const renderPageFooters = (doc, reportName) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`NASAAB CONSTRUCTION LIMITED • ${reportName}`, 14, 290);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} • Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }
};

const renderSignaturesBlock = (doc, currentY, titles = ['PREPARED BY', 'VERIFIED BY', 'APPROVED BY']) => {
  if (currentY > 250) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY = Math.max(currentY + 12, 260);
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, currentY, 68, currentY);
  doc.line(78, currentY, 132, currentY);
  doc.line(142, currentY, 196, currentY);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(titles[0] || 'PREPARED BY', 14, currentY + 4);
  doc.text(titles[1] || 'VERIFIED BY', 78, currentY + 4);
  doc.text(titles[2] || 'APPROVED BY', 142, currentY + 4);

  return currentY + 10;
};

const renderMetricCards = (doc, startY, cards = []) => {
  const count = cards.length;
  if (!count) return startY;
  const gap = 3;
  const totalWidth = 182;
  const cardWidth = (totalWidth - (count - 1) * gap) / count;
  const cardHeight = 15;

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(c.label.toUpperCase(), x + 3, startY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(c.color || PRIMARY_COLOR));
    doc.text(String(c.value), x + 3, startY + 11.5);
  });

  return startY + cardHeight + 6;
};

// ============================================================================
// 1. SUBCONTRACT (PIECE WORK) REPORT PDF
// ============================================================================
export const generateSubcontractReportPDF = ({
  project,
  agreements = [],
  payments = [],
  metrics = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • ${project?.location || 'Operational Site'} • Piece Work Subcontracts`;
  let currentY = renderReportHeader(doc, companySettings, 'Subcontract (Piece Work) Report', subtitle, 'Workforce Trade Contracts & Disbursements');

  const totalValue = metrics.totalValue !== undefined
    ? metrics.totalValue
    : agreements.reduce((s, a) => s + (Number(a.agreedAmount || a.contractAmount) || 0), 0);
  const totalPaid = metrics.totalPaid !== undefined
    ? metrics.totalPaid
    : agreements.reduce((s, a) => s + (Number(a.totalPaid || a.paidAmount) || 0), 0);
  const remaining = Math.max(0, totalValue - totalPaid);

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Total Agreed Sum', value: `KSh ${Number(totalValue).toLocaleString()}` },
    { label: 'Total Paid to Date', value: `KSh ${Number(totalPaid).toLocaleString()}`, color: [5, 150, 105] },
    { label: 'Remaining Balance', value: `KSh ${Number(remaining).toLocaleString()}`, color: [225, 29, 72] },
    { label: 'Active Contracts', value: `${agreements.length} Contracts`, color: ACCENT_COLOR }
  ]);

  // Section 1: Subcontract Agreements Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`1. SUBCONTRACT AGREEMENTS REGISTER (${agreements.length})`, 14, currentY);
  currentY += 4;

  const agreementRows = agreements.map((a) => {
    const agreed = Number(a.agreedAmount || a.contractAmount) || 0;
    const paid = Number(a.totalPaid) || 0;
    const bal = Math.max(0, agreed - paid);
    return [
      a.contractId || a.id || 'SC-REF',
      a.teamName || a.trade || 'General Trade',
      a.floor || a.zone || 'Site Floor',
      `KSh ${agreed.toLocaleString()}`,
      `KSh ${paid.toLocaleString()}`,
      `KSh ${bal.toLocaleString()}`,
      a.status || (bal <= 0 ? 'Fully Paid' : 'Active')
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Contract Ref', 'Trade / Team', 'Floor / Zone', 'Agreed Sum', 'Total Paid', 'Balance', 'Status']],
    body: agreementRows.length > 0 ? agreementRows : [['No agreements found', '—', '—', '0', '0', '0', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 26 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Section 2: Recent Disbursements
  if (payments && payments.length > 0) {
    if (currentY + 40 > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`2. RECENT DISBURSEMENTS & PAYMENTS LOG (${payments.length})`, 14, currentY);
    currentY += 4;

    const paymentRows = payments.slice(0, 15).map((p) => [
      p.paymentRef || p.id || 'PAY-REF',
      p.agreementId || '—',
      p.teamName || '—',
      p.floor || '—',
      p.weekPeriod || 'Current Week',
      `KSh ${(Number(p.paidThisWeek) || 0).toLocaleString()}`,
      p.date || '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Payment Ref', 'Contract', 'Team / Subcontractor', 'Floor', 'Period', 'Amount Paid', 'Date']],
      body: paymentRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 42 },
        3: { cellWidth: 24 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 18, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 4;
  }

  renderSignaturesBlock(doc, currentY, ['SUBCONTRACTOR REP: Signed', 'PROJECT MANAGER: Certified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Subcontract (Piece Work) Report');
  return doc;
};

// ============================================================================
// 2. DAILY LABOUR REPORT PDF
// ============================================================================
export const generateDailyLabourSummaryPDF = ({
  project,
  forms = [],
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Daily Workforce & Trade Operations Log`;
  let currentY = renderReportHeader(doc, companySettings, 'Daily Labour & Workforce Dossier', subtitle, 'Daily Shift Forms & Trade Headcount Register');

  let totalWorkers = 0;
  let totalCost = 0;
  forms.forEach((f) => {
    if (Array.isArray(f.labourItems)) {
      f.labourItems.forEach((it) => {
        const fc = Number(it.foreman_count || it.foremanCount || 0);
        const sc = Number(it.skilled_count || it.skilledCount || 0);
        const uc = Number(it.unskilled_count || it.unskilledCount || 0);
        totalWorkers += (fc + sc + uc) || Number(it.number_of_workers || 0);
        totalCost += Number(it.total_cost || (fc * 1500 + sc * 1000 + uc * 500));
      });
    }
  });

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Daily Forms Logged', value: `${forms.length} Shifts` },
    { label: 'Cumulative Headcount', value: `${totalWorkers} Workers`, color: ACCENT_COLOR },
    { label: 'Est. Labour Expenditure', value: `KSh ${Math.round(totalCost).toLocaleString()}`, color: [5, 150, 105] },
    { label: 'Active Worksite', value: projName.substring(0, 18) }
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`DAILY SHIFT FORMS REGISTER (${forms.length} Records)`, 14, currentY);
  currentY += 4;

  const formRows = forms.map((f) => {
    let wCount = 0;
    let cSum = 0;
    if (Array.isArray(f.labourItems)) {
      f.labourItems.forEach((it) => {
        const fc = Number(it.foreman_count || it.foremanCount || 0);
        const sc = Number(it.skilled_count || it.skilledCount || 0);
        const uc = Number(it.unskilled_count || it.unskilledCount || 0);
        wCount += (fc + sc + uc) || Number(it.number_of_workers || 0);
        cSum += Number(it.total_cost || (fc * 1500 + sc * 1000 + uc * 500));
      });
    }
    const rawDate = (f.date || f.created_at || '').split('T')[0];
    return [
      f.form_number || f.formNumber || 'LAE-FORM',
      rawDate || '—',
      getDayOfWeek(rawDate) || '—',
      f.prepared_by_name || 'Site Foreman',
      String(wCount || '—'),
      `KSh ${Math.round(cSum).toLocaleString()}`,
      String(f.status || 'Submitted').toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Form #', 'Date', 'Day', 'Prepared By', 'Workers', 'Est. Labour Cost', 'Status']],
    body: formRows.length > 0 ? formRows : [['No daily shift records found', '—', '—', '—', '0', 'KSh 0', '—']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 38 },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  renderSignaturesBlock(doc, doc.lastAutoTable.finalY + 6, ['SITE FOREMAN: Verified', 'PROJECT MANAGER: Certified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Daily Labour & Workforce Dossier');
  return doc;
};

// ============================================================================
// 3. EQUIPMENT & MACHINERY REPORT PDF
// ============================================================================
export const generateEquipmentReportPDF = ({
  project,
  equipmentList = [],
  expensesList = [],
  metrics = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Plant, Machinery Deployments & Equipment Expenses`;
  let currentY = renderReportHeader(doc, companySettings, 'Equipment & Machinery Operational Dossier', subtitle, 'Plant Deployments & Operational Fleet Tracker');

  const activeCount = equipmentList.filter((e) => (e.status || '').toLowerCase().includes('active') || (e.status || '').toLowerCase().includes('deployed')).length;
  const totalExpenses = expensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Total Fleet Deployed', value: `${equipmentList.length} Units` },
    { label: 'Active Machinery', value: `${activeCount} Units`, color: [5, 150, 105] },
    { label: 'Equipment Expenses', value: `KSh ${Number(totalExpenses).toLocaleString()}`, color: ACCENT_COLOR },
    { label: 'Active Worksite', value: projName.substring(0, 18) }
  ]);

  // Section 1: Machinery Inventory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`1. SITE MACHINERY & FLEET DEPLOYMENT (${equipmentList.length} Units)`, 14, currentY);
  currentY += 4;

  const equipRows = equipmentList.map((e) => [
    e.name || e.equipment_name || 'Machinery Unit',
    e.category || 'Plant Equipment',
    e.status || 'Active',
    e.condition || 'Good',
    e.dailyRate ? `KSh ${Number(e.dailyRate).toLocaleString()}` : '—',
    e.operator || e.operator_name || 'Site Assigned',
    e.location || projName
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Machine Name / Unit', 'Category', 'Status', 'Condition', 'Daily Rate', 'Operator / Vendor', 'Location']],
    body: equipRows.length > 0 ? equipRows : [['No equipment registered for this site', '—', '—', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28 },
      6: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Section 2: Equipment Expenses
  if (expensesList && expensesList.length > 0) {
    if (currentY + 40 > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`2. EQUIPMENT OPERATIONAL & MAINTENANCE EXPENSES (${expensesList.length})`, 14, currentY);
    currentY += 4;

    const expRows = expensesList.map((exp) => [
      exp.id || 'EXP',
      exp.date || '—',
      exp.description || 'Equipment expense',
      exp.supplier || 'Site Supplier',
      exp.category || 'Maintenance / Fuel',
      `KSh ${(Number(exp.amount) || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['ID', 'Date', 'Description', 'Supplier / Vendor', 'Category', 'Amount (KSh)']],
      body: expRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 50 },
        3: { cellWidth: 34 },
        4: { cellWidth: 26 },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 4;
  }

  renderSignaturesBlock(doc, currentY, ['PLANT OPERATOR: Verified', 'SITE ENGINEER: Certified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Equipment & Machinery Operational Dossier');
  return doc;
};

// ============================================================================
// 4. SAFETY & DELAYS REPORT PDF
// ============================================================================
export const generateSafetyDelaysReportPDF = ({
  project,
  records = [],
  stats = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • HSE Incidents, Delays & Site Visitors`;
  let currentY = renderReportHeader(doc, companySettings, 'HSE, Site Delays & Visitors Register', subtitle, 'Official Health, Safety & Environmental Record');

  const delays = records.filter((r) => r.category === 'delay');
  const safety = records.filter((r) => r.category === 'safety');
  const visitors = records.filter((r) => r.category === 'visitor');
  const totalLostHours = delays.reduce((acc, d) => acc + (d.durationHours || 0), 0);

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Logged Delays', value: `${delays.length} Incidents` },
    { label: 'Lost Stoppage Hours', value: `${totalLostHours.toFixed(1)} Hours`, color: [225, 29, 72] },
    { label: 'Safety Audits & Talks', value: `${safety.length} Logged`, color: [5, 150, 105] },
    { label: 'Official Site Visitors', value: `${visitors.length} Registered`, color: ACCENT_COLOR }
  ]);

  // Table 1: Delays
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`1. SITE DELAYS & WEATHER INTERRUPTIONS (${delays.length})`, 14, currentY);
  currentY += 4;

  const delayRows = delays.map((d) => [
    d.date || '—',
    d.title || d.cause || 'Site Interruption',
    d.severity || 'Medium',
    `${d.durationHours || 0} hrs`,
    d.actionTaken || d.description || 'Mitigation logged'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Delay Cause & Description', 'Severity', 'Duration', 'Remedial Action Taken']],
    body: delayRows.length > 0 ? delayRows : [['No delays recorded for this project', '—', '—', '0 hrs', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 58, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 62 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Table 2: Safety & Toolbox Talks
  if (currentY + 40 > 270) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`2. HEALTH & SAFETY AUDITS & TOOLBOX TALKS (${safety.length})`, 14, currentY);
  currentY += 4;

  const safetyRows = safety.map((s) => [
    s.date || '—',
    s.title || s.description || 'Safety briefing',
    s.severity || 'Low',
    s.actionTaken || 'Full PPE compliance checked',
    s.totalAmount ? `KSh ${Number(s.totalAmount).toLocaleString()}` : '—'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Safety Topic / Incident', 'Severity', 'Action Taken & Measures', 'Medical Cost']],
    body: safetyRows.length > 0 ? safetyRows : [['No safety incidents or talks recorded', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 54 },
      4: { cellWidth: 24, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Table 3: Visitors
  if (visitors.length > 0) {
    if (currentY + 40 > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`3. OFFICIAL SITE VISITORS LOG (${visitors.length})`, 14, currentY);
    currentY += 4;

    const visitorRows = visitors.map((v) => [
      v.date || '—',
      v.visitorName || 'Official Visitor',
      v.visitorOrg || 'Inspection Authority',
      v.purpose || 'Site Inspection',
      v.actionTaken || 'Clearance granted'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Visitor Name', 'Organisation', 'Purpose of Visit', 'Action / Clearance']],
      body: visitorRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 46 },
        4: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 4;
  }

  renderSignaturesBlock(doc, currentY, ['HSE OFFICER: Verified', 'PROJECT MANAGER: Certified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'HSE, Site Delays & Visitors Register');
  return doc;
};

// ============================================================================
// 5. SITE PROGRESS REPORT PDF
// ============================================================================
export const generateSiteProgressReportPDF = ({
  project,
  activities = [],
  stats = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Task Progression, Milestones & Live Status`;
  let currentY = renderReportHeader(doc, companySettings, 'Site Progress & Task Tracking Dossier', subtitle, 'Operational Progress Milestones & Execution Ledger');

  const total = stats.total || activities.length;
  const inProg = stats.inProgress || activities.filter((a) => (a.status || '').toLowerCase().includes('progress')).length;
  const comp = stats.completed || activities.filter((a) => (a.status || '').toLowerCase().includes('completed') || (a.status || '').toLowerCase().includes('done')).length;
  const avg = stats.avgProgress || Math.round(activities.reduce((s, a) => s + (Number(a.progress) || 0), 0) / (activities.length || 1));

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Total Tracked Tasks', value: `${total} Tasks` },
    { label: 'In Progress', value: `${inProg} Tasks`, color: ACCENT_COLOR },
    { label: 'Completed Milestones', value: `${comp} Tasks`, color: [5, 150, 105] },
    { label: 'Average Progress', value: `${avg}% Completed`, color: PRIMARY_COLOR }
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`OPERATIONAL ACTIVITIES & MILESTONES (${activities.length} Items)`, 14, currentY);
  currentY += 4;

  const actRows = activities.map((act) => [
    act.description || act.activity_description || 'Construction Task',
    act.category || 'General Operations',
    act.zone || 'Site Zone',
    `${act.progress || 0}%`,
    String(act.status || 'In Progress').replace('_', ' ').toUpperCase(),
    act.workDoneToday || act.remarks || '—'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Task Description', 'Category', 'Zone / Floor', 'Progress', 'Status', 'Work Executed Today / Notes']],
    body: actRows.length > 0 ? actRows : [['No activities registered for this site', '—', '—', '0%', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 44 }
    },
    margin: { left: 14, right: 14 }
  });

  renderSignaturesBlock(doc, doc.lastAutoTable.finalY + 6, ['SITE FOREMAN: Verified', 'LEAD ENGINEER: Certified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Site Progress & Task Tracking Dossier');
  return doc;
};

// ============================================================================
// 6. MATERIAL REQUISITIONS REPORT PDF
// ============================================================================
export const generateMaterialRequisitionsSummaryPDF = ({
  project,
  requests = [],
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Materials Requisitions & Site Demand Register`;
  let currentY = renderReportHeader(doc, companySettings, 'Material Needed Requisitions Register', subtitle, 'Procurement Demand Register & Site Materials Required');

  const fulfilled = requests.filter((r) => r.status === 'fulfilled' || r.status === 'approved').length;
  const pending = requests.filter((r) => r.status === 'pending' || r.status === 'submitted').length;

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Total Requisitions Logged', value: `${requests.length} Logs` },
    { label: 'Fulfilled / Approved', value: `${fulfilled} Requests`, color: [5, 150, 105] },
    { label: 'Pending Review', value: `${pending} Requests`, color: ACCENT_COLOR },
    { label: 'Active Worksite', value: projName.substring(0, 18) }
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`MATERIAL REQUISITIONS REGISTER (${requests.length} Forms)`, 14, currentY);
  currentY += 4;

  const reqRows = requests.map((req) => {
    const rawDate = (req.date_needed || req.created_at || '').split('T')[0];
    const itemsCount = Array.isArray(req.items) ? req.items.length : 0;
    const hasUrgent = Array.isArray(req.items) && req.items.some((i) => (i.urgency || '').toLowerCase() === 'urgent');
    return [
      req.request_number || req.id || 'REQ',
      rawDate || '—',
      req.requested_by_name || 'Storekeeper',
      `${itemsCount} items`,
      hasUrgent ? 'URGENT' : 'Normal',
      String(req.status || 'Submitted').toUpperCase(),
      req.notes || 'Requisition on file'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Request #', 'Date Needed', 'Requested By', 'Item Count', 'Priority', 'Status', 'Notes / Scope']],
    body: reqRows.length > 0 ? reqRows : [['No material requests registered for this site', '—', '—', '0', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 38 }
    },
    margin: { left: 14, right: 14 }
  });

  renderSignaturesBlock(doc, doc.lastAutoTable.finalY + 6, ['STOREKEEPER: Requested', 'PROJECT MANAGER: Verified', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Material Needed Requisitions Register');
  return doc;
};

// ============================================================================
// 7. MATERIALS RECEIVED REPORT PDF
// ============================================================================
export const generateMaterialsReceivedReportPDF = ({
  project,
  deliveries = [],
  summary = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Materials Received on Site & Intake Register`;
  let currentY = renderReportHeader(doc, companySettings, 'Materials Received on Site Register', subtitle, 'Warehouse & Stores Goods Inward Deliveries Record');

  const totalValue = summary.totalValue !== undefined
    ? summary.totalValue
    : deliveries.reduce((s, d) => s + (Number(d.totalCost) || 0), 0);
  const suppliersCount = summary.activeSuppliers !== undefined
    ? summary.activeSuppliers
    : new Set(deliveries.map((d) => d.supplier).filter(Boolean)).size;

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Shipments Received', value: `${deliveries.length} Deliveries` },
    { label: 'Total Verified Value', value: `KSh ${Number(totalValue).toLocaleString()}`, color: [5, 150, 105] },
    { label: 'Active Suppliers', value: `${suppliersCount} Vendors`, color: ACCENT_COLOR },
    { label: 'Active Worksite', value: projName.substring(0, 18) }
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`DELIVERIES INWARD REGISTER (${deliveries.length} Shipments)`, 14, currentY);
  currentY += 4;

  const delivRows = deliveries.map((d) => [
    d.deliveryNoteNo || d.id || 'DN-VERIFIED',
    d.date || '—',
    d.itemName || 'Material Item',
    d.supplier || 'Approved Supplier',
    d.quantity || '1 unit',
    d.totalCost ? `KSh ${Number(d.totalCost).toLocaleString()}` : '—',
    d.receivedBy || 'Storekeeper',
    d.status || 'Verified'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Delivery Ref', 'Date', 'Material Item', 'Supplier / Vendor', 'Quantity', 'Total Value', 'Received By', 'Status']],
    body: delivRows.length > 0 ? delivRows : [['No deliveries recorded for this site', '—', '—', '—', '0', 'KSh 0', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 36, fontStyle: 'bold' },
      3: { cellWidth: 30 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20 },
      7: { cellWidth: 18, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  renderSignaturesBlock(doc, doc.lastAutoTable.finalY + 6, ['STOREKEEPER: Received', 'QA / FOREMAN: Inspected', 'DIRECTOR: Approved']);
  renderPageFooters(doc, 'Materials Received on Site Register');
  return doc;
};

// ============================================================================
// 8. MATERIAL EXPENSES REPORT PDF
// ============================================================================
export const generateMaterialExpensesReportPDF = ({
  project,
  funds = [],
  expenses = [],
  metrics = {},
  companySettings,
  author
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const projName = project?.name || 'All Sites Combined';
  const subtitle = `Project Site: ${projName} (${project?.code || 'SITE'}) • Financial Audit, Developer Funding & Purchases`;
  let currentY = renderReportHeader(doc, companySettings, 'Material Expenses & Financial Audit Dossier', subtitle, 'Material Procurement Expenditure & Working Capital Audit');

  const totalFunds = metrics.totalFundsReceived !== undefined
    ? metrics.totalFundsReceived
    : funds.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalExp = metrics.totalMaterialExpenses !== undefined
    ? metrics.totalMaterialExpenses
    : expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = totalFunds - totalExp;

  currentY = renderMetricCards(doc, currentY, [
    { label: 'Total Funds Received', value: `KSh ${Number(totalFunds).toLocaleString()}`, color: [5, 150, 105] },
    { label: 'Material Expenses', value: `KSh ${Number(totalExp).toLocaleString()}`, color: [225, 29, 72] },
    { label: 'Available Balance', value: `KSh ${Number(balance).toLocaleString()}`, color: balance >= 0 ? [5, 150, 105] : [225, 29, 72] },
    { label: 'Transactions', value: `${expenses.length} Entries`, color: ACCENT_COLOR }
  ]);

  // Section 1: Developer Funds Received
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`1. FUNDS RECEIVED AUDIT (${funds.length} Deposits)`, 14, currentY);
  currentY += 4;

  const fundRows = funds.map((f) => [
    f.reference || f.id || 'DEP-REF',
    f.date || '—',
    f.description || 'Project material funding',
    `KSh ${(Number(f.amount) || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Receipt / Reference', 'Date Received', 'Description / Purpose', 'Amount Received (KSh)']],
    body: fundRows.length > 0 ? fundRows : [['No developer funds recorded for this site', '—', '—', 'KSh 0']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 85 },
      3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Section 2: Material Expenses Transactions
  if (expenses && expenses.length > 0) {
    if (currentY + 40 > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`2. MATERIAL EXPENSE TRANSACTIONS (${expenses.length})`, 14, currentY);
    currentY += 4;

    const expRows = expenses.map((e) => [
      e.expenseId || e.id || 'EXP',
      e.date || '—',
      e.description || 'Materials',
      e.supplier || 'Site Vendor',
      e.quantity || '1 Lot',
      e.category || 'General',
      e.invoiceRef || '—',
      `KSh ${(Number(e.amount) || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Expense ID', 'Date', 'Description', 'Supplier / Vendor', 'Quantity', 'Category', 'Invoice', 'Amount (KSh)']],
      body: expRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.8 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 18 },
        2: { cellWidth: 42 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18 },
        5: { cellWidth: 24 },
        6: { cellWidth: 16 },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 4;
  }

  renderSignaturesBlock(doc, currentY, ['STOREKEEPER: Verified', 'ACCOUNTANT: Audited', 'MANAGING DIRECTOR: Approved']);
  renderPageFooters(doc, 'Material Expenses & Financial Audit Dossier');
  return doc;
};

