import { Route, Routes, Link } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { Layout } from './components/Layout'
import { TimerProvider } from './lib/timer'
import { ToastHost } from './lib/ui'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Topics from './pages/Topics'
import Notes from './pages/Notes'
import Resources from './pages/Resources'
import Review from './pages/Review'
import Stats from './pages/Stats'

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
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/topics" element={<Topics />} />
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
