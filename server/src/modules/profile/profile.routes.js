import express from 'express'
import { getMyProfile, upsertMyProfile } from './profile.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { upsertProfileSchema } from './profile.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
const profileRoutes = express.Router()
profileRoutes.get('/me', guard(['USER']), getMyProfile)
profileRoutes.put('/me', guard(['USER']), validateRequest(upsertProfileSchema), upsertMyProfile)
export default profileRoutes
