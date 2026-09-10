import Topbar from './Components/Topbar'
import { Outlet } from 'react-router-dom'
import Footer from './Components/Footer'
import { ToastContainer } from 'react-toastify'

function Layout() {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white p-3 font-bold text-indigo-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      <ToastContainer/>
      <Topbar />
      <div id="main-content"><Outlet /></div>
      <Footer />
    </div>
  )
}

export default Layout
