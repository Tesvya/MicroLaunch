import mongoose from 'mongoose'
const fileSchema = new mongoose.Schema({
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'PwdFile', required: true },
    originalName: { type: String, required: true }, mimeType: { type: String, required: true }, size: { type: Number, required: true }
}, { _id: false })
// One record per user. A rejected user resubmits into the same record.
const s = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    files: { type: [fileSchema], default: [] },
    rejectionReason: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
})
export default mongoose.model('PwdVerification', s)
