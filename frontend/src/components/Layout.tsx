import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import Navigation from './Navigation';
import LogoReversed from './LogoReversed';
import './Layout.css';

const Layout: React.FC = () => {
  const { user } = useAuth();

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
          <UserAvatar 
            firstName={user.firstName} 
            lastName={user.lastName}
            avatarUrl={user.avatarUrl || null}
            size="medium"
          />
        </div>
      </header>
      
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 