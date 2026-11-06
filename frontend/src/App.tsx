import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Journey from './journey/Journey'
import Home from './pages/Home'
import Insights from './pages/Insights'
import Inspector from './pages/Inspector'
import MyData from './pages/MyData'
import Partner from './pages/Partner'
import Privacy from './pages/Privacy'
import Sign from './pages/Sign'
import TrackPage from './pages/TrackPage'
import WhatsApp from './pages/WhatsApp'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/start" element={<Journey />} />
        <Route path="/resume/:sid" element={<Journey />} />
        <Route path="/whatsapp" element={<WhatsApp />} />
        <Route path="/track/:orderId" element={<TrackPage />} />
        <Route path="/partner" element={<Partner />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/kyc-inspector" element={<Inspector />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/my-data/:sid" element={<MyData />} />
        <Route path="/sign/:token" element={<Sign />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
