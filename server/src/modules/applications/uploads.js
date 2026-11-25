import multer from 'multer'
export const MAX_FILES = 3
export const MAX_FILE_MB = Number(process.env.UPLOAD_MAX_MB || 3)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES, fields: 10, fieldSize: 20 * 1024 } })

/** Parses multipart uploads (field name "files"). Plain JSON requests pass straight through untouched. */
export const parseAttachments = (req, res, next) => upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: `Each file must be ${MAX_FILE_MB} MB or smaller.` })
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: `You can attach up to ${MAX_FILES} files.` })
    console.error('[Upload]', err.message)
    return res.status(400).json({ message: 'The upload could not be read. Please try again.' })
})
