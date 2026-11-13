import { apiInstance } from '../../api/_base_.js'
export const initiateMockPayment = async (data) => apiInstance.post('payments/initiate', data)
export const listMyTransactions = async () => apiInstance.get('payments/me')
export const verifyTransaction = async (id) => apiInstance.post(`payments/${id}/verify`)
