import { useEffect, useRef } from 'react'
import { Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { Layout } from './components/Layout'
import { TimerProvider } from './lib/timer'
import { ToastHost } from './lib/ui'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Topics from './pages/Topics'
import Words from './pages/Words'
import Notes from './pages/Notes'
import Resources from './pages/Resources'
import Review from './pages/Review'
import Stats from './pages/Stats'

const LAST_ROUTE_KEY = 'wb-last-route'

/**
 * 记住上次待在哪一页。
 * 打开应用时如果落在首页，且上次停的是别的页面，就跳回去；
 * 之后每次切页都把当前路径记下来。
 */
function RouteMemory() {
  const location = useLocation()
  const navigate = useNavigate()
  const restored = useRef(false)

  useEffect(() => {
    if (!restored.current) {
      restored.current = true
      if (location.pathname === '/') {
        const last = localStorage.getItem(LAST_ROUTE_KEY)
        if (last && last !== '/' && last.startsWith('/') && !last.startsWith('//')) {
          navigate(last, { replace: true })
          return
        }
      }
    }
    localStorage.setItem(LAST_ROUTE_KEY, location.pathname)
  }, [location.pathname, navigate])

  return null
}

function NotFound() {
  return (
    <div className="empty" style={{ paddingTop: 100 }}>
      <span className="empty-emoji">🧭</span>
      这个页面不存在
      <div style={{ marginTop: 14 }}>
        <Link to="/" className="btn">
          回到今日
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        dedupingInterval: 1500,
        shouldRetryOnError: false,
        onError: (err) => {
          console.error(err)
        },
      }}
    >
      <TimerProvider>
        <RouteMemory />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/words" element={<Words />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/review" element={<Review />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <ToastHost />
      </TimerProvider>
    </SWRConfig>
  )
}
