import express from 'express'
import { createRating,listMyRatings,getSideHustleRatingsSummary } from './ratings.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.post('/',guard(['USER']),createRating)
r.get('/me',guard(['USER']),listMyRatings)
r.get('/side-hustle/:sideHustleId/summary',guard(['USER','ADMIN']),getSideHustleRatingsSummary)
export default r
