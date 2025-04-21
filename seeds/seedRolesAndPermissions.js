import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

dotenv.config();

const rolesPermissions = {
  'Super Admin': [
    'manage_users', 'manage_roles', 'view_all_data', 'edit_settings', 'manage_integrations',
    'generate_all_reports', 'perform_backups', 'manage_security', 'customize_system', 'audit_system'
  ],
  'Admin': [
    'manage_users', 'edit_settings', 'generate_reports', 'manage_properties', 'oversee_operations'
  ],
  'Front Desk Manager': [
    'manage_front_desk', 'checkin_checkout', 'manage_room_assignments', 'handle_guest_inquiries', 'generate_fd_reports'
  ],
  'Housekeeping Manager': [
    'manage_housekeeping', 'assign_cleaning', 'update_room_status', 'manage_cleaning_inventory', 'generate_hk_reports'
  ],
  'Reservations Manager': [
    'manage_bookings', 'modify_reservations', 'handle_group_bookings', 'monitor_occupancy', 'generate_reservation_reports'
  ],
  'Sales and Marketing Manager': [
    'manage_campaigns', 'access_crm', 'analyze_market', 'generate_sales_reports', 'manage_online_presence'
  ],
  'Food and Beverage Manager': [
    'manage_restaurant', 'menu_planning', 'manage_food_inventory', 'handle_catering', 'generate_fb_reports'
  ],
  'Maintenance Manager': [
    'manage_maintenance', 'track_requests', 'schedule_repairs', 'inventory_maintenance', 'generate_maintenance_reports'
  ],
  'Accounting/Finance Manager': [
    'manage_financials', 'generate_financial_reports', 'handle_payroll', 'manage_budgets', 'compliance_financials'
  ],
  'IT Support': [
    'manage_security', 'technical_support', 'software_updates', 'data_backups', 'compliance_data'
  ],
  'Guest Services Agent': [
    'assist_guests', 'handle_checkin_checkout', 'manage_feedback', 'access_guest_profiles'
  ],
  'Event Coordinator': [
    'manage_events', 'coordinate_vendors', 'oversee_event_execution', 'event_reports', 'manage_event_contracts'
  ],
  'Security Personnel': [
    'monitor_premises', 'access_surveillance', 'handle_emergencies', 'incident_reporting'
  ],
  'Human Resources Manager': [
    'manage_employees', 'recruitment', 'performance_reviews', 'training_programs', 'compliance_hr'
  ]
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const insertedPermissions = {};

    // Insert permissions
    for (const perms of Object.values(rolesPermissions)) {
      for (const key of perms) {
        if (!insertedPermissions[key]) {
          const existing = await Permission.findOne({ key });
          if (!existing) {
            const newPerm = await Permission.create({
              key,
              description: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            });
            insertedPermissions[key] = newPerm._id;
          } else {
            insertedPermissions[key] = existing._id;
          }
        }
      }
    }

    // Insert roles with linked permissions
    for (const [roleName, perms] of Object.entries(rolesPermissions)) {
      const roleExists = await Role.findOne({ name: roleName.toLowerCase() });
      if (!roleExists) {
        await Role.create({
          name: roleName.toLowerCase(),
          description: `${roleName} role`,
          permissions: perms.map(key => insertedPermissions[key])
        });
        console.log(`Seeded role: ${roleName}`);
      }
    }

    console.log('Seeding complete.');
    process.exit();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
