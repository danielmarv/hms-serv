import CustomPrice from '../models/CustomPrice.js';

export const createCustomPrice = async (req, res) => {
  try {
    const customPrice = new CustomPrice(req.body);
    await customPrice.save();
    res.status(201).json(customPrice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCustomPrices = async (req, res) => {
  try {
    const prices = await CustomPrice.find().populate('roomType');
    res.status(200).json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCustomPrice = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomPrice.findByIdAndDelete(id);
    res.status(200).json({ message: 'Custom price removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Used internally to get active price for a room type + date
export const getActiveCustomPrice = async (roomTypeId, targetDate) => {
  const date = new Date(targetDate);

  return await CustomPrice.findOne({
    roomType: roomTypeId,
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  });
};
