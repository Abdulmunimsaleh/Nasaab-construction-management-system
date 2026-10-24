/**
 * Seed realistic LAE and Material data for MMA and SeaCrest for Week 42, 2026
 * so that EVERY project site has rich data for weekly reports!
 */
import '../env.js';
import crypto from 'crypto';
import pool from '../db.js';

async function seedSiteData() {
  console.log('🌱 Checking site data for MMA and SeaCrest...');

  const connection = await pool.getConnection();
  try {
    const [existingMma] = await connection.query(
      "SELECT id FROM labour_activity_equipment_forms WHERE project_id = 'prj-mma'"
    );

    if (existingMma.length === 0) {
      console.log('   Creating sample LAE & Material records for MMA (Tudor)...');

      // MMA LAE form
      const laeId1 = `lae-${crypto.randomBytes(8).toString('hex')}`;
      await connection.query(
        `INSERT INTO labour_activity_equipment_forms (
          id, project_id, date, form_number, prepared_by_id, prepared_by_name,
          weather, estimated_site_progress, delays_issues_incidents, site_visitors, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          laeId1,
          'prj-mma',
          '2026-10-15',
          'LAE-MMA-101',
          'usr-mohammad-hassan',
          'Mohammad Hassan',
          'Clear / Sunny',
          35,
          'Minor delay due to high tide water table pumping',
          'County Building Inspector',
          'submitted'
        ]
      );

      // Labour items
      await connection.query(
        `INSERT INTO lae_form_labour_items (
          id, form_id, trade, foreman_count, skilled_count, unskilled_count,
          foreman_rate, skilled_rate, unskilled_rate, work_done_today, total_cost
        ) VALUES
        (?, ?, 'Masons', 1, 4, 6, 1500, 1000, 500, 'Foundation block wall laying and reinforcement', 8500),
        (?, ?, 'Carpenters', 1, 2, 3, 1500, 1000, 500, 'Formwork shuttering for ground floor columns', 5000)`,
        [`fl-${crypto.randomBytes(6).toString('hex')}`, laeId1, `fl-${crypto.randomBytes(6).toString('hex')}`, laeId1]
      );

      // Activities
      await connection.query(
        `INSERT INTO lae_form_activity_items (
          id, form_id, activity_description, location_or_zone, status, progress_percentage
        ) VALUES
        (?, ?, 'Ground floor column rebar fixing and formwork', 'Grid A-D', 'in_progress', 60),
        (?, ?, 'Substructure plumbing pipe sleeving', 'Basement Sump', 'completed', 100)`,
        [`fa-${crypto.randomBytes(6).toString('hex')}`, laeId1, `fa-${crypto.randomBytes(6).toString('hex')}`, laeId1]
      );

      // Equipment
      await connection.query(
        `INSERT INTO lae_form_equipment_items (
          id, form_id, equipment_name, quantity, fuel_cost, operator_cost, repair_cost, total_expense, operating_status
        ) VALUES
        (?, ?, 'Concrete Mixer 400L', 1, 3500, 2000, 0, 5500, 'Active'),
        (?, ?, 'Submersible Dewatering Pump', 2, 2500, 1000, 500, 4000, 'Active')`,
        [`fe-${crypto.randomBytes(6).toString('hex')}`, laeId1, `fe-${crypto.randomBytes(6).toString('hex')}`, laeId1]
      );

      // MMA Material request
      const mrId1 = `mr-${crypto.randomBytes(8).toString('hex')}`;
      await connection.query(
        `INSERT INTO material_request_forms (
          id, project_id, request_number, date_needed, urgency, status, created_by, requested_by_name, site_progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mrId1,
          'prj-mma',
          'MRN-MMA-201',
          '2026-10-16',
          'normal',
          'approved',
          'usr-abdikadir-osman',
          'Abdikadir Osman',
          'Substructure column casting scheduled for Friday'
        ]
      );

      await connection.query(
        `INSERT INTO material_request_items (
          id, request_id, item_name, supplier_vendor, quantity, unit, estimated_unit_cost
        ) VALUES
        (?, ?, 'Bamburi PowerPlus Cement 50kg', 'Bamburi Special Products', 120, 'bags', 850),
        (?, ?, 'Y16 High Tensile Steel Rebars', 'Apex Steel Mombasa', 45, 'bars', 2200)`,
        [`mri-${crypto.randomBytes(6).toString('hex')}`, mrId1, `mri-${crypto.randomBytes(6).toString('hex')}`, mrId1]
      );
      console.log('   ✅ MMA sample records created.');
    }

    const [existingSc] = await connection.query(
      "SELECT id FROM labour_activity_equipment_forms WHERE project_id = 'prj-seacrest'"
    );

    if (existingSc.length === 0) {
      console.log('   Creating sample LAE & Material records for SeaCrest (Nyali)...');

      // SeaCrest LAE form
      const laeId2 = `lae-${crypto.randomBytes(8).toString('hex')}`;
      await connection.query(
        `INSERT INTO labour_activity_equipment_forms (
          id, project_id, date, form_number, prepared_by_id, prepared_by_name,
          weather, estimated_site_progress, delays_issues_incidents, site_visitors, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          laeId2,
          'prj-seacrest',
          '2026-10-15',
          'LAE-SC-101',
          'usr-hussein-munga',
          'Hussein Munga',
          'Clear / Breeze',
          52,
          'None. Operations proceeding ahead of schedule.',
          'Lead Structural Consultant',
          'submitted'
        ]
      );

      await connection.query(
        `INSERT INTO lae_form_labour_items (
          id, form_id, trade, foreman_count, skilled_count, unskilled_count,
          foreman_rate, skilled_rate, unskilled_rate, work_done_today, total_cost
        ) VALUES
        (?, ?, 'Steel Fixers', 1, 5, 8, 1500, 1000, 500, 'Second floor suspended slab BRC and top mesh reinforcement', 10500),
        (?, ?, 'Electricians', 1, 2, 2, 1500, 1000, 500, 'Slab conduit piping and junction box placement', 4500)`,
        [`fl-${crypto.randomBytes(6).toString('hex')}`, laeId2, `fl-${crypto.randomBytes(6).toString('hex')}`, laeId2]
      );

      await connection.query(
        `INSERT INTO lae_form_activity_items (
          id, form_id, activity_description, location_or_zone, status, progress_percentage
        ) VALUES
        (?, ?, 'Second floor slab formwork and reinforcement verification', 'Block B', 'in_progress', 85)`,
        [`fa-${crypto.randomBytes(6).toString('hex')}`, laeId2]
      );

      await connection.query(
        `INSERT INTO lae_form_equipment_items (
          id, form_id, equipment_name, quantity, fuel_cost, operator_cost, repair_cost, total_expense, operating_status
        ) VALUES
        (?, ?, 'Tower Crane TC-50', 1, 6000, 3500, 0, 9500, 'Active')`,
        [`fe-${crypto.randomBytes(6).toString('hex')}`, laeId2]
      );

      // SeaCrest Material request
      const mrId2 = `mr-${crypto.randomBytes(8).toString('hex')}`;
      await connection.query(
        `INSERT INTO material_request_forms (
          id, project_id, request_number, date_needed, urgency, status, created_by, requested_by_name, site_progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mrId2,
          'prj-seacrest',
          'MRN-SC-201',
          '2026-10-17',
          'urgent',
          'approved',
          'usr-yusuf-faiz',
          'Yusuf Ismail',
          'Ready for 2nd floor concrete pour on Saturday'
        ]
      );

      await connection.query(
        `INSERT INTO material_request_items (
          id, request_id, item_name, supplier_vendor, quantity, unit, estimated_unit_cost
        ) VALUES
        (?, ?, 'Ready-Mix Concrete C30', 'Coast ReadyMix Ltd', 35, 'm3', 12500),
        (?, ?, 'Admixture Sika Plastocrete', 'Sika Kenya', 4, 'drums', 9500)`,
        [`mri-${crypto.randomBytes(6).toString('hex')}`, mrId2, `mri-${crypto.randomBytes(6).toString('hex')}`, mrId2]
      );
      console.log('   ✅ SeaCrest sample records created.');
    }

    console.log('🎉 Site data check complete for every site!\n');
  } catch (err) {
    console.error('Failed to seed site data:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedSiteData();
