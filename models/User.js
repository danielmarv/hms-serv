import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: String,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dob: Date,

  // Role + permissions
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  custom_permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],

  // Extended attributes
  national_id: String,
  address: {
    street: String,
    city: String,
    country: String,
    zip: String
  },
  department: {
    type: String,
    trim: true
  },
  job_title: {
    type: String,
    trim: true
  },
  branch: {
    type: String, // or ObjectId to HotelBranch if multitenant
    trim: true
  },

  // Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  last_login: Date,
  login_attempts: {
    type: Number,
    default: 0
  },
  is_email_verified: {
    type: Boolean,
    default: false
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Hash password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Compute effective permissions
userSchema.methods.getEffectivePermissions = async function () {
  await this.populate('role').populate('role.permissions').populate('custom_permissions');
  const rolePerms = this.role?.permissions?.map(p => p.key) || [];
  const userPerms = this.custom_permissions.map(p => p.key);
  return Array.from(new Set([...rolePerms, ...userPerms]));
};

const User = mongoose.model('User', userSchema);
export default User;
