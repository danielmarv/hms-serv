import EventType from "../models/EventType.js"
import Event from "../models/Event.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"

/**
 * @desc    Get all event types
 * @route   GET /api/events/types
 * @access  Private
 */
export const getAllEventTypes = async (req, res, next) => {
  try {
    const { hotel_id, status, category, page = 1, limit = 20 } = req.query

    // Build filter object
    const filter = { is_deleted: false }

    if (hotel_id) filter.hotel_id = hotel_id
    if (status) filter.status = status
    if (category) filter.category = category

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination
    const eventTypes = await EventType.find(filter).sort({ name: 1 }).skip(skip).limit(Number.parseInt(limit)).lean()

    // Get total count for pagination
    const total = await EventType.countDocuments(filter)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          event_types: eventTypes,
          pagination: {
            total,
            page: Number.parseInt(page),
            pages: Math.ceil(total / Number.parseInt(limit)),
            limit: Number.parseInt(limit),
          },
        },
        "Event types retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get event type by ID
 * @route   GET /api/events/types/:id
 * @access  Private
 */
export const getEventTypeById = async (req, res, next) => {
  try {
    const { id } = req.params

    const eventType = await EventType.findOne({ _id: id, is_deleted: false })

    if (!eventType) {
      throw new ApiError("Event type not found", 404)
    }

    res.status(200).json(new ApiResponse(200, eventType, "Event type retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Create a new event type
 * @route   POST /api/events/types
 * @access  Private
 */
export const createEventType = async (req, res, next) => {
  try {
    const {
      name,
      description,
      hotel_id,
      category,
      color,
      icon,
      default_duration,
      default_capacity,
      base_price,
      price_per_person,
      features,
      status,
    } = req.body

    // Validate required fields
    if (!name || !hotel_id) {
      throw new ApiError("Please provide all required fields", 400)
    }

    // Check for duplicate event type name in the same hotel
    const existingEventType = await EventType.findOne({ name, hotel_id, is_deleted: false })
    if (existingEventType) {
      throw new ApiError("An event type with this name already exists in this hotel", 400)
    }

    // Create event type
    const newEventType = new EventType({
      name,
      description,
      hotel_id,
      category: category || "other",
      color: color || "#3788d8",
      icon,
      default_duration: default_duration || 60, // Default 60 minutes
      default_capacity: default_capacity || 0,
      base_price: base_price || 0,
      price_per_person: price_per_person || 0,
      features,
      status: status || "active",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await newEventType.save()

    res.status(201).json(new ApiResponse(201, newEventType, "Event type created successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Update an event type
 * @route   PUT /api/events/types/:id
 * @access  Private
 */
export const updateEventType = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Find event type
    const eventType = await EventType.findOne({ _id: id, is_deleted: false })
    if (!eventType) {
      throw new ApiError("Event type not found", 404)
    }

    // Check for duplicate event type name in the same hotel
    if (updateData.name && updateData.name !== eventType.name) {
      const existingEventType = await EventType.findOne({
        name: updateData.name,
        hotel_id: updateData.hotel_id || eventType.hotel_id,
        _id: { $ne: id },
        is_deleted: false,
      })
      if (existingEventType) {
        throw new ApiError("An event type with this name already exists in this hotel", 400)
      }
    }

    // Add updatedBy
    updateData.updatedBy = req.user._id

    // Update event type
    const updatedEventType = await EventType.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

    res.status(200).json(new ApiResponse(200, updatedEventType, "Event type updated successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Delete an event type
 * @route   DELETE /api/events/types/:id
 * @access  Private
 */
export const deleteEventType = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if event type exists
    const eventType = await EventType.findOne({ _id: id, is_deleted: false })
    if (!eventType) {
      throw new ApiError("Event type not found", 404)
    }

    // Check if event type is used in any events
    const eventsUsingType = await Event.countDocuments({
      event_type_id: id,
      is_deleted: false,
    })

    if (eventsUsingType > 0) {
      throw new ApiError("Cannot delete event type that is used in events", 400)
    }

    // Soft delete event type
    eventType.is_deleted = true
    eventType.updatedBy = req.user._id
    await eventType.save()

    res.status(200).json(new ApiResponse(200, null, "Event type deleted successfully"))
  } catch (error) {
    next(error)
  }
}
