import express from 'express';
import { addMenuItem, getMenu } from '../controllers/menuController.js';

const router = express.Router();

router.post('/', addMenuItem);
router.get('/', getMenu);

export default router;
