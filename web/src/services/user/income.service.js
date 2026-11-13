import { apiInstance } from '../../api/_base_.js'
export const getDashboardSummary = async () => apiInstance.get('income/summary')
export const listMyIncomeEntries = async () => apiInstance.get('income/entries')
export const createIncomeEntry = async (data) => apiInstance.post('income/entries', data)
export const updateIncomeEntry = async (id, data) => apiInstance.put(`income/entries/${id}`, data)
export const deleteIncomeEntry = async (id) => apiInstance.delete(`income/entries/${id}`)
