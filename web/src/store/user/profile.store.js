import { create } from 'zustand'
import { getMyProfile, saveMyProfile } from '../../services/user/profile.service'
export const useProfileStore = create((set) => ({
  profile: null, isLoading: false,
  fetchProfile: async () => { set({ isLoading: true }); try { const r = await getMyProfile(); set({ profile: r.data?.properties?.profile || null, isLoading: false }); return r } catch (e) { set({ isLoading: false }); throw e } },
  saveProfile: async (data) => { const r = await saveMyProfile(data); set({ profile: r.data?.properties?.profile || null }); return r }
}))
