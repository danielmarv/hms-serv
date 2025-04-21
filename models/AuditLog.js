import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: String,
    entity: String,
    entityId: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    old_data: mongoose.Schema.Types.Mixed,
    new_data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  });
  
  export default mongoose.model('AuditLog', auditLogSchema);
  