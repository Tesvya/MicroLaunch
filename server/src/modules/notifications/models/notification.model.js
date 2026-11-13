import mongoose from 'mongoose'
const notificationSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, notificationType: { type: String, enum: ['RECOMMENDATION','APPLICATION','PAYMENT','SYSTEM'], required: true }, title: { type: String, required: true }, message: { type: String, required: true }, isRead: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } })
notificationSchema.index({ userId: 1, createdAt: -1 })
export default mongoose.model('Notification', notificationSchema)
