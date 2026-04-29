import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Root-level React ErrorBoundary.
 *
 * Catches any render-phase errors (including "Objects are not valid as a React child")
 * that bubble up from the component tree, logs the full component stack to
 * Firebase Crashlytics for diagnosis, and shows a recovery UI instead of a
 * white / black crash screen.
 */
export class RootErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  State
> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      crashlytics().log(`[RootErrorBoundary] ${error.message}`);
      crashlytics().log(
        `[ComponentStack]${errorInfo.componentStack ?? ' (unavailable)'}`,
      );
      crashlytics().recordError(error);
    } catch {
      // Crashlytics must never throw
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>앱 오류가 발생했습니다</Text>
          <Text style={styles.body}>
            문제가 자동으로 보고되었습니다.{'\n'}
            앱을 다시 시작하거나 아래 버튼을 눌러주세요.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.btnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#25282A',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: '#0669F7',
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
