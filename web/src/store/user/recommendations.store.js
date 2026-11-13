import { create } from 'zustand'
import { getMyRecommendations, respondToRecommendation } from '../../services/user/recommendations.service'
export const useRecommendationsStore = create((set, get) => ({
  recommendations: [], isLoading: false, errorMessage: null,
  fetchRecommendations: async (params = {}) => { set({ isLoading: true, errorMessage: null }); try { const r = await getMyRecommendations(params); set({ recommendations: r.data?.properties?.recommendations || [], isLoading: false }); return r } catch (e) { set({ isLoading: false, errorMessage: e?.response?.data?.message || 'Could not load recommendations' }); throw e } },
  respond: async (sideHustleId, responseType) => { await respondToRecommendation(sideHustleId, responseType); if (responseType === 'DISMISSED') set({ recommendations: get().recommendations.filter((r) => r.sideHustle._id !== sideHustleId) }) }
}))
