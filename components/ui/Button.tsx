import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { container: object; text: object }> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
      borderWidth: 0,
    },
    text: { color: '#FFFFFF', fontWeight: '700' as const },
  },
  secondary: {
    container: {
      backgroundColor: Colors.secondary,
      borderWidth: 0,
    },
    text: { color: '#FFFFFF', fontWeight: '700' as const },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    text: { color: Colors.primary, fontWeight: '600' as const },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    text: { color: Colors.primary, fontWeight: '600' as const },
  },
  danger: {
    container: {
      backgroundColor: Colors.error,
      borderWidth: 0,
    },
    text: { color: '#FFFFFF', fontWeight: '700' as const },
  },
};

const sizeStyles: Record<Size, { container: object; text: object }> = {
  sm: {
    container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    text: { fontSize: 13 },
  },
  md: {
    container: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    text: { fontSize: 15 },
  },
  lg: {
    container: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14 },
    text: { fontSize: 17 },
  },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        vStyle.container,
        sStyle.container,
        { alignItems: 'center', justifyContent: 'center' },
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? Colors.primary
              : '#FFFFFF'
          }
          size="small"
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={[vStyle.text, sStyle.text]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
