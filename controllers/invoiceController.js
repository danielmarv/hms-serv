import Invoice from '../models/Invoice.js';
import { v4 as uuidv4 } from 'uuid';

// 🔸 Create Invoice
export const createInvoice = async (req, res) => {
  try {
    const {
      guest,
      booking,
      items,
      taxes = [],
      discounts = [],
      paymentMethod,
      notes
    } = req.body;

    const invoiceNumber = `INV-${uuidv4().split('-')[0].toUpperCase()}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0);
    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const total = subtotal + totalTax - totalDiscount;

    const invoice = new Invoice({
      guest,
      booking,
      invoiceNumber,
      items,
      taxes,
      discounts,
      subtotal,
      total,
      paymentMethod,
      notes,
      createdBy: req.user?._id
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔸 Get All Invoices
export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('guest booking');
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔸 Get Single Invoice
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('guest booking');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
