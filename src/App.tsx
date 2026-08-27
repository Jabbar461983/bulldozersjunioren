import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PasswortVergessenPage } from './pages/PasswortVergessenPage';
import { JuniorHome } from './pages/JuniorHome';
import { JuniorUebungDetail } from './pages/JuniorUebungDetail';
import { JuniorVerlauf } from './pages/JuniorVerlauf';
import { JuniorProfil } from './pages/JuniorProfil';
import { JuniorFreundeschallenge } from './pages/JuniorFreundeschallenge';
import { AdminHome } from './pages/AdminHome';
import { NotFoundPage } from './pages/NotFoundPage';
import { RoleRedirect } from './pages/RoleRedirect';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/passwort-vergessen" element={<PasswortVergessenPage />} />

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
              path="/junior/uebungen/:id"
              element={
                <ProtectedRoute>
                  <RoleRoute allowed={['junior']}>
                    <JuniorUebungDetail />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/junior/verlauf"
              element={
                <ProtectedRoute>
                  <RoleRoute allowed={['junior']}>
                    <JuniorVerlauf />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/junior/profil"
              element={
                <ProtectedRoute>
                  <RoleRoute allowed={['junior']}>
                    <JuniorProfil />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/junior/freundeschallenge"
              element={
                <ProtectedRoute>
                  <RoleRoute allowed={['junior']}>
                    <JuniorFreundeschallenge />
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
    </ToastProvider>
  );
}

export default App;
