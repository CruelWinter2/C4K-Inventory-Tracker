import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IntakeFormPage from './pages/IntakeFormPage';
import PrintViewPage from './pages/PrintViewPage';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <IntakeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:serialNo"
            element={
              <ProtectedRoute>
                <IntakeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/print/:serialNo"
            element={
              <ProtectedRoute>
                <PrintViewPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
