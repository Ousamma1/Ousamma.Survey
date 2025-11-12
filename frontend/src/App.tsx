import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { Dashboard } from './features/surveys/Dashboard';
import { SurveyList } from './features/surveys/SurveyList';
import { SurveyCreatorPage } from './features/surveys/SurveyCreator';
import { SurveyTaker } from './features/surveys/SurveyTaker';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/survey/:id" element={<SurveyTaker />} />

            {/* Protected routes */}
            <Route element={<><Header /><ProtectedRoute /></>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/surveys" element={<SurveyList />} />
              <Route path="/surveys/new" element={<SurveyCreatorPage />} />
              <Route path="/surveys/:id/edit" element={<SurveyCreatorPage />} />

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<div className="p-8">Admin Panel</div>} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
