import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { UserProfile } from './UserProfile';
import Navigation from './Navigation';
import LogoReversed from './LogoReversed';
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
        <div className="layout-header-left">
          <LogoReversed />
        </div>
        
        <Navigation />
        
        <div className="layout-header-right">
          <UserMenu onEditProfile={() => setShowUserProfile(true)} />
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