import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CSRFProvider } from './contexts/CSRFContext';
import { CurrentWeekProvider } from './contexts/CurrentWeekContext';
import { AuthPage } from './features/auth/components/AuthPage';
import { FamilyOnboarding } from './features/family/components/FamilyOnboarding';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import RoutinesPage from './pages/WeekPage';
import TasksPage from './pages/TasksPage';
import FamilyPage from './pages/FamilyPage';
import AnalyticsPage from './pages/AnalyticsPage';
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

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="week" element={<RoutinesPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <CSRFProvider>
        <AuthProvider>
          <WebSocketProvider>
            <FamilyProvider>
              <CurrentWeekProvider>
                <AppContent />
              </CurrentWeekProvider>
            </FamilyProvider>
          </WebSocketProvider>
        </AuthProvider>
      </CSRFProvider>
    </Router>
  );
};

export default App; 