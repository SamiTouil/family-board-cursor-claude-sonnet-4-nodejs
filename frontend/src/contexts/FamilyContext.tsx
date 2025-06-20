import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Family, familyApi, CreateFamilyData, JoinFamilyData, FamilyJoinRequest } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

interface FamilyContextType {
  families: Family[];
  currentFamily: Family | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  pendingJoinRequests: FamilyJoinRequest[];
  createFamily: (data: CreateFamilyData) => Promise<Family>;
  joinFamily: (data: JoinFamilyData) => Promise<FamilyJoinRequest>;
  setCurrentFamily: (family: Family) => void;
  refreshFamilies: () => Promise<void>;
  loadPendingJoinRequests: () => Promise<void>;
  cancelJoinRequest: (requestId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};

interface FamilyProviderProps {
  children: ReactNode;
}

export const FamilyProvider: React.FC<FamilyProviderProps> = ({ children }) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [currentFamily, setCurrentFamilyState] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<FamilyJoinRequest[]>([]);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Load families and pending join requests when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadFamilies();
      loadPendingJoinRequests();
    } else if (!isAuthenticated) {
      // Reset state when user logs out
      setFamilies([]);
      setCurrentFamilyState(null);
      setPendingJoinRequests([]);
      localStorage.removeItem('currentFamilyId');
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Update hasCompletedOnboarding based on families and pending join requests
  useEffect(() => {
    setHasCompletedOnboarding(families.length > 0);
  }, [families, pendingJoinRequests]);

  const loadFamilies = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await familyApi.getUserFamilies();
      const userFamilies = response.data.data;
      setFamilies(userFamilies);
      
      // Set current family from localStorage or first family
      const savedFamilyId = localStorage.getItem('currentFamilyId');
      if (savedFamilyId) {
        const savedFamily = userFamilies.find(f => f.id === savedFamilyId);
        if (savedFamily) {
          setCurrentFamilyState(savedFamily);
        } else {
          // Saved family not found, clear localStorage and set first family
          localStorage.removeItem('currentFamilyId');
          if (userFamilies.length > 0) {
            const firstFamily = userFamilies[0];
            if (firstFamily) {
              setCurrentFamilyState(firstFamily);
              localStorage.setItem('currentFamilyId', firstFamily.id);
            }
          }
        }
      } else if (userFamilies.length > 0) {
        // No saved family, set first family
        const firstFamily = userFamilies[0];
        if (firstFamily) {
          setCurrentFamilyState(firstFamily);
          localStorage.setItem('currentFamilyId', firstFamily.id);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load families:', error);
      // Don't show error to user, just leave families empty
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (data: CreateFamilyData): Promise<Family> => {
    try {
      const response = await familyApi.create(data);
      if (response.data.success) {
        const newFamily = response.data.data;
        setFamilies(prev => [...prev, newFamily]);
        setCurrentFamilyState(newFamily);
        localStorage.setItem('currentFamilyId', newFamily.id);
        return newFamily;
      } else {
        throw new Error(response.data.message || t('family.create.createError'));
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message?.includes('name')) {
          throw new Error(t('family.create.nameRequired'));
        }
        throw new Error(message || t('family.create.createError'));
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error(t('auth.networkError'));
      } else {
        throw new Error(error.response?.data?.message || t('family.create.createError'));
      }
    }
  };

  const joinFamily = async (data: JoinFamilyData): Promise<FamilyJoinRequest> => {
    try {
      const response = await familyApi.join(data);
      if (response.data.success) {
        const joinRequest = response.data.data;
        // Don't add to families list since it's just a request
        // Don't set current family since user hasn't joined yet
        // Refresh pending join requests to include the new request
        loadPendingJoinRequests();
        return joinRequest;
      } else {
        throw new Error(response.data.message || t('family.join.joinError'));
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message?.includes('code') || message?.includes('invite')) {
          throw new Error(t('family.join.invalidCode'));
        } else if (message?.includes('pending')) {
          throw new Error(t('family.join.pendingRequest'));
        }
        throw new Error(message || t('family.join.joinError'));
      } else if (error.response?.status === 409) {
        throw new Error(t('family.join.alreadyMember'));
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error(t('auth.networkError'));
      } else {
        throw new Error(error.response?.data?.message || t('family.join.joinError'));
      }
    }
  };

  const setCurrentFamily = (family: Family) => {
    setCurrentFamilyState(family);
    localStorage.setItem('currentFamilyId', family.id);
  };

  const refreshFamilies = async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await familyApi.getUserFamilies();
      if (response.data.success) {
        setFamilies(response.data.data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh families:', error);
    }
  };

  const loadPendingJoinRequests = async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await familyApi.getMyJoinRequests();
      if (response.data.success) {
        setPendingJoinRequests(response.data.data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load pending join requests:', error);
    }
  };

  const cancelJoinRequest = async (requestId: string): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await familyApi.cancelJoinRequest(requestId);
      if (response.data.success) {
        setPendingJoinRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to cancel join request:', error);
      throw new Error(error.response?.data?.message || t('family.join.cancelError'));
    }
  };

  const value: FamilyContextType = {
    families,
    currentFamily,
    loading,
    hasCompletedOnboarding,
    pendingJoinRequests,
    createFamily,
    joinFamily,
    setCurrentFamily,
    refreshFamilies,
    loadPendingJoinRequests,
    cancelJoinRequest,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}; 