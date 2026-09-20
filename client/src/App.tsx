import { lazy, Suspense } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './sections/HomePage'

const AdminPage = lazy(() => import('./sections/AdminPage'))

export default function App() {
  if (/^\/admin(?:\/|$)/.test(window.location.pathname)) return <Suspense fallback={<p role="status">Loading admin workspace...</p>}><AdminPage /></Suspense>
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <HomePage />
      </main>
      <Footer />
    </div>
  )
}
