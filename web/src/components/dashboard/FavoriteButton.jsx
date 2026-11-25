import { useEffect, useState } from 'react'
import { LuHeart } from 'react-icons/lu'
import { toast } from 'sonner'
import { useFavoritesStore } from '../../store/user/favorites.store'
import { FAVORITE } from '../../shared/labels'
import { Button } from '../ui/Button'

/** Heart toggle. variant="icon" is a small round overlay for cards; variant="button" has a text label. */
export const FavoriteButton = ({ sideHustleId, variant = 'button', className = '' }) => {
  const active = useFavoritesStore((s) => s.ids.includes(sideHustleId))
  const ensureLoaded = useFavoritesStore((s) => s.ensureLoaded)
  const add = useFavoritesStore((s) => s.add)
  const remove = useFavoritesStore((s) => s.remove)
  const [busy, setBusy] = useState(false)
  useEffect(() => { ensureLoaded() }, [ensureLoaded])

  const toggle = async (e) => {
    e.preventDefault(); e.stopPropagation() // the button sits on cards that are links
    if (busy) return
    setBusy(true)
    try {
      if (active) { await remove(sideHustleId); toast.success(FAVORITE.removed) }
      else { await add(sideHustleId); toast.success(FAVORITE.added) }
    } catch (error) { toast.error(error?.response?.data?.message || 'Something went wrong. Please try again.') }
    finally { setBusy(false) }
  }
  const heart = <LuHeart className={`h-4 w-4 ${active ? 'fill-danger-600 text-danger-600' : 'text-ink-muted'}`} />
  const label = active ? 'Remove from favorites' : 'Add to favorites'
  if (variant === 'icon') {
    return <button type="button" onClick={toggle} disabled={busy} aria-pressed={active} aria-label={label} title={label} className={`rounded-full bg-surface p-2 shadow-sm ring-1 ring-ink-faint/25 transition-colors hover:ring-ink-900/30 disabled:opacity-60 ${className}`}>{heart}</button>
  }
  return <Button type="button" size="sm" variant="ghost" className={`border border-ink-faint/30 ${className}`} onClick={toggle} disabled={busy} aria-pressed={active}>{heart}{active ? FAVORITE.done : FAVORITE.action}</Button>
}
