import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { UserMenu } from './UserMenu';
import { UserProfile } from './UserProfile';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Update document title when family changes
  useEffect(() => {
    if (currentFamily) {
      document.title = `${currentFamily.name} Board`;
    } else {
      document.title = t('app.title');
    }
  }, [currentFamily, t]);

  if (!user) {
    return null; // This shouldn't happen in a protected route, but just in case
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">
            {currentFamily ? `${currentFamily.name} Board` : t('app.title')}
          </h1>
          <UserMenu onEditProfile={() => setShowUserProfile(true)} />
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-welcome-title">
            Welcome back, {user.firstName}!
          </h2>
          <p className="dashboard-welcome-text">
            {currentFamily 
              ? `Welcome to ${currentFamily.name}'s board. This is where you'll manage your family's tasks and activities.`
              : "Welcome to your family board. This is where you'll manage your family's tasks and activities."
            }
          </p>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-placeholder">
            <h3>Coming Soon</h3>
            <p>Family board features will be implemented here.</p>
          </div>
        </div>
      </main>
      
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  );
}; 