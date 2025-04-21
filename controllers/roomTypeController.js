// controllers/roomType.controller.js
import RoomType from '../models/RoomType.js';

export const createRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(roomType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRoomTypes = async (req, res) => {
  try {
    const roomTypes = await RoomType.find();
    res.json(roomTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomTypeById = async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    res.json(roomType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    res.json(roomType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findByIdAndDelete(req.params.id);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    res.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
