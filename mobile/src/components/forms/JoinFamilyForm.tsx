import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFamily } from '../../contexts/FamilyContext';
import { Button, TextInput, LoadingSpinner } from '../ui';

interface JoinFamilyFormProps {
  onBack: () => void;
  onRequestCancelled: () => void;
}

export const JoinFamilyForm: React.FC<JoinFamilyFormProps> = ({ onBack, onRequestCancelled }) => {
  const { joinFamily, pendingJoinRequests, cancelJoinRequest, families } = useFamily();
  
  const [formData, setFormData] = useState({
    inviteCode: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Check if user has pending join requests
  const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
  const hasPendingRequests = actualPendingRequests.length > 0;
  const pendingRequest = actualPendingRequests[0]; // Get the first pending request

  // Handle when user's request gets rejected - redirect back to choice screen
  useEffect(() => {
    // If user was on the "Request Submitted" screen (isSubmitted = true) 
    // but now has no pending requests, check if it was rejection or approval
    if (isSubmitted && !hasPendingRequests) {
      // If user still has no families, it means the request was rejected
      // If user now has families, it means the request was approved (handled by hasCompletedOnboarding redirect)
      if (families.length === 0) {
        // Request was rejected - reset the submitted state and redirect back to choice
        setIsSubmitted(false);
        onRequestCancelled();
      }
      // If families.length > 0, the request was approved and the main app will handle the redirect
    }
  }, [isSubmitted, hasPendingRequests, families.length, onRequestCancelled]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.inviteCode.trim()) {
      newErrors['inviteCode'] = 'Invite code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const joinData: any = {
        code: formData.inviteCode.trim(),
      };
      if (formData.message.trim()) {
        joinData.message = formData.message.trim();
      }
      await joinFamily(joinData);
      setIsSubmitted(true);
    } catch (error: any) {
      Alert.alert('Join Family Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    
    setIsCancelling(true);
    try {
      await cancelJoinRequest(pendingRequest.id);
      onRequestCancelled();
    } catch (error: any) {
      Alert.alert('Cancel Request Failed', error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // Show pending request screen if user has pending requests or just submitted
  if (hasPendingRequests || isSubmitted) {
    const request = pendingRequest || { family: { name: '' }, createdAt: new Date().toISOString() };
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Request Submitted!</Text>
          <Text style={styles.subtitle}>Your join request has been sent</Text>
        </View>
        
        <View style={styles.pendingContent}>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <Text style={styles.pendingFamily}>{request.family.name}</Text>
            <Text style={styles.pendingDate}>
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.pendingMessage}>
              Please wait for a family admin to approve your request. You'll be notified when they respond.
            </Text>
          </View>
          
          <View style={styles.pendingActions}>
            <Button
              title={isCancelling ? "Cancelling..." : "Cancel Request"}
              onPress={handleCancelRequest}
              variant="secondary"
              size="lg"
              disabled={isCancelling}
              loading={isCancelling}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={onBack}
          variant="ghost"
          size="sm"
          disabled={isSubmitting}
          style={styles.backButton}
        />
        <Text style={styles.title}>Join a Family</Text>
        <Text style={styles.subtitle}>Enter the invite code to join an existing family</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Invite Code"
          value={formData.inviteCode}
          onChangeText={handleInputChange('inviteCode')}
          placeholder="Enter the family invite code"
          autoCapitalize="characters"
          error={errors.inviteCode}
          editable={!isSubmitting}
        />

        <TextInput
          label="Message (Optional)"
          value={formData.message}
          onChangeText={handleInputChange('message')}
          placeholder="Add a message for the family admin (optional)"
          multiline
          numberOfLines={3}
          editable={!isSubmitting}
        />

        <Button
          title="Send Join Request"
          onPress={handleSubmit}
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    marginBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  pendingContent: {
    alignItems: 'center',
    gap: 24,
  },
  pendingInfo: {
    alignItems: 'center',
    gap: 12,
  },
  pendingIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  pendingFamily: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    textAlign: 'center',
  },
  pendingDate: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  pendingActions: {
    width: '100%',
  },
}); 