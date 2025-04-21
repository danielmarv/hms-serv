import Room from '../models/Room.js';
import CustomPrice from '../models/CustomPrice.js';

export const getDynamicRoomPrice = async (roomId, targetDate, options = {}) => {
  const date = new Date(targetDate);
  const room = await Room.findById(roomId).populate('room_type');

  const basePrice = room.price_override || room.room_type.base_price;

  const customPrice = await CustomPrice.findOne({
    roomType: room.room_type._id,
    startDate: { $lte: date },
    endDate: { $gte: date },
    isActive: true,
    ...(options.condition && { condition: options.condition })
  }).sort({ startDate: -1 }); // Prioritize newer entries

  return customPrice?.price || basePrice;
};
