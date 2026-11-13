import { Link } from 'react-router-dom'
import { LuLayoutDashboard, LuSparkles, LuWallet, LuShieldCheck } from 'react-icons/lu'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
const FEATURES = [
  { icon: LuSparkles, title: 'Transparent matching', body: 'Every recommendation comes with a clear breakdown of why it fits your skills, interests, and schedule.' },
  { icon: LuWallet, title: 'Income planning', body: 'Track earnings and hours across every side-hustle, and watch your progress toward your monthly goal.' },
  { icon: LuShieldCheck, title: 'Built for everyone', body: 'Designed for students, freelancers, PWDs, senior citizens, and anyone looking for flexible income.' }
]
const Landing = () => (
  <div className="min-h-screen bg-canvas">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></div>
      <div className="flex items-center gap-3"><Link to="/login"><Button variant="ghost">Log in</Button></Link><Link to="/register"><Button variant="accent">Get started</Button></Link></div>
    </header>
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">Find side-hustles that actually fit your life</h1>
      <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted">MICROLAUNCH matches you to flexible income opportunities based on your skills, interests, and availability &mdash; then helps you track every peso you earn.</p>
      <div className="mt-8 flex items-center justify-center gap-3"><Link to="/register"><Button variant="accent" size="lg">Create your free account</Button></Link></div>
    </section>
    <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-24 sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, body }) => (<Card key={title}><Icon className="h-6 w-6 text-amber-500" /><h3 className="mt-3 font-semibold text-ink-900">{title}</h3><p className="mt-1.5 text-sm text-ink-muted">{body}</p></Card>))}
    </section>
  </div>
)
export default Landing
