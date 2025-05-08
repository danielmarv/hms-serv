import EventPackage from "../models/EventPackage.js"
import EventService from "../models/EventService.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get all event packages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllPackages = async (req, res) => {
  try {
    const { hotel, eventType, isActive, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (hotel) query.hotel = hotel
    if (eventType) query.eventType = eventType
    if (isActive !== undefined) query.isActive = isActive === "true"

    const packages = await EventPackage.find(query)
      .populate("eventType", "name description")
      .populate("services.service", "name description price")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await EventPackage.countDocuments(query)

    return successResponse(res, {
      packages,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event packages", 500, error)
  }
}

/**
 * Get package by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPackageById = async (req, res) => {
  try {
    const eventPackage = await EventPackage.findById(req.params.id)
      .populate("eventType", "name description")
      .populate("services.service", "name description price category")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")

    if (!eventPackage) {
      return errorResponse(res, "Event package not found", 404)
    }

    return successResponse(res, { package: eventPackage })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event package", 500, error)
  }
}

/**
 * Create new event package
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createPackage = async (req, res) => {
  try {
    const { name, description, hotel, eventType, basePrice, services, minGuests, maxGuests } = req.body

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

    const newPackage = new EventPackage({
      name,
      description,
      hotel,
      eventType,
      basePrice,
      services: services || [],
      minGuests,
      maxGuests,
      createdBy: req.user._id,
    })

    await newPackage.save()

    return successResponse(res, { package: newPackage }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create event package", 500, error)
  }
}

/**
 * Update event package
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updatePackage = async (req, res) => {
  try {
    const { services, hotel } = req.body

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

    const eventPackage = await EventPackage.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )
      .populate("eventType", "name description")
      .populate("services.service", "name description price")

    if (!eventPackage) {
      return errorResponse(res, "Event package not found", 404)
    }

    return successResponse(res, { package: eventPackage })
  } catch (error) {
    return errorResponse(res, "Failed to update event package", 500, error)
  }
}

/**
 * Delete event package
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deletePackage = async (req, res) => {
  try {
    const eventPackage = await EventPackage.findByIdAndDelete(req.params.id)

    if (!eventPackage) {
      return errorResponse(res, "Event package not found", 404)
    }

    return successResponse(res, { message: "Event package deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event package", 500, error)
  }
}

/**
 * Get packages by event type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPackagesByEventType = async (req, res) => {
  try {
    const { eventTypeId } = req.params
    const { hotel, isActive = true } = req.query

    const query = {
      eventType: eventTypeId,
      isActive: isActive === "true",
    }

    if (hotel) query.hotel = hotel

    const packages = await EventPackage.find(query)
      .populate("eventType", "name description")
      .populate("services.service", "name description price")
      .sort({ basePrice: 1 })

    return successResponse(res, { packages })
  } catch (error) {
    return errorResponse(res, "Failed to fetch packages by event type", 500, error)
  }
}

/**
 * Calculate package price
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const calculatePackagePrice = async (req, res) => {
  try {
    const { packageId, guestCount, additionalServices } = req.body

    if (!packageId || !guestCount) {
      return errorResponse(res, "Package ID and guest count are required", 400)
    }

    const eventPackage = await EventPackage.findById(packageId).populate("services.service", "price")

    if (!eventPackage) {
      return errorResponse(res, "Event package not found", 404)
    }

    // Validate guest count
    if (guestCount < eventPackage.minGuests || guestCount > eventPackage.maxGuests) {
      return errorResponse(
        res,
        `Guest count must be between ${eventPackage.minGuests} and ${eventPackage.maxGuests}`,
        400,
      )
    }

    // Calculate base price
    let totalPrice = eventPackage.basePrice

    // Add per-guest price if applicable
    if (eventPackage.perGuestPrice) {
      totalPrice += eventPackage.perGuestPrice * guestCount
    }

    // Add included services
    const includedServices = eventPackage.services.map((service) => {
      const servicePrice = service.service.price * (service.quantity || 1)
      return {
        service: service.service._id,
        name: service.service.name,
        quantity: service.quantity || 1,
        price: servicePrice,
      }
    })

    // Add additional services if provided
    let additionalServicesDetails = []
    if (additionalServices && additionalServices.length > 0) {
      const serviceIds = additionalServices.map((s) => s.service)
      const services = await EventService.find({ _id: { $in: serviceIds } })

      additionalServicesDetails = additionalServices
        .map((requestedService) => {
          const service = services.find((s) => s._id.toString() === requestedService.service.toString())
          if (!service) return null

          const quantity = requestedService.quantity || 1
          const servicePrice = service.price * quantity
          totalPrice += servicePrice

          return {
            service: service._id,
            name: service.name,
            quantity,
            price: servicePrice,
          }
        })
        .filter(Boolean)
    }

    return successResponse(res, {
      packageName: eventPackage.name,
      basePrice: eventPackage.basePrice,
      guestCount,
      includedServices,
      additionalServices: additionalServicesDetails,
      totalPrice,
    })
  } catch (error) {
    return errorResponse(res, "Failed to calculate package price", 500, error)
  }
}
