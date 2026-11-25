import mongoose from 'mongoose'
const s = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sideHustleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SideHustle', required: true },
    createdAt: { type: Date, default: Date.now }
})
s.index({ userId: 1, sideHustleId: 1 }, { unique: true })
export default mongoose.model('Favorite', s)
