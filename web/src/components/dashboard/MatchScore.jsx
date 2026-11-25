const AXIS_LABELS = { skills: 'Skills', interests: 'Interests', availability: 'Availability', experience: 'Experience', workMode: 'Work mode', mlComponent: 'ML Confidence' }
const scoreTone = (s) => s >= 75 ? 'text-success-600' : s >= 45 ? 'text-amber-500' : 'text-ink-muted'
export const MatchScoreRing = ({ score, size = 56 }) => {
    const r = (size - 6) / 2, c = 2 * Math.PI * r, o = c - (score / 100) * c
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth="5" fill="none" className="text-ink-900/8" />
                <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth="5" fill="none" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" className={scoreTone(score)} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-semibold tabular-nums ${scoreTone(score)}`}>{score}%</span>
            </div>
        </div>
    )
}
export const MatchScoreBreakdown = ({ breakdown }) => {
    if (!breakdown) return null
    return (
        <div className="space-y-2.5">
            {Object.keys(AXIS_LABELS).filter((k) => breakdown[k]).map((axis) => {
                const data = breakdown[axis]
                const isMl = axis === 'mlComponent'
                const ratio = isMl ? (data.rfConfidence != null ? data.rfConfidence / 100 : 0) : Math.max(0, Math.min(1, data.ratio ?? data.points / (data.weight || 1)))
                return (
                    <div key={axis}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className={`font-medium ${isMl ? 'text-success-600' : 'text-ink-900'}`}>{AXIS_LABELS[axis]}{isMl ? ` (${data.rfConfidence ?? '—'}%)` : ''}</span>
                            {!isMl && <span className="text-ink-muted">{data.points}/{data.weight}</span>}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/8">
                            <div className={`h-full rounded-full transition-all duration-300 ${isMl ? 'bg-success-600' : 'bg-amber-500'}`} style={{ width: `${ratio * 100}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">{data.detail}</p>
                    </div>
                )
            })}
        </div>
    )
}
