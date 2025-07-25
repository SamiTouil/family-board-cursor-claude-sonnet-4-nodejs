import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, FamilyIcon, TasksIcon, RoutinesIcon, AnalyticsIcon } from '../ui/icons';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      path: '/',
      icon: HomeIcon,
      label: 'Home'
    },
    {
      path: '/family',
      icon: FamilyIcon,
      label: 'Family'
    },
    {
      path: '/tasks',
      icon: TasksIcon,
      label: 'Tasks'
    },
    {
      path: '/week',
      icon: RoutinesIcon,
      label: 'Routines'
    },
    {
      path: '/analytics',
      icon: AnalyticsIcon,
      label: 'Analytics'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navigation">
      {navigationItems.map((item) => {
        const IconComponent = item.icon;
        const active = isActive(item.path);
        
        return (
          <button
            key={item.path}
            className={`navigation-item ${active ? 'active' : ''}`}
            onClick={() => !active && navigate(item.path)}
            disabled={active}
            title={item.label}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <div className="navigation-icon">
              <IconComponent size={28} />
            </div>
            <span className="navigation-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation; 