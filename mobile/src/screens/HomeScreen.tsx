import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentFamily } = useFamily();

  return (
    <View style={styles.container}>
      {/* Weekly Calendar */}
      <WeeklyCalendar style={styles.calendar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  calendar: {
    flex: 1,
  },
}); 