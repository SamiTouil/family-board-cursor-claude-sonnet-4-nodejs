import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextInput } from '../../components/ui';
import type { SignupData, AuthStackParamList } from '../../types';

interface SignupFormData extends SignupData {
  confirmPassword: string;
}

interface SignupScreenProps {
  navigation: StackNavigationProp<AuthStackParamList, 'Signup'>;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signup } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Remove confirmPassword from the data sent to the API
      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);
      // Navigation will be handled by the app-level navigation logic
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SignupFormData) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear confirm password error if password fields now match
    if (field === 'password' || field === 'confirmPassword') {
      if (field === 'password' && formData.confirmPassword && text === formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      } else if (field === 'confirmPassword' && formData.password && text === formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Family Board and organize your family</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <TextInput
                label="First Name"
                value={formData.firstName}
                onChangeText={handleInputChange('firstName')}
                placeholder="First name"
                autoCapitalize="words"
                autoComplete="name"
                error={errors.firstName}
                editable={!isLoading}
                style={styles.nameInput}
              />
              <TextInput
                label="Last Name"
                value={formData.lastName}
                onChangeText={handleInputChange('lastName')}
                placeholder="Last name"
                autoCapitalize="words"
                autoComplete="name"
                error={errors.lastName}
                editable={!isLoading}
                style={styles.nameInput}
              />
            </View>

            <TextInput
              label="Email"
              value={formData.email}
              onChangeText={handleInputChange('email')}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              editable={!isLoading}
            />

            <TextInput
              label="Password"
              value={formData.password}
              onChangeText={handleInputChange('password')}
              placeholder="Create a password"
              secureTextEntry
              autoComplete="password"
              error={errors.password}
              editable={!isLoading}
            />

            <TextInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={handleInputChange('confirmPassword')}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="password"
              error={errors.confirmPassword}
              editable={!isLoading}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Button
                title="Sign In"
                onPress={navigateToLogin}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
}); 