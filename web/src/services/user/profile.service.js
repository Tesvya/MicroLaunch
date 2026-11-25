import { apiInstance } from '../../api/_base_.js'
export const getMyProfile = async () => apiInstance.get('profile/me')
export const submitPwdProof = async (formData) => apiInstance.post('profile/pwd-verification', formData)
export const downloadPwdFile = async (fileId) => apiInstance.get(`profile/pwd-verification/files/${fileId}`, { responseType: 'blob' })
export const saveMyProfile = async (data) => apiInstance.put('profile/me', data)
