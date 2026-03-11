import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/layout/ErrorBoundary';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const FocusPage = lazy(() => import('./pages/FocusPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen label="Loading..." />;
  if (user) return <Navigate to="/habits" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen label="Loading..." />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <LandingPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
