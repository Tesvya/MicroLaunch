import { apiInstance } from '../../api/_base_.js'
export const getPlatformOverview = async () => apiInstance.get('admin/overview')
export const listUsers = async () => apiInstance.get('admin/users')
export const setUserActiveStatus = async (id, isActive) => apiInstance.patch(`admin/users/${id}/status`, { isActive })
export const listSideHustlesAdmin = async () => apiInstance.get('side-hustles/admin/all')
export const createSideHustle = async (data) => apiInstance.post('side-hustles', data)
export const updateSideHustle = async (id, data) => apiInstance.put(`side-hustles/${id}`, data)
export const deleteSideHustle = async (id) => apiInstance.delete(`side-hustles/${id}`)
export const verifyUserEmail = async (id) => apiInstance.patch(`admin/users/${id}/verify-email`)
