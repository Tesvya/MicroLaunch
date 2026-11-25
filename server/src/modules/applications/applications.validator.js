import { z } from 'zod'
export const createApplicationSchema = z.object({ body: z.object({ sideHustleId: z.string().min(1, 'Side-hustle is required'), recommendationId: z.string().optional(), coverNote: z.string().max(1000, 'Your message must be 1000 characters or fewer').optional() }) })
export const updateApplicationStatusSchema = z.object({
    body: z.object({
        applicationStatus: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
        decisionMessage: z.string().trim().max(500, 'The message must be 500 characters or fewer').optional()
    }).superRefine((d, ctx) => {
        if (d.applicationStatus === 'REJECTED' && (d.decisionMessage || '').length < 10) {
            ctx.addIssue({ code: 'custom', path: ['decisionMessage'], message: 'Please give the applicant a reason for the rejection (at least 10 characters).' })
        }
    })
})
