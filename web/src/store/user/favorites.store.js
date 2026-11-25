import { create } from 'zustand'
import { listFavorites, addFavorite, removeFavorite } from '../../services/user/favorites.service'
import { useAuthStore } from '../auth/auth.store'

export const useFavoritesStore = create((set, get) => ({
  items: [], ids: [], isLoaded: false, isLoading: false, ownerId: null,
  fetch: async () => {
    set({ isLoading: true })
    try { const r = await listFavorites(); const items = r.data?.properties?.favorites || []; set({ items, ids: items.map((i) => i.sideHustle._id), isLoaded: true }) }
    finally { set({ isLoading: false }) }
  },
  // Loads once per logged-in user (cached ids are dropped when a different user signs in)
  ensureLoaded: async () => {
    const uid = useAuthStore.getState().user?._id || null
    if (get().ownerId !== uid) set({ items: [], ids: [], isLoaded: false, ownerId: uid })
    if (!get().isLoaded && !get().isLoading) await get().fetch().catch(() => {})
  },
  add: async (id) => { await addFavorite(id); set({ ids: [...new Set([...get().ids, id])] }); get().fetch().catch(() => {}) },
  remove: async (id) => { await removeFavorite(id); set({ ids: get().ids.filter((x) => x !== id), items: get().items.filter((i) => i.sideHustle._id !== id) }) }
}))
