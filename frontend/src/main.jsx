import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './views.css'
import './extra-views.css'
import './pixel.css'
import './dashboard.css'
import './waitlist.css'
import './legal.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
