import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';

export const checkInGuest = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'Booked') return res.status(400).json({ message: 'Booking is not in a check-in state' });

    // Update booking and room
    booking.status = 'CheckedIn';
    booking.room.status = 'Occupied';

    await booking.save();
    await booking.room.save();

    res.status(200).json({ message: 'Guest checked in successfully', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkOutGuest = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'CheckedIn') return res.status(400).json({ message: 'Guest is not currently checked in' });

    // Update booking and room
    booking.status = 'CheckedOut';
    booking.room.status = 'Available';

    await booking.save();
    await booking.room.save();

    res.status(200).json({ message: 'Guest checked out successfully', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCurrentOccupancy = async (req, res) => {
  try {
    const occupiedRooms = await Booking.find({ status: 'CheckedIn' })
      .populate('guest')
      .populate('room');
    res.status(200).json(occupiedRooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
