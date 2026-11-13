export const Card = ({ children, className = '' }) => (
    <div className={`rounded-2xl border border-ink-faint/15 bg-surface p-6 shadow-sm ${className}`}>{children}</div>
)
const BADGE_TONES = { neutral: 'bg-ink-900/5 text-ink-900', amber: 'bg-amber-100 text-amber-500', success: 'bg-success-100 text-success-600', danger: 'bg-danger-100 text-danger-600' }
export const Badge = ({ children, tone = 'neutral', className = '' }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_TONES[tone]} ${className}`}>{children}</span>
)
