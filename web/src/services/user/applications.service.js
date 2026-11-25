import { apiInstance } from '../../api/_base_.js'
// `data` is a FormData (message + files) from the apply form; a plain object also works (no files).
export const applyToSideHustle = async (data) => apiInstance.post('applications', data)
export const listMyApplications = async () => apiInstance.get('applications/me')
export const cancelApplication = async (id) => apiInstance.patch(`applications/${id}/cancel`)
export const listAllApplicationsAdmin = async (status = '') => apiInstance.get('applications/admin/all', { params: status ? { status } : {} })
export const updateApplicationStatus = async (id, applicationStatus, decisionMessage) => apiInstance.patch(`applications/${id}/status`, { applicationStatus, ...(decisionMessage ? { decisionMessage } : {}) })
export const downloadAttachment = async (fileId) => apiInstance.get(`applications/files/${fileId}`, { responseType: 'blob' })
