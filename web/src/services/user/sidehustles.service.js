import { apiInstance } from '../../api/_base_.js'
export const listActiveSideHustles = async (params = {}) => apiInstance.get('side-hustles', { params })
export const getSideHustleById = async (id) => apiInstance.get(`side-hustles/${id}`)
