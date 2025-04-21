import express from 'express';
import {
  createItem, getItems, updateItem, disableItem,
  createTransaction, getLowStockItems
} from '../controllers/inventoryController.js';
// import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

// router.use(isAuthenticated);
router.post('/items', createItem);
router.get('/items', getItems);
router.put('/items/:id', updateItem);
router.patch('/items/:id/disable', disableItem);

router.post('/transactions', createTransaction);
router.get('/low-stock', getLowStockItems);

export default router;
