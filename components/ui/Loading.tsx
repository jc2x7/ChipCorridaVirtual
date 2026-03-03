import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors } from '@/constants/colors';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = false }: LoadingProps) {
  return (
    <View
      style={[
        { alignItems: 'center', justifyContent: 'center', gap: 12 },
        fullScreen && { flex: 1, backgroundColor: Colors.background },
      ]}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && (
        <Text
          style={{
            fontSize: 15,
            color: Colors.textSecondary,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
