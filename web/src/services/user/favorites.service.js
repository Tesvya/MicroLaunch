import { apiInstance } from '../../api/_base_.js'
export const listFavorites = async () => apiInstance.get('favorites')
export const addFavorite = async (sideHustleId) => apiInstance.post(`favorites/${sideHustleId}`)
export const removeFavorite = async (sideHustleId) => apiInstance.delete(`favorites/${sideHustleId}`)
