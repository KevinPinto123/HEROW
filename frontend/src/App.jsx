import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './views/Landing'
import SafetyFilter from './views/SafetyFilter'
import Awakening from './views/Awakening'
import Multiverso from './views/Multiverso'
import Niveles from './views/Niveles'
import Combat from './views/Combat'
import Boss from './views/Boss'
import YessenIA from './components/YessenIA'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<SafetyFilter />} />
          <Route path="/despertar" element={<Awakening />} />
          <Route path="/multiverso" element={<Multiverso />} />
          <Route path="/niveles" element={<Niveles />} />
          <Route path="/combate" element={<Combat />} />
          <Route path="/boss" element={<Boss />} />
        </Routes>
        <YessenIA />
      </div>
    </Router>
  )
}

export default App
