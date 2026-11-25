import mongoose from 'mongoose'
// File contents live in MongoDB (not on disk) because most hosts, including Render's free plan, wipe the disk on every deploy.
// Kept in their own collection so listing applications never loads file bytes.
const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now }
})
schema.index({ applicationId: 1 })
export default mongoose.model('ApplicationFile', schema)
