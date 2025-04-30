import express from "express"
import {
  getCrossHotelUsers,
  grantChainAccess,
  revokeChainAccess,
  getHotelUsers,
} from "../controllers/CrossHotelController.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get users with access across multiple hotels in a chain
router.get("/chains/:chainCode/users", authorize(["manage_users", "view_all_data"]), getCrossHotelUsers)

// Grant user access to all hotels in a chain
router.post("/chains/:chainCode/users", authorize(["manage_users"]), grantChainAccess)

// Revoke user access from all hotels in a chain
router.delete("/chains/:chainCode/users/:userId", authorize(["manage_users"]), revokeChainAccess)

// Get users with access to a specific hotel
router.get("/hotels/:hotelId/users", authorize(["manage_users", "view_all_data"]), getHotelUsers)

export default router
