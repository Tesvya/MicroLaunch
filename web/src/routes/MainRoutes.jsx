import { PublicRoutes } from './PublicRoutes'
import { UserRoutes } from './UserRoutes'
import { AdminRoutes } from './AdminRoutes'
export const MainRoutes = [
    ...PublicRoutes,
    ...UserRoutes,
    ...AdminRoutes,
    { path: '*', element: <div className="flex min-h-screen items-center justify-center text-ink-muted">Page not found</div> }
]
