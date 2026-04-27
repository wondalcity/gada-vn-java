import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const ENV = process.env.EXPO_PUBLIC_ENV || 'production';

// ─── Initialisation ───────────────────────────────────────────────────────────

export async function initCrashlytics(): Promise<void> {
  try {
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    await crashlytics().setAttributes({
      app_version: Constants.expoConfig?.version ?? 'unknown',
      version_code: String(
        Platform.OS === 'android'
          ? (Constants.expoConfig?.android?.versionCode ?? 'unknown')
          : (Constants.expoConfig?.ios?.buildNumber ?? 'unknown'),
      ),
      platform: Platform.OS,
      env: ENV,
    });
    crashlytics().log('Crashlytics initialised');
  } catch {
    // Crashlytics init failure must never crash the app
  }
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export async function setAuthUser(userId: string, role: 'WORKER' | 'MANAGER'): Promise<void> {
  try {
    await crashlytics().setUserId(userId);
    await crashlytics().setAttribute('user_role', role);
    crashlytics().log(`Auth: user authenticated as ${role}`);
  } catch { /* ignore */ }
}

export async function clearAuthUser(): Promise<void> {
  try {
    await crashlytics().setUserId('');
    await crashlytics().setAttribute('user_role', 'unauthenticated');
    crashlytics().log('Auth: user signed out');
  } catch { /* ignore */ }
}

// ─── Screen tracking ──────────────────────────────────────────────────────────

export function setCurrentScreen(screenName: string): void {
  try {
    crashlytics().setAttribute('current_screen', screenName);
    crashlytics().log(`Screen: ${screenName}`);
  } catch { /* ignore */ }
}

// ─── Breadcrumb logging ───────────────────────────────────────────────────────

export function logEvent(message: string): void {
  try {
    crashlytics().log(message);
  } catch { /* ignore */ }
}

// ─── Non-fatal error reporting ────────────────────────────────────────────────

export function recordNonFatalError(error: unknown, context?: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context) {
      crashlytics().log(`Error context: ${context}`);
    }
    crashlytics().recordError(err);
  } catch { /* ignore */ }
}

// ─── API error reporting ──────────────────────────────────────────────────────

export function recordApiError(
  method: string,
  path: string,
  statusCode: number,
  message: string,
): void {
  try {
    // Only report server errors (5xx) and unexpected 4xx (not 401/403/404)
    const shouldReport = statusCode >= 500 || (statusCode >= 400 && ![401, 403, 404, 422].includes(statusCode));
    if (!shouldReport) return;

    crashlytics().log(`API error: ${method} ${path} → ${statusCode}`);
    const err = new Error(`API ${statusCode}: ${message}`);
    err.name = 'ApiError';
    crashlytics().setAttribute('last_api_path', `${method} ${path}`);
    crashlytics().setAttribute('last_api_status', String(statusCode));
    crashlytics().recordError(err);
  } catch { /* ignore */ }
}
