import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true, // improves search performance
    trim: true,
    lowercase: true
  },
  description: { type: String, trim: true }
}, { timestamps: true });

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
