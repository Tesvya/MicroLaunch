import mongoose from 'mongoose'
const sideHustleSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true }, description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] }, category: { type: [String], default: [] },
    experienceLevelRequired: { type: String, enum: ['NONE','BEGINNER','INTERMEDIATE','EXPERIENCED'], default: 'NONE' },
    estimatedWeeklyHours: { type: Number, default: 0, min: 0 },
    workMode: { type: String, enum: ['REMOTE','ONSITE','HYBRID'], default: 'REMOTE' },
    requiredDays: { type: [String], enum: ['MON','TUE','WED','THU','FRI','SAT','SUN'], default: [] },
    location: { type: String, default: '' }, payType: { type: String, enum: ['HOURLY','PER_TASK','FIXED','COMMISSION'], default: 'PER_TASK' },
    payAmountMin: { type: Number, default: 0, min: 0 }, payAmountMax: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE','CLOSED','DRAFT'], default: 'ACTIVE' },
    suitableFor: { type: [String], enum: ['STUDENT','FREELANCER','UNEMPLOYED','PART_TIME_WORKER','SENIOR_CITIZEN','PWD','OTHER'], default: [] },
    postedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: null }
})
sideHustleSchema.index({ requiredSkills: 1 }); sideHustleSchema.index({ category: 1 }); sideHustleSchema.index({ status: 1 })
export default mongoose.model('SideHustle', sideHustleSchema)
