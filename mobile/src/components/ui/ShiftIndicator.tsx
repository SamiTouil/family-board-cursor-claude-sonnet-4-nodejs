import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { weekScheduleApi } from '../../services/api';
import type { ShiftInfo } from '../../types';

export const ShiftIndicator: React.FC = () => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentWeekStart = (): string => {
    const today = new Date();
    const monday = getMonday(today);
    return monday;
  };

  const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const loadShiftInfo = useCallback(async (forceRefresh = false) => {
    if (!currentFamily || !user) return;

    // Only show loading state for initial load or forced refresh
    if (forceRefresh || !shiftInfo) {
      setIsLoading(true);
    }

    try {
      const weekStart = getCurrentWeekStart();
      const response = await weekScheduleApi.getShiftStatus(currentFamily.id, weekStart);
      const shiftData = response.data.shiftInfo;
      setShiftInfo(shiftData);
    } catch (error) {
      // Silently handle errors - user will see no shift info
      if (!shiftInfo) {
        setShiftInfo(null);
      }
      // Don't clear existing shiftInfo on error to prevent flicker
    } finally {
      setIsLoading(false);
    }
  }, [currentFamily, user, shiftInfo]);

  useEffect(() => {
    if (currentFamily && user) {
      loadShiftInfo(true); // Force refresh on mount

      // Refresh data from API every minute to keep time displays current
      const dataInterval = setInterval(() => loadShiftInfo(false), 60000);

      return () => {
        clearInterval(dataInterval);
      };
    }
    return undefined;
  }, [currentFamily, user, loadShiftInfo]);

  const formatTimeWithDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeDiff = targetDate.getTime() - today.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (daysDiff === 0) {
      return timeStr; // Today - no need to specify
    } else if (daysDiff === 1) {
      return `${timeStr} Tomorrow`;
    } else if (daysDiff === -1) {
      return `${timeStr} Yesterday`;
    } else if (daysDiff > 1 && daysDiff <= 6) {
      const dayName = date.toLocaleDateString([], { weekday: 'long' });
      return `${timeStr} ${dayName}`;
    } else {
      // For dates beyond this week, show the actual date
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${timeStr} ${dateStr}`;
    }
  };

  // Always render the container to prevent layout shifts
  return (
    <View style={styles.container}>
      {(!currentFamily || !user) ? (
        // Don't show anything if no family/user context
        <View style={styles.placeholder} />
      ) : isLoading && !shiftInfo ? (
        // Only show loading on initial load
        <Text style={styles.singleLineText}>Loading shifts...</Text>
      ) : !shiftInfo ? (
        <Text style={styles.singleLineText}>No shifts scheduled</Text>
      ) : shiftInfo.type === 'current' ? (
        <Text style={styles.singleLineText}>
          <Text style={[styles.statusText, styles.currentShift]}>Shift ends </Text>
          {shiftInfo.timeRemaining || 'soon'}
        </Text>
      ) : (
        <Text style={styles.singleLineText}>
          <Text style={[styles.statusText, styles.nextShift]}>Next shift </Text>
          {shiftInfo.timeUntilStart || 'soon'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
    justifyContent: 'flex-start',
  },
  placeholder: {
    width: 0,
    height: 20,
  },
  singleLineText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 20,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  currentShift: {
    color: '#86efac',
  },
  nextShift: {
    color: '#93c5fd',
  },
  timeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 20,
  },
});