import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';

// 🔹 Total Revenue
export const getTotalRevenue = async (req, res) => {
  try {
    const result = await Payment.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: null, totalRevenue: { $sum: "$amountPaid" } } }
    ]);

    res.json({ totalRevenue: result[0]?.totalRevenue || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Revenue by Payment Method
export const getRevenueByPaymentMethod = async (req, res) => {
  try {
    const result = await Payment.aggregate([
      { $match: { status: 'Completed' } },
      {
        $group: {
          _id: "$method",
          total: { $sum: "$amountPaid" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Invoice Status Summary
export const getInvoiceStatusSummary = async (req, res) => {
  try {
    const result = await Invoice.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" }
        }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Revenue Trends (Daily, Weekly, Monthly)
export const getRevenueTrends = async (req, res) => {
  try {
    const result = await Payment.aggregate([
      {
        $match: { status: 'Completed' }
      },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
            day: { $dayOfMonth: "$paidAt" }
          },
          dailyRevenue: { $sum: "$amountPaid" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
