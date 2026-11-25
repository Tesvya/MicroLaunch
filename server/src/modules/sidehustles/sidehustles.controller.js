import SideHustle from './models/side-hustle.model.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
import { withFilledCounts } from '../applications/filledCounts.js'
const norm = (arr) => (arr||[]).map((s)=>String(s).trim().toLowerCase()).filter(Boolean)
export const createSideHustle = async (req, res) => {
    try { const p = req.validatedData.body; const s = await SideHustle.create({ ...p, requiredSkills: norm(p.requiredSkills), category: norm(p.category), postedByAdminId: req.user._id }); await logActivity({ adminId: req.user._id, activity: `Created listing: "${s.title}"`, module: 'LISTINGS' }); return res.status(201).json({ message: 'Side-hustle listing created', properties: { sideHustle: s } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
export const updateSideHustle = async (req, res) => {
    try { const { id } = req.params; const p = req.validatedData.body; const upd = { ...p, updatedAt: new Date() }; if (p.requiredSkills) upd.requiredSkills = norm(p.requiredSkills); if (p.category) upd.category = norm(p.category); const s = await SideHustle.findByIdAndUpdate(id, { $set: upd }, { new: true }); if (!s) return res.status(404).json({ message: 'Not found' }); await logActivity({ adminId: req.user._id, activity: `Updated listing: "${s.title}"`, module: 'LISTINGS' }); return res.status(200).json({ message: 'Updated', properties: { sideHustle: s } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
export const deleteSideHustle = async (req, res) => {
    try { const s = await SideHustle.findByIdAndDelete(req.params.id); if (!s) return res.status(404).json({ message: 'Not found' }); await logActivity({ adminId: req.user._id, activity: `Deleted listing: "${s.title}"`, module: 'LISTINGS' }); return res.status(200).json({ message: 'Deleted' }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
export const listSideHustlesAdmin = async (_req, res) => { try { return res.status(200).json({ properties: { sideHustles: await withFilledCounts(await SideHustle.find().sort({ createdAt: -1 }).lean()) } }) } catch (error) { return res.status(500).json({ message: error.message }) } }
export const listActiveSideHustles = async (req, res) => {
    try { const { category, search } = req.query; const filter = { status: 'ACTIVE' }; if (category) filter.category = String(category).toLowerCase(); if (search) filter.title = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }; return res.status(200).json({ properties: { sideHustles: await withFilledCounts(await SideHustle.find(filter).sort({ createdAt: -1 }).lean()) } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
export const getSideHustleById = async (req, res) => { try { const s = await SideHustle.findById(req.params.id).lean(); if (!s) return res.status(404).json({ message: 'Not found' }); return res.status(200).json({ properties: { sideHustle: (await withFilledCounts([s]))[0] } }) } catch (error) { return res.status(500).json({ message: error.message }) } }
