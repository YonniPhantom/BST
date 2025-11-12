import { HashRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { FileProvider } from './contexts/FileContext'
import Home from './Pages/Home'
import Dashboard from './Pages/Dashboard'
import AuthCallback from './Pages/AuthCallback'

export default function App() {
  return (
    <AuthProvider>
      <FileProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </HashRouter>
      </FileProvider>
    </AuthProvider>
  )
}
