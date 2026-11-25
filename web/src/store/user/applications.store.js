import { create } from 'zustand'
import { applyToSideHustle, listMyApplications, cancelApplication, listAllApplicationsAdmin, updateApplicationStatus } from '../../services/user/applications.service'
export const useApplicationsStore = create((set, get) => ({
  applications: [], adminApplications: [], isLoading: false,
  fetchMyApplications: async () => { set({ isLoading: true }); const r = await listMyApplications(); set({ applications: r.data?.properties?.applications || [], isLoading: false }); return r },
  apply: async (data) => { const r = await applyToSideHustle(data); const a = r.data.properties.application; set({ applications: [a, ...get().applications.filter((x) => x._id !== a._id)] }); return r }, // re-applying after a cancel reuses the same record
  cancel: async (id) => { const r = await cancelApplication(id); set({ applications: get().applications.map((a) => a._id === id ? r.data.properties.application : a) }); return r },
  fetchAllApplications: async (status = '') => { set({ isLoading: true }); const r = await listAllApplicationsAdmin(status); set({ adminApplications: r.data?.properties?.applications || [], isLoading: false }); return r },
  changeStatus: async (id, applicationStatus, decisionMessage) => updateApplicationStatus(id, applicationStatus, decisionMessage) // the page re-fetches so profile + opening counts stay in the cards
}))
