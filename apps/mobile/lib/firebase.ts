import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { api } from './api-client';

// Configure Google Sign-In (call once; safe to call multiple times)
GoogleSignin.configure({
  webClientId: '359319234631-ijcqgg6lvjpch0jim2o4ogtqe71biliv.apps.googleusercontent.com',
});

export async function signInWithPhoneOtp(phoneNumber: string) {
  return auth().signInWithPhoneNumber(phoneNumber);
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  // v13: returns { type, data } instead of throwing on cancellation
  if (response.type !== 'success') {
    throw Object.assign(new Error('sign-in cancelled'), { code: 'SIGN_IN_CANCELLED' });
  }

  // idToken can be null in some Android Credential Manager flows — fall back to getTokens()
  let idToken = response.data?.idToken ?? null;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken;
  }

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  return auth().signInWithCredential(googleCredential);
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
