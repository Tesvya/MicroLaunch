import { apiInstance } from '../../api/_base_.js'
export const getMyRecommendations = async (params = {}) => apiInstance.get('recommendations/me', { params })
export const respondToRecommendation = async (sideHustleId, response) => apiInstance.post(`recommendations/${sideHustleId}/respond`, { response })
