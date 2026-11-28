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
    // Password reset: same approach as verification (hash only, single use, expires). sessionVersion ends older sessions.
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    passwordResetSentAt: { type: Date, default: null, select: false },
    passwordChangedAt: { type: Date, default: null, select: false },
    sessionVersion: { type: Number, default: 0, select: false }, // copied into each login token; raising it logs out every existing session
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: null }
})
export default mongoose.model('User', userSchema)
