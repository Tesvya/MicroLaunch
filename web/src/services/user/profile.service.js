import { apiInstance } from '../../api/_base_.js'
export const getMyProfile = async () => apiInstance.get('profile/me')
export const saveMyProfile = async (data) => apiInstance.put('profile/me', data)
