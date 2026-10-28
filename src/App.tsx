import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Catalog from './pages/admin/Catalog';
import Dashboard from './pages/admin/Dashboard';
import WorkspaceEditor from './pages/admin/WorkspaceEditor';
import Workspaces from './pages/admin/Workspaces';
import ChatAgent from './pages/sandbox/ChatAgent';
import Contact from './pages/sandbox/Contact';
import MyResults from './pages/sandbox/MyResults';
import SandboxHome from './pages/sandbox/SandboxHome';
import SandboxLayout from './pages/sandbox/SandboxLayout';
import WorkflowRun from './pages/sandbox/WorkflowRun';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/s/:token" element={<SandboxLayout />}>
        <Route index element={<SandboxHome />} />
        <Route path="run/:id" element={<WorkflowRun />} />
        <Route path="chat/:id" element={<ChatAgent />} />
        <Route path="results" element={<MyResults />} />
        <Route path="contact" element={<Contact />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="workspaces" element={<Workspaces />} />
        <Route path="workspaces/:id" element={<WorkspaceEditor />} />
        <Route path="catalog" element={<Catalog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
