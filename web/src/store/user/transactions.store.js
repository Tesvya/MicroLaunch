import { create } from 'zustand'
import { requestPayout, listMyTransactions, verifyTransaction } from '../../services/user/transactions.service'
export const useTransactionsStore = create((set, get) => ({
  transactions: [], isLoading: false,
  fetchTransactions: async () => { set({ isLoading: true }); const r = await listMyTransactions(); set({ transactions: r.data?.properties?.transactions || [], isLoading: false }); return r },
  requestPayout: async (data) => { const r = await requestPayout(data); set({ transactions: [r.data.properties.transaction, ...get().transactions] }); return r },
  verify: async (id) => { const r = await verifyTransaction(id); set({ transactions: get().transactions.map((t) => t._id === id ? { ...r.data.properties.transaction, incomeEntryId: t.incomeEntryId } : t) }); return r }
}))
