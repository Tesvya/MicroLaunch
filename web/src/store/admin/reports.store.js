import { create } from 'zustand'
import { generateReport, listReports, getActivityLogs } from '../../services/admin/reports.service'
export const useReportsStore = create((set, get) => ({
  reports: [], logs: [], isLoading: false,
  fetchReports: async () => { set({ isLoading: true }); const r = await listReports(); set({ reports: r.data?.properties?.reports || [], isLoading: false }); return r },
  generate: async (data) => { const r = await generateReport(data); set({ reports: [r.data.properties.report, ...get().reports] }); return r },
  fetchLogs: async (module = '') => { set({ isLoading: true }); const r = await getActivityLogs(module); set({ logs: r.data?.properties?.logs || [], isLoading: false }); return r }
}))
