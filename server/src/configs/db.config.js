import { setServers } from 'node:dns/promises'
import mongoose from 'mongoose'

setServers(['1.1.1.1', '8.8.8.8'])

export const dbConnection = async () => {
    try { await mongoose.connect(process.env.DATABASE_URL); console.log('Database connected') }
    catch (error) { console.error('Database failed to connect:', error.message) }
}