import Hotel from "../models/Hotel.js"
import Configuration from "../models/Configuration.js"
import SharedConfiguration from "../models/SharedConfiguration.js"
import DataSyncLog from "../models/DataSyncLog.js"
import { ApiError } from "../utils/apiError.js"

// Sync configuration across all hotels in a chain
export const syncChainConfiguration = async (req, res, next) => {
  try {
    const { chainCode } = req.params
    const { syncAll = false, targetHotels = [], configSections = [] } = req.body

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get shared configuration
    const sharedConfig = await SharedConfiguration.findOne({ chainCode })
    if (!sharedConfig) {
      return next(new ApiError("Shared configuration not found", 404))
    }

    // Determine which hotels to sync
    let hotelsToSync = []

    if (syncAll) {
      // Get all hotels in the chain except headquarters
      hotelsToSync = await Hotel.find({
        chainCode,
        _id: { $ne: headquarters._id },
        active: true,
      })
    } else if (targetHotels.length > 0) {
      // Validate target hotels
      hotelsToSync = await Hotel.find({
        _id: { $in: targetHotels },
        chainCode,
        active: true,
      })

      if (hotelsToSync.length !== targetHotels.length) {
        return next(new ApiError("One or more target hotels are invalid", 400))
      }
    } else {
      return next(new ApiError("No hotels specified for synchronization", 400))
    }

    // Create sync log
    const syncLog = await DataSyncLog.create({
      chainCode,
      syncType: "configuration",
      sourceHotel: headquarters._id,
      targetHotels: hotelsToSync.map((hotel) => hotel._id),
      status: "in-progress",
      initiatedBy: req.user.id,
      details: {
        success: 0,
        failed: 0,
        skipped: 0,
      },
    })

    // Determine which configuration sections to sync
    const sectionsToSync =
      configSections.length > 0 ? configSections : ["branding", "documentPrefixes", "systemSettings"]

    // Sync configuration to each hotel
    const errors = []
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const hotel of hotelsToSync) {
      try {
        const config = await Configuration.findOne({ hotelId: hotel._id })

        if (!config) {
          errors.push({
            hotelId: hotel._id,
            error: "Configuration not found",
          })
          skippedCount++
          continue
        }

        // Apply shared configuration based on sections to sync
        let updated = false

        for (const section of sectionsToSync) {
          if (section === "branding" && !sharedConfig.overrideSettings.branding) {
            config.branding = sharedConfig.branding
            updated = true
          }

          if (section === "documentPrefixes" && !sharedConfig.overrideSettings.documentPrefixes) {
            config.documentPrefixes = sharedConfig.documentPrefixes
            updated = true
          }

          if (section === "systemSettings" && !sharedConfig.overrideSettings.systemSettings) {
            config.systemSettings = sharedConfig.systemSettings
            updated = true
          }
        }

        if (updated) {
          await config.save()
          successCount++
        } else {
          skippedCount++
        }
      } catch (error) {
        errors.push({
          hotelId: hotel._id,
          error: error.message,
        })
        failedCount++
      }
    }

    // Update sync log
    syncLog.status = failedCount > 0 ? "completed with errors" : "completed"
    syncLog.endTime = new Date()
    syncLog.details = {
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
    }
    syncLog.errors = errors
    await syncLog.save()

    res.status(200).json({
      success: true,
      message: `Configuration synchronized to ${successCount} hotels`,
      data: {
        syncLog,
        syncId: syncLog._id,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get sync logs for a chain
export const getSyncLogs = async (req, res, next) => {
  try {
    const { chainCode } = req.params
    const { page = 1, limit = 20 } = req.query

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Get sync logs
    const logs = await DataSyncLog.find({ chainCode })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("initiatedBy", "full_name email")
      .populate("sourceHotel", "name code")

    // Get total count
    const total = await DataSyncLog.countDocuments({ chainCode })

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: logs,
    })
  } catch (error) {
    next(error)
  }
}

// Get sync log details
export const getSyncLogDetails = async (req, res, next) => {
  try {
    const { syncId } = req.params

    const log = await DataSyncLog.findById(syncId)
      .populate("initiatedBy", "full_name email")
      .populate("sourceHotel", "name code")
      .populate("targetHotels", "name code")
      .populate("errors.hotelId", "name code")

    if (!log) {
      return next(new ApiError("Sync log not found", 404))
    }

    res.status(200).json({
      success: true,
      data: log,
    })
  } catch (error) {
    next(error)
  }
}
