import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFamily } from '../../contexts/FamilyContext';
import { Button, TextInput } from '../ui';

interface CreateFamilyFormProps {
  onBack: () => void;
}

export const CreateFamilyForm: React.FC<CreateFamilyFormProps> = ({ onBack }) => {
  const { createFamily } = useFamily();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors['name'] = 'Family name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors['name'] = 'Family name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors['name'] = 'Family name must be less than 50 characters';
    }

    if (formData.description.trim().length > 200) {
      newErrors['description'] = 'Description must be less than 200 characters';
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
      const createData: { name: string; description?: string } = {
        name: formData.name.trim(),
      };
      
      if (formData.description.trim()) {
        createData.description = formData.description.trim();
      }
      
      await createFamily(createData);
      // Success! The family context will handle navigation
    } catch (error: any) {
      Alert.alert('Create Family Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.title}>Create Your Family</Text>
        <Text style={styles.subtitle}>Set up your family board and start organizing together</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Family Name"
          value={formData.name}
          onChangeText={handleInputChange('name')}
          placeholder="Enter your family name"
          error={errors.name}
          editable={!isSubmitting}
        />

        <TextInput
          label="Description (Optional)"
          value={formData.description}
          onChangeText={handleInputChange('description')}
          placeholder="Describe your family (optional)"
          multiline
          numberOfLines={3}
          error={errors.description}
          editable={!isSubmitting}
        />

        <Button
          title="Create Family"
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
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 20,
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
}); 