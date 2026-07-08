import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages (to be implemented next)
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import CandidateDetail from './pages/CandidateDetail';
import ScheduleInterview from './pages/ScheduleInterview';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Main HR Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Layout>
                  <JobList />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <JobDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/candidates/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CandidateDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/interviews"
            element={
              <ProtectedRoute>
                <Layout>
                  <ScheduleInterview />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirect all unmatched routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
