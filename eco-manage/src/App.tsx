import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Subjects from './pages/Subjects';
import Grades from './pages/Grades';
import Finance from './pages/Finance';
import AdminWorkflow from './pages/AdminWorkflow';
import Attendance from './pages/Attendance';
import Tickets from './pages/Tickets';
import Transport from './pages/Transport';
import MobileAccess from './pages/MobileAccess';
import MobileProvisioning from './pages/MobileProvisioning';
import SyncCenter from './pages/SyncCenter';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<MobileProvisioning />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="grades" element={<Grades />} />
            <Route path="finance" element={<Finance />} />
            <Route path="admin-workflow" element={<AdminWorkflow />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="transport" element={<Transport />} />
            <Route path="mobile-access" element={<MobileAccess />} />
            <Route path="sync" element={<SyncCenter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
