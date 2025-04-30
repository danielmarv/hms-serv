import mongoose from "mongoose"
import Role from "../models/Role.js"
import Permission from "../models/Permission.js"
import { config } from "dotenv"

config()

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected for seeding default roles"))
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

const seedDefaultRoles = async () => {
  try {
    // Check if roles already exist
    const existingRoles = await Role.countDocuments()
    if (existingRoles > 0) {
      console.log("Roles already exist in the database. Skipping seeding.")
      return
    }

    // Get all permissions
    const permissions = await Permission.find({})
    if (permissions.length === 0) {
      console.log("No permissions found. Please seed permissions first.")
      return
    }

    // Define default roles
    const defaultRoles = [
      {
        name: "super admin",
        description: "Full system access",
        permissions: permissions.map((p) => p._id), // All permissions
      },
      {
        name: "admin",
        description: "System admin with most permissions",
        permissions: permissions
          .filter((p) => p.key !== "system.manage.all" && p.key !== "system.super.admin")
          .map((p) => p._id),
      },
      {
        name: "hotel manager",
        description: "Manages a single hotel",
        permissions: permissions
          .filter(
            (p) =>
              p.category === "hotel" ||
              p.category === "room" ||
              p.category === "booking" ||
              p.category === "guest" ||
              p.category === "report" ||
              p.key === "user.view" ||
              p.key === "user.create" ||
              p.key === "user.update",
          )
          .map((p) => p._id),
      },
      {
        name: "front desk manager",
        description: "Handles bookings and guest check-ins",
        permissions: permissions
          .filter(
            (p) =>
              p.category === "booking" ||
              p.category === "guest" ||
              p.category === "frontdesk" ||
              p.key === "room.view" ||
              p.key === "room.update.status",
          )
          .map((p) => p._id),
      },
      {
        name: "housekeeping manager",
        description: "Manages housekeeping operations",
        permissions: permissions
          .filter((p) => p.category === "housekeeping" || p.key === "room.view" || p.key === "room.update.status")
          .map((p) => p._id),
      },
      {
        name: "restaurant manager",
        description: "Manages restaurant operations",
        permissions: permissions
          .filter((p) => p.category === "restaurant" || p.category === "inventory" || p.key.startsWith("menu."))
          .map((p) => p._id),
      },
      {
        name: "maintenance manager",
        description: "Manages maintenance operations",
        permissions: permissions.filter((p) => p.category === "maintenance").map((p) => p._id),
      },
      {
        name: "guest",
        description: "Hotel guest with limited access",
        permissions: permissions
          .filter((p) => p.key === "booking.view.own" || p.key === "invoice.view.own" || p.key === "order.create")
          .map((p) => p._id),
      },
    ]

    // Insert roles
    await Role.insertMany(defaultRoles)
    console.log(`${defaultRoles.length} default roles seeded successfully`)
  } catch (error) {
    console.error("Error seeding default roles:", error)
  } finally {
    mongoose.disconnect()
    console.log("MongoDB disconnected after seeding")
  }
}

seedDefaultRoles()
