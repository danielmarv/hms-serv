import Payment from "../models/Payment.js"
import Invoice from "../models/Invoice.js"
import Booking from "../models/Booking.js"
import Guest from "../models/Guest.js"
import { ApiError } from "../utils/apiError.js"
import { sendEmail } from "../utils/emailService.js"

// Get all payments with filtering, pagination, and sorting
export const getAllPayments = async (req, res, next) => {
  try {
    const {
      guest,
      invoice,
      booking,
      method,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = "-paidAt",
    } = req.query

    // Build filter object
    const filter = {}

    if (guest) filter.guest = guest
    if (invoice) filter.invoice = invoice
    if (booking) filter.booking = booking
    if (method) filter.method = method
    if (status) filter.status = status

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amountPaid = {}
      if (minAmount) filter.amountPaid.$gte = Number(minAmount)
      if (maxAmount) filter.amountPaid.$lte = Number(maxAmount)
    }

    // Date range filter
    if (startDate || endDate) {
      filter.paidAt = {}
      if (startDate) filter.paidAt.$gte = new Date(startDate)
      filter.paidAt = {}
      if (startDate) filter.paidAt.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        filter.paidAt.$lte = endDateObj
      }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const payments = await Payment.find(filter)
      .populate("guest", "full_name email phone")
      .populate("invoice", "invoiceNumber total")
      .populate("booking", "confirmation_number")
      .populate("createdBy", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Payment.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: payments,
    })}
  } catch (error) {
    next(error)
  }
}

// Get payment by ID
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("guest", "full_name email phone")
      .populate("invoice", "invoiceNumber total status")
      .populate("booking", "confirmation_number check_in check_out")
      .populate("order", "orderNumber totalAmount")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    res.status(200).json({
      success: true,
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

// Create new payment
export const createPayment = async (req, res, next) => {
  try {
    const {
      guest,
      invoice,
      booking,
      order,
      amountPaid,
      method,
      currency,
      exchangeRate,
      transactionReference,
      cardDetails,
      bankDetails,
      mobileMoneyDetails,
      onlinePaymentDetails,
      notes,
      paidAt,
      isDeposit,
      receiptIssued,
    } = req.body

    // Validate guest exists
    const guestExists = await Guest.findById(guest)
    if (!guestExists) {
      return next(new ApiError("Guest not found", 404))
    }

    // Validate invoice if provided
    if (invoice) {
      const invoiceExists = await Invoice.findById(invoice)
      if (!invoiceExists) {
        return next(new ApiError("Invoice not found", 404))
      }

      // Ensure invoice belongs to the guest
      if (invoiceExists.guest.toString() !== guest) {
        return next(new ApiError("Invoice does not belong to this guest", 400))
      }

      // Check if invoice is already paid
      if (invoiceExists.status === "Paid") {
        return next(new ApiError("Invoice is already paid", 400))
      }

      // Check if payment amount exceeds invoice balance
      if (amountPaid > invoiceExists.balance) {
        return next(new ApiError("Payment amount exceeds invoice balance", 400))
      }
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

    // Create payment
    const payment = await Payment.create({
      guest,
      invoice,
      booking,
      order,
      amountPaid,
      method,
      status: "Completed", // Default to completed for manual payments
      currency,
      exchangeRate,
      transactionReference,
      cardDetails,
      bankDetails,
      mobileMoneyDetails,
      onlinePaymentDetails,
      notes,
      paidAt: paidAt || new Date(),
      isDeposit,
      receiptIssued,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Update invoice if provided
    if (invoice) {
      const invoiceToUpdate = await Invoice.findById(invoice)
      const newAmountPaid = invoiceToUpdate.amountPaid + amountPaid
      const newBalance = invoiceToUpdate.total - newAmountPaid

      // Determine new status
      let newStatus
      if (newBalance <= 0) {
        newStatus = "Paid"
      } else if (newAmountPaid > 0) {
        newStatus = "Partially Paid"
      } else {
        newStatus = invoiceToUpdate.status
      }

      // Update invoice
      invoiceToUpdate.amountPaid = newAmountPaid
      invoiceToUpdate.balance = newBalance
      invoiceToUpdate.status = newStatus
      invoiceToUpdate.updatedBy = req.user.id
      await invoiceToUpdate.save()
    }

    // Update booking payment status if provided
    if (booking) {
      const bookingToUpdate = await Booking.findById(booking)
      
      // If this is a deposit, update payment status to partial
      if (isDeposit) {
        bookingToUpdate.payment_status = "partial"
      } else {
        // Check if payment covers the total amount
        const totalPaid = await Payment.aggregate([
          { $match: { booking: bookingToUpdate._id, status: "Completed" } },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ])
        
        const totalPaidAmount = (totalPaid[0]?.total || 0) + amountPaid
        
        if (totalPaidAmount >= bookingToUpdate.total_amount) {
          bookingToUpdate.payment_status = "paid"
        } else if (totalPaidAmount > 0) {
          bookingToUpdate.payment_status = "partial"
        }
      }
      
      bookingToUpdate.updatedBy = req.user.id
      await bookingToUpdate.save()
    }

    res.status(201).json({
      success: true,
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

// Update payment
export const updatePayment = async (req, res, next) => {
  try {
    const {
      method,
      transactionReference,
      cardDetails,
      bankDetails,
      mobileMoneyDetails,
      onlinePaymentDetails,
      notes,
      paidAt,
      status,
    } = req.body

    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    // Don't allow updating amount for completed payments
    if (payment.status === "Completed" && req.body.amountPaid && req.body.amountPaid !== payment.amountPaid) {
      return next(new ApiError("Cannot update amount for completed payments", 400))
    }

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        method,
        transactionReference,
        cardDetails,
        bankDetails,
        mobileMoneyDetails,
        onlinePaymentDetails,
        notes,
        paidAt,
        status,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedPayment,
    })
  } catch (error) {
    next(error)
  }
}

// Delete payment
export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    // Only allow deleting pending payments
    if (payment.status !== "Pending") {
      return next(new ApiError("Only pending payments can be deleted", 400))
    }

    await payment.deleteOne()

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Process refund
export const processRefund = async (req, res, next) => {
  try {
    const { amount, reason, refundReference } = req.body

    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    if (payment.status !== "Completed") {
      return next(new ApiError("Only completed payments can be refunded", 400))
    }

    if (!amount) {
      return next(new ApiError("Refund amount is required", 400))
    }

    if (amount > payment.amountPaid) {
      return next(new ApiError("Refund amount cannot exceed payment amount", 400))
    }

    // Update payment status
    const newStatus = amount === payment.amountPaid ? "Refunded" : "Partially Refunded"
    
    payment.status = newStatus
    payment.refundDetails = {
      amount,
      reason,
      refundedAt: new Date(),
      refundedBy: req.user.id,
      refundReference,
    }
    payment.isRefund = true
    payment.updatedBy = req.user.id
    await payment.save()

    // Update invoice if payment was for an invoice
    if (payment.invoice) {
      const invoice = await Invoice.findById(payment.invoice)
      if (invoice) {
        // Reduce amount paid and increase balance
        invoice.amountPaid -= amount
        invoice.balance += amount
        
        // Update status
        if (invoice.balance >= invoice.total) {
          invoice.status = "Issued"
        } else if (invoice.balance > 0) {
          invoice.status = "Partially Paid"
        }
        
        invoice.updatedBy = req.user.id
        await invoice.save()
      }
    }

    // Update booking payment status if payment was for a booking
    if (payment.booking) {
      const booking = await Booking.findById(payment.booking)
      if (booking) {
        // Recalculate total paid
        const totalPaid = await Payment.aggregate([
          { 
            $match: { 
              booking: booking._id, 
              status: "Completed",
              _id: { $ne: payment._id } // Exclude current payment
            } 
          },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ])
        
        const totalPaidAmount = totalPaid[0]?.total || 0
        
        if (totalPaidAmount === 0) {
          booking.payment_status = "pending"
        } else if (totalPaidAmount < booking.total_amount) {
          booking.payment_status = "partial"
        }
        
        booking.updatedBy = req.user.id
        await booking.save()
      }
    }

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

// Issue receipt
export const issueReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    if (payment.status !== "Completed") {
      return next(new ApiError("Only completed payments can have receipts issued", 400))
    }

    if (payment.receiptIssued) {
      return next(new ApiError("Receipt already issued for this payment", 400))
    }

    // Update payment
    payment.receiptIssued = true
    payment.updatedBy = req.user.id
    await payment.save()

    res.status(200).json({
      success: true,
      message: "Receipt issued successfully",
      data: {
        paymentId: payment._id,
        receiptNumber: payment.receiptNumber,
        receiptUrl: payment.receiptUrl,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Send receipt by email
export const sendReceiptByEmail = async (req, res, next) => {
  try {
    const { email, message } = req.body

    const payment = await Payment.findById(req.params.id).populate("guest", "full_name email")
    if (!payment) {
      return next(new ApiError("Payment not found", 404))
    }

    if (!payment.receiptIssued) {
      return next(new ApiError("Receipt not issued for this payment", 400))
    }

    // Use provided email or guest email
    const recipientEmail = email || payment.guest.email
    if (!recipientEmail) {
      return next(new ApiError("No email address provided", 400))
    }

    // Send email
    await sendEmail({
      email: recipientEmail,
      subject: `Payment Receipt #${payment.receiptNumber}`,
      message: message || `Thank you for your payment of ${payment.amountPaid} ${payment.currency}. Please find your receipt attached.`,
      // attachments: [
      //   {
      //     filename: `Receipt-${payment.receiptNumber}.pdf`,
      //     content: receiptPdfBuffer,
      //   },
      // ],
    })

    res.status(200).json({
      success: true,
      message: `Receipt sent to ${recipientEmail} successfully`,
    })
  } catch (error) {
    next(error)
  }
}

// Get payment statistics
export const getPaymentStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Date range filter
    const dateFilter = {}
    if (startDate) dateFilter.paidAt = { $gte: new Date(startDate) }
    if (endDate) {
      const endDateObj = new Date(endDate)
      endDateObj.setHours(23, 59, 59, 999)
      dateFilter.paidAt = { ...dateFilter.paidAt, $lte: endDateObj }
    }

    // Get payment statistics
    const stats = await Payment.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          methodStats: [
            {
              $group: {
                _id: "$method",
                count: { $sum: 1 },
                total: { $sum: "$amountPaid" },
              },
            },
            { $sort: { total: -1 } },
          ],
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                total: { $sum: "$amountPaid" },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
                count: { $sum: 1 },
                total: { $sum: "$amountPaid" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                totalAmount: { $sum: "$amountPaid" },
                avgPaymentValue: { $avg: "$amountPaid" },
              },
            },
          ],
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        byMethod: stats[0].methodStats,
        byStatus: stats[0].statusStats,
        daily: stats[0].dailyStats,
        totals: stats[0].totalStats[0] || {
          totalPayments: 0,
          totalAmount: 0,
          avgPaymentValue: 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  processRefund,
  issueReceipt,
  sendReceiptByEmail,
  getPaymentStats,
}
