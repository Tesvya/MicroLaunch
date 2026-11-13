import UserProfile from './models/user-profile.model.js'
import User from '../auth/models/user.model.js'
export const getMyProfile = async (req, res) => {
    try { const profile = await UserProfile.findOne({ userId: req.user._id }); return res.status(200).json({ properties: { profile: profile || null } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
export const upsertMyProfile = async (req, res) => {
    try {
        const payload = req.validatedData.body
        const normalized = { ...payload, skills: payload.skills?.map((s)=>s.trim().toLowerCase()).filter(Boolean), interests: payload.interests?.map((s)=>s.trim().toLowerCase()).filter(Boolean), updatedAt: new Date() }
        const profile = await UserProfile.findOneAndUpdate({ userId: req.user._id }, { $set: normalized, $setOnInsert: { userId: req.user._id } }, { new: true, upsert: true })
        await User.updateOne({ _id: req.user._id }, { $set: { hasCompletedProfile: true, updatedAt: new Date() } })
        return res.status(200).json({ message: 'Profile saved successfully', properties: { profile } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
