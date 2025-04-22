import Invoice from "../models/Invoice.js"
import Booking from "../models/Booking.js"
import Guest from "../models/Guest.js"
import { ApiError } from "../utils/apiError.js"
import { sendEmail } from "../utils/emailService.js"

// Get all invoices with filtering, pagination, and sorting
export const getAllInvoices = async (req, res, next) => {
  try {
    const {
      guest,
      booking,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = "-issuedDate",
    } = req.query

    // Build filter object
    const filter = {}

    if (guest) filter.guest = guest
    if (booking) filter.booking = booking
    if (status) filter.status = status

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.total = {}
      if (minAmount) filter.total.$gte = Number(minAmount)
      if (maxAmount) filter.total.$lte = Number(maxAmount)
    }

    // Date range filter
    if (startDate || endDate) {
      filter.issuedDate = {}
      if (startDate) filter.issuedDate.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        filter.issuedDate.$lte = endDateObj
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const invoices = await Invoice.find(filter)
      .populate("guest", "full_name email phone")
      .populate("booking", "confirmation_number check_in check_out")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Invoice.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: invoices,
    })
  } catch (error) {
    next(error)
  }
}

// Get invoice by ID
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("guest", "full_name email phone address")
      .populate("booking", "confirmation_number check_in check_out room")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    res.status(200).json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    next(error)
  }
}

// Create new invoice
export const createInvoice = async (req, res, next) => {
  try {
    const {
      guest,
      booking,
      items,
      taxes,
      discounts,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      currency,
      status,
      dueDate,
      notes,
      paymentTerms,
      paymentInstructions,
      billingAddress,
      isBillingAddressSameAsGuest,
      isCompanyBilling,
      companyDetails,
    } = req.body

    // Validate guest exists
    const guestExists = await Guest.findById(guest)
    if (!guestExists) {
      return next(new ApiError("Guest not found", 404))
    }

    // Validate booking if provided
    if (booking) {
      const bookingExists = await Booking.findById(booking)
      if (!bookingExists) {
        return next(new ApiError("Booking not found", 404))
      }

      // Ensure booking belongs to the guest
      if (bookingExists.guest.toString() !== guest) {
        return next(new ApiError("Booking does not belong to this guest", 400))
      }
    }

    // Create invoice
    const invoice = await Invoice.create({
      guest,
      booking,
      items,
      taxes,
      discounts,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      balance: total, // Initially, balance equals total
      currency,
      status,
      dueDate,
      notes,
      paymentTerms,
      paymentInstructions,
      billingAddress,
      isBillingAddressSameAsGuest,
      isCompanyBilling,
      companyDetails,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    next(error)
  }
}

// Update invoice
export const updateInvoice = async (req, res, next) => {
  try {
    const {
      items,
      taxes,
      discounts,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      amountPaid,
      currency,
      status,
      dueDate,
      notes,
      paymentTerms,
      paymentInstructions,
      billingAddress,
      isBillingAddressSameAsGuest,
      isCompanyBilling,
      companyDetails,
    } = req.body

    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    // Don't allow updating if invoice is paid or cancelled
    if (invoice.status === "Paid" || invoice.status === "Cancelled") {
      return next(new ApiError(`Cannot update invoice with status: ${invoice.status}`, 400))
    }

    // Calculate balance
    const balance = (total || invoice.total) - (amountPaid || invoice.amountPaid)

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        items,
        taxes,
        discounts,
        subtotal,
        taxTotal,
        discountTotal,
        total,
        amountPaid,
        balance,
        currency,
        status,
        dueDate,
        notes,
        paymentTerms,
        paymentInstructions,
        billingAddress,
        isBillingAddressSameAsGuest,
        isCompanyBilling,
        companyDetails,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedInvoice,
    })
  } catch (error) {
    next(error)
  }
}

// Delete invoice
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    // Only allow deleting draft invoices
    if (invoice.status !== "Draft") {
      return next(new ApiError("Only draft invoices can be deleted", 400))
    }

    await invoice.deleteOne()

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Issue invoice (change status from Draft to Issued)
export const issueInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    if (invoice.status !== "Draft") {
      return next(new ApiError("Only draft invoices can be issued", 400))
    }

    // Update invoice status
    invoice.status = "Issued"
    invoice.issuedDate = new Date()
    invoice.updatedBy = req.user.id
    await invoice.save()

    res.status(200).json({
      success: true,
      message: "Invoice issued successfully",
      data: invoice,
    })
  } catch (error) {
    next(error)
  }
}

// Cancel invoice
export const cancelInvoice = async (req, res, next) => {
  try {
    const { reason } = req.body

    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    if (invoice.status === "Paid" || invoice.status === "Refunded") {
      return next(new ApiError(`Cannot cancel invoice with status: ${invoice.status}`, 400))
    }

    // Update invoice status
    invoice.status = "Cancelled"
    invoice.notes = reason
      ? `${invoice.notes ? invoice.notes + "\n" : ""}Cancellation reason: ${reason}`
      : invoice.notes
    invoice.updatedBy = req.user.id
    await invoice.save()

    res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully",
      data: invoice,
    })
  } catch (error) {
    next(error)
  }
}

// Record payment
export const recordPayment = async (req, res, next) => {
  try {
    const { amountPaid, paymentMethod, paymentDate, reference } = req.body

    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    if (invoice.status === "Cancelled") {
      return next(new ApiError("Cannot record payment for a cancelled invoice", 400))
    }

    if (invoice.status === "Paid") {
      return next(new ApiError("Invoice is already paid", 400))
    }

    // Calculate new amount paid and balance
    const newAmountPaid = invoice.amountPaid + Number(amountPaid)
    const newBalance = invoice.total - newAmountPaid

    // Determine new status
    let newStatus
    if (newBalance <= 0) {
      newStatus = "Paid"
    } else if (newAmountPaid > 0) {
      newStatus = "Partially Paid"
    } else {
      newStatus = invoice.status
    }

    // Update invoice
    invoice.amountPaid = newAmountPaid
    invoice.balance = newBalance
    invoice.status = newStatus
    invoice.notes = `${invoice.notes ? invoice.notes + "\n" : ""}Payment of ${amountPaid} ${
      invoice.currency
    } received on ${new Date(paymentDate || Date.now()).toLocaleDateString()} via ${paymentMethod}${
      reference ? ` (Ref: ${reference})` : ""
    }`
    invoice.updatedBy = req.user.id
    await invoice.save()

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: invoice,
    })
  } catch (error) {
    next(error)
  }
}

// Send invoice by email
export const sendInvoiceByEmail = async (req, res, next) => {
  try {
    const { email, message } = req.body

    const invoice = await Invoice.findById(req.params.id).populate("guest", "full_name email")
    if (!invoice) {
      return next(new ApiError("Invoice not found", 404))
    }

    // Use provided email or guest email
    const recipientEmail = email || invoice.guest.email
    if (!recipientEmail) {
      return next(new ApiError("No email address provided", 400))
    }

    // Generate invoice PDF (this would be implemented separately)
    // const pdfBuffer = await generateInvoicePdf(invoice)

    // Send email
    await sendEmail({
      email: recipientEmail,
      subject: `Invoice #${invoice.invoiceNumber}`,
      message: message || `Please find attached your invoice #${invoice.invoiceNumber}.`,
      // attachments: [
      //   {
      //     filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      //     content: pdfBuffer,
      //   },
      // ],
    })

    // Update invoice
    invoice.emailSent = true
    invoice.emailSentDate = new Date()
    invoice.updatedBy = req.user.id
    await invoice.save()

    res.status(200).json({
      success: true,
      message: `Invoice sent to ${recipientEmail} successfully`,
    })
  } catch (error) {
    next(error)
  }
}

// Get invoice statistics
export const getInvoiceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Date range filter
    const dateFilter = {}
    if (startDate) dateFilter.issuedDate = { $gte: new Date(startDate) }
    if (endDate) {
      const endDateObj = new Date(endDate)
      endDateObj.setHours(23, 59, 59, 999)
      dateFilter.issuedDate = { ...dateFilter.issuedDate, $lte: endDateObj }
    }

    // Get invoice statistics
    const stats = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                total: { $sum: "$total" },
                paid: { $sum: "$amountPaid" },
                outstanding: { $sum: "$balance" },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$issuedDate" } },
                count: { $sum: 1 },
                total: { $sum: "$total" },
                paid: { $sum: "$amountPaid" },
                outstanding: { $sum: "$balance" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: "$total" },
                totalPaid: { $sum: "$amountPaid" },
                totalOutstanding: { $sum: "$balance" },
                avgInvoiceValue: { $avg: "$total" },
              },
            },
          ],
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats[0].statusStats,
        daily: stats[0].dailyStats,
        totals: stats[0].totalStats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          avgInvoiceValue: 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  sendInvoiceByEmail,
  getInvoiceStats,
}
