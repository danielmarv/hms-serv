import express from 'express';
import {
  createKitchenOrder,
  getAllKitchenOrders,
  updateItemStatus
} from '../controllers/kitchenController.js';

const router = express.Router();

router.post('/', createKitchenOrder); // Create new kitchen order
router.get('/', getAllKitchenOrders); // Get all kitchen orders
router.patch('/item-status', updateItemStatus); // Update single item status

export default router;
