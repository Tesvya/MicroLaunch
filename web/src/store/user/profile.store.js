import { create } from 'zustand'
import { getMyProfile, saveMyProfile, submitPwdProof } from '../../services/user/profile.service'
export const useProfileStore = create((set) => ({
  profile: null, pwdVerification: null, isLoading: false,
  fetchProfile: async () => { set({ isLoading: true }); try { const r = await getMyProfile(); set({ profile: r.data?.properties?.profile || null, pwdVerification: r.data?.properties?.pwdVerification || null, isLoading: false }); return r } catch (e) { set({ isLoading: false }); throw e } },
  submitProof: async (files) => { const form = new FormData(); files.forEach((f) => form.append('files', f)); const r = await submitPwdProof(form); set({ pwdVerification: r.data?.properties?.pwdVerification || null }); return r },
  saveProfile: async (data) => { const r = await saveMyProfile(data); set({ profile: r.data?.properties?.profile || null }); return r }
}))
