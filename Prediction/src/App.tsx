import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EventDetailPage from './pages/EventDetailPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App
