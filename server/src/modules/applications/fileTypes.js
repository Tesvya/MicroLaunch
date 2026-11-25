const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b)

/** Identifies a file by its CONTENT (magic bytes), never by the name or type the browser claims. Returns null if not allowed. */
export const detectFileType = (buffer, originalName = '') => {
    if (!buffer || buffer.length < 8) return null
    if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mimeType: 'application/pdf' }
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: 'image/png' }
    if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg' }
    // .docx is a zip; require Word's main part so arbitrary zips/apks/jars are refused
    if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) && buffer.includes('word/document.xml')) return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && /\.doc$/i.test(originalName)) return { mimeType: 'application/msword' }
    return null
}

/** Safe display name: no paths, no control/markup characters, UTF-8 repaired (multer may hand us latin1-mangled names). */
export const cleanFileName = (raw = 'file') => {
    let name = String(raw)
    if ([...name].every((c) => c.charCodeAt(0) <= 0xff)) {
        const decoded = Buffer.from(name, 'latin1').toString('utf8')
        if (!decoded.includes('\uFFFD')) name = decoded
    }
    name = name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '').trim() || 'file'
    return name.length > 120 ? name.slice(-120) : name
}
