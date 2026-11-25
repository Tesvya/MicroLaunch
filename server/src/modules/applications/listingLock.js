import crypto from 'crypto'
import SideHustle from '../sidehustles/models/side-hustle.model.js'
const HOLD_MS = 15000 // a lock left behind by a crash expires by itself

/** Runs fn while holding a database lock on one listing, so "count the openings, then approve" cannot interleave. Returns null if busy. */
export const withListingLock = async (listingId, fn) => {
    const token = crypto.randomUUID()
    for (let i = 0; i < 30; i++) {
        const now = new Date()
        const got = await SideHustle.updateOne(
            { _id: listingId, $or: [{ 'approvalLock.until': null }, { 'approvalLock.until': { $lt: now } }] },
            { $set: { approvalLock: { token, until: new Date(now.getTime() + HOLD_MS) } } }
        )
        if (got.modifiedCount) {
            try { return await fn() }
            finally { await SideHustle.updateOne({ _id: listingId, 'approvalLock.token': token }, { $unset: { approvalLock: 1 } }) }
        }
        await new Promise((r) => setTimeout(r, 100))
    }
    return null
}
