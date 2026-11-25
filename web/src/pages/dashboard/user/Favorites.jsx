import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuHeart, LuX, LuArrowRight } from 'react-icons/lu'
import { useFavoritesStore } from '../../../store/user/favorites.store'
import { FAVORITE } from '../../../shared/labels'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { OpeningsBadge } from '../../../components/dashboard/OpeningsBadge'

const formatPay = (s) => { const sfx = s.payType === 'HOURLY' ? '/hr' : ''; return s.payAmountMin && s.payAmountMax && s.payAmountMin !== s.payAmountMax ? `\u20b1${s.payAmountMin}\u2013${s.payAmountMax}${sfx}` : `\u20b1${s.payAmountMin || s.payAmountMax || 0}${sfx}` }

const Favorites = () => {
  const items = useFavoritesStore((s) => s.items)
  const isLoading = useFavoritesStore((s) => s.isLoading)
  const isLoaded = useFavoritesStore((s) => s.isLoaded)
  const remove = useFavoritesStore((s) => s.remove)

  useEffect(() => {
    const { ensureLoaded, fetch } = useFavoritesStore.getState()
    ensureLoaded().finally(() => fetch().catch(() => {}))
  }, [])

  const handleRemove = async (id) => {
    try { await remove(id); toast.success(FAVORITE.removed) }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not remove it. Please try again.') }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">{FAVORITE.pageTitle}</h1><p className="mt-1 text-sm text-ink-muted">{FAVORITE.pageSubtitle}</p></div>
      {isLoading && !isLoaded ? <p className="text-sm text-ink-muted">Loading...</p>
        : items.length === 0 ? (
          <Card className="text-center">
            <LuHeart className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
            <p className="text-sm font-medium text-ink-900">{FAVORITE.emptyTitle}</p>
            <p className="mt-1 text-sm text-ink-muted">{FAVORITE.emptyBody}</p>
            <Link to="/app/explore" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:underline">Browse side-hustles <LuArrowRight className="h-4 w-4" /></Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map(({ _id, sideHustle: s }) => {
              const open = s.status === 'ACTIVE'
              return (
                <Card key={_id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone="amber">{s.workMode}</Badge><Badge tone="neutral">{s.payType.replace('_', ' ')}</Badge>
                    {open ? <OpeningsBadge sideHustle={s} /> : <Badge tone="danger">No longer accepting applications</Badge>}
                  </div>
                  <h3 className="text-base font-semibold text-ink-900">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{s.description}</p>
                  <p className="mt-3 text-sm font-medium text-success-600">{formatPay(s)} <span className="font-normal text-ink-muted">&middot; {s.location || 'Remote'}</span></p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link to={`/app/explore/${s._id}`}><Button size="sm" variant={open ? 'accent' : 'ghost'} className={open ? '' : 'border border-ink-faint/30'}>{open ? 'View & apply' : 'View details'} <LuArrowRight className="h-3.5 w-3.5" /></Button></Link>
                    <Button size="sm" variant="ghost" className="ml-auto text-ink-muted" onClick={() => handleRemove(s._id)}><LuX className="h-3.5 w-3.5" /> Remove</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
    </div>
  )
}
export default Favorites
