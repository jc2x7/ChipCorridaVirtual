import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'male' | 'female';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.surfaceSecondary, text: Colors.textSecondary },
  success: { bg: Colors.successBg, text: '#15803D' },
  warning: { bg: Colors.warningBg, text: '#92400E' },
  error: { bg: Colors.errorBg, text: '#B91C1C' },
  info: { bg: Colors.secondaryLight, text: Colors.secondary },
  male: { bg: '#DBEAFE', text: '#1D4ED8' },
  female: { bg: '#FCE7F3', text: '#BE185D' },
};

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const config = variantConfig[variant];
  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderRadius: 100,
        paddingHorizontal: size === 'sm' ? 8 : 12,
        paddingVertical: size === 'sm' ? 2 : 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? 11 : 13,
          fontWeight: '600',
          color: config.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
