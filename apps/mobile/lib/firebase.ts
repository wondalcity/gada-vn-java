import auth from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { api } from './api-client';

export async function signInWithPhoneOtp(
  phoneNumber: string,
): Promise<ReturnType<typeof auth().signInWithPhoneNumber>> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

export async function signInWithFacebook(accessToken: string) {
  const facebookCredential = auth.FacebookAuthProvider.credential(accessToken);
  return auth().signInWithCredential(facebookCredential);
}

export async function syncAuthToken() {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    await SecureStore.deleteItemAsync('auth_token');
    return null;
  }

  const idToken = await currentUser.getIdToken();
  await SecureStore.setItemAsync('auth_token', idToken);

  // Sync with backend
  const result = await api.post<{ user: unknown; isNew: boolean }>(
    '/auth/verify-token',
    { idToken },
  );

  return result;
}

export async function signOut() {
  await auth().signOut();
  await SecureStore.deleteItemAsync('auth_token');
}
