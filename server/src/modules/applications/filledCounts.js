import mongoose from 'mongoose'
import Application from './models/application.model.js'
// How many openings of each listing are already taken (approved or completed applications).
export const filledCountMap = async (listingIds) => {
    const ids = [...new Set(listingIds.map(String))].filter((i) => mongoose.isValidObjectId(i)).map((i) => new mongoose.Types.ObjectId(i))
    if (!ids.length) return new Map()
    const rows = await Application.aggregate([{ $match: { sideHustleId: { $in: ids }, applicationStatus: { $in: ['APPROVED', 'COMPLETED'] } } }, { $group: { _id: '$sideHustleId', n: { $sum: 1 } } }])
    return new Map(rows.map((r) => [String(r._id), r.n]))
}
/** Adds `approvedCount` to plain (lean) listing objects. */
export const withFilledCounts = async (listings) => {
    const map = await filledCountMap(listings.map((l) => l._id))
    return listings.map((l) => ({ ...l, approvedCount: map.get(String(l._id)) || 0 }))
}
