import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import PromoteWorker from './pages/PromoteWorker'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
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
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
