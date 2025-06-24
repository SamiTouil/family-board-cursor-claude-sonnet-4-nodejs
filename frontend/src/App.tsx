import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AuthPage } from './features/auth/components/AuthPage';
import { FamilyOnboarding } from './features/family/components/FamilyOnboarding';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import TemplatesPage from './pages/WeekPage';
import TasksPage from './pages/TasksPage';
import FamilyPage from './pages/FamilyPage';
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
        <Route path="week" element={<TemplatesPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="tasks" element={<TasksPage />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <FamilyProvider>
            <AppContent />
          </FamilyProvider>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 