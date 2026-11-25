import express from 'express'
import { listFavorites, addFavorite, removeFavorite } from './favorites.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r = express.Router()
r.get('/', guard(['USER']), listFavorites)
r.post('/:sideHustleId', guard(['USER']), addFavorite)
r.delete('/:sideHustleId', guard(['USER']), removeFavorite)
export default r
