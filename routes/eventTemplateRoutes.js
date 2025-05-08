import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventTemplateController from "../controllers/eventTemplateController.js"
import { validateTemplateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all template routes
router.use(authenticate)

// Template management routes
router.get("/", authorize(["templates.view"]), eventTemplateController.getAllTemplates)

router.get("/:id", authorize(["templates.view"]), eventTemplateController.getTemplateById)

router.post("/", authorize(["templates.create"]), validateTemplateRequest, eventTemplateController.createTemplate)

router.put("/:id", authorize(["templates.update"]), validateTemplateRequest, eventTemplateController.updateTemplate)

router.delete("/:id", authorize(["templates.delete"]), eventTemplateController.deleteTemplate)

// Apply template route
router.post("/:id/apply", authorize(["templates.view", "events.create"]), eventTemplateController.applyTemplate)

export default router
