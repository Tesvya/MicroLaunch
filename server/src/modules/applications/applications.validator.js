import { z } from 'zod'
export const createApplicationSchema=z.object({body:z.object({sideHustleId:z.string().min(1,'Side-hustle is required'),recommendationId:z.string().optional(),coverNote:z.string().max(500).optional()})})
export const updateApplicationStatusSchema=z.object({body:z.object({applicationStatus:z.enum(['APPROVED','REJECTED','COMPLETED','CANCELLED'])})})
