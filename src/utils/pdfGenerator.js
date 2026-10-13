// Professional Construction PDF Report Generator for BuildTrack using jsPDF and jspdf-autotable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatKES, formatDate } from './formatters';

export const generateConstructionReportPDF = ({
  project,
  reportType,
  dateRange,
  sections = {},
  companySettings,
  author,
  userRole,
  data = {}
}) => {
  const hideCosts = userRole === 'Foreman' || (userRole && !['Admin', 'Contractor', 'Project Manager'].includes(userRole));
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42]; // Slate-900
  const accentColor = [217, 119, 6]; // Amber-600
  const mutedColor = [100, 116, 139]; // Slate-500
  const lightBg = [248, 250, 252]; // Slate-50

  let currentY = 14;

  // --- 1. HEADER BANNER ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 36, 'F');

  // Decorative construction stripe
  doc.setFillColor(...accentColor);
  doc.rect(0, 36, 210, 2, 'F');

  // Company Name & Logo Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((companySettings?.companyName || 'BUILDTRACK INFRASTRUCTURE').toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(companySettings?.ncaRegistration || 'NCA 1 - Building & Civil Engineering Works', 14, 21);
  doc.text(`${companySettings?.address || 'Nairobi, Kenya'} | Tel: ${companySettings?.phone || '+254 700 000 000'}`, 14, 26);
  doc.text(`Official Site Report • Registered System Generated`, 14, 31);

  // Report Type Badge
  doc.setFillColor(...accentColor);
  doc.roundedRect(116, 10, 80, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(reportType.toUpperCase(), 156, 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(dateRange ? `PERIOD: ${dateRange.substring(0, 32)}` : `DATE: ${formatDate(new Date())}`, 156, 22, { align: 'center' });

  currentY = 46;

  // --- 2. PROJECT OVERVIEW CARD ---
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 32, 2, 2, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(project?.name || 'All Active Projects Overview', 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedColor);

  doc.text(`Project Code: ${project?.code || 'AGG-ALL'}`, 18, currentY + 13);
  doc.text(`Client: ${project?.client || 'Multi-Client Consortium'}`, 18, currentY + 18);
  doc.text(`Location: ${project?.location || 'Kenya Sites'}`, 18, currentY + 23);
  doc.text(`Project Manager: ${project?.projectManager || 'Eng. In-Charge'}`, 18, currentY + 28);

  // Right column inside card
  const rightX = 110;
  doc.text(`Status: ${project?.status || 'Active'}`, rightX, currentY + 13);
  doc.text(`Progress: ${project?.progress || 0}% Completed`, rightX, currentY + 18);
  if (!hideCosts) {
    doc.text(`Contract Value: ${formatKES(project?.contractValue || 0)}`, rightX, currentY + 23);
    doc.text(`Budget Spent: ${formatKES(project?.spent || 0)} (${project ? Math.round((project.spent / project.budget) * 100) : 0}%)`, rightX, currentY + 28);
  } else {
    doc.text(`Category: ${project?.category || 'Civil Infrastructure'}`, rightX, currentY + 23);
    doc.text(`Target Handover: ${formatDate(project?.expectedCompletion)}`, rightX, currentY + 28);
  }

  currentY += 38;

  // --- 4. SECTIONS CONTENT BASED ON REPORT TYPE & OPTIONS ---


  // --- Check for Weekly Report Mode ---
  const isWeekly = Boolean(data.weeklyData || (reportType && reportType.toLowerCase().includes('weekly')));
  const weeklyScope = data.weeklyScope || (
    reportType === 'Weekly Labour Report Only' ? 'labour' :
    reportType === 'Weekly Activity Report Only' ? 'activity' :
    'combined'
  );
  const isWeeklyCombined = isWeekly && weeklyScope === 'combined';
  let skipOtherSections = false;

  if (isWeekly && data.weeklyData) {
    const wd = data.weeklyData;

    // --- SCOPE 1: WEEKLY ACTIVITY REPORT ONLY ---
    if (weeklyScope === 'activity') {
      skipOtherSections = true;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('1. WEEKLY SITE ACTIVITIES & PROGRESS LOG (MONDAY – SUNDAY)', 14, currentY);
      currentY += 4;

      const activityRows = wd.days.map((day) => [
        `${day.dayName}\n${day.dateFormatted}`,
        day.workDoneToday || 'Scheduled shift structural works executed.',
        day.workPlanTomorrow || 'Follow master program works.',
        day.delaysAndSafetyIncidents || 'Zero safety incidents.'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Day & Date', 'Work Completed (Today)', 'Planned Work (Next Day)', 'Delays & Safety Log']],
        body: activityRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 64 },
          2: { cellWidth: 54 },
          3: { cellWidth: 36 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // Section 2: Trade-specific weekly activity summary
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('2. TRADE-SPECIFIC WEEKLY WORKS BREAKDOWN', 14, currentY);
      currentY += 4;

      const tradeMap = {};
      wd.days.forEach((day) => {
        (day.labourCategories || []).forEach((cat) => {
          const tName = cat.tradeName || 'General Trade';
          if (!tradeMap[tName]) tradeMap[tName] = [];
          if (cat.workDoneToday && !tradeMap[tName].includes(cat.workDoneToday)) {
            tradeMap[tName].push(`${day.dayName.substring(0, 3)}: ${cat.workDoneToday}`);
          }
        });
      });

      const tradeTaskRows = Object.entries(tradeMap).map(([trade, tasks]) => [
        trade,
        tasks.length > 0 ? tasks.join('\n• ') : 'Executed daily trade assignment according to supervisor specifications.'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Labour Trade / Specialty', 'Weekly Accomplishments & Handover Milestones']],
        body: tradeTaskRows,
        theme: 'grid',
        headStyles: { fillColor: accentColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 132 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // --- SCOPE 2: WEEKLY LABOUR REPORT ONLY ---
    else if (weeklyScope === 'labour') {
      skipOtherSections = true;

      // --- Section header with badge ---
      doc.setFillColor(...primaryColor);
      doc.roundedRect(14, currentY - 2, 182, 10, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('1. WEEKLY LABOUR & WORKFORCE DEPLOYMENT (MONDAY – SUNDAY)', 18, currentY + 4);

      // "Categorised Structure" badge on right
      doc.setFillColor(...accentColor);
      doc.roundedRect(152, currentY - 0.5, 40, 7, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.text('Categorised Structure', 172, currentY + 4, { align: 'center' });

      doc.setTextColor(...primaryColor);
      currentY += 14;

      // --- Group labour categories by trade across all days ---
      const tradeGroupMap = {};
      wd.days.forEach((day) => {
        (day.labourCategories || []).forEach((cat) => {
          const tName = cat.tradeName || 'General Trade';
          if (!tradeGroupMap[tName]) {
            tradeGroupMap[tName] = {
              tradeName: tName,
              description: '',
              days: [],
              totalForemen: 0,
              totalSkilled: 0,
              totalHelpers: 0,
              totalHeadcount: 0,
              totalCost: 0,
              foremanRate: Number(cat.foremanRate) || 1500,
              skilledRate: Number(cat.skilledRate) || 1000,
              helperRate: Number(cat.helperRate) || 500
            };
          }
          const fRate = Number(cat.foremanRate) || 1500;
          const sRate = Number(cat.skilledRate) || 1000;
          const hRate = Number(cat.helperRate) || 500;
          const fCount = Number(cat.foremanCount) || 0;
          const sCount = Number(cat.skilledCount) || 0;
          const hCount = Number(cat.unskilledCount) || 0;
          const headcount = cat.headcount || (fCount + sCount + hCount);
          const cost = cat.cost ?? (fCount * fRate + sCount * sRate + hCount * hRate);

          tradeGroupMap[tName].days.push({
            dayName: day.dayName,
            dateFormatted: day.dateFormatted,
            foremanCount: fCount,
            skilledCount: sCount,
            helperCount: hCount,
            headcount,
            rateStr: `${fRate.toLocaleString()} / ${sRate.toLocaleString()} / ${hRate.toLocaleString()}`,
            cost
          });

          tradeGroupMap[tName].totalForemen += fCount;
          tradeGroupMap[tName].totalSkilled += sCount;
          tradeGroupMap[tName].totalHelpers += hCount;
          tradeGroupMap[tName].totalHeadcount += headcount;
          tradeGroupMap[tName].totalCost += cost;
        });
      });

      // Trade styling metadata mapping
      const tradeMeta = {
        'Formwork Carpenters': {
          subtitle: 'Timber & Steel Panel Shuttering, Formwork Assembly & Stripping',
          dotColor: [245, 158, 11],
          rateStd: '1,500 / 1,000 / 500',
          modelDesc: 'Weighted Daily Rates',
          subtotalLabel: 'FORMWORK SUBTOTAL',
          subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
        },
        'Steel Fixers & Benders': {
          subtitle: 'Rebar Fabrication, Bending, Tying & Column Reinforcement',
          dotColor: [37, 99, 235],
          rateStd: '1,500 / 1,000 / 500',
          modelDesc: 'Fixed Weekly Rate Model',
          subtotalLabel: 'STEEL FIXERS SUBTOTAL',
          subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
        },
        'Steel Fixers (Special Shift)': {
          subtitle: 'Saturday Intensive Structural Slab Pre-Pour Reinforcement',
          dotColor: [13, 148, 136],
          rateStd: '2,500 / 800 / 700',
          modelDesc: 'Weekend Accelerated Rate',
          subtotalLabel: 'WEEKEND SHIFT SUBTOTAL',
          subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
        },
        'General Site Workforce': {
          subtitle: 'Excavation, Site Logistics, Material Handling & Concreting Ops',
          dotColor: [5, 150, 105],
          rateStd: '2,500 / 1,500 / 800',
          modelDesc: 'Internal Package Allocation',
          subtotalLabel: 'GENERAL WORKFORCE SUBTOTAL',
          subtotalBadge: (cost) => cost === 0 ? 'Subtotal: KES 0 (Subcontract/Prepaid)' : `Subtotal: ${formatKES(cost)}`
        }
      };

      // Desired order for visual hierarchy matching image
      const preferredOrder = [
        'Formwork Carpenters',
        'Steel Fixers & Benders',
        'Steel Fixers (Special Shift)',
        'General Site Workforce'
      ];

      const allTradeNames = Object.keys(tradeGroupMap);
      const sortedTradeNames = [
        ...preferredOrder.filter((name) => allTradeNames.includes(name)),
        ...allTradeNames.filter((name) => !preferredOrder.includes(name))
      ];

      const tradeGroups = sortedTradeNames.map((name) => tradeGroupMap[name]);

      // --- Render each trade as a categorised section ---
      tradeGroups.forEach((trade) => {
        const meta = tradeMeta[trade.tradeName] || {
          subtitle: 'Specialised trade operations and site works',
          dotColor: [100, 116, 139],
          rateStd: `${trade.foremanRate.toLocaleString()} / ${trade.skilledRate.toLocaleString()} / ${trade.helperRate.toLocaleString()}`,
          modelDesc: 'Weighted Daily Rates',
          subtotalLabel: `${trade.tradeName.toUpperCase()} SUBTOTAL`,
          subtotalBadge: (cost) => `Subtotal: ${formatKES(cost)}`
        };

        const activeDays = trade.days.filter((d) => d.headcount > 0);
        if (activeDays.length === 0) return;

        if (currentY > 215) {
          doc.addPage();
          currentY = 16;
        }

        // Trade header card (clean light background with border)
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, currentY, 182, 11, 1, 1, 'FD');

        // Color indicator swatch
        doc.setFillColor(...meta.dotColor);
        doc.roundedRect(17, currentY + 3.5, 3, 3, 0.5, 0.5, 'F');

        // Trade Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`TRADE: ${trade.tradeName.toUpperCase()}`, 22, currentY + 5);

        // Subtitle description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(meta.subtitle, 22, currentY + 8.5);

        // Badges on right side
        // Badge 1: Rate Std
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(108, currentY + 2.5, 32, 6, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Rate Std: ${meta.rateStd}`, 124, currentY + 6.2, { align: 'center' });

        // Badge 2: Man-Days
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(142, currentY + 2.5, 18, 6, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(29, 78, 216);
        doc.text(`Man-Days: ${trade.totalHeadcount}`, 151, currentY + 6.2, { align: 'center' });

        // Badge 3: Subtotal
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(253, 230, 138);
        doc.roundedRect(162, currentY + 2.5, 32, 6, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(146, 64, 14);
        doc.text(meta.subtotalBadge(trade.totalCost), 178, currentY + 6.2, { align: 'center' });

        currentY += 12;

        // Day-by-day table for this trade
        const tradeRows = activeDays.map((d) => [
          `${d.dayName.substring(0, 3)} ${d.dateFormatted.substring(0, 6)}`,
          String(d.foremanCount),
          String(d.skilledCount),
          String(d.helperCount),
          String(d.headcount),
          d.rateStr,
          formatKES(d.cost)
        ]);

        // Subtotal row
        tradeRows.push([
          meta.subtotalLabel,
          String(trade.totalForemen),
          String(trade.totalSkilled),
          String(trade.totalHelpers),
          String(trade.totalHeadcount),
          meta.modelDesc,
          formatKES(trade.totalCost)
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['DAY & DATE', 'FOREMAN', 'SKILLED', 'HELPERS', 'TOTAL WORKERS', 'RATES (F / S / H)', 'DAILY COST']],
          body: tradeRows,
          theme: 'grid',
          headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 6.5, cellPadding: 2 },
          bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59], cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 32, fontStyle: 'bold' },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 36, fontSize: 6 },
            6: { halign: 'right', cellWidth: 38, fontStyle: 'bold' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.row.index === tradeRows.length - 1) {
              hookData.cell.styles.fontStyle = 'bold';
              hookData.cell.styles.fillColor = [255, 255, 255];
              hookData.cell.styles.textColor = [15, 23, 42];
              if (hookData.column.index === 5) {
                hookData.cell.styles.fontStyle = 'italic';
                hookData.cell.styles.textColor = [148, 163, 184];
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 8;
      });

      // --- Consolidated Weekly Metrics Banner ---
      if (currentY > 230) {
        doc.addPage();
        currentY = 16;
      }

      // Deep Navy Container
      doc.setFillColor(16, 28, 46);
      doc.roundedRect(14, currentY, 182, 19, 1.5, 1.5, 'F');

      // Left Titles
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(245, 158, 11);
      doc.text('CONSOLIDATED WEEKLY METRICS', 18, currentY + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('ALL TRADES DEPLOYMENT & EXPENDITURE', 18, currentY + 10.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sum of all site trades across ${wd.weekRangeText}`, 18, currentY + 15);

      // Right Stats Box 1: Total Workers
      doc.setFillColor(23, 39, 62);
      doc.roundedRect(132, currentY + 2.5, 24, 14, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('TOTAL WORKERS', 144, currentY + 6.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(245, 158, 11);
      doc.text(String(wd.totalWeeklyManDays), 144, currentY + 13, { align: 'center' });

      // Right Stats Box 2: Week Labour Cost
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(159, currentY + 2.5, 34, 14, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(15, 23, 42);
      doc.text('WEEK LABOUR COST', 176, currentY + 6.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(formatKES(wd.totalWeeklyLabourCost), 176, currentY + 13, { align: 'center' });

      currentY += 25;

      // --- Section 2: Weekly Trade Matrix (Mon to Sun) ---
      if (currentY > 215) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('2. WEEKLY TRADE ROSTER & MAN-DAYS MATRIX', 14, currentY);

      // "Audit Cross-Reference" badge
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(165, currentY - 3.5, 31, 5, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Audit Cross-Reference', 180.5, currentY - 0.2, { align: 'center' });
      currentY += 3;

      const matrixRows = wd.tradeMatrix.map((tm) => [
        tm.tradeName,
        String(tm.mon),
        String(tm.tue),
        String(tm.wed),
        String(tm.thu),
        String(tm.fri),
        String(tm.sat),
        String(tm.sun),
        String(tm.totalManDays),
        formatKES(tm.totalCost)
      ]);

      matrixRows.push([
        'DAILY TOTAL WORKERS',
        String(wd.days[0]?.workersPresent || 0),
        String(wd.days[1]?.workersPresent || 0),
        String(wd.days[2]?.workersPresent || 0),
        String(wd.days[3]?.workersPresent || 0),
        String(wd.days[4]?.workersPresent || 0),
        String(wd.days[5]?.workersPresent || 0),
        String(wd.days[6]?.workersPresent || 0),
        String(wd.totalWeeklyManDays),
        formatKES(wd.totalWeeklyLabourCost)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['TRADE / CATEGORY', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MAN-DAYS', 'TOTAL COST (KES)']],
        body: matrixRows,
        theme: 'grid',
        headStyles: { fillColor: [194, 101, 8], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
        bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 46, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 12 },
          2: { halign: 'center', cellWidth: 12 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'center', cellWidth: 12 },
          6: { halign: 'center', cellWidth: 12 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          9: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            // Footer row styling: Dark navy with amber text
            if (hookData.row.index === matrixRows.length - 1) {
              hookData.cell.styles.fontStyle = 'bold';
              hookData.cell.styles.fillColor = [16, 28, 46];
              hookData.cell.styles.textColor = [245, 158, 11];
            } else if (hookData.column.index >= 1 && hookData.column.index <= 7) {
              // Dim zero numbers
              if (hookData.cell.raw === '0') {
                hookData.cell.styles.textColor = [203, 213, 225];
              }
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // --- SCOPE 3: ALL WEEKLY COMBINED REPORT ---
    else {
      // 1. Weekly Activities Mon-Sun
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('1. WEEKLY SITE DIARY & WORK ACTIVITIES (MONDAY – SUNDAY)', 14, currentY);
      currentY += 4;

      const activityRows = wd.days.map((day) => [
        `${day.dayName}\n${day.dateFormatted}`,
        day.workDoneToday || 'Scheduled structural works completed.',
        day.workPlanTomorrow || 'Follow master program.',
        day.delaysAndSafetyIncidents || 'Zero incidents.'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Day & Date', 'Work Activities Completed (Today)', 'Planned Work (Next Day)', 'Delays & Safety Log']],
        body: activityRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 64 },
          2: { cellWidth: 54 },
          3: { cellWidth: 36 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // 2. Weekly Labour Record Mon-Sun
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('2. WEEKLY LABOUR & WORKFORCE RECORD (MONDAY – SUNDAY)', 14, currentY);
      currentY += 4;

      const matrixRows = wd.tradeMatrix.map((tm) => [
        tm.tradeName,
        String(tm.mon),
        String(tm.tue),
        String(tm.wed),
        String(tm.thu),
        String(tm.fri),
        String(tm.sat),
        String(tm.sun),
        String(tm.totalManDays),
        '1500 / 1000 / 500',
        formatKES(tm.totalCost)
      ]);

      matrixRows.push([
        'DAILY TOTAL WORKERS',
        String(wd.days[0]?.workersPresent || 0),
        String(wd.days[1]?.workersPresent || 0),
        String(wd.days[2]?.workersPresent || 0),
        String(wd.days[3]?.workersPresent || 0),
        String(wd.days[4]?.workersPresent || 0),
        String(wd.days[5]?.workersPresent || 0),
        String(wd.days[6]?.workersPresent || 0),
        String(wd.totalWeeklyManDays),
        'Fixed Rates',
        formatKES(wd.totalWeeklyLabourCost)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Trade / Category', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Man-Days', 'Rates (F/S/H)', 'Total Cost (KES)']],
        body: matrixRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 10 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 10 },
          6: { halign: 'center', cellWidth: 10 },
          7: { halign: 'center', cellWidth: 10 },
          8: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          9: { halign: 'center', cellWidth: 26, fontSize: 6.5 },
          10: { halign: 'right', cellWidth: 26, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.row.index === matrixRows.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }
  } else if (data.dailyReport) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('1. DAILY SITE DIARY & WORK ACTIVITIES', 14, currentY);
    currentY += 4;

    const dr = data.dailyReport;

    const diaryData = [
      ['Report Date', dr.day ? `${dr.date || '—'} (${dr.day})` : (dr.date || '—')],
      ['Site Location', dr.location || '—'],
      ['Estimated Progress', `${dr.overallProgress ?? 0}% Completed`],
      [
        'Delays & Safety Incidents',
        dr.delaysAndSafetyIncidents ||
          (dr.delaysForYesterday && dr.safetyIncidents && dr.delaysForYesterday !== dr.safetyIncidents
            ? `Delays: ${dr.delaysForYesterday} • Safety: ${dr.safetyIncidents}`
            : dr.delaysForYesterday || dr.safetyIncidents || 'None.')
      ],
      ['Site Visitors & Client Reps', dr.visitorInformation || 'No visitors recorded.'],
      dr.generalNotes ? ['General Engineer Remarks', dr.generalNotes] : null
    ].filter(Boolean).filter(([, val]) => val && val !== '—'); // skip blank rows

    autoTable(doc, {
      startY: currentY,
      head: [['Item', 'Site Description']],
      body: diaryData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // --- Labour & Workforce Table ---
    if (dr.labourCategories && dr.labourCategories.length > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('2. LABOUR & WORKFORCE RECORD', 14, currentY);
      currentY += 4;

      const totalWorkers = dr.workersPresent || dr.labourCategories.reduce((s, c) => s + (c.headcount || 0), 0);
      const totalCost = dr.totalLabourCost || dr.labourCategories.reduce((s, c) => {
        const fRate = Number(c.foremanRate) || 1500;
        const sRate = Number(c.skilledRate) || 1000;
        const hRate = Number(c.helperRate) || 500;
        const cost = c.cost ?? (
          (Number(c.foremanCount) || 0) * fRate +
          (Number(c.skilledCount) || 0) * sRate +
          (Number(c.unskilledCount) || 0) * hRate
        );
        return s + cost;
      }, 0);

      const labourRows = dr.labourCategories.map((cat) => {
        const fRate = Number(cat.foremanRate) || 1500;
        const sRate = Number(cat.skilledRate) || 1000;
        const hRate = Number(cat.helperRate) || 500;
        const cost = cat.cost ?? (
          (Number(cat.foremanCount) || 0) * fRate +
          (Number(cat.skilledCount) || 0) * sRate +
          (Number(cat.unskilledCount) || 0) * hRate
        );
        const headcount = cat.headcount ?? (
          (Number(cat.foremanCount) || 0) +
          (Number(cat.skilledCount) || 0) +
          (Number(cat.unskilledCount) || 0)
        );
        return [
          cat.tradeName || 'General Trade',
          String(cat.foremanCount || 0),
          String(cat.skilledCount || 0),
          String(cat.unskilledCount || 0),
          String(headcount),
          `${fRate.toLocaleString()} / ${sRate.toLocaleString()} / ${hRate.toLocaleString()}`,
          formatKES(cost)
        ];
      });

      labourRows.push([
        'TOTAL SITE WORKFORCE',
        '—',
        '—',
        '—',
        String(totalWorkers),
        'Fixed: 1,500 / 1,000 / 500',
        formatKES(totalCost)
      ]);

      const labourHeaders = [['Trade / Category', 'Foreman', 'Skilled', 'Helpers', 'Total Workers', 'Rates (F / S / H)', 'Est. Daily Cost']];

      const columnStyles = {
        0: { cellWidth: 46, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 16 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 36, fontSize: 7.5 },
        6: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      };

      autoTable(doc, {
        startY: currentY,
        head: labourHeaders,
        body: labourRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles,
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.row.index === labourRows.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 6;

      // Trade Work Activities per Category (Work Done Today & Work Plan Tomorrow)
      const tradeWorkRows = dr.labourCategories
        .filter((cat) => (cat.workDoneToday || cat.workCompletedYesterday || cat.workPlanTomorrow || cat.plannedWork))
        .map((cat) => [
          cat.tradeName || 'General Trade',
          cat.workDoneToday || cat.workCompletedYesterday || 'No activities recorded.',
          cat.workPlanTomorrow || cat.plannedWork || 'Follow standard master schedule.'
        ]);

      if (tradeWorkRows.length > 0) {
        if (currentY > 220) {
          doc.addPage();
          currentY = 16;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text('Trade Work Activities & Tomorrow\'s Plan', 14, currentY);
        currentY += 3;

        autoTable(doc, {
          startY: currentY,
          head: [['Labour Category / Trade', 'Work Done Today', 'Work Plan Tomorrow']],
          body: tradeWorkRows,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          columnStyles: {
            0: { cellWidth: 46, fontStyle: 'bold' },
            1: { cellWidth: 68 },
            2: { cellWidth: 68 }
          },
          margin: { left: 14, right: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 8;
      }
    }

    // --- Plant & Equipment Table ---
    if (dr.plantAndEquipment && dr.plantAndEquipment.length > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('3. PLANT & EQUIPMENT RECORD', 14, currentY);
      currentY += 4;

      const equipmentRows = dr.plantAndEquipment.map((eq) => {
        const fuel = Number(eq.fuelCost) || 0;
        const operator = Number(eq.operatorCost) || 0;
        const repair = Number(eq.repairCost) || 0;
        const mechanic = Number(eq.mechanicCost) || 0;
        const transport = Number(eq.transportCost) || 0;
        const total = Number(eq.totalExpense) || (fuel + operator + repair + mechanic + transport);
        const fuelMm = eq.fuelQty != null && eq.fuelQty !== '' ? `${eq.fuelQty} mm` : '-';
        const oilMm = eq.oilQty != null && eq.oilQty !== '' ? `${eq.oilQty} mm` : '-';

        return [
          eq.machineName || 'Machine',
          fuelMm,
          oilMm,
          formatKES(fuel),
          formatKES(operator),
          formatKES(repair),
          formatKES(mechanic),
          formatKES(transport),
          formatKES(total)
        ];
      });

      const totalFuelMm = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.fuelQty) || 0), 0);
      const totalOilMm = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.oilQty) || 0), 0);
      const totalFuel = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.fuelCost) || 0), 0);
      const totalOperator = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.operatorCost) || 0), 0);
      const totalRepair = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.repairCost) || 0), 0);
      const totalMechanic = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.mechanicCost) || 0), 0);
      const totalTransport = dr.plantAndEquipment.reduce((s, eq) => s + (Number(eq.transportCost) || 0), 0);
      const grandTotalCost = dr.totalEquipmentCost || dr.plantAndEquipment.reduce((s, eq) => {
        return s + (Number(eq.totalExpense) || (
          (Number(eq.fuelCost) || 0) +
          (Number(eq.operatorCost) || 0) +
          (Number(eq.repairCost) || 0) +
          (Number(eq.mechanicCost) || 0) +
          (Number(eq.transportCost) || 0)
        ));
      }, 0);

      equipmentRows.push([
        'TOTAL PLANT & EQUIPMENT EXPENSE',
        totalFuelMm > 0 ? `${totalFuelMm} mm` : '-',
        totalOilMm > 0 ? `${totalOilMm} mm` : '-',
        formatKES(totalFuel),
        formatKES(totalOperator),
        formatKES(totalRepair),
        formatKES(totalMechanic),
        formatKES(totalTransport),
        formatKES(grandTotalCost)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Machine / Equipment', 'Fuel (mm)', 'Oil (mm)', 'Fuel Cost', 'Operator Cost', 'Repair Cost', 'Mechanic Cost', 'Transport Cost', 'Total Cost']],
        body: equipmentRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: 'bold' },
          1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 19, halign: 'right' },
          4: { cellWidth: 19, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.row.index === equipmentRows.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // --- Materials & Deliveries Table ---
    if (dr.materialsReceivedToday || dr.materialsNeededTomorrow) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('4. MATERIALS & DELIVERIES', 14, currentY);
      currentY += 4;

      const materialRows = [];
      if (dr.materialsReceivedToday) {
        materialRows.push(['Materials Received Today', dr.materialsReceivedToday]);
      }
      if (dr.materialsNeededTomorrow) {
        materialRows.push(['Materials Needed Tomorrow', dr.materialsNeededTomorrow]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Category', 'Material Log & Quantities']],
        body: materialRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // --- Site Photos section ---
    const reportPhotos = dr.photos || [];
    if (reportPhotos.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      const photoSectionNum = dr.labourCategories && dr.labourCategories.length > 0 ? '3' : '2';
      doc.text(`${photoSectionNum}. SITE PHOTOGRAPHS`, 14, currentY);
      currentY += 5;

      const photoSize = 55; // mm
      const photosPerRow = 3;
      const gap = 4;

      reportPhotos.forEach((photo, idx) => {
        const col = idx % photosPerRow;
        const row = Math.floor(idx / photosPerRow);
        const x = 14 + col * (photoSize + gap);
        const y = currentY + row * (photoSize + gap + 6);

        // Ensure we don't overflow the page
        if (y + photoSize > 272) {
          doc.addPage();
          currentY = 16;
        }

        try {
          // dataUrl format: "data:image/jpeg;base64,..."
          const imgFormat = photo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(photo.dataUrl, imgFormat, x, y, photoSize, photoSize * 0.75);
        } catch (_) {
          // If image fails, draw a placeholder box
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y, photoSize, photoSize * 0.75);
        }

        // Caption below image
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...mutedColor);
        const caption = photo.name || `Photo ${idx + 1}`;
        doc.text(caption.substring(0, 28), x + 1, y + photoSize * 0.75 + 3.5);
      });

      const totalRows = Math.ceil(reportPhotos.length / photosPerRow);
      currentY += totalRows * (photoSize * 0.75 + gap + 8) + 4;
    }
  }


  // B. Labour Attendance Table
  if (!isWeeklyCombined && !skipOtherSections && sections.labour !== false && data.labour && data.labour.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('WORKFORCE & ATTENDANCE RECORD', 14, currentY);
    currentY += 4;

    const labourRows = data.labour.slice(0, 12).map((w) => hideCosts ? [
      w.fullName,
      w.role,
      w.trade || w.role,
      w.company || 'Site Crew',
      w.status || 'Active'
    ] : [
      w.fullName,
      w.role,
      w.trade || w.role,
      formatKES(w.dailyRate),
      w.status || 'Active'
    ]);

    const labourHeaders = hideCosts
      ? [['Worker Name', 'Site Role', 'Trade', 'Contractor / Agency', 'Status']]
      : [['Worker Name', 'Site Role', 'Trade', 'Daily Rate', 'Status']];

    autoTable(doc, {
      startY: currentY,
      head: labourHeaders,
      body: labourRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // C. Materials Stock & Consumption Table
  if (!skipOtherSections && sections.materials !== false && data.materials && data.materials.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('MATERIALS INVENTORY & DELIVERIES', 14, currentY);
    currentY += 4;

    const matRows = data.materials.slice(0, 10).map((m) => hideCosts ? [
      m.name,
      m.category,
      `${m.currentStock} ${m.unit}`,
      `${m.minimumStock} ${m.unit}`,
      m.currentStock <= m.minimumStock ? 'LOW STOCK' : 'Adequate'
    ] : [
      m.name,
      m.category,
      `${m.currentStock} ${m.unit}`,
      `${m.minimumStock} ${m.unit}`,
      formatKES(m.unitCost),
      m.currentStock <= m.minimumStock ? 'LOW STOCK' : 'Adequate'
    ]);

    const matHeaders = hideCosts
      ? [['Material Description', 'Category', 'Stock Available', 'Min Reserve', 'Stock Status']]
      : [['Material Description', 'Category', 'Stock Available', 'Min Reserve', 'Unit Rate', 'Stock Status']];

    autoTable(doc, {
      startY: currentY,
      head: matHeaders,
      body: matRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // D. Equipment Fleet & Operating Hours
  if (!skipOtherSections && sections.equipment !== false && data.equipment && data.equipment.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('EQUIPMENT FLEET & MACHINERY STATUS', 14, currentY);
    currentY += 4;

    const eqRows = data.equipment.slice(0, 8).map((e) => hideCosts ? [
      e.name,
      e.type,
      e.operator,
      `${e.totalHours || 0} hrs`,
      e.status
    ] : [
      e.name,
      e.type,
      e.operator,
      formatKES(e.dailyRate),
      `${e.totalHours || 0} hrs`,
      e.status
    ]);

    const eqHeaders = hideCosts
      ? [['Equipment Name', 'Plant Type', 'Operator In-Charge', 'Operating Hours', 'Status']]
      : [['Equipment Name', 'Plant Type', 'Operator In-Charge', 'Daily Hire Rate', 'Operating Hours', 'Status']];

    autoTable(doc, {
      startY: currentY,
      head: eqHeaders,
      body: eqRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // E. Project Costs & Financial Breakdown (Hidden for Foreman)
  if (!isWeeklyCombined && !skipOtherSections && !hideCosts && sections.costs !== false && data.costs && data.costs.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('PROJECT FINANCIAL EXPENDITURES (KES)', 14, currentY);
    currentY += 4;

    const costRows = data.costs.slice(0, 8).map((c) => [
      c.date,
      c.category,
      c.description,
      c.supplier || 'Site Vendor',
      formatKES(c.amount),
      c.paymentStatus
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Category', 'Expense Description', 'Supplier / Payee', 'Amount (KES)', 'Status']],
      body: costRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // F. Open Issues & Quality Actions
  if (!skipOtherSections && sections.issues !== false && data.issues && data.issues.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('SITE ISSUES & CORRECTIVE ACTIONS', 14, currentY);
    currentY += 4;

    const issueRows = data.issues.slice(0, 8).map((i) => [
      i.title,
      i.location,
      i.priority,
      i.assignedTo,
      i.dueDate || 'N/A',
      i.status
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Issue Description', 'Site Location', 'Priority', 'Assigned To', 'Due Date', 'Status']],
      body: issueRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // --- 5. SIGNATURE & SIGN-OFF BLOCK ---
  if (currentY > 235) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 6;
  }

  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('CERTIFICATION & SIGN-OFF', 18, currentY + 6);

  // Column 1: Prepared By
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedColor);
  doc.text('PREPARED BY (SITE AGENT / FOREMAN):', 18, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(author || 'Site Engineer', 18, currentY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: __________________________', 18, currentY + 24);
  doc.text(`Date: ${formatDate(new Date())}`, 18, currentY + 29);

  // Column 2: Approved By
  const sigCol2 = 105;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('APPROVED BY (PROJECT MANAGER / RE):', sigCol2, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(project?.projectManager || 'Eng. David Ochieng (EBK PE)', sigCol2, currentY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: __________________________', sigCol2, currentY + 24);
  doc.text(`Date: ${formatDate(new Date())}`, sigCol2, currentY + 29);

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text(
      `BuildTrack Construction Intelligence Platform • Confidential • ${project?.name || 'All Sites'} • Page ${i} of ${totalPages}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
};
