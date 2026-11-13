import { useEffect, useState } from 'react'
import { LuStar } from 'react-icons/lu'
import { listMyRatings } from '../../../services/user/ratings.service'
import { Card, Badge } from '../../../components/ui/Card'
const StarRow = ({ count }) => <div className="flex gap-0.5">{[1,2,3,4,5].map((i) => <LuStar key={i} className={`h-4 w-4 ${i <= count ? 'fill-amber-500 text-amber-500' : 'text-ink-faint'}`} />)}</div>
const Ratings = () => {
  const [ratings, setRatings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => { listMyRatings().then((r) => setRatings(r.data?.properties?.ratings || [])).finally(() => setIsLoading(false)) }, [])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">My Ratings</h1><p className="mt-1 text-sm text-ink-muted">Feedback you&rsquo;ve submitted on completed side-hustles.</p></div>
      {isLoading ? <p className="text-sm text-ink-muted">Loading...</p>
        : ratings.length === 0 ? <Card><p className="text-sm text-ink-muted">No ratings yet. Complete a side-hustle from your Income Tracker to leave feedback.</p></Card>
        : <div className="space-y-3">{ratings.map((r) => <Card key={r._id}><div className="flex items-start justify-between gap-3"><StarRow count={r.stars} />{r.wasAccurateMatch !== null ? <Badge tone={r.wasAccurateMatch ? 'success' : 'danger'}>{r.wasAccurateMatch ? 'Accurate match' : 'Not as expected'}</Badge> : null}</div>{r.feedback ? <p className="mt-2 text-sm text-ink-900">{r.feedback}</p> : null}<p className="mt-2 text-xs text-ink-muted">{new Date(r.createdAt).toLocaleDateString()}</p></Card>)}</div>}
    </div>
  )
}
export default Ratings
