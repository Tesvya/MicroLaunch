import { apiInstance } from '../../api/_base_.js'
export const registerUser = async (data) => apiInstance.post('auth/register', data)
export const loginUser = async (data) => apiInstance.post('auth/login', data)
export const logoutUser = async () => apiInstance.post('auth/logout')
export const checkUser = async () => apiInstance.get('auth/check-user')
export const verifyEmail = async (token) => apiInstance.post('auth/verify-email', { token })
export const forgotPassword = async (email) => apiInstance.post('auth/forgot-password', { email })
export const resetPassword = async (data) => apiInstance.post('auth/reset-password', data)
export const resendVerification = async (email) => apiInstance.post('auth/resend-verification', { email })
