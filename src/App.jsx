import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/layout/ErrorBoundary';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import RouteLoadingFallback from './components/ui/RouteLoadingFallback';
import ToastViewport from './components/ui/ToastViewport';
import { BadgeProvider } from './contexts/BadgeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useLocale } from './contexts/LocaleContext';
import { isTelegramMiniApp } from './lib/telegram';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const FocusPage = lazy(() => import('./pages/FocusPage'));
const GymExercisesPage = lazy(() => import('./pages/GymExercisesPage'));
const GymHistoryPage = lazy(() => import('./pages/GymHistoryPage'));
const GymHomePage = lazy(() => import('./pages/GymHomePage'));
const GymLogPage = lazy(() => import('./pages/GymLogPage'));
const GymOnboardingPage = lazy(() => import('./pages/GymOnboardingPage'));
const GymProgramPage = lazy(() => import('./pages/GymProgramPage'));
const GymProgressPage = lazy(() => import('./pages/GymProgressPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));

function PublicOnlyRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  if (loading) return <LoadingSpinner fullScreen label={t('common.loading')} />;
  if (user && !profile) return <LoadingSpinner fullScreen label={t('common.loading')} />;
  if (user) return <Navigate to={profile?.onboarding_done ? '/habits' : '/welcome'} replace />;
  if (location.pathname === '/' && isTelegramMiniApp()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function withRouteFallback(element, variant) {
  return <Suspense fallback={<RouteLoadingFallback variant={variant} />}>{element}</Suspense>;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <LandingPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth/*"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <AuthPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/privacy/*"
          element={
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <PrivacyPage />
            </Suspense>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/welcome" element={withRouteFallback(<WelcomePage />, 'habits')} />
            <Route path="/admin/users" element={withRouteFallback(<AdminUsersPage />, 'projects')} />
            <Route path="/habits" element={withRouteFallback(<HabitsPage />, 'habits')} />
            <Route path="/projects" element={withRouteFallback(<ProjectsPage />, 'projects')} />
            <Route path="/projects/:id" element={withRouteFallback(<ProjectDetailPage />, 'projects')} />
            <Route path="/focus" element={withRouteFallback(<FocusPage />, 'focus')} />
            <Route path="/gym" element={withRouteFallback(<GymHomePage />, 'focus')} />
            <Route path="/gym/onboarding" element={withRouteFallback(<GymOnboardingPage />, 'focus')} />
            <Route path="/gym/program" element={withRouteFallback(<GymProgramPage />, 'focus')} />
            <Route path="/gym/log/:sessionId" element={withRouteFallback(<GymLogPage />, 'focus')} />
            <Route path="/gym/history" element={withRouteFallback(<GymHistoryPage />, 'focus')} />
            <Route path="/gym/progress" element={withRouteFallback(<GymProgressPage />, 'focus')} />
            <Route path="/gym/exercises" element={withRouteFallback(<GymExercisesPage />, 'focus')} />
            <Route path="/stats" element={withRouteFallback(<StatsPage />, 'stats')} />
            <Route path="/settings" element={withRouteFallback(<SettingsPage />, 'settings')} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <BadgeProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BadgeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
