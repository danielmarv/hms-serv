import Supplier from "../models/Supplier.js"
import InventoryItem from "../models/Inventory.js"
import { ApiError } from "../utils/apiError.js"

// Get all suppliers with filtering, pagination, and sorting
export const getAllSuppliers = async (req, res, next) => {
  try {
    const { search, category, isActive, page = 1, limit = 20, sort = "name" } = req.query

    // Build filter object
    const filter = {}

    // Search functionality
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { contact_person: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
      ]
    }

    if (category) filter.categories = category
    if (isActive !== undefined) filter.is_active = isActive === "true"

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const suppliers = await Supplier.find(filter).sort(sort).skip(skip).limit(Number(limit))

    // Get total count for pagination
    const total = await Supplier.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: suppliers.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: suppliers,
    })
  } catch (error) {
    next(error)
  }
}

// Get supplier by ID
export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    res.status(200).json({
      success: true,
      data: supplier,
    })
  } catch (error) {
    next(error)
  }
}

// Create new supplier
export const createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      code,
      contact_person,
      phone,
      alternative_phone,
      email,
      website,
      address,
      supplies,
      categories,
      tax_id,
      payment_terms,
      credit_limit,
      currency,
      bank_details,
      notes,
      rating,
      is_active,
      lead_time,
      minimum_order,
      documents,
    } = req.body

    // Check if supplier with same name already exists
    const existingSupplier = await Supplier.findOne({ name })
    if (existingSupplier) {
      return next(new ApiError("Supplier with this name already exists", 400))
    }

    // Check if code is provided and if it's already in use
    if (code) {
      const existingCode = await Supplier.findOne({ code })
      if (existingCode) {
        return next(new ApiError("Supplier code already in use", 400))
      }
    }

    // Create supplier
    const supplier = await Supplier.create({
      name,
      code,
      contact_person,
      phone,
      alternative_phone,
      email,
      website,
      address,
      supplies,
      categories,
      tax_id,
      payment_terms,
      credit_limit,
      currency,
      bank_details,
      notes,
      rating,
      is_active: is_active !== undefined ? is_active : true,
      lead_time,
      minimum_order,
      documents,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: supplier,
    })
  } catch (error) {
    next(error)
  }
}

// Update supplier
export const updateSupplier = async (req, res, next) => {
  try {
    const {
      name,
      code,
      contact_person,
      phone,
      alternative_phone,
      email,
      website,
      address,
      supplies,
      categories,
      tax_id,
      payment_terms,
      credit_limit,
      currency,
      bank_details,
      notes,
      rating,
      is_active,
      lead_time,
      minimum_order,
      documents,
    } = req.body

    const supplier = await Supplier.findById(req.params.id)
    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    // Check if name is being changed and if it's already in use
    if (name && name !== supplier.name) {
      const existingSupplier = await Supplier.findOne({ name, _id: { $ne: req.params.id } })
      if (existingSupplier) {
        return next(new ApiError("Supplier with this name already exists", 400))
      }
    }

    // Check if code is being changed and if it's already in use
    if (code && code !== supplier.code) {
      const existingCode = await Supplier.findOne({ code, _id: { $ne: req.params.id } })
      if (existingCode) {
        return next(new ApiError("Supplier code already in use", 400))
      }
    }

    // Update supplier
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        name,
        code,
        contact_person,
        phone,
        alternative_phone,
        email,
        website,
        address,
        supplies,
        categories,
        tax_id,
        payment_terms,
        credit_limit,
        currency,
        bank_details,
        notes,
        rating,
        is_active,
        lead_time,
        minimum_order,
        documents,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedSupplier,
    })
  } catch (error) {
    next(error)
  }
}

// Delete supplier
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    // Check if supplier is linked to any inventory items
    const itemCount = await InventoryItem.countDocuments({ supplier: req.params.id })
    if (itemCount > 0) {
      return next(
        new ApiError(
          `Cannot delete supplier. It is currently linked to ${itemCount} inventory items. Consider marking as inactive instead.`,
          400,
        ),
      )
    }

    await supplier.deleteOne()

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get supplier items
export const getSupplierItems = async (req, res, next) => {
  try {
    const items = await InventoryItem.find({ supplier: req.params.id })
      .select("name category sku currentStock unitPrice")
      .sort("name")

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

// Toggle supplier active status
export const toggleActiveStatus = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    supplier.is_active = !supplier.is_active
    supplier.updatedBy = req.user.id
    await supplier.save()

    res.status(200).json({
      success: true,
      message: `Supplier ${supplier.is_active ? "activated" : "deactivated"} successfully`,
      data: { is_active: supplier.is_active },
    })
  } catch (error) {
    next(error)
  }
}

// Add document to supplier
export const addSupplierDocument = async (req, res, next) => {
  try {
    const { name, url, type } = req.body

    if (!name || !url || !type) {
      return next(new ApiError("Document name, URL, and type are required", 400))
    }

    const supplier = await Supplier.findById(req.params.id)
    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    const newDocument = {
      name,
      url,
      type,
      uploaded_at: new Date(),
    }

    supplier.documents = supplier.documents || []
    supplier.documents.push(newDocument)
    supplier.updatedBy = req.user.id
    await supplier.save()

    res.status(200).json({
      success: true,
      message: "Document added successfully",
      data: newDocument,
    })
  } catch (error) {
    next(error)
  }
}

// Remove document from supplier
export const removeSupplierDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params

    if (!documentId) {
      return next(new ApiError("Document ID is required", 400))
    }

    const supplier = await Supplier.findById(req.params.id)
    if (!supplier) {
      return next(new ApiError("Supplier not found", 404))
    }

    // Find the document index
    const documentIndex = supplier.documents.findIndex((doc) => doc._id.toString() === documentId)

    if (documentIndex === -1) {
      return next(new ApiError("Document not found", 404))
    }

    // Remove the document
    supplier.documents.splice(documentIndex, 1)
    supplier.updatedBy = req.user.id
    await supplier.save()

    res.status(200).json({
      success: true,
      message: "Document removed successfully",
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems,
  toggleActiveStatus,
  addSupplierDocument,
  removeSupplierDocument,
}
