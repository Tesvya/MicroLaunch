export const validateRequest = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse({ body: req.body, query: req.query, params: req.params })
        if (!result.success) return res.status(400).json({ message: result.error.issues?.[0]?.message || 'Invalid request' })
        req.validatedData = result.data
        return next()
    } catch (error) { res.status(400).json({ message: error.message }) }
}
