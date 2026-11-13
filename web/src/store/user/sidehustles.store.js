import { create } from 'zustand'
import { listActiveSideHustles } from '../../services/user/sidehustles.service'
export const useSideHustlesStore = create((set) => ({
  sideHustles: [], isLoading: false,
  fetchSideHustles: async (params = {}) => { set({ isLoading: true }); const r = await listActiveSideHustles(params); set({ sideHustles: r.data?.properties?.sideHustles || [], isLoading: false }); return r }
}))
