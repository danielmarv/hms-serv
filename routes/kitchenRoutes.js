import express from 'express';
import { addKitchenOrder, updateKitchenItemStatus } from '../controllers/kitchenController.js';

const router = express.Router();

router.post('/', addKitchenOrder);
router.put('/:id', updateKitchenItemStatus);

export default router;
