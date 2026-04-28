import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { _registerToastHandler, ToastOptions, ToastType } from '../lib/toast';
import { Colors, Font, Radius, Spacing } from '../constants/theme';

interface ToastState extends ToastOptions {
  id: number;
}

const TYPE_CONFIG: Record<ToastType, { bg: string; border: string; icon: string; textColor: string }> = {
  success: {
    bg: Colors.successContainer,
    border: Colors.success,
    icon: '✓',
    textColor: Colors.onSuccessContainer,
  },
  error: {
    bg: Colors.errorContainer,
    border: Colors.error,
    icon: '✕',
    textColor: Colors.onErrorContainer,
  },
  info: {
    bg: Colors.primaryContainer,
    border: Colors.primary,
    icon: 'i',
    textColor: Colors.onPrimaryContainer,
  },
  warning: {
    bg: Colors.secondaryContainer,
    border: Colors.secondary,
    icon: '!',
    textColor: Colors.onSecondary,
  },
};

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counterRef = useRef(0);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    _registerToastHandler((opts) => {
      const id = ++counterRef.current;
      const duration = opts.duration ?? 3000;

      setToasts((prev) => [...prev, { ...opts, id }]);

      // Animate in
      translateY.setValue(-80);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        });
      }, duration);
    });
  }, []);

  if (toasts.length === 0) return null;

  const latest = toasts[toasts.length - 1];
  const cfg = TYPE_CONFIG[latest.type ?? 'info'];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 8 },
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}>
        <View style={[styles.iconBadge, { backgroundColor: cfg.border }]}>
          <Text style={styles.iconText}>{cfg.icon}</Text>
        </View>
        <Text style={[styles.message, { color: cfg.textColor }]} numberOfLines={2}>
          {latest.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadowBlack,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    flex: 1,
    ...Font.body3,
    fontWeight: '500',
  },
});
