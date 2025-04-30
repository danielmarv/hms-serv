import mongoose from "mongoose"
import Permission from "../models/Permission.js"
import { config } from "dotenv"

config()

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected for seeding default permissions"))
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

const seedDefaultPermissions = async () => {
  try {
    // Check if permissions already exist
    const existingPermissions = await Permission.countDocuments()
    if (existingPermissions > 0) {
      console.log("Permissions already exist in the database. Skipping seeding.")
      return
    }

    // Define default permissions by category
    const defaultPermissions = [
      // System permissions
      {
        key: "system.manage.all",
        description: "Manage all system settings",
        category: "system",
        isGlobal: true,
      },
      {
        key: "system.super.admin",
        description: "Super administrator privileges",
        category: "system",
        isGlobal: true,
      },
      {
        key: "system.view.logs",
        description: "View system logs",
        category: "system",
        isGlobal: true,
      },
      {
        key: "system.manage.configuration",
        description: "Manage system configuration",
        category: "system",
        isGlobal: true,
      },

      // User permissions
      {
        key: "user.create",
        description: "Create users",
        category: "user",
        isGlobal: false,
      },
      {
        key: "user.view",
        description: "View users",
        category: "user",
        isGlobal: false,
      },
      {
        key: "user.update",
        description: "Update users",
        category: "user",
        isGlobal: false,
      },
      {
        key: "user.delete",
        description: "Delete users",
        category: "user",
        isGlobal: false,
      },

      // Role permissions
      {
        key: "role.create",
        description: "Create roles",
        category: "role",
        isGlobal: true,
      },
      {
        key: "role.view",
        description: "View roles",
        category: "role",
        isGlobal: false,
      },
      {
        key: "role.update",
        description: "Update roles",
        category: "role",
        isGlobal: true,
      },
      {
        key: "role.delete",
        description: "Delete roles",
        category: "role",
        isGlobal: true,
      },

      // Hotel permissions
      {
        key: "hotel.create",
        description: "Create hotels",
        category: "hotel",
        isGlobal: true,
      },
      {
        key: "hotel.view",
        description: "View hotels",
        category: "hotel",
        isGlobal: false,
      },
      {
        key: "hotel.update",
        description: "Update hotels",
        category: "hotel",
        isGlobal: false,
      },
      {
        key: "hotel.delete",
        description: "Delete hotels",
        category: "hotel",
        isGlobal: true,
      },
      {
        key: "hotel.manage.chain",
        description: "Manage hotel chains",
        category: "hotel",
        isGlobal: true,
      },

      // Room permissions
      {
        key: "room.create",
        description: "Create rooms",
        category: "room",
        isGlobal: false,
      },
      {
        key: "room.view",
        description: "View rooms",
        category: "room",
        isGlobal: false,
      },
      {
        key: "room.update",
        description: "Update rooms",
        category: "room",
        isGlobal: false,
      },
      {
        key: "room.delete",
        description: "Delete rooms",
        category: "room",
        isGlobal: false,
      },
      {
        key: "room.update.status",
        description: "Update room status",
        category: "room",
        isGlobal: false,
      },
      {
        key: "room.type.manage",
        description: "Manage room types",
        category: "room",
        isGlobal: false,
      },

      // Booking permissions
      {
        key: "booking.create",
        description: "Create bookings",
        category: "booking",
        isGlobal: false,
      },
      {
        key: "booking.view",
        description: "View all bookings",
        category: "booking",
        isGlobal: false,
      },
      {
        key: "booking.view.own",
        description: "View own bookings",
        category: "booking",
        isGlobal: false,
      },
      {
        key: "booking.update",
        description: "Update bookings",
        category: "booking",
        isGlobal: false,
      },
      {
        key: "booking.delete",
        description: "Delete bookings",
        category: "booking",
        isGlobal: false,
      },
      {
        key: "booking.manage.pricing",
        description: "Manage booking pricing",
        category: "booking",
        isGlobal: false,
      },

      // Guest permissions
      {
        key: "guest.create",
        description: "Create guests",
        category: "guest",
        isGlobal: false,
      },
      {
        key: "guest.view",
        description: "View guests",
        category: "guest",
        isGlobal: false,
      },
      {
        key: "guest.update",
        description: "Update guests",
        category: "guest",
        isGlobal: false,
      },
      {
        key: "guest.delete",
        description: "Delete guests",
        category: "guest",
        isGlobal: false,
      },

      // Invoice permissions
      {
        key: "invoice.create",
        description: "Create invoices",
        category: "invoice",
        isGlobal: false,
      },
      {
        key: "invoice.view",
        description: "View all invoices",
        category: "invoice",
        isGlobal: false,
      },
      {
        key: "invoice.view.own",
        description: "View own invoices",
        category: "invoice",
        isGlobal: false,
      },
      {
        key: "invoice.update",
        description: "Update invoices",
        category: "invoice",
        isGlobal: false,
      },
      {
        key: "invoice.delete",
        description: "Delete invoices",
        category: "invoice",
        isGlobal: false,
      },

      // Payment permissions
      {
        key: "payment.create",
        description: "Create payments",
        category: "payment",
        isGlobal: false,
      },
      {
        key: "payment.view",
        description: "View payments",
        category: "payment",
        isGlobal: false,
      },
      {
        key: "payment.update",
        description: "Update payments",
        category: "payment",
        isGlobal: false,
      },
      {
        key: "payment.delete",
        description: "Delete payments",
        category: "payment",
        isGlobal: false,
      },
      {
        key: "payment.refund",
        description: "Process refunds",
        category: "payment",
        isGlobal: false,
      },

      // Frontdesk permissions
      {
        key: "frontdesk.checkin",
        description: "Check-in guests",
        category: "frontdesk",
        isGlobal: false,
      },
      {
        key: "frontdesk.checkout",
        description: "Check-out guests",
        category: "frontdesk",
        isGlobal: false,
      },
      {
        key: "frontdesk.manage",
        description: "Manage front desk operations",
        category: "frontdesk",
        isGlobal: false,
      },

      // Housekeeping permissions
      {
        key: "housekeeping.assign",
        description: "Assign housekeeping tasks",
        category: "housekeeping",
        isGlobal: false,
      },
      {
        key: "housekeeping.complete",
        description: "Complete housekeeping tasks",
        category: "housekeeping",
        isGlobal: false,
      },
      {
        key: "housekeeping.view",
        description: "View housekeeping schedule",
        category: "housekeeping",
        isGlobal: false,
      },
      {
        key: "housekeeping.manage",
        description: "Manage housekeeping operations",
        category: "housekeeping",
        isGlobal: false,
      },

      // Maintenance permissions
      {
        key: "maintenance.create",
        description: "Create maintenance requests",
        category: "maintenance",
        isGlobal: false,
      },
      {
        key: "maintenance.view",
        description: "View maintenance requests",
        category: "maintenance",
        isGlobal: false,
      },
      {
        key: "maintenance.update",
        description: "Update maintenance requests",
        category: "maintenance",
        isGlobal: false,
      },
      {
        key: "maintenance.delete",
        description: "Delete maintenance requests",
        category: "maintenance",
        isGlobal: false,
      },
      {
        key: "maintenance.complete",
        description: "Complete maintenance tasks",
        category: "maintenance",
        isGlobal: false,
      },

      // Restaurant permissions
      {
        key: "restaurant.manage",
        description: "Manage restaurant operations",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "restaurant.table.manage",
        description: "Manage restaurant tables",
        category: "restaurant",
        isGlobal: false,
      },

      // Menu permissions
      {
        key: "menu.create",
        description: "Create menu items",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "menu.view",
        description: "View menu items",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "menu.update",
        description: "Update menu items",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "menu.delete",
        description: "Delete menu items",
        category: "restaurant",
        isGlobal: false,
      },

      // Order permissions
      {
        key: "order.create",
        description: "Create orders",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "order.view",
        description: "View orders",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "order.update",
        description: "Update orders",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "order.delete",
        description: "Delete orders",
        category: "restaurant",
        isGlobal: false,
      },
      {
        key: "order.process",
        description: "Process orders",
        category: "restaurant",
        isGlobal: false,
      },

      // Inventory permissions
      {
        key: "inventory.create",
        description: "Create inventory items",
        category: "inventory",
        isGlobal: false,
      },
      {
        key: "inventory.view",
        description: "View inventory",
        category: "inventory",
        isGlobal: false,
      },
      {
        key: "inventory.update",
        description: "Update inventory",
        category: "inventory",
        isGlobal: false,
      },
      {
        key: "inventory.delete",
        description: "Delete inventory items",
        category: "inventory",
        isGlobal: false,
      },
      {
        key: "inventory.manage.suppliers",
        description: "Manage inventory suppliers",
        category: "inventory",
        isGlobal: false,
      },

      // Report permissions
      {
        key: "report.view.financial",
        description: "View financial reports",
        category: "report",
        isGlobal: false,
      },
      {
        key: "report.view.occupancy",
        description: "View occupancy reports",
        category: "report",
        isGlobal: false,
      },
      {
        key: "report.view.revenue",
        description: "View revenue reports",
        category: "report",
        isGlobal: false,
      },
      {
        key: "report.view.staff",
        description: "View staff reports",
        category: "report",
        isGlobal: false,
      },
      {
        key: "report.export",
        description: "Export reports",
        category: "report",
        isGlobal: false,
      },
    ]

    // Insert permissions
    await Permission.insertMany(defaultPermissions)
    console.log(`${defaultPermissions.length} default permissions seeded successfully`)
  } catch (error) {
    console.error("Error seeding default permissions:", error)
  } finally {
    mongoose.disconnect()
    console.log("MongoDB disconnected after seeding")
  }
}

seedDefaultPermissions()
