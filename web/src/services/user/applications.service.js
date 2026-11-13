import { apiInstance } from '../../api/_base_.js'
export const applyToSideHustle = async (data) => apiInstance.post('applications', data)
export const listMyApplications = async () => apiInstance.get('applications/me')
export const cancelApplication = async (id) => apiInstance.patch(`applications/${id}/cancel`)
export const listAllApplicationsAdmin = async (status = '') => apiInstance.get('applications/admin/all', { params: status ? { status } : {} })
export const updateApplicationStatus = async (id, applicationStatus) => apiInstance.patch(`applications/${id}/status`, { applicationStatus })
