import React from 'react';
import { useTranslation } from 'react-i18next';
import './RoleTag.css';

export type RoleType = 'ADMIN' | 'MEMBER' | 'VIRTUAL';

interface RoleTagProps {
  role: RoleType;
  className?: string;
}

export const RoleTag: React.FC<RoleTagProps> = ({ role, className = '' }) => {
  const { t } = useTranslation();

  const getRoleText = () => {
    switch (role) {
      case 'ADMIN':
        return t('family.admin');
      case 'MEMBER':
        return t('family.member');
      case 'VIRTUAL':
        return t('family.isVirtual');
      default:
        return t('family.member');
    }
  };

  const getRoleClass = () => {
    switch (role) {
      case 'ADMIN':
        return 'role-tag-admin';
      case 'MEMBER':
        return 'role-tag-member';
      case 'VIRTUAL':
        return 'role-tag-virtual';
      default:
        return 'role-tag-member';
    }
  };

  return (
    <span className={`role-tag ${getRoleClass()} ${className}`}>
      {getRoleText()}
    </span>
  );
}; 