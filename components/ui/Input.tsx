import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.surface,
          borderWidth: 1.5,
          borderColor: hasError ? Colors.error : Colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          minHeight: 50,
        }}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={Colors.textMuted}
            style={{ marginRight: 10 }}
          />
        )}

        <TextInput
          style={[
            {
              flex: 1,
              fontSize: 16,
              color: Colors.text,
              paddingVertical: 12,
            },
            style,
          ]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {(error || hint) && (
        <Text
          style={{
            fontSize: 12,
            color: hasError ? Colors.error : Colors.textMuted,
            marginTop: 4,
            marginLeft: 2,
          }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
