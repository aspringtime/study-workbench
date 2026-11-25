import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { setTimeZoneOverride } from '@shared/dates'
import './styles/global.css'

const savedTheme = localStorage.getItem('wb-theme')
if (savedTheme === 'light') {
  document.documentElement.dataset.theme = 'light'
}

// 用户选过时区就先设上，再渲染；否则「今天」会按设备时区算
const savedTz = localStorage.getItem('wb-timezone')
if (savedTz && savedTz !== 'auto') {
  setTimeZoneOverride(savedTz)
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
