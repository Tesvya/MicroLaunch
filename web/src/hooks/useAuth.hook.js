import { useEffect } from 'react'
import { useAuthStore } from '../store/auth/auth.store'
export const useAuth = () => {
    const checkUser = useAuthStore((s) => s.checkUser)
    const user = useAuthStore((s) => s.user)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth)
    const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth)
    const setUser = useAuthStore((s) => s.setUser)
    useEffect(() => { if (!hasCheckedAuth && !isCheckingAuth) checkUser() }, [hasCheckedAuth, isCheckingAuth])
    return { user, isAuthenticated, isAuthLoading: !hasCheckedAuth || isCheckingAuth, setUser }
}
