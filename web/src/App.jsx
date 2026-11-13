import { useRoutes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainRoutes } from './routes/MainRoutes'
const App = () => { const routing = useRoutes(MainRoutes); return <>{routing}<Toaster position="top-center" richColors /></> }
export default App
