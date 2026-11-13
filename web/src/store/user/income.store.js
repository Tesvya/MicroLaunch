import { create } from 'zustand'
import { getDashboardSummary, listMyIncomeEntries, createIncomeEntry, updateIncomeEntry, deleteIncomeEntry } from '../../services/user/income.service'
export const useIncomeStore = create((set, get) => ({
  summary: null, entries: [], isLoading: false,
  fetchSummary: async () => { const r = await getDashboardSummary(); set({ summary: r.data?.properties || null }); return r },
  fetchEntries: async () => { set({ isLoading: true }); const r = await listMyIncomeEntries(); set({ entries: r.data?.properties?.entries || [], isLoading: false }); return r },
  addEntry: async (data) => { const r = await createIncomeEntry(data); set({ entries: [r.data.properties.entry, ...get().entries] }); return r },
  editEntry: async (id, data) => { const r = await updateIncomeEntry(id, data); set({ entries: get().entries.map((e) => e._id === id ? r.data.properties.entry : e) }); return r },
  removeEntry: async (id) => { await deleteIncomeEntry(id); set({ entries: get().entries.filter((e) => e._id !== id) }) }
}))
