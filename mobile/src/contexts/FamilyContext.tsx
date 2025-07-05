import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { familyApi } from '../services/api';
import type { Family, CreateFamilyData, JoinFamilyData, FamilyJoinRequest } from '../types';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

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
  const { on, off } = useNotifications();

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
      AsyncStorage.removeItem('currentFamilyId');
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Update hasCompletedOnboarding based on families and pending join requests
  useEffect(() => {
    setHasCompletedOnboarding(families.length > 0);
  }, [families, pendingJoinRequests]);

  // Set up WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle join request approvals
    const handleJoinRequestApproved = async (data: any) => {
      // Remove from pending requests and add to families
      setPendingJoinRequests(prev => prev.filter(r => r.family.id !== data.familyId));
      
      // Immediately set hasCompletedOnboarding to true to trigger redirect
      setHasCompletedOnboarding(true);
      
      // Refresh families to include the newly joined family
      try {
        const response = await familyApi.getUserFamilies();
        if (response.data.success) {
          setFamilies(response.data.data);
        }
      } catch (error) {
        console.error('Failed to refresh families after approval:', error);
      }
    };

    // Handle join request rejections
    const handleJoinRequestRejected = (data: any) => {
      // Remove rejected requests from pending requests array
      setPendingJoinRequests(prev => 
        prev.filter(r => r.family.id !== data.familyId)
      );
    };

    // Handle new member joining family (for admins)
    const handleMemberJoined = async () => {
      // Refresh families to update member count
      try {
        const response = await familyApi.getUserFamilies();
        if (response.data.success) {
          setFamilies(response.data.data);
        }
      } catch (error) {
        console.error('Failed to refresh families after member joined:', error);
      }
    };

    // Handle family updates
    const handleFamilyUpdated = async () => {
      // Refresh families to get latest data
      try {
        const response = await familyApi.getUserFamilies();
        if (response.data.success) {
          const updatedFamilies = response.data.data;
          setFamilies(updatedFamilies);
          
          // Update current family if it exists
          if (currentFamily) {
            const updatedCurrentFamily = updatedFamilies.find((f: any) => f.id === currentFamily.id);
            if (updatedCurrentFamily) {
              setCurrentFamilyState(updatedCurrentFamily);
            }
          }
        }
      } catch (error) {
        console.error('Failed to refresh families after update:', error);
      }
    };

    // Register event listeners
    on('join-request-approved', handleJoinRequestApproved);
    on('join-request-rejected', handleJoinRequestRejected);
    on('member-joined', handleMemberJoined);
    on('family-updated', handleFamilyUpdated);

    // Cleanup event listeners
    return () => {
      off('join-request-approved', handleJoinRequestApproved);
      off('join-request-rejected', handleJoinRequestRejected);
      off('member-joined', handleMemberJoined);
      off('family-updated', handleFamilyUpdated);
    };
  }, [isAuthenticated, on, off, currentFamily]);

  const refreshFamilies = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await familyApi.getUserFamilies();
      if (response.data.success) {
        const updatedFamilies = response.data.data;
        setFamilies(updatedFamilies);
        
        // Update currentFamily if it exists and its data has changed
        if (currentFamily) {
          const updatedCurrentFamily = updatedFamilies.find((f: any) => f.id === currentFamily.id);
          if (updatedCurrentFamily) {
            setCurrentFamilyState(updatedCurrentFamily);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh families:', error);
    }
  }, [isAuthenticated, currentFamily]);

  const loadFamilies = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await familyApi.getUserFamilies();
      const userFamilies = response.data.data;
      setFamilies(userFamilies);
      
      // Set current family from AsyncStorage or first family
      const savedFamilyId = await AsyncStorage.getItem('currentFamilyId');
      if (savedFamilyId) {
        const savedFamily = userFamilies.find((f: any) => f.id === savedFamilyId);
        if (savedFamily) {
          setCurrentFamilyState(savedFamily);
        } else {
          // Saved family not found, clear AsyncStorage and set first family
          await AsyncStorage.removeItem('currentFamilyId');
          if (userFamilies.length > 0) {
            const firstFamily = userFamilies[0];
            if (firstFamily) {
              setCurrentFamilyState(firstFamily);
              await AsyncStorage.setItem('currentFamilyId', firstFamily.id);
            }
          }
        }
      } else if (userFamilies.length > 0) {
        // No saved family, set first family
        const firstFamily = userFamilies[0];
        if (firstFamily) {
          setCurrentFamilyState(firstFamily);
          await AsyncStorage.setItem('currentFamilyId', firstFamily.id);
        }
      }
    } catch (error) {
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
        await AsyncStorage.setItem('currentFamilyId', newFamily.id);
        return newFamily;
      } else {
        throw new Error(response.data.message || 'Failed to create family');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message?.includes('name')) {
          throw new Error('Family name is required');
        }
        throw new Error(message || 'Failed to create family');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to create family');
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
        throw new Error(response.data.message || 'Failed to join family');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message?.includes('code') || message?.includes('invite')) {
          throw new Error('Invalid invite code');
        } else if (message?.includes('pending')) {
          throw new Error('You already have a pending request for this family');
        }
        throw new Error(message || 'Failed to join family');
      } else if (error.response?.status === 409) {
        throw new Error('You are already a member of this family');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to join family');
      }
    }
  };

  const setCurrentFamily = async (family: Family) => {
    setCurrentFamilyState(family);
    await AsyncStorage.setItem('currentFamilyId', family.id);
  };

  const loadPendingJoinRequests = async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      const response = await familyApi.getMyJoinRequests();
      if (response.data.success) {
        // Keep all requests and let components handle filtering
        setPendingJoinRequests(response.data.data);
      }
    } catch (error) {
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
      console.error('Failed to cancel join request:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel join request');
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