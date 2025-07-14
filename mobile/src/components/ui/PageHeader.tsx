import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LogoReversed from './LogoReversed';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: React.ReactNode;
  showBackButton?: boolean;
  showLogo?: boolean;
  rightButtons?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  showBackButton = false,
  showLogo = true,
  rightButtons,
  style,
  titleStyle,
  descriptionStyle,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradientBackground,
        { paddingTop: insets.top + 10 },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Back button or Logo */}
          {showBackButton ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : showLogo ? (
            <TouchableOpacity
              style={styles.logoButton}
              activeOpacity={0.7}
            >
              <LogoReversed size={48} style={styles.logo} />
            </TouchableOpacity>
          ) : null}

          {/* Title and description/subtitle area */}
          <View style={styles.headerText}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            <View style={styles.indicatorsRow}>
              <View style={styles.leftIndicator}>
                {subtitle ? (
                  subtitle
                ) : description ? (
                  <Text style={[styles.description, descriptionStyle]}>
                    {description}
                  </Text>
                ) : null}
              </View>
              {rightButtons && (
                <View style={styles.rightButtons}>
                  {rightButtons}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
  },
  logoButton: {
    alignSelf: 'center',
    borderRadius: 8,
    padding: 4,
  },
  logo: {
    alignSelf: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    minHeight: 28,
  },
  leftIndicator: {
    flex: 1,
    minHeight: 20,
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});

// Export common button styles for consistency
export const headerButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});