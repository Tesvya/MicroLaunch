import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuBookmark, LuX, LuArrowRight } from 'react-icons/lu'
import { useRecommendationsStore } from '../../../store/user/recommendations.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { MatchScoreRing, MatchScoreBreakdown } from '../../../components/dashboard/MatchScore'
const formatPay = (s) => { const sfx = s.payType === 'HOURLY' ? '/hr' : ''; return s.payAmountMin && s.payAmountMax && s.payAmountMin !== s.payAmountMax ? `\u20b1${s.payAmountMin}\u2013${s.payAmountMax}${sfx}` : `\u20b1${s.payAmountMin || s.payAmountMax || 0}${sfx}` }
const RecommendationCard = ({ entry, onRespond }) => {
  const [expanded, setExpanded] = useState(false)
  const { sideHustle, score, breakdown } = entry
  return (
    <Card>
      <div className="flex items-start gap-4">
        <MatchScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-ink-900">{sideHustle.title}</h3><Badge tone="amber">{sideHustle.workMode}</Badge></div>
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{sideHustle.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted"><span className="font-medium text-success-600">{formatPay(sideHustle)}</span><span>&middot;</span><span>{sideHustle.location || 'Remote'}</span></div>
        </div>
      </div>
      <button onClick={() => setExpanded((e) => !e)} className="mt-4 text-xs font-medium text-ink-900 underline decoration-ink-faint underline-offset-4 hover:decoration-ink-900">{expanded ? 'Hide match details' : 'Why was this recommended?'}</button>
      {expanded ? <div className="mt-4 rounded-xl bg-canvas p-4"><MatchScoreBreakdown breakdown={breakdown} /></div> : null}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="accent" onClick={() => onRespond(sideHustle._id, 'SAVED')}><LuBookmark className="h-3.5 w-3.5" /> Save</Button>
        <Link to={`/app/explore/${sideHustle._id}`}><Button size="sm" variant="ghost" className="border border-ink-faint/30">View details <LuArrowRight className="h-3.5 w-3.5" /></Button></Link>
        <Button size="sm" variant="ghost" className="ml-auto text-ink-muted" onClick={() => onRespond(sideHustle._id, 'DISMISSED')}><LuX className="h-3.5 w-3.5" /> Not for me</Button>
      </div>
    </Card>
  )
}
const Recommendations = () => {
  const { recommendations, isLoading, errorMessage, fetchRecommendations, respond } = useRecommendationsStore()
  useEffect(() => { fetchRecommendations().catch(() => {}) }, [])
  const handleRespond = async (sideHustleId, responseType) => {
    try { await respond(sideHustleId, responseType); if (responseType === 'SAVED') toast.success('Saved to your list') }
    catch { toast.error('Could not record your response') }
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">Your Recommendations</h1><p className="mt-1 text-sm text-ink-muted">Ranked by how well each opportunity fits your profile &mdash; tap a card to see exactly why.</p></div>
      {isLoading ? <p className="text-sm text-ink-muted">Finding your best matches...</p>
        : errorMessage ? <Card><p className="text-sm text-ink-900">{errorMessage}</p><Link to="/app/profile" className="mt-3 inline-block"><Button variant="accent" size="sm">Complete your profile</Button></Link></Card>
        : recommendations.length === 0 ? <Card><p className="text-sm text-ink-muted">No matches yet. Update your profile to widen your matches.</p></Card>
        : <div className="grid gap-4 lg:grid-cols-2">{recommendations.map((entry) => <RecommendationCard key={entry.sideHustle._id} entry={entry} onRespond={handleRespond} />)}</div>}
    </div>
  )
}
export default Recommendations
