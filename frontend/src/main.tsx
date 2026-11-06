import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { BrandProvider } from './brand.tsx'
import './index.css'
import SmoothScroll from './motion/SmoothScroll.tsx'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandProvider>
      <BrowserRouter>
        <SmoothScroll>
          <App />
        </SmoothScroll>
      </BrowserRouter>
    </BrandProvider>
  </StrictMode>,
)
