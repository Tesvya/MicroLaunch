export const Field = ({ label, error, children, hint }) => (
    <label className="block">
        {label ? <span className="mb-1.5 block text-sm font-medium text-ink-900">{label}</span> : null}
        {children}
        {hint && !error ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
        {error ? <span className="mt-1 block text-xs text-danger-600">{error}</span> : null}
    </label>
)
export const Input = ({ className = '', error, ...props }) => (
    <input className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-faint focus:border-ink-900 ${error ? 'border-danger-600' : 'border-ink-faint/40'} ${className}`} {...props} />
)
export const Textarea = ({ className = '', error, rows = 4, ...props }) => (
    <textarea rows={rows} className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-faint focus:border-ink-900 ${error ? 'border-danger-600' : 'border-ink-faint/40'} ${className}`} {...props} />
)
export const Select = ({ className = '', error, children, ...props }) => (
    <select className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors focus:border-ink-900 ${error ? 'border-danger-600' : 'border-ink-faint/40'} ${className}`} {...props}>{children}</select>
)
