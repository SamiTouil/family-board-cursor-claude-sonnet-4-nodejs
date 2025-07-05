import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { CreateFamilyForm } from '../../components/forms/CreateFamilyForm';
import { JoinFamilyForm } from '../../components/forms/JoinFamilyForm';
import { Button, Logo } from '../../components/ui';

type OnboardingStep = 'choice' | 'create' | 'join';

export const FamilyOnboardingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('choice');
  const { logout } = useAuth();
  const { pendingJoinRequests } = useFamily();

  // If user has pending join requests, show the join form (which will show pending status)
  useEffect(() => {
    const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
    if (actualPendingRequests.length > 0) {
      setCurrentStep('join');
    }
  }, [pendingJoinRequests]);

  const handleBack = () => {
    // Don't allow going back if user has actual pending requests
    const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
    if (actualPendingRequests.length > 0) {
      return;
    }
    
    if (currentStep === 'choice') {
      // Show confirmation dialog before logout
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]
      );
    } else {
      setCurrentStep('choice');
    }
  };

  const handleRequestCancelled = () => {
    // When request is cancelled, go back to choice screen
    setCurrentStep('choice');
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentStep === 'choice' && (
            <View style={styles.choiceContainer}>
              <View style={styles.header}>
                <Logo size={64} style={styles.logo} />
                <Text style={styles.title}>Welcome to Family Board</Text>
                <Text style={styles.subtitle}>
                  Choose how you'd like to get started with organizing your family
                </Text>
              </View>
              
              <View style={styles.options}>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => setCurrentStep('create')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>👨‍👩‍👧‍👦</Text>
                  <Text style={styles.optionTitle}>Create a Family</Text>
                  <Text style={styles.optionDescription}>
                    Start a new family board and invite members to join
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => setCurrentStep('join')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>🤝</Text>
                  <Text style={styles.optionTitle}>Join a Family</Text>
                  <Text style={styles.optionDescription}>
                    Join an existing family using an invite code
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.backButtonContainer}>
                <Button
                  title="Sign Out"
                  onPress={handleBack}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </View>
          )}
          
          {currentStep === 'create' && (
            <CreateFamilyForm onBack={handleBack} />
          )}
          
          {currentStep === 'join' && (
            <JoinFamilyForm onBack={handleBack} onRequestCancelled={handleRequestCancelled} />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  choiceContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  options: {
    gap: 16,
  },
  option: {
    padding: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
}); 