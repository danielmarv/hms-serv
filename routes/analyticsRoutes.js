import express from 'express';
import {
  getTotalRevenue,
  getRevenueByPaymentMethod,
  getInvoiceStatusSummary,
  getRevenueTrends
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/total-revenue', getTotalRevenue);
router.get('/revenue-by-method', getRevenueByPaymentMethod);
router.get('/invoice-status-summary', getInvoiceStatusSummary);
router.get('/revenue-trends', getRevenueTrends);

export default router;
