import { create } from 'zustand'
import { checkUser, loginUser, logoutUser, registerUser } from '../../services/auth/auth.service'
export const useAuthStore = create((set) => ({
  user: null, isAuthenticated: false, isCheckingAuth: false, hasCheckedAuth: false,
  register: async (data) => registerUser(data),
  login: async (data) => { const r = await loginUser(data); set({ user: r.data?.properties?.user || null, isAuthenticated: true, hasCheckedAuth: true }); return r },
  logout: async () => { await logoutUser(); set({ user: null, isAuthenticated: false, hasCheckedAuth: true }) },
  checkUser: async () => {
    try { set({ isCheckingAuth: true }); const r = await checkUser(); set({ user: r.data?.properties?.user || null, isAuthenticated: true, isCheckingAuth: false, hasCheckedAuth: true }); return r }
    catch { set({ user: null, isAuthenticated: false, isCheckingAuth: false, hasCheckedAuth: true }); return null }
  },
  setUser: (u) => set((s) => ({ user: { ...(s.user || {}), ...u } }))
}))
