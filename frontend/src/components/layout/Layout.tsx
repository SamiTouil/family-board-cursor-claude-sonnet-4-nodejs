import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserMenu } from '../../features/auth/components/UserMenu';
import { UserProfile } from '../../features/auth/components/UserProfile';
import Navigation from './Navigation';
import Logo from './Logo';
import { ShiftIndicator } from './ShiftIndicator';
import './Layout.css';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const [showUserProfile, setShowUserProfile] = useState(false);

  if (!user) {
    return null; // This should not happen as Layout is only rendered when authenticated
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-container">
          <div className="layout-header-left">
            <Logo />
            <ShiftIndicator />
          </div>
          
          <Navigation />
          
          <div className="layout-header-right">
            <UserMenu 
              onEditProfile={() => setShowUserProfile(true)}
            />
          </div>
        </div>
      </header>
      
      <main className="layout-main">
        <Outlet />
      </main>
      
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  );
};

export default Layout; 