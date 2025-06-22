import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { RoleTag } from './RoleTag';
import { familyApi, FamilyMember } from '../services/api';
import './FamilyManagement.css';

export const FamilyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { user } = useAuth();

  // State for family members
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load family data when component mounts
  useEffect(() => {
    if (currentFamily) {
      loadFamilyData();
    }
  }, [currentFamily]);

  const loadFamilyData = async () => {
    if (!currentFamily) return;

    try {
      const membersResponse = await familyApi.getMembers(currentFamily.id);

      if (membersResponse.data.success) {
        setMembers(membersResponse.data.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.loadError') });
    }
  };

  if (!currentFamily) {
    return null;
  }

  return (
    <div className="family-management">
      <div className="family-management-header">
        <div className="family-management-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h2 className="family-management-title">{currentFamily.name} Family</h2>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`family-management-message family-management-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Family Members */}
      <div className="family-management-subsection">
        <div className="family-management-subsection-header">
          <h4 className="family-management-subsection-title">{t('family.members')}</h4>
        </div>

        <div className="family-management-members-list">
          {members.map((member) => {
            const isCurrentUser = member.userId === user?.id;
            const memberName = `${member.user?.firstName} ${member.user?.lastName}`;
            
            return (
              <div key={member.id} className="family-management-member">
                <div className="family-management-member-info">
                  <div className="family-management-member-avatar">
                    {member.user?.avatarUrl ? (
                      <img 
                        src={member.user.avatarUrl} 
                        alt={memberName}
                        className="family-management-avatar-img"
                      />
                    ) : (
                      <div className="family-management-avatar-placeholder">
                        {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="family-management-member-details">
                    <div className="family-management-member-name">
                      {memberName}
                      {isCurrentUser && ` (${t('family.you')})`}
                      <RoleTag 
                        role={member.user?.isVirtual ? 'VIRTUAL' : member.role} 
                      />
                    </div>
                    {member.user?.email && (
                      <div className="family-management-member-email">
                        {member.user.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
