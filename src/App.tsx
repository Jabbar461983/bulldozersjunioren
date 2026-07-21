import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JuniorHome } from './pages/JuniorHome';
import { TrainerHome } from './pages/TrainerHome';
import { AdminHome } from './pages/AdminHome';
import { NotFoundPage } from './pages/NotFoundPage';
import { RoleRedirect } from './pages/RoleRedirect';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/junior"
            element={
              <ProtectedRoute>
                <RoleRoute allowed={['junior']}>
                  <JuniorHome />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer"
            element={
              <ProtectedRoute>
                <RoleRoute allowed={['trainer', 'admin']}>
                  <TrainerHome />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute allowed={['admin']}>
                  <AdminHome />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
