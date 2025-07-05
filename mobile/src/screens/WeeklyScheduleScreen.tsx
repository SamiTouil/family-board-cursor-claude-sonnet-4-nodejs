import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { Button } from '../components/ui';

export const WeeklyScheduleScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentFamily } = useFamily();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.subtitle}>
            Welcome {user?.firstName}! 📅
          </Text>
          {currentFamily && (
            <Text style={styles.familyName}>
              {currentFamily.name}
            </Text>
          )}
        </View>
        
        <View style={styles.content}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🗓️</Text>
            <Text style={styles.placeholderTitle}>Weekly Schedule Coming Soon!</Text>
            <Text style={styles.placeholderText}>
              This is where you'll see your family's weekly schedule with tasks, events, and assignments.
            </Text>
          </View>
          
          <View style={styles.features}>
            <Text style={styles.featuresTitle}>Coming Features:</Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>📋 Weekly task assignments</Text>
              <Text style={styles.featureItem}>🎯 Family goals and milestones</Text>
              <Text style={styles.featureItem}>📅 Event planning and reminders</Text>
              <Text style={styles.featureItem}>👥 Member availability tracking</Text>
              <Text style={styles.featureItem}>📊 Progress tracking and reports</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="secondary"
            size="sm"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  familyName: {
    fontSize: 16,
    color: '#c7d2fe',
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  placeholder: {
    alignItems: 'center',
    marginBottom: 32,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  features: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
  },
}); 