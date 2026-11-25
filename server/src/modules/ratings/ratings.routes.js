import express from 'express'
import { createRating,listMyRatings,getSideHustleRatingsSummary } from './ratings.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
import { objectIdParam } from '../../shared/middlewares/objectIdParam.js'
const r=express.Router()
r.param('sideHustleId', objectIdParam)
r.post('/',guard(['USER']),createRating)
r.get('/me',guard(['USER']),listMyRatings)
r.get('/side-hustle/:sideHustleId/summary',guard(['USER','ADMIN']),getSideHustleRatingsSummary)
export default r
