import { apiInstance } from '../../api/_base_.js'
export const createRating = async (data) => apiInstance.post('ratings', data)
export const listMyRatings = async () => apiInstance.get('ratings/me')
export const getSideHustleRatingsSummary = async (id) => apiInstance.get(`ratings/side-hustle/${id}/summary`)
