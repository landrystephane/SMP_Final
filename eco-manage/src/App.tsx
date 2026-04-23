import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Grades from './pages/Grades';
import Finance from './pages/Finance';
import AdminWorkflow from './pages/AdminWorkflow';
import Attendance from './pages/Attendance';
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
            <Route path="subjects" element={<div>Gestion des Matières</div>} />
            <Route path="grades" element={<Grades />} />
            <Route path="finance" element={<Finance />} />
            <Route path="admin-workflow" element={<AdminWorkflow />} />
            <Route path="attendance" element={<Attendance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
