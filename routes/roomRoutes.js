import express from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} from '../controllers/room.controller.js';

const router = express.Router();

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
