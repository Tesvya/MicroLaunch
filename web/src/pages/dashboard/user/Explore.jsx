import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuSearch } from 'react-icons/lu'
import { useSideHustlesStore } from '../../../store/user/sidehustles.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
const formatPay = (s) => { const sfx = s.payType === 'HOURLY' ? '/hr' : ''; return s.payAmountMin && s.payAmountMax && s.payAmountMin !== s.payAmountMax ? `\u20b1${s.payAmountMin}\u2013${s.payAmountMax}${sfx}` : `\u20b1${s.payAmountMin || s.payAmountMax || 0}${sfx}` }
const Explore = () => {
  const { sideHustles, isLoading, fetchSideHustles } = useSideHustlesStore()
  const [search, setSearch] = useState('')
  useEffect(() => { const t = setTimeout(() => fetchSideHustles(search ? { search } : {}), 300); return () => clearTimeout(t) }, [search])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">Browse Side-Hustles</h1><p className="mt-1 text-sm text-ink-muted">All currently active opportunities on MICROLAUNCH.</p></div>
      <div className="relative max-w-sm"><LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title..." className="pl-10" /></div>
      {isLoading ? <p className="text-sm text-ink-muted">Loading listings...</p>
        : sideHustles.length === 0 ? <Card><p className="text-sm text-ink-muted">No listings match your search.</p></Card>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sideHustles.map((s) => (
            <Link key={s._id} to={`/app/explore/${s._id}`}><Card className="h-full transition-shadow hover:shadow-md">
              <div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone="amber">{s.workMode}</Badge><Badge tone="neutral">{s.payType.replace('_',' ')}</Badge></div>
              <h3 className="text-base font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{s.description}</p>
              <p className="mt-3 text-sm font-medium text-success-600">{formatPay(s)}</p>
            </Card></Link>
          ))}</div>}
    </div>
  )
}
export default Explore
