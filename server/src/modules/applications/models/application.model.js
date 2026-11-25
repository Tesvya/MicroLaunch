import mongoose from 'mongoose'
const attachmentSchema = new mongoose.Schema({
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationFile', required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
}, { _id: false })
const s = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sideHustleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SideHustle', required: true },
    recommendationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecommendationLog', default: null },
    coverNote: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    applicationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    // Admin's message to the applicant: the REASON when rejected (required), optional next steps when approved.
    decisionMessage: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    applicationDate: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: null }
})
s.index({ userId: 1, sideHustleId: 1 }, { unique: true })
export default mongoose.model('Application', s)
