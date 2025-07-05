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
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextInput, Logo } from '../../components/ui';
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
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

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
      newErrors.password = 'Password must be at least 6 characters';
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
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Logo size={80} style={styles.logo} />
              <Text style={styles.title}>Family Board</Text>
              <Text style={styles.subtitle}>Create your account</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={handleInputChange('firstName')}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  autoComplete="name"
                  error={errors.firstName}
                  editable={!isLoading}
                  style={styles.halfInput}
                />

                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={handleInputChange('lastName')}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  autoComplete="name"
                  error={errors.lastName}
                  editable={!isLoading}
                  style={styles.halfInput}
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
                placeholder="Enter your password"
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
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
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
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
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