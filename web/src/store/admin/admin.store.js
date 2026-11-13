import { create } from 'zustand'
import { getPlatformOverview, listUsers, setUserActiveStatus, verifyUserEmail, listSideHustlesAdmin, createSideHustle, updateSideHustle, deleteSideHustle } from '../../services/admin/admin.service'
export const useAdminStore = create((set, get) => ({
  overview: null, users: [], sideHustles: [], isLoading: false,
  fetchOverview: async () => { const r = await getPlatformOverview(); set({ overview: r.data?.properties || null }); return r },
  fetchUsers: async () => { set({ isLoading: true }); const r = await listUsers(); set({ users: r.data?.properties?.users || [], isLoading: false }); return r },
  toggleUserActive: async (id, isActive) => { const r = await setUserActiveStatus(id, isActive); set({ users: get().users.map((u) => u._id === id ? r.data.properties.user : u) }); return r },
  verifyEmail: async (id) => { const r = await verifyUserEmail(id); set({ users: get().users.map((u) => u._id === id ? r.data.properties.user : u) }); return r },
  fetchSideHustles: async () => { set({ isLoading: true }); const r = await listSideHustlesAdmin(); set({ sideHustles: r.data?.properties?.sideHustles || [], isLoading: false }); return r },
  addSideHustle: async (data) => { const r = await createSideHustle(data); set({ sideHustles: [r.data.properties.sideHustle, ...get().sideHustles] }); return r },
  editSideHustle: async (id, data) => { const r = await updateSideHustle(id, data); set({ sideHustles: get().sideHustles.map((s) => s._id === id ? r.data.properties.sideHustle : s) }); return r },
  removeSideHustle: async (id) => { await deleteSideHustle(id); set({ sideHustles: get().sideHustles.filter((s) => s._id !== id) }) }
}))
