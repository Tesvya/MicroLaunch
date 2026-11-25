import mongoose from 'mongoose'
// Proof files are sensitive: separate collection, only ever served to their owner and admins.
const s = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true }, mimeType: { type: String, required: true }, size: { type: Number, required: true },
    data: { type: Buffer, required: true }, createdAt: { type: Date, default: Date.now }
})
export default mongoose.model('PwdFile', s)
