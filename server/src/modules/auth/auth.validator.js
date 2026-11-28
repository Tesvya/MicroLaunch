import { z } from 'zod'
export const registerSchema = z.object({ body: z.object({ name: z.string().min(1,'Name is required'), email: z.string().email('Invalid email'), password: z.string().min(8,'Password must be at least 8 characters'), confirmPassword: z.string().min(1,'Confirm password is required') }).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] }) })
export const loginSchema = z.object({ body: z.object({ email: z.string().email('Invalid email'), password: z.string().min(1,'Password is required') }) })
export const verifyEmailSchema = z.object({ body: z.object({ token: z.string().min(10, 'Verification token is required') }) })
const passwordRule = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long')
export const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email('Invalid email') }) })
export const resetPasswordSchema = z.object({ body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid'), password: passwordRule, confirmPassword: z.string().min(1, 'Confirm password is required') }).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] }) })
export const resendVerificationSchema = z.object({ body: z.object({ email: z.string().email('Invalid email') }) })
