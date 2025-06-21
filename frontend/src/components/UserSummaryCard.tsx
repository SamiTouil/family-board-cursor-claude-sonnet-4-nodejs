import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { UserAvatar } from './UserAvatar';
import './UserSummaryCard.css';

export const UserSummaryCard: React.FC = () => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  if (!user) {
    return null;
  }

  return (
    <div className="user-summary-card">
      <div className="user-summary-card-header">
        {/* Gradient background section - top 25% */}
      </div>
      
      <div className="user-summary-card-content">
        <div className="user-summary-card-avatar">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            avatarUrl={user.avatarUrl || null}
            size="large"
          />
        </div>
        
        <div className="user-summary-card-info">
          <h3 className="user-summary-card-name">
            {user.firstName} {user.lastName}
          </h3>
          
          <p className="user-summary-card-email">
            {user.email}
          </p>
          
          {currentFamily && (
            <div className="user-summary-card-role">
              <span className="user-summary-card-role-tag">
                {currentFamily.userRole || 'Member'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 