// controllers/room.controller.js
import Room from '../models/Room.js';

export const createRoom = async (req, res) => {
  try {
    const room = await Room.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate('room_type');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('room_type');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchAvailableRooms = async (req, res) => {
    const { startDate, endDate, roomType, floor, smoking, accessible } = req.query;
  
    try {
      const bookedRoomIds = await Booking.find({
        $or: [
          {
            check_in: { $lte: endDate },
            check_out: { $gte: startDate }
          }
        ]
      }).distinct('room');
  
      const filters = {
        _id: { $nin: bookedRoomIds },
        status: 'available'
      };
  
      if (roomType) filters.room_type = roomType;
      if (floor) filters.floor = floor;
      if (smoking) filters.is_smoking_allowed = smoking === 'true';
      if (accessible) filters.is_accessible = accessible === 'true';
  
      const availableRooms = await Room.find(filters).populate('room_type');
  
      res.status(200).json({ rooms: availableRooms });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching availability', error: err.message });
    }
  };