import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: null },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    isActive: { type: Boolean, default: true },
    hasCompletedProfile: { type: Boolean, default: false },
    // Default is TRUE on purpose: accounts created before email verification existed (and the seeded admin)
    // stay verified. Self-registration explicitly sets this to false.
    isEmailVerified: { type: Boolean, default: true },
    // Only a SHA-256 hash of the emailed token is stored; select:false keeps it out of admin user lists.
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null, select: false },
    emailVerificationSentAt: { type: Date, default: null, select: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: null }
})
export default mongoose.model('User', userSchema)
