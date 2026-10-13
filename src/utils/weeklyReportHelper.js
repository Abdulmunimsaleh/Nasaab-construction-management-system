// Weekly Construction Report Data Utilities for BuildTrack
import { formatKES } from './formatters';

// Fixed labour rates
export const FIXED_FOREMAN_RATE = 1500;
export const FIXED_SKILLED_RATE = 1000;
export const FIXED_HELPER_RATE = 500;

/**
 * Returns an array of 7 day descriptors (Monday to Sunday) for the week containing referenceDateStr.
 * @param {string} referenceDateStr - 'YYYY-MM-DD' (defaults to '2026-10-06')
 * @returns {Array<{ date: string, dayName: string, dateFormatted: string }>}
 */
export const getMondayToSundayDates = (referenceDateStr = '2026-10-06') => {
  const base = new Date(referenceDateStr + 'T00:00:00');
  const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // In JS: Sunday is 0. Distance to Monday: if 0 -> -6, else -> 1 - dayOfWeek
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  const days = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      dayName: dayNames[i],
      dateFormatted: current.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });
  }

  return days;
};

/**
 * Realistic activity templates for Monday to Sunday if a specific day report hasn't been logged yet.
 */
const DEFAULT_WEEKDAY_ACTIVITIES = {
  Monday: {
    workDoneToday: 'Weekly site safety induction and toolbox talk conducted. Commenced formwork fabrication and starter bar alignment for columns. Concrete curing verification completed.',
    workPlanTomorrow: 'Fix reinforcement steel for suspended beam cages. Position conduit inserts and electrical riser sleeves.',
    weather: 'Clear / Sunny',
    temperature: '25°C',
    siteConditions: 'Dry, accessible ground. Tower crane operational.',
    workersAbsent: 1,
    delaysAndSafetyIncidents: 'Zero incidents. 07:15 AM site-wide safety briefing completed.'
  },
  Tuesday: {
    workDoneToday: 'Completed reinforcement steel fixing for Level 16 suspended slab and beam cages. Poured 120m³ of C35/45 readymix concrete using boom pump. Internal masonry blockwork continued.',
    workPlanTomorrow: 'Curing of Level 16 slab, strike formwork on Level 14 columns, commence vertical MEP conduit risers.',
    weather: 'Clear / Sunny',
    temperature: '26°C',
    siteConditions: 'Dry, firm ground, excellent lifting conditions for tower crane.',
    workersAbsent: 2,
    delaysAndSafetyIncidents: 'Traffic delay for readymix transit mixer #4 (30 mins). Zero safety incidents.'
  },
  Wednesday: {
    workDoneToday: 'Continuous wet curing applied to fresh suspended slab. Struck column forms on Floor 14; surface finish inspected and approved by resident engineer. MEP vertical risers installed.',
    workPlanTomorrow: 'Erect falsework and prop system for next structural deck level. Continue perimeter blockwork.',
    weather: 'Partly Cloudy',
    temperature: '24°C',
    siteConditions: 'Good ground conditions. High ambient humidity aiding concrete hydration.',
    workersAbsent: 1,
    delaysAndSafetyIncidents: 'Zero safety incidents reported. PPE compliance 100%.'
  },
  Thursday: {
    workDoneToday: 'Erected heavy-duty shoring jacks and scaffolding for beam bottoms. Pre-assembled beam reinforcement cages on ground fabrication yard and hoisted via tower crane.',
    workPlanTomorrow: 'Install plywood deck panels and apply water-based form release agent. Place rebar spacer blocks.',
    weather: 'Sunny / Warm',
    temperature: '27°C',
    siteConditions: 'Dry, firm surface. Perimeter scaffolding safety netting inspected.',
    workersAbsent: 0,
    delaysAndSafetyIncidents: 'Zero incidents. Crane daily pre-lift safety checklist verified.'
  },
  Friday: {
    workDoneToday: 'Formwork deck panels leveled and checked with total station survey equipment. Reinforcement steel placement commenced for perimeter shear walls and elevator core.',
    workPlanTomorrow: 'Weekend concrete prep and MEP coordination sign-off. Pre-pour joint inspections with consultant.',
    weather: 'Sunny',
    temperature: '28°C',
    siteConditions: 'Dry and sunny. High wind speed monitored at crane mast head (12 knots - safe).',
    workersAbsent: 2,
    delaysAndSafetyIncidents: 'Minor electrical tripped fuse on batching pump, repaired within 15 minutes.'
  },
  Saturday: {
    workDoneToday: 'Completed shear wall rebar fixing and installed embedded steel tie-backs. Final inspection of rebar cover blocks and conduit boxes signed off by Resident Engineer.',
    workPlanTomorrow: 'Sunday scheduled plant maintenance and crane lubrication. General site clean-up.',
    weather: 'Clear / Warm',
    temperature: '27°C',
    siteConditions: 'Clean working decks. Material staging areas organized for Monday shift.',
    workersAbsent: 3,
    delaysAndSafetyIncidents: 'Zero accidents. Scaffold tags inspected and updated to green status.'
  },
  Sunday: {
    workDoneToday: 'Scheduled site maintenance shift: Tower crane lubricated and boom inspected. Deep clean of site access roads, water drainage sump pump serviced, and safety signage updated.',
    workPlanTomorrow: 'Full crew reporting at 06:45 AM for Monday shift. Concrete pouring scheduled for Floor 17 core.',
    weather: 'Cool / Clear',
    temperature: '23°C',
    siteConditions: 'Standby conditions. Perimeter perimeter security and hoarding secure.',
    workersAbsent: 0,
    delaysAndSafetyIncidents: 'Zero incidents. Weekly safety inspection checklist archived.'
  }
};

/**
 * Builds standard default trade categories with specific rates and workforce counts for a day.
 * Faithfully matches the site workforce deployment schedule.
 */
const getDefaultLabourCategoriesForDay = (dayName) => {
  const list = [];

  if (dayName === 'Monday' || dayName === 'Tuesday' || dayName === 'Thursday') {
    // Formwork Carpenters: 2 Foremen, 14 Skilled, 6 Helpers = 22 workers @ 1500 / 1000 / 500 = KES 20,000
    list.push({
      id: `lc-formwork-${dayName}`,
      tradeName: 'Formwork Carpenters',
      foremanCount: 2,
      skilledCount: 14,
      unskilledCount: 6,
      foremanRate: 1500,
      skilledRate: 1000,
      helperRate: 500,
      headcount: 22,
      cost: 20000,
      workDoneToday: 'Deck panel installation, leveling, and prop alignment.',
      workPlanTomorrow: 'Continue formwork preparation for next suspended deck pour.'
    });

    // Steel Fixers & Benders: 1 Foreman, 10 Skilled, 4 Helpers = 15 workers @ 1500 / 1000 / 500 = KES 13,500
    list.push({
      id: `lc-steel-${dayName}`,
      tradeName: 'Steel Fixers & Benders',
      foremanCount: 1,
      skilledCount: 10,
      unskilledCount: 4,
      foremanRate: 1500,
      skilledRate: 1000,
      helperRate: 500,
      headcount: 15,
      cost: 13500,
      workDoneToday: 'Cut and bent high tensile Y16 and Y12 rebar for column starter bars.',
      workPlanTomorrow: 'Assemble shear wall and column cages.'
    });
  } else if (dayName === 'Wednesday') {
    // General Site Workforce: 1 Foreman, 47 Skilled, 0 Helpers = 48 workers @ 2500 / 1500 / 800 (Prepaid package: KES 0)
    list.push({
      id: `lc-general-${dayName}`,
      tradeName: 'General Site Workforce',
      foremanCount: 1,
      skilledCount: 47,
      unskilledCount: 0,
      foremanRate: 2500,
      skilledRate: 1500,
      helperRate: 800,
      headcount: 48,
      cost: 0,
      workDoneToday: 'Excavation, material handling, site logistics, and wet curing ops.',
      workPlanTomorrow: 'Continue site cleaning and perimeter trenching.'
    });
  } else if (dayName === 'Friday') {
    // General Site Workforce: 1 Foreman, 23 Skilled, 0 Helpers = 24 workers @ 2500 / 1500 / 800 (Prepaid package: KES 0)
    list.push({
      id: `lc-general-${dayName}`,
      tradeName: 'General Site Workforce',
      foremanCount: 1,
      skilledCount: 23,
      unskilledCount: 0,
      foremanRate: 2500,
      skilledRate: 1500,
      helperRate: 800,
      headcount: 24,
      cost: 0,
      workDoneToday: 'Deep excavation staging and site logistics clearance.',
      workPlanTomorrow: 'Weekend concrete prep and material receipt.'
    });
  } else if (dayName === 'Saturday') {
    // Formwork Carpenters (Weekend Shift): 1 Foreman, 10 Skilled, 8 Helpers = 19 workers @ 2500 / 800 / 700 = KES 16,100
    list.push({
      id: `lc-formwork-${dayName}`,
      tradeName: 'Formwork Carpenters',
      foremanCount: 1,
      skilledCount: 10,
      unskilledCount: 8,
      foremanRate: 2500,
      skilledRate: 800,
      helperRate: 700,
      headcount: 19,
      cost: 16100,
      workDoneToday: 'Shuttering and support staging for cantilever beams.',
      workPlanTomorrow: 'Inspect shoring jacks and safety props.'
    });

    // Steel Fixers (Special Shift): 1 Foreman, 10 Skilled, 20 Helpers = 31 workers @ 2500 / 800 / 700 = KES 24,500
    list.push({
      id: `lc-steel-special-${dayName}`,
      tradeName: 'Steel Fixers (Special Shift)',
      foremanCount: 1,
      skilledCount: 10,
      unskilledCount: 20,
      foremanRate: 2500,
      skilledRate: 800,
      helperRate: 700,
      headcount: 31,
      cost: 24500,
      workDoneToday: 'Saturday intensive structural slab pre-pour reinforcement.',
      workPlanTomorrow: 'Clean fabrication deck.'
    });
  } else if (dayName === 'Sunday') {
    // Formwork Carpenters: 1 Foreman, 4 Skilled, 2 Helpers = 7 workers @ 1500 / 1000 / 500 = KES 6,500
    list.push({
      id: `lc-formwork-${dayName}`,
      tradeName: 'Formwork Carpenters',
      foremanCount: 1,
      skilledCount: 4,
      unskilledCount: 2,
      foremanRate: 1500,
      skilledRate: 1000,
      helperRate: 500,
      headcount: 7,
      cost: 6500,
      workDoneToday: 'Inspected formwork props and shoring jacks.',
      workPlanTomorrow: 'Full crew reporting at 06:45 AM for Monday shift.'
    });
  }

  return list;
};

/**
 * Compiles a rich 7-day dataset (Monday to Sunday) for any selected project and reference date.
 * Combines existing daily reports from AppContext with fallback structured data.
 */
export const buildWeeklyData = (projectId, referenceDateStr, dailyReports = [], project = null) => {
  const weekDays = getMondayToSundayDates(referenceDateStr);

  const daysData = weekDays.map((day) => {
    // Check if an existing report matches this project and date
    const existing = dailyReports.find(
      (r) => r.projectId === projectId && r.date === day.date
    );

    if (existing) {
      // Ensure existing report has categories with fixed rates
      const labourCats = (existing.labourCategories && existing.labourCategories.length > 0)
        ? existing.labourCategories.map((cat) => {
            const fRate = Number(cat.foremanRate) || FIXED_FOREMAN_RATE;
            const sRate = Number(cat.skilledRate) || FIXED_SKILLED_RATE;
            const hRate = Number(cat.helperRate) || FIXED_HELPER_RATE;
            const headcount = cat.headcount ?? ((Number(cat.foremanCount) || 0) + (Number(cat.skilledCount) || 0) + (Number(cat.unskilledCount) || 0));
            const cost = cat.cost ?? (
              (Number(cat.foremanCount) || 0) * fRate +
              (Number(cat.skilledCount) || 0) * sRate +
              (Number(cat.unskilledCount) || 0) * hRate
            );
            return {
              ...cat,
              foremanRate: fRate,
              skilledRate: sRate,
              helperRate: hRate,
              headcount,
              cost
            };
          })
        : getDefaultLabourCategoriesForDay(day.dayName);

      const totalWorkers = existing.workersPresent || labourCats.reduce((s, c) => s + (c.headcount || 0), 0);
      const totalLabourCost = existing.totalLabourCost || labourCats.reduce((s, c) => s + (c.cost || 0), 0);

      return {
        date: day.date,
        dayName: day.dayName,
        dateFormatted: day.dateFormatted,
        isExistingReport: true,
        reportId: existing.id,
        weather: existing.weather || 'Clear / Sunny',
        temperature: existing.temperature || '26°C',
        siteConditions: existing.siteConditions || 'Dry, firm ground.',
        overallProgress: existing.overallProgress ?? 74,
        workersPresent: totalWorkers,
        workersAbsent: existing.workersAbsent ?? 1,
        workDoneToday: existing.workDoneToday || existing.workCompletedYesterday || DEFAULT_WEEKDAY_ACTIVITIES[day.dayName]?.workDoneToday,
        workPlanTomorrow: existing.workPlanTomorrow || existing.plannedWork || DEFAULT_WEEKDAY_ACTIVITIES[day.dayName]?.workPlanTomorrow,
        delaysAndSafetyIncidents: existing.delaysAndSafetyIncidents || existing.delaysForYesterday || existing.safetyIncidents || 'Zero incidents.',
        visitorInformation: existing.visitorInformation || 'No visitors recorded.',
        labourCategories: labourCats,
        totalLabourCost,
        plantAndEquipment: existing.plantAndEquipment || [],
        materialsReceivedToday: existing.materialsReceivedToday || '',
        submittedBy: existing.submittedBy || 'Site Engineer',
        status: existing.status || 'Approved'
      };
    }

    // Default template data for days without a saved report
    const template = DEFAULT_WEEKDAY_ACTIVITIES[day.dayName];
    const labourCats = getDefaultLabourCategoriesForDay(day.dayName);
    const totalWorkers = labourCats.reduce((s, c) => s + (c.headcount || 0), 0);
    const totalLabourCost = labourCats.reduce((s, c) => s + (c.cost || 0), 0);

    return {
      date: day.date,
      dayName: day.dayName,
      dateFormatted: day.dateFormatted,
      isExistingReport: false,
      reportId: `REP-${day.date}-SCHED`,
      weather: template.weather,
      temperature: template.temperature,
      siteConditions: template.siteConditions,
      overallProgress: project?.progress || 74,
      workersPresent: totalWorkers,
      workersAbsent: template.workersAbsent,
      workDoneToday: template.workDoneToday,
      workPlanTomorrow: template.workPlanTomorrow,
      delaysAndSafetyIncidents: template.delaysAndSafetyIncidents,
      visitorInformation: 'Standard site access and security logs.',
      labourCategories: labourCats,
      totalLabourCost,
      plantAndEquipment: [],
      materialsReceivedToday: day.dayName === 'Wednesday' ? '40 bags cement, 1 bundle binding wire' : '',
      submittedBy: project?.siteEngineer || 'Site Engineer',
      status: 'Logged'
    };
  });

  // Calculate weekly aggregates
  const totalWeeklyManDays = daysData.reduce((sum, d) => sum + (d.workersPresent || 0), 0);
  const totalWeeklyLabourCost = daysData.reduce((sum, d) => sum + (d.totalLabourCost || 0), 0);
  const avgDailyWorkers = Math.round(totalWeeklyManDays / 7);

  // Group by trade across the 7 days for Trade Matrix
  const standardTradeOrder = [
    'Formwork Carpenters',
    'Steel Fixers & Benders',
    'General Site Workforce',
    'Steel Fixers (Special Shift)'
  ];

  const tradeMap = {};
  // Pre-populate standard trades to preserve structure and order
  standardTradeOrder.forEach((name) => {
    tradeMap[name] = {
      tradeName: name === 'Steel Fixers (Special Shift)' ? 'Steel Fixers' : name,
      originalTradeName: name,
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0,
      totalManDays: 0,
      totalCost: 0
    };
  });

  daysData.forEach((day) => {
    day.labourCategories.forEach((cat) => {
      const name = cat.tradeName || 'General Trade';
      if (!tradeMap[name]) {
        tradeMap[name] = {
          tradeName: name,
          originalTradeName: name,
          mon: 0,
          tue: 0,
          wed: 0,
          thu: 0,
          fri: 0,
          sat: 0,
          sun: 0,
          totalManDays: 0,
          totalCost: 0
        };
      }
      const dayKey = day.dayName.substring(0, 3).toLowerCase();
      tradeMap[name][dayKey] = (tradeMap[name][dayKey] || 0) + (cat.headcount || 0);
      tradeMap[name].totalManDays += (cat.headcount || 0);
      tradeMap[name].totalCost += (cat.cost || 0);
    });
  });

  const tradeMatrix = Object.values(tradeMap).filter((t) => t.totalManDays > 0 || standardTradeOrder.includes(t.originalTradeName));

  return {
    weekRangeText: `${weekDays[0].dateFormatted} – ${weekDays[6].dateFormatted}`,
    mondayDate: weekDays[0].date,
    sundayDate: weekDays[6].date,
    days: daysData,
    totalWeeklyManDays,
    totalWeeklyLabourCost,
    avgDailyWorkers,
    tradeMatrix
  };
};
