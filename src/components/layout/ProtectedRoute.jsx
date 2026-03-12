import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLocale();

  if (loading) {
    return <LoadingSpinner fullScreen label={t('common.checkingSession')} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children || <Outlet />;
}
