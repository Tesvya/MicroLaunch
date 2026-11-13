import express from 'express'
import { getMyRecommendations, respondToRecommendation } from './recommendations.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r = express.Router()
r.get('/me', guard(['USER']), getMyRecommendations)
r.post('/:sideHustleId/respond', guard(['USER']), respondToRecommendation)
export default r
