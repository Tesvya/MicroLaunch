import express from 'express'
import { register, login, logout, checkUser, verifyEmail, resendVerification, forgotPassword, resetPassword } from './auth.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
const authRoutes = express.Router()
authRoutes.post('/register', validateRequest(registerSchema), register)
authRoutes.post('/login', validateRequest(loginSchema), login)
authRoutes.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail)
authRoutes.post('/resend-verification', validateRequest(resendVerificationSchema), resendVerification)
authRoutes.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword)
authRoutes.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword)
authRoutes.post('/logout', guard(['USER','ADMIN']), logout)
authRoutes.get('/check-user', guard(['USER','ADMIN']), checkUser)
export default authRoutes
