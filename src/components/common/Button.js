import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const Button = ({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  loading = false, 
  outlined = false,
  disabled = false
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        outlined ? styles.outlinedButton : {}, 
        disabled ? styles.disabledButton : {},
        style
      ]} 
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={outlined ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <Text style={[
          styles.buttonText, 
          outlined ? styles.outlinedButtonText : {},
          disabled ? styles.disabledButtonText : {},
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  outlinedButtonText: {
    color: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    borderColor: '#CCCCCC',
  },
  disabledButtonText: {
    color: '#888888',
  }
});

export default Button;
