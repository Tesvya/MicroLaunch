import mongoose from 'mongoose'
const activityLogSchema = new mongoose.Schema({ adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, activity: { type: String, required: true }, module: { type: String, enum: ['USER_MANAGEMENT','LISTINGS','APPLICATIONS','RECOMMENDATIONS','REPORTS','TRANSACTIONS','FEEDBACK','SYSTEM'], default: 'SYSTEM' }, activityDate: { type: Date, default: Date.now } })
activityLogSchema.index({ adminId: 1, activityDate: -1 })
export default mongoose.model('ActivityLog', activityLogSchema)
