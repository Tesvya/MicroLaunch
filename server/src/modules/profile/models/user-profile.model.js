import mongoose from 'mongoose'
const userProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, default: '' }, skills: { type: [String], default: [] }, interests: { type: [String], default: [] },
    qualifications: { type: String, default: '' },
    experienceLevel: { type: String, enum: ['NONE','BEGINNER','INTERMEDIATE','EXPERIENCED'], default: 'NONE' },
    weeklyAvailabilityHours: { type: Number, default: 0, min: 0, max: 168 },
    availableDays: { type: [String], enum: ['MON','TUE','WED','THU','FRI','SAT','SUN'], default: [] },
    preferredWorkMode: { type: String, enum: ['REMOTE','ONSITE','HYBRID','ANY'], default: 'ANY' },
    userGroup: { type: String, enum: ['STUDENT','FREELANCER','UNEMPLOYED','PART_TIME_WORKER','SENIOR_CITIZEN','PWD','OTHER'], default: 'OTHER' },
    monthlyIncomeGoal: { type: Number, default: 0, min: 0 }, savingsGoal: { type: Number, default: 0, min: 0 },
    location: { type: String, default: '' }, createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: null }
})
export default mongoose.model('UserProfile', userProfileSchema)
