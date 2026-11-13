const V = { primary: 'bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-faint', accent: 'bg-amber-500 text-ink-900 hover:bg-amber-400 disabled:bg-amber-100 disabled:text-ink-faint', ghost: 'bg-transparent text-ink-900 hover:bg-ink-900/5 disabled:text-ink-faint', danger: 'bg-danger-600 text-white hover:bg-danger-600/90 disabled:bg-danger-100 disabled:text-ink-faint' }
const S = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
export const Button = ({ children, variant = 'primary', size = 'md', className = '', type = 'button', isLoading = false, disabled = false, ...props }) => (
    <button type={type} disabled={disabled || isLoading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed ${V[variant]} ${S[size]} ${className}`} {...props}>
        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
    </button>
)
