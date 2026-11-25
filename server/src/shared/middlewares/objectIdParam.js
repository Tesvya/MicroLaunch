import mongoose from 'mongoose'
/** router.param(name, objectIdParam): malformed IDs become a clean 404 instead of a database cast error. */
export const objectIdParam = (_req, res, next, value) => (mongoose.isValidObjectId(value) ? next() : res.status(404).json({ message: 'Not found' }))
