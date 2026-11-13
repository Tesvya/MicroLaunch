import { apiInstance } from '../../api/_base_.js'
export const generateReport = async (data) => apiInstance.post('reports/generate', data)
export const listReports = async () => apiInstance.get('reports')
export const getActivityLogs = async (module = '') => apiInstance.get('activity-logs', { params: module ? { module } : {} })
