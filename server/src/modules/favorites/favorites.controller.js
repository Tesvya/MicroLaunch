import mongoose from 'mongoose'
import Favorite from './models/favorite.model.js'
import SideHustle from '../sidehustles/models/side-hustle.model.js'
import RecommendationLog from '../recommendations/models/recommendation-log.model.js'
import { withFilledCounts } from '../applications/filledCounts.js'

export const listFavorites = async (req, res) => {
    try {
        const rows = (await Favorite.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate('sideHustleId').lean()).filter((r) => r.sideHustleId)
        const listings = await withFilledCounts(rows.map((r) => r.sideHustleId))
        return res.status(200).json({ properties: { favorites: rows.map((r, i) => ({ _id: r._id, favoritedAt: r.createdAt, sideHustle: listings[i] })) } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const addFavorite = async (req, res) => {
    try {
        const { sideHustleId } = req.params
        if (!mongoose.isValidObjectId(sideHustleId)) return res.status(400).json({ message: 'Invalid side-hustle id' })
        const listing = await SideHustle.findById(sideHustleId).select('status')
        if (!listing || listing.status !== 'ACTIVE') return res.status(404).json({ message: 'Side-hustle listing not found or no longer active' })
        await Favorite.updateOne({ userId: req.user._id, sideHustleId }, { $setOnInsert: { userId: req.user._id, sideHustleId, createdAt: new Date() } }, { upsert: true }) // idempotent
        // keep the recommendation feedback loop (engagement reports, future retraining) fed; best-effort
        RecommendationLog.findOneAndUpdate({ userId: req.user._id, sideHustleId }, { $set: { userResponse: 'SAVED' } }, { sort: { createdAt: -1 } }).catch(() => {})
        return res.status(201).json({ message: 'Added to favorites', properties: { favorited: true } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const removeFavorite = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.sideHustleId)) return res.status(400).json({ message: 'Invalid side-hustle id' })
        await Favorite.deleteOne({ userId: req.user._id, sideHustleId: req.params.sideHustleId })
        return res.status(200).json({ message: 'Removed from favorites', properties: { favorited: false } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
