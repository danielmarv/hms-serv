import express from 'express';
import {
  createCustomPrice,
  getCustomPrices,
  deleteCustomPrice
} from '../controllers/customPriceController.js';

const router = express.Router();

router.post('/', createCustomPrice);
router.get('/', getCustomPrices);
router.delete('/:id', deleteCustomPrice);

export default router;
