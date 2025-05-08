import EventTemplate from "../models/EventTemplate.js"
import EventType from "../models/EventType.js"
import EventVenue from "../models/EventVenue.js"
import EventService from "../models/EventService.js"
import EventBooking from "../models/EventBooking.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get all event templates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllTemplates = async (req, res) => {
  try {
    const { hotel, eventType, isActive, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (hotel) query.hotel = hotel
    if (eventType) query.eventType = eventType
    if (isActive !== undefined) query.isActive = isActive === "true"

    const templates = await EventTemplate.find(query)
      .populate("eventType", "name description")
      .populate("venue", "name capacity")
      .populate("services.service", "name price")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await EventTemplate.countDocuments(query)

    return successResponse(res, {
      templates,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event templates", 500, error)
  }
}

/**
 * Get template by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTemplateById = async (req, res) => {
  try {
    const template = await EventTemplate.findById(req.params.id)
      .populate("eventType", "name description")
      .populate("venue", "name capacity location")
      .populate("services.service", "name description price category")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")

    if (!template) {
      return errorResponse(res, "Event template not found", 404)
    }

    return successResponse(res, { template })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event template", 500, error)
  }
}

/**
 * Create new event template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      hotel,
      eventType,
      venue,
      duration,
      setupTime,
      teardownTime,
      services,
      guestCapacity,
      defaultPrice,
      isActive,
      settings,
    } = req.body

    // Validate event type exists
    if (eventType) {
      const eventTypeExists = await EventType.findOne({ _id: eventType, hotel })
      if (!eventTypeExists) {
        return errorResponse(res, "Event type not found or does not belong to this hotel", 404)
      }
    }

    // Validate venue exists
    if (venue) {
      const venueExists = await EventVenue.findOne({ _id: venue, hotel })
      if (!venueExists) {
        return errorResponse(res, "Venue not found or does not belong to this hotel", 404)
      }
    }

    // Validate services
    if (services && services.length > 0) {
      const serviceIds = services.map((s) => s.service)
      const validServices = await EventService.find({
        _id: { $in: serviceIds },
        hotel,
      })

      if (validServices.length !== serviceIds.length) {
        return errorResponse(res, "One or more services are invalid or do not belong to this hotel", 400)
      }
    }

    const newTemplate = new EventTemplate({
      name,
      description,
      hotel,
      eventType,
      venue,
      duration,
      setupTime,
      teardownTime,
      services: services || [],
      guestCapacity,
      defaultPrice,
      isActive: isActive !== undefined ? isActive : true,
      settings: settings || {},
      createdBy: req.user._id,
    })

    await newTemplate.save()

    return successResponse(res, { template: newTemplate }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create event template", 500, error)
  }
}

/**
 * Update event template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTemplate = async (req, res) => {
  try {
    const { eventType, venue, services, hotel } = req.body

    // Validate event type if provided
    if (eventType) {
      const eventTypeExists = await EventType.findOne({
        _id: eventType,
        hotel: hotel || req.body.hotel,
      })
      if (!eventTypeExists) {
        return errorResponse(res, "Event type not found or does not belong to this hotel", 404)
      }
    }

    // Validate venue if provided
    if (venue) {
      const venueExists = await EventVenue.findOne({
        _id: venue,
        hotel: hotel || req.body.hotel,
      })
      if (!venueExists) {
        return errorResponse(res, "Venue not found or does not belong to this hotel", 404)
      }
    }

    // Validate services if provided
    if (services && services.length > 0) {
      const serviceIds = services.map((s) => s.service)
      const validServices = await EventService.find({
        _id: { $in: serviceIds },
        hotel: hotel || req.body.hotel,
      })

      if (validServices.length !== serviceIds.length) {
        return errorResponse(res, "One or more services are invalid or do not belong to this hotel", 400)
      }
    }

    // Add user ID to updated by field
    req.body.updatedBy = req.user._id

    const template = await EventTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )
      .populate("eventType", "name description")
      .populate("venue", "name capacity")
      .populate("services.service", "name price")

    if (!template) {
      return errorResponse(res, "Event template not found", 404)
    }

    return successResponse(res, { template })
  } catch (error) {
    return errorResponse(res, "Failed to update event template", 500, error)
  }
}

/**
 * Delete event template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteTemplate = async (req, res) => {
  try {
    const template = await EventTemplate.findByIdAndDelete(req.params.id)

    if (!template) {
      return errorResponse(res, "Event template not found", 404)
    }

    return successResponse(res, { message: "Event template deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event template", 500, error)
  }
}

/**
 * Create event from template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createEventFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params
    const { eventName, customer, startDate, endDate, guestCount, specialRequests, customFields } = req.body

    if (!eventName || !customer || !startDate || !endDate) {
      return errorResponse(res, "Event name, customer, start date, and end date are required", 400)
    }

    // Get template
    const template = await EventTemplate.findById(templateId).populate("services.service", "price")

    if (!template) {
      return errorResponse(res, "Event template not found", 404)
    }

    // Calculate total price
    let totalAmount = template.defaultPrice || 0

    // Add service prices
    if (template.services && template.services.length > 0) {
      template.services.forEach((service) => {
        if (service.service && service.service.price) {
          totalAmount += service.service.price * (service.quantity || 1)
        }
      })
    }

    // Create new event booking
    const newEvent = new EventBooking({
      eventName,
      customer,
      hotel: template.hotel,
      eventType: template.eventType,
      venue: template.venue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      setupTime: template.setupTime,
      teardownTime: template.teardownTime,
      guestCount: guestCount || template.guestCapacity,
      services: template.services,
      totalAmount,
      status: "pending",
      specialRequests,
      customFields,
      createdFrom: {
        template: template._id,
        name: template.name,
      },
      createdBy: req.user._id,
    })

    await newEvent.save()

    return successResponse(
      res,
      {
        message: "Event created successfully from template",
        event: newEvent,
      },
      201,
    )
  } catch (error) {
    return errorResponse(res, "Failed to create event from template", 500, error)
  }
}

/**
 * Get templates by event type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTemplatesByEventType = async (req, res) => {
  try {
    const { eventTypeId } = req.params
    const { hotel, isActive = true } = req.query

    if (!hotel) {
      return errorResponse(res, "Hotel ID is required", 400)
    }

    const templates = await EventTemplate.find({
      eventType: eventTypeId,
      hotel,
      isActive: isActive === "true",
    })
      .populate("venue", "name capacity")
      .sort({ name: 1 })

    return successResponse(res, { templates })
  } catch (error) {
    return errorResponse(res, "Failed to fetch templates by event type", 500, error)
  }
}

/**
 * Save event as template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const saveEventAsTemplate = async (req, res) => {
  try {
    const { eventId } = req.params
    const { name, description } = req.body

    if (!name) {
      return errorResponse(res, "Template name is required", 400)
    }

    // Get event
    const event = await EventBooking.findById(eventId)
    if (!event) {
      return errorResponse(res, "Event not found", 404)
    }

    // Check if template with same name exists
    const existingTemplate = await EventTemplate.findOne({
      name,
      hotel: event.hotel,
    })

    if (existingTemplate) {
      return errorResponse(res, "Template with this name already exists", 400)
    }

    // Create template from event
    const newTemplate = new EventTemplate({
      name,
      description: description || `Template created from event: ${event.eventName}`,
      hotel: event.hotel,
      eventType: event.eventType,
      venue: event.venue,
      duration: Math.ceil((event.endDate - event.startDate) / (1000 * 60 * 60)),
      setupTime: event.setupTime,
      teardownTime: event.teardownTime,
      services: event.services,
      guestCapacity: event.guestCount,
      defaultPrice: event.totalAmount,
      isActive: true,
      settings: event.settings || {},
      createdFrom: {
        event: event._id,
        name: event.eventName,
      },
      createdBy: req.user._id,
    })

    await newTemplate.save()

    return successResponse(
      res,
      {
        message: "Template created successfully from event",
        template: newTemplate,
      },
      201,
    )
  } catch (error) {
    return errorResponse(res, "Failed to save event as template", 500, error)
  }
}
