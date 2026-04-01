import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Managers from './pages/Managers'
import ManagerDetail from './pages/ManagerDetail'
import Workers from './pages/Workers'
import WorkerDetail from './pages/WorkerDetail'
import Jobs from './pages/Jobs'
import JobForm from './pages/JobForm'
import JobDetail from './pages/JobDetail'
import Notifications from './pages/Notifications'
import Sites from './pages/Sites'
import Companies from './pages/Companies'
import PromoteWorker from './pages/PromoteWorker'
import AdminUsers from './pages/AdminUsers'
import AcceptInvite from './pages/AcceptInvite'
import Settings from './pages/Settings'

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Authenticated routes — wrapped in AuthProvider for permission context */}
          <Route element={<AuthProvider><Layout /></AuthProvider>}>
            <Route index element={<Dashboard />} />
            <Route path="managers" element={<Managers />} />
            <Route path="managers/promote" element={<PromoteWorker />} />
            <Route path="managers/:id" element={<ManagerDetail />} />
            <Route path="workers" element={<Workers />} />
            <Route path="workers/:id" element={<WorkerDetail />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/new" element={<JobForm />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="jobs/:id/edit" element={<JobForm />} />
            <Route path="sites" element={<Sites />} />
            <Route path="sites/:id" element={<Sites />} />
            <Route path="companies" element={<Companies />} />
            <Route path="companies/:id" element={<Companies />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="admin-users" element={<AdminUsers />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
