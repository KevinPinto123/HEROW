import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './views.css'
import './extra-views.css'
import './pixel.css'
import './dashboard.css'
import './waitlist.css'
import './legal.css'
import './arcade.css'
import './conecta.css'
import App from './App.jsx'
import { registerServiceWorker } from './lib/pwa'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
