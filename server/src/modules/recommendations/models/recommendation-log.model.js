import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, sideHustleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SideHustle', required: true }, score: { type: Number, required: true }, breakdown: { type: Object, default: {} }, userResponse: { type: String, enum: ['SHOWN','SAVED','STARTED','DISMISSED'], default: 'SHOWN' }, createdAt: { type: Date, default: Date.now } })
schema.index({ userId: 1, sideHustleId: 1 })
export default mongoose.model('RecommendationLog', schema)
