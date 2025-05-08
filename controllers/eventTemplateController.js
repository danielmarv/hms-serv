import mongoose from "mongoose"
import EventTemplate from "../models/EventTemplate.js"
import Event from "../models/Event.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"

/**
 * Get all event templates
 * @route GET /api/event-templates
 * @access Private (templates.view)
 */
export const getAllTemplates = async (req, res, next) => {
  try {
    const { hotelId } = req.query

    const filter = {}
    if (hotelId) {
      filter.hotelId = hotelId
    }

    const templates = await EventTemplate.find(filter)
      .sort({ name: 1 })
      .populate("eventType", "name color")
      .populate("venue", "name capacity")
      .lean()

    return res.status(200).json(new ApiResponse(200, templates, "Event templates retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * Get a specific event template by ID
 * @route GET /api/event-templates/:id
 * @access Private (templates.view)
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params

    const template = await EventTemplate.findById(id)
      .populate("eventType", "name color")
      .populate("venue", "name capacity")
      .populate("services", "name price description")
      .populate("staffing", "role count")
      .lean()

    if (!template) {
      throw new ApiError(404, "Event template not found")
    }

    return res.status(200).json(new ApiResponse(200, template, "Event template retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * Create a new event template
 * @route POST /api/event-templates
 * @access Private (templates.create)
 */
export const createTemplate = async (req, res, next) => {
  try {
    const {
      name,
      description,
      eventType,
      venue,
      duration,
      capacity,
      basePrice,
      services,
      staffing,
      setupTime,
      teardownTime,
      includedItems,
      terms,
      isActive,
      hotelId,
    } = req.body

    // Create the template
    const template = await EventTemplate.create({
      name,
      description,
      eventType,
      venue,
      duration,
      capacity,
      basePrice,
      services,
      staffing,
      setupTime,
      teardownTime,
      includedItems,
      terms,
      isActive,
      hotelId,
      createdBy: req.user._id,
    })

    return res.status(201).json(new ApiResponse(201, template, "Event template created successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * Update an existing event template
 * @route PUT /api/event-templates/:id
 * @access Private (templates.update)
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const template = await EventTemplate.findById(id)

    if (!template) {
      throw new ApiError(404, "Event template not found")
    }

    // Update the template
    const updatedTemplate = await EventTemplate.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: req.user._id,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    )

    return res.status(200).json(new ApiResponse(200, updatedTemplate, "Event template updated successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * Delete an event template
 * @route DELETE /api/event-templates/:id
 * @access Private (templates.delete)
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params

    const template = await EventTemplate.findById(id)

    if (!template) {
      throw new ApiError(404, "Event template not found")
    }

    await EventTemplate.findByIdAndDelete(id)

    return res.status(200).json(new ApiResponse(200, {}, "Event template deleted successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * Apply a template to create a new event
 * @route POST /api/event-templates/:id/apply
 * @access Private (templates.view, events.create)
 */
export const applyTemplate = async (req, res, next) => {
  // Start a transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { id } = req.params
    const { startDate, endDate, customName, customPrice, guestId, notes } = req.body

    const template = await EventTemplate.findById(id)
      .populate("eventType")
      .populate("venue")
      .populate("services")
      .populate("staffing")

    if (!template) {
      throw new ApiError(404, "Event template not found")
    }

    // Create the event based on the template
    const event = await Event.create(
      [
        {
          name: customName || template.name,
          eventType: template.eventType._id,
          venue: template.venue._id,
          startDate,
          endDate,
          duration: template.duration,
          capacity: template.capacity,
          price: customPrice || template.basePrice,
          services: template.services.map((service) => service._id),
          staffing: template.staffing,
          setupTime: template.setupTime,
          teardownTime: template.teardownTime,
          status: "confirmed",
          guestId,
          notes,
          terms: template.terms,
          hotelId: template.hotelId,
          createdFrom: template._id,
          createdBy: req.user._id,
        },
      ],
      { session },
    )

    await session.commitTransaction()

    return res.status(201).json(new ApiResponse(201, event[0], "Event created from template successfully"))
  } catch (error) {
    await session.abortTransaction()
    next(error)
  } finally {
    session.endSession()
  }
}
