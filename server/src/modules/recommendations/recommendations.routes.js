import express from 'express'
import { getMyRecommendations, respondToRecommendation } from './recommendations.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
import { objectIdParam } from '../../shared/middlewares/objectIdParam.js'
const r = express.Router()
r.param('sideHustleId', objectIdParam)
r.get('/me', guard(['USER']), getMyRecommendations)
r.post('/:sideHustleId/respond', guard(['USER']), respondToRecommendation)
export default r
