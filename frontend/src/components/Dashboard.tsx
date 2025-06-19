import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Logout error handling - error is logged in AuthContext
    }
  };

  if (!user) {
    return null; // This shouldn't happen in a protected route, but just in case
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">{t('app.title')}</h1>
          <div className="dashboard-user-menu">
            <div className="dashboard-user-info">
              <span className="dashboard-user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className="dashboard-user-email">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="dashboard-logout-button"
              type="button"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-welcome-title">
            Welcome back, {user.firstName}!
          </h2>
          <p className="dashboard-welcome-text">
            Welcome to your family board. This is where you'll manage your family's tasks and activities.
          </p>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-placeholder">
            <h3>Coming Soon</h3>
            <p>Family board features will be implemented here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}; 