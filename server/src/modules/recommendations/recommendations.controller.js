import SideHustle from '../sidehustles/models/side-hustle.model.js'
import UserProfile from '../profile/models/user-profile.model.js'
import RecommendationLog from './models/recommendation-log.model.js'
import { rankSideHustlesHybrid } from '../ml/hybridEngine.js'
import { getMetrics } from '../ml/modelLoader.js'
export const getMyRecommendations = async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user._id }).lean()
        if (!profile) return res.status(400).json({ message: 'Complete your profile first to get recommendations' })
        const listings = await SideHustle.find({ status: 'ACTIVE' }).lean()
        const ranked = rankSideHustlesHybrid(profile, listings, Number(req.query.minScore)||0)
        const top = ranked.slice(0, Number(req.query.limit)||20)
        if (top.length) RecommendationLog.insertMany(top.map((e)=>({ userId: req.user._id, sideHustleId: e.listing._id, score: e.score, breakdown: e.breakdown }))).catch(()=>{})
        const ml = getMetrics()
        return res.status(200).json({ properties: { recommendations: top.map((e)=>({ sideHustle: e.listing, score: e.score, breakdown: e.breakdown })), engineInfo: { mode: ml?'hybrid':'rule-based', mlModelTrained: !!ml, testAccuracy: ml?.testMetrics?.accuracy??null } } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
export const respondToRecommendation = async (req, res) => {
    try {
        const { response } = req.body
        if (!['SAVED','STARTED','DISMISSED'].includes(response)) return res.status(400).json({ message: 'Invalid response' })
        await RecommendationLog.findOneAndUpdate({ userId: req.user._id, sideHustleId: req.params.sideHustleId }, { $set: { userResponse: response } }, { sort: { createdAt: -1 } })
        return res.status(200).json({ message: 'Response recorded' })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
