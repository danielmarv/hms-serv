import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventPackageController from "../controllers/eventPackageController.js"
import { validatePackageRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all package routes
router.use(authenticate)

// Package management routes
router.get("/", authorize(["packages.view"]), eventPackageController.getAllPackages)

router.get("/:id", authorize(["packages.view"]), eventPackageController.getPackageById)

router.post("/", authorize(["packages.create"]), validatePackageRequest, eventPackageController.createPackage)

router.put("/:id", authorize(["packages.update"]), validatePackageRequest, eventPackageController.updatePackage)

router.delete("/:id", authorize(["packages.delete"]), eventPackageController.deletePackage)

export default router
