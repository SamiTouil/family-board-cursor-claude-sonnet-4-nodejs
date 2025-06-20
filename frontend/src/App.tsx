import React from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from './components/Dashboard';
import { FamilyOnboarding } from './components/family/FamilyOnboarding';
import { LoadingSpinner } from './components/LoadingSpinner';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: familyLoading } = useFamily();
  const { t } = useTranslation();

  if (authLoading || (isAuthenticated && familyLoading)) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" message={t('common.loading')} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!hasCompletedOnboarding) {
    return <FamilyOnboarding />;
  }

  return <Dashboard />;
};

function App(): JSX.Element {
  return (
    <div className="app">
      <AuthProvider>
        <FamilyProvider>
          <AppContent />
        </FamilyProvider>
      </AuthProvider>
    </div>
  );
}

export default App; 