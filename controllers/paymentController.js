import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

// 🔸 Record Payment
export const createPayment = async (req, res) => {
  try {
    const { invoiceId, order, amountPaid, method, transactionReference } = req.body;

    const payment = new Payment({
      invoice: invoiceId,
      order,
      amountPaid,
      method,
      status: 'Completed',
      transactionReference,
      paidAt: new Date(),
      createdBy: req.user?._id
    });

    await payment.save();

    // Update invoice status
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.status = 'Paid';
      invoice.paidDate = new Date();
      await invoice.save();
    }

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔸 Get All Payments
export const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('invoice order');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔸 Get Payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('invoice order');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
