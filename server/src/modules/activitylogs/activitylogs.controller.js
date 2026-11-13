import ActivityLog from './models/activity-log.model.js'
export const logActivity = async ({ adminId, activity, module = 'SYSTEM' }) => { try { await ActivityLog.create({ adminId, activity, module }) } catch (error) { console.error('[ActivityLogs] Failed:', error.message) } }
export const getActivityLogs = async (req, res) => {
    try { const { module } = req.query; const logs = await ActivityLog.find(module ? { module } : {}).populate('adminId','name email').sort({ activityDate: -1 }).limit(100); return res.status(200).json({ properties: { logs } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
