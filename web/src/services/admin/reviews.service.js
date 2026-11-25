import { apiInstance } from '../../api/_base_.js'
export const listPayouts = async (status = '') => apiInstance.get('payments/admin/all', { params: status ? { status } : {} })
export const approvePayout = async (id) => apiInstance.post(`payments/${id}/approve`, { jobConfirmed: true })
export const rejectPayout = async (id, reason) => apiInstance.post(`payments/${id}/reject`, { reason })
export const checkPayout = async (id) => apiInstance.post(`payments/${id}/verify`)
export const listPwdVerifications = async (status = '') => apiInstance.get('profile/pwd-verification/admin/all', { params: status ? { status } : {} })
export const decidePwdVerification = async (id, decision, reason) => apiInstance.patch(`profile/pwd-verification/${id}/decision`, { decision, reason })
