import React from 'react';
import { View, ViewProps } from 'react-native';
import { Colors } from '@/constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
  elevated?: boolean;
}

export function Card({
  children,
  padding = 16,
  elevated = false,
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: 16,
          padding,
          borderWidth: 1,
          borderColor: Colors.border,
        },
        elevated && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
          borderWidth: 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
