import { create } from 'zustand'
import { initiateMockPayment, listMyTransactions, verifyTransaction } from '../../services/user/transactions.service'
export const useTransactionsStore = create((set, get) => ({
  transactions: [], isLoading: false,
  fetchTransactions: async () => { set({ isLoading: true }); const r = await listMyTransactions(); set({ transactions: r.data?.properties?.transactions || [], isLoading: false }); return r },
  pay: async (data) => { const r = await initiateMockPayment(data); set({ transactions: [r.data.properties.transaction, ...get().transactions] }); return r },
  verify: async (id) => { const r = await verifyTransaction(id); set({ transactions: get().transactions.map((t) => t._id === id ? r.data.properties.transaction : t) }); return r },
  payMock: async (data) => { const r = await initiateMockPayment(data); set({ transactions: [r.data.properties.transaction, ...get().transactions] }); return r }
}))
